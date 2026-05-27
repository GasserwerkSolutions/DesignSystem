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

/* =========================================================================
   Parser Self-Test
   =========================================================================
   Sensitivity-Suite für den Header-Parser. Jeder Fall war mal ein echter
   stiller Bug — die Mutation isoliert das Pattern, der Self-Test verhindert
   Regressionen, ohne dass eine echte Component für jede Edge-Case existieren
   muss. Verwendet den ECHTEN parseHeader aus build-site.js — kein
   duplicate-drift möglich. */
function runParserSelfTest() {
  const { parseHeaderFromString } = require("./build-site.js");

  const tests = [
    {
      label: "single-line label: Required: --foo, --bar (inline tokens)",
      source: `/**
 * Test
 * ====
 *
 * CONTRACT:
 *   Required: --foo, --bar
 */`,
      expect: (r) => r.contract.required.map((t) => t.name).join(",") === "--foo,--bar",
    },
    {
      label: "single-line label: Optional: --baz (one inline token)",
      source: `/**
 * Test
 * ====
 *
 * CONTRACT:
 *   Optional: --baz
 */`,
      expect: (r) => r.contract.optional.length === 1 && r.contract.optional[0].name === "--baz",
    },
    {
      label: "bare tokens under CONTRACT without Required:/Optional:",
      source: `/**
 * Test
 * ====
 *
 * CONTRACT:
 *   --foo   description here
 *   --bar
 */`,
      expect: (r) => r.contract.optional.map((t) => t.name).join(",") === "--foo,--bar",
    },
    {
      label: "multi-line label: 'Struktur (parenthetical):' parsing",
      source: `/**
 * Test
 * ====
 *
 * CONTRACT:
 *   Required: --foo
 *
 * Struktur (mit ausführlichem Kommentar
 * über mehrere Zeilen):
 *   <div class="test">x</div>
 */`,
      expect: (r) => r.contract.required[0]?.name === "--foo",
    },
    {
      label: "intro-prose starting with label-word is NOT a label",
      source: `/**
 * Test
 * ====
 *
 * Markup nutzt native <input type="checkbox"> via appearance:none
 * und behält Form-Integration.
 *
 * CONTRACT:
 *   Required: --foo
 */`,
      expect: (r) => r.contract.required[0]?.name === "--foo",
    },
    {
      label: "CONTRACT with em-dash and description on label line",
      source: `/**
 * Test
 * ====
 *
 * CONTRACT — Token-Werte, die ein Theme setzen darf:
 *
 * Required:
 *   --foo, --bar
 */`,
      expect: (r) => r.contract.required.map((t) => t.name).sort().join(",") === "--bar,--foo",
    },
  ];

  let errors = 0;
  for (const t of tests) {
    const result = parseHeaderFromString(t.source);
    const ok = t.expect(result);
    console.log(`  [${ok ? "ok" : "FAIL"}] ${t.label}`);
    if (!ok) {
      console.log(`        got contract:`, JSON.stringify(result.contract));
      errors++;
    }
  }
  return errors;
}

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

async function runContainerQueries(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(
    "file://" + path.join(SITE_DIR, "foundations.html#cq-demo"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 400));

  /* Setze die Container-Wrapper deterministisch breit, prüfe dass card--split
     horizontal ist und list-row__meta sichtbar — dann auf schmal, prüfe das
     Gegenteil. */
  await page.evaluate(() => {
    const handles = document.querySelectorAll(".foundation-cq-handle");
    handles.forEach((h) => (h.style.width = "700px"));
  });
  await new Promise((r) => setTimeout(r, 100));
  const wide = await page.evaluate(() => {
    const splitCard = document.querySelector(".card--split");
    const splitCols = getComputedStyle(splitCard).gridTemplateColumns.split(" ").length;
    const meta = document.querySelector(".list-row__meta");
    const metaVisible = getComputedStyle(meta).display !== "none";
    return { splitCols, metaVisible };
  });

  await page.evaluate(() => {
    const handles = document.querySelectorAll(".foundation-cq-handle");
    handles.forEach((h) => (h.style.width = "320px"));
  });
  await new Promise((r) => setTimeout(r, 100));
  const narrow = await page.evaluate(() => {
    const splitCard = document.querySelector(".card--split");
    const splitCols = getComputedStyle(splitCard).gridTemplateColumns.split(" ").length;
    const meta = document.querySelector(".list-row__meta");
    const metaVisible = getComputedStyle(meta).display !== "none";
    return { splitCols, metaVisible };
  });

  await page.close();

  const checks = [
    ["container-queries: card--split is 2-col at ≥600px container", wide.splitCols === 2],
    ["container-queries: card--split is 1-col at <600px container", narrow.splitCols === 1],
    ["container-queries: list-row__meta visible at ≥480px container", wide.metaVisible === true],
    ["container-queries: list-row__meta hidden at <480px container", narrow.metaVisible === false],
  ];
  let errors = 0;
  for (const [label, ok] of checks) {
    console.log(`  [${ok ? "ok" : "FAIL"}] ${label}`);
    if (!ok) errors++;
  }
  return errors;
}

