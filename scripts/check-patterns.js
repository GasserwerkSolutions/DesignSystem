#!/usr/bin/env node
/**
 * Website Pattern Contract Check
 * ==============================
 *
 * Guards the optional website-pattern layer as a real product surface.
 * It verifies that the aggregator imports existing modules, every module is
 * layer-scoped, package exports include patterns, and broad project selectors do
 * not leak into the reusable pattern pack.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const PATTERN_DIR = path.join(ROOT, "patterns");
// Packs: website.css ist Teil von main.css und des Builder-Profils;
// project.css ist opt-in (Bildführung und Projektseiten). Jedes Modul
// motion.css ist opt-in (Bewegung als reine Verbesserung). Jedes Modul
// gehört zu genau einem Pack.
const PACKS = ["website.css", "project.css", "motion.css"];
const PACKAGE_JSON = path.join(ROOT, "package.json");

const FORBIDDEN_SELECTOR_PATTERNS = [
  {
    label: "global eyebrow alias",
    re: /(^|[,{\n]\s*)\.eyebrow\b/,
    reason: "Use .section-head__eyebrow or .hero__eyebrow. Generic .eyebrow collides with customer/project markup.",
  },
  {
    label: "broad header descendant link selector",
    re: /\.site-header\s+a\b/,
    reason: "Use .site-header__link so pattern styles do not capture arbitrary links.",
  },
  {
    label: "broad footer descendant link selector",
    re: /\.site-footer\s+a\b/,
    reason: "Use .site-footer__link so pattern styles do not capture arbitrary links.",
  },
  {
    label: "root-level token mutation",
    re: /(^|\n)\s*:root\s*\{/,
    reason: "Patterns may consume tokens and expose local custom properties, but must not define global design tokens.",
  },
  {
    label: "theme selector in pattern pack",
    re: /\[data-tone|\[data-mode|\[data-density/,
    reason: "Themes set tokens. Patterns must not branch by tone, mode or density.",
  },
];

function fail(message) {
  console.error(message);
  return 1;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function extractAggregatorImports(source) {
  const imports = [];
  const re = /@import\s+"\.\/([^"]+\.css)"\s+layer\(patterns\)\s*;/g;
  let m;
  while ((m = re.exec(source)) !== null) imports.push(m[1]);
  return imports;
}

function checkAggregator() {
  let errors = 0;
  const imported = new Set();

  for (const pack of PACKS) {
    const file = path.join(PATTERN_DIR, pack);
    if (!fs.existsSync(file)) {
      errors += fail(`[patterns] missing patterns/${pack}`);
      continue;
    }
    const source = read(file);
    const imports = extractAggregatorImports(source);
    let packErrors = 0;

    if (!source.includes("@layer patterns;")) {
      console.error(`[patterns] ${pack} must declare @layer patterns;`);
      packErrors++;
    }
    if (imports.length === 0) {
      console.error(`[patterns] ${pack} imports no pattern modules.`);
      packErrors++;
    }
    for (const rel of imports) {
      if (!fs.existsSync(path.join(PATTERN_DIR, rel))) {
        console.error(`[patterns] ${pack} imports missing module: ${rel}`);
        packErrors++;
      }
      const name = path.basename(rel);
      if (imported.has(name)) {
        console.error(`[patterns] ${name} is imported by more than one pack`);
        packErrors++;
      }
      imported.add(name);
    }
    console.log(`  [${packErrors ? "FAIL" : "ok"}] ${pack} imports ${imports.length} module(s)`);
    errors += packErrors;
  }

  const modules = fs
    .readdirSync(PATTERN_DIR)
    .filter((f) => f.endsWith(".css") && !PACKS.includes(f));
  for (const mod of modules) {
    if (!imported.has(mod)) {
      console.error(`[patterns] module not imported by any pack (${PACKS.join(", ")}): ${mod}`);
      errors++;
    }
  }
  return errors;
}

function checkModules() {
  let errors = 0;
  const modules = fs
    .readdirSync(PATTERN_DIR)
    .filter((f) => f.endsWith(".css") && !PACKS.includes(f))
    .sort();

  for (const mod of modules) {
    const file = path.join(PATTERN_DIR, mod);
    const source = read(file);
    let moduleErrors = 0;

    if (!/^\s*@layer\s+patterns\s*\{/.test(source)) {
      console.error(`[patterns] ${mod}: must start with @layer patterns {`);
      moduleErrors++;
    }

    for (const rule of FORBIDDEN_SELECTOR_PATTERNS) {
      if (rule.re.test(source)) {
        console.error(`[patterns] ${mod}: forbidden ${rule.label}`);
        console.error(`           ${rule.reason}`);
        moduleErrors++;
      }
    }

    const braceBalance = [...source].reduce((n, ch) => n + (ch === "{" ? 1 : ch === "}" ? -1 : 0), 0);
    if (braceBalance !== 0) {
      console.error(`[patterns] ${mod}: unbalanced braces (${braceBalance})`);
      moduleErrors++;
    }

    console.log(`  [${moduleErrors ? "FAIL" : "ok"}] ${mod}`);
    errors += moduleErrors;
  }

  return errors;
}

/**
 * Bewegungs-Pack: jede Animation, Transition und jeder Seitenübergang muss
 * in `@media … (prefers-reduced-motion: no-preference)` stehen. Der
 * Ruhezustand ausserhalb davon ist das fertige Layout.
 */
