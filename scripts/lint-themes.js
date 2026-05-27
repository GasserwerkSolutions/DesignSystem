#!/usr/bin/env node
/**
 * Theme Lint (PostCSS-AST-basiert)
 * =================================
 *
 * Vier Checks:
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
 *    nested Tone-Scopes ihren Dark-Mode behalten.
 *
 * 4. LAYOUT-TOKEN-VERBOT (hard-fail)
 *    Themes dürfen --container-max nicht setzen — Custom-Property-Cascade
 *    erbt sich auf jeden .container/. Editorial-Verengung gehört in
 *    --prose-max (siehe ADR-001 + .container--prose).
 *
 * Architektur:
 *   PostCSS-AST statt Hand-Parsing — robust gegen verschachtelte
 *   @media/@supports/@container, :not()/:is()/:where()-Selectors,
 *   Strings mit {}-Chars, Kommentare an beliebigen Stellen. Plus:
 *   Source-Positions für Error-Reporting (file:line:column).
 *
 * Flags:
 *   --strict  destruktive Tokens werden hard-fail
 */

const fs = require("fs");
const path = require("path");
const postcss = require("postcss");

const ROOT       = path.resolve(__dirname, "..");
const THEMES_DIR = path.join(ROOT, "themes");
const DARK_CSS   = path.join(ROOT, "semantic/dark.css");

const ALLOWED_SELECTOR = /^\[data-tone~="[^"]+"\]$/;
const STRICT = process.argv.includes("--strict");

/**
 * Layout-Tokens, die in Themes verboten sind, weil sie via DOM-Vererbung
 * destruktiv auf jeden .container/.section cascadieren. Themes mit
 * Editorial-Charakter setzen stattdessen --prose-max (opt-in via
 * .container--prose). Siehe ADR-001.
 */
const FORBIDDEN_LAYOUT_TOKENS = new Set([
  "--container-max",
]);

function parseFile(file) {
  const css = fs.readFileSync(file, "utf8");
  return postcss.parse(css, { from: file });
}

/**
 * Walk-Helper: ruft cb für jede rule auf, inkl. solcher, die in
 * @media/@supports/@container/@layer geschachtelt sind. PostCSS's
 * walkRules() macht das per Default rekursiv durch atRules — wir
 * brauchen also nichts Spezielles. Wrapper für Konsistenz.
 */
function walkAllRules(root, cb) {
  root.walkRules(cb);
}

/** Liest mode-sensitive Tokens aus dark.css — alle Custom-Properties,
 *  die in irgendeiner Rule deklariert werden. */
function readModeSensitiveTokens() {
  const root = parseFile(DARK_CSS);
  const tokens = new Set();
  walkAllRules(root, (rule) => {
    rule.walkDecls(/^--/, (decl) => tokens.add(decl.prop));
  });
  return tokens;
}

