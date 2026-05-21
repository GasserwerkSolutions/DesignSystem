#!/usr/bin/env node
/**
 * Token-Reference Validator
 * ==========================
 *
 * Verifiziert, dass jede `var(--name)`-Referenz in semantic/, themes/
 * und components/ auf ein irgendwo definiertes Custom-Property zeigt
 * (oder einen Fallback hat). Catcht Typos und gelöschte Tokens.
 *
 * Erfolgskriterium:
 *   Für jede `var(--x)`-Referenz ohne Fallback muss `--x` mindestens
 *   in einer der gescannten CSS-Dateien deklariert sein.
 *
 * Usage: node scripts/check-tokens.js
 * Exit:  0 = ok, 1 = Referenz-Fehler
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const SCAN_DIRS = ["tokens", "semantic", "themes", "base", "state", "components"];

// Tokens, die vom Browser oder via inline style übergeben werden dürfen
// (z. B. Authoring-Pattern in Component-Docs, oder vom Anwender gesetzt).
const ALLOWED_UNDEFINED = new Set([
  // Authoring: User-supplied
]);

function readCSSFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (name.endsWith(".css")) files.push(path.join(abs, name));
    }
  }
  return files;
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

const DECL_RE = /(--[a-zA-Z0-9_-]+)\s*:/g;
const REF_RE  = /var\(\s*(--[a-zA-Z0-9_-]+)\s*(,([\s\S]*?))?\)/g;

function extractDecls(css) {
  const out = new Set();
  let m;
  while ((m = DECL_RE.exec(css))) out.add(m[1]);
  return out;
}

/**
 * Extrahiert alle var()-Referenzen aus dem CSS-Text.
 * Liefert { name, hasFallback, line, snippet } pro Treffer.
 */
function extractRefs(css) {
  const refs = [];
  let m;
  while ((m = REF_RE.exec(css))) {
    const name = m[1];
    const hasFallback = m[2] !== undefined;
    const before = css.slice(0, m.index);
    const line = before.split("\n").length;
    const lineStart = before.lastIndexOf("\n") + 1;
    const lineEnd = css.indexOf("\n", m.index);
    const snippet = css.slice(lineStart, lineEnd === -1 ? css.length : lineEnd).trim();
    refs.push({ name, hasFallback, line, snippet });
  }
  return refs;
}

function main() {
  const files = readCSSFiles();
  const allDecls = new Set();
  const fileData = [];

  // Pass 1: alle Deklarationen sammeln
  for (const file of files) {
    const css = stripComments(fs.readFileSync(file, "utf8"));
    const decls = extractDecls(css);
    for (const d of decls) allDecls.add(d);
    fileData.push({ file, css });
  }

  // Pass 2: alle Referenzen prüfen
  const violations = [];
  for (const { file, css } of fileData) {
    const refs = extractRefs(css);
    for (const ref of refs) {
      if (allDecls.has(ref.name)) continue;
      if (ALLOWED_UNDEFINED.has(ref.name)) continue;
      // Fallback ohne Definition ist erlaubt — der Fallback greift dann.
      if (ref.hasFallback) continue;
      violations.push({
        file: path.relative(ROOT, file),
        line: ref.line,
        name: ref.name,
        snippet: ref.snippet,
      });
    }
  }

  // Output
  if (violations.length === 0) {
    console.log(`[ok] ${allDecls.size} Tokens deklariert, alle var()-Referenzen aufgelöst.`);
    process.exit(0);
  }

  console.error(`[fail] ${violations.length} unaufgelöste Token-Referenz(en):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.name}`);
    console.error(`    ${v.snippet}`);
  }
  console.error(
    `\nJede var()-Referenz braucht entweder eine Deklaration ` +
    `(in tokens/semantic/themes/component) oder einen Fallback.`
  );
  process.exit(1);
}

main();
