#!/usr/bin/env node
/**
 * Token Export (W3C Design-Tokens Community Group Format)
 * ========================================================
 *
 * Liest tokens.css + semantic.css und exportiert als tokens.json
 * im W3C DTCG-Format. Nutzbar für Style-Dictionary, Figma-Plugin
 * (z. B. Tokens Studio), iOS/Android-Export.
 *
 * Output: dist/tokens.json
 *
 * Usage: node scripts/export-tokens.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT  = path.join(ROOT, "dist", "tokens.json");

// ========== Type-Inference aus Token-Namen ==========

function inferType(name, value) {
  if (/color|bg|border|text|fill|focus|badge|btn|card|nav|stat|shadow|interactive|success|warning|error|info|trust|playful|premium|industrial|modern|minimal|gray|focus-ring/.test(name)) {
    if (/shadow/.test(name)) return "shadow";
    if (/ring/.test(name) || value.includes("solid")) return "border";
    return "color";
  }
  if (/space|size|radius|width|height/.test(name)) return "dimension";
  if (/motion|duration/.test(name)) return "duration";
  if (/ease/.test(name)) return "cubicBezier";
  if (/weight|fw-/.test(name)) return "fontWeight";
  if (/font-(xs|sm|base|lg|xl|\dxl)/.test(name)) return "dimension";
  if (/font-(serif|sans|mono|body|display|code)/.test(name)) return "fontFamily";
  if (/lh-|line-height/.test(name)) return "number";
  if (/ls-|letter/.test(name)) return "dimension";
  if (/z-/.test(name)) return "number";
  return "other";
}

function groupKey(name) {
  // --space-16 → ["space", "16"]
  // --color-trust-600 → ["color", "trust", "600"]
  // --btn-bg → ["component", "btn", "bg"]
  const parts = name.replace(/^--/, "").split("-");
  const first = parts[0];
  const componentish = ["btn", "card", "nav", "stat", "badge", "callout", "banner", "section",
    "field", "modal", "drawer", "tooltip", "tab", "step", "list-row", "funnel",
    "code-block", "checkbox", "radio", "table", "range", "toast", "progress", "input",
    "heading", "body", "h1", "h2", "avatar", "skeleton", "empty", "accordion",
    "breadcrumbs", "pagination"];
  if (componentish.includes(first) || componentish.includes(first + "-" + parts[1])) {
    return ["component", ...parts];
  }
  return parts;
}

function setNested(obj, keys, value) {
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!cur[k] || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

// ========== Parse tokens ==========

function readTokens(file) {
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const m = /:root\s*\{([\s\S]*?)\}/.exec(css);
  if (!m) return {};
  const out = {};
  for (const decl of m[1].split(";")) {
    const [k, ...v] = decl.split(":");
    const name = (k || "").trim();
    const value = v.join(":").trim();
    if (name.startsWith("--") && value) out[name] = value;
  }
  return out;
}

const tokens = {
  ...readTokens(path.join(ROOT, "tokens/tokens.css")),
  ...readTokens(path.join(ROOT, "semantic/semantic.css")),
};

// ========== Build DTCG Tree ==========

const tree = {};
for (const [name, value] of Object.entries(tokens)) {
  const keys = groupKey(name);
  const type = inferType(name, value);
  setNested(tree, keys, {
    $value: value,
    $type: type,
  });
}

// Metadata
const output = {
  $schema: "https://design-tokens.github.io/community-group/format/",
  $description: "Design-System Tokens — exported from tokens.css + semantic.css",
  ...tree,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
console.log(`Wrote ${Object.keys(tokens).length} tokens → ${path.relative(ROOT, OUT)}`);
