/**
 * Legacy website -> inspected design specification -> isolated web element.
 * Observation is not approval, source CSS is preserved, no AI layout decisions.
 */
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import postcss from "postcss";
import { chromium } from "playwright";

const sha = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const clean = (v) => JSON.stringify(v, Object.keys(v).sort(), 2);
const safeName = /^[a-z][a-z0-9-]*$/;
const fileExt = /^[a-z0-9]{1,8}$/;
const denyTag = "script,iframe,object,embed,form,base,svg,math,canvas,video,audio,template,meta[http-equiv=refresh]";
const computedKeys = ["display","fontFamily","fontSize","fontWeight","lineHeight","color","backgroundColor","margin","padding","gap","borderRadius","objectFit","objectPosition","gridTemplateColumns"];
function assert(value, message) { if (!value) throw new Error(message); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
  return value;
}
export function canonical(value) { return JSON.stringify(stable(value), null, 2) + "\n"; }
function relFile(root, from, raw) {
  assert(typeof raw === "string" && raw && !/^(?:[a-z]+:|\/\/|\/|\\)/i.test(raw), "E_SOURCE_EXTERNAL_OR_ROOTED: " + raw);
  assert(!/[?#]/.test(raw) && !raw.includes("\0") && !raw.includes("\\"), "E_SOURCE_PATH_INVALID: " + raw);
  const full = path.resolve(from, raw);
  assert(full.startsWith(root + path.sep) && full !== root, "E_SOURCE_PATH_ESCAPE: " + raw);
  return full;
}
async function readPinned(root, from, raw) {
  const file = relFile(root, from, raw);
  const actual = await fs.realpath(file);
  assert(actual.startsWith(root + path.sep), "E_SOURCE_SYMLINK_ESCAPE: " + raw);
  const bytes = await fs.readFile(actual);
  return { file: actual, bytes, sha256: sha(bytes), relativePath: path.relative(root, actual).split(path.sep).join("/") };
}
function resourceMime(ext) {
  const types = {png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",woff:"font/woff",woff2:"font/woff2",ttf:"font/ttf",ico:"image/x-icon",avif:"image/avif"};
  assert(Object.hasOwn(types, ext), "E_ASSET_TYPE_UNSUPPORTED: " + ext);
  return types[ext];
}
export async function sourceInventory(inputFile) {
  const input = path.resolve(inputFile);
  const root = path.dirname(input);
  const bytes = await fs.readFile(input);
  return { root, input, name:path.basename(input), sha256:sha(bytes), bytes };
}
async function loadAsset(inv, fromDir, raw, files, sources) {
  const r = await readPinned(inv.root, fromDir, raw);
  const ext = path.extname(r.file).slice(1).toLowerCase();
  resourceMime(ext);
  const outName = "assets/" + r.sha256 + "." + ext;
  files.set(outName, r.bytes);
  sources.set(r.relativePath, { sha256:r.sha256, role:"asset", emittedAs:outName });
  return outName;
}
async function transformCss(inv, cssText, originDir, files, sources) {
  let ast;
  try { ast = postcss.parse(cssText); } catch(e) { throw new Error("E_CSS_PARSE: " + e.message); }
  const changes = [];
  ast.walkAtRules((r) => { if (r.name.toLowerCase() === "import" || r.name.toLowerCase() === "namespace") throw new Error("E_CSS_IMPORT_NOT_SUPPORTED"); });
  ast.walkDecls((d) => {
    if (/\b(?:expression|behavior)\s*[:(]/i.test(d.value)) throw new Error("E_CSS_UNSAFE_VALUE");
    const rx = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/gi;
    for (const match of d.value.matchAll(rx)) {
      const name = match[1] ?? match[2] ?? match[3];
      changes.push({decl:d, full:match[0], name});
    }
  });
  for (const item of changes) {
    const mapped = await loadAsset(inv, originDir, item.name, files, sources);
    item.decl.value = item.decl.value.replace(item.full, 'url("' + mapped + '")');
  }
  return ast.toString();
}
async function guardedBrowser() {
  const browser = await chromium.launch({headless:true, args:["--no-sandbox"]});
  const context = await browser.newContext({ javaScriptEnabled:false, serviceWorkers:"block" });
  await context.route("**/*", async (route) => {
    const target = route.request().url();
    if (target.startsWith("file:") || target.startsWith("data:")) await route.continue();
    else await route.abort();
  });
  return {browser,context};
}
export async function designExtractor(inv) {
  const {browser, context} = await guardedBrowser();
  try {
    const page = await context.newPage();
    await page.setViewportSize({width:1280,height:900});
    await page.goto(pathToFileURL(inv.input).href, {waitUntil:"load"});
    const meta = await page.evaluate((bad) => {
      const forbidden = [...document.querySelectorAll(bad)].map(x => x.tagName.toLowerCase());
      const attrs = [];
      for (const el of document.querySelectorAll("*")) {
        for (const a of el.attributes) {
          if (/^on/i.test(a.name)) forbidden.push("inline-event:" + a.name);
          if (/^(srcset|ping|action|formaction|srcdoc)$/i.test(a.name)) forbidden.push("unsupported-attribute:" + a.name);
          if (/(?:^|\s)url\s*\(/i.test(a.value) && a.name === "style") forbidden.push("inline-style-url");
          if (["href","src","poster"].includes(a.name) && /^(?:javascript:|data:|vbscript:)/i.test(a.value)) forbidden.push("unsafe-url");
          if (["src","poster"].includes(a.name) && /^https?:\/\//i.test(a.value)) forbidden.push("remote-media");
        }
      }
      for (const link of document.querySelectorAll("link")) {
        if (!["stylesheet","icon"].includes(link.getAttribute("rel"))) forbidden.push("unsupported-link:"+(link.getAttribute("rel")||"unknown"));
      }
      const cssRefs=[...document.querySelectorAll('link[rel="stylesheet"],style')].map((n, i) =>
         ({i, href:n.tagName.toLowerCase()==="link"?n.getAttribute("href"):null,
           css:n.tagName.toLowerCase()==="style"?n.textContent:null}));
      const assets=[...document.querySelectorAll("img[src],source[src],link[rel=icon][href]")].map(n=>({
        tag:n.tagName.toLowerCase(), attr:n.hasAttribute("src")?"src":"href",
        raw:n.getAttribute(n.hasAttribute("src")?"src":"href")}));
      const links=[...document.querySelectorAll("a[href]")].map(n=>n.getAttribute("href"));
      return {forbidden,cssRefs,assets,links,classes:[...new Set([...document.querySelectorAll("[class]")].flatMap(n=>[...n.classList]))].sort(),
        axes:[...new Set([...document.querySelectorAll("[data-space],[data-shape],[data-weight]")].map(x =>
           [x.getAttribute("data-space"),x.getAttribute("data-shape"),x.getAttribute("data-weight")].join("|")))].sort(),
        language:document.documentElement.lang||null,title:document.title};
    }, denyTag);
    assert(meta.forbidden.length===0, "E_ACTIVE_OR_UNSAFE_HTML: " + meta.forbidden.join(","));
    assert(meta.cssRefs.every(x=>x.css !== null || x.href !== null), "E_CSS_LINK_EMPTY");
    const observations=[];
    for (const width of [390,1280]) {
      await page.setViewportSize({width,height:900});
      observations.push(await page.evaluate((keys) => ({
        width:innerWidth, documentWidth:document.documentElement.scrollWidth,
        nodes:[...document.body.querySelectorAll("*")].slice(0,500).map((el,i)=>{
          const style=getComputedStyle(el);
          return {order:i,tag:el.tagName.toLowerCase(),id:el.id||null,classes:[...el.classList],
                  styles:Object.fromEntries(keys.map(k=>[k,style[k]]))};
        })
      }),computedKeys));
    }
    return {...meta, observations};
  } finally {await context.close();await browser.close();}
}
export async function collectSnapshot(inv, extraction) {
  const files=new Map(),sources=new Map();
  sources.set(inv.name,{sha256:inv.sha256,role:"html"});
  const styles=[];
  for (const s of extraction.cssRefs) {
    let content,from;
    if (s.href !== null) {
      const r=await readPinned(inv.root, inv.root, s.href);
      content=r.bytes.toString("utf8");from=path.dirname(r.file);
      sources.set(r.relativePath,{sha256:r.sha256,role:"stylesheet"});
    } else {content=s.css;from=inv.root;}
    styles.push({i:s.i,css:await transformCss(inv,content,from,files,sources)});
  }
  const assetMap={};
  for (const a of extraction.assets) assetMap[a.raw]=await loadAsset(inv,inv.root,a.raw,files,sources);
  // A second inert parse supplies serialization; never run legacy JavaScript.
  const {browser,context}=await guardedBrowser();
  try {
    const page=await context.newPage();
    await page.goto(pathToFileURL(inv.input).href,{waitUntil:"load"});
    const html=await page.evaluate(({styles,assetMap})=>{
      const clone=document.documentElement.cloneNode(true);
      [...clone.querySelectorAll('link[rel="stylesheet"],style')].forEach((el,i)=>{
        const rule=styles.find(x=>x.i===i);
        if (!rule) return;
        const style=document.createElement("style");
        style.textContent=rule.css;
        el.replaceWith(style);
      });
      for (const node of clone.querySelectorAll("img[src],source[src],link[rel=icon][href]")) {
        const attr=node.hasAttribute("src")?"src":"href";
        const raw=node.getAttribute(attr);
        if (Object.hasOwn(assetMap,raw)) node.setAttribute(attr,assetMap[raw]);
      }
      return "<!doctype html>\n" + clone.outerHTML + "\n";
    },{styles,assetMap});
    return {html,files,sources:Object.fromEntries([...sources].sort(([a],[b])=>a.localeCompare(b)))};
  } finally {await context.close();await browser.close();}
}
export async function designRegistry(repoRoot) {
  const read=async p=>fs.readFile(path.join(repoRoot,p));
  const [manifestBytes,layoutBytes,semanticBytes,formBytes,tokenBytes]=await Promise.all([
    read("manifest/builder-profile.json"),read("base/layout.css"),
    read("semantic/semantic.css"),read("semantic/form.css"),read("dist/tokens.json")]);
  const manifest=JSON.parse(manifestBytes.toString("utf8"));
  assert(manifest.id==="builder" && manifest.schemaVersion===1, "E_DS_PROFILE_ID");
  const layoutClasses=[...layoutBytes.toString("utf8").matchAll(/\.([a-z][\w-]*)\s*(?=[{,:])/g)].map(x=>x[1]);
  const tokenNames=[...new Set([...semanticBytes, ...formBytes].length?[
    ...semanticBytes.toString("utf8").matchAll(/--[a-z][a-z0-9-]*\s*:/g),
    ...formBytes.toString("utf8").matchAll(/--[a-z][a-z0-9-]*\s*:/g)] .map(x=>x[0].split(":")[0].trim()):[])].sort();
  return {package:"@gasserwerksolutions/design-system",profile:"builder",
    components:manifest.components.map(x=>({id:x.id,css:x.css,contract:x.contract??null})),
    patterns:manifest.patterns.map(x=>({id:x.id,css:x.css})),
    layouts:[...new Set(layoutClasses)].sort(),tokens:tokenNames,
    axes:{space:["normal","wide","compact","spacious"],shape:["defined","soft"],weight:["fine","strong"]},
    sourceHashes:{
      "manifest/builder-profile.json":sha(manifestBytes),"base/layout.css":sha(layoutBytes),
      "semantic/semantic.css":sha(semanticBytes),"semantic/form.css":sha(formBytes),
      "dist/tokens.json":sha(tokenBytes)}
  };
}
export function designAnalyzer(extraction) {
  return {responsiveObservedAt:extraction.observations.map(x=>x.width),
    overflowObservedAt:extraction.observations.filter(x=>x.documentWidth>x.width).map(x=>x.width),
    observations:extraction.observations,sourceClasses:extraction.classes,
    sourceAxes:extraction.axes,unresolvedNavigation:extraction.links.filter(x=>!x.startsWith("#")).sort()};
}
export function semanticMapper(analysis,registry) {
  const classes=new Set(analysis.sourceClasses);
  return {matchedComponents:registry.components.filter(x=>classes.has(x.contract?.replace(/^class:/,"")||x.id)).map(x=>x.id),
    matchedPatterns:registry.patterns.filter(x=>classes.has(x.id)).map(x=>x.id),
    matchedLayouts:registry.layouts.filter(x=>classes.has(x)).sort(),
    unmatchedSourceClasses:[...classes].filter(x=>
      !registry.components.some(k=>k.id===x||k.contract==="class:"+x) &&
      !registry.patterns.some(k=>k.id===x) && !registry.layouts.includes(x)).sort(),
    observedAxisAttributes:analysis.sourceAxes,
    status:"OBSERVED_NOT_MIGRATED"};
}
export function designNormalizer(inv,extraction,snapshot,registry,analysis,mapping) {
  return {schemaVersion:"1.0.0-preview",kind:"legacy-website-observation",status:"NOT_A_STRENGTH_FIRST_APPROVAL",
    source:{file:inv.name,sha256:inv.sha256,language:extraction.language,title:extraction.title},
    sourceInventory:snapshot.sources,
    designSystem:{package:registry.package,profile:registry.profile,sourceHashes:registry.sourceHashes},
    analysis,semanticMapping:mapping,
    output:{mode:"ISOLATED_LEGACY_SNAPSHOT",html:"element.html",webComponent:"element.mjs"},
    decisions:{inferredDesignChoices:[],requiredHumanChecks:["SOURCE_RIGHTS","FACTUAL_CLAIMS","INTERACTIONS","ACCESSIBILITY","VISUAL_REGRESSION","RESPONSIVE_BEHAVIOUR","DESIGN_SYSTEM_RELEASE_PIN"]},
    publication:"BLOCKED"};
}
export function schemaValidation(spec) {
  assert(spec.schemaVersion==="1.0.0-preview" && spec.kind==="legacy-website-observation", "E_SPEC_VERSION");
  assert(spec.publication==="BLOCKED" && spec.decisions.inferredDesignChoices.length===0, "E_SPEC_RELEASE");
  assert(typeof spec.source.sha256==="string" && /^[a-f0-9]{64}$/.test(spec.source.sha256), "E_SPEC_SOURCE_SHA");
  assert(spec.output.mode==="ISOLATED_LEGACY_SNAPSHOT", "E_SPEC_OUTPUT");
  return {status:"PARTIAL_SCHEMA_CHECKED",fullStrengthFirstSchema:"NOT_APPLIED",publication:"BLOCKED"};
}
export function compositionAgent(spec,snapshot) {
  schemaValidation(spec);
  const tag="legacy-site-" + spec.source.sha256.slice(0,12);
  assert(safeName.test(tag), "E_CUSTOM_ELEMENT_NAME");
  const js=[
    "/* Generated static legacy snapshot. No imported code executed inside iframe. */",
    "const tag=" + JSON.stringify(tag) + ";",
    "if (!customElements.get(tag)) customElements.define(tag,class extends HTMLElement {",
    " connectedCallback() { if(this.firstChild) return;",
    " const frame=document.createElement('iframe'); frame.title=" + JSON.stringify(spec.source.title||"Übernommene Website") + ";",
    " frame.setAttribute('sandbox','allow-same-origin'); frame.setAttribute('loading','lazy');",
    " frame.style.width='100%';frame.style.border='0';frame.style.display='block';frame.style.minHeight='320px';",
    " frame.src=new URL('./element.html',import.meta.url).href;this.append(frame);",
    " frame.addEventListener('load',()=>{try{const doc=frame.contentDocument;",
    " if(!doc)return;const resize=()=>{frame.style.height=Math.max(320,doc.documentElement.scrollHeight,doc.body?.scrollHeight||0)+'px'};",
    " resize();const obs=new ResizeObserver(resize);obs.observe(doc.documentElement);",
    " }catch{frame.style.height='70vh'}});",
    " }",
    "});",
    "export const elementTag=tag;",
    ""
  ].join("\n");
  return {tag,files:new Map([...snapshot.files,
    ["element.html",Buffer.from(snapshot.html)],["element.mjs",Buffer.from(js)],
    ["specification.json",Buffer.from(canonical(spec))]])};
}
export async function visualRegression(sourceHtml,outputHtml,viewportWidths=[390,1280]) {
  const {PNG}=await import("pngjs");
  const pixelmatch=(await import("pixelmatch")).default;
  const {browser,context}=await guardedBrowser();
  const cases=[];
  try {
    for(const width of viewportWidths) {
      const page=await context.newPage();
      await page.setViewportSize({width,height:900});
      const images=[];
      for(const file of [sourceHtml,outputHtml]) {
        await page.goto(pathToFileURL(path.resolve(file)).href,{waitUntil:"load"});
        await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});
        images.push(PNG.sync.read(await page.screenshot({fullPage:true,animations:"disabled"})));
      }
      const [a,b]=images;
      const sizesMatch=a.width===b.width&&a.height===b.height;
      const changed=sizesMatch?pixelmatch(a.data,b.data,null,a.width,a.height,{threshold:0.05}):null;
      cases.push({width,sizesMatch,differentPixels:changed,status:sizesMatch&&changed===0?"PASS":"FAIL"});
      await page.close();
    }
  } finally {await context.close();await browser.close();}
  return {status:cases.every(x=>x.status==="PASS")?"PASS":"FAIL",cases};
}
export async function runPipeline({input,out,repoRoot,verifyVisual=false}) {
  const inv=await sourceInventory(input);
  const registry=await designRegistry(repoRoot);
  const extracted=await designExtractor(inv);
  const snapshot=await collectSnapshot(inv,extracted);
  const analysis=designAnalyzer(extracted);
  const mapping=semanticMapper(analysis,registry);
  const spec=designNormalizer(inv,extracted,snapshot,registry,analysis,mapping);
  const composition=compositionAgent(spec,snapshot);
  const dest=path.resolve(out);
  assert(!dest.startsWith(inv.root+path.sep) && dest!==inv.root && !repoRoot.startsWith(dest+path.sep), "E_OUTPUT_OVERLAPS_INPUT");
  try {await fs.lstat(dest);throw new Error("E_OUTPUT_ALREADY_EXISTS");} catch(e){if(e.code!=="ENOENT")throw e;}
  // Atomic staging prevents half-populated output being mistaken for a valid element.
  const parent=path.dirname(dest);
  await fs.mkdir(parent,{recursive:true});
  const stage=await fs.mkdtemp(path.join(parent,".legacy-stage-"));
  let promoted=false;
  try {
    for(const [name,bytes] of composition.files){
      const target=path.join(stage,name);
      await fs.mkdir(path.dirname(target),{recursive:true});
      await fs.writeFile(target,bytes);
    }
    let qa={status:"NOT_RUN",reason:"Browser comparison must be requested explicitly"};
    if(verifyVisual) {
      qa=await visualRegression(inv.input,path.join(stage,"element.html"));
      assert(qa.status==="PASS","E_VISUAL_REGRESSION_FAILED: "+canonical(qa));
    }
    const report={status:"PREVIEW_ONLY",publication:"BLOCKED",elementTag:composition.tag,
      specificationSha256:sha(composition.files.get("specification.json")),
      outputFiles:Object.fromEntries([...composition.files].map(([k,v])=>[k,sha(v)]).sort()),
      schemaValidation:schemaValidation(spec),visualRegression:qa};
    await fs.writeFile(path.join(stage,"BUILD-REPORT.json"),canonical(report));
    await fs.rename(stage,dest);promoted=true;
    return report;
  } finally {if(!promoted)await fs.rm(stage,{recursive:true,force:true});}
}
