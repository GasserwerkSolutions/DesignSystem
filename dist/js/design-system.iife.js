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
    setupAll: () => setupAll,
    setupCombobox: () => setupCombobox,
    setupComboboxes: () => setupComboboxes,
    setupDismisser: () => setupDismisser,
    setupDismissers: () => setupDismissers,
    setupFileUpload: () => setupFileUpload,
    setupFileUploads: () => setupFileUploads,
    setupPopover: () => setupPopover,
    setupPopovers: () => setupPopovers,
    setupSlider: () => setupSlider,
    setupSliders: () => setupSliders
  });

  // js/setup-dismiss.ts
  function setupDismisser(button) {
    const selector = button.dataset.dismiss;
    if (!selector) return;
    button.addEventListener("click", () => {
      button.closest(selector)?.remove();
    });
  }
  function setupDismissers(root = document) {
    root.querySelectorAll("[data-dismiss]").forEach(setupDismisser);
  }

  // js/anchor-popover.ts
  function anchorPopoverByTrigger(panel, options = {}) {
    const { matchWidth = false, offset = 4, onToggle } = options;
    panel.addEventListener("beforetoggle", (rawEvent) => {
      const e = rawEvent;
      if (onToggle) onToggle(e);
      if (e.newState !== "open") return;
      const trigger = document.querySelector(
        `[popovertarget="${panel.id}"]`
      );
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      panel.style.top = `${r.bottom + offset}px`;
      panel.style.left = `${r.left}px`;
      if (matchWidth) panel.style.minWidth = `${r.width}px`;
    });
  }

  // js/setup-popover.ts
  function setupPopover(panel) {
    anchorPopoverByTrigger(panel, {
      onToggle: (e) => {
        const trigger = document.querySelector(
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
  }
  function setupPopovers(root = document) {
    root.querySelectorAll(".popover").forEach(setupPopover);
  }

  // js/setup-combobox.ts
  function setupCombobox(combobox) {
    const trigger = combobox.querySelector(".combobox__trigger");
    const panel = combobox.querySelector(".combobox__panel");
    if (!trigger || !panel) return;
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
      panel.hidePopover();
    };
    anchorPopoverByTrigger(panel, {
      matchWidth: true,
      onToggle: (e) => {
        trigger.setAttribute(
          "aria-expanded",
          e.newState === "open" ? "true" : "false"
        );
        if (e.newState !== "open") return;
        setActive(-1);
        requestAnimationFrame(() => search?.focus());
      }
    });
    panel.addEventListener("click", (e) => {
      const opt = e.target.closest(".combobox__option");
      if (opt) select(opt);
    });
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
        panel.hidePopover();
        trigger.focus();
      }
    });
    search?.addEventListener("input", () => {
      const q = search.value.toLowerCase();
      panel.querySelectorAll(".combobox__option").forEach((o) => {
        const haystack = (o.dataset.search ?? o.textContent ?? "").toLowerCase();
        o.hidden = q !== "" && !haystack.includes(q);
      });
      setActive(-1);
    });
  }
  function setupComboboxes(root = document) {
    root.querySelectorAll(".combobox").forEach(setupCombobox);
  }

  // js/setup-file-upload.ts
  function setupFileUpload(label) {
    const input = label.querySelector('input[type="file"]');
    const text = label.querySelector(".file-upload__text");
    const defaultText = text?.textContent ?? "";
    let depth = 0;
    label.addEventListener("dragenter", (ev) => {
      ev.preventDefault();
      depth++;
      label.dataset.dragging = "true";
    });
    label.addEventListener("dragover", (ev) => ev.preventDefault());
    label.addEventListener("dragleave", () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) delete label.dataset.dragging;
    });
    label.addEventListener("drop", (ev) => {
      ev.preventDefault();
      depth = 0;
      delete label.dataset.dragging;
      if (!input || !ev.dataTransfer?.files?.length) return;
      input.files = ev.dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
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
    });
  }
  function setupFileUploads(root = document) {
    root.querySelectorAll(".file-upload").forEach(setupFileUpload);
  }

  // js/setup-slider.ts
  function makeFormatter(input, opts) {
    if (opts.format) return opts.format;
    const prefix = input.dataset.formatPrefix ?? "";
    const suffix = input.dataset.formatSuffix ?? "";
    return (v) => `${prefix}${v}${suffix}`;
  }
  function setupSlider(slider, opts = {}) {
    const input = slider.querySelector('input[type="range"]');
    const output = slider.querySelector(".slider__value");
    if (!input) return;
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
  }
  function setupSliders(root = document) {
    root.querySelectorAll(".slider").forEach((el) => setupSlider(el));
  }

  // js/index.ts
  function setupAll(root = document) {
    setupDismissers(root);
    setupPopovers(root);
    setupComboboxes(root);
    setupFileUploads(root);
    setupSliders(root);
  }
  return __toCommonJS(index_exports);
})();
