#!/usr/bin/env node
/**
 * Bundle Size Measurement + Budget Enforcement
 * =============================================
 *
 * Misst die ausgelieferte CSS-Größe in mehreren Dimensionen:
 *   - main.css (bundled über esbuild, alle @imports resolved) raw + gzip
 *   - main.min.css (bundled + minified) raw + gzip
 *   - Per-Layer (tokens, semantic, themes, base, state, components)
 *   - Per-Component (alle 48)
 *
 * Output:
 *   - Human-readable Tabelle nach stdout
 *   - JSON nach dist/bundle-stats.json (für Site-Anzeige + History-Tracking)
 *
 * Budget-Enforcement:
 *   - In package.json unter "bundleBudget" konfiguriert (siehe dort)
 *   - --check Flag failt mit exit 1, wenn ein Budget überschritten ist
 *   - Sonst nur Warnung
 *
 * Schreibt zusätzlich dist/main.min.css aus dem Bundle-Build, damit Konsumenten
 * direkt eine minified-Variante haben (main.css bleibt source-of-truth).
 */

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const esbuild = require("esbuild");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "dist");
const STATS_FILE = path.join(OUT_DIR, "bundle-stats.json");
const MIN_FILE = path.join(OUT_DIR, "main.min.css");

const PKG = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
);
const BUDGET = PKG.bundleBudget || {};

const CHECK_MODE = process.argv.includes("--check");

/* ============================================================
   Helpers
   ============================================================ */

function fileSize(filePath) {
  return fs.statSync(filePath).size;
}

function gzipSize(buffer) {
  return zlib.gzipSync(buffer, { level: 9 }).length;
}

function brotliSize(buffer) {
  return zlib.brotliCompressSync(buffer, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length;
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function pad(s, n) {
  return String(s).padEnd(n);
}

/* ============================================================
   Bundle + measure
   ============================================================ */

async function bundle({ minify }) {
  const tmp = path.join(
    require("os").tmpdir(),
    `ds-bundle-${minify ? "min" : "raw"}-${Date.now()}.css`
  );
  await esbuild.build({
    entryPoints: [path.join(ROOT, "main.css")],
    bundle: true,
    minify,
    outfile: tmp,
    loader: { ".css": "css" },
    logLevel: "silent",
  });
  const content = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return content;
}

function measureFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return {
    raw: buf.length,
    gzip: gzipSize(buf),
    brotli: brotliSize(buf),
  };
}

function measureDir(dir, label) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".css"))
    .map((f) => path.join(dir, f));
  let raw = 0;
  for (const f of files) raw += fileSize(f);
  return { label, raw, files: files.length };
}

function measureComponents() {
  const dir = path.join(ROOT, "components");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".css"))
    .map((f) => ({
      name: path.basename(f, ".css"),
      raw: fileSize(path.join(dir, f)),
    }))
    .sort((a, b) => b.raw - a.raw);
}

/* ============================================================
   Budget enforcement
   ============================================================ */

function checkBudget(stats) {
  const failures = [];
  const checks = [
    ["bundle.raw", stats.bundle.raw, BUDGET.bundle?.raw],
    ["bundle.gzip", stats.bundle.gzip, BUDGET.bundle?.gzip],
    ["minified.raw", stats.minified.raw, BUDGET.minified?.raw],
    ["minified.gzip", stats.minified.gzip, BUDGET.minified?.gzip],
  ];
  for (const [name, actual, limit] of checks) {
    if (limit != null && actual > limit) {
      failures.push({ name, actual, limit });
    }
  }
  return failures;
}

/* ============================================================
   Main
   ============================================================ */

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const bundleBuf = await bundle({ minify: false });
  const minBuf = await bundle({ minify: true });

  fs.writeFileSync(MIN_FILE, minBuf);

  const bundleStats = {
    raw: bundleBuf.length,
    gzip: gzipSize(bundleBuf),
    brotli: brotliSize(bundleBuf),
  };
  const minStats = {
    raw: minBuf.length,
    gzip: gzipSize(minBuf),
    brotli: brotliSize(minBuf),
  };

  const layers = [
    measureDir(path.join(ROOT, "tokens"), "tokens"),
    measureDir(path.join(ROOT, "semantic"), "semantic"),
    measureDir(path.join(ROOT, "themes"), "themes"),
    measureDir(path.join(ROOT, "base"), "base"),
    measureDir(path.join(ROOT, "state"), "state"),
    measureDir(path.join(ROOT, "components"), "components"),
  ].filter(Boolean);

  const components = measureComponents();

  const stats = {
    timestamp: new Date().toISOString(),
    version: PKG.version,
    bundle: bundleStats,
    minified: minStats,
    layers,
    components,
  };

  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));

  /* ---- Print report ---- */
  console.log(`Bundle Size Report — v${PKG.version}\n`);
  console.log("Bundled (alle @imports resolved):");
  console.log(`  raw    : ${fmt(bundleStats.raw)}`);
  console.log(`  gzip   : ${fmt(bundleStats.gzip)}`);
  console.log(`  brotli : ${fmt(bundleStats.brotli)}`);
  console.log("");
  console.log("Minified:");
  console.log(`  raw    : ${fmt(minStats.raw)}`);
  console.log(`  gzip   : ${fmt(minStats.gzip)}`);
  console.log(`  brotli : ${fmt(minStats.brotli)}`);
  console.log("");
  console.log("Per Layer (raw source):");
  for (const l of layers) {
    console.log(
      `  ${pad(l.label, 12)} ${pad(fmt(l.raw), 10)} (${l.files} Datei${l.files === 1 ? "" : "en"})`
    );
  }
  console.log("");
  console.log("Top 10 größte Components (raw source):");
  for (const c of components.slice(0, 10)) {
    console.log(`  ${pad(c.name, 18)} ${fmt(c.raw)}`);
  }

  /* ---- Budget check ---- */
  if (Object.keys(BUDGET).length === 0) {
    console.log("");
    console.log("Kein Budget gesetzt (package.json:bundleBudget).");
  } else {
    console.log("");
    console.log("Budget-Check:");
    const failures = checkBudget(stats);
    const budgetItems = [
      ["bundle.raw", bundleStats.raw, BUDGET.bundle?.raw],
      ["bundle.gzip", bundleStats.gzip, BUDGET.bundle?.gzip],
      ["minified.raw", minStats.raw, BUDGET.minified?.raw],
      ["minified.gzip", minStats.gzip, BUDGET.minified?.gzip],
    ];
    for (const [name, actual, limit] of budgetItems) {
      if (limit == null) continue;
      const pct = ((actual / limit) * 100).toFixed(0);
      const ok = actual <= limit;
      console.log(
        `  ${ok ? "[ok]  " : "[FAIL]"} ${pad(name, 16)} ${pad(
          fmt(actual),
          10
        )} / ${pad(fmt(limit), 10)} (${pct}%)`
      );
    }
    if (CHECK_MODE && failures.length) {
      console.error("");
      console.error(`Budget überschritten in ${failures.length} Kategorie(n).`);
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
