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
  /* Quelle 1: tokens, die dark.css explizit überschreibt (Multi-Shadow etc.) */
  const tokens = new Set();
  const dark = parseFile(DARK_CSS);
  walkAllRules(dark, (rule) => {
    rule.walkDecls(/^--/, (decl) => tokens.add(decl.prop));
  });

  /* Quelle 2: tokens, die in semantic.css mit light-dark() definiert sind.
     Diese sind mode-sensitiv per Definition — themes müssen light-dark() nutzen
     wenn sie sie überschreiben, sonst kollabieren beide Modes auf einen Wert. */
  const semanticFile = path.join(SEMANTIC_DIR, "semantic.css");
  if (fs.existsSync(semanticFile)) {
    const semantic = parseFile(semanticFile);
    walkAllRules(semantic, (rule) => {
      rule.walkDecls(/^--/, (decl) => {
        if (/\blight-dark\(/.test(decl.value)) tokens.add(decl.prop);
      });
    });
  }

  /* Quelle 3: tokens.css — Shadow-Tokens sind mode-sensitiv via dark.css-
     Override. Bereits in Quelle 1 erfasst, deshalb hier kein zusätzlicher Pass. */
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

/**
 * Check 6 (v0.29.0+): CLEAR 4 Prinzip 1 — keine Bounce-Defaults.
 *
 * Easing-Token-Slots (--easing-*, --duration-*, --*-transition) dürfen
 * keinen Overshoot enthalten. "Overshoot" = cubic-bezier(...) mit Y-Wert
 * > 1.0 ODER direkte Referenz auf --ease-bounce.
 *
 * Erlaubte Ausnahme: --motion-emphasis darf Bounce nutzen (das ist
 * exact die opt-in-Form die die Verfassung explizit zulässt).
 *
 * Slot-Patterns: easing-, motion- (außer emphasis), und alle *-transition.
 * --motion-emphasis bleibt ungeprüft als legitimer Bounce-Träger.
 */
const EMPHASIS_TOKEN = "--motion-emphasis";

function isBounceValue(value, resolveVar) {
  /* Direkter Token-Reference */
  if (/--ease-bounce\b/.test(value)) return true;
  /* cubic-bezier(x, Y, ...) mit Y > 1 (Overshoot). Auch Y4 > 1
     ist Overshoot beim End-State. */
  const cb = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g;
  let m;
  while ((m = cb.exec(value))) {
    const y1 = parseFloat(m[2]);
    const y2 = parseFloat(m[4]);
    if (y1 > 1.0 || y2 > 1.0) return true;
  }
  return false;
}

function isMotionDefaultSlot(prop) {
  /* Slots die als Default für Komponenten-Bewegung dienen.
     --motion-emphasis ist die einzige erlaubte Bounce-Träger-Stelle. */
  if (prop === EMPHASIS_TOKEN) return false;
  if (/^--easing-/.test(prop)) return true;
  if (/^--motion-/.test(prop)) return true;
  if (/-transition$/.test(prop)) return true;
  return false;
}

function lintTheme(file, modeSensitive, axisSensitive) {
  const filePath = path.join(THEMES_DIR, file);
  const root = parseFile(filePath);

  const selectorViolations = [];
  const destructiveTokens = new Map();   // token → first source line
  const layoutViolations = new Map();    // token → first source line
  const axisBlocks = new Map();          // token → { line, axis }
  const bounceDefaults = new Map();      // token → { line, value }

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

    // Check 2 + 4 + 5 + 6: Token-Setzungen prüfen.
    rule.walkDecls(/^--/, (decl) => {
      const line = decl.source?.start?.line ?? 0;
      /* Mode-sensitive Token gilt als destruktiv NUR wenn der Value NICHT
         light-dark() nutzt. Mit light-dark(L, D) ist der Override explizit
         und sicher — color-scheme treibt die Auflösung. */
      if (
        modeSensitive.has(decl.prop) &&
        !destructiveTokens.has(decl.prop) &&
        !/\blight-dark\(/.test(decl.value)
      ) {
        destructiveTokens.set(decl.prop, line);
      }
      if (FORBIDDEN_LAYOUT_TOKENS.has(decl.prop) && !layoutViolations.has(decl.prop)) {
        layoutViolations.set(decl.prop, line);
      }
      if (axisSensitive.has(decl.prop) && !axisBlocks.has(decl.prop)) {
        axisBlocks.set(decl.prop, { line, axis: axisSensitive.get(decl.prop) });
      }
      /* Check 6: Bounce-Default-Verbot (CLEAR 4 Prinzip 1) */
      if (
        isMotionDefaultSlot(decl.prop) &&
        isBounceValue(decl.value) &&
        !bounceDefaults.has(decl.prop)
      ) {
        bounceDefaults.set(decl.prop, { line, value: decl.value.trim() });
      }
    });
  });

  return {
    selectorViolations,
    destructiveTokens: [...destructiveTokens.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    layoutViolations: [...layoutViolations.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    axisBlocks: [...axisBlocks.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    bounceDefaults: [...bounceDefaults.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  };
}

/**
 * Check 3 (v0.12.0+): Mode-sensitive Tokens in dark.css müssen entweder
 *   (a) via light-dark() in semantic.css definiert sein (Resolution
 *       erfolgt automatisch via color-scheme-Inheritance), oder
 *   (b) Multi-Comma-Werte sein, die light-dark() syntaktisch nicht
 *       parsen kann (Shadows). Diese dürfen in dark.css als explizite
 *       Mode-Overrides leben.
 *
 * Der frühere Descendant-Partner-Check ist obsolet: color-scheme erbt
 * automatisch und alle light-dark()-Resolution folgt der Inheritance.
 *
 * Stattdessen prüfen wir: jedes Token, das dark.css setzt, MUSS entweder
 * ein erlaubtes Multi-Shadow-Pattern sein, oder ein dokumentierter
 * Edge-Case (chart-Palette etc.). Sonst sollte es in semantic.css mit
 * light-dark() leben, nicht hier.
 */
const ALLOWED_DARK_OVERRIDES = new Set([
  "--shadow-sm", "--shadow-base", "--shadow-md", "--shadow-lg", "--shadow-xl",
  "--code-block-bg", "--code-copy-bg", "--code-copy-hover-bg",
  "--focus-ring",
]);

function lintDarkCss() {
  const root = parseFile(DARK_CSS);
  const issues = [];

  walkAllRules(root, (rule) => {
    rule.walkDecls(/^--/, (decl) => {
      if (!ALLOWED_DARK_OVERRIDES.has(decl.prop)) {
        issues.push({
          selector: rule.selector,
          mode: "dark",
          line: decl.source?.start?.line ?? 0,
          message:
            `Token ${decl.prop} sollte in semantic.css via light-dark() ` +
            `definiert sein statt in dark.css überschrieben. dark.css ist ` +
            `nur für Multi-Comma-Werte (Shadows) und dokumentierte Edge-Cases.`,
        });
      }
    });
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
  let bounceDefaults = 0;

  // ===== Check 1+2+4+5+6: Themes =====
  const files = fs
    .readdirSync(THEMES_DIR)
    .filter((f) => f.endsWith(".css"))
    .sort();

  for (const file of files) {
    const {
      selectorViolations: sv,
      destructiveTokens: dt,
      layoutViolations: lv,
      axisBlocks: ab,
      bounceDefaults: bd,
    } = lintTheme(file, modeSensitive, axisSensitive);

    if (
      sv.length === 0 &&
      dt.length === 0 &&
      lv.length === 0 &&
      ab.length === 0 &&
      bd.length === 0
    ) {
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

    if (bd.length > 0) {
      console.error(`[fail]  ${file}  bounce in Default-Motion-Slots (CLEAR 4 Prinzip 1):`);
      for (const [token, info] of bd) {
        console.error(`        -> ${token}  (line ${info.line})`);
        console.error(`           value: ${info.value}`);
      }
      console.error(`        Default-Bewegung muss linear und gedämpft sein, nicht federnd.`);
      console.error(`        Erlaubte Bounce-Stelle: --motion-emphasis (opt-in pro Component).`);
      bounceDefaults += bd.length;
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
  if (bounceDefaults > 0) {
    console.error(`${bounceDefaults} Bounce-Default-Verletzung(en) (CLEAR 4 Prinzip 1).`);
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
