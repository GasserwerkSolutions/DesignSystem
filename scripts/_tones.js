/**
 * Single source of truth für die Tone-Achse.
 * ==========================================
 *
 * Liest die Theme-Imports aus main.css. Jeder ausgelieferte Tone läuft damit
 * automatisch durch Kontrast-, Browser-Kontrast- und Visual-Gates — ein neuer
 * Tone kann nicht mehr an einer hart kodierten Liste vorbei veröffentlicht
 * werden (so geschehen mit `musikraum` bis v0.32.0).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function readTones(root = ROOT) {
  const css = fs.readFileSync(path.join(root, "main.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  const tones = [];
  for (const m of css.matchAll(/@import\s+["']\.?\/?themes\/([a-z0-9-]+)\.css["']\s+layer\(\s*themes\s*\)/g)) {
    tones.push(m[1]);
  }
  if (tones.length === 0) throw new Error("[_tones] Keine Theme-Imports in main.css gefunden.");

  // Jede Datei in themes/ muss importiert sein — sonst existiert ein Tone,
  // den kein Gate sieht.
  const onDisk = fs.readdirSync(path.join(root, "themes"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => f.slice(0, -4));
  const orphaned = onDisk.filter((t) => !tones.includes(t));
  if (orphaned.length > 0) {
    throw new Error(`[_tones] themes/ enthält nicht importierte Tones: ${orphaned.join(", ")}`);
  }
  return tones;
}

module.exports = { TONES: readTones(), readTones };
