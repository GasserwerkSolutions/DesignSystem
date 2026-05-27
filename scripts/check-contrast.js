#!/usr/bin/env node
/**
 * WCAG-AA Contrast-Check — Tone × Mode + Nested
 * ==============================================
 *
 * Liest tokens.css + semantic.css + alle themes/*.css + semantic/dark.css.
 * Resolved Tokens pro:
 *   - Tone × Mode-Kombination (root scope)
 *   - Nested-Scope: jedes andere Theme verschachtelt im Root-Tone
 *
 * Unterstützt:
 *   - var(--token), color-mix(in oklch, A pct%, B), hex
 *   - Layer-Reihenfolge aus main.css gelesen
 *   - @media (prefers-color-scheme: X)
 *   - Descendant-Selectoren [data-mode="X"] [data-tone] (für nested coverage)
 *
 * Usage: node scripts/check-contrast.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const PAIRS = [
  // Core text-on-surface
  { fg: "--color-text-primary",   bg: "--color-bg",           threshold: 4.5, label: "body-text on body-bg" },
  { fg: "--color-text-secondary", bg: "--color-bg",           threshold: 4.5, label: "secondary-text on body-bg" },
  { fg: "--color-text-primary",   bg: "--card-bg",            threshold: 4.5, label: "body-text on card-bg" },
  { fg: "--color-text-tertiary",  bg: "--color-bg",           threshold: 3.0, label: "tertiary-text on body-bg" },

  // Status-Tripel — Callout/Badge/Banner ziehen Title/Strong-Text aus --status-X-fg
  // gegen den pastelligen --status-X-bg. Body-Text bleibt --color-text-primary.
  { fg: "--status-info-fg",       bg: "--status-info-bg",     threshold: 4.5, label: "status-info: title-on-bg" },
  { fg: "--color-text-primary",   bg: "--status-info-bg",     threshold: 4.5, label: "status-info: body-on-bg" },
  { fg: "--status-success-fg",    bg: "--status-success-bg",  threshold: 4.5, label: "status-success: title-on-bg" },
  { fg: "--color-text-primary",   bg: "--status-success-bg",  threshold: 4.5, label: "status-success: body-on-bg" },
  { fg: "--status-warning-fg",    bg: "--status-warning-bg",  threshold: 4.5, label: "status-warning: title-on-bg" },
  { fg: "--color-text-primary",   bg: "--status-warning-bg",  threshold: 4.5, label: "status-warning: body-on-bg" },
  { fg: "--status-danger-fg",     bg: "--status-danger-bg",   threshold: 4.5, label: "status-danger: title-on-bg" },
  { fg: "--color-text-primary",   bg: "--status-danger-bg",   threshold: 4.5, label: "status-danger: body-on-bg" },
];

const TONES = ["trust", "playful", "premium", "industrial", "modern", "minimal"];
const MODES = ["light", "dark", "auto-light", "auto-dark"];

function modeContext(mode) {
  if (mode === "light")      return { mode: "light",  prefersColorScheme: "light" };
  if (mode === "dark")       return { mode: "dark",   prefersColorScheme: "dark"  };
  if (mode === "auto-light") return { mode: null,     prefersColorScheme: "light" };
  if (mode === "auto-dark")  return { mode: null,     prefersColorScheme: "dark"  };
  throw new Error("unknown mode: " + mode);
}

// ============================================================
// Color math
// ============================================================
const NAMED = { white: "#ffffff", black: "#000000", transparent: null };

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 8) hex = hex.slice(0, 6);
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  const h = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return "#" + h(r) + h(g) + h(b);
}

function relLum([r, g, b]) {
  const srgb = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrast(a, b) {
  const l1 = relLum(a), l2 = relLum(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// OKLab color-mix
function sLin(c) { c /= 255; return c <= 0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
function lSrgb(c) { const v = c <= 0.0031308 ? 12.92*c : 1.055*Math.pow(c,1/2.4)-0.055; return v*255; }
function rgbToOklab([r,g,b]) {
  const lr=sLin(r), lg=sLin(g), lb=sLin(b);
  const l=0.4122214708*lr+0.5363325363*lg+0.0514459929*lb;
  const m=0.2119034982*lr+0.6806995451*lg+0.1073969566*lb;
  const s=0.0883024619*lr+0.2817188376*lg+0.6299787005*lb;
  const lc=Math.cbrt(l), mc=Math.cbrt(m), sc=Math.cbrt(s);
  return [
    0.2104542553*lc+0.7936177850*mc-0.0040720468*sc,
    1.9779984951*lc-2.4285922050*mc+0.4505937099*sc,
    0.0259040371*lc+0.7827717662*mc-0.8086757660*sc,
  ];
}
function oklabToRgb([L,a,b]) {
  const lc=L+0.3963377774*a+0.2158037573*b;
  const mc=L-0.1055613458*a-0.0638541728*b;
  const sc=L-0.0894841775*a-1.2914855480*b;
  const ll=lc**3, ml=mc**3, sl=sc**3;
  return [
    lSrgb( 4.0767416621*ll-3.3077115913*ml+0.2309699292*sl),
    lSrgb(-1.2684380046*ll+2.6097574011*ml-0.3413193965*sl),
    lSrgb(-0.0041960863*ll-0.7034186147*ml+1.7076147010*sl),
  ];
}
function mixOklch(a, b, pct) {
  const A = rgbToOklab(a), B = rgbToOklab(b);
  const t = pct/100;
  return oklabToRgb([
    A[0]*t + B[0]*(1-t),
    A[1]*t + B[1]*(1-t),
    A[2]*t + B[2]*(1-t),
  ]);
}

// ============================================================
// Color parser
// ============================================================
function parseColor(value, resolve) {
  if (!value) return null;
  const v = value.trim().toLowerCase();

  if (NAMED.hasOwnProperty(v)) {
    const hex = NAMED[v];
    return hex ? hexToRgb(hex) : null;
  }
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return hexToRgb(v);
  if (v.startsWith("color-mix(")) return parseColorMix(v, resolve);

  const varMatch = /^var\((--[a-zA-Z0-9-]+)(?:\s*,\s*(.+))?\)$/.exec(v);
  if (varMatch) {
    const inner = resolve(varMatch[1]);
    if (inner !== null) return parseColor(inner, resolve);
    if (varMatch[2]) return parseColor(varMatch[2], resolve);
    return null;
  }
  return null;
}

function parseColorMix(value, resolve) {
  const inner = value.slice("color-mix(".length, -1).trim();
  const parts = balancedSplit(inner, ",");
  if (parts.length < 3) return null;

  const a = parseColorWithPercent(parts[1].trim(), resolve);
  const b = parseColorWithPercent(parts[2].trim(), resolve);
  if (!a || !b) return null;

  let pctA;
  if (a.pct !== null && b.pct !== null) {
    const sum = a.pct + b.pct;
    pctA = sum > 0 ? (a.pct/sum)*100 : 50;
  } else if (a.pct !== null) pctA = a.pct;
  else if (b.pct !== null)   pctA = 100 - b.pct;
  else                       pctA = 50;

  return mixOklch(a.rgb, b.rgb, pctA);
}

function parseColorWithPercent(str, resolve) {
  const m = /^(.+?)\s+(\d+(?:\.\d+)?)%$/.exec(str);
  if (m) {
    const rgb = parseColor(m[1].trim(), resolve);
    if (!rgb) return null;
    return { rgb, pct: parseFloat(m[2]) };
  }
  const rgb = parseColor(str, resolve);
  if (!rgb) return null;
  return { rgb, pct: null };
}

function balancedSplit(str, sep) {
  const out = [];
  let depth = 0, buf = "";
  for (const ch of str) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === sep && depth === 0) { out.push(buf); buf = ""; }
    else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

// ============================================================
// CSS parser with @media context
// ============================================================
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ""); }

function extractRules(css, parentContext = {}) {
  css = stripComments(css);
  const rules = [];
  let i = 0, buf = "";

  while (i < css.length) {
    const ch = css[i];
    if (ch === "{") {
      const selector = buf.trim();
      buf = "";
      let body = "", depth = 1;
      i++;
      while (i < css.length && depth > 0) {
        const c = css[i];
        if (c === "{") depth++;
        else if (c === "}") { depth--; if (depth === 0) break; }
        body += c; i++;
      }
      i++;

      if (selector.startsWith("@")) {
        const ctx = { ...parentContext };
        const pcs = /@media[^{]*prefers-color-scheme\s*:\s*(\w+)/i.exec(selector);
        if (pcs) ctx.prefersColorScheme = pcs[1].toLowerCase();
        rules.push(...extractRules(body, ctx));
      } else {
        const decls = parseDeclarations(body);
        for (const part of selector.split(",").map((s) => s.trim())) {
          rules.push({ selector: part, declarations: decls, context: parentContext });
        }
      }
    } else { buf += ch; i++; }
  }
  return rules;
}

function parseDeclarations(body) {
  const out = {};
  for (const decl of balancedSplit(body, ";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const name = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (name.startsWith("--") && value) out[name] = value;
  }
  return out;
}

/**
 * Match selector against context:
 *   { rootTone, mode, prefersColorScheme, nestedTone }
 *
 * Root scope: only [data-tone~="rootTone"] and [data-mode="X"] selectors.
 * Nested scope (nestedTone set): inner [data-tone~="nestedTone"] also matches,
 *   plus descendant [data-mode="X"] [data-tone] selectors.
 */
