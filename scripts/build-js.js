#!/usr/bin/env node
/**
 * Build Script für @gws/design-system-js
 * ========================================
 *
 * Liefert ZWEI Output-Flavours:
 *
 * 1. ESM-Module per File (via tsc) → dist/js/*.js + *.d.ts
 *    Für npm-Konsumenten mit eigenem Bundler (Vite, webpack, esbuild).
 *    Tree-shakable per setup-*.js-Subpath-Import.
 *
 * 2. Single-File-Bundle (via esbuild) → dist/js/design-system.bundle.js
 *    Für direkte <script type="module" src="...">-Adoption ohne
 *    eigenen Build. file://-kompatibel (kein CORS-Issue mit imports).
 *
 * Usage:
 *   node scripts/build-js.js
 */

const { execSync } = require("child_process");
const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// 1. TypeScript-Compile per File
console.log("[tsc] compile js/*.ts → dist/js/*.js");
// Clean stale outputs from previous root-dir misconfigs
const distJs = path.join(ROOT, "dist/js");
if (fs.existsSync(distJs)) fs.rmSync(distJs, { recursive: true });
execSync("npx tsc", { cwd: ROOT, stdio: "inherit" });

// 2a. esbuild ESM-Bundle (für npm-Konsumenten mit bundler)
console.log("[esbuild] bundle dist/js/design-system.bundle.js (ESM)");
esbuild.buildSync({
  entryPoints: [path.join(ROOT, "js/index.ts")],
  bundle: true,
  format: "esm",
  target: "es2022",
  outfile: path.join(ROOT, "dist/js/design-system.bundle.js"),
  sourcemap: false,
  minify: false,
});

// 2b. esbuild IIFE-Bundle (für direkte <script src>-Einbindung).
// Erforderlich weil <script type="module"> via file:// CORS-blockiert wird.
// Exports als window.DS, Konsument ruft DS.setupAll().
console.log("[esbuild] bundle dist/js/design-system.iife.js (IIFE, globalName DS)");
esbuild.buildSync({
  entryPoints: [path.join(ROOT, "js/index.ts")],
  bundle: true,
  format: "iife",
  globalName: "DS",
  target: "es2022",
  outfile: path.join(ROOT, "dist/js/design-system.iife.js"),
  sourcemap: false,
  minify: false,
});

const esmSize  = fs.statSync(path.join(ROOT, "dist/js/design-system.bundle.js")).size;
const iifeSize = fs.statSync(path.join(ROOT, "dist/js/design-system.iife.js")).size;
console.log(`  → ESM bundle:  ${(esmSize / 1024).toFixed(2)} KB`);
console.log(`  → IIFE bundle: ${(iifeSize / 1024).toFixed(2)} KB`);
console.log("");
console.log("Build done.");