function lintTheme(file, modeSensitive) {
  const filePath = path.join(THEMES_DIR, file);
  const root = parseFile(filePath);

  const selectorViolations = [];
  const destructiveTokens = new Map();   // token → first source line
  const layoutViolations = new Map();    // token → first source line

  walkAllRules(root, (rule) => {
    // Check 1: Selector-Contract — jeder Teil der Komma-Liste muss
    // dem ALLOWED_SELECTOR-Pattern entsprechen.
    for (const part of rule.selectors) {
      if (!ALLOWED_SELECTOR.test(part.trim())) {
        selectorViolations.push({
          selector: part.trim(),
          line: rule.source?.start?.line ?? 0,
        });
      }
    }

    // Check 2 + 4: Token-Setzungen prüfen.
    rule.walkDecls(/^--/, (decl) => {
      const line = decl.source?.start?.line ?? 0;
      if (modeSensitive.has(decl.prop) && !destructiveTokens.has(decl.prop)) {
        destructiveTokens.set(decl.prop, line);
      }
      if (FORBIDDEN_LAYOUT_TOKENS.has(decl.prop) && !layoutViolations.has(decl.prop)) {
        layoutViolations.set(decl.prop, line);
      }
    });
  });

  return {
    selectorViolations,
    destructiveTokens: [...destructiveTokens.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    layoutViolations: [...layoutViolations.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  };
}

/**
 * Check 3: Für jeden Selector in dark.css mit [data-mode="X"] muss
 * ein Descendant-Partner [data-mode="X"] [data-tone] in derselben
 * Komma-Liste existieren. Sonst verlieren nested Tone-Scopes Dark-Mode.
 *
 * Robuste Selector-Analyse: PostCSS gibt uns rule.selectors als
 * Komma-getrennte Liste. Wir entfernen :not(...) per Regex (PostCSS
 * splittet die nicht intern auf, aber für unsere Erkennung reicht das),
 * dann checken wir auf positive [data-mode="X"]-Vorkommen.
 */
function lintDarkCss() {
  const root = parseFile(DARK_CSS);
  const issues = [];

  walkAllRules(root, (rule) => {
    const modeOnly = [];
    const descendants = new Set();

    for (const part of rule.selectors) {
      // Entferne :not(...) damit nur POSITIVE [data-mode]-Vorkommen zählen.
      const positiveOnly = part.replace(/:not\([^)]+\)/g, "");
      const modeMatch = /\[data-mode="([^"]+)"\]/.exec(positiveOnly);
      if (!modeMatch) continue;
      const mode = modeMatch[1];

      if (/\[data-mode="[^"]+"\]\s+\[data-tone/.test(positiveOnly)) {
        descendants.add(mode);
      } else {
        modeOnly.push({ mode, raw: part, line: rule.source?.start?.line ?? 0 });
      }
    }

    for (const { mode, raw, line } of modeOnly) {
      if (!descendants.has(mode)) {
        issues.push({
          selector: raw,
          mode,
          line,
          message:
            `[data-mode="${mode}"]-selector hat keinen Descendant-Partner ` +
            `(z.B. ', [data-mode="${mode}"] [data-tone]'). ` +
            `Nested Tone-Scopes verlieren ihren Dark-Mode.`,
        });
      }
    }
  });

  return issues;
}

function main() {
  const modeSensitive = readModeSensitiveTokens();
  console.log(`Mode-sensitive tokens from dark.css: ${modeSensitive.size}\n`);

  let selectorViolations = 0;
  let destructiveWarnings = 0;
  let nestedIssues = 0;
  let layoutViolations = 0;

  // ===== Check 1+2+4: Themes =====
  const files = fs
    .readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith(".css"))
    .sort();

  for (const file of files) {
    const { selectorViolations: sv, destructiveTokens: dt, layoutViolations: lv } =
      lintTheme(file, modeSensitive);

    if (sv.length === 0 && dt.length === 0 && lv.length === 0) {
      console.log(`[ok]    ${file}`);
      continue;
    }

    if (sv.length > 0) {
      console.error(`[fail]  ${file}  (selector violations)`);
      for (const v of sv) console.error(`        -> "${v.selector}"  (line ${v.line})`);
      selectorViolations += sv.length;
    }

    if (lv.length > 0) {
      console.error(`[fail]  ${file}  verbotene Layout-Token-Setzungen:`);
      for (const [token, line] of lv) console.error(`        -> ${token}  (line ${line})`);
      console.error(`        Cascadiert via DOM-Vererbung auf jeden .container.`);
      console.error(`        Editorial-Verengung gehört in --prose-max (siehe ADR-001).`);
      layoutViolations += lv.length;
    }

    if (dt.length > 0) {
      const tag = STRICT ? "[fail]" : "[warn]";
      const log = STRICT ? console.error : console.warn;
      log(`${tag}  ${file}  destruktive mode-sensitive Token-Setzungen:`);
      for (const [token, line] of dt) log(`        -> ${token}  (line ${line})`);
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
      console.error(`[fail]  semantic/dark.css:${issue.line}  ${issue.message}`);
      console.error(`        Selector: ${issue.selector}`);
    }
    nestedIssues = darkIssues.length;
  }

  console.log("");

  if (selectorViolations > 0) {
    console.error(`${selectorViolations} Selector-Violation(s).`);
    process.exit(1);
  }
  if (layoutViolations > 0) {
    console.error(`${layoutViolations} Layout-Token-Violation(s) (siehe ADR-001).`);
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
