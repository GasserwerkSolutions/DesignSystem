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

async function journeyGalleryLightbox(page) {
  // Eigene Seite: das Projektseiten-Pack lebt in examples/, nicht in der Demo.
  const p = await page.browser().newPage();
  try {
    await p.setViewport({ width: 1280, height: 900 });
    await p.goto("file://" + path.resolve(ROOT, "examples/holzbau-projekt.html"), { waitUntil: "load" });
    const state = await p.evaluate(async () => {
      const wait = () => new Promise((r) => setTimeout(r, 80));
      const dialog = document.querySelector("dialog.lightbox");
      const image = dialog.querySelector(".lightbox__image");
      const caption = dialog.querySelector(".lightbox__caption");
      // Erste Galerie der Seite; weitere Galerien teilen sich dieselbe Lightbox.
      const items = [...document.querySelector("[data-gallery]").querySelectorAll("a.gallery__item")];
      const key = (k) => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

      items[1].click();
      await wait();
      const opened = { open: dialog.open, src: image.src === items[1].href, caption: caption.textContent };
      key("ArrowRight");
      const next = image.src === items[2].href;
      key("End");
      const last = image.src === items[items.length - 1].href;
      const nextHiddenAtEnd = dialog.querySelector(".lightbox__nav--next").hidden;
      key("ArrowRight");
      const staysAtEnd = image.src === items[items.length - 1].href;
      dialog.querySelector(".lightbox__close").click();
      await wait();
      return {
        count: items.length, opened, next, last, nextHiddenAtEnd, staysAtEnd,
        closed: !dialog.open,
        focusReturned: document.activeElement === items[items.length - 1],
      };
    });
    assert(state.opened.open, "click on a tile should open the lightbox");
    assert(state.opened.src, "lightbox should show the clicked image");
    assert(state.opened.caption.includes(`(2/${state.count})`), `caption should carry position, got '${state.opened.caption}'`);
    assert(state.next, "ArrowRight should show the next image");
    assert(state.last && state.nextHiddenAtEnd && state.staysAtEnd, "End should jump to the last image and stop there");
    assert(state.closed, "close button should close the dialog");
    assert(state.focusReturned, "focus should return to the tile of the last shown image");
  } finally {
    await p.close();
  }
}

async function journeyPopoverSelectorSensitiveId(page) {
  await reload(page);

  const state = await page.evaluate(async () => {
    const id = 'team:"dr\\meyer';
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.textContent = "Team öffnen";
    trigger.setAttribute("popovertarget", id);

    const panel = document.createElement("div");
    panel.id = id;
    panel.className = "popover";
    panel.setAttribute("popover", "");
    panel.textContent = "Team";
    document.body.append(trigger, panel);

    let error = "";
    const cleanup = DS.setupPopover(panel);
    try {
      trigger.click();
      await new Promise((r) => setTimeout(r, 150));
    } catch (err) {
      error = String(err);
    }

    const result = {
      error,
      open: panel.matches(":popover-open"),
      expanded: trigger.getAttribute("aria-expanded"),
      positioned: panel.style.top !== "" && panel.style.left !== "",
    };
    if (panel.matches(":popover-open")) panel.hidePopover();
    cleanup();
    trigger.remove();
    panel.remove();
    return result;
  });

  assert(!state.error, `selector-sensitive id should not throw, got '${state.error}'`);
  assert(state.open, "popover with selector-sensitive id should open");
  assert(state.expanded === "true", "aria-expanded should sync for selector-sensitive id");
  assert(state.positioned, "popover with selector-sensitive id should be positioned");
}

