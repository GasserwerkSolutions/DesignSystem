#!/usr/bin/env node
/**
 * Site Smoke + Interaction Check
 * ===============================
 *
 * Verifiziert dass die generierte Doc-Site (dist/site/) ladbar ist und die
 * Axis-Switchers (tone/mode/density) sowie die Sidebar-Search funktionieren.
 *
 * Zwei Phasen:
 *   1) Smoke         — lädt repräsentative Seiten und prüft pageerror,
 *                      requestfailed, Console-Errors, App-Shell-Markup.
 *   2) Interactions  — schaltet tone/mode/density um, prüft data-Attribute,
 *                      tippt in die Sidebar-Search und prüft die Filterung.
 *
 * Voraussetzung: build:site wurde vorher ausgeführt.
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "dist", "site");

const SMOKE_PAGES = [
  "index.html",
  "components/button.html",
  "components/combobox.html",
  "components/alert.html",
  "components/popover.html",
  "components/table.html",
  "foundations.html",
  "themes.html",
  "playground.html",
];

async function runSmoke(browser) {
  let errors = 0;
  for (const rel of SMOKE_PAGES) {
    const abs = path.join(SITE_DIR, rel);
    if (!fs.existsSync(abs)) {
      console.error(`[smoke] MISSING: ${rel}`);
      errors++;
      continue;
    }
    const page = await browser.newPage();
    const issues = [];
    page.on("pageerror", (e) => issues.push(`pageerror: ${e.message}`));
    page.on("requestfailed", (req) => {
      if (req.url().startsWith("file://"))
        issues.push(`404: ${req.url().split("/dist/site/").pop()}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error")
        issues.push(`console.error: ${msg.text()}`);
    });
    await page.goto("file://" + abs, { waitUntil: "load" });
    await new Promise((r) => setTimeout(r, 200));
    const hasShell = await page.$(".app-shell");
    const hasMain = await page.$(".app-shell__main");
    if (!hasShell || !hasMain) issues.push("missing .app-shell / __main");
    const status = issues.length === 0 ? "ok" : "FAIL";
    console.log(`  [${status}] ${rel}  errs=${issues.length}`);
    for (const e of issues) console.log("        " + e);
    errors += issues.length;
    await page.close();
  }
  return errors;
}

async function runInteractions(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(
    "file://" + path.join(SITE_DIR, "components/alert.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));

  const probe = () =>
    page.evaluate(() => ({
      tone: document.documentElement.getAttribute("data-tone"),
      mode: document.documentElement.getAttribute("data-mode"),
      density: document.documentElement.getAttribute("data-density"),
    }));

  await page.select('[data-axis="tone"]', "premium");
  await new Promise((r) => setTimeout(r, 50));
  const t = await probe();

  await page.evaluate(() =>
    document.querySelector('[data-axis="mode"]').click()
  );
  await new Promise((r) => setTimeout(r, 50));
  const m = await probe();

  await page.select('[data-axis="density"]', "compact");
  await new Promise((r) => setTimeout(r, 50));
  const d = await probe();

  await page.evaluate(() => {
    const s = document.querySelector("[data-sidebar-search]");
    s.value = "combobox";
    s.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 50));
  const filtered = await page.evaluate(() =>
    [...document.querySelectorAll(".site-sidebar__link")]
      .filter((a) => a.style.display !== "none")
      .map((a) => a.textContent.trim())
  );

  await page.close();

  const checks = [
    ["tone-switch → premium", t.tone === "premium"],
    ["mode-toggle → dark", m.mode === "dark"],
    ["density-switch → compact", d.density === "compact"],
    [
      "sidebar-search → only combobox-matches visible",
      filtered.length > 0 &&
        filtered.every((s) => s.toLowerCase().includes("combobox")),
    ],
  ];
  let errors = 0;
  for (const [label, ok] of checks) {
    console.log(`  [${ok ? "ok" : "FAIL"}] ${label}`);
    if (!ok) errors++;
  }
  return errors;
}

async function runFoundationsEdit(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(
    "file://" + path.join(SITE_DIR, "foundations.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));

  const radiusBefore = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--radius-12").trim()
  );

  await page.evaluate(() => {
    const btn = document.querySelector('[data-edit-token="--radius-12"]');
    btn.click();
  });
  await new Promise((r) => setTimeout(r, 50));
  await page.evaluate(() => {
    const input = document.querySelector(".foundation-token__edit-input");
    input.value = "2rem";
    input.dispatchEvent(new Event("blur"));
  });
  await new Promise((r) => setTimeout(r, 50));

  const radiusAfter = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--radius-12").trim()
  );

  const edited = await page.evaluate(() =>
    !!document.querySelector('[data-token-name="--radius-12"].foundation-token--edited')
  );

  await page.evaluate(() => {
    document.querySelector("[data-foundation-reset]").click();
  });
  await new Promise((r) => setTimeout(r, 50));

  const radiusReset = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--radius-12").trim()
  );

  await page.close();

  const checks = [
    ["foundations: token-edit changed --radius-12", radiusBefore !== radiusAfter],
    ["foundations: edited-marker applied", edited === true],
    ["foundations: reset restored original value", radiusReset === radiusBefore],
  ];
  let errors = 0;
  for (const [label, ok] of checks) {
    console.log(`  [${ok ? "ok" : "FAIL"}] ${label}`);
    if (!ok) errors++;
  }
  return errors;
}

(async () => {
  if (!fs.existsSync(SITE_DIR)) {
    console.error(`[check-site] dist/site missing. Run 'npm run build:site' first.`);
    process.exit(1);
  }
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  console.log("[check-site] Smoke:");
  const smokeErrs = await runSmoke(browser);
  console.log("[check-site] Interactions:");
  const interactionErrs = await runInteractions(browser);
  console.log("[check-site] Foundations live-edit:");
  const foundationErrs = await runFoundationsEdit(browser);
  await browser.close();
  const total = smokeErrs + interactionErrs + foundationErrs;
  console.log(
    total === 0
      ? "[check-site] passed."
      : `[check-site] ${total} issues.`
  );
  process.exit(total === 0 ? 0 : 1);
})();
