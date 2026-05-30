#!/usr/bin/env node
/**
 * Performance Measurement
 * ========================
 *
 * Reproduzierbare Render-Performance-Messung über repräsentative Pages.
 * Misst per Page:
 *   - LCP (Largest Contentful Paint)
 *   - FCP (First Contentful Paint)
 *   - DOMContentLoaded
 *   - load
 *   - Style-Recalculation-Time (CDP Performance Domain)
 *   - Layout-Time
 *   - Paint-Time
 *   - Composite-Time
 *   - JSHeapUsedSize (post-load)
 *   - DOM-Nodes (post-load)
 *   - Layout-Shifts (CLS-Komponenten)
 *
 * Output:
 *   - Human-readable Tabelle nach stdout
 *   - dist/perf-stats.json (JSON für History/Vergleich)
 *
 * Determinismus:
 *   - Puppeteer mit konsistenter Viewport + DPR
 *   - Warm-up-Pass + 3 Messungen, median wird verwendet
 *   - prefers-reduced-motion: emuliert um Animationen zu skippen
 *
 * Voraussetzung: build:site wurde vorher ausgeführt.
 */

const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "dist", "site");
const DIST = path.join(ROOT, "dist");
const STATS_FILE = path.join(DIST, "perf-stats.json");

/* Pages mit unterschiedlichen Stress-Profilen:
   - demo (index.html): Production-like, alle 57 Components in einem Page
   - foundations: 271 Tokens als interactive grid + foundation-tile-grid
   - themes: Theme-Generator (palette compute + live preview)
   - alert (Component-Page): repräsentativ small Page mit Modifier-Vorschau */
const PAGES = [
  { name: "demo",        file: "index.html",                   from: "ROOT" },
  { name: "site-index",  file: "dist/site/index.html",         from: "ROOT" },
  { name: "foundations", file: "dist/site/foundations.html",   from: "ROOT" },
  { name: "themes",      file: "dist/site/themes.html",        from: "ROOT" },
  { name: "alert",       file: "dist/site/components/alert.html", from: "ROOT" },
  { name: "table",       file: "dist/site/components/table.html", from: "ROOT" },
];

const RUNS_PER_PAGE = 3;
const VIEWPORT = { width: 1280, height: 900, deviceScaleFactor: 1 };

/* ============================================================
   Helpers
   ============================================================ */

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmtMs(ms) {
  if (ms == null) return "—";
  return `${ms.toFixed(1).padStart(6)} ms`;
}

