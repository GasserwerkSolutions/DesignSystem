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
  function anchorPopoverByTrigger(panel, options = {}) {
    const existing = cleanups2.get(panel);
    if (existing) return existing;
    const { matchWidth = false, offset = 4, onToggle } = options;
    const handleToggle = (rawEvent) => {
      const e = rawEvent;
      if (onToggle) onToggle(e);
      if (e.newState !== "open") return;
      const trigger = panel.ownerDocument.querySelector(
        `[popovertarget="${panel.id}"]`
      );
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      panel.style.top = `${r.bottom + offset}px`;
      panel.style.left = `${r.left}px`;
      if (matchWidth) panel.style.minWidth = `${r.width}px`;
    };
    panel.addEventListener("beforetoggle", handleToggle);
    let active = true;
    const cleanup = () => {
      if (!active) return;
      active = false;
      panel.removeEventListener("beforetoggle", handleToggle);
      panel.style.removeProperty("top");
      panel.style.removeProperty("left");
      panel.style.removeProperty("min-width");
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
    const visibleOptions = () => panel.querySelectorAll(".combobox__option:not([hidden])");
    let active = -1;
    const setActive = (idx) => {
      const opts = visibleOptions();
      opts.forEach((el, j) => el.classList.toggle("combobox__option--active", j === idx));
      if (idx >= 0 && opts[idx]) opts[idx].scrollIntoView({ block: "nearest" });
      active = idx;
    };
    const select = (opt) => {
      panel.querySelectorAll(".combobox__option").forEach((o) => o.setAttribute("aria-selected", "false"));
      opt.setAttribute("aria-selected", "true");
      if (value) {
        const label = opt.querySelector(".combobox__option-label");
        value.textContent = (label?.textContent ?? opt.textContent ?? "").trim();
      }
      hidePopover(panel);
    };
    const releaseAnchor = anchorPopoverByTrigger(panel, {
      matchWidth: true,
      onToggle: (e) => {
        trigger.setAttribute(
          "aria-expanded",
          e.newState === "open" ? "true" : "false"
        );
        if (e.newState !== "open") return;
        setActive(-1);
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
  var cleanups9 = /* @__PURE__ */ new WeakMap();
  function getStoredMode() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  }
  function getCurrentMode() {
    const explicit = document.documentElement.getAttribute("data-mode");
    if (explicit === "light" || explicit === "dark") return explicit;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function syncButtonLabel(btn, mode) {
    btn.setAttribute(
      "aria-label",
      mode === "dark" ? "Auf Light Mode wechseln" : "Auf Dark Mode wechseln"
    );
  }
  function setupButton2(btn) {
    const existing = cleanups9.get(btn);
    if (existing) return existing;
    const html = btn.ownerDocument.documentElement;
    const handleClick = () => {
      const current = getCurrentMode();
      const next = current === "dark" ? "light" : "dark";
      const apply = () => {
        html.setAttribute("data-mode", next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
        }
        btn.ownerDocument.querySelectorAll("[data-theme-toggle]").forEach((button) => syncButtonLabel(button, next));
      };
      const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const docWithVT = btn.ownerDocument;
      if (docWithVT.startViewTransition && !reducedMotion) docWithVT.startViewTransition(apply);
      else apply();
    };
    btn.addEventListener("click", handleClick);
    const cleanup = () => {
      btn.removeEventListener("click", handleClick);
      cleanups9.delete(btn);
    };
    cleanups9.set(btn, cleanup);
    return cleanup;
  }
  function setupThemeToggle(root = document) {
    const html = document.documentElement;
    const storedMode = getStoredMode();
    if (storedMode && html.getAttribute("data-mode") !== storedMode) {
      html.setAttribute("data-mode", storedMode);
    }
    const buttons = root.querySelectorAll("[data-theme-toggle]");
    buttons.forEach((btn) => {
      syncButtonLabel(btn, getCurrentMode());
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
