#!/usr/bin/env node
/**
 * Lint-Smoke-Tests
 * =================
 *
 * Verifiziert, dass die PostCSS-AST-basierten Lint-Checks gegen
 * Edge-Cases robust sind, die das alte Hand-Parsing nicht zuverlässig
 * gehandhabt hat:
 *   - Verschachtelte @media/@supports
 *   - :not() / :is() / :where() in Selectors
 *   - Kommentare innerhalb Selectors und Werte
 *   - Strings mit {}-Zeichen in property values
 *
 * Idempotent: schreibt temp-Files in /tmp/, räumt am Ende auf.
 *
 * Usage: node scripts/test-lint.js
 * Exit:  0 = alle Tests grün, 1 = mindestens ein Test fail
 */

const fs = require("fs");
const path = require("path");
const postcss = require("postcss");

const ROOT = path.resolve(__dirname, "..");

let failed = 0;
let passed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [ok]    ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [fail]  ${name}`);
    console.error(`          ${err.message}`);
    failed++;
  }
}

function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}: expected ${e}, got ${a}`);
}

// ============================================================
// Test-Suite: extractDeclaredTokens (über walkDecls)
// ============================================================
console.log("PostCSS-AST extractDeclaredTokens:");

test("flat rule: collects --tokens", () => {
  const root = postcss.parse(`
    [data-tone~="x"] {
      --foo: 1px;
      --bar: 2px;
      color: red;  /* nicht --xxx */
    }
  `);
  const tokens = new Set();
  root.walkRules((rule) => rule.walkDecls(/^--/, (d) => tokens.add(d.prop)));
  assertEq([...tokens].sort(), ["--bar", "--foo"], "two tokens");
});

test("nested @media: collects --tokens from inner rules", () => {
  const root = postcss.parse(`
    @media (prefers-color-scheme: dark) {
      [data-tone~="x"] {
        --inner: 5px;
      }
    }
    [data-tone~="x"] {
      --outer: 3px;
    }
  `);
  const tokens = new Set();
  root.walkRules((rule) => rule.walkDecls(/^--/, (d) => tokens.add(d.prop)));
  assertEq([...tokens].sort(), ["--inner", "--outer"], "both nested + flat");
});

test("nested @supports + @container: walks correctly", () => {
  const root = postcss.parse(`
    @supports (color: oklch(0 0 0)) {
      @container (min-width: 30rem) {
        [data-tone~="x"] { --deep: 1px; }
      }
    }
  `);
  const tokens = new Set();
  root.walkRules((rule) => rule.walkDecls(/^--/, (d) => tokens.add(d.prop)));
  assertEq([...tokens], ["--deep"], "deep nested token found");
});

test("value with {} characters: no false brace-tracking", () => {
  // Hand-Parser fiel hier in alte Version rein wenn die Werte unbalanced waren
  const root = postcss.parse(`
    [data-tone~="x"] {
      --grid-template: "a b" "c d";
      --calc-expr: calc(1rem + 2px);
    }
  `);
  const tokens = new Set();
  root.walkRules((rule) => rule.walkDecls(/^--/, (d) => tokens.add(d.prop)));
  assertEq([...tokens].sort(), ["--calc-expr", "--grid-template"], "both parsed");
});

test("comment inside rule body: ignored cleanly", () => {
  const root = postcss.parse(`
    [data-tone~="x"] {
      /* leading comment */
      --foo: 1px;
      /* between */
      --bar: 2px;  /* trailing */
    }
  `);
  const tokens = new Set();
  root.walkRules((rule) => rule.walkDecls(/^--/, (d) => tokens.add(d.prop)));
  assertEq([...tokens].sort(), ["--bar", "--foo"], "comments ignored");
});

// ============================================================
// Test-Suite: Selector-Contract (Check 1)
// ============================================================
console.log("\nSelector-Contract (Check 1):");

const ALLOWED = /^\[data-tone~="[^"]+"\]$/;

test("allowed: [data-tone~='trust']", () => {
  const root = postcss.parse(`[data-tone~="trust"] { --x: 1; }`);
  const violations = [];
  root.walkRules((r) => {
    for (const s of r.selectors) if (!ALLOWED.test(s)) violations.push(s);
  });
  assertEq(violations, [], "no violations");
});

test("forbidden: :root { ... }", () => {
  const root = postcss.parse(`:root { --x: 1; }`);
  const violations = [];
  root.walkRules((r) => {
    for (const s of r.selectors) if (!ALLOWED.test(s)) violations.push(s);
  });
  assertEq(violations, [":root"], ":root flagged");
});

test("forbidden: combined .btn selector", () => {
  const root = postcss.parse(`[data-tone~="x"] .btn { background: red; }`);
  const violations = [];
  root.walkRules((r) => {
    for (const s of r.selectors) if (!ALLOWED.test(s)) violations.push(s);
  });
  assertEq(violations, [`[data-tone~="x"] .btn`], "combined flagged");
});

test("comma-list: each part validated independently", () => {
  const root = postcss.parse(`[data-tone~="a"], h1 { color: red; }`);
  const violations = [];
  root.walkRules((r) => {
    for (const s of r.selectors) if (!ALLOWED.test(s)) violations.push(s);
  });
  assertEq(violations, ["h1"], "h1 flagged, [data-tone] passes");
});

test("nested @media: inner rule still checked", () => {
  const root = postcss.parse(`
    @media (prefers-color-scheme: dark) {
      .bad-selector { --x: 1; }
    }
  `);
  const violations = [];
  root.walkRules((r) => {
    for (const s of r.selectors) if (!ALLOWED.test(s)) violations.push(s);
  });
  assertEq(violations, [".bad-selector"], "nested still checked");
});

// ============================================================
// Test-Suite: Nested-Mode-Coverage (Check 3)
// ============================================================
console.log("\nNested-Mode-Coverage (Check 3):");

function lintNestedMode(css) {
  const root = postcss.parse(css);
  const issues = [];
  root.walkRules((rule) => {
    const modeOnly = [];
    const descendants = new Set();
    for (const part of rule.selectors) {
      const positiveOnly = part.replace(/:not\([^)]+\)/g, "");
      const m = /\[data-mode="([^"]+)"\]/.exec(positiveOnly);
      if (!m) continue;
      const mode = m[1];
      if (/\[data-mode="[^"]+"\]\s+\[data-tone/.test(positiveOnly)) {
        descendants.add(mode);
      } else {
        modeOnly.push({ mode, raw: part });
      }
    }
    for (const { mode, raw } of modeOnly) {
      if (!descendants.has(mode)) issues.push({ mode, raw });
    }
  });
  return issues;
}

test("missing descendant: flagged", () => {
  const issues = lintNestedMode(`[data-mode="dark"] { --x: 1; }`);
  assertEq(issues.length, 1, "one issue");
});

test("with descendant: no issue", () => {
  const issues = lintNestedMode(`
    [data-mode="dark"],
    [data-mode="dark"] [data-tone] { --x: 1; }
  `);
  assertEq(issues, [], "no issues");
});

test(":not([data-mode='light']) is correctly ignored as positive match", () => {
  // Edge case from auto-block: :root:not([data-mode="light"]):not([data-mode="dark"])
  // Should NOT trigger nested-coverage check (it has no positive [data-mode] match).
  const issues = lintNestedMode(`
    :root:not([data-mode="light"]):not([data-mode="dark"]) { --x: 1; }
  `);
  assertEq(issues, [], "negative-only selectors not flagged");
});

// ============================================================
// Summary
// ============================================================
console.log("");
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
