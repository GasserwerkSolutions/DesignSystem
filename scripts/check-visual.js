#!/usr/bin/env node
/**
 * Visual-Regression-Check via pixelmatch
 * ========================================
 *
 * Lädt die Demo in headless Chromium, durchläuft alle Tone × Mode-
 * Kombinationen, macht pro Kombi einen full-page-Screenshot, vergleicht
 * mit der Baseline in tests/visual/. Diff-Pixel über Threshold → fail.
 *
 * Pipeline-Stellung: ergänzt Lint (Source-Level), Contrast (Numerische
 * Cascade-Simulation), A11Y (ARIA-Vertrag) um die letzte Ebene:
 * "Sieht das gerendert noch aus wie erwartet?"
 *
 * Strategie:
 *   - Pro Tone × Mode 1 Baseline (12 PNGs total)
 *   - Sub-Pixel-Anti-Aliasing toleriert via pixelmatch threshold 0.1
 *   - maxDiffPixelRatio: 0.005 (= 0.5% des Bildes darf abweichen,
 *     z.B. für Animations-Mid-State oder Font-Hinting-Drift)
 *   - Fonts via document.fonts.ready abgewartet vor Screenshot
 *   - Animations via prefers-reduced-motion-Emulation gestoppt
 *
 * Output:
 *   tests/visual/<tone>-<mode>.png            Baseline (committed)
 *   tests/visual/_diff/<tone>-<mode>.png      Diff-Image (gitignored)
 *
 * Usage:
 *   node scripts/check-visual.js              vergleichen
 *   node scripts/check-visual.js --update     Baselines überschreiben
 *   node scripts/check-visual.js --create     nur fehlende Baselines anlegen
 */

const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const ROOT = path.resolve(__dirname, "..");
const VISUAL_DIR = path.join(ROOT, "tests", "visual");
const DIFF_DIR   = path.join(VISUAL_DIR, "_diff");

const UPDATE = process.argv.includes("--update");
const CREATE = process.argv.includes("--create");
const SELF_TEST = process.argv.includes("--self-test");

const TONES = ["trust", "playful", "premium", "industrial", "modern", "minimal"];
const MODES = ["light", "dark"];

const VIEWPORT = { width: 1280, height: 900 };
const METADATA_FILE = path.join(ROOT, "tests", "visual", ".metadata.json");
// Anti-Aliasing-Toleranz pro Pixel; pixelmatch-default ist 0.1 (mild).
const PIXEL_THRESHOLD = 0.1;
// Absolute Pixel-Toleranz (catches AA-drift + Font-Hinting, fängt aber
// echte Änderungen wie 1px Radius-Shift pro Button). Empirisch kalibriert:
// 16px Radius-Change in trust-Theme produziert ~2500 px diff, sub-pixel-
// AA-noise typisch < 200 px. 500 ist der sweet spot.
const MAX_DIFF_PIXELS = 500;

let puppeteer;
let pixelmatch;
try {
  puppeteer = require("puppeteer");
  // pixelmatch v7 ist ESM-only → dynamic import.
} catch {
  console.error("Puppeteer fehlt. Run: npm install --save-dev puppeteer");
  process.exit(1);
}

