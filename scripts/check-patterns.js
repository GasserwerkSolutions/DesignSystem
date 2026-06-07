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
const AGGREGATOR = path.join(PATTERN_DIR, "website.css");
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
  if (!fs.existsSync(AGGREGATOR)) return fail("[patterns] missing patterns/website.css");

  const source = read(AGGREGATOR);
  const imports = extractAggregatorImports(source);

  if (!source.includes("@layer patterns;")) {
    console.error("[patterns] website.css must declare @layer patterns;");
    errors++;
  }

  if (imports.length === 0) {
    console.error("[patterns] website.css imports no pattern modules.");
    errors++;
  }

  for (const rel of imports) {
    const file = path.join(PATTERN_DIR, rel);
    if (!fs.existsSync(file)) {
      console.error(`[patterns] website.css imports missing module: ${rel}`);
      errors++;
    }
  }

  const imported = new Set(imports.map((f) => path.basename(f)));
  const modules = fs
    .readdirSync(PATTERN_DIR)
    .filter((f) => f.endsWith(".css") && f !== "website.css")
    .sort();

  for (const mod of modules) {
    if (!imported.has(mod)) {
      console.error(`[patterns] module not imported by website.css: ${mod}`);
      errors++;
    }
  }

  console.log(`  [${errors ? "FAIL" : "ok"}] aggregator imports ${imports.length} module(s)`);
  return errors;
}

function checkModules() {
  let errors = 0;
  const modules = fs
    .readdirSync(PATTERN_DIR)
    .filter((f) => f.endsWith(".css") && f !== "website.css")
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
  errors += checkPackageExports();
  console.log("");

  if (errors > 0) {
    console.error(`[check-patterns] ${errors} issue(s).`);
    process.exit(1);
  }

  console.log("[check-patterns] passed.");
}

main();
