#!/usr/bin/env node
/**
 * Browser regression: opt-in reading width and heading rhythm must not affect
 * unrelated UI copy; prose must be responsive on mobile.
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const puppeteer = require("puppeteer");

async function measure(page) {
  return page.evaluate(() => {
    const inspect = (id) => {
      const el = document.getElementById(id);
      const css = getComputedStyle(el);
      return {
        width: el.getBoundingClientRect().width,
        maxWidth: css.maxInlineSize,
        marginTop: css.marginTop,
        marginBottom: css.marginBottom,
        lineHeight: css.lineHeight,
        fontSize: css.fontSize,
      };
    };
    return {
      firstHeading: inspect("first-heading"),
      secondHeading: inspect("second-heading"),
      first: inspect("first-paragraph"),
      second: inspect("second-paragraph"),
      last: inspect("final-paragraph"),
      ui: inspect("ui-paragraph"),
      viewport: window.innerWidth,
      bodyScrollWidth: document.documentElement.scrollWidth,
    };
  });
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    const url = pathToFileURL(path.resolve(__dirname, "../tests/prose-rhythm.html")).href;
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const desktop = await measure(page);
    assert.notEqual(desktop.first.maxWidth, "none",
      "Opt-in prose must have a maximum inline size");
    assert.ok(desktop.first.width < desktop.ui.width * 0.85,
      "Prose paragraph should be narrower than UI copy on desktop");
    assert.equal(desktop.first.lineHeight, "24px", "Default text line-height is 1.5 × 16px");
    assert.equal(desktop.first.marginBottom, "24px");
    assert.equal(desktop.firstHeading.marginTop, "0px");
    assert.equal(desktop.secondHeading.marginTop, "48px");
    assert.equal(desktop.secondHeading.marginBottom, "12px");
    assert.equal(desktop.last.marginBottom, "0px");
    assert.equal(desktop.ui.marginBottom, "16px", "Global UI paragraph spacing stays unchanged");

    await page.setViewport({ width: 375, height: 780 });
    await page.reload({ waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const mobile = await measure(page);
    assert.ok(mobile.first.width < desktop.first.width, "Prose shrinks at mobile viewport");
    assert.ok(mobile.bodyScrollWidth <= mobile.viewport,
      "Prose does not cause horizontal overflow on mobile");

    console.log("OK: prose browser rhythm (desktop + mobile), UI unaffected");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