function selectorMatches(selector, ctx) {
  if (selector === ":root") return true;

  let s = selector;
  const startedWithRoot = s.startsWith(":root");
  if (startedWithRoot) s = s.slice(":root".length);

  // Split on descendant combinator (whitespace between selectors)
  // Simple parser: collect attribute matchers per part.
  const parts = s.split(/\s+/).filter(Boolean);

  // For each part, what does it require?
  function partRequirements(part) {
    const req = { tones: [], modes: [], notModes: [] };
    const positive = part.replace(/:not\([^)]+\)/g, "");
    for (const m of positive.matchAll(/\[data-tone~="([^"]+)"\]/g)) {
      req.tones.push(m[1]);
    }
    for (const m of positive.matchAll(/\[data-mode="([^"]+)"\]/g)) {
      req.modes.push(m[1]);
    }
    for (const m of part.matchAll(/:not\(\[data-mode="([^"]+)"\]\)/g)) {
      req.notModes.push(m[1]);
    }
    return req;
  }

  if (parts.length === 0) {
    return startedWithRoot;  // ":root" alone
  }

  if (parts.length === 1) {
    // Selector must match the deepest element in current context
    // (root if no nested, else nested div).
    const req = partRequirements(parts[0]);
    const targetTone = ctx.nestedTone || ctx.rootTone;
    const targetMode = ctx.mode;

    for (const t of req.tones) {
      if (t !== targetTone) return false;
    }
    for (const m of req.modes) {
      if (m !== targetMode) return false;
    }
    for (const nm of req.notModes) {
      if (nm === targetMode) return false;
    }
    // If startedWithRoot: matches root regardless of nested
    if (startedWithRoot && !ctx.nestedTone) return true;
    if (startedWithRoot && ctx.nestedTone) {
      // :root matched root, but we're querying nested — only matches if it
      // applies to the nested element (via inheritance, which is at custom-property
      // level, not selector-match level). For this static check we say: :root-only
      // rules apply via inheritance to nested IF no nested-element overrides them.
      // We model that by saying: this rule applies at root, declarations cascade
      // through inheritance.
      return true;
    }
    // No :root prefix: matched only if part requires the target element
    return req.tones.length > 0 || req.modes.length > 0 || req.notModes.length > 0;
  }

  // Multi-part descendant selector: e.g. [data-mode="dark"] [data-tone]
  // Root part matches root, descendant part matches nested element.
  if (parts.length === 2 && ctx.nestedTone) {
    const root = partRequirements(parts[0]);
    const desc = partRequirements(parts[1]);

    // Root requirements check against root element
    for (const t of root.tones) if (t !== ctx.rootTone) return false;
    for (const m of root.modes) if (m !== ctx.mode)     return false;
    for (const nm of root.notModes) if (nm === ctx.mode) return false;

    // Descendant requirements check against nested element
    // [data-tone] without value matches any tone attribute
    if (/\[data-tone\]/.test(parts[1]) && ctx.nestedTone) {
      // descendant matches any tone, no further check
    } else {
      for (const t of desc.tones) if (t !== ctx.nestedTone) return false;
    }
    for (const m of desc.modes) if (m !== ctx.mode) return false;
    for (const nm of desc.notModes) if (nm === ctx.mode) return false;

    return true;
  }

  return false;
}

