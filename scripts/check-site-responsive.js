#!/usr/bin/env node
/**
 * Rendered Site Responsive Check
 * ==============================
 *
 * Browser-level guard for the generated documentation site. It verifies that
 * representative pages load their DS CSS, keep dark-mode tokens active, and do
 * not create horizontal overflow at mobile/tablet/desktop widths.
 */

const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "dist", "site");

const PAGES = [
  "index.html",
  "components/button.html",
  "components/combobox.html",
  "components/popover.html",
  "components/table.html",
  "foundations.html",
  "themes.html",
  "recipes.html",
];

const VIEWPORTS = [
  { label: "mobile", width: 360, height: 800 },
  { label: "tablet", width: 768, height: 900 },
  { label: "desktop", width: 1280, height: 900 },
  { label: "wide", width: 1440, height: 1000 },
];

async function checkPage(browser, rel, viewport) {
  const file = path.join(SITE_DIR, rel);
  const page = await browser.newPage();
  const issues = [];

  await page.setViewport({ width: viewport.width, height: viewport.height });
  page.on("pageerror", (e) => issues.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (url.startsWith("file://")) issues.push(`requestfailed: ${url.split("/dist/site/").pop()}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") issues.push(`console.error: ${msg.text()}`);
  });

  await page.goto("file://" + file, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 300));

  const result = await page.evaluate(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const beforeMode = document.documentElement.getAttribute("data-mode");
    document.documentElement.setAttribute("data-mode", "dark");
    const darkBg = getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim();
    document.documentElement.setAttribute("data-mode", beforeMode || "light");

    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientWidth = doc.clientWidth;
    const overflowX = scrollWidth - clientWidth;

    const visibleTopbar = !!document.querySelector(".app-shell__topbar");
    const visibleMain = !!document.querySelector(".app-shell__main");
    const dsLoaded = rootStyle.getPropertyValue("--color-bg").trim() !== "" &&
      bodyStyle.fontFamily.trim() !== "" &&
      !!document.querySelector("link[href*='assets/ds/main.css']");

    return {
      dsLoaded,
      visibleTopbar,
      visibleMain,
      overflowX,
      darkBg,
    };
  });

  if (!result.dsLoaded) issues.push("DS CSS not detected via assets/ds/main.css");
  if (!result.visibleTopbar || !result.visibleMain) issues.push("missing topbar/main app shell");
  if (result.overflowX > 2) issues.push(`horizontal overflow ${result.overflowX}px`);
  if (!result.darkBg) issues.push("dark-mode token did not resolve");

  await page.close();
  return issues;
}

async function main() {
  if (!fs.existsSync(SITE_DIR)) {
    console.error("[check-site-responsive] dist/site fehlt. Erst npm run build:site ausführen.");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let errors = 0;
  try {
    for (const rel of PAGES) {
      const file = path.join(SITE_DIR, rel);
      if (!fs.existsSync(file)) {
        console.error(`  [FAIL] ${rel} missing`);
        errors++;
        continue;
      }

      for (const viewport of VIEWPORTS) {
        const issues = await checkPage(browser, rel, viewport);
        const label = `${rel} @ ${viewport.label} ${viewport.width}px`;
        if (issues.length === 0) {
          console.log(`  [ok]   ${label}`);
        } else {
          console.error(`  [FAIL] ${label}`);
          for (const issue of issues) console.error(`         ${issue}`);
          errors += issues.length;
        }
      }
    }
  } finally {
    await browser.close();
  }

  console.log("");
  if (errors > 0) {
    console.error(`[check-site-responsive] ${errors} issue(s).`);
    process.exit(1);
  }
  console.log("[check-site-responsive] passed.");
}

main().catch((err) => {
  console.error("[check-site-responsive] crashed:", err);
  process.exit(2);
});