function checkMotionGate() {
  const postcss = require("postcss");
  const MOTION = /^(animation(-.+)?|transition(-.+)?|view-transition-(name|class)|scale|translate|rotate|clip-path)$/;
  const packSource = read(path.join(PATTERN_DIR, "motion.css"));
  let errors = 0;
  for (const rel of extractAggregatorImports(packSource)) {
    const root = postcss.parse(read(path.join(PATTERN_DIR, rel)));
    let moduleErrors = 0;
    const gated = (node) => {
      for (let p = node.parent; p; p = p.parent) {
        if (p.type === "atrule" && p.name === "media" && /prefers-reduced-motion:\s*no-preference/.test(p.params)) return true;
      }
      return false;
    };
    root.walkDecls((decl) => {
      if (MOTION.test(decl.prop) && !gated(decl)) {
        console.error(`[patterns] ${rel}:${decl.source.start.line}: ${decl.prop} outside prefers-reduced-motion: no-preference`);
        moduleErrors++;
      }
    });
    root.walkAtRules(/^(view-transition|keyframes)$/, (rule) => {
      if (!gated(rule)) {
        console.error(`[patterns] ${rel}:${rule.source.start.line}: @${rule.name} outside prefers-reduced-motion: no-preference`);
        moduleErrors++;
      }
    });
    console.log(`  [${moduleErrors ? "FAIL" : "ok"}] ${rel} motion is gated by reduced-motion`);
    errors += moduleErrors;
  }
  return errors;
}

function checkPackageExports() {
  const pkg = JSON.parse(read(PACKAGE_JSON));
  let errors = 0;

  if (pkg.exports?.["./patterns/*"] !== "./patterns/*") {
    console.error('[package] missing export "./patterns/*": "./patterns/*"');
    errors++;
  }

  if (!pkg.files?.includes("patterns/")) {
    console.error('[package] missing "patterns/" in files list');
    errors++;
  }

  console.log(`  [${errors ? "FAIL" : "ok"}] package exports/files include patterns`);
  return errors;
}

function main() {
  let errors = 0;
  console.log("Website Pattern Contract Check");
  console.log("");
  errors += checkAggregator();
  errors += checkModules();
  errors += checkMotionGate();
  errors += checkPackageExports();
  console.log("");

  if (errors > 0) {
    console.error(`[check-patterns] ${errors} issue(s).`);
    process.exit(1);
  }

  console.log("[check-patterns] passed.");
}

main();