async function journeyComboboxA11yAndFormValue(page) {
  await reload(page);

  const state = await page.evaluate(async () => {
    const root = document.getElementById("cb-service");
    const trigger = document.getElementById("cb-service-trigger");
    const panel = document.getElementById("cb-service-panel");
    const search = panel.querySelector(".combobox__search-input");
    const field = root.querySelector("input.combobox__input");
    const initialValue = field.value;
    const events = [];
    root.addEventListener("combobox:change", (e) => events.push(e.detail));
    let fieldChanges = 0;
    field.addEventListener("change", () => fieldChanges++);

    trigger.click();
    await new Promise((r) => setTimeout(r, 200));
    const selected = panel.querySelector('.combobox__option[aria-selected="true"]');
    const onOpen = search.getAttribute("aria-activedescendant");
    const startsOnSelected = !!selected && onOpen === selected.id;

    // ArrowDown → nächste Option (Bart-Trim) aktiv und per id gemeldet.
    search.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const activeEl = panel.querySelector(".combobox__option--active");
    const activeMatches =
      !!activeEl &&
      search.getAttribute("aria-activedescendant") === activeEl.id &&
      trigger.getAttribute("aria-activedescendant") === activeEl.id;
    const ids = [...panel.querySelectorAll(".combobox__option")].map((o) => o.id);

    search.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));

    return {
      initialValue,
      startsOnSelected,
      activeMatches,
      idsUnique: ids.every(Boolean) && new Set(ids).size === ids.length,
      fieldValue: field.value,
      fieldChanges,
      events: events.map((d) => ({ value: d.value, label: d.label })),
      clearedAfterClose: !search.hasAttribute("aria-activedescendant"),
      open: panel.matches(":popover-open"),
    };
  });

  assert(
    state.initialValue === "Färben & Strähnen",
    `hidden input should start with the preselected option, got '${state.initialValue}'`
  );
  assert(state.idsUnique, "every option should get a unique id");
  assert(state.startsOnSelected, "open should activate the selected option via aria-activedescendant");
  assert(state.activeMatches, "aria-activedescendant on search + trigger should follow the active option");
  assert(!state.open, "Enter should select and close");
  assert(state.fieldValue === "bart-trim", `hidden input should take data-value, got '${state.fieldValue}'`);
  assert(state.fieldChanges === 1, `hidden input should fire change once, got ${state.fieldChanges}`);
  assert(
    state.events.length === 1 && state.events[0].value === "bart-trim" && state.events[0].label === "Bart-Trim",
    `combobox:change should carry value + label, got ${JSON.stringify(state.events)}`
  );
  assert(state.clearedAfterClose, "aria-activedescendant should be cleared after close");
}

async function journeyPopoverStaysInViewport(page) {
  await reload(page);

  // Trigger in die rechte untere Ecke eines schmalen Viewports zwingen:
  // ohne Clamp/Flip läge das Panel rechts und unten ausserhalb.
  await page.setViewport({ width: 360, height: 640 });
  try {
    const rect = await page.evaluate(async () => {
      const trigger = document.querySelector('[popovertarget="demo-menu"]');
      // An <body> hängen: Vorfahren mit container-type wären sonst der
      // Containing Block für position:fixed.
      const home = trigger.parentNode;
      const next = trigger.nextSibling;
      document.body.append(trigger);
      trigger.style.cssText = "position:fixed;right:4px;bottom:4px;z-index:9999";
      trigger.click();
      await new Promise((r) => setTimeout(r, 250));
      const panel = document.getElementById("demo-menu");
      const r = panel.getBoundingClientRect();
      const t = trigger.getBoundingClientRect();
      const out = {
        open: panel.matches(":popover-open"),
        left: r.left, right: r.right, top: r.top, bottom: r.bottom,
        triggerTop: t.top,
        vw: document.documentElement.clientWidth,
        vh: document.documentElement.clientHeight,
        placement: panel.dataset.placement,
      };
      panel.hidePopover();
      trigger.style.cssText = "";
      home.insertBefore(trigger, next);
      return out;
    });
    assert(rect.open, "popover should open");
    assert(rect.left >= 0 && rect.right <= rect.vw, `panel should stay inside viewport horizontally (${rect.left}–${rect.right} of ${rect.vw})`);
    assert(rect.top >= 0 && rect.bottom <= rect.vh, `panel should stay inside viewport vertically (${rect.top}–${rect.bottom} of ${rect.vh})`);
    assert(rect.placement === "top", `panel should flip above the trigger, got '${rect.placement}'`);
    assert(rect.bottom <= rect.triggerTop, "flipped panel should sit above the trigger");
  } finally {
    await page.setViewport({ width: 1400, height: 900 });
  }
}

