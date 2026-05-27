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

const TONES = ["trust", "playful", "premium", "industrial", "modern", "minimal"];
const MODES = ["light", "dark"];

const VIEWPORT = { width: 1280, height: 900 };
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

async function captureCombination(page, tone, mode) {
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

async function main() {
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
