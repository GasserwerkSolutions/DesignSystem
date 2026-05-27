#!/usr/bin/env node
/**
 * Release-Script
 * ===============
 *
 * Versioned + validated npm-Publish-Flow. Macht jeden Release-Step
 * explizit und reproduzierbar — kein "ad-hoc bump-commit-push-publish".
 *
 * Schritte:
 *   1. Repository-State validieren (clean working tree)
 *   2. Komplette Test-Pipeline (check:full + check:tools)
 *   3. Tarball-Audit (npm pack --dry-run) — was würde published werden
 *   4. Version bumpen (semver: patch / minor / major)
 *   5. Publish (dry-run als Default; --publish für echten npm publish)
 *
 * Provenance: --provenance wird vorbereitet, braucht GitHub Actions
 * OIDC-Token für echte SLSA-Provenance (v0.7.2 mit CI-Setup).
 *
 * Usage:
 *   npm run release patch              dry-run
 *   npm run release minor --publish    echter publish
 *   npm run release -- --skip-checks   Pipeline-Skip (NICHT empfohlen)
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const type = args.find((a) => ["patch", "minor", "major"].includes(a));
const publish = args.includes("--publish");
const skipChecks = args.includes("--skip-checks");
const skipBump = args.includes("--skip-bump");

if (!type) {
  console.error("Usage: npm run release [patch|minor|major] [--publish] [--skip-checks]");
  process.exit(1);
}

function step(name, fn) {
  console.log("");
  console.log(`▸ ${name}`);
  console.log("─".repeat(60));
  fn();
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, stdio: opts.silent ? "pipe" : "inherit", ...opts });
}

// ============================================================
// 1. Repository-State validieren
// ============================================================
step("1/5 — Working-Tree clean?", () => {
  const status = sh("git status --porcelain", { silent: true }).toString().trim();
  if (status) {
    console.error("FAIL: Repository hat uncommitted changes:");
    console.error(status);
    console.error("");
    console.error("Commit oder stash, dann release erneut.");
    process.exit(1);
  }
  console.log("✓ clean");
});

// ============================================================
// 2. Komplette Test-Pipeline
// ============================================================
if (!skipChecks) {
  step("2/5 — Test-Pipeline (check:full + check:tools)", () => {
    sh("npm run check:full");
    sh("npm run check:tools");
    console.log("");
    console.log("✓ alle Gates grün");
  });
} else {
  console.warn("⚠  --skip-checks gesetzt — gefährlich!");
}

// ============================================================
// 3. Tarball-Audit
// ============================================================
step("3/5 — Tarball-Audit (npm pack --dry-run)", () => {
  const output = sh("npm pack --dry-run --json", { silent: true }).toString();
  const data = JSON.parse(output)[0];
  console.log(`Package:  ${data.name}@${data.version}`);
  console.log(`Size:     ${(data.size / 1024).toFixed(1)} KB unpacked, ${(data.unpackedSize / 1024).toFixed(1)} KB total`);
  console.log(`Files:    ${data.entryCount}`);
  console.log("");
  console.log("Top-Level-Entries (für package-exports):");
  const topLevels = new Set();
  data.files.forEach((f) => {
    const top = f.path.split("/")[0];
    topLevels.add(top);
  });
  [...topLevels].sort().forEach((t) => console.log(`  · ${t}`));

  /* Coverage-Self-Check: jeder @import in main.css MUSS im Tarball-Inhalt
     auffindbar sein. Sonst bricht die Installation bei Konsumenten still
     (main.css verweist auf nicht-existierende Dateien). Hatten das v0.10.0
     mit state/ — dieser Check verhindert die Wiederholung. */
  const mainCss = fs.readFileSync(path.join(ROOT, "main.css"), "utf8");
  const importPaths = [...mainCss.matchAll(/@import\s+["']\.\/([^"']+)["']/g)].map((m) => m[1]);
  const tarballPaths = new Set(data.files.map((f) => f.path));
  const missing = importPaths.filter((p) => !tarballPaths.has(p));
  if (missing.length) {
    console.error("");
    console.error(`✗ ${missing.length} @import-Targets fehlen im Tarball:`);
    for (const p of missing) console.error(`    - ${p}`);
    console.error("  Fix: package.json:files erweitern.");
    process.exit(1);
  } else {
    console.log("");
    console.log(`✓ Tarball-Coverage: alle ${importPaths.length} @imports aus main.css enthalten.`);
  }
});

// ============================================================
// 4. Version-Bump
// ============================================================
if (!skipBump) {
  step(`4/5 — Version-Bump (${type})`, () => {
    const before = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"))).version;
    // npm version bumpt + commitet + taggt. --no-git-tag-tag-version skippet das wenn
    // wir z.B. auf feature-branch sind. Für ECHTEN release auf main wird tag erzeugt.
    sh(`npm version ${type} --no-git-tag-version`);
    const after = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"))).version;
    console.log(`✓ ${before} → ${after}`);
    console.log("");
    console.log("Hinweis: --no-git-tag-version aktiv. Tag manuell setzen:");
    console.log(`  git commit -am "release: v${after}" && git tag v${after}`);
  });
} else {
  console.warn("⚠  --skip-bump gesetzt — Version bleibt unverändert");
}

// ============================================================
// 5. Publish
// ============================================================
step("5/5 — Publish", () => {
  if (publish) {
    console.log("ECHTER PUBLISH zu npm registry...");
    sh("npm publish --access public --provenance");
    console.log("✓ published");
  } else {
    console.log("Dry-Run: npm publish --dry-run --access public");
    sh("npm publish --dry-run --access public");
    console.log("");
    console.log("Für echten Publish: npm run release " + type + " --publish");
  }
});

console.log("");
console.log("Done.");
