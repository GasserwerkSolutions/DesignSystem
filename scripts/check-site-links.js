#!/usr/bin/env node
/**
 * Static Site Link + Asset Check
 * ==============================
 *
 * Verifies generated dist/site HTML without launching a browser.
 * Catches the class of failures where Pages deploys, but nested pages lose CSS
 * or internal links point to missing generated files.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "dist", "site");

const INTERNAL_ATTR_RE = /\b(?:href|src)="([^"]+)"/g;
const SKIP_SCHEMES = /^(?:https?:|mailto:|tel:|data:|#|javascript:)/i;

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

function resolveTarget(fromFile, rawUrl) {
  const clean = stripQueryAndHash(rawUrl);
  if (!clean || SKIP_SCHEMES.test(clean)) return null;

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
