#!/usr/bin/env node
"use strict";

/** Read-only verification of a pinned two-tree SOURCE inventory.
 * Deliberately does not score accessibility, rendering quality, legal rights
 * or approve merging. Supports optional --monorepo-root for byte verification.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const inventoryPath = path.join(root, "audit", "two-source-inventory-2026-10.json");
const allowedRelations = new Set(["IDENTICAL", "DIVERGED", "ONLY_MONOREPO", "ONLY_CANONICAL"]);
const allowedDispositions = new Set([
  "REUSE_CANONICAL", "PRESERVE_CANONICAL", "PRODUCT_PRIVATE_REVIEW",
  "GENERIFY_OR_KEEP_PRIVATE_REVIEW", "REVIEW_REQUIRED"
]);
const fail = message => { throw new Error("[inventory] " + message); };

function gitBlobSha(buffer) {
  return crypto.createHash("sha1")
    .update(Buffer.from("blob " + buffer.length + "\0", "utf8"))
    .update(buffer)
    .digest("hex");
}

function verifyRecord(rootDir, relative, pinned, label) {
  if (path.posix.isAbsolute(relative) || relative.startsWith("/") ||
      relative.includes("\\") || relative.split("/").some(s => s === ".." || s === "." || !s))
    fail("unsafe path: " + relative);
  const full = path.join(rootDir, relative);
  const stat = fs.lstatSync(full);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(label + " unsafe/non-file " + relative);
  const bytes = fs.readFileSync(full);
  const sha = gitBlobSha(bytes);
  if (sha !== pinned.gitBlobSha || bytes.length !== pinned.bytes)
    fail(label + " source drift " + relative + ": got " + sha + " (" + bytes.length + " bytes)");
}

function inspect(data, canonicalRoot, monorepoRoot) {
  if (data.schemaVersion !== "two-source-consolidation-inventory/1" ||
      data.publication !== "BLOCKED" || data.status !== "SOURCE_SNAPSHOT_NOT_APPROVAL")
    fail("invalid contract/status");
  if (!Array.isArray(data.entries)) fail("entries missing");
  const seen = new Set(), counted = {IDENTICAL:0,DIVERGED:0,ONLY_MONOREPO:0,ONLY_CANONICAL:0};
  let canonVerified=0, monoVerified=0;
  for (const row of data.entries) {
    if (!row || typeof row.path !== "string" || seen.has(row.path)) fail("invalid/duplicate path " + row?.path);
    seen.add(row.path);
    if (row.path.startsWith("dist/")) fail("generated artifact in source inventory: " + row.path);
    if (!allowedRelations.has(row.relation) || !allowedDispositions.has(row.disposition))
      fail("invalid relation/disposition: " + row.path);
    if (row.relation === "IDENTICAL" &&
        (!row.canonical || !row.monorepo || row.canonical.gitBlobSha !== row.monorepo.gitBlobSha))
      fail("falsely identical: " + row.path);
    if (row.relation === "DIVERGED" &&
        (!row.canonical || !row.monorepo || row.canonical.gitBlobSha === row.monorepo.gitBlobSha))
      fail("falsely divergent: " + row.path);
    if (row.relation === "ONLY_CANONICAL" && (!row.canonical || row.monorepo))
      fail("misclassified canonical-only: " + row.path);
    if (row.relation === "ONLY_MONOREPO" && (!row.monorepo || row.canonical))
      fail("misclassified monorepo-only: " + row.path);
    counted[row.relation]++;
    if (row.canonical) {verifyRecord(canonicalRoot,row.path,row.canonical,"canonical"); canonVerified++;}
    if (monorepoRoot && row.monorepo) {
      verifyRecord(path.join(monorepoRoot, "packages", "design-system"),row.path,row.monorepo,"monorepo");
      monoVerified++;
    }
  }
  if (JSON.stringify(counted)!==JSON.stringify(data.counts)) fail("counts differ from file entries");
  if (seen.size!==210 || canonVerified!==185) fail("unexpected inventory coverage");
  return {verdict:"PASS_SOURCE_BYTES_ONLY",publication:"BLOCKED",inventoryEntries:seen.size,
    canonicalFilesVerified:canonVerified,monorepoFilesVerified:monoVerified,
    monorepoSourcePresent:Boolean(monorepoRoot),
    counts:counted,
    warning:"Passing means only pinned file identity. It does not approve component quality, merges or release."};
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.length!==0 && !(args.length===2 && args[0]==="--monorepo-root"))
      fail("usage: node scripts/verify-consolidation-inventory.js [--monorepo-root /checkout/gasserwerk]");
    const monorepoRoot=args.length===2?path.resolve(args[1]):null;
    const report=inspect(JSON.parse(fs.readFileSync(inventoryPath,"utf8")),root,monorepoRoot);
    console.log(JSON.stringify(report,null,2));
  } catch (error) {console.error(error.message);process.exitCode=1;}
}

module.exports = {gitBlobSha,inspect,verifyRecord};
