#!/usr/bin/env node
/**
 * Rendered-Check Orchestrator
 * ============================
 *
 * Führt den pixelgenauen Visual-Check isoliert aus und danach a11y +
 * journeys parallel. Jedes Skript läuft in einem eigenen Subprocess mit
 * eigener Chrome-Instanz. Der VRT-Runner teilt dabei keine CPU-/Compositor-
 * Last mit zwei weiteren Chrome-Instanzen: unter CI-Last konnten sonst
 * Offscreen-Flächen trotz geladenem DOM unterschiedlich gerastert werden.
 *
 * Zeit-Einsparung gegenüber komplett seriell: a11y und journeys laufen
 * weiterhin gleichzeitig. VRT-Stabilität hat Vorrang vor maximalem Parallelismus.
 *
 * Peak: höchstens 2 Chrome-Instanzen gleichzeitig (a11y + journeys).
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
  console.log(`Rendered-Checks (${SERIAL ? "serial" : "VRT isolated, a11y/journeys parallel"}):`);
  console.log("");

  const start = Date.now();
  let results;

  if (SERIAL) {
    results = [];
    for (const s of SCRIPTS) results.push(await runScript(s));
  } else {
    const visual = SCRIPTS.find((script) => script.name === "visual");
    const remaining = SCRIPTS.filter((script) => script.name !== "visual");
    results = [await runScript(visual), ...await Promise.all(remaining.map(runScript))];
  }

  const totalDur = ((Date.now() - start) / 1000).toFixed(1);
  console.log("");
  console.log(`Total: ${totalDur}s (${SERIAL ? "sequential" : "VRT isolated"})`);

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
