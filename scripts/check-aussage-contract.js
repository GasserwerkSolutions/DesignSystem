#!/usr/bin/env node
"use strict";

/**
 * Static ownership/delivery gate for the optional Aussage Treatment.
 * This check is deliberately narrower than rendered/browser QA.
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const main = read("main.css");
const builder = read("profiles/builder.css");
const treatment = read("components/aussage.css");
const pkg = JSON.parse(read("package.json"));

assert.match(main, /@layer\s+reset,[^;]*patterns,\s*treatments\s*;/,
  "main.css must declare treatments after patterns");
assert.match(main, /@import\s+["']\.\/components\/aussage\.css["']\s+layer\(treatments\)/,
  "main.css must explicitly import Aussage only in treatments layer");
assert.match(builder, /@layer\s+reset,[^;]*patterns,\s*treatments\b/,
  "builder profile must reserve treatments layer without duplicating Aussage");
assert(pkg.files.includes("components/"), "npm package must include treatment source");
assert(pkg.files.includes("ADR-009-aussage-grammatik.md"), "ADR-009 must be packaged");
assert(pkg.exports["./components/*"] === "./components/*", "component exports must resolve");

for (const modifier of ["ist", "hat", "kann", "tut", "verbunden"]) {
  assert(treatment.includes(".aussage--" + modifier), "Missing Aussage variant: " + modifier);
}
assert(treatment.includes("forced-colors: active"), "Missing forced-color support");
assert(treatment.includes(":dir(rtl)"), "Missing RTL support");
assert(treatment.includes(":focus-within"), "Missing keyboard focus relation state");

const themeDir = path.join(root, "themes");
for (const file of fs.readdirSync(themeDir).filter((name) => name.endsWith(".css"))) {
  const css = fs.readFileSync(path.join(themeDir, file), "utf8");
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  assert(!/\.[A-Za-z0-9_-]*aussage[A-Za-z0-9_-]*/.test(withoutComments),
    "Theme may not redefine Aussage selectors: " + file);
}
console.log("[check-aussage] layer, package, variant, RTL and theme ownership guards passed");
