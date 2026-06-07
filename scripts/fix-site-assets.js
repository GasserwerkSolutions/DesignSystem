#!/usr/bin/env node
/**
 * GitHub Pages Asset Fix
 * ======================
 *
 * build-site.js generates dist/site pages and historically points them back to
 * the repository root for main.css and the IIFE bundle. That works for file://
 * and some Pages setups, but breaks when dist/site is deployed as the Pages
 * root: nested pages then resolve ../../main.css outside the published site.
 *
 * This post-step makes the generated site self-contained:
 *   dist/site/assets/ds/main.css
 *   dist/site/assets/ds/{tokens,semantic,themes,base,state,components,patterns}
 *   dist/site/assets/ds/dist/js/design-system.iife.js
 *
 * Then it rewrites every generated HTML file to use those local assets with the
 * correct relative prefix for its folder depth.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "dist", "site");
const DS_ASSET_DIR = path.join(SITE_DIR, "assets", "ds");

const CSS_DIRS = [
  "tokens",
  "semantic",
  "themes",
  "base",
  "state",
  "components",
  "patterns",
];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(file, predicate, out);
    else if (entry.isFile() && predicate(file)) out.push(file);
  }
  return out;
}

function relRootFor(file) {
  const dir = path.dirname(file);
  const rel = path.relative(dir, SITE_DIR).replaceAll(path.sep, "/");
  return rel === "" ? "./" : `${rel}/`;
}

function copyDesignSystemAssets() {
  fs.mkdirSync(DS_ASSET_DIR, { recursive: true });
  fs.copyFileSync(path.join(ROOT, "main.css"), path.join(DS_ASSET_DIR, "main.css"));

  for (const dir of CSS_DIRS) {
    copyDir(path.join(ROOT, dir), path.join(DS_ASSET_DIR, dir));
  }

  const iifeSrc = path.join(ROOT, "dist", "js", "design-system.iife.js");
  if (fs.existsSync(iifeSrc)) {
    const iifeDest = path.join(DS_ASSET_DIR, "dist", "js", "design-system.iife.js");
    fs.mkdirSync(path.dirname(iifeDest), { recursive: true });
    fs.copyFileSync(iifeSrc, iifeDest);
  }
}

function rewriteHtmlAssets() {
  const htmlFiles = walkFiles(SITE_DIR, (file) => file.endsWith(".html"));
  let changed = 0;

  for (const file of htmlFiles) {
    const relRoot = relRootFor(file);
    let html = fs.readFileSync(file, "utf8");
    const before = html;

    html = html.replace(
      /href="(?:\.\/)?(?:\.\.\/)*main\.css"/g,
      `href="${relRoot}assets/ds/main.css"`
    );

    html = html.replace(
      /src="(?:\.\/)?(?:\.\.\/)*dist\/js\/design-system\.iife\.js"/g,
      `src="${relRoot}assets/ds/dist/js/design-system.iife.js"`
    );

    html = html.replace(
      /href="(?:\.\/)?(?:\.\.\/)*components\/([^"]+\.css)"/g,
      `href="${relRoot}assets/ds/components/$1"`
    );

    if (html !== before) {
      fs.writeFileSync(file, html);
      changed++;
    }
  }

  return { htmlFiles: htmlFiles.length, changed };
}

function main() {
  if (!fs.existsSync(SITE_DIR)) {
    console.error("[fix-site-assets] dist/site fehlt. Erst npm run build:site ausführen.");
    process.exit(1);
  }

  copyDesignSystemAssets();
  const result = rewriteHtmlAssets();
  console.log(
    `[fix-site-assets] copied DS assets → dist/site/assets/ds/; rewrote ${result.changed}/${result.htmlFiles} HTML files`
  );
}

main();
