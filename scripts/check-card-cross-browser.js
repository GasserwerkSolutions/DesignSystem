#!/usr/bin/env node
/**
 * Contract regression on independent browser engines.
 * A Card may contain layout, but must not clip visible keyboard focus.
 * Both engines use Playwright-managed binaries installed by CI.
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { PNG } = require("pngjs");
const { chromium, webkit } = require("playwright");

const fixture = pathToFileURL(path.resolve(__dirname, "../tests/card-proportions.html")).href;

function coloredFocusVisible(png, r) {
  const x0 = Math.round(r.cardRight) + 2;
  const y0 = Math.round((r.actionTop + r.actionBottom) / 2);
  let hits = 0;
  for (let y = y0 - 3; y <= y0 + 3; y++) {
    for (let x = x0; x <= x0 + 5; x++) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue;
      const i = (y * png.width + x) * 4;
      if (png.data[i] > 210 && png.data[i + 1] < 80 && png.data[i + 2] > 210 && png.data[i + 3] > 200) hits++;
    }
  }
  return hits;
}

async function run(name, browserType, options) {
  const browser = await browserType.launch(options);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
    await page.goto(fixture, { waitUntil: "load" });
    await page.locator("#edge-action").focus();
    const focus = await page.evaluate(() => {
      const card = document.getElementById("focus-card");
      const a = document.getElementById("edge-action");
      const c = card.getBoundingClientRect();
      const r = a.getBoundingClientRect();
      return {
        cardRight: c.right,
        actionTop: r.top,
        actionBottom: r.bottom,
        containment: getComputedStyle(card).contain,
        outlineStyle: getComputedStyle(a).outlineStyle,
        active: document.activeElement === a,
        cardHeight: c.height,
        cardScrollHeight: card.scrollHeight,
      };
    });
    assert.ok(focus.active, name + ": focusable card action must receive focus");
    assert.equal(focus.outlineStyle, "solid", name + ": visible keyboard focus style");
    assert.ok(focus.cardHeight >= 90, name + ": content determines card height");
    const png = PNG.sync.read(await page.screenshot({ fullPage: true, animations: "disabled" }));
    const colored = coloredFocusVisible(png, focus);
    console.log(name + " focus", JSON.stringify({ ...focus, coloredPixelsOutsideCard: colored }));
    assert.ok(colored >= 6,
      name + ": keyboard focus outline must be visibly painted OUTSIDE the card, not clipped by paint containment");

    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      const v = await page.evaluate(() => {
        const short = document.getElementById("short").getBoundingClientRect();
        const long = document.getElementById("long").getBoundingClientRect();
        const focusCard = document.getElementById("focus-card").getBoundingClientRect();
        const longBody = document.querySelector("#long .card__body");
        return {
          shortHeight: short.height,
          longHeight: long.height,
          focusCardHeight: focusCard.height,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          longBodyScroll: longBody.scrollWidth,
          longBodyClient: longBody.clientWidth,
        };
      });
      assert.ok(v.shortHeight + 50 < v.longHeight, name + ": natural card height at " + width);
      assert.ok(v.documentWidth <= v.viewportWidth, name + ": page overflow at " + width);
      assert.ok(v.longBodyScroll <= v.longBodyClient + 2, name + ": long word overflows at " + width);
      assert.ok(v.focusCardHeight >= 90, name + ": content height at " + width);
    }
    console.log("OK: " + name + " focus visibility / intrinsic height / overflow");
  } finally {
    await browser.close();
  }
}

async function main() {
  await run("Chromium", chromium, {
    headless: true,
    args: ["--no-sandbox", "--allow-file-access-from-files"],
  });
  await run("WebKit", webkit, { headless: true });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
