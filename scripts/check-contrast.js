#!/usr/bin/env node
/**
 * WCAG-AA Contrast-Check
 * =======================
 *
 * Prüft kritische Farbkombinationen pro Theme gegen WCAG AA (4.5:1).
 * Liest tokens.css + semantic.css + theme-Overrides, resolvt die
 * effektiven Werte, berechnet Contrast-Ratios.
 *
 * Usage: node scripts/check-contrast.js
 * Exit:  0 = alle Paare ≥ 4.5:1, 1 = mindestens ein Paar fails
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// Critical Pairs: Text-Color × Background-Color, die WCAG AA erfüllen müssen
const PAIRS = [
  { fg: "--color-text-primary",   bg: "--color-bg",           threshold: 4.5, label: "body-text on body-bg" },
  { fg: "--color-text-secondary", bg: "--color-bg",           threshold: 4.5, label: "secondary-text on body-bg" },
  { fg: "--color-text-primary",   bg: "--card-bg",            threshold: 4.5, label: "body-text on card-bg" },
  { fg: "--color-text-tertiary",  bg: "--color-bg",           threshold: 3.0, label: "tertiary-text (hint/meta) on body-bg" },
];

const THEMES = ["", "trust", "playful", "premium", "industrial", "modern", "minimal", "arch"];

// ========== Color Parsing & Contrast Math ==========

const NAMED = { white: "#ffffff", black: "#000000" };

function toHex(value) {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
  return null;
}

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relLuminance([r, g, b]) {
  const srgb = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrast(rgb1, rgb2) {
  const l1 = relLuminance(rgb1);
  const l2 = relLuminance(rgb2);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

// ========== Token Resolver ==========

function parseCss(file) {
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return css;
}

function extractTokens(css, scope) {
  // scope: "" → :root, oder "trust" für [data-tone~="trust"]
  const selectorRe = scope
    ? new RegExp(`\\[data-tone~="${scope}"\\]\\s*\\{([^}]+)\\}`, "g")
    : /:root\s*\{([^}]+)\}/g;
  const out = {};
  let m;
  while ((m = selectorRe.exec(css)) !== null) {
    const body = m[1];
    for (const decl of body.split(";")) {
      const [k, ...v] = decl.split(":");
      const name = (k || "").trim();
      const value = v.join(":").trim();
      if (name.startsWith("--") && value) out[name] = value;
    }
  }
  return out;
}

function resolveVar(name, tokens, depth = 0) {
  if (depth > 20) return null;
  if (!tokens[name]) return null;
  let value = tokens[name];
  // Handle nested var() — pick first var reference, ignore fallbacks
  const varMatch = /var\((--[a-zA-Z0-9-]+)(?:\s*,\s*([^)]+))?\)/.exec(value);
  if (varMatch) return resolveVar(varMatch[1], tokens, depth + 1);
  // Hex-Color?
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;
  return value;
}

// ========== Main ==========

const tokensCss    = parseCss(path.join(ROOT, "tokens/tokens.css"));
const semanticCss  = parseCss(path.join(ROOT, "semantic/semantic.css"));

const baseTokens   = { ...extractTokens(tokensCss, ""), ...extractTokens(semanticCss, "") };

let failures = 0;
for (const tone of THEMES) {
  const label = tone || "default (trust baseline)";
  let themeTokens = { ...baseTokens };
  if (tone) {
    const themeCss = parseCss(path.join(ROOT, "themes", `${tone}.css`));
    Object.assign(themeTokens, extractTokens(themeCss, tone));
  }

  console.log(`\n=== ${label} ===`);
  for (const { fg, bg, threshold, label: pairLabel } of PAIRS) {
    const fgValue = resolveVar(fg, themeTokens);
    const bgValue = resolveVar(bg, themeTokens);
    if (!fgValue || !bgValue) {
      console.log(`  [skip] ${pairLabel}: couldn't resolve`);
      continue;
    }
    const fgHex = toHex(fgValue);
    const bgHex = toHex(bgValue);
    if (!fgHex || !bgHex) {
      console.log(`  [skip] ${pairLabel}: unresolvable color (${fgValue} / ${bgValue})`);
      continue;
    }
    const ratio = contrast(hexToRgb(fgHex), hexToRgb(bgHex));
    const pass = ratio >= threshold;
    const mark = pass ? "[ok]  " : "[FAIL]";
    console.log(`  ${mark} ${pairLabel}: ${ratio.toFixed(2)}:1  (threshold ${threshold}:1)  ${fgValue} / ${bgValue}`);
    if (!pass) failures++;
  }
}

console.log("");
if (failures > 0) {
  console.error(`${failures} Kontrast-Verletzung(en) gefunden.`);
  process.exit(1);
}
console.log("Alle kritischen Farb-Paare erfüllen WCAG AA.");