function fmtKb(bytes) {
  if (bytes == null) return "—";
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function pad(s, n) {
  return String(s).padEnd(n);
}

/* ============================================================
   Per-Page Measurement
   ============================================================ */

async function measurePage(browser, page, label) {
  const ctx = await browser.createBrowserContext();
  const pg = await ctx.newPage();
  await pg.setViewport(VIEWPORT);

  /* Emulate prefers-reduced-motion damit Animations-Driven-Costs nicht
     den Run dominieren. Wir messen Steady-State-Performance. */
  await pg.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);

  /* Cache disabled für reproduzierbare Cold-Loads. */
  await pg.setCacheEnabled(false);

  /* CDP Session für Performance-Metriken */
  const cdp = await pg.target().createCDPSession();
  await cdp.send("Performance.enable");
  await cdp.send("HeapProfiler.enable");

  /* Observer im Page-Context für Layout-Shift UND LCP. Wichtig: LCP fires
     mehrfach (jedes größere Element löst neu aus), wir nehmen den letzten
     gesehenen Wert vor User-Interaction. layout-shift bucket cumulative.
     `buffered: true` registriert auch frühe Events vor Observer-Attach. */
  await pg.evaluateOnNewDocument(() => {
    window.__perfShifts = 0;
    window.__perfLcp = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__perfShifts += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length) {
          window.__perfLcp = entries[entries.length - 1].startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
  });

  await pg.goto(label.url, { waitUntil: "load", timeout: 20000 });

  /* Settle-Period — LCP kann sich nach load noch verschieben (lazy-images,
     font-loaded reflow). 1200ms gibt dem Browser Zeit für die finale
     LCP-Bestimmung. */
  await new Promise((r) => setTimeout(r, 1200));

  const paintMetrics = await pg.evaluate(() => {
    const navi = performance.getEntriesByType("navigation")[0] || {};
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((p) => p.name === "first-contentful-paint")?.startTime;
    return {
      domContentLoaded: navi.domContentLoadedEventEnd - navi.startTime,
      load: navi.loadEventEnd - navi.startTime,
      fcp,
      lcp: window.__perfLcp || null,
      cls: window.__perfShifts || 0,
      domNodes: document.querySelectorAll("*").length,
      jsHeap: performance.memory?.usedJSHeapSize ?? null,
    };
  });

  /* CDP-Metriken für Recalc/Layout/Paint Style-Times */
  const { metrics } = await cdp.send("Performance.getMetrics");
  const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));

  await pg.close();
  await ctx.close();

  return {
    ...paintMetrics,
    /* CDP-Metriken kommen in Sekunden, *1000 für ms */
    recalcStyleDuration: (m.RecalcStyleDuration ?? 0) * 1000,
    layoutDuration: (m.LayoutDuration ?? 0) * 1000,
    scriptDuration: (m.ScriptDuration ?? 0) * 1000,
    taskDuration: (m.TaskDuration ?? 0) * 1000,
    layoutCount: m.LayoutCount ?? 0,
    recalcStyleCount: m.RecalcStyleCount ?? 0,
  };
}

/* ============================================================
   Main
   ============================================================ */

async function main() {
  const pages = PAGES.map((p) => {
    const abs = path.join(ROOT, p.file);
    if (!fs.existsSync(abs)) {
      console.error(`[perf] missing: ${p.file}`);
      process.exit(1);
    }
    return { ...p, url: "file://" + abs };
  });

  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-features=PaintHolding",
      "--enable-precise-memory-info",
    ],
  });

  const results = [];
  for (const p of pages) {
    /* Warm-up — JIT, Browser-Cache, Image-Decode etc. amortisieren */
    await measurePage(browser, p, p);

    const runs = [];
    for (let i = 0; i < RUNS_PER_PAGE; i++) {
      const r = await measurePage(browser, p, p);
      runs.push(r);
    }

    const keys = Object.keys(runs[0]);
    const aggregated = {};
    for (const k of keys) {
      aggregated[k] = median(runs.map((r) => r[k]).filter((v) => v != null));
    }
    aggregated.runs = runs.length;
    results.push({ page: p.name, ...aggregated });
  }

  await browser.close();

  /* ---- Report ---- */
  console.log(`Performance Report  (median of ${RUNS_PER_PAGE} runs, post-warm-up)\n`);
  const header = [
    pad("Page", 14),
    pad("LCP", 12),
    pad("FCP", 12),
    pad("DOMnodes", 10),
    pad("Recalc", 12),
    pad("Layout", 12),
    pad("LayoutCnt", 10),
    pad("Heap", 10),
    "CLS",
  ];
  console.log(header.join("  "));
  console.log("-".repeat(header.join("  ").length));

  for (const r of results) {
    console.log([
      pad(r.page, 14),
      fmtMs(r.lcp),
      fmtMs(r.fcp),
      pad(r.domNodes, 10),
      fmtMs(r.recalcStyleDuration),
      fmtMs(r.layoutDuration),
      pad(r.layoutCount, 10),
      fmtKb(r.jsHeap),
      r.cls.toFixed(4),
    ].join("  "));
  }

  /* ---- Persist ---- */
  const out = {
    timestamp: new Date().toISOString(),
    viewport: VIEWPORT,
    runsPerPage: RUNS_PER_PAGE,
    results,
  };
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(STATS_FILE, JSON.stringify(out, null, 2));
  console.log(`\nWritten ${path.relative(ROOT, STATS_FILE)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
