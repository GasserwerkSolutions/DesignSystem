#!/usr/bin/env node
/**
 * Package-Coverage-Check
 * ======================
 *
 * Verifiziert dass alle @imports in main.css im npm-Tarball enthalten sind.
 * Verhindert silent broken installs bei Konsumenten — wenn package.json:files
 * einen Pfad nicht listet, der von main.css importiert wird, bricht die
 * Library bei jedem `import "@gws/design-system"`.
 *
 * Hatten wir mit state/ (v0.10.0): state/ war in main.css importiert, aber
 * nicht in package.json:files gelistet. Dieser Check hätte das gefangen.
 *
 * Läuft `npm pack --dry-run --json` und matched gegen alle @imports in
 * main.css. Exit 1 wenn etwas fehlt.
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

const mainCss = fs.readFileSync(path.join(ROOT, "main.css"), "utf8");
const importPaths = [
  ...mainCss.matchAll(/@import\s+["']\.\/([^"']+)["']/g),
].map((m) => m[1]);

if (!importPaths.length) {
  console.error("[check-package] keine @imports in main.css gefunden — verdächtig.");
  process.exit(1);
}

/* npm pack führt den prepare-Hook aus (in npm v11 trotz --ignore-scripts),
   dessen Output mit dem JSON gemixed wird. "[" als Anker reicht nicht —
   z.B. "[tsc] compile..." vom build-Output beginnt auch mit "[". Wir
   anchor an "[{" (Array-Start + Object-Start) und den letzten "}]" (das
   ist eindeutig der JSON-Trailer). */
const rawOutput = execSync("npm pack --dry-run --json", {
  cwd: ROOT,
  stdio: ["ignore", "pipe", "ignore"],
}).toString();
/* JSON ist eingerückt formatiert: "[\n  {\n    \"id\":...". Wir splitten
   am ersten "[\n" als Anker und parsen den Rest. */
const idx = rawOutput.search(/^\[\s*$/m);
if (idx < 0) {
  console.error("[check-package] konnte JSON-Block aus npm-pack-Output nicht extrahieren.");
  console.error("Erste 200 Zeichen:", rawOutput.slice(0, 200));
  process.exit(1);
}
const data = JSON.parse(rawOutput.slice(idx))[0];
const tarballPaths = new Set(data.files.map((f) => f.path));

const missing = importPaths.filter((p) => !tarballPaths.has(p));

console.log(`[check-package] ${importPaths.length} @imports geprüft.`);
if (missing.length) {
  console.error(
    `[check-package] ${missing.length} @import-Target(s) fehlen im Tarball:`
  );
  for (const p of missing) console.error(`  - ${p}`);
  console.error("  Fix: package.json:files erweitern.");
  process.exit(1);
}
console.log(`  [ok] alle Imports in package.json:files enthalten.`);

/* Zusätzlich: exports map. Jeder Pfad in exports MUSS im Tarball sein. */
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const exportTargets = [];
const collectTargets = (val) => {
  if (typeof val === "string") {
    if (val.startsWith("./")) exportTargets.push(val.slice(2));
  } else if (val && typeof val === "object") {
    for (const v of Object.values(val)) collectTargets(v);
  }
};
collectTargets(pkg.exports || {});

const missingExports = exportTargets.filter((p) => {
  if (p.includes("*")) {
    /* Wildcards (./components/*): prüfe nur Existenz des Präfix-Dirs */
    const prefix = p.split("*")[0];
    return ![...tarballPaths].some((tp) => tp.startsWith(prefix));
  }
  return !tarballPaths.has(p);
});

if (missingExports.length) {
  console.error(
    `[check-package] ${missingExports.length} exports-Target(s) fehlen im Tarball:`
  );
  for (const p of missingExports) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`  [ok] alle ${exportTargets.length} exports-Targets im Tarball.`);
