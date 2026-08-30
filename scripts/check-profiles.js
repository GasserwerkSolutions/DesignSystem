#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const ROOT = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest", "builder-profile.json"), "utf8"));
const errors = [];

function unique(items, label) {
  if (new Set(items).size !== items.length) errors.push(`${label} enthält Duplikate.`);
}

if (manifest.schemaVersion !== 1 || manifest.id !== "builder") errors.push("Unbekannte Manifest-Version oder Profil-ID.");
if (!fs.existsSync(path.join(ROOT, manifest.entry))) errors.push(`Entry fehlt: ${manifest.entry}`);
unique(manifest.layers, "layers");
unique(manifest.imports, "imports");
unique(manifest.components.map((item) => item.id), "components");
unique(manifest.patterns.map((item) => item.id), "patterns");

for (const file of manifest.imports) {
  if (!fs.existsSync(path.join(ROOT, file))) errors.push(`Import fehlt: ${file}`);
}
for (const item of [...manifest.components, ...manifest.patterns]) {
  if (!fs.existsSync(path.join(ROOT, item.css))) errors.push(`${item.id}: CSS fehlt (${item.css})`);
  if (item.javascript && !fs.existsSync(path.join(ROOT, item.javascript))) errors.push(`${item.id}: JS fehlt (${item.javascript})`);
}

const cssFile = path.join(ROOT, "dist", "profiles", "builder.min.css");
const jsFile = path.join(ROOT, "dist", "profiles", "builder-profile.js");
if (!fs.existsSync(cssFile) || !fs.existsSync(jsFile)) {
  errors.push("Gebautes Builder-Profil fehlt. npm run build:profiles ausführen.");
} else {
  const css = fs.readFileSync(cssFile);
  const text = css.toString("utf8");
  const js = fs.readFileSync(jsFile, "utf8");
  const sha256 = crypto.createHash("sha256").update(css).digest("hex");
  const budget = pkg.profileBudgets?.builder;
  const gzip = zlib.gzipSync(css, { level: 9 }).length;
  if (/@import\b/.test(text)) errors.push("Gebautes Builder-Profil enthält unaufgelöste @imports.");
  if (!text.includes("@layer reset,tokens,semantic,themes,mode,base,state,components,patterns,treatments,utilities,overrides")) {
    errors.push("Builder-Profil hat nicht den vereinbarten Layer-Vertrag.");
  }
  if (!js.includes(sha256) || !js.includes(`\"version\":\"${pkg.version}\"`)) errors.push("JS-Artefakt und CSS/Version sind nicht synchron.");
  if (budget?.raw && css.length > budget.raw) errors.push(`Builder raw ${css.length} > Budget ${budget.raw}`);
  if (budget?.gzip && gzip > budget.gzip) errors.push(`Builder gzip ${gzip} > Budget ${budget.gzip}`);
  console.log(`[profiles] builder: ${(css.length / 1024).toFixed(1)} KB raw · ${(gzip / 1024).toFixed(1)} KB gzip · ${sha256.slice(0, 12)}`);
}

if (errors.length) {
  for (const error of errors) console.error(`  [FAIL] ${error}`);
  process.exit(1);
}
console.log(`[profiles] ${manifest.components.length} components · ${manifest.patterns.length} patterns · contract valid`);
