#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root,p), "utf8");
const card = read("components/card.css");
const fixture = read("tests/card-proportions.html");

assert.match(card, /\.card-grid--natural\s*\{/);
assert.match(card, /grid-template-columns:\s*repeat\(auto-fill, minmax\(min\(100%, var\(--card-grid-min, 17rem\)\), 1fr\)\)/);
assert.match(card, /\.card-grid--natural\s*\{[^}]*align-items:\s*start;/s);
assert.match(card, /\.card--content-fit\s*\{[^}]*block-size:\s*auto;/s);
assert.match(card, /\.card--content-fit > \.card__header\s*\{\s*gap:\s*var\(--space-8\);/);
assert.match(card, /\.card--fluid-pad\s*\{[^}]*padding:\s*clamp\(var\(--space-16\), 2cqi, var\(--card-padding, var\(--component-padding\)\)\)/s);
assert.match(card, /\.card-grid--natural\.card-grid--compare\s*\{\s*align-items:\s*stretch;/);
assert.match(card, /\.card--action-aligned > \.card__footer\s*\{[^}]*margin-block-start:\s*auto;/s);
assert.doesNotMatch(card.slice(card.indexOf("CONTENT-FIRST CARD LAYOUT")), /(?:height|block-size):\s*\d+(px|rem)/);
assert.ok(fixture.includes('id="natural"') && fixture.includes('id="comparison"'));
console.log("OK: intrinsic card layout / proximity contract");
