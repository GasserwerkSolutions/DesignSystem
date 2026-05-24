#!/usr/bin/env node
/**
 * Theme Lint
 * ===========
 *
 * Drei Checks:
 *
 * 1. SELECTOR-CONTRACT (hard-fail)
 *    Themes dürfen nur [data-tone~="..."] selektieren.
 *
 * 2. DESTRUKTIVE-TOKEN-WARNUNG (soft, --strict macht hard-fail)
 *    Themes, die mode-sensitive Tokens hart setzen, brechen still wenn die
 *    Layer-Reihenfolge sich ändert. Liste kommt dynamisch aus semantic/dark.css.
 *
 * 3. NESTED-MODE-COVERAGE (hard-fail)
 *    Jeder Selector in semantic/dark.css, der [data-mode="X"] enthält, muss auch
 *    eine Descendant-Variante haben (z.B. [data-mode="X"] [data-tone]), damit
 *    nested Tone-Scopes ihren Dark-Mode behalten. Sonst Bug:
 *    <html data-mode="dark"><div data-tone="premium"></div></html>
 *    → premium setzt Light-Tokens via Vererbung, dark-Block matched nicht mehr.
 *
 * Flags:
 *   --strict  destruktive Tokens werden hard-fail
 */

const fs = require("fs");
const path = require("path");

const ROOT       = path.resolve(__dirname, "..");
const THEMES_DIR = path.join(ROOT, "themes");
const DARK_CSS   = path.join(ROOT, "semantic/dark.css");

const ALLOWED_SELECTOR = /^\[data-tone~="[^"]+"\]$/;
const STRICT = process.argv.includes("--strict");

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function walkRules(css) {
  css = stripComments(css);
  const out = [];
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
        body += c;
        i++;
      }
      i++;

      if (selector.startsWith("@")) {
        out.push(...walkRules(body));
      } else if (selector.length > 0) {
        out.push({ selector, body });
      }
    } else {
      buf += ch;
      i++;
    }
  }
  return out;
}

function extractDeclaredTokens(body) {
  const tokens = new Set();
  for (const decl of body.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const name = decl.slice(0, idx).trim();
    if (name.startsWith("--")) tokens.add(name);
  }
  return tokens;
}

function readModeSensitiveTokens() {
  const css = fs.readFileSync(DARK_CSS, "utf8");
  const rules = walkRules(css);
  const tokens = new Set();
  for (const { body } of rules) {
    for (const t of extractDeclaredTokens(body)) tokens.add(t);
  }
  return tokens;
}

function lintTheme(file, modeSensitive) {
  const css = fs.readFileSync(path.join(THEMES_DIR, file), "utf8");
  const rules = walkRules(css);

  const selectorViolations = [];
  const destructiveTokens = new Set();

  for (const { selector, body } of rules) {
    for (const part of selector.split(",").map((s) => s.trim())) {
      if (!ALLOWED_SELECTOR.test(part)) selectorViolations.push(part);
    }
    for (const token of extractDeclaredTokens(body)) {
      if (modeSensitive.has(token)) destructiveTokens.add(token);
    }
  }

  return {
    selectorViolations,
    destructiveTokens: [...destructiveTokens].sort(),
  };
}

/**
 * Check 3: For every [data-mode="X"]-only selector in dark.css, must exist
 * a paired [data-mode="X"] [data-tone] descendant selector (or comma-list).
 */
function lintDarkCss() {
  const css = fs.readFileSync(DARK_CSS, "utf8");
  const rules = walkRules(css);
  const issues = [];

  for (const { selector } of rules) {
    // Split comma-lists; check that for every modeOnly selector there is a
    // sibling descendant-variant in the same rule's selector-list
    const parts = selector.split(",").map((s) => s.trim());

    const modeOnly = [];
    const descendants = new Set();

    for (const p of parts) {
      // Erst :not(...) entfernen, damit wir nur POSITIVE [data-mode] erkennen
      const positiveOnly = p.replace(/:not\([^)]+\)/g, "");
      const modeMatch = /\[data-mode="([^"]+)"\]/.exec(positiveOnly);
      if (!modeMatch) continue;
      const mode = modeMatch[1];

      // Ist es ein Descendant-Selector ([data-mode="X"] [data-tone])?
      if (/\[data-mode="[^"]+"\]\s+\[data-tone/.test(positiveOnly)) {
        descendants.add(mode);
      } else {
        modeOnly.push({ mode, raw: p });
      }
    }

    for (const { mode, raw } of modeOnly) {
      if (!descendants.has(mode)) {
        issues.push({
          selector: raw,
          mode,
          message: `[data-mode="${mode}"]-selector hat keinen Descendant-Partner ` +
                   `(z.B. ', [data-mode="${mode}"] [data-tone]'). ` +
                   `Nested Tone-Scopes verlieren ihren Dark-Mode.`,
        });
      }
    }
  }

  return issues;
}

function main() {
  const modeSensitive = readModeSensitiveTokens();
  console.log(`Mode-sensitive tokens from dark.css: ${modeSensitive.size}\n`);

  let selectorViolations = 0;
  let destructiveWarnings = 0;
  let nestedIssues = 0;

  // ===== Check 1+2: Themes =====
  const files = fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith(".css")).sort();

  for (const file of files) {
    const { selectorViolations: sv, destructiveTokens: dt } = lintTheme(file, modeSensitive);

    if (sv.length === 0 && dt.length === 0) {
      console.log(`[ok]    ${file}`);
      continue;
    }

    if (sv.length > 0) {
      console.error(`[fail]  ${file}  (selector violations)`);
      for (const v of sv) console.error(`        -> "${v}"`);
      selectorViolations += sv.length;
    }

    if (dt.length > 0) {
      const tag = STRICT ? "[fail]" : "[warn]";
      const log = STRICT ? console.error : console.warn;
      log(`${tag}  ${file}  destruktive mode-sensitive Token-Setzungen:`);
      for (const t of dt) log(`        -> ${t}`);
      log(`        Funktionieren nur, weil mode-Layer in main.css nach themes kommt.`);
      destructiveWarnings += dt.length;
    }
  }

  // ===== Check 3: dark.css nested-mode-coverage =====
  console.log("");
  const darkIssues = lintDarkCss();
  if (darkIssues.length === 0) {
    console.log("[ok]    semantic/dark.css  (nested-mode-coverage)");
  } else {
    for (const issue of darkIssues) {
      console.error(`[fail]  semantic/dark.css  ${issue.message}`);
      console.error(`        Selector: ${issue.selector}`);
    }
    nestedIssues = darkIssues.length;
  }

  console.log("");

  if (selectorViolations > 0) {
    console.error(`${selectorViolations} Selector-Violation(s).`);
    process.exit(1);
  }
  if (nestedIssues > 0) {
    console.error(`${nestedIssues} nested-mode-Coverage-Issue(s).`);
    process.exit(1);
  }
  if (destructiveWarnings > 0) {
    if (STRICT) {
      console.error(`${destructiveWarnings} destruktive Token-Setzung(en) — strict mode.`);
      process.exit(1);
    }
    console.warn(`${destructiveWarnings} destruktive Token-Setzung(en) (Warnung).`);
  }

  console.log("Lint passed.");
}

main();
