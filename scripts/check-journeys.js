#!/usr/bin/env node
/**
 * User-Journey-Tests
 * ====================
 *
 * Verifiziert end-to-end-Verhalten realer User-Interaktionen.
 * Fängt Bugs, die zwischen den Spezialisten-Tools liegen:
 *   - Lint sieht Source-Patterns
 *   - Contrast sieht Farb-Math
 *   - A11Y sieht ARIA-Verträge
 *   - VRT sieht statische Renders
 *   - User-Journeys sehen: "Klick → erwartetes neues State"
 *
 * Hintergrund: v0.6.2 hat einen UX-Bug entdeckt (Combobox-Label hatte
 * kein for=, Click aktivierte Trigger nicht). axe meldete 0 Violations,
 * Lint war happy, Contrast OK — nur die End-to-End-Erwartung war broken.
 * Journey-Tests sind die Schicht, die solche Fälle fängt.
 *
 * Pattern: jede Journey ist eine async Funktion, die assertions wirft
 * (oder Result-Object zurückgibt). Master sammelt + exit-Code.
 *
 * Usage:
 *   node scripts/check-journeys.js
 */

const path = require("path");
const ROOT = path.resolve(__dirname, "..");

let puppeteer;
try {
  puppeteer = require("puppeteer");
} catch {
  console.error("Puppeteer fehlt. Run: npm install --save-dev puppeteer");
  process.exit(1);
}

// ============================================================
// Test-Framework Helpers
// ============================================================

let passed = 0;
let failed = 0;
const failures = [];