function resolveTokens(layers, ctx) {
  const tokens = {};
  for (const { rules } of layers) {
    for (const rule of rules) {
      if (rule.context?.prefersColorScheme) {
        if (rule.context.prefersColorScheme !== ctx.prefersColorScheme) continue;
      }
      if (!selectorMatches(rule.selector, ctx)) continue;
      Object.assign(tokens, rule.declarations);
    }
  }
  return tokens;
}

/* light-dark(L, D) — unwrap basierend auf ctx (mode/prefersColorScheme).
   Argumente sind comma-separiert, aber Argumente können selbst Kommas
   enthalten (color-mix, rgba). balancedSplit nutzen. */
function unwrapLightDark(value, ctx) {
  const m = /^light-dark\((.*)\)$/.exec(value.trim());
  if (!m) return value;
  const args = balancedSplit(m[1], ",");
  if (args.length !== 2) return value;
  const isDark =
    ctx.mode === "dark" ||
    (ctx.mode == null && ctx.prefersColorScheme === "dark");
  return (isDark ? args[1] : args[0]).trim();
}

function resolveValue(name, tokens, depth = 0, ctx = {}) {
  if (depth > 30) return null;
  if (!tokens[name]) return null;
  let value = tokens[name];

  /* light-dark() Unwrap zuerst — sonst greift die var()-Regex auf das
     innere var(--...) im L oder D Argument, was bedeutungs-verzerrend ist. */
  value = unwrapLightDark(value, ctx);

  const varOnly = /^var\((--[a-zA-Z0-9-]+)(?:\s*,\s*([^)]+))?\)$/.exec(value);
  if (varOnly) {
    const inner = resolveValue(varOnly[1], tokens, depth + 1, ctx);
    if (inner !== null) return inner;
    if (varOnly[2]) return varOnly[2].trim();
    return null;
  }
  return value;
}

