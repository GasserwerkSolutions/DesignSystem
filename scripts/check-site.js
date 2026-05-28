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

  /* 200ms statt 50ms — view-transitions defer den DOM-Update durch
     einen Frame, sonst probe vor dem Attribute-Set. */
  await page.select('[data-axis="tone"]', "premium");
  await new Promise((r) => setTimeout(r, 200));
  const t = await probe();

  await page.evaluate(() =>
    document.querySelector('[data-axis="mode"]').click()
  );
  await new Promise((r) => setTimeout(r, 200));
  const m = await probe();

  await page.select('[data-axis="density"]', "compact");
  await new Promise((r) => setTimeout(r, 200));
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

async function runExampleEditor(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  /* Alert hat ein einfaches Beispiel — guter Kandidat zum Editieren. */
  await page.goto(
    "file://" + path.join(SITE_DIR, "components/alert.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));

  /* Edit-Toggle aufklappen */
  await page.evaluate(() => {
    document.querySelector("[data-edit-toggle]").click();
  });
  await new Promise((r) => setTimeout(r, 50));
  const sourceVisible = await page.evaluate(() => {
    const src = document.querySelector("[data-source]").parentElement;
    return !src.hasAttribute("hidden");
  });

  /* Edit den Markup: ändere den Alert-Titel */
  await page.evaluate(() => {
    const ta = document.querySelector("[data-source]");
    ta.value = ta.value.replace("Buchung gespeichert", "Geändert via Editor");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 100));
  const previewChanged = await page.evaluate(() => {
    return document.querySelector("[data-preview]").textContent.includes("Geändert via Editor");
  });
  const resetVisible = await page.evaluate(() => {
    return !document.querySelector("[data-reset]").hidden;
  });

  /* Reset zurück */
  await page.evaluate(() => {
    document.querySelector("[data-reset]").click();
  });
  await new Promise((r) => setTimeout(r, 50));
  const previewReverted = await page.evaluate(() => {
    return document.querySelector("[data-preview]").textContent.includes("Buchung gespeichert");
  });

  /* Tone-Jump aus dem Strip */
  await page.evaluate(() => {
    const tile = document.querySelector('[data-tone-jump="premium"]');
    tile.click();
  });
  await new Promise((r) => setTimeout(r, 50));
  const toneAfterJump = await page.evaluate(() =>
    document.documentElement.getAttribute("data-tone")
  );

  await page.close();

  const checks = [
    ["editor: edit-toggle reveals source-textarea", sourceVisible === true],
    ["editor: textarea input re-renders preview", previewChanged === true],
    ["editor: reset button visible after edit", resetVisible === true],
    ["editor: reset restores original markup", previewReverted === true],
    ["tone-strip: click tile switches root data-tone", toneAfterJump === "premium"],
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

async function runRtlSupport(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(
    "file://" + path.join(SITE_DIR, "components/alert.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));

  /* Setze dir="rtl" auf html, vergleich Layout vs LTR. RTL-Sicherheit:
     - List-Bullets müssen auf der RECHTEN Seite sein (logical: inline-start
       = rechts in RTL)
     - Avatar-Stack: erstes Avatar rechts, letztes links (margin-inline-start
       umkehrt sich)
     - Alert-Icon links (LTR) wird zu rechts (RTL) */
  const ltrLayout = await page.evaluate(() => {
    const alert = document.querySelector(".alert");
    if (!alert) return null;
    const icon = alert.querySelector(".alert__icon");
    const body = alert.querySelector(".alert__body");
    if (!icon || !body) return null;
    const iconRect = icon.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    return { iconLeft: iconRect.left, bodyLeft: bodyRect.left };
  });

  await page.evaluate(() => {
    document.documentElement.setAttribute("dir", "rtl");
  });
  await new Promise((r) => setTimeout(r, 200));

  const rtlLayout = await page.evaluate(() => {
    const alert = document.querySelector(".alert");
    const icon = alert.querySelector(".alert__icon");
    const body = alert.querySelector(".alert__body");
    const iconRect = icon.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    return { iconLeft: iconRect.left, bodyLeft: bodyRect.left };
  });

  await page.close();

  const checks = [
    /* In RTL muss der Icon RECHTS vom Body stehen (iconLeft > bodyLeft).
       In LTR muss der Icon LINKS vom Body stehen (iconLeft < bodyLeft). */
    ["rtl-support: LTR alert__icon ist links von alert__body", ltrLayout?.iconLeft < ltrLayout?.bodyLeft],
    ["rtl-support: RTL alert__icon ist rechts von alert__body (Logical-Properties wirken)", rtlLayout.iconLeft > rtlLayout.bodyLeft],
  ];
  let errors = 0;
  for (const [label, ok] of checks) {
    console.log(`  [${ok ? "ok" : "FAIL"}] ${label}`);
    if (!ok) errors++;
  }
  return errors;
}

async function runHeaderNav(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(
    "file://" + path.join(SITE_DIR, "components/alert.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));

  /* Favicon-Link existiert + Datei vorhanden */
  const hasFavicon = await page.evaluate(() => {
    const link = document.querySelector('link[rel="icon"]');
    return link?.getAttribute("href") || null;
  });

  /* Mega-Menu click opens panel */
  await page.evaluate(() => {
    document.querySelector("[data-mega-trigger]").click();
  });
  await new Promise((r) => setTimeout(r, 100));
  const megaOpen = await page.evaluate(() => {
    const panel = document.querySelector("[data-mega-panel]");
    const cs = getComputedStyle(panel);
    return {
      ariaExpanded: document.querySelector("[data-mega-trigger]").getAttribute("aria-expanded"),
      dataOpen: panel.getAttribute("data-open"),
      visible: cs.display !== "none",
      links: panel.querySelectorAll(".site-topbar__mega-link").length,
    };
  });

  /* Escape schließt */
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 50));
  const megaClosedAfterEsc = await page.evaluate(() => {
    return document.querySelector("[data-mega]").getAttribute("data-open");
  });

  await page.close();

  /* Mobile-Menu prüfen — Viewport schmal machen */
  const m = await browser.newPage();
  await m.setViewport({ width: 480, height: 800 });
  await m.goto(
    "file://" + path.join(SITE_DIR, "components/alert.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));
  const burgerVisible = await m.evaluate(() => {
    return getComputedStyle(document.querySelector("[data-mobile-menu]")).display !== "none";
  });
  await m.evaluate(() => {
    document.querySelector("[data-mobile-menu]").click();
  });
  await new Promise((r) => setTimeout(r, 100));
  const mobileNavOpen = await m.evaluate(() => {
    return document.getElementById("site-topbar-nav").getAttribute("data-mobile-open");
  });
  await m.close();

  const checks = [
    ["favicon: link rel=icon im head + assets/favicon.svg referenziert", hasFavicon && hasFavicon.endsWith("favicon.svg")],
    ["mega-menu: click öffnet Panel (data-open=true, aria-expanded=true)", megaOpen.ariaExpanded === "true" && megaOpen.dataOpen === "true" && megaOpen.visible],
    ["mega-menu: enthält Component-Links (>= 40)", megaOpen.links >= 40],
    ["mega-menu: Escape schließt", megaClosedAfterEsc === "false"],
    ["mobile: burger-toggle wird bei < 768px Viewport sichtbar", burgerVisible === true],
    ["mobile: burger-click öffnet Nav (data-mobile-open=true)", mobileNavOpen === "true"],
  ];
  let errors = 0;
  for (const [label, ok] of checks) {
    console.log(`  [${ok ? "ok" : "FAIL"}] ${label}`);
    if (!ok) errors++;
  }
  return errors;
}

async function runModifierPreviews(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  /* Avatar-Stack: --sm und --lg müssen DIFFERENT avatar.width produzieren.
     Das war das ursprüngliche User-Report-Symptom — Größen-Modifier "nicht
     funktional" weil keine Demo. */
  await page.goto(
    "file://" + path.join(SITE_DIR, "components/avatar-stack.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));
  const stackSizes = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll(".site-modifier-tile").forEach((t) => {
      const label = t.querySelector("code")?.textContent;
      const av = t.querySelector(".avatar");
      out[label] = av ? getComputedStyle(av).width : null;
    });
    return out;
  });

  /* Alert: --info / --success / --warning / --danger müssen unterschiedliche
     background-colors haben. */
  await page.goto(
    "file://" + path.join(SITE_DIR, "components/alert.html"),
    { waitUntil: "load" }
  );
  await new Promise((r) => setTimeout(r, 300));
  const alertBgs = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll(".site-modifier-tile").forEach((t) => {
      const label = t.querySelector("code")?.textContent;
      const el = t.querySelector(".alert");
      out[label] = el ? getComputedStyle(el).backgroundColor : null;
    });
    return out;
  });

  await page.close();

  const sizeDifferent = stackSizes[".avatar-stack--sm"] && stackSizes[".avatar-stack--lg"] &&
    stackSizes[".avatar-stack--sm"] !== stackSizes[".avatar-stack--lg"];
  const alertVariantsCovered =
    alertBgs[".alert--info"] && alertBgs[".alert--success"] &&
    alertBgs[".alert--warning"] && alertBgs[".alert--danger"] &&
    new Set(Object.values(alertBgs)).size === 4;

  const checks = [
    ["modifier-preview: avatar-stack--sm vs --lg produzieren verschiedene Avatar-Sizes", sizeDifferent],
    ["modifier-preview: avatar-stack expandiert --sm/--lg/--hoverable korrekt", Object.keys(stackSizes).length >= 3],
    ["modifier-preview: alert expandiert --info/--success/--warning/--danger (4 verschiedene bgs)", alertVariantsCovered],
  ];
  let errors = 0;
  for (const [label, ok] of checks) {
    console.log(`  [${ok ? "ok" : "FAIL"}] ${label}`);
    if (!ok) {
      console.log(`        stackSizes:`, JSON.stringify(stackSizes));
      console.log(`        alertBgs:`, JSON.stringify(alertBgs));
      errors++;
    }
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
  /* 500ms — view-transition deferre + persist()-rAF kombiniert kann 2-3
     Frames brauchen bis location.search aktualisiert ist. */
  await new Promise((r) => setTimeout(r, 500));
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
  console.log("[check-site] Example-Editor + Tone-Strip:");
  const editorErrs = await runExampleEditor(browser);
  console.log("[check-site] Container-Queries:");
  const cqErrs = await runContainerQueries(browser);
  console.log("[check-site] URL-State:");
  const urlStateErrs = await runUrlState(browser);
  console.log("[check-site] Header-Nav (Mega-Menu + Mobile):");
  const headerErrs = await runHeaderNav(browser);
  console.log("[check-site] Modifier-Previews:");
  const modErrs = await runModifierPreviews(browser);
  console.log("[check-site] RTL-Support:");
  const rtlErrs = await runRtlSupport(browser);
  await browser.close();
  const total = parserErrs + smokeErrs + interactionErrs + foundationErrs + themeGenErrs + editorErrs + cqErrs + urlStateErrs + headerErrs + modErrs + rtlErrs;
  console.log(
    total === 0
      ? "[check-site] passed."
      : `[check-site] ${total} issues.`
  );
  process.exit(total === 0 ? 0 : 1);
})();
