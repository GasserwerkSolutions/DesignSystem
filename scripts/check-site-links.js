#!/usr/bin/env node
/**
 * Static Site Link + Asset Check
 * ==============================
 *
 * Verifies generated dist/site HTML without launching a browser.
 * Catches the class of failures where Pages deploys, but nested pages lose CSS
 * or real documentation links point to missing generated files.
 *
 * Component examples may intentionally contain app-domain demo hrefs such as
 * /settings, /users/anna, ... or …. Those are example payload, not docs routes.
 * The checker therefore validates real generated-site references only:
 *   - CSS / JS / image / favicon / asset references
 *   - .html documentation links
 *   - directory URLs that should resolve to index.html
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "dist", "site");

const INTERNAL_ATTR_RE = /\b(?:href|src)="([^"]+)"/g;
const SKIP_SCHEMES = /^(?:https?:|mailto:|tel:|data:|#|javascript:)/i;
const PLACEHOLDER_URLS = new Set(["...", "…"]);
const CHECKED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
]);

function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(file, predicate, out);
    else if (entry.isFile() && predicate(file)) out.push(file);
  }
  return out;
}

function stripQueryAndHash(url) {
  return url.split("#")[0].split("?")[0];
}

function isDirectoryUrl(url) {
  return url.endsWith("/");
}

function shouldCheckUrl(rawUrl) {
  const clean = stripQueryAndHash(rawUrl).trim();
  if (!clean || SKIP_SCHEMES.test(clean)) return false;
  if (PLACEHOLDER_URLS.has(clean)) return false;
  if (isDirectoryUrl(clean)) return true;

  const ext = path.posix.extname(clean);
  if (CHECKED_EXTENSIONS.has(ext)) return true;

  /* Root-relative extensionless paths inside component examples usually model
     product-app routes (/settings, /users/anna). They are not documentation
     routes and should not block the generated static site. */
  if (clean.startsWith("/")) return false;

  /* Relative extensionless links are documentation-risky: they usually intend
     a local file or folder and should be resolved. */
  return true;
}

function resolveTarget(fromFile, rawUrl) {
  const clean = stripQueryAndHash(rawUrl).trim();
  if (!shouldCheckUrl(clean)) return null;

  const base = path.dirname(fromFile);
  const normalized = clean.replaceAll("/", path.sep);
  let target;

  if (clean.startsWith("/")) {
    target = path.join(SITE_DIR, normalized.replace(/^[/\\]+/, ""));
  } else {
    target = path.resolve(base, normalized);
  }

  if (isDirectoryUrl(clean)) target = path.join(target, "index.html");
  return target;
}

function withinSite(file) {
  const rel = path.relative(SITE_DIR, file);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function checkHtmlFile(file) {
  const html = fs.readFileSync(file, "utf8");
  const issues = [];
  let match;

  while ((match = INTERNAL_ATTR_RE.exec(html)) !== null) {
    const rawUrl = match[1];
    const target = resolveTarget(file, rawUrl);
    if (!target) continue;

    if (!withinSite(target)) {
      issues.push({ rawUrl, reason: "points outside dist/site" });
      continue;
    }

    if (!fs.existsSync(target)) {
      issues.push({ rawUrl, reason: "missing target" });
    }
  }

  return issues;
}

function main() {
  if (!fs.existsSync(SITE_DIR)) {
    console.error("[check-site-links] dist/site fehlt. Erst npm run build:site ausführen.");
    process.exit(1);
  }

  const htmlFiles = walkFiles(SITE_DIR, (file) => file.endsWith(".html"));
  let errors = 0;

  for (const file of htmlFiles) {
    const issues = checkHtmlFile(file);
    const rel = path.relative(SITE_DIR, file).replaceAll(path.sep, "/");
    if (issues.length === 0) {
      console.log(`  [ok]   ${rel}`);
      continue;
    }

    console.error(`  [FAIL] ${rel}`);
    for (const issue of issues) {
      console.error(`         ${issue.rawUrl} — ${issue.reason}`);
    }
    errors += issues.length;
  }

  console.log("");
  if (errors > 0) {
    console.error(`[check-site-links] ${errors} broken link/asset reference(s).`);
    process.exit(1);
  }

  console.log(`[check-site-links] ${htmlFiles.length} HTML files checked, 0 broken references.`);
}

main();
