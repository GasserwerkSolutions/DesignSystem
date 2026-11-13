"use strict";
var DS = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // js/index.ts
  var index_exports = {};
  __export(index_exports, {
    THEME_INIT_SNIPPET: () => THEME_INIT_SNIPPET,
    anchorPopoverByTrigger: () => anchorPopoverByTrigger,
    combineCleanups: () => combineCleanups,
    noopCleanup: () => noopCleanup,
    setupAll: () => setupAll,
    setupCombobox: () => setupCombobox,
    setupComboboxes: () => setupComboboxes,
    setupCopyButton: () => setupCopyButton,
    setupDismisser: () => setupDismisser,
    setupDismissers: () => setupDismissers,
    setupFileUpload: () => setupFileUpload,
    setupFileUploads: () => setupFileUploads,
    setupOtpInput: () => setupOtpInput,
    setupPopover: () => setupPopover,
    setupPopovers: () => setupPopovers,
    setupSlider: () => setupSlider,
    setupSliders: () => setupSliders,
    setupThemeToggle: () => setupThemeToggle
  });

  // js/lifecycle.ts
  var noopCleanup = () => {
  };
  function combineCleanups(cleanups10) {
    const list = [...cleanups10];
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      for (const cleanup of list.reverse()) cleanup();
    };
  }

  // js/setup-dismiss.ts
  var cleanups = /* @__PURE__ */ new WeakMap();
  function setupDismisser(button) {
    const existing = cleanups.get(button);
    if (existing) return existing;
    const selector = button.dataset.dismiss;
    if (!selector) return noopCleanup;
    const handleClick = () => {
      try {
        button.closest(selector)?.remove();
      } catch {
      }
    };
    button.addEventListener("click", handleClick);
    const cleanup = () => {
      button.removeEventListener("click", handleClick);
      cleanups.delete(button);
    };
    cleanups.set(button, cleanup);
    return cleanup;
  }
  function setupDismissers(root = document) {
    return combineCleanups([...root.querySelectorAll("[data-dismiss]")].map(setupDismisser));
  }

  // js/anchor-popover.ts
  var cleanups2 = /* @__PURE__ */ new WeakMap();
  function usesCssAnchor(panel, view) {
    const value = view.getComputedStyle(panel).getPropertyValue("position-anchor").trim();
    return value.startsWith("--");
  }
  function anchorPopoverByTrigger(panel, options = {}) {
    const existing = cleanups2.get(panel);
    if (existing) return existing;
    const { matchWidth = false, offset = 4, margin = 8, onToggle } = options;
    const doc = panel.ownerDocument;
    const view = doc.defaultView;
    const findTrigger = () => doc.querySelector(`[popovertarget="${panel.id}"]`);
    const place = (measured) => {
      const trigger = findTrigger();
      if (!trigger || !view) return;
      if (usesCssAnchor(panel, view)) return;
      const r = trigger.getBoundingClientRect();
      if (matchWidth) panel.style.minWidth = `${r.width}px`;
      const vw = doc.documentElement.clientWidth;
      const vh = doc.documentElement.clientHeight;
      const pw = measured ? panel.offsetWidth : 0;
      const ph = measured ? panel.offsetHeight : 0;
      const rtl = view.getComputedStyle(trigger).direction === "rtl";
      let left = rtl ? r.right - pw : r.left;
      const maxLeft = Math.max(margin, vw - pw - margin);
      left = Math.min(Math.max(left, margin), maxLeft);
      let top = r.bottom + offset;
      let placement = "bottom";
      if (measured && top + ph > vh - margin) {
        const above = r.top - offset - ph;
        if (above >= margin) {
          top = above;
          placement = "top";
        } else {
          top = Math.max(margin, vh - ph - margin);
        }
      }
      panel.style.top = `${Math.round(top)}px`;
      panel.style.left = `${Math.round(left)}px`;
      panel.dataset.placement = placement;
    };
    let stopTracking = null;
    const startTracking = () => {
      if (stopTracking || !view) return;
      let frame = 0;
      const schedule = () => {
        if (frame) return;
        frame = view.requestAnimationFrame(() => {
          frame = 0;
          place(true);
        });
      };
      view.addEventListener("scroll", schedule, { capture: true, passive: true });
      view.addEventListener("resize", schedule, { passive: true });
      stopTracking = () => {
        view.removeEventListener("scroll", schedule, { capture: true });
        view.removeEventListener("resize", schedule);
        if (frame) view.cancelAnimationFrame(frame);
        stopTracking = null;
      };
    };
    const handleBeforeToggle = (rawEvent) => {
      const e = rawEvent;
      if (onToggle) onToggle(e);
      if (e.newState === "open") place(false);
      else stopTracking?.();
    };
    const handleToggle = (rawEvent) => {
      const e = rawEvent;
      if (e.newState !== "open") return;
      place(true);
      startTracking();
    };
    panel.addEventListener("beforetoggle", handleBeforeToggle);
    panel.addEventListener("toggle", handleToggle);
    let active = true;
    const cleanup = () => {
      if (!active) return;
      active = false;
      panel.removeEventListener("beforetoggle", handleBeforeToggle);
      panel.removeEventListener("toggle", handleToggle);
      stopTracking?.();
      panel.style.removeProperty("top");
      panel.style.removeProperty("left");
      panel.style.removeProperty("min-width");
      delete panel.dataset.placement;
      cleanups2.delete(panel);
    };
    cleanups2.set(panel, cleanup);
    return cleanup;
  }

  // js/setup-popover.ts
  var cleanups3 = /* @__PURE__ */ new WeakMap();
  function setupPopover(panel) {
    const existing = cleanups3.get(panel);
    if (existing) return existing;
    const releaseAnchor = anchorPopoverByTrigger(panel, {
      onToggle: (e) => {
        const trigger = panel.ownerDocument.querySelector(
          `[popovertarget="${panel.id}"]`
        );
        if (trigger) {
          trigger.setAttribute(
            "aria-expanded",
            e.newState === "open" ? "true" : "false"
          );
        }
      }
    });
    const cleanup = () => {
      releaseAnchor();
      cleanups3.delete(panel);
    };
    cleanups3.set(panel, cleanup);
    return cleanup;
  }
  function setupPopovers(root = document) {
    return combineCleanups([...root.querySelectorAll(".popover")].map(setupPopover));
  }

  // js/setup-combobox.ts
  var cleanups4 = /* @__PURE__ */ new WeakMap();
  var uid = 0;
  function hidePopover(panel) {
    const popover = panel;
    popover.hidePopover?.();
  }
  function setupCombobox(combobox) {
    const existing = cleanups4.get(combobox);
    if (existing) return existing;
    const trigger = combobox.querySelector(".combobox__trigger");
    const panel = combobox.querySelector(".combobox__panel");
    if (!trigger || !panel) return noopCleanup;
    const controller = new AbortController();
    const signal = controller.signal;
    const search = panel.querySelector(".combobox__search-input");
    const value = trigger.querySelector(".combobox__value");
    const field = combobox.querySelector("input.combobox__input");
    const idBase = panel.id || combobox.id || `combobox-${++uid}`;
    const generatedIds = [];
    panel.querySelectorAll(".combobox__option").forEach((opt, i) => {
      if (opt.id) return;
      opt.id = `${idBase}-opt-${i}`;
      generatedIds.push(opt);
    });
    const optionLabel = (opt) => {
      const label = opt.querySelector(".combobox__option-label");
      return (label?.textContent ?? opt.textContent ?? "").trim();
    };
    const visibleOptions = () => panel.querySelectorAll(".combobox__option:not([hidden])");
    let active = -1;
    const setActive = (idx) => {
      const opts = visibleOptions();
      opts.forEach((el, j) => el.classList.toggle("combobox__option--active", j === idx));
      const current = idx >= 0 ? opts[idx] : void 0;
      if (current) current.scrollIntoView({ block: "nearest" });
      for (const owner of [search, trigger]) {
        if (!owner) continue;
        if (current) owner.setAttribute("aria-activedescendant", current.id);
        else owner.removeAttribute("aria-activedescendant");
      }
      active = current ? idx : -1;
    };
    const select = (opt) => {
      panel.querySelectorAll(".combobox__option").forEach((o) => o.setAttribute("aria-selected", "false"));
      opt.setAttribute("aria-selected", "true");
      const label = optionLabel(opt);
      const nextValue = opt.dataset.value ?? label;
      if (value) value.textContent = label;
      if (field && field.value !== nextValue) {
        field.value = nextValue;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }
      combobox.dispatchEvent(new CustomEvent("combobox:change", {
        bubbles: true,
        detail: { value: nextValue, label, option: opt }
      }));
      hidePopover(panel);
    };
    const releaseAnchor = anchorPopoverByTrigger(panel, {
      matchWidth: true,
      onToggle: (e) => {
        trigger.setAttribute(
          "aria-expanded",
          e.newState === "open" ? "true" : "false"
        );
        if (e.newState !== "open") {
          setActive(-1);
          return;
        }
        const opts = [...visibleOptions()];
        setActive(opts.findIndex((o) => o.getAttribute("aria-selected") === "true"));
        panel.ownerDocument.defaultView?.requestAnimationFrame(() => search?.focus());
      }
    });
    panel.addEventListener("click", (e) => {
      const opt = e.target.closest(".combobox__option");
      if (opt) select(opt);
    }, { signal });
    combobox.addEventListener("keydown", (e) => {
      const opts = visibleOptions();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(Math.min(active + 1, opts.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(Math.max(active - 1, 0));
      } else if (e.key === "Home" && opts.length > 0 && e.target !== search) {
        e.preventDefault();
        setActive(0);
      } else if (e.key === "End" && opts.length > 0 && e.target !== search) {
        e.preventDefault();
        setActive(opts.length - 1);
      } else if (e.key === "Enter" && active >= 0) {
        e.preventDefault();
        select(opts[active]);
      } else if (e.key === "Escape") {
        hidePopover(panel);
        trigger.focus();
      }
    }, { signal });
    search?.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      panel.querySelectorAll(".combobox__option").forEach((o) => {
        const haystack = (o.dataset.search ?? o.textContent ?? "").toLowerCase();
        o.hidden = q !== "" && !haystack.includes(q);
      });
      setActive(-1);
    }, { signal });
    const cleanup = () => {
      controller.abort();
      releaseAnchor();
      trigger.setAttribute("aria-expanded", "false");
      panel.querySelectorAll(".combobox__option--active").forEach((option) => option.classList.remove("combobox__option--active"));
      search?.removeAttribute("aria-activedescendant");
      trigger.removeAttribute("aria-activedescendant");
      generatedIds.forEach((option) => option.removeAttribute("id"));
      cleanups4.delete(combobox);
    };
    cleanups4.set(combobox, cleanup);
    return cleanup;
  }
  function setupComboboxes(root = document) {
    return combineCleanups([...root.querySelectorAll(".combobox")].map(setupCombobox));
  }

  // js/setup-file-upload.ts
  var cleanups5 = /* @__PURE__ */ new WeakMap();
  function setupFileUpload(label) {
    const existing = cleanups5.get(label);
    if (existing) return existing;
    const input = label.querySelector('input[type="file"]');
    const text = label.querySelector(".file-upload__text");
    const defaultText = text?.textContent ?? "";
    const controller = new AbortController();
    const signal = controller.signal;
    let depth = 0;
    label.addEventListener("dragenter", (ev) => {
      ev.preventDefault();
      depth++;
      label.dataset.dragging = "true";
    }, { signal });
    label.addEventListener("dragover", (ev) => ev.preventDefault(), { signal });
    label.addEventListener("dragleave", () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) delete label.dataset.dragging;
    }, { signal });
    label.addEventListener("drop", (ev) => {
      ev.preventDefault();
      depth = 0;
      delete label.dataset.dragging;
      if (!input || !ev.dataTransfer?.files?.length) return;
      input.files = ev.dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, { signal });
    input?.addEventListener("change", () => {
      if (!text) return;
      const n = input.files?.length ?? 0;
      if (n === 0) {
        text.textContent = defaultText;
      } else if (n === 1) {
        text.textContent = `\u2713 ${input.files[0].name}`;
      } else {
        text.textContent = `\u2713 ${input.files[0].name}  (+${n - 1} weitere)`;
      }
    }, { signal });
    const cleanup = () => {
      controller.abort();
      depth = 0;
      delete label.dataset.dragging;
      cleanups5.delete(label);
    };
    cleanups5.set(label, cleanup);
    return cleanup;
  }
  function setupFileUploads(root = document) {
    return combineCleanups([...root.querySelectorAll(".file-upload")].map(setupFileUpload));
  }

  // js/setup-slider.ts
  var cleanups6 = /* @__PURE__ */ new WeakMap();
  function makeFormatter(input, opts) {
    if (opts.format) return opts.format;
    const prefix = input.dataset.formatPrefix ?? "";
    const suffix = input.dataset.formatSuffix ?? "";
    return (v) => `${prefix}${v}${suffix}`;
  }
  function setupSlider(slider, opts = {}) {
    const existing = cleanups6.get(slider);
    if (existing) return existing;
    const input = slider.querySelector('input[type="range"]');
    const output = slider.querySelector(".slider__value");
    if (!input) return noopCleanup;
    const format = makeFormatter(input, opts);
    const sync = () => {
      const min = parseFloat(input.min || "0");
      const max = parseFloat(input.max || "100");
      const pct = (input.valueAsNumber - min) / (max - min) * 100;
      input.style.setProperty("--range-fill-pct", `${pct}%`);
      if (output) output.value = format(input.value);
    };
    input.addEventListener("input", sync);
    sync();
    const cleanup = () => {
      input.removeEventListener("input", sync);
      cleanups6.delete(slider);
    };
    cleanups6.set(slider, cleanup);
    return cleanup;
  }
  function setupSliders(root = document) {
    return combineCleanups([...root.querySelectorAll(".slider")].map((el) => setupSlider(el)));
  }

  // js/setup-copy-button.ts
  var cleanups7 = /* @__PURE__ */ new WeakMap();
  function setupButton(btn) {
    const existing = cleanups7.get(btn);
    if (existing) return existing;
    const timeouts = /* @__PURE__ */ new Set();
    const handleClick = async () => {
      const target = btn.dataset.copyTarget ? btn.ownerDocument.getElementById(btn.dataset.copyTarget) : null;
      const text = btn.dataset.copyText ?? target?.textContent?.trim() ?? "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        btn.dataset.state = "copied";
        const timeout = window.setTimeout(() => {
          delete btn.dataset.state;
          timeouts.delete(timeout);
        }, 1500);
        timeouts.add(timeout);
      } catch {
        btn.dataset.state = "error";
        const timeout = window.setTimeout(() => {
          delete btn.dataset.state;
          timeouts.delete(timeout);
        }, 2e3);
        timeouts.add(timeout);
      }
    };
    btn.addEventListener("click", handleClick);
    const cleanup = () => {
      btn.removeEventListener("click", handleClick);
      for (const timeout of timeouts) window.clearTimeout(timeout);
      timeouts.clear();
      delete btn.dataset.state;
      cleanups7.delete(btn);
    };
    cleanups7.set(btn, cleanup);
    return cleanup;
  }
  function setupCopyButton(root = document) {
    const buttons = root.querySelectorAll(".copy-btn");
    return combineCleanups([...buttons].map(setupButton));
  }

  // js/setup-otp-input.ts
  var cleanups8 = /* @__PURE__ */ new WeakMap();
  function setupGroup(group) {
    const existing = cleanups8.get(group);
    if (existing) return existing;
    const controller = new AbortController();
    const signal = controller.signal;
    const fields = Array.from(group.querySelectorAll(".otp-input__field"));
    fields.forEach((field, i) => {
      field.addEventListener("input", () => {
        field.value = field.value.replace(/[^0-9]/g, "").slice(0, 1);
        if (field.value && i < fields.length - 1) fields[i + 1].focus();
      }, { signal });
      field.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !field.value && i > 0) fields[i - 1].focus();
        else if (e.key === "ArrowLeft" && i > 0) {
          fields[i - 1].focus();
          e.preventDefault();
        } else if (e.key === "ArrowRight" && i < fields.length - 1) {
          fields[i + 1].focus();
          e.preventDefault();
        }
      }, { signal });
      field.addEventListener("paste", (e) => {
        e.preventDefault();
        const data = (e.clipboardData?.getData("text") || "").replace(/[^0-9]/g, "");
        for (let j = 0; j < data.length && i + j < fields.length; j++) fields[i + j].value = data[j];
        fields[Math.min(i + data.length, fields.length - 1)]?.focus();
      }, { signal });
    });
    const cleanup = () => {
      controller.abort();
      cleanups8.delete(group);
    };
    cleanups8.set(group, cleanup);
    return cleanup;
  }
  function setupOtpInput(root = document) {
    const groups = root.querySelectorAll(".otp-input");
    return combineCleanups([...groups].map(setupGroup));
  }

  // js/setup-theme-toggle.ts
  var STORAGE_KEY = "ds-mode";
  var THEME_INIT_SNIPPET = `try{var m=localStorage.getItem("${STORAGE_KEY}");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-mode",m)}catch(e){}`;
  var LABELS = {
    de: { toLight: "Auf Light Mode wechseln", toDark: "Auf Dark Mode wechseln" },
    fr: { toLight: "Passer en mode clair", toDark: "Passer en mode sombre" },
    it: { toLight: "Passa alla modalit\xE0 chiara", toDark: "Passa alla modalit\xE0 scura" },
    en: { toLight: "Switch to light mode", toDark: "Switch to dark mode" }
  };
  var cleanups9 = /* @__PURE__ */ new WeakMap();
  var buttonLabels = /* @__PURE__ */ new WeakMap();
  function getStoredMode() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  }
  function getCurrentMode(doc) {
    const explicit = doc.documentElement.getAttribute("data-mode");
    if (explicit === "light" || explicit === "dark") return explicit;
    const view = doc.defaultView;
    return view?.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function resolveLabels(btn) {
    const lang = (btn.closest("[lang]")?.lang ?? "").toLowerCase().split("-")[0];
    const base = LABELS[lang] ?? LABELS.de;
    const custom = buttonLabels.get(btn) ?? {};
    return {
      toLight: btn.dataset.labelLight ?? custom.toLight ?? base.toLight,
      toDark: btn.dataset.labelDark ?? custom.toDark ?? base.toDark
    };
  }
  function syncButtonLabel(btn, mode) {
    const labels = resolveLabels(btn);
    btn.setAttribute("aria-label", mode === "dark" ? labels.toLight : labels.toDark);
  }
  function setupButton2(btn) {
    const existing = cleanups9.get(btn);
    if (existing) return existing;
    const doc = btn.ownerDocument;
    const html = doc.documentElement;
    const handleClick = () => {
      const current = getCurrentMode(doc);
      const next = current === "dark" ? "light" : "dark";
      const apply = () => {
        html.setAttribute("data-mode", next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
        }
        doc.querySelectorAll("[data-theme-toggle]").forEach((button) => syncButtonLabel(button, next));
      };
      const reducedMotion = doc.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches ?? false;
      const docWithVT = doc;
      if (docWithVT.startViewTransition && !reducedMotion) docWithVT.startViewTransition(apply);
      else apply();
    };
    btn.addEventListener("click", handleClick);
    const cleanup = () => {
      btn.removeEventListener("click", handleClick);
      buttonLabels.delete(btn);
      cleanups9.delete(btn);
    };
    cleanups9.set(btn, cleanup);
    return cleanup;
  }
  function setupThemeToggle(root = document, options = {}) {
    const doc = root instanceof Document ? root : root.ownerDocument ?? document;
    const html = doc.documentElement;
    const storedMode = getStoredMode();
    if (storedMode && html.getAttribute("data-mode") !== storedMode) {
      html.setAttribute("data-mode", storedMode);
    }
    const buttons = root.querySelectorAll("[data-theme-toggle]");
    buttons.forEach((btn) => {
      if (options.labels) buttonLabels.set(btn, options.labels);
      syncButtonLabel(btn, getCurrentMode(doc));
    });
    return combineCleanups([...buttons].map(setupButton2));
  }

  // js/index.ts
  function setupAll(root = document) {
    return combineCleanups([
      setupDismissers(root),
      setupPopovers(root),
      setupComboboxes(root),
      setupFileUploads(root),
      setupSliders(root),
      setupCopyButton(root),
      setupOtpInput(root),
      setupThemeToggle(root)
    ]);
  }
  return __toCommonJS(index_exports);
})();
