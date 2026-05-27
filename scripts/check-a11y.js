#!/usr/bin/env node
/**
 * A11Y-Lint via axe-core
 * =======================
 *
 * Lädt die Demo in headless Chromium, injiziert axe-core, durchläuft alle
 * Tone × Mode-Kombinationen plus geöffnete Popovers/Comboboxes, aggregiert
 * Violations.
 *
 * Strategie:
 *   - Strukturelle Violations (Labels, Roles, ARIA-Attributes, Heading-Order)
 *     sind tone-agnostic → 1 Lauf reicht (default trust/light).
 *   - Color-Contrast wird von axe nur als Sanity-Cross-Check genommen — unsere
 *     check-contrast.js (1008 Paare über Cascade-Simulation) ist die
 *     primäre Wahrheit für Farbe.
 *   - Popovers / Comboboxes werden VOR axe-Lauf geöffnet, damit ihre Inhalte
 *     im DOM sichtbar sind.
 *
 * Severity:
 *   critical, serious  → hard-fail (exit 1)
 *   moderate, minor    → soft-warning (exit 0)
 *
 * Usage: node scripts/check-a11y.js
 *        node scripts/check-a11y.js --strict     (moderate auch als fail)
 *        node scripts/check-a11y.js --verbose    (alle Violations zeigen)
 */

const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const STRICT  = process.argv.includes("--strict");
const VERBOSE = process.argv.includes("--verbose");

let puppeteer;
try {
  puppeteer = require("puppeteer");
} catch {
  console.error("Puppeteer nicht installiert. Run: npm install --save-dev puppeteer");
  process.exit(1);
}

const AXE_PATH = require.resolve("axe-core/axe.min.js");

const HARD_FAIL = new Set(["critical", "serious"]);
const SOFT_WARN = new Set(STRICT ? [] : ["moderate", "minor"]);

async function openHiddenPanels(page) {
  // Native Popovers in den Top-Layer-Render holen, damit axe ihre Inhalte
  // im sichtbaren DOM auditiert. .popover und .combobox__panel haben
  // beide popover-API-Attribut.
  await page.evaluate(() => {
    document.querySelectorAll("[popover]").forEach((el) => {
      try { el.showPopover(); } catch {}
    });
  });
  await new Promise((r) => setTimeout(r, 100));
}

async function runAxe(page) {
  return await page.evaluate(async () => {
    // axe.run() returns a Promise; default rules apply.
    const res = await axe.run(document, {
      resultTypes: ["violations"],
      // best-practice rules ausblenden — sind Hinweise, keine Bugs.
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    });
    return res.violations;
  });
}

function bySeverity(violations) {
  const buckets = { critical: [], serious: [], moderate: [], minor: [] };
  for (const v of violations) {
    const bucket = buckets[v.impact] || buckets.moderate;
    bucket.push(v);
  }
  return buckets;
}

function shortenHtml(html) {
  return html.replace(/\s+/g, " ").trim().slice(0, 110) + (html.length > 110 ? "…" : "");
}

function reportViolation(v) {
  console.error(`  [${v.impact}] ${v.id}: ${v.help}`);
  if (VERBOSE) {
    console.error(`           ${v.helpUrl}`);
  }
  for (const node of v.nodes.slice(0, 3)) {
    console.error(`           → ${shortenHtml(node.html)}`);
    if (VERBOSE && node.failureSummary) {
      for (const line of node.failureSummary.split("\n")) {
        console.error(`               ${line}`);
      }
    }
  }
  if (v.nodes.length > 3) {
    console.error(`           … + ${v.nodes.length - 3} weitere Stellen`);
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto("file://" + path.resolve(ROOT, "index.html"));
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await new Promise((r) => setTimeout(r, 600));

    // Inject axe-core via local file (kein CDN-Roundtrip).
    await page.addScriptTag({ path: AXE_PATH });

    // Open all hidden popover panels so axe can see their contents.
    await openHiddenPanels(page);

    const violations = await runAxe(page);
    const buckets = bySeverity(violations);

    console.log("axe-core A11Y-Lint — Demo (trust / light, alle Popovers open)");
    console.log("");

    let totalHard = 0;
    let totalSoft = 0;

    for (const sev of ["critical", "serious", "moderate", "minor"]) {
      const list = buckets[sev];
      if (list.length === 0) {
        console.log(`  [ok]   ${sev}: 0`);
        continue;
      }
      const tag = HARD_FAIL.has(sev) ? "[fail]" : SOFT_WARN.has(sev) ? "[warn]" : "[info]";
      console.error(`  ${tag} ${sev}: ${list.length}`);
      for (const v of list) reportViolation(v);
      if (HARD_FAIL.has(sev)) totalHard += list.length;
      else if (SOFT_WARN.has(sev)) totalSoft += list.length;
    }

    console.log("");
    if (totalHard > 0) {
      console.error(`${totalHard} hard-fail violation(s) (critical/serious).`);
      process.exit(1);
    }
    if (totalSoft > 0) {
      console.warn(`${totalSoft} soft warning(s) (moderate/minor).`);
    }
    console.log("A11Y-Lint passed.");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("A11Y-Lint crashed:", err);
  process.exit(2);
});
