/**
 * Lädt js/layout-rules.ts für Node-Skripte (Tests, Checks) als CommonJS.
 * dist/js ist ESM; so prüfen die Skripte dieselbe Quelle, die das CMS nutzt.
 */
const path = require("node:path");
const esbuild = require("esbuild");

const out = esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, "..", "js", "layout-rules.ts")],
  bundle: true, format: "cjs", platform: "node", write: false,
});
const mod = { exports: {} };
new Function("module", "exports", out.outputFiles[0].text)(mod, mod.exports);
module.exports = mod.exports;
