import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {sourceInventory,designRegistry,designExtractor,collectSnapshot,designAnalyzer,
 semanticMapper,designNormalizer,schemaValidation,runPipeline} from "../core.mjs";

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const source=path.join(repo,"design-system-compiler/tests/fixtures/old-site/index.html");
async function work(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"design-compiler-test-"));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  return root;
}

test("Existing DesignSystem roles and tokens are reused, not recopied",async()=>{
 const reg=await designRegistry(repo);
 assert.equal(reg.profile,"builder");
 assert.ok(reg.components.some(x=>x.id==="card"));
 assert.ok(reg.patterns.some(x=>x.id==="editorial-split"));
 assert.ok(reg.layouts.includes("container"));
 assert.ok(reg.tokens.includes("--layout-gap"));
 assert.equal(reg.axes.space[0],"normal");
});
test("Old page becomes deterministic specification and reusable element",async(t)=>{
 const root=await work(t); const out=path.join(root,"out");
 const report=await runPipeline({input:source,out,repoRoot:repo});
 assert.equal(report.publication,"BLOCKED");
 assert.equal(report.visualRegression.status,"NOT_RUN");
 assert.match(report.elementTag,/^legacy-site-[a-f0-9]{12}$/);
 const spec=JSON.parse(await fs.readFile(path.join(out,"specification.json"),"utf8"));
 assert.equal(schemaValidation(spec).status,"PARTIAL_SCHEMA_CHECKED");
 assert.ok(spec.semanticMapping.matchedComponents.includes("card"));
 assert.ok(spec.semanticMapping.matchedLayouts.includes("container"));
 assert.ok(spec.semanticMapping.unmatchedSourceClasses.includes("legacy-panel"));
 assert.deepEqual(spec.decisions.inferredDesignChoices,[]);
 assert.ok(spec.analysis.observations.some(x=>x.width===390));
 const html=await fs.readFile(path.join(out,"element.html"),"utf8");
 assert.match(html,/\.legacy-panel\s*\{/);
 assert.match(html,/Eine bestehende Seite/);
 assert.doesNotMatch(html,/rel="stylesheet"/);
 const js=await fs.readFile(path.join(out,"element.mjs"),"utf8");
 assert.match(js,/allow-same-origin/);
 assert.match(js,/customElements\.define/);
});
test("Source input is preserved and existing output cannot be overwritten",async(t)=>{
 const root=await work(t),out=path.join(root,"out");
 const original=await fs.readFile(source);
 await runPipeline({input:source,out,repoRoot:repo});
 assert.deepEqual(await fs.readFile(source),original);
 await assert.rejects(runPipeline({input:source,out,repoRoot:repo}),/E_OUTPUT_ALREADY_EXISTS/);
});
test("Unsafe scripts and remote stylesheets are rejected without output",async(t)=>{
 const root=await work(t),file=path.join(root,"index.html");
 await fs.writeFile(file,'<html><body><script>alert(1)</script></body></html>');
 const out=path.join(root,"out");
 await assert.rejects(runPipeline({input:file,out,repoRoot:repo}),/E_ACTIVE_OR_UNSAFE_HTML/);
 await assert.rejects(fs.stat(out),{code:"ENOENT"});
 await fs.writeFile(file,'<html><head><link rel="stylesheet" href="https://evil.example/a.css"></head><body>hello</body></html>');
 await assert.rejects(runPipeline({input:file,out,repoRoot:repo}),/E_SOURCE_EXTERNAL_OR_ROOTED/);
});
test("CSS local asset is pinned, emitted with hash, no remote imports",async(t)=>{
 const root=await work(t),input=path.join(root,"input"),styles=path.join(input,"styles");
 await fs.mkdir(styles,{recursive:true});
 await fs.writeFile(path.join(input,"index.html"),'<html><head><link rel="stylesheet" href="styles/page.css"></head><body><h1>Hello</h1></body></html>');
 await fs.writeFile(path.join(styles,"page.css"),'body{background-image:url("../dot.png")}');
 const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLh9AAAAABJRU5ErkJggg==","base64");
 await fs.writeFile(path.join(input,"dot.png"),png);
 const report=await runPipeline({input:path.join(input,"index.html"),out:path.join(root,"out"),repoRoot:repo});
 assert.ok(Object.keys(report.outputFiles).some(x=>/^assets\/[0-9a-f]{64}\.png$/.test(x)));
 const html=await fs.readFile(path.join(root,"out/element.html"),"utf8");
 assert.match(html,/background-image:url\("assets\/[a-f0-9]{64}\.png"\)/);
});
test("Old page and extracted element are pixel-identical in Chromium at two widths",async(t)=>{
 const root=await work(t);
 const result=await runPipeline({input:source,out:path.join(root,"out"),repoRoot:repo,verifyVisual:true});
 assert.equal(result.visualRegression.status,"PASS",JSON.stringify(result.visualRegression));
 assert.deepEqual(result.visualRegression.cases.map(x=>x.width),[390,1280]);
});
