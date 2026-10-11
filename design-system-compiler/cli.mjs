#!/usr/bin/env node
import path from "node:path";
import {runPipeline} from "./core.mjs";

function parse(args) {
  const values={visual:false};
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(arg==="--visual"){values.visual=true;continue;}
    if(!["--source","--out","--repo-root"].includes(arg)||!args[i+1])
      throw new Error("E_CLI_ARGUMENT: "+arg);
    values[arg.slice(2)]=args[++i];
  }
  if(!values.source||!values.out)throw new Error("Usage: node design-system-compiler/cli.mjs --source legacy/index.html --out output [--visual] [--repo-root .]");
  return values;
}
try {
  const a=parse(process.argv.slice(2));
  const result=await runPipeline({
    input:path.resolve(a.source),out:path.resolve(a.out),
    repoRoot:path.resolve(a["repo-root"]||new URL("..",import.meta.url).pathname),
    verifyVisual:a.visual
  });
  console.log(JSON.stringify(result,null,2));
} catch(error) {
  console.error(String(error?.message||error));
  process.exitCode=2;
}
