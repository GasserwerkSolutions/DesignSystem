#!/usr/bin/env node
/**
 * Project Pack Manifest Check
 * ===========================
 *
 * manifest/project-pack.json beschreibt für jedes Pattern des Projektseiten-
 * Packs die Slots und Inhaltsgrenzen (wie viele Bilder, wie lange Texte).
 * Ein CMS oder Agent wählt damit Varianten, ohne das CSS zu lesen.
 *
 * Dieser Check hält Manifest und Wirklichkeit zusammen:
 *   1. Manifest ⇄ patterns/project.css: jedes Modul ist beschrieben, jedes
 *      beschriebene Modul wird importiert.
 *   2. Jede Regel und Textgrenze wird gegen alle Beispielseiten geprüft, die
 *      das Pack laden. Ein Beispiel, das die eigenen Grenzen verletzt, oder
 *      eine Regel, die nirgends greift, schlägt fehl.
 *
 * Usage: node scripts/check-project-pack.js
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "manifest", "project-pack.json");
const EXAMPLES = path.join(ROOT, "examples");

let puppeteer;
try { puppeteer = require("puppeteer"); }
catch { console.error("Puppeteer fehlt. Run: npm install --save-dev puppeteer"); process.exit(2); }

/** Läuft im Browser: wertet Regeln und Textgrenzen am DOM aus. */
function evaluateInPage({ rules, textLimits }) {
  const issues = [];
  const hits = [];
  for (const rule of rules) {
    const roots = [...document.querySelectorAll(rule.selector)];
    if (roots.length > 0) hits.push(rule.id);
    for (const root of roots) {
      const n = root.querySelectorAll(rule.count).length;
      const where = `${rule.id}: ${rule.count} = ${n}`;
      if (rule.min !== undefined && n < rule.min) issues.push(`${where}, mindestens ${rule.min}`);
      if (rule.max !== undefined && n > rule.max) issues.push(`${where}, höchstens ${rule.max}`);
      if (rule.modulo && n % rule.modulo[0] !== rule.modulo[1]) {
        issues.push(`${where}, erwartet ${rule.modulo[0]}n + ${rule.modulo[1]}`);
      }
      if (rule.equals) {
        const m = root.querySelectorAll(rule.equals).length;
        if (m !== n) issues.push(`${where}, aber ${rule.equals} = ${m}`);
      }
    }
  }
  for (const limit of textLimits) {
    for (const el of document.querySelectorAll(limit.selector)) {
      const text = el.textContent.trim().replace(/\s+/g, " ");
      if (text.length > limit.maxChars) {
        issues.push(`Text zu lang (${text.length} > ${limit.maxChars}) in ${limit.selector}: «${text.slice(0, 40)}…»`);
      }
    }
  }
  return { issues, hits };
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  let errors = 0;
  console.log("Project Pack Manifest Check\n");

  // 1. Manifest ⇄ Pack
  const pack = fs.readFileSync(path.join(ROOT, manifest.entry), "utf8");
  const imported = [...pack.matchAll(/@import\s+"\.\/([^"]+\.css)"/g)].map((m) => `patterns/${m[1]}`);
  const described = manifest.patterns.map((p) => p.css);
  for (const css of imported) {
    if (!described.includes(css)) { console.error(`  [FAIL] ${css} fehlt im Manifest`); errors++; }
  }
  for (const css of described) {
    if (!imported.includes(css)) { console.error(`  [FAIL] ${css} steht im Manifest, wird aber nicht importiert`); errors++; }
    if (!fs.existsSync(path.join(ROOT, css))) { console.error(`  [FAIL] ${css} existiert nicht`); errors++; }
  }
  const ids = manifest.patterns.flatMap((p) => p.rules.map((r) => r.id));
  const duplicate = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicate.length) { console.error(`  [FAIL] doppelte Regel-ids: ${duplicate.join(", ")}`); errors++; }
  if (!errors) console.log(`  [ok]   Manifest beschreibt alle ${imported.length} Module des Packs`);

  // 2. Regeln gegen die Beispielseiten
  const rules = manifest.patterns.flatMap((p) => p.rules);
  const files = fs.readdirSync(EXAMPLES)
    .filter((f) => f.endsWith(".html"))
    .filter((f) => fs.readFileSync(path.join(EXAMPLES, f), "utf8").includes("patterns/project.css"))
    .sort();
  if (files.length === 0) { console.error("  [FAIL] keine Beispielseite lädt das Pack"); errors++; }

  const exercised = new Set();
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    for (const name of files) {
      const page = await browser.newPage();
      await page.goto(`file://${path.join(EXAMPLES, name)}`, { waitUntil: "load" });
      const { issues, hits } = await page.evaluate(evaluateInPage, { rules, textLimits: manifest.textLimits || [] });
      await page.close();
      hits.forEach((id) => exercised.add(id));
      if (issues.length === 0) console.log(`  [ok]   ${name}`);
      else {
        console.error(`  [FAIL] ${name}`);
        for (const issue of issues) console.error(`         ${issue}`);
        errors += issues.length;
      }
    }
  } finally {
    await browser.close();
  }

  const unexercised = ids.filter((id) => !exercised.has(id));
  if (unexercised.length) {
    console.error(`  [FAIL] Regeln ohne Beispiel (nie geprüft): ${unexercised.join(", ")}`);
    errors += unexercised.length;
  } else {
    console.log(`  [ok]   alle ${ids.length} Regeln greifen in mindestens einem Beispiel`);
  }

  console.log("");
  if (errors) { console.error(`[check-project-pack] ${errors} Fehler.`); process.exit(1); }
  console.log("[check-project-pack] passed.");
}

main().catch((err) => { console.error(err); process.exit(2); });
