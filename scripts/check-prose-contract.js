#!/usr/bin/env node
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const tokens = read("semantic/semantic.css");
const type = read("base/typography.css");
const layout = read("base/layout.css");

assert.match(tokens, /--prose-max:\s*70ch\s*;/, "Outer editorial column stays 70ch");
assert.match(tokens, /--prose-line-max:\s*65ch\s*;/, "Line length token");
assert.match(tokens, /--body-line-height:\s*var\(--lh-normal\)/, "Body line-height token");
assert.match(read("tokens/tokens.css"), /--lh-normal:\s*1\.5\s*;/);
assert.match(layout, /\.container--prose\s*\{/);
assert.match(type, /\.prose > :where\(p, ul, ol, blockquote\)\s*\{[^}]*max-inline-size:\s*min\(100%, var\(--prose-line-max, 65ch\)\)/s);
assert.match(type, /\.prose > p\s*\{[^}]*margin-block:\s*0 var\(--space-24\)/s);
assert.match(type, /\.prose > :where\(h2, h3\)\s*\{[^}]*margin-block-start:\s*var\(--space-48\);[^}]*margin-block-end:\s*var\(--space-12\);/s);
assert.match(type, /\.prose > :where\(h2, h3\):first-child\s*\{[^}]*margin-block-start:\s*0;/s);
assert.doesNotMatch(type, /(?:^|\n)\s*p\s*\{[^}]*max-width:\s*65ch/s, "Prose width must be opt-in, not global");

console.log("OK: opt-in prose width and vertical rhythm contract");
