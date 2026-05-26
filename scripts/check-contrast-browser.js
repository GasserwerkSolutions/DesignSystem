#!/usr/bin/env node
/**
 * Browser-basierter Contrast-Check
 * =================================
 *
 * Lädt die echte index.html in headless Chromium, klickt sich durch alle
 * Theme-Buttons + Dark-Toggle, misst computed styles auf realen DOM-Elementen.
 *
 * Nutzt die DEMO als "Fixture" — bricht wenn die Demo selbst kaputt ist
 * (z.B. data-tone-Setter springt aufs falsche Element). Das ist gewünscht.
 *
 * Mit --compare: zusätzlich gegen static checker abgleichen.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

let puppeteer;
try { puppeteer = require("puppeteer"); }
catch (e) {
  console.error("Puppeteer nicht installiert. Run: npm install --save-dev puppeteer");
  process.exit(2);
}

const TONES = ["trust", "playful", "premium", "industrial", "modern", "minimal"];
const MODES = ["light", "dark"];

const PAIRS = [
  {
    label: "body-text on body-bg",
    selector: "body",
    fgProp: "color",
    bgProp: "backgroundColor",
    threshold: 4.5,
  },
  {
    label: "card-h3 on card-bg",
    selector: ".grid-3 .card:first-child",
    fgPath: ["h3", "color"],
    bgProp: "backgroundColor",
    threshold: 4.5,
  },
  {
    label: "nested premium card on outer bg",
    selector: ".scoped-demo[data-tone~=premium]",
    fgPath: ["h3", "color"],
    bgProp: "backgroundColor",
    threshold: 4.5,
  },
];

function parseRgb(s) {
  const m = s.match(/rgba?\((\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
function rgbToHex([r,g,b]) {
  const h = (n) => Math.round(n).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}
function relLum([r,g,b]) {
  const l = [r,g,b].map(v => { const s=v/255; return s<=0.03928?s/12.92:Math.pow((s+0.055)/1.055,2.4); });
  return 0.2126*l[0] + 0.7152*l[1] + 0.0722*l[2];
}
function contrast(a, b) {
  const l1 = relLum(a), l2 = relLum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

async function main() {
  const wantCompare = process.argv.includes("--compare");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let results = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto("file://" + path.resolve(ROOT, "index.html"));
    await new Promise((r) => setTimeout(r, 1000));

    for (const tone of TONES) {
      for (const mode of MODES) {
        await page.click(`[data-set-tone="${tone}"]`);
        const cur = await page.evaluate(() =>
          document.documentElement.getAttribute("data-mode")
        );
        if (cur !== mode) await page.click("[data-toggle-mode]");
        await new Promise((r) => setTimeout(r, 80));

        for (const pair of PAIRS) {
          const measure = await page.evaluate((sel, fgProp, fgPath, bgProp) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const cs = getComputedStyle(el);
            const bg = bgProp ? cs[bgProp] : null;
            let fg;
            if (fgPath) {
              const child = el.querySelector(fgPath[0]);
              if (!child) return null;
              fg = getComputedStyle(child)[fgPath[1]];
            } else {
              fg = cs[fgProp];
            }
            return { fg, bg };
          }, pair.selector, pair.fgProp, pair.fgPath, pair.bgProp);

          if (!measure) {
            results.push({ tone, mode, pair: pair.label, status: "missing" });
            continue;
          }
          const fg = parseRgb(measure.fg);
          const bg = parseRgb(measure.bg);
          if (!fg || !bg) {
            results.push({ tone, mode, pair: pair.label, status: "skip" });
            continue;
          }
          const ratio = contrast(fg, bg);
          results.push({
            tone, mode, pair: pair.label,
            ratio, fg, bg, threshold: pair.threshold,
            pass: ratio >= pair.threshold,
          });
        }
      }
    }
  } finally {
    await browser.close();
  }

  let failures = 0;
  let lastSection = "";
  for (const r of results) {
    const sec = `${r.tone} / ${r.mode}`;
    if (sec !== lastSection) {
      console.log(`\n=== ${sec} ===`);
      lastSection = sec;
    }
    if (r.status === "missing") {
      console.log(`  [skip] ${r.pair}: element not found`);
      continue;
    }
    if (r.status === "skip") {
      console.log(`  [skip] ${r.pair}: rgb parse failed`);
      continue;
    }
    const mark = r.pass ? "[ok]  " : "[FAIL]";
    console.log(
      `  ${mark} ${r.pair}: ${r.ratio.toFixed(2)}:1  ` +
      `(threshold ${r.threshold}:1)  ${rgbToHex(r.fg)} / ${rgbToHex(r.bg)}`
    );
    if (!r.pass) failures++;
  }

  console.log("");
  if (failures > 0) {
    console.error(`${failures} Verletzung(en) im Browser-Render.`);
    process.exit(1);
  }
  console.log(`Browser-Check: alle ${results.filter(r => r.pass).length} Paare passen WCAG AA.`);

  if (!wantCompare) return;

  // ===== Compare against static checker =====
  console.log("\n--- Cross-Check gegen static resolver ---");
  let staticOut;
  try {
    staticOut = execSync("node " + path.join(__dirname, "check-contrast.js"), {
      cwd: ROOT, stdio: ["ignore", "pipe", "pipe"],
    }).toString();
  } catch (e) { staticOut = e.stdout?.toString() || ""; }

  // Parse: section "tone / mode" plus body-text on body-bg ratio
  // Wir vergleichen nur Root-Scope-Pairs (light+dark) wo Browser sie auch hat
  const staticResults = new Map();
  let curTone = null, curMode = null;
  for (const line of staticOut.split("\n")) {
    const sec = /^=== ([\w-]+) \/ ([\w-]+) ===/.exec(line);
    if (sec) { curTone = sec[1]; curMode = sec[2]; continue; }
    const res = /^\s+\[(ok|FAIL)\]\s+body-text on body-bg:\s+([\d.]+):1/.exec(line);
    if (res && curTone && (curMode === "light" || curMode === "dark")) {
      staticResults.set(`${curTone}/${curMode}`, parseFloat(res[2]));
    }
  }

  let diffs = 0;
  for (const r of results) {
    if (!r.pass || r.pair !== "body-text on body-bg") continue;
    const key = `${r.tone}/${r.mode}`;
    const stat = staticResults.get(key);
    if (stat === undefined) continue;
    const delta = Math.abs(r.ratio - stat);
    if (delta > 0.1) {
      console.log(`  [DIFF] ${key}: browser=${r.ratio.toFixed(2)} static=${stat.toFixed(2)} Δ=${delta.toFixed(2)}`);
      diffs++;
    }
  }
  if (diffs > 0) {
    console.error(`\n${diffs} Divergenz(en) zwischen Browser und static.`);
    process.exit(2);
  }
  console.log("Browser und static stimmen überein.");
}

main().catch(e => { console.error(e); process.exit(2); });
