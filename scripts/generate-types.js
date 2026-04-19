#!/usr/bin/env node
/**
 * TypeScript Type-Definitions-Generator
 * ======================================
 *
 * Erzeugt dist/tokens.d.ts mit Union-Types aller Design-Tokens.
 * Nutzbar in React/TSX für typsicheres Styling:
 *
 *   import type { TokenName, ColorTokenName } from "./tokens";
 *   const style: Record<TokenName, string> = { "--color-bg": "red" };
 *
 * Usage: node scripts/generate-types.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT  = path.join(ROOT, "dist", "tokens.d.ts");

function readTokens(file) {
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const m = /:root\s*\{([\s\S]*?)\}/.exec(css);
  if (!m) return [];
  return [...m[1].matchAll(/(--[a-zA-Z0-9-]+)\s*:(?![a-zA-Z:])/g)].map((x) => x[1]);
}

const all = new Set([
  ...readTokens(path.join(ROOT, "tokens/tokens.css")),
  ...readTokens(path.join(ROOT, "semantic/semantic.css")),
]);

function classify(name) {
  if (/^--color-|^--gray-|^--trust-|^--playful-|^--industrial-|^--modern-|^--badge-bg|^--badge-fg|^--card-bg|^--btn-bg|^--btn-fg|^--nav-bg|^--focus-ring/.test(name)) return "color";
  if (/^--space-/.test(name)) return "spacing";
  if (/^--radius-/.test(name)) return "radius";
  if (/^--font-/.test(name) && !/serif|sans|mono|body|display|code/.test(name)) return "fontSize";
  if (/^--(fw-|text-weight)/.test(name)) return "fontWeight";
  if (/^--(motion-|duration-)/.test(name)) return "duration";
  if (/^--(ease|easing)/.test(name)) return "easing";
  if (/^--shadow-/.test(name)) return "shadow";
  if (/^--z-/.test(name)) return "zIndex";
  return "other";
}

const groups = {
  color: [], spacing: [], radius: [], fontSize: [], fontWeight: [],
  duration: [], easing: [], shadow: [], zIndex: [], other: [],
};

for (const token of [...all].sort()) {
  groups[classify(token)].push(token);
}

function toUnion(name, members) {
  if (members.length === 0) return `export type ${name} = never;\n`;
  return `export type ${name} =\n${members.map((m) => `  | "${m}"`).join("\n")};\n`;
}

const out = [
  "// Auto-generated — do not edit.",
  "// Source: tokens.css + semantic.css",
  "// Run: node scripts/generate-types.js",
  "",
  toUnion("TokenName", [...all].sort()),
  toUnion("ColorToken", groups.color),
  toUnion("SpacingToken", groups.spacing),
  toUnion("RadiusToken", groups.radius),
  toUnion("FontSizeToken", groups.fontSize),
  toUnion("FontWeightToken", groups.fontWeight),
  toUnion("DurationToken", groups.duration),
  toUnion("EasingToken", groups.easing),
  toUnion("ShadowToken", groups.shadow),
  toUnion("ZIndexToken", groups.zIndex),
  "",
  "/** Theme tone IDs accepted by data-tone attribute */",
  `export type Tone = "trust" | "playful" | "premium" | "industrial" | "modern" | "minimal";`,
  "",
  "/** Display mode accepted by data-mode attribute */",
  `export type Mode = "light" | "dark" | "auto";`,
  "",
].join("\n");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log(`Wrote ${all.size} tokens → ${path.relative(ROOT, OUT)}`);
