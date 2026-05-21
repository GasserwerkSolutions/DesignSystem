#!/usr/bin/env node
/**
 * Dark-Mode CSS Generator
 * ========================
 *
 * Liest scripts/dark.tokens.js und generiert semantic/dark.css.
 * Beide Trigger ([data-mode="dark"] + prefers-color-scheme: dark)
 * teilen sich dieselbe Token-Sektion — keine Hand-Duplikation mehr.
 *
 * Usage: node scripts/build-dark.js
 * Output: semantic/dark.css
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = require("./dark.tokens.js");
const OUT = path.join(ROOT, "semantic", "dark.css");

const INDENT = "  ";

function renderBlock(selectorIndent) {
  const lines = [];
  for (const section of SOURCE.sections) {
    lines.push(`${selectorIndent}/* ${section.heading} */`);
    const maxNameLen = Math.max(...section.tokens.map(([n]) => n.length));
    for (const [name, value] of section.tokens) {
      const pad = " ".repeat(maxNameLen - name.length);
      lines.push(`${selectorIndent}${name}:${pad} ${value};`);
    }
    lines.push("");
  }
  // Trailing leerzeile abschneiden
  if (lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

const manualBlock = renderBlock(INDENT);
const autoBlock = renderBlock(INDENT + INDENT);

const output = `/**
 * Dark-Mode Token-Overrides
 * ==========================
 *
 * GENERIERT von scripts/build-dark.js aus scripts/dark.tokens.js.
 * NICHT direkt editieren — Änderungen gehen beim nächsten Build verloren.
 *
 * Orthogonal zu Themes — \`data-mode="dark"\` kann mit jedem \`data-tone\`
 * kombiniert werden.
 *
 * Aktivierung:
 *   1. Manuell:  <html data-mode="dark">
 *   2. Auto via System-Setting (prefers-color-scheme: dark), außer
 *      User hat explizit <html data-mode="light"> gewählt.
 *   3. "Auto" Explicit: <html data-mode="auto"> — JS setzt dark/light dynamisch.
 *
 * Die Dark-Werte sind in scripts/dark.tokens.js EINMAL definiert; dieses
 * File spiegelt sie für beide Trigger.
 */

/* Dark-Token-Set — manuell */
[data-mode="dark"] {
${manualBlock}
}

/* Auto-Dark via System — außer User hat explizit Light gewählt */
@media (prefers-color-scheme: dark) {
${INDENT}:root:not([data-mode="light"]):not([data-mode="dark"]) {
${autoBlock}
${INDENT}}
}
`;

fs.writeFileSync(OUT, output);

const tokenCount = SOURCE.sections.reduce((n, s) => n + s.tokens.length, 0);
console.log(`Wrote ${tokenCount} dark-mode entries → ${path.relative(ROOT, OUT)}`);
