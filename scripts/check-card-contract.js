#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const card = read("components/card.css");
const fixture = read("tests/card-proportions.html");

assert.match(card, /\.card-grid--natural\s*\{/);
assert.match(card, /grid-template-columns:\s*repeat\(auto-fill, minmax\(min\(100%, var\(--card-grid-min, 17rem\)\), 1fr\)\)/);
assert.match(card, /\.card-grid--natural\s*\{[^}]*align-items:\s*start;/s);
assert.match(card, /\.card-slot\s*\{[^}]*container:\s*card-slot \/ inline-size;/s);
const naturalGrid = card.match(/\.card-grid--natural\s*\{([^}]*)\}/s)?.[1] ?? "";
assert.doesNotMatch(naturalGrid, /container-type:|container:/,
  "Outer grid must not act as the padding measurement container");
assert.match(card, /\.card--content-fit\s*\{[^}]*block-size:\s*auto;/s);
assert.match(card, /\.card--content-fit > \.card__header\s*\{[^}]*gap:\s*calc\(var\(--component-gap\) \/ 2\);/s);
assert.match(card, /\.card--fluid-pad\s*\{\s*padding:\s*var\(--space-16\);/);
assert.match(card, /@container card-slot \(min-width: 0px\)\s*\{[\s\S]*?padding:\s*clamp\(var\(--space-16\), 6cqi, var\(--card-padding, var\(--component-padding\)\)\)/);
assert.doesNotMatch(card, /container-type:\s*size\b/);
assert.match(card, /overflow-wrap:\s*anywhere;/);
assert.match(card, /\.card-grid--compare > \.card-slot > \.card--content-fit\s*\{\s*flex:\s*1 1 auto;/);
assert.match(card, /\.card-grid--natural\.card-grid--compare\s*\{\s*align-items:\s*stretch;/);
assert.match(card, /\.card--action-aligned > \.card__footer\s*\{[^}]*margin-block-start:\s*auto;/s);
assert.doesNotMatch(card.slice(card.indexOf("CONTENT-FIRST CARD LAYOUT")), /(?:height|block-size):\s*\d+(px|rem)/);
for (const id of ["natural", "comparison", "probe-narrow", "probe-wide", "unwrapped"]) {
  assert.ok(fixture.includes('id="' + id + '"'), "Missing fixture: " + id);
}
console.log("OK: intrinsic per-card containment / proximity contract");
