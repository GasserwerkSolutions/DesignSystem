#!/usr/bin/env node
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {gitBlobSha,verifyRecord,inspect}=require("./verify-consolidation-inventory.js");

const root=path.resolve(__dirname,"..");
const data=JSON.parse(fs.readFileSync(path.join(root,"audit/two-source-inventory-2026-10.json"),"utf8"));
const baseline=inspect(data,root,null);
assert.equal(baseline.verdict,"PASS_SOURCE_BYTES_ONLY");
assert.equal(baseline.publication,"BLOCKED");
assert.equal(baseline.monorepoSourcePresent,false);
assert.equal(baseline.inventoryEntries,210);
assert.equal(baseline.canonicalFilesVerified,185);
assert.equal(baseline.monorepoFilesVerified,0);

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ds-inventory-negative-"));
try {
  const p=path.join(temp,"test.css");
  fs.writeFileSync(p,".good { color: red; }\n");
  const pin={gitBlobSha:gitBlobSha(fs.readFileSync(p)),bytes:fs.statSync(p).size};
  verifyRecord(temp,"test.css",pin,"negative fixture");
  fs.writeFileSync(p,".bad { color: red; }\n");
  assert.throws(()=>verifyRecord(temp,"test.css",pin,"negative fixture"),/source drift/);
  assert.throws(()=>verifyRecord(temp,"../elsewhere",pin,"negative fixture"),/unsafe path/);

  const forged=JSON.parse(JSON.stringify(data));
  const identical=forged.entries.find(x=>x.relation==="IDENTICAL");
  identical.monorepo.gitBlobSha="0000000000000000000000000000000000000000";
  assert.throws(()=>inspect(forged,root,null),/falsely identical/);

  const escape=JSON.parse(JSON.stringify(data));
  escape.entries[0].path="../outside";
  assert.throws(()=>inspect(escape,root,null),/unsafe path/);

  const publish=JSON.parse(JSON.stringify(data));
  publish.publication="ALLOWED";
  assert.throws(()=>inspect(publish,root,null),/invalid contract/);
} finally {fs.rmSync(temp,{recursive:true,force:true});}
console.log("[source-inventory] positive snapshot and four negative scenarios passed; release remains BLOCKED");