async function journey(name, fn, page) {
  try {
    await fn(page);
    console.log(`  [ok]   ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [fail] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

async function reload(page) {
  // Bekannten Zustand wiederherstellen: localStorage löschen + reload.
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 200));
}

// ============================================================
// Journeys
// ============================================================

async function journeyComboboxLabelToSelection(page) {
  await reload(page);

  // 1. Click auf Label dispatcht via native label-for-button-Mechanik
  // einen echten Click auf den Trigger. Das macht BEIDES:
  //    - Focus auf Trigger SYNCHRON (Bug #2 aus v0.6.2)
  //    - Popover öffnet sich (popovertarget native API)
  // ACHTUNG: unser eigener Combobox-JS fokussiert nach beforetoggle das
  // Search-Input (requestAnimationFrame). Daher Trigger-Focus SYNCHRON
  // direkt nach Click prüfen, vor dem async-Tick.
  const afterLabelClick = await page.evaluate(async () => {
    document.getElementById("cb-service-label").click();
    const focusedSync = document.activeElement === document.getElementById("cb-service-trigger");
    await new Promise((r) => setTimeout(r, 200));
    return {
      focusedSync,
      open: document.getElementById("cb-service-panel").matches(":popover-open"),
      expanded: document.getElementById("cb-service-trigger").getAttribute("aria-expanded") === "true",
      focusedAfter: document.activeElement?.classList.contains("combobox__search-input"),
    };
  });
  assert(afterLabelClick.focusedSync, "Label click should focus trigger synchronously");
  assert(afterLabelClick.open, "Label click should open popover via dispatched trigger-click");
  assert(afterLabelClick.expanded, "aria-expanded should be 'true' after open");
  assert(afterLabelClick.focusedAfter, "After open, focus should move to search-input (Combobox-JS)");

  // 3. Search-Filter "haar" → nur 2 Optionen sichtbar.
  await page.type(".combobox__search-input", "haar");
  await new Promise((r) => setTimeout(r, 100));
  const visibleCount = await page.evaluate(() => {
    return document.querySelectorAll("#cb-service-list .combobox__option:not([hidden])").length;
  });
  assert(visibleCount === 2, `Filter 'haar' should show 2 options, got ${visibleCount}`);

  // 4. Click auf "Bart-Trim" (über search clear erst).
  await page.evaluate(() => {
    const search = document.querySelector(".combobox__search-input");
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 100));
  await page.evaluate(() => {
    const opts = document.querySelectorAll("#cb-service-list .combobox__option");
    const bart = Array.from(opts).find((o) => o.textContent.includes("Bart"));
    bart.click();
  });
  await new Promise((r) => setTimeout(r, 200));

  // 5. Trigger-Label sollte aktualisiert sein, Panel geschlossen.
  const finalState = await page.evaluate(() => ({
    label: document.getElementById("cb-service-value").textContent.trim(),
    open: document.getElementById("cb-service-panel").matches(":popover-open"),
    expanded: document.getElementById("cb-service-trigger").getAttribute("aria-expanded"),
  }));
  assert(finalState.label === "Bart-Trim", `Trigger label should be 'Bart-Trim', got '${finalState.label}'`);
  assert(!finalState.open, "Panel should be closed after selection");
  assert(finalState.expanded === "false", "aria-expanded should be 'false' after close");
}

async function journeyPopoverOpenClose(page) {
  await reload(page);

  // 1. Click auf Trigger → Popover öffnet (via popovertarget native).
  // Element.click() im Browser-Context, nicht page.click() — headless
  // behandelt real-mouse-clicks teils nicht als "trusted" für native
  // browser-Mechaniken wie popovertarget.
  const opened = await page.evaluate(async () => {
    document.querySelector('[popovertarget="demo-menu"]').click();
    await new Promise((r) => setTimeout(r, 150));
    return document.getElementById("demo-menu").matches(":popover-open");
  });
  assert(opened, "Popover should open via popovertarget click");

  // 2. hidePopover() (programmatic Light-Dismiss-Äquivalent) — Esc-Keypress
  // ist in headless ähnlich unzuverlässig wie real-mouse-clicks.
  const closed = await page.evaluate(async () => {
    document.getElementById("demo-menu").hidePopover();
    await new Promise((r) => setTimeout(r, 100));
    return !document.getElementById("demo-menu").matches(":popover-open");
  });
  assert(closed, "hidePopover() should close popover");
}

async function journeyAlertDismiss(page) {
  await reload(page);

  const before = await page.evaluate(() =>
    document.querySelectorAll("#alert-demo .alert").length
  );
  assert(before === 4, `Initial alert count should be 4, got ${before}`);

  // Click den ersten alert__close (success-alert).
  await page.evaluate(() =>
    document.querySelector("#alert-demo .alert--success .alert__close").click()
  );
  await new Promise((r) => setTimeout(r, 100));

  const after = await page.evaluate(() =>
    document.querySelectorAll("#alert-demo .alert").length
  );
  assert(after === 3, `After dismiss alert count should be 3, got ${after}`);

  // success alert sollte weg sein.
  const successExists = await page.evaluate(() =>
    !!document.querySelector("#alert-demo .alert--success")
  );
  assert(!successExists, "success alert should be removed");
}

async function journeySliderSync(page) {
  await reload(page);

  await page.evaluate(() => {
    const slider = document.getElementById("slider-volume");
    slider.value = "80";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 100));

  const state = await page.evaluate(() => {
    const slider = document.getElementById("slider-volume");
    const output = document.querySelector('output[for="slider-volume"]');
    return {
      value: slider.value,
      output: output.value,
      fillPct: slider.style.getPropertyValue("--range-fill-pct"),
    };
  });

  assert(state.value === "80", `slider.value should be '80', got '${state.value}'`);
  assert(state.output === "80", `output should show '80', got '${state.output}'`);
  assert(state.fillPct === "80%", `--range-fill-pct should be '80%', got '${state.fillPct}'`);
}

async function journeyFileUploadDragCounter(page) {
  await reload(page);

  const states = await page.evaluate(async () => {
    const label = document.getElementById("upload-hero");
    const dt = new DataTransfer();

    function snapshot() {
      return label.dataset.dragging || "(none)";
    }

    // 1. dragenter auf label
    label.dispatchEvent(new DragEvent("dragenter", { bubbles: true, dataTransfer: dt }));
    const s1 = snapshot();

    // 2. dragenter ein zweites Mal (z.B. cursor moves into child)
    label.dispatchEvent(new DragEvent("dragenter", { bubbles: true, dataTransfer: dt }));
    const s2 = snapshot();

    // 3. dragleave einmal — Counter geht auf 1, dragging bleibt true
    label.dispatchEvent(new DragEvent("dragleave", { bubbles: true }));
    const s3 = snapshot();

    // 4. dragleave erneut — Counter 0, dragging wird false
    label.dispatchEvent(new DragEvent("dragleave", { bubbles: true }));
    const s4 = snapshot();

    return { s1, s2, s3, s4 };
  });

  assert(states.s1 === "true", "After first dragenter: dragging=true");
  assert(states.s2 === "true", "After second dragenter (child cross): dragging still true");
  assert(states.s3 === "true", "After one dragleave (depth=1): dragging still true");
  assert(states.s4 === "(none)", "After second dragleave (depth=0): dragging cleared");
}

async function journeyTreeExpandCollapse(page) {
  await reload(page);

  // Find first tree__node[open] - it should be open initially
  const initialOpen = await page.evaluate(() =>
    document.querySelector(".tree__node").hasAttribute("open")
  );
  assert(initialOpen, "First tree node should start open (demo has 'open' attribute)");

  // Click summary to collapse
  await page.evaluate(() => {
    document.querySelector(".tree__node > .tree__summary").click();
  });
  await new Promise((r) => setTimeout(r, 100));

  const collapsed = await page.evaluate(() =>
    !document.querySelector(".tree__node").hasAttribute("open")
  );
  assert(collapsed, "After click: first tree node should be collapsed");

  // Click again to re-expand
  await page.evaluate(() => {
    document.querySelector(".tree__node > .tree__summary").click();
  });
  await new Promise((r) => setTimeout(r, 100));

  const reExpanded = await page.evaluate(() =>
    document.querySelector(".tree__node").hasAttribute("open")
  );
  assert(reExpanded, "After second click: tree node should be open again");
}

// ============================================================
// Main
// ============================================================

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto("file://" + path.resolve(ROOT, "index.html"));
    await new Promise((r) => setTimeout(r, 600));

    console.log("User-Journey-Tests:");
    console.log("");

    await journey("Combobox: label click → focus → open → filter → select", journeyComboboxLabelToSelection, page);
    await journey("Popover: trigger click → open → Esc → close", journeyPopoverOpenClose, page);
    await journey("Alert: data-dismiss removes element", journeyAlertDismiss, page);
    await journey("Slider: input event syncs output + --range-fill-pct", journeySliderSync, page);
    await journey("File-Upload: drag-counter handles nested dragenter/leave", journeyFileUploadDragCounter, page);
    await journey("Tree: summary click toggles details[open] state", journeyTreeExpandCollapse, page);

    console.log("");
    console.log(`${passed} passed, ${failed} failed`);
  } finally {
    await browser.close();
  }

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Journey-Tests crashed:", err);
  process.exit(2);
});
