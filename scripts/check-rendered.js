#!/usr/bin/env node
/**
 * Rendered-Check Orchestrator
 * ============================
 *
 * Führt die drei Puppeteer-basierten Checks (a11y, visual, journeys)
 * parallel aus. Jedes Skript läuft in einem eigenen Subprocess mit
 * eigener Chrome-Instanz — damit teilen sie keine State-Verschmutzung
 * untereinander, aber laufen gleichzeitig statt sequentiell.
 *
 * Zeit-Einsparung: sequentiell (a11y 3s + visual 12s + journeys 5s ≈ 20s)
 * → parallel (max = visual ≈ 12s). Spart ~8s pro check:full-Run.
 *
 * Memory-Trade-Off: 3 Chrome-Instanzen gleichzeitig (~600MB-1GB peak).
 * Akzeptabel auf Dev-Maschinen + Standard-CI-Runnern (2GB+).
 *
 * Stdout/Stderr werden gemultiplext mit Skript-Präfix für Lesbarkeit.
 * Exit-Code: 0 wenn alle grün, 1 wenn mindestens einer rot.
 *
 * Usage:
 *   node scripts/check-rendered.js
 *   node scripts/check-rendered.js --serial     (sequentiell statt parallel)
 */

const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SERIAL = process.argv.includes("--serial");

const SCRIPTS = [
  { name: "a11y",     file: "scripts/check-a11y.js",     tag: "[A11Y]   " },
  { name: "visual",   file: "scripts/check-visual.js",   tag: "[VISUAL] " },
  { name: "journeys", file: "scripts/check-journeys.js", tag: "[JOURNEY]" },
];

function runScript({ name, file, tag }) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn("node", [file], { cwd: ROOT });

    const prefixLines = (chunk, isErr) => {
      const lines = chunk.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        (isErr ? process.stderr : process.stdout).write(`${tag} ${line}\n`);
      }
    };

    child.stdout.on("data", (c) => prefixLines(c, false));
    child.stderr.on("data", (c) => prefixLines(c, true));

    child.on("exit", (code) => {
      const dur = ((Date.now() - start) / 1000).toFixed(1);
      const status = code === 0 ? "ok" : "fail";
      console.log(`${tag} ${status} in ${dur}s`);
      resolve({ name, code, dur: parseFloat(dur) });
    });
  });
}

async function main() {
  console.log(`Rendered-Checks (${SERIAL ? "serial" : "parallel"}):`);
  console.log("");

  const start = Date.now();
  let results;

  if (SERIAL) {
    results = [];
    for (const s of SCRIPTS) results.push(await runScript(s));
  } else {
    results = await Promise.all(SCRIPTS.map(runScript));
  }

  const totalDur = ((Date.now() - start) / 1000).toFixed(1);
  console.log("");
  console.log(`Total: ${totalDur}s (${SERIAL ? "sequential" : "parallel"})`);

  const failed = results.filter((r) => r.code !== 0);
  if (failed.length > 0) {
    console.error(`${failed.length} check(s) failed: ${failed.map((r) => r.name).join(", ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("check-rendered crashed:", err);
  process.exit(2);
});
