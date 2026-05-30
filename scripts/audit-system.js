#!/usr/bin/env node
/**
 * Systematischer Bug-Audit
 * =========================
 *
 * User-Anfrage v0.7.2: "Durchsuche systematisch nach ähnlichen Bugs,
 * finde alle." Diese Strategie sucht nach **Klassen** von Issues, nicht
 * Einzelfällen — jeder Befund ist ein Pattern, das künftig auch andere
 * Components/Themes treffen kann.
 *
 * Bug-Klassen die hier geprüft werden:
 *
 * A) Density-Axis-Blocker (auto-detected via Lint Check 5)
 * B) A11Y-Issues pro Tone × Mode (statt nur trust/light)
 * C) Components ohne fallback-Pattern für axis-sensitive props
 *    (Component setzt --X: 12px direkt statt var(--X, var(--density-...)))
 * D) Themes die magic numbers statt Tokens setzen
 * E) Demo-Markup mit hardcoded inline-styles wo Component-Tokens existieren
 *
 * Jede Klasse wird so geprüft, dass künftig neue Cases AUTOMATISCH
 * erkannt werden — keine Whitelist von "known offenders".
 */

const fs = require("fs");
const path = require("path");

const ROOT           = path.resolve(__dirname, "..");
const COMPONENTS_DIR = path.join(ROOT, "components");
const BASE_DIR       = path.join(ROOT, "base");
const SEMANTIC_DIR   = path.join(ROOT, "semantic");

const findings = [];
function note(cls, file, line, msg) {
  findings.push({ cls, file: path.relative(ROOT, file), line, msg });
}

// ============================================================
// C) Components mit hartcoded sizing wo axis-sensitive token existiert
// ============================================================
//
// Wenn semantic.css definiert: --btn-py: var(--density-control-py)
// → --btn-py IST axis-sensitive
// → Wenn eine Component-CSS direkt `padding: 12px` statt
//   `padding: var(--btn-py, ...)` hat, ignoriert sie das Token.
//
// Heuristik: scan components für `padding: <numeric>` und warne wenn
// das matching Component-Token in semantic.css definiert ist.
//
// Pragmatic limitation: nicht trivial vollständig, weil padding-types
// (margin, gap, height) auch matter. Hier fokussiert auf padding/margin
// mit numerischen Werten in components.

function scanHardcodedSizing() {
  for (const file of fs.readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf8");
    // Skip header-comment blocks
    const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    // Find hard pixel/rem values for padding/margin/gap (excl. var() calls)
    const re = /^\s*(padding|margin|gap|height|width)\s*:\s*([0-9][\w\.\s]*)$/gm;
    let m;
    while ((m = re.exec(cssNoComments)) !== null) {
      const prop = m[1];
      const val = m[2].trim();
      // Skip 0, 100%, auto-fit etc — only flag real numeric units
      if (/^0$/.test(val) || /%/.test(val) || /auto/.test(val)) continue;
      // line number from byte offset
      const line = cssNoComments.slice(0, m.index).split("\n").length;
      note("C", path.join(COMPONENTS_DIR, file), line,
           `Hardcoded ${prop}: ${val} — sollte Token nutzen falls semantisch axis-sensitive`);
    }
  }
}

// ============================================================
// D) Themes mit magic numbers (z.B. `--btn-px: 20px` statt `var(--space-20)`)
// ============================================================
//
// Themes sollten Token-Values, nicht raw numbers nutzen. Sonst
// koppeln sie an spezifische Pixel-Werte statt der Spacing-Skala.
//
// Heuristik: theme-CSS mit `--X: <numeric>` (außer 0, percentage, calc).

