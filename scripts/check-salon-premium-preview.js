#!/usr/bin/env node
"use strict";
/**
 * Read-only candidate check for proposals/coiffeur-premium.
 * Does NOT change public component CSS, golden references or release status.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const root = path.resolve(__dirname, "..");
const proposal = path.join(root, "proposals", "coiffeur-premium");
const html = fs.readFileSync(path.join(proposal, "preview.html"), "utf8");
const css = fs.readFileSync(path.join(proposal, "preview.css"), "utf8");
assert.match(html, /main\.css/, "must consume actual canonical DS");
for (const required of ["site-header","hero--split","service-grid","editorial-split","cta-band"]) {
  assert(html.includes(required), "must reuse actual DS pattern: " + required);
}
assert(!/https?:\/\//.test(html), "preview must not fetch third-party photos/scripts or fake booking endpoints");
assert(!/\b\d{1,3}\s*(?:CHF|€|\$)\b|(?:\d[.,]\d)\s*★/.test(html), "preview must not invent prices or star ratings");
assert(!/\b(?:auto|true)\b.*(?:autoplay|auto-play)/i.test(html), "no auto-playing promo media");
assert.match(css, /\.salon-premium-preview/, "treatment must have explicit consumer scope");
assert(!/^\s*\.btn\s*\{/m.test(css), "no unscoped public component selectors");
assert(!/^\s*:root\s*\{/m.test(css), "no global token overrides");
assert(!/\burl\(\s*['"]?https?:/i.test(css), "no remote media/fonts in review");

(async () => {
  const browser = await puppeteer.launch({headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"]});
  try {
    const page = await browser.newPage();
    const viewportResults = [];
    const checks = [];
    await page.emulateMediaFeatures([{name: "prefers-reduced-motion", value: "reduce"}]);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewport({width, height: 900, deviceScaleFactor: 1});
      await page.goto("file://" + path.join(proposal, "preview.html"), {waitUntil:"load"});
      await page.evaluate(() => document.fonts.ready);
      const before = await page.evaluate(() => {
        const hero = document.querySelector(".hero__inner");
        const title = document.querySelector("h1");
        const screenshotLink = document.querySelector('a[href="#kontakt"]');
        const computed = getComputedStyle(hero);
        const r = title.getBoundingClientRect();
        return {
          vw:window.innerWidth, documentWidth:document.documentElement.scrollWidth,
          bodyWidth:document.body.scrollWidth, heroCols:computed.gridTemplateColumns,
          storyCols:getComputedStyle(document.querySelector(".editorial-split")).gridTemplateColumns,
          titleHeight:Math.round(r.height), titleWidth:Math.round(r.width),
          h1Count:document.querySelectorAll("h1").length,
          targets: [...document.querySelectorAll('a[href^="#"]')].every(a => document.getElementById(a.getAttribute("href").slice(1))),
          ctaHref:screenshotLink?.getAttribute("href") || null,
          heroImageSource:document.querySelector(".hero__media img")?.src || null,
          shapeMedia:getComputedStyle(document.querySelector(".hero__media")).borderTopLeftRadius
        };
      });
      assert.equal(before.h1Count, 1, "exactly one h1");
      assert.equal(before.targets, true, "every anchor points to a real section");
      assert.equal(before.ctaHref, "#kontakt", "review CTA links to an explained contact section, not a fake API");
      assert.equal(before.heroImageSource, null, "no unlicensed editorial image");
      assert(before.documentWidth <= width + 1, "horizontal overflow at " + width + ": " + JSON.stringify(before));
      assert(before.titleWidth > 0 && before.titleHeight > 0, "visible heading");
      if (width === 1440) assert(before.heroCols.trim().split(/\s+/).length >= 2, "split hero should have two columns");
      if (width === 1440) assert(before.storyCols.trim().split(/\s+/).length >= 2, "golden editorial split must have two valid columns");
      if (width === 320) assert(before.heroCols.trim().split(/\s+/).length === 1, "320px hero must stack");
      if (width === 320) assert(before.storyCols.trim().split(/\s+/).length === 1, "320px editorial split must stack");
      viewportResults.push(before);
      if (width === 1440 || width === 320) {
        await page.screenshot({path:path.join(proposal, "preview-"+width+"-soft-light.png"), fullPage:true});
      }
    }
    // Independently verify that the review controls modify the DOCUMENT scopes
    // and affect the actual CSS layout, without changing component implementation.
    await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
    await page.goto("file://" + path.join(proposal, "preview.html"), {waitUntil:"load"});
    // Imported CSS can resolve one animation frame after file:// load on CI.
    // Verify the actual default soft token before comparing the selection.
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector(".hero__media")).borderTopLeftRadius === "24px",
      {timeout: 10000});
    const initialRadius = await page.$eval(".hero__media", el => getComputedStyle(el).borderTopLeftRadius);
    await page.select("#shape", "defined");
    await page.select("#space", "normal");
    await page.waitForFunction(() =>
      getComputedStyle(document.querySelector(".hero__media")).borderTopLeftRadius === "2px",
      {timeout: 10000});
    const changed = await page.evaluate(() => {
      const html = document.documentElement;
      return {shape:html.getAttribute("data-shape"),space:html.getAttribute("data-space"),
        radius:getComputedStyle(document.querySelector(".hero__media")).borderTopLeftRadius,
        gap:getComputedStyle(document.querySelector(".hero__content")).gap};
    });
    assert.equal(changed.shape,"defined");
    assert.equal(changed.space,"normal");
    assert.notEqual(initialRadius,changed.radius,"soft/defined should visibly differ");
    await page.select("#mode","dark");
    assert.equal(await page.$eval("html",el=>el.getAttribute("data-mode")),"dark");
    await page.screenshot({path:path.join(proposal, "preview-1280-defined-dark.png"),fullPage:true});

    // axe is useful but not a complete human accessibility audit.
    let axe = {status:"UNKNOWN",modes:[]};
    try {
      const axePath=require.resolve("axe-core/axe.min.js");
      await page.addScriptTag({path:axePath});
      const modeResults=[];
      for (const checkedMode of ["dark","light"]) {
        await page.select("#mode",checkedMode);
        const result=await page.evaluate(async()=>window.axe.run(document,{
          runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]}
        }));
        const violations=result.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length,
          nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html.slice(0,260)})).slice(0,8)}));
        modeResults.push({mode:checkedMode,status:violations.length?"FAIL":"PASS_AUTOMATED_ONLY",violations});
        assert.equal(violations.length,0,checkedMode+" axe violations: "+JSON.stringify(violations));
      }
      axe={status:"PASS_AUTOMATED_ONLY",modes:modeResults};
    } catch(e) {
      if(e.code==="MODULE_NOT_FOUND") {
        axe={status:"NOT_INSTALLED",modes:[]};
      } else throw e;
    }
    const report={
      status:"REVIEW_ONLY_BROWSER_CHECK_PASSED",
      publication:"BLOCKED",
      sourceFiles:["proposals/coiffeur-premium/preview.html","proposals/coiffeur-premium/preview.css"],
      browser:await browser.version(),
      viewports:viewportResults,
      reviewOptions:{initialRadius,changed,mode:"dark"},
      axe,
      unresolved:["copyright-cleared salon photos","actual tenant/domain data","manual screenreader/keyboard",
        "real light/dark contrast in consumer","Core Web Vitals on hosted website",
        "formal typography review","booking integration","owner visual approval"]
    };
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
