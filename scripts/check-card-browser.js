#!/usr/bin/env node
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const puppeteer = require("puppeteer");

const url = pathToFileURL(path.resolve(__dirname, "../tests/card-proportions.html")).href;
const near = (a,b,epsilon=2) => Math.abs(a-b)<=epsilon;
async function measure(page) {
  return page.evaluate(() => {
    const node = (id) => document.getElementById(id);
    const rect = (id) => {
      const r = node(id).getBoundingClientRect();
      return { top:r.top, bottom:r.bottom, left:r.left, right:r.right, height:r.height, width:r.width };
    };
    const css = (id) => getComputedStyle(node(id));
    return {
      short: rect("short"), long: rect("long"),
      priceShort: rect("price-short"), priceLong: rect("price-long"),
      shortFooter: node("short").querySelector(".card__footer").getBoundingClientRect().bottom,
      priceShortFooter: node("price-short").querySelector(".card__footer").getBoundingClientRect().bottom,
      priceLongFooter: node("price-long").querySelector(".card__footer").getBoundingClientRect().bottom,
      cardPadding: parseFloat(css("short").paddingLeft),
      groupGap: parseFloat(css("natural").gap),
      cardGap: parseFloat(css("short").gap),
      headerGap: parseFloat(getComputedStyle(node("short").querySelector(".card__header")).gap),
      gridColumns: css("natural").gridTemplateColumns.split(" ").length,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

async function main(){
  const browser = await puppeteer.launch({headless:true,args:["--no-sandbox","--allow-file-access-from-files"]});
  try {
    const page = await browser.newPage();
    await page.setViewport({width:1280,height:900});
    await page.goto(url,{waitUntil:"load"});
    const compact = await measure(page);

    assert.ok(compact.short.height + 50 < compact.long.height,
      "Editorial cards must follow content, not match the tallest card");
    assert.ok(near(compact.short.top,compact.long.top),"Cards share a row");
    assert.ok(compact.shortFooter < compact.long.bottom - 30,
      "Short card action stays with content; it is not pushed to the tallest sibling's bottom");
    assert.ok(near(compact.priceShort.height,compact.priceLong.height),
      "Only explicit comparison cards should share a height");
    assert.ok(near(compact.priceShortFooter,compact.priceLongFooter),
      "Comparison actions may align to bottom");
    assert.ok(near(compact.headerGap * 2, compact.cardGap),
      "Label and title should have half the gap used between content groups");
    assert.ok(compact.cardGap <= compact.groupGap,
      "Card grouping must not exceed inter-card spacing");
    assert.ok(compact.gridColumns >= 2,"Desktop should render multiple tracks");

    await page.evaluate(()=>document.documentElement.setAttribute("data-space","spacious"));
    const spacious = await measure(page);
    assert.ok(spacious.cardPadding > compact.cardPadding,
      "Opt-in fluid padding must respond to the space axis (within bounds)");
    assert.ok(spacious.cardPadding <= 32, "Card padding must be bounded");

    await page.setViewport({width:375,height:780});
    await page.reload({waitUntil:"load"});
    const mobile = await measure(page);
    assert.equal(mobile.gridColumns,1, "Mobile stacks cards in one column");
    assert.ok(mobile.scrollWidth <= mobile.viewportWidth, "No mobile horizontal overflow");
    assert.ok(mobile.short.width > 200, "Mobile card remains usable");
    console.log("OK: cards content-first / comparison / fluid padding / mobile Chromium");
  } finally {
    await browser.close();
  }
}
main().catch(err=>{console.error(err);process.exitCode=1});