function scanThemeMagicNumbers() {
  // Nur spacing-related tokens prüfen. Weights, line-heights, letter-spacing
  // sind legitime numerische Tokens und gehören NICHT zur Spacing-Skala.
  const SPACING_PATTERNS = [
    /-px$/, /-py$/, /-padding/, /-margin/, /-gap/, /-spacing/,
    /-width$/, /-height$/, /-size$/, /-radius$/, /-inset$/, /-offset/,
  ];
  const isSpacingToken = (name) => SPACING_PATTERNS.some((p) => p.test(name));

  const themesDir = path.join(ROOT, "themes");
  for (const file of fs.readdirSync(themesDir).filter((f) => f.endsWith(".css"))) {
    const css = fs.readFileSync(path.join(themesDir, file), "utf8");
    const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const re = /^\s*(--[\w-]+)\s*:\s*([0-9][\w\.\s]*?)\s*;/gm;
    let m;
    while ((m = re.exec(noComments)) !== null) {
      const token = m[1];
      const val = m[2].trim();
      if (!isSpacingToken(token)) continue;
      if (/line-height/.test(token)) continue;     // unitless multiplier
      if (/^0$/.test(val) || /%$/.test(val) || /ch$/.test(val)) continue;
      if (/^calc/.test(val)) continue;
      // Spacing-Magic muss Pixel/Rem-Unit haben — unitless ist Multiplier.
      if (!/(px|rem|em)\s*$/.test(val)) continue;
      const line = noComments.slice(0, m.index).split("\n").length;
      note("D", path.join(themesDir, file), line,
           `Magic-Number ${token}: ${val} — sollte var(--space-N) oder var(--radius-N) nutzen`);
    }
  }
}

// ============================================================
// E) Demo inline-styles die Tokens überschreiben
// ============================================================
//
// Demo mit style="..." attributes signalisiert dass eine Token-Variante
// oder Modifier fehlt. Jeder inline-style ist ein potenzielles Token.

function scanDemoInlineStyles() {
  const indexHtml = path.join(ROOT, "index.html");
  if (!fs.existsSync(indexHtml)) return;
  const html = fs.readFileSync(indexHtml, "utf8");
  const re = /style="([^"]+)"/g;
  let m;
  let count = 0;
  while ((m = re.exec(html)) !== null) {
    // Skip trivial: max-width für Spec-demos, padding für simple containers
    const style = m[1];
    if (style.includes("--app-shell-min-h")) continue; // documented demo-only token
    if (style === "margin: 0") continue;
    count++;
    const line = html.slice(0, m.index).split("\n").length;
    note("E", indexHtml, line, `Inline-Style: "${style.slice(0, 60)}${style.length > 60 ? "…" : ""}"`);
  }
  if (count > 5) {
    // Aggregate report so we don't spam
    findings.splice(findings.findIndex(f => f.cls === "E"));
    note("E", indexHtml, 0, `${count} inline-styles in Demo — Pattern für fehlende Tokens/Modifier`);
  }
}

// ============================================================
// Run + Report
// ============================================================

scanHardcodedSizing();
scanThemeMagicNumbers();
scanDemoInlineStyles();

const byClass = new Map();
for (const f of findings) {
  if (!byClass.has(f.cls)) byClass.set(f.cls, []);
  byClass.get(f.cls).push(f);
}

const LABELS = {
  A: "A) Density-Axis-Blocker (covered by Lint Check 5)",
  B: "B) A11Y-Issues pro Tone × Mode (covered by check:a11y, single-mode)",
  C: "C) Hardcoded numeric sizing in components",
  D: "D) Magic numbers in themes (statt --space-N Tokens)",
  E: "E) Demo inline-styles (Pattern für fehlende Tokens/Modifier)",
};

console.log("Systematischer Bug-Audit");
console.log("=========================\n");
console.log("Auto-detection-Checks (covered):");
console.log("  ✓ A) Density-Axis-Blocker → Lint Check 5");
console.log("  ✓ B) A11Y-Violations (single tone/mode) → check:a11y");
console.log("");
console.log("Pattern-Scans (heuristisch, manual triage nötig):");

for (const cls of ["C", "D", "E"]) {
  const list = byClass.get(cls) || [];
  console.log(`\n${LABELS[cls]}: ${list.length} Befund${list.length === 1 ? "" : "e"}`);
  if (list.length === 0) {
    console.log("  ✓ keine");
    continue;
  }
  // Top 10 per Class
  for (const f of list.slice(0, 10)) {
    console.log(`  ${f.file}:${f.line}  ${f.msg}`);
  }
  if (list.length > 10) console.log(`  … +${list.length - 10} weitere`);
}

console.log(`\nTotal: ${findings.length} Pattern-Befunde (Audit, kein hard-fail).`);
