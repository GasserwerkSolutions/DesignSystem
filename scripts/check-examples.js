#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const EXAMPLES = path.join(ROOT, "examples");
const VIEWPORTS = [320, 360, 390, 768, 1280];

async function inspect(browser, file, width) {
  const page = await browser.newPage();
  const issues = [];
  await page.setViewport({ width, height: 900 });
  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => {
    if (request.url().startsWith("file:")) issues.push(`requestfailed: ${request.url()}`);
  });
  await page.goto(`file://${file}`, { waitUntil: "load" });
  await new Promise((resolve) => setTimeout(resolve, 120));
  const layout = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth;
    const clipped = [...document.querySelectorAll("a,button,input,select,textarea,img,svg")]
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.left < -2 || rect.right > innerWidth + 2);
      })
      .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}.${String(element.className || "").split(/\s+/).filter(Boolean).slice(0, 2).join(".")}`)
      .slice(0, 8);
    return { overflow, clipped };
  });
  if (layout.overflow > 2) issues.push(`document overflow ${layout.overflow}px`);
  if (layout.clipped.length) issues.push(`clipped interactive/media: ${layout.clipped.join(", ")}`);
  await page.close();
  return issues;
}

async function main() {
  const files = fs.readdirSync(EXAMPLES).filter((file) => file.endsWith(".html")).sort();
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  let failures = 0;
  try {
    for (const name of files) {
      for (const width of VIEWPORTS) {
        const issues = await inspect(browser, path.join(EXAMPLES, name), width);
        const label = `${name} @ ${width}px`;
        if (!issues.length) console.log(`  [ok]   ${label}`);
        else {
          console.error(`  [FAIL] ${label}`);
          for (const issue of issues) console.error(`         ${issue}`);
          failures += issues.length;
        }
      }
    }
  } finally {
    await browser.close();
  }
  if (failures) {
    console.error(`[check-examples] ${failures} issue(s).`);
    process.exit(1);
  }
  console.log(`[check-examples] ${files.length} examples × ${VIEWPORTS.length} viewports passed.`);
}

main().catch((error) => {
  console.error("[check-examples] crashed:", error);
  process.exit(2);
});