async function journeyThemeToggleLabels(page) {
  await reload(page);

  const state = await page.evaluate(async () => {
    const make = (attrs = {}) => {
      const btn = document.createElement("button");
      btn.setAttribute("data-theme-toggle", "");
      for (const [k, v] of Object.entries(attrs)) btn.setAttribute(k, v);
      return btn;
    };
    const html = document.documentElement;
    const prevLang = html.lang;
    html.setAttribute("data-mode", "light");

    const host = document.createElement("div");
    const byLang = make();
    const byAttr = make({ "data-label-dark": "Nachtansicht" });
    host.append(byLang, byAttr);
    document.body.append(host);

    html.lang = "fr-CH";
    const cleanupFr = DS.setupThemeToggle(host);
    const fr = byLang.getAttribute("aria-label");
    const attr = byAttr.getAttribute("aria-label");
    cleanupFr();

    html.lang = "de-CH";
    const cleanupOpt = DS.setupThemeToggle(host, { labels: { toDark: "Dunkel" } });
    const opt = byLang.getAttribute("aria-label");
    byLang.click();
    // View-Transition wendet den Wechsel asynchron an.
    await new Promise((r) => setTimeout(r, 400));
    const afterClick = { mode: html.getAttribute("data-mode"), label: byLang.getAttribute("aria-label") };
    cleanupOpt();

    host.remove();
    html.lang = prevLang;
    html.setAttribute("data-mode", "light");
    try { localStorage.clear(); } catch {}

    // Head-Snippet: wendet gespeicherten Modus ohne setup an.
    try { localStorage.setItem("ds-mode", "dark"); } catch {}
    new Function(DS.THEME_INIT_SNIPPET)();
    const snippetMode = html.getAttribute("data-mode");
    html.setAttribute("data-mode", "light");
    try { localStorage.clear(); } catch {}

    return { fr, attr, opt, afterClick, snippetMode };
  });

  assert(state.fr === "Passer en mode sombre", `lang=fr should give a French label, got '${state.fr}'`);
  assert(state.attr === "Nachtansicht", `data-label-dark should win, got '${state.attr}'`);
  assert(state.opt === "Dunkel", `options.labels should override the language default, got '${state.opt}'`);
  assert(state.afterClick.mode === "dark", "click should switch to dark");
  assert(state.afterClick.label === "Auf Light Mode wechseln", `label should follow mode, got '${state.afterClick.label}'`);
  assert(state.snippetMode === "dark", "THEME_INIT_SNIPPET should apply the stored mode");
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

async function journeyLifecycleCleanup(page) {
  await reload(page);

  const state = await page.evaluate(() => {
    const cleanup = DS.setupAll();
    cleanup();
    const slider = document.getElementById("slider-volume");
    const output = document.querySelector('output[for="slider-volume"]');
    slider.value = "73";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    const afterCleanup = output.value;

    const cleanupAgain = DS.setupAll();
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    const afterRemount = output.value;
    cleanupAgain();
    return { afterCleanup, afterRemount, cleanupType: typeof cleanup };
  });

  assert(state.cleanupType === "function", "setupAll should return a cleanup function");
  assert(state.afterCleanup !== "73", "cleanup should detach existing slider listeners");
  assert(state.afterRemount === "73", "setupAll should re-initialize after cleanup");
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
    await journey("Gallery: lightbox opens, pages by keyboard, returns focus", journeyGalleryLightbox, page);
    await journey("Popover: selector-sensitive CMS id stays functional", journeyPopoverSelectorSensitiveId, page);
    await journey("Combobox: aria-activedescendant, form value and change event", journeyComboboxA11yAndFormValue, page);
    await journey("Popover: flips and clamps to stay inside the viewport", journeyPopoverStaysInViewport, page);
    await journey("Theme-Toggle: labels by lang/attribute/options + head snippet", journeyThemeToggleLabels, page);
    await journey("Alert: data-dismiss removes element", journeyAlertDismiss, page);
    await journey("Slider: input event syncs output + --range-fill-pct", journeySliderSync, page);
    await journey("File-Upload: drag-counter handles nested dragenter/leave", journeyFileUploadDragCounter, page);
    await journey("Tree: summary click toggles details[open] state", journeyTreeExpandCollapse, page);
    await journey("Lifecycle: repeated setup is idempotent and cleanup allows remount", journeyLifecycleCleanup, page);

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
