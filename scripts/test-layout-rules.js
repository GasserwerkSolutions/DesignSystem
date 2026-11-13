#!/usr/bin/env node
/**
 * Tests für js/layout-rules.ts — die Entscheidungen, die ein CMS übernimmt.
 * Die Bildfälle stammen aus dem Test mit echtem Material (Masse und Bereiche),
 * nicht aus erfundenen Idealformaten.
 */
const assert = require("node:assert/strict");
const R = require("./_layout-rules");

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  [ok]   ${name}`); }
  catch (err) { console.error(`  [FAIL] ${name}\n         ${err.message}`); process.exitCode = 1; }
}

console.log("Layout-Rules Tests\n");

test("Frontansicht 4:3 hält im 4:3- und im 16:9-Rahmen", () => {
  const front = { w: 1280, h: 960 }, protect = R.parseProtect("0.08 0.16 0.87 0.50");
  assert.equal(R.fitImage(front, 4 / 3, protect).fit, "cover");
  assert.equal(R.fitImage(front, 16 / 9, protect, { x: 0.51, y: 0.41 }).fit, "cover");
});

test("Hallen-Panorama weicht in der 4:3-Karte auf contain aus", () => {
  const fit = R.fitImage({ w: 1280, h: 615 }, 4 / 3, R.parseProtect("0.05 0.1 0.9 0.8"));
  assert.equal(fit.fit, "contain");
  assert.match(fit.reason, /ganz gezeigt/);
});

test("Hochformat-Tor weicht in der 4:3-Karte aus; bestRatio findet das Hochformat oder keines", () => {
  const tor = { w: 987, h: 1579 };
  assert.equal(R.fitImage(tor, 4 / 3, R.parseProtect("0.1 0.05 0.8 0.85")).fit, "contain");
  assert.equal(R.bestRatio(tor, R.parseProtect("0.1 0.1 0.8 0.75")), "portrait");
  // Das Tor ist schmaler als 3:4: braucht die Aussage 85 % der Höhe, hält
  // kein Raster-Format. null heisst: media--natural (eigenes Format).
  assert.equal(R.bestRatio(tor, R.parseProtect("0.1 0.05 0.8 0.85")), null);
});

test("Fokus wird auf den geschützten Bereich verschoben, bevor contain greift", () => {
  const fit = R.fitImage({ w: 1280, h: 960 }, 1, R.parseProtect("0 0.2 0.6 0.6"), { x: 0.9, y: 0.5 });
  assert.equal(fit.fit, "cover");
  assert.ok(fit.focus.x < 0.2, `Fokus sollte links liegen, ist ${fit.focus.x}`);
});

test("Ohne geschützten Bereich wird gefüllt, aber als ungeprüft ausgewiesen", () => {
  const fit = R.fitImage({ w: 1280, h: 615 }, 4 / 3);
  assert.equal(fit.fit, "cover");
  assert.match(fit.reason, /nicht geprüft/);
});

test("visibleRegion: 4:3 im 16:9-Rahmen zeigt 75 % der Höhe", () => {
  const v = R.visibleRegion({ w: 1280, h: 960 }, 16 / 9, { x: 0.5, y: 0.41 });
  assert.ok(Math.abs(v.h - 0.75) < 1e-9 && v.w === 1);
  assert.ok(Math.abs(v.y - 0.25 * 0.41) < 1e-9);
});

test("planGallery füllt das Raster für jede Bildzahl lückenlos", () => {
  const expected = { 0: ["none", 0], 1: ["none", 1], 2: ["fit", 2], 3: ["fit", 3], 4: ["default", 4], 5: ["lead", 5],
    6: ["lead", 5], 7: ["lead", 5], 8: ["default", 8], 9: ["lead", 9], 10: ["lead", 9], 11: ["lead", 9],
    12: ["default", 12], 13: ["lead", 13], 14: ["lead", 13], 30: ["lead", 13] };
  for (const [n, [variant, show]] of Object.entries(expected)) {
    const plan = R.planGallery(Number(n));
    assert.deepEqual([plan.variant, plan.show, plan.rest], [variant, show, Number(n) - show], `n=${n}`);
    if (plan.variant === "lead") assert.equal(plan.show % 4, 1);
    if (plan.variant === "default") assert.equal(plan.show % 4, 0);
  }
});

test("planHero wählt nie Text auf dem Foto und verweigert zu kleine Bilder", () => {
  assert.equal(R.planHero(null).variant, "head-text-only");
  assert.equal(R.planHero({ natural: { w: 1200, h: 900 } }).variant, "head-text-only");
  assert.equal(R.planHero({ natural: { w: 987, h: 1579 } }, { minWidth: 900 }).variant, "head-text-only");
  const ok = R.planHero({ natural: { w: 2048, h: 1536 }, protect: R.parseProtect("0.08 0.16 0.87 0.5") });
  assert.equal(ok.variant, "head");
  assert.ok(!ok.className.includes("stage"));
});

test("stageLabels: Vorher/Nachher nur bei gleichem Standpunkt", () => {
  assert.deepEqual(R.stageLabels(true), ["Vorher", "Nachher"]);
  assert.deepEqual(R.stageLabels(false, ["Bestand", "Nach der Sanierung"]), ["Bestand", "Nach der Sanierung"]);
});

test("validatePage akzeptiert eine vollständige Projektseite", () => {
  const page = [
    { pattern: "hero", headingLevel: 1 }, { pattern: "project-facts" }, { pattern: "project-stages", headingLevel: 2 },
    { pattern: "legend-figure", headingLevel: 2 }, { pattern: "spec", headingLevel: 2 },
    { pattern: "gallery", headingLevel: 2 }, { pattern: "gallery", headingLevel: 3 }, { pattern: "cta-band", headingLevel: 2 },
  ];
  assert.deepEqual(R.validatePage(page), []);
});

test("validatePage meldet fehlenden Einstieg, Rhythmus, Galerien und nächsten Schritt", () => {
  const rules = (sections) => R.validatePage(sections).map((i) => i.rule).sort();
  assert.deepEqual(rules([{ pattern: "gallery", headingLevel: 2 }]), ["ein-seitentitel", "einstieg", "naechster-schritt"]);
  assert.deepEqual(rules([{ pattern: "hero", headingLevel: 1 }, { pattern: "hero" }, { pattern: "cta-band" }]), ["ein-kopf"]);
  assert.deepEqual(rules([{ pattern: "hero", headingLevel: 1 }, { pattern: "spec", headingLevel: 3 }, { pattern: "cta-band" }]), ["ueberschriften"]);
  assert.deepEqual(rules([{ pattern: "hero", headingLevel: 1 }, { pattern: "gallery", headingLevel: 2 }, { pattern: "gallery" }, { pattern: "cta-band" }]), ["galerien"]);
  assert.deepEqual(rules([{ pattern: "hero", headingLevel: 1 }, { pattern: "gallery", headingLevel: 2 }, { pattern: "project-stages", headingLevel: 2 },
    { pattern: "legend-figure", headingLevel: 2 }, { pattern: "cta-band" }]), ["rhythmus"]);
});

console.log(`\n${passed} bestanden${process.exitCode ? ", Fehler siehe oben" : ""}.`);
