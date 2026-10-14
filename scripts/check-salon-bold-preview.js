#!/usr/bin/env node
"use strict";
/* Candidate B — intentionally daring but must pass functional and a11y constraints.
 * Scoped review only. Never deploys, publishes, or changes public DesignSystem CSS.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const root = path.join(__dirname, "..");
const dir = path.join(root, "proposals", "coiffeur-premium");
const html = fs.readFileSync(path.join(dir, "preview-bold.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "bold.css"), "utf8");
for (const p of ['main.css','preview.css','bold.css']) {
  assert(html.includes(p), "bold preview must use shared DS and scoped styles: " + p);
}
for (const c of ['site-header','hero--split','service-grid','editorial-split','cta-band']) {
  assert(html.includes(c), "must reuse canonical DS pattern " + c);
}
assert(html.includes('salon-bold-preview'),"bold styles must be opt-in");
assert(!/https?:\/\//.test(html),"do not load foreign photos/scripts or fake booking endpoints");
assert(!/url\(\s*['"]?https?:/i.test(css),"no external font/media dependency");
assert(!/^\s*\.btn\s*\{/m.test(css),"no new unscoped Button owner");
assert(!/^\s*:root\s*\{/m.test(css),"no global token layer override");
assert(!/\d+\s*CHF|(?:\d[.,]\d)\s*★/.test(html),"no invented pricing/ratings");

(async()=>{
  const browser = await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
  try {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
    const results=[];
    for (const width of [1440,1024,768,390,320]) {
      await page.setViewport({width,height:900,deviceScaleFactor:1});
      await page.goto("file://"+path.join(dir,"preview-bold.html"),{waitUntil:"load"});
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>getComputedStyle(document.querySelector(".hero__title")).fontWeight!=="500");
      const measure = await page.evaluate(()=>{
        const rect = sel=>document.querySelector(sel).getBoundingClientRect();
        const title=rect("h1"), hero=rect(".salon-hero"), actions=rect(".hero__actions"), image=rect(".hero__media");
        const headingCSS=getComputedStyle(document.querySelector("h1"));
        const link=document.querySelector(".hero__actions .btn");
        const docWidth=document.documentElement.scrollWidth;
        const docH=document.documentElement.scrollHeight;
        const badOverflows = [...document.querySelectorAll(".salon-bold-preview h1,.salon-bold-preview h2,.salon-bold-preview h3,.salon-bold-preview .btn")].filter(el=>{
          const b=el.getBoundingClientRect();
          return b.left < -1 || b.right > window.innerWidth+1;
        }).map(el=>({tag:el.tagName,text:el.textContent.slice(0,40),x:Math.round(el.getBoundingClientRect().x),right:Math.round(el.getBoundingClientRect().right)}));
        return {
          width:window.innerWidth,documentWidth:docWidth,documentHeight:docH,
          heroBg:getComputedStyle(document.querySelector(".salon-hero")).backgroundColor,
          titleFontSize:headingCSS.fontSize,titleFontWeight:headingCSS.fontWeight,
          titleHeight:Math.round(title.height),titleWidth:Math.round(title.width),
          heroColumns:getComputedStyle(document.querySelector(".hero__inner")).gridTemplateColumns,
          storyColumns:getComputedStyle(document.querySelector(".editorial-split")).gridTemplateColumns,
          heroHeight:Math.round(hero.height),imageWidth:Math.round(image.width),
          actionsWidth:Math.round(actions.width),
          primaryActionVisible:link.getBoundingClientRect().width>0,
          headings:document.querySelectorAll("h1").length,
          brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.getAttribute("href").slice(1))).map(a=>a.href),
          badOverflows
        };
      });
      assert.equal(measure.headings,1,"exactly one H1");
      assert.deepEqual(measure.brokenAnchors,[],"all hash destinations exist");
      assert.equal(measure.badOverflows.length,0, "heading/CTA out of viewport at "+width+" "+JSON.stringify(measure.badOverflows));
      assert(measure.documentWidth <= width+1, "horizontal overflow at "+width+": "+JSON.stringify(measure));
      assert.equal(measure.primaryActionVisible,true);
      assert(parseInt(measure.titleFontWeight,10)>=800,"hero must have bold, distinct typography");
      if(width===1440){
        assert(parseFloat(measure.titleFontSize)>=95,"desktop headline is the editorial focal point");
        assert(measure.heroColumns.trim().split(/\s+/).length>=2,"desktop hero must be split");
        assert(measure.storyColumns.trim().split(/\s+/).length>=2,"desktop story needs two editorial columns");
      }
      if(width===320){
        assert(measure.heroColumns.trim().split(/\s+/).length===1,"320px hero must stack");
        assert(measure.storyColumns.trim().split(/\s+/).length===1,"320px story must stack");
      }
      results.push(measure);
      if(width===1440||width===320||width===390) {
        await page.screenshot({path:path.join(dir,"bold-"+width+"-light.png"),fullPage:true});
      }
    }

    await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
    await page.goto("file://"+path.join(dir,"preview-bold.html"),{waitUntil:"load"});
    await page.evaluate(()=>document.fonts.ready);
    await page.select("#shape","defined");
    await page.select("#space","normal");
    await page.select("#mode","dark");
    assert.equal(await page.$eval("html",el=>el.getAttribute("data-shape")),"defined");
    assert.equal(await page.$eval("html",el=>el.getAttribute("data-space")),"normal");
    assert.equal(await page.$eval("html",el=>el.getAttribute("data-mode")),"dark");
    await page.screenshot({path:path.join(dir,"bold-1280-dark-defined.png"),fullPage:true});

    const axePath = require.resolve("axe-core/axe.min.js");
    await page.addScriptTag({path:axePath});
    const checks=[];
    for(const mode of ["dark","light"]){
      await page.select("#mode",mode);
      await page.waitForFunction(expected=>document.documentElement.getAttribute("data-mode")===expected,{},mode);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const result=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22aa"]}}));
      const violations=result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.slice(0,8).map(n=>({target:n.target,summary:n.failureSummary,html:n.html.slice(0,200)}))}));
      checks.push({mode,violationCount:violations.length,violations});
      assert.equal(violations.length,0,mode+" axe issues: "+JSON.stringify(violations));
    }

    console.log(JSON.stringify({
      proposal:"bold-editorial-B",decision:"REVIEW_REQUIRED",publication:"BLOCKED",
      source:"proposals/coiffeur-premium/preview-bold.html",browser:await browser.version(),
      viewports:results,automatedAccessibility:checks,
      notYetProven:["human visual sign-off","manual keyboard/screenreader","real salon media rights and actual content",
        "consumer booking integration","mobile Web Vitals","public browser matrix"]
    },null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