// ============================================================
// Load layers from main.css
// ============================================================
function loadCss(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

function parseMainCss() {
  const css = stripComments(loadCss("main.css"));
  const imports = [];
  for (const m of css.matchAll(/@import\s+["']\.?\/?([^"']+)["']\s+layer\(([^)]+)\)/g)) {
    imports.push({ file: m[1], layer: m[2].trim() });
  }
  const layerDecl = /@layer\s+([^;]+);/.exec(css);
  if (!layerDecl) throw new Error("No @layer declaration in main.css");
  const layerOrder = layerDecl[1].split(",").map((s) => s.trim());

  // Only collect layers that contribute custom-property rules
  const tokenLayers = new Set(["tokens", "semantic", "themes", "mode"]);
  const grouped = new Map();
  for (const layer of layerOrder) grouped.set(layer, []);
  for (const imp of imports) {
    if (!grouped.has(imp.layer)) grouped.set(imp.layer, []);
    grouped.get(imp.layer).push(imp.file);
  }

  const ordered = [];
  for (const layer of layerOrder) {
    if (!tokenLayers.has(layer)) continue;
    for (const file of grouped.get(layer) || []) {
      ordered.push({ layer, file });
    }
  }
  return ordered;
}

const LAYERS = parseMainCss().map(({ layer, file }) => ({
  name: `${layer}:${file}`,
  rules: extractRules(loadCss(file)),
}));

// ============================================================
// Run matrix
// ============================================================
let failures = 0;
let skips = 0;

function checkScope(label, ctx) {
  const tokens = resolveTokens(LAYERS, ctx);
  const resolveFn = (name) => resolveValue(name, tokens, 0, ctx);

  console.log(`=== ${label} ===`);
  for (const { fg, bg, threshold, label: pairLabel } of PAIRS) {
    const fgRaw = resolveValue(fg, tokens, 0, ctx);
    const bgRaw = resolveValue(bg, tokens, 0, ctx);
    if (!fgRaw || !bgRaw) {
      console.log(`  [skip] ${pairLabel}: token unresolvable`);
      skips++;
      continue;
    }
    const fgRgb = parseColor(fgRaw, resolveFn);
    const bgRgb = parseColor(bgRaw, resolveFn);
    if (!fgRgb || !bgRgb) {
      console.log(`  [skip] ${pairLabel}: ${fgRaw} / ${bgRaw}`);
      skips++;
      continue;
    }
    const ratio = contrast(fgRgb, bgRgb);
    const pass = ratio >= threshold;
    const mark = pass ? "[ok]  " : "[FAIL]";
    console.log(
      `  ${mark} ${pairLabel}: ${ratio.toFixed(2)}:1  ` +
      `(threshold ${threshold}:1)  ${rgbToHex(fgRgb)} / ${rgbToHex(bgRgb)}`
    );
    if (!pass) failures++;
  }
  console.log("");
}

// Root-Scope: jeder Tone × jeder Mode
console.log(`# Root-Scope (${TONES.length * MODES.length} combinations)\n`);
for (const rootTone of TONES) {
  for (const modeLabel of MODES) {
    const ctx = { rootTone, ...modeContext(modeLabel) };
    checkScope(`${rootTone} / ${modeLabel}`, ctx);
  }
}

// Nested-Scope: jeder anderer Tone in jedem Root-Tone (nur light+dark, nicht auto)
const NESTED_PAIRS = [];
for (const rootTone of TONES) {
  for (const nestedTone of TONES) {
    if (rootTone !== nestedTone) NESTED_PAIRS.push([rootTone, nestedTone]);
  }
}
console.log(`# Nested-Scope (${NESTED_PAIRS.length * 2} combinations: each root×nested × light+dark)\n`);
for (const [rootTone, nestedTone] of NESTED_PAIRS) {
  for (const modeLabel of ["light", "dark"]) {
    const ctx = {
      rootTone,
      nestedTone,
      ...modeContext(modeLabel),
    };
    checkScope(`${rootTone}:${nestedTone} / ${modeLabel}`, ctx);
  }
}

const totalRoot = TONES.length * MODES.length * PAIRS.length;
const totalNested = NESTED_PAIRS.length * 2 * PAIRS.length;
const total = totalRoot + totalNested;

if (failures > 0) {
  console.error(`${failures} Kontrast-Verletzung(en) (${skips} skipped, ${total} total).`);
  process.exit(1);
}
console.log(`Alle ${total - skips} kritischen Paare erfüllen WCAG AA${skips ? ` (${skips} skipped)` : ""}.`);