async function loadPixelmatch() {
  if (pixelmatch) return pixelmatch;
  const mod = await import("pixelmatch");
  pixelmatch = mod.default || mod;
  return pixelmatch;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function pngFromBuffer(buf) {
  return PNG.sync.read(buf);
}

function readBaselineFile(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writePng(filePath, png) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

async function setupPage(page) {
  await page.setViewport(VIEWPORT);
  // Reduced-motion-Emulation: stoppt Transitions, eliminiert mid-flight
  // Animation-Frames als Snapshot-Quelle für Drift.
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
}

/**
 * Host-Info: Browser-Version + Platform. Wird in tests/visual/.metadata.json
 * geschrieben beim --update + bei normalen Runs verglichen. Drift macht
 * Pixel-Diffs wahrscheinlicher → Konsumenten sehen die Ursache vor dem
 * Run statt nach dem Debug.
 */
async function getHostInfo(browser) {
  return {
    chromiumVersion: await browser.version(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    viewport: VIEWPORT,
  };
}

function compareHostInfo(baseline, current) {
  const drifts = [];
  if (baseline.chromiumVersion !== current.chromiumVersion) {
    drifts.push(`chromium: baseline=${baseline.chromiumVersion}, current=${current.chromiumVersion}`);
  }
  if (baseline.platform !== current.platform) {
    drifts.push(`platform: baseline=${baseline.platform}, current=${current.platform}`);
  }
  if (baseline.arch !== current.arch) {
    drifts.push(`arch: baseline=${baseline.arch}, current=${current.arch}`);
  }
  if (baseline.viewport.width !== current.viewport.width || baseline.viewport.height !== current.viewport.height) {
    drifts.push(`viewport: baseline=${baseline.viewport.width}x${baseline.viewport.height}, current=${current.viewport.width}x${current.viewport.height}`);
  }
  return drifts;
}

async function captureCombination(page, tone, mode) {
  // networkidle0 ist notwendig: domcontentloaded führt zu Dimension-Drift
  // (Page noch nicht voll gerendert wenn screenshot läuft, Font-Fallback-
  // Layout-Shifts produzieren unterschiedliche Höhen zwischen Runs).
  // Verifiziert in v0.6.6-Experimenten — Trade-off Zeit vs Determinismus.
  await page.goto("file://" + path.resolve(ROOT, "index.html"), {
    waitUntil: "networkidle0",
  });
  // Persistente Demo-Auswahl aus früheren Iterationen löschen.
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
  });

  // Tone + Mode programmatisch setzen (statt durch die Topbar-Buttons,
  // weil die einen Page-Reload-State-Cycle haben würden).
  await page.evaluate(({ tone, mode }) => {
    const html = document.documentElement;
    html.setAttribute("data-tone", tone);
    html.setAttribute("data-mode", mode);
  }, { tone, mode });

  // Animations + Transitions DEFINITIV stoppen — prefers-reduced-motion
  // verlangsamt nur (z.B. Spinner-CSS dreht weiter mit 2.5s/Umdrehung),
  // hier braucht's harten Stop für deterministische Snapshots.
  // Plus: animation-Frames warten, damit final-state gerendert ist.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        transition-delay: 0s !important;
      }
    `,
  });

  // Auf Font-Loading warten — `document.fonts.ready` resolved wenn alle
  // @font-face geladen sind (oder mit Fallbacks gefüllt). Determinismus.
  await page.evaluate(() => document.fonts.ready);
  // Animation-Frame abwarten, damit alle Effekte ihren End-State haben.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  );

  const buf = await page.screenshot({ fullPage: true, type: "png" });
  return pngFromBuffer(buf);
}

function diffImages(baselinePng, actualPng) {
  if (
    baselinePng.width !== actualPng.width ||
    baselinePng.height !== actualPng.height
  ) {
    return {
      dimensionsMismatch: true,
      baseline: { w: baselinePng.width, h: baselinePng.height },
      actual:   { w: actualPng.width,   h: actualPng.height },
    };
  }
  const { width, height } = baselinePng;
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(
    baselinePng.data,
    actualPng.data,
    diff.data,
    width,
    height,
    { threshold: PIXEL_THRESHOLD }
  );
  return {
    dimensionsMismatch: false,
    diffPixels,
    totalPixels: width * height,
    diff,
  };
}

/**
 * Self-Test: beweist dass VRT realistische Visual-Changes erkennt.
 * Mutiert je ein bekanntes Token in einer Theme-Datei, ruft den VRT in
 * einem Subprocess auf (damit keine Rekursion), parsed Output gegen
 * erwartete Fail-Labels + Pixel-Ranges, restored die Datei.
 *
 * Threshold-Kalibrierung: wenn eine echte Mutation NICHT mehr in den
 * erwarteten Range fällt, muss MAX_DIFF_PIXELS oder die Mutation
 * angepasst werden. Sensitivitäts-Drift wird so sichtbar.
 */
const MUTATIONS = [
  {
    name: "trust --btn-radius 8 → 24 (corner-shift pro Button)",
    file: path.join(ROOT, "themes/trust.css"),
    find: "--btn-radius:       var(--radius-8);",
    replace: "--btn-radius: var(--radius-24);",
    expectedFails: ["trust-light", "trust-dark"],
    minPixels: 1000,
    maxPixels: 50000,
  },
  {
    name: "premium --space-section 96 → 32 (extreme layout-shift)",
    file: path.join(ROOT, "themes/premium.css"),
    find: "--space-section: var(--space-96);",
    replace: "--space-section: var(--space-32);",
    expectedFails: ["premium-light", "premium-dark"],
    minPixels: 100_000,
    maxPixels: 10_000_000,
  },
  {
    name: "modern --btn-radius 4 → 24 (large per-button corner-shift)",
    file: path.join(ROOT, "themes/modern.css"),
    find: "--btn-radius:       var(--radius-4);",
    replace: "--btn-radius: var(--radius-24);",
    expectedFails: ["modern-light", "modern-dark"],
    minPixels: 1000,
    maxPixels: 50_000,
  },
];

async function selfTest() {
  const { spawnSync } = require("child_process");
  console.log("VRT Self-Test (Sensitivity-Suite):");
  console.log("");

  let allPassed = true;

  for (const m of MUTATIONS) {
    const original = fs.readFileSync(m.file, "utf8");
    if (!original.includes(m.find)) {
      console.error(`  [SKIP] ${m.name}`);
      console.error(`         target not found in ${path.relative(ROOT, m.file)}`);
      allPassed = false;
      continue;
    }

    try {
      fs.writeFileSync(m.file, original.replace(m.find, m.replace));

      // Subprocess-Call ohne --self-test → normaler VRT-Run gegen Baselines.
      // Wir erwarten exit=1 (= Mutation gefangen).
      const res = spawnSync("node", [__filename], {
        encoding: "utf8",
        cwd: ROOT,
        timeout: 60_000,
      });
      const output = res.stdout + res.stderr;

      // 1) Wurden die erwarteten Tone×Mode-Kombis als [fail] gemeldet?
      // Pixel-Diff-Fail ODER dimension-Mismatch-Fail zählen beide als "caught".
      // Dimension-Fails bekommen den Sentinel-Wert -1 (skip Range-Check).
      const seen = new Map();
      const pxRegex  = /\[fail\]\s+([\w-]+)\s+(\d+)\s+px diff/g;
      const dimRegex = /\[fail\]\s+([\w-]+)\s+dimensions:/g;
      let match;
      while ((match = pxRegex.exec(output)) !== null) {
        seen.set(match[1], parseInt(match[2], 10));
      }
      while ((match = dimRegex.exec(output)) !== null) {
        if (!seen.has(match[1])) seen.set(match[1], -1);
      }

      const missingFails = m.expectedFails.filter((l) => !seen.has(l));
      if (missingFails.length > 0) {
        console.error(`  [FAIL] ${m.name}`);
        console.error(`         Erwartete Fail-Labels NICHT gemeldet: ${missingFails.join(", ")}`);
        const auszug = output.split("\n").filter((l) =>
          m.expectedFails.some((label) => l.includes(label))
        );
        if (auszug.length > 0) {
          console.error(`         Output-Auszug:\n${auszug.slice(0, 6).map((l) => "         " + l).join("\n")}`);
        }
        allPassed = false;
        continue;
      }

      // 2) Liegen die Pixel-Counts in den erwarteten Ranges?
      // Bei dimension-fails (px === -1) wird kein Range gechecked — die
      // Mutation hat layout-shift produziert, was auch eine valide
      // Catch-Form ist.
      let inRange = true;
      for (const label of m.expectedFails) {
        const px = seen.get(label);
        if (px === -1) continue; // dimension-mismatch: valid catch
        if (px < m.minPixels || px > m.maxPixels) {
          console.error(`  [FAIL] ${m.name}`);
          console.error(`         ${label} = ${px} px außerhalb [${m.minPixels}, ${m.maxPixels}]`);
          console.error(`         → MAX_DIFF_PIXELS oder Mutation neu kalibrieren.`);
          allPassed = false;
          inRange = false;
        }
      }

      if (inRange) {
        const pxs = m.expectedFails.map((l) => {
          const v = seen.get(l);
          return v === -1 ? `${l}=DIM` : `${l}=${v}`;
        }).join(", ");
        console.log(`  [ok]   ${m.name}`);
        console.log(`         caught: ${pxs}`);
      }
    } finally {
      fs.writeFileSync(m.file, original);
    }
  }

  console.log("");
  if (!allPassed) {
    console.error("VRT Self-Test FAILED — Pipeline würde echte Bugs durchlassen.");
    process.exit(1);
  }
  console.log("VRT Self-Test passed — VRT erkennt alle kalibrierten Mutationen.");
}

async function main() {
  if (SELF_TEST) {
    await selfTest();
    return;
  }

  await loadPixelmatch();
  ensureDir(VISUAL_DIR);
  // Stale Diff-Files aus früheren fails löschen — sonst Confusion.
  if (fs.existsSync(DIFF_DIR)) {
    for (const f of fs.readdirSync(DIFF_DIR)) {
      fs.unlinkSync(path.join(DIFF_DIR, f));
    }
  } else {
    ensureDir(DIFF_DIR);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const currentHost = await getHostInfo(browser);

  // Host-Drift gegen Baseline-Metadata prüfen — sichtbar machen, dass
  // Pixel-Diffs auf Browser/Platform-Drift zurückgehen könnten.
  if (fs.existsSync(METADATA_FILE)) {
    const baselineMeta = JSON.parse(fs.readFileSync(METADATA_FILE, "utf8"));
    const drifts = compareHostInfo(baselineMeta, currentHost);
    if (drifts.length > 0) {
      console.warn("  [warn] Host-Drift gegenüber Baseline-Metadata:");
      drifts.forEach((d) => console.warn(`         → ${d}`));
      console.warn("         Pixel-Diffs könnten auf Browser/Platform-Drift zurückgehen.");
      console.warn("         Baseline auf aktuellem Host regenerieren: npm run check:visual:update");
      console.warn("");
    }
  } else if (!UPDATE && !CREATE) {
    console.warn("  [warn] Keine Baseline-Metadata gefunden — VRT kann Cross-Host-Drift nicht erkennen.");
    console.warn("         Initialisieren mit: npm run check:visual:update");
    console.warn("");
  }

  let createdCount = 0;
  let failCount = 0;
  let okCount = 0;

  try {
    const page = await browser.newPage();
    await setupPage(page);

    for (const tone of TONES) {
      for (const mode of MODES) {
        const label = `${tone}-${mode}`;
        const baselineFile = path.join(VISUAL_DIR, `${label}.png`);
        const baselineExists = fs.existsSync(baselineFile);

        const actual = await captureCombination(page, tone, mode);

        if (!baselineExists || UPDATE || CREATE && !baselineExists) {
          writePng(baselineFile, actual);
          console.log(`  [new]   ${label}  (${actual.width}×${actual.height})`);
          createdCount++;
          continue;
        }

        if (CREATE) {
          // Baseline existiert + nur --create → skip Vergleich
          console.log(`  [skip]  ${label}  (baseline existiert, --create only)`);
          continue;
        }

        const baseline = readBaselineFile(baselineFile);
        const result = diffImages(baseline, actual);

        if (result.dimensionsMismatch) {
          const { baseline: b, actual: a } = result;
          console.error(
            `  [fail]  ${label}  dimensions: baseline ${b.w}×${b.h} ≠ actual ${a.w}×${a.h}`
          );
          // Diff-Image kann nicht erzeugt werden — schreibe actual als
          // "actual.png" daneben, damit ein Vergleich möglich bleibt.
          writePng(path.join(DIFF_DIR, `${label}.actual.png`), actual);
          failCount++;
          continue;
        }

        const ratio = result.diffPixels / result.totalPixels;
        if (result.diffPixels > MAX_DIFF_PIXELS) {
          writePng(path.join(DIFF_DIR, `${label}.diff.png`), result.diff);
          writePng(path.join(DIFF_DIR, `${label}.actual.png`), actual);
          console.error(
            `  [fail]  ${label}  ${result.diffPixels} px diff ` +
            `(${(ratio * 100).toFixed(3)}%, > ${MAX_DIFF_PIXELS} max)`
          );
          failCount++;
        } else if (result.diffPixels > 0) {
          console.log(
            `  [ok]    ${label}  ${result.diffPixels} px diff within ${MAX_DIFF_PIXELS} max`
          );
          okCount++;
        } else {
          console.log(`  [ok]    ${label}  pixel-identical`);
          okCount++;
        }
      }
    }

    // Metadata bei Update/Create-Run mit aktuellem Host schreiben —
    // serves as Vertrag: "diese Baselines wurden auf DIESEM Browser erstellt".
    if (UPDATE || (CREATE && createdCount > 0)) {
      fs.writeFileSync(METADATA_FILE, JSON.stringify(currentHost, null, 2));
      console.log(`  [meta]  baseline-metadata aktualisiert: ${currentHost.chromiumVersion} auf ${currentHost.platform}/${currentHost.arch}`);
    }
  } finally {
    await browser.close();
  }

  console.log("");
  console.log(
    `Visual-Check: ${okCount} ok · ${createdCount} created · ${failCount} fail`
  );
  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Visual-Check crashed:", err);
  process.exit(2);
});
