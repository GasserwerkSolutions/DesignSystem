#!/usr/bin/env node
"use strict";
/** Button 01 — read-only rendered browser probe. No release claim. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const root = path.resolve(__dirname, "..");
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const css = read("components/button.css");

assert.match(css, /gap:\s*var\(--component-gap\)/, "Button must consume the proximity token");
assert.match(css, /border:\s*var\(--stroke-default\)\s+solid/, "Button must consume stroke axis");
assert.match(css, /:focus-visible\s*\{[^}]*outline:/s, "Visible keyboard focus style");
assert.match(css, /\.btn:disabled\s*\{/, "Native disabled style is required");
assert.match(read("main.css"), /@import\s+"\.\/components\/button\.css"\s+layer\(components\)/);
assert.match(read("profiles/builder.css"), /@import\s+"\.\.\/components\/button\.css"\s+layer\(components\)/);

const close = (actual, expected, label) =>
  assert(Math.abs(parseFloat(actual)-expected) < .25, label + ": expected " + expected + "px, got " + actual);

(async()=>{
 const browser = await puppeteer.launch({headless:true,args:["--no-sandbox","--disable-setuid-sandbox"]});
 try {
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
  await page.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
  const fixture=path.join(root,"reviews","button","fixture.html");
  await page.goto("file://" + fixture,{waitUntil:"load"});
  await page.evaluate(()=>document.fonts.ready);
  const inspect=await page.evaluate(()=>{
   const style=(id)=>{
    const el=document.getElementById(id),s=getComputedStyle(el),r=el.getBoundingClientRect();
    return {id,tag:el.tagName.toLowerCase(),gap:s.columnGap,border:s.borderTopWidth,
      radius:s.borderTopLeftRadius,height:Math.round(r.height*100)/100,width:Math.round(r.width*100)/100,
      opacity:s.opacity,display:s.display,focus:s.outlineStyle};
   };
   return {normal:style("primary"),wide:style("wide-primary"),small:style("small"),
    large:style("large"),disabled:style("disabled-native"),link:style("cta-link"),
    linkHref:document.getElementById("cta-link").getAttribute("href"),
    linkRole:document.getElementById("cta-link").getAttribute("role"),
    nativeDisabled:document.getElementById("disabled-native").matches(":disabled")};
  });
  close(inspect.normal.gap,8,"normal gap");
  close(inspect.wide.gap,16,"wide gap");
  close(inspect.normal.border,1,"fine stroke");
  close(inspect.wide.border,2,"strong stroke");
  close(inspect.normal.radius,2,"defined radius");
  close(inspect.wide.radius,8,"soft radius");
  assert(inspect.normal.height>=24 && inspect.small.height>=24,"WCAG 2.5.8 target height (size only)");
  assert(inspect.large.height>inspect.small.height,"size modifiers must be visibly differentiated");
  assert.equal(inspect.nativeDisabled,true);
  assert.equal(inspect.disabled.opacity,"0.5");
  assert.equal(inspect.link.tag,"a");
  assert.equal(inspect.linkHref,"#ziel");
  assert.equal(inspect.linkRole,null,"Links should retain native link semantics");
  // Keyboard activation and visible focus, not only cursor/hover.
  await page.evaluate(()=>{window.__buttonClicks=0;
    document.getElementById("primary").addEventListener("click",()=>window.__buttonClicks++);});
  await page.keyboard.press("Tab");
  const focus=await page.evaluate(()=>({id:document.activeElement.id,
     outline:getComputedStyle(document.activeElement).outlineStyle}));
  assert.equal(focus.id,"primary","First action must be Tab-focusable");
  assert.notEqual(focus.outline,"none","Keyboard focus must be visibly outlined");
  await page.keyboard.press("Space");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(()=>window.__buttonClicks),2,
    "Native button activation via Space and Enter");
  await page.screenshot({path:path.join(root,"reviews","button","button-review-desktop.png"),fullPage:true});
  await page.setViewport({width:320,height:900,deviceScaleFactor:1});
  await page.evaluate(()=>window.scrollTo(0,0));
  const narrow=await page.evaluate(()=>{
   const b=document.getElementById("long-label").getBoundingClientRect(),
    p=document.getElementById("long-label-container").getBoundingClientRect();
   return {viewport:window.innerWidth,documentWidth:document.documentElement.scrollWidth,
    longLabelWidth:Math.round(b.width),containerWidth:Math.round(p.width),
    longLabelProtrusion:Math.max(0,Math.round(b.right-p.right))};
  });
  await page.screenshot({path:path.join(root,"reviews","button","button-review-mobile.png"),fullPage:true});
  // Observational: long-label overflow is intentionally a reviewer decision,
  // NOT silently called accessible or automatically hidden.
  const report={status:"SOURCE_AND_CORE_BROWSER_CHECKS_PASS_WITH_PENDING_REVIEW",
     release:"BLOCKED",fixture:"reviews/button/fixture.html",
     branch:"review/button-01-source-and-browser-contract",
     tested:"Chromium; canonical main.css; normal/wide, defined/soft, fine/strong, native keyboard, disabled, link",
     normal:inspect.normal,wide:inspect.wide,small:inspect.small,large:inspect.large,
     focus,narrow,needsReview:{
      longLabelOverflow:narrow.longLabelProtrusion>0 || narrow.documentWidth>narrow.viewport,
      wcagTargetAt24:true,
      projectTouchTarget44:inspect.normal.height>=44 && inspect.small.height>=44,
      forcedColors:"UNKNOWN",voiceover:"UNKNOWN",crossBrowser:"UNKNOWN",
      contrastAllModes:"INDEPENDENT_GATE_REQUIRED",consumerProof:"UNKNOWN"}};
  console.log(JSON.stringify(report,null,2));
 } finally {await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
