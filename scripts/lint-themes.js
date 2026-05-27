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

const ROOT           = path.resolve(__dirname, "..");
const THEMES_DIR     = path.join(ROOT, "themes");
const DARK_CSS       = path.join(ROOT, "semantic/dark.css");
const COMPONENTS_DIR = path.join(ROOT, "components");
const BASE_DIR       = path.join(ROOT, "base");
const SEMANTIC_DIR   = path.join(ROOT, "semantic");

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

/**
 * AUTO-DETECTION: cross-axis-sensitive Component-Tokens.
 *
 * Scannt components/*.css + base/*.css nach Pattern:
 *   var(--<component-token>, var(--<axis>-...))
 * → Das Component-Token ist von einer Mode-Achse abhängig. Wenn ein Theme
 *   es hartcoded überschreibt, blockiert es die Achse für diese Component.
 *
 * Aktuell erkannte Achsen: --density-*.
 * Erweiterbar durch zusätzliche Achsen-Prefixes in AXIS_PREFIXES.
 */
const AXIS_PREFIXES = ["--density-"];

function readAxisSensitiveTokens() {
  // Map: componentToken → axis-name (e.g. "density")
  const sensitive = new Map();

  function recordSensitive(componentToken, axisToken) {
    for (const prefix of AXIS_PREFIXES) {
      if (axisToken.startsWith(prefix)) {
        if (!sensitive.has(componentToken)) {
          sensitive.set(componentToken, prefix.replace(/-+$/, "").slice(2));
        }
      }
    }
  }

  const scanDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".css"))) {
      const css = fs.readFileSync(path.join(dir, file), "utf8");

      // Pattern A: fallback chain in components → var(--X, var(--density-...))
      const fallbackRe = /var\(\s*(--[\w-]+)\s*,\s*var\(\s*(--[\w-]+)/gs;
      let m;
      while ((m = fallbackRe.exec(css)) !== null) {
        recordSensitive(m[1], m[2]);
      }

      // Pattern B: direct definition in semantic → --X: var(--density-...)
      // Catches semantic.css-style: --btn-py: var(--density-control-py);
      const defineRe = /(--[\w-]+)\s*:\s*var\(\s*(--[\w-]+)/g;
      while ((m = defineRe.exec(css)) !== null) {
        recordSensitive(m[1], m[2]);
      }
    }
  };
  scanDir(COMPONENTS_DIR);
  scanDir(BASE_DIR);
  scanDir(SEMANTIC_DIR);
  return sensitive;
}

function lintTheme(file, modeSensitive, axisSensitive) {
  const filePath = path.join(THEMES_DIR, file);
  const root = parseFile(filePath);

  const selectorViolations = [];
  const destructiveTokens = new Map();   // token → first source line
  const layoutViolations = new Map();    // token → first source line
  const axisBlocks = new Map();          // token → { line, axis }

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

    // Check 2 + 4 + 5: Token-Setzungen prüfen.
    rule.walkDecls(/^--/, (decl) => {
      const line = decl.source?.start?.line ?? 0;
      if (modeSensitive.has(decl.prop) && !destructiveTokens.has(decl.prop)) {
        destructiveTokens.set(decl.prop, line);
      }
      if (FORBIDDEN_LAYOUT_TOKENS.has(decl.prop) && !layoutViolations.has(decl.prop)) {
        layoutViolations.set(decl.prop, line);
      }
      if (axisSensitive.has(decl.prop) && !axisBlocks.has(decl.prop)) {
        axisBlocks.set(decl.prop, { line, axis: axisSensitive.get(decl.prop) });
      }
    });
  });

  return {
    selectorViolations,
    destructiveTokens: [...destructiveTokens.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    layoutViolations: [...layoutViolations.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    axisBlocks: [...axisBlocks.entries()].sort((a, b) => a[0].localeCompare(b[0])),
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
  const axisSensitive = readAxisSensitiveTokens();
  console.log(`Mode-sensitive tokens from dark.css: ${modeSensitive.size}`);
  console.log(`Axis-sensitive component tokens (auto-detected): ${axisSensitive.size}`);
  console.log("");

  let selectorViolations = 0;
  let destructiveWarnings = 0;
  let nestedIssues = 0;
  let layoutViolations = 0;
  let axisBlocks = 0;

  // ===== Check 1+2+4+5: Themes =====
  const files = fs
    .readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith(".css"))
    .sort();

  for (const file of files) {
    const { selectorViolations: sv, destructiveTokens: dt, layoutViolations: lv, axisBlocks: ab } =
      lintTheme(file, modeSensitive, axisSensitive);

    if (sv.length === 0 && dt.length === 0 && lv.length === 0 && ab.length === 0) {
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

    if (ab.length > 0) {
      console.error(`[fail]  ${file}  cross-axis-blockierende Token-Setzungen:`);
      for (const [token, info] of ab) {
        console.error(`        -> ${token}  (line ${info.line}, blockt ${info.axis}-Achse)`);
      }
      console.error(`        Diese Component-Tokens haben Fallbacks auf --${ab[0][1].axis}-*.`);
      console.error(`        Hartcoded Theme-Werte schalten ${ab[0][1].axis} für diese Component aus.`);
      console.error(`        Identität via radius/color/weight/transform statt Sizing setzen.`);
      axisBlocks += ab.length;
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
  if (axisBlocks > 0) {
    console.error(`${axisBlocks} cross-axis-Token-Block(s) — Mode/Density wird in einigen Themes ignoriert.`);
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
