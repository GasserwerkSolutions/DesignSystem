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
// Test-Suite: lint-themes.js Integration (spawn als child process)
// ============================================================
console.log("\nlint-themes.js Integration (spawnSync):");

const { spawnSync } = require("child_process");

function runLint(themesContent, flags = []) {
  // Tmp-Fixture-Theme schreiben, lint laufen lassen, aufräumen.
  const tmpFile = path.join(ROOT, "themes", "_test_fixture.css");
  fs.writeFileSync(tmpFile, themesContent);
  try {
    const res = spawnSync("node", ["scripts/lint-themes.js", ...flags], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return {
      stdout: res.stdout,
      stderr: res.stderr,
      code: res.status,
    };
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

test("good theme: exit 0", () => {
  const r = runLint(`[data-tone~="test"] { --btn-bg: green; }`);
  assertEq(r.code, 0, "exit 0 for valid theme");
});

test("forbidden --container-max: exit 1 with line number", () => {
  const r = runLint(`[data-tone~="test"] {\n  --container-max: 80ch;\n}`);
  if (r.code !== 1) throw new Error(`expected exit 1, got ${r.code}\nstderr:\n${r.stderr}`);
  if (!r.stderr.includes("--container-max")) throw new Error("missing token in output");
  if (!r.stderr.includes("line 2")) throw new Error(`expected 'line 2' in output, got:\n${r.stderr}`);
});

test("forbidden :root selector: exit 1", () => {
  const r = runLint(`:root { --x: 1; }`);
  if (r.code !== 1) throw new Error(`expected exit 1, got ${r.code}`);
  if (!r.stderr.includes(":root")) throw new Error("missing :root in error output");
});

test("destructive token + warn (default): exit 0", () => {
  // --color-text-primary IS in dark.css, theme sets it → warning, not fail.
  const r = runLint(`[data-tone~="test"] { --color-text-primary: red; }`);
  assertEq(r.code, 0, "soft-warn default → exit 0");
  if (!r.stdout.includes("[warn]") && !r.stderr.includes("[warn]")) {
    throw new Error("expected [warn] tag in output");
  }
});

test("destructive token + --strict: exit 1", () => {
  const r = runLint(`[data-tone~="test"] { --color-text-primary: red; }`, ["--strict"]);
  assertEq(r.code, 1, "strict mode → exit 1 for destructive token");
});

// Check 5: axis-blocker auto-detection
// --btn-py wird in semantic.css definiert als var(--density-control-py),
// daher density-sensitive. Setzt ein Theme es hartcoded, blockt es Density.
test("axis-blocker (--btn-py hardcoded): exit 1", () => {
  const r = runLint(`[data-tone~="test"] {\n  --btn-py: 20px;\n}`);
  if (r.code !== 1) {
    throw new Error(`expected exit 1, got ${r.code}\nstderr:\n${r.stderr}`);
  }
  if (!r.stderr.includes("cross-axis")) {
    throw new Error(`expected 'cross-axis' in error output, got:\n${r.stderr}`);
  }
  if (!r.stderr.includes("density")) {
    throw new Error(`expected 'density' in error output, got:\n${r.stderr}`);
  }
  if (!r.stderr.includes("line 2")) {
    throw new Error(`expected 'line 2' source position, got:\n${r.stderr}`);
  }
});

test("axis-blocker (table-cell-py): exit 1", () => {
  // --table-cell-py is density-row-sensitive (per components/table.css)
  const r = runLint(`[data-tone~="test"] { --table-cell-py: 8px; }`);
  assertEq(r.code, 1, "exit 1 for table-cell-py block");
});

test("non-axis token (--btn-radius): exit 0", () => {
  // --btn-radius hat keinen --density-* fallback → kein block, only theme-identity.
  const r = runLint(`[data-tone~="test"] { --btn-radius: 8px; }`);
  assertEq(r.code, 0, "non-axis tokens should pass");
});

// Check 6: bounce-default-Verbot (CLEAR 4 Prinzip 1)
test("bounce in --easing-medium (overshoot Y > 1): exit 1", () => {
  const r = runLint(`[data-tone~="test"] {\n  --easing-medium: cubic-bezier(0.34, 1.56, 0.64, 1);\n}`);
  assertEq(r.code, 1, "exit 1 for bounce-default in easing slot");
  if (!r.stderr.includes("CLEAR 4 Prinzip 1") && !r.stderr.includes("Bounce")) {
    throw new Error(`expected CLEAR 4 reference, got:\n${r.stderr}`);
  }
});

test("bounce via --ease-bounce in --btn-transition: exit 1", () => {
  const r = runLint(`[data-tone~="test"] {\n  --btn-transition: all 200ms var(--ease-bounce);\n}`);
  assertEq(r.code, 1, "exit 1 for bounce-reference in transition slot");
});

test("bounce in --motion-emphasis (opt-in slot): exit 0", () => {
  // --motion-emphasis ist die explizit erlaubte Bounce-Ausnahme.
  const r = runLint(`[data-tone~="test"] {\n  --motion-emphasis: 400ms var(--ease-bounce);\n}`);
  assertEq(r.code, 0, "motion-emphasis should allow bounce");
});

test("cubic-bezier ohne Overshoot (Y <= 1): exit 0", () => {
  // Standard-Easing ohne Overshoot ist erlaubt.
  const r = runLint(`[data-tone~="test"] {\n  --easing-medium: cubic-bezier(0.25, 0.46, 0.45, 0.94);\n}`);
  assertEq(r.code, 0, "non-overshoot easing should pass");
});

// ============================================================
// Check 7: Reduced-Motion-Bewusstsein (CLEAR 4 Prinzip 5)
// Fixtures landen in components/_test_fixture.css damit Check 7 sie sieht.
// ============================================================
function runLintComponent(componentContent) {
  const tmpFile = path.join(ROOT, "components", "_test_fixture.css");
  fs.writeFileSync(tmpFile, componentContent);
  try {
    const res = spawnSync("node", ["scripts/lint-themes.js"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return { stdout: res.stdout, stderr: res.stderr, code: res.status };
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

test("animation 1s infinite ohne reduced-motion-Marker: exit 1", () => {
  const r = runLintComponent(`.fx { animation: spin 1s linear infinite; }`);
  assertEq(r.code, 1, "naked long-running animation must fail Check 7");
});

test("animation mit lokalem @media reduced-motion Block: exit 0", () => {
  const r = runLintComponent(
    `.fx { animation: spin 1s linear infinite; }\n` +
      `@media (prefers-reduced-motion: reduce) { .fx { animation: none; } }`
  );
  assertEq(r.code, 0, "local reduced-motion block satisfies Bedingung (a)");
});

test("animation mit preceding 'reduced-motion' Comment: exit 0", () => {
  const r = runLintComponent(
    `.fx {\n  /* reduced-motion: handled by reset.css */\n  animation: spin 1s linear infinite;\n}`
  );
  assertEq(r.code, 0, "preceding comment satisfies Bedingung (b)");
});

test("animation 50ms one-shot (Mikro-Feedback): exit 0", () => {
  const r = runLintComponent(`.fx { animation: pulse 50ms ease-out; }`);
  assertEq(r.code, 0, "micro-feedback duration ≤100ms non-infinite satisfies Bedingung (c)");
});

test("animation 100ms infinite (Flimmer-Escape-Hatch): exit 1", () => {
  // Bedingung (c) gilt nur wenn nicht infinite — Flimmern muss erkannt werden.
  const r = runLintComponent(`.fx { animation: flicker 100ms linear infinite; }`);
  assertEq(r.code, 1, "100ms infinite must fail despite short duration");
});

test("animation mit var(--duration) und keinerlei Marker: exit 1", () => {
  // var() lässt sich nicht statisch lösen → Bedingung (c) disqualifiziert →
  // braucht zwingend (a) oder (b).
  const r = runLintComponent(`.fx { animation: spin var(--duration) linear infinite; }`);
  assertEq(r.code, 1, "var-based duration ohne marker must fail");
});

// ============================================================
// Summary
// ============================================================
console.log("");
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
