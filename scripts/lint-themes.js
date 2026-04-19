#!/usr/bin/env node
/**
 * Theme Lint — Contract-Enforcement
 * ==================================
 *
 * Themes dürfen ausschließlich Token-Werte setzen und nur über
 * [data-tone~="..."] selektieren — auch innerhalb von @media-Blöcken.
 *
 * Verboten:
 *   :root { ... }
 *   h1 / .btn / .card / .section / beliebige Component-Selektoren
 *   [data-tone~="..."] .btn { ... }   (kombinierte Selektoren)
 *
 * Erlaubt:
 *   [data-tone~="trust"] { --token: value; }
 *   @media (...) { [data-tone~="trust"] { --token: value; } }
 *   @supports (...) { [data-tone~="..."] { --token: value; } }
 *
 * Usage:   node scripts/lint-themes.js
 * Exit:    0 = ok, 1 = violation
 */

const fs = require("fs");
const path = require("path");

const THEMES_DIR = path.resolve(__dirname, "..", "themes");
const ALLOWED_SELECTOR = /^\[data-tone~="[^"]+"\]$/;

/**
 * Extrahiert ALLE selektor-tragenden Rules — auch verschachtelt in
 * @media/@supports/@container/@layer. Ignoriert die at-Rule-Wrapper
 * selbst, prüft aber ihren Inhalt.
 */
function extractSelectors(css, depth = 0) {
  // Kommentare entfernen
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");

  const selectors = [];
  let i = 0;
  let buffer = "";

  while (i < cleaned.length) {
    const ch = cleaned[i];

    if (ch === "{") {
      const selector = buffer.trim();
      buffer = "";

      // Body des Blocks einlesen
      let body = "";
      let d = 1;
      i++;
      while (i < cleaned.length && d > 0) {
        const c = cleaned[i];
        if (c === "{") d++;
        else if (c === "}") { d--; if (d === 0) break; }
        body += c;
        i++;
      }
      i++; // skip closing }

      if (selector.startsWith("@")) {
        // at-Rule: rekursiv prüfen, der Wrapper selbst ist OK
        selectors.push(...extractSelectors(body, depth + 1));
      } else if (selector.length > 0) {
        selectors.push(selector);
      }
    } else {
      buffer += ch;
      i++;
    }
  }

  return selectors;
}

function lintFile(file) {
  const filePath = path.join(THEMES_DIR, file);
  const css = fs.readFileSync(filePath, "utf8");
  const selectors = extractSelectors(css);
  const violations = [];

  for (const selector of selectors) {
    for (const part of selector.split(",").map((s) => s.trim())) {
      if (!ALLOWED_SELECTOR.test(part)) {
        violations.push(part);
      }
    }
  }

  return violations;
}

function main() {
  const files = fs
    .readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith(".css"))
    .sort();

  let total = 0;

  for (const file of files) {
    const violations = lintFile(file);
    if (violations.length === 0) {
      console.log(`[ok]   ${file}`);
      continue;
    }

    console.error(`[fail] ${file}`);
    for (const v of violations) {
      console.error(`       -> "${v}"`);
    }
    total += violations.length;
  }

  console.log("");
  if (total > 0) {
    console.error(
      `${total} Violation(s) gefunden. Themes dürfen nur [data-tone~="..."] selektieren — auch in @media/@supports.`
    );
    process.exit(1);
  }
  console.log("Alle Themes erfüllen den Contract.");
}

main();