async function runUrlState(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(
    "file://" +
      path.join(SITE_DIR, "components/alert.html") +
      "?tone=premium&mode=dark&density=compact",
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));
  const stateFromUrl = await page.evaluate(() => ({
    tone: document.documentElement.getAttribute("data-tone"),
    mode: document.documentElement.getAttribute("data-mode"),
    density: document.documentElement.getAttribute("data-density"),
  }));

  await page.goto(
    "file://" + path.join(SITE_DIR, "foundations.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));
  await page.select('[data-axis="tone"]', "playful");
  await new Promise((r) => setTimeout(r, 100));
  const urlAfterToneChange = await page.evaluate(() => location.search);

  await page.evaluate(() => {
    const btn = document.querySelector('[data-edit-token="--radius-12"]');
    btn.click();
  });
  await new Promise((r) => setTimeout(r, 50));
  await page.evaluate(() => {
    const input = document.querySelector(".foundation-token__edit-input");
    input.value = "3rem";
    input.dispatchEvent(new Event("blur"));
  });
  await new Promise((r) => setTimeout(r, 100));
  const urlAfterEdit = await page.evaluate(() => location.search);

  await page.goto(
    "file://" +
      path.join(SITE_DIR, "themes.html") +
      "?hex=%23ef4444&name=fire",
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 400));
  const themeGenFromUrl = await page.evaluate(() => ({
    hex: document.querySelector("[data-theme-gen-hex]").value,
    name: document.querySelector("[data-theme-gen-name]").value,
    cssHasFire: document
      .querySelector("[data-theme-gen-css]")
      .textContent.includes('[data-tone~="fire"]'),
  }));

  await page.close();

  const checks = [
    [
      "url-state: axis from query params on load",
      stateFromUrl.tone === "premium" &&
        stateFromUrl.mode === "dark" &&
        stateFromUrl.density === "compact",
    ],
    [
      "url-state: tone change writes ?tone=playful",
      urlAfterToneChange.includes("tone=playful"),
    ],
    [
      "url-state: token edit writes ?t.--radius-12=...",
      urlAfterEdit.includes("t.--radius-12=3rem"),
    ],
    [
      "url-state: theme-gen reads hex+name from URL",
      themeGenFromUrl.hex === "#ef4444" &&
        themeGenFromUrl.name === "fire" &&
        themeGenFromUrl.cssHasFire,
    ],
  ];
  let errors = 0;
  for (const [label, ok] of checks) {
    console.log(`  [${ok ? "ok" : "FAIL"}] ${label}`);
    if (!ok) errors++;
  }
  return errors;
}

async function runThemeGenerator(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(
    "file://" + path.join(SITE_DIR, "themes.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 500));

  const initialPalette = await page.evaluate(() =>
    [...document.querySelectorAll(".theme-gen__swatch code")].map((c) => c.textContent)
  );
  const initialCss = await page.evaluate(() =>
    document.querySelector("[data-theme-gen-css]").textContent
  );

  await page.evaluate(() => {
    const hex = document.querySelector("[data-theme-gen-hex]");
    hex.value = "#dc2626";
    hex.dispatchEvent(new Event("input", { bubbles: true }));
    const name = document.querySelector("[data-theme-gen-name]");
    name.value = "fire";
    name.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 200));

  const newPalette = await page.evaluate(() =>
    [...document.querySelectorAll(".theme-gen__swatch code")].map((c) => c.textContent)
  );
  const newCss = await page.evaluate(() =>
    document.querySelector("[data-theme-gen-css]").textContent
  );
  const previewBtnBg = await page.evaluate(() => {
    const btn = document.querySelector(".theme-gen__preview .btn");
    /* --btn-bg custom property is robust gegen hover-state — backgroundColor
       würde die :hover-Variante einfangen wenn der Puppeteer-Cursor über
       dem Button steht. */
    return getComputedStyle(btn).getPropertyValue("--btn-bg").trim().toLowerCase();
  });

  await page.close();

  const checks = [
    ["theme-gen: initial palette has 11 steps", initialPalette.length === 11],
    [
      "theme-gen: palette updates on hex change",
      newPalette.length === 11 &&
        newPalette.join() !== initialPalette.join() &&
        newPalette.every((h) => /^#[0-9a-f]{6}$/i.test(h)),
    ],
    [
      "theme-gen: CSS export updates with new name",
      newCss.includes("--fire-500") && newCss.includes('[data-tone~="fire"]'),
    ],
    [
      "theme-gen: live preview --btn-bg reflects new tone palette",
      /^#[0-9a-f]{6}$/.test(previewBtnBg) && newCss.includes(previewBtnBg),
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
  console.log("[check-site] Parser self-test:");
  const parserErrs = runParserSelfTest();
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  console.log("[check-site] Smoke:");
  const smokeErrs = await runSmoke(browser);
  console.log("[check-site] Interactions:");
  const interactionErrs = await runInteractions(browser);
  console.log("[check-site] Foundations live-edit:");
  const foundationErrs = await runFoundationsEdit(browser);
  console.log("[check-site] Theme-Generator:");
  const themeGenErrs = await runThemeGenerator(browser);
  console.log("[check-site] Container-Queries:");
  const cqErrs = await runContainerQueries(browser);
  console.log("[check-site] URL-State:");
  const urlStateErrs = await runUrlState(browser);
  await browser.close();
  const total = parserErrs + smokeErrs + interactionErrs + foundationErrs + themeGenErrs + cqErrs + urlStateErrs;
  console.log(
    total === 0
      ? "[check-site] passed."
      : `[check-site] ${total} issues.`
  );
  process.exit(total === 0 ? 0 : 1);
})();
