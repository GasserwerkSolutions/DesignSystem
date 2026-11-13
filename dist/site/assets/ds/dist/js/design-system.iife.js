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
    IMAGE_RATIOS: () => IMAGE_RATIOS,
    SECTION_WEIGHT: () => SECTION_WEIGHT,
    anchorPopoverByTrigger: () => anchorPopoverByTrigger,
    bestRatio: () => bestRatio,
    combineCleanups: () => combineCleanups,
    fitImage: () => fitImage,
    focusFor: () => focusFor,
    lostShare: () => lostShare,
    noopCleanup: () => noopCleanup,
    parseProtect: () => parseProtect,
    planGallery: () => planGallery,
    planHero: () => planHero,
    setupAll: () => setupAll,
    setupCombobox: () => setupCombobox,
    setupComboboxes: () => setupComboboxes,
    setupCopyButton: () => setupCopyButton,
    setupDismisser: () => setupDismisser,
    setupDismissers: () => setupDismissers,
    setupFileUpload: () => setupFileUpload,
    setupFileUploads: () => setupFileUploads,
    setupGalleries: () => setupGalleries,
    setupGallery: () => setupGallery,
    setupOtpInput: () => setupOtpInput,
    setupPopover: () => setupPopover,
    setupPopovers: () => setupPopovers,
    setupSlider: () => setupSlider,
    setupSliders: () => setupSliders,
    setupThemeToggle: () => setupThemeToggle,
    stageLabels: () => stageLabels,
    validatePage: () => validatePage,
    visibleRegion: () => visibleRegion
  });

  // js/lifecycle.ts
  var noopCleanup = () => {
  };
  function combineCleanups(cleanups11) {
    const list = [...cleanups11];
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

  // js/setup-gallery.ts
  var cleanups10 = /* @__PURE__ */ new WeakMap();
  function setupGallery(gallery) {
    const existing = cleanups10.get(gallery);
    if (existing) return existing;
    const doc = gallery.ownerDocument;
    const dialog = gallery.dataset.lightbox ? doc.getElementById(gallery.dataset.lightbox) : doc.querySelector("dialog.lightbox");
    const image = dialog?.querySelector(".lightbox__image");
    if (!dialog || !image || typeof dialog.showModal !== "function") return noopCleanup;
    const caption = dialog.querySelector(".lightbox__caption");
    const prev = dialog.querySelector(".lightbox__nav--prev");
    const next = dialog.querySelector(".lightbox__nav--next");
    const close = dialog.querySelector(".lightbox__close");
    const controller = new AbortController();
    const signal = controller.signal;
    const items = () => [...gallery.querySelectorAll("a.gallery__item")];
    let index = -1;
    let owner = false;
    const show = (i) => {
      const list = items();
      if (list.length === 0) return;
      index = Math.min(Math.max(i, 0), list.length - 1);
      const item = list[index];
      const thumb = item.querySelector("img");
      const text = item.dataset.caption ?? thumb?.alt ?? "";
      image.src = item.href;
      image.alt = thumb?.alt ?? "";
      if (caption) {
        caption.textContent = list.length > 1 ? `${text} (${index + 1}/${list.length})`.trim() : text;
      }
      if (prev) prev.hidden = index === 0;
      if (next) next.hidden = index === list.length - 1;
    };
    gallery.addEventListener("click", (e) => {
      const item = e.target.closest("a.gallery__item");
      if (!item || !gallery.contains(item)) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      owner = true;
      show(items().indexOf(item));
      if (!dialog.open) dialog.showModal();
    }, { signal });
    prev?.addEventListener("click", () => {
      if (owner) show(index - 1);
    }, { signal });
    next?.addEventListener("click", () => {
      if (owner) show(index + 1);
    }, { signal });
    close?.addEventListener("click", () => {
      if (owner) dialog.close();
    }, { signal });
    dialog.addEventListener("keydown", (e) => {
      if (!owner) return;
      const last = items().length - 1;
      if (e.key === "ArrowLeft") show(index - 1);
      else if (e.key === "ArrowRight") show(index + 1);
      else if (e.key === "Home") show(0);
      else if (e.key === "End") show(last);
      else return;
      e.preventDefault();
    }, { signal });
    dialog.addEventListener("click", (e) => {
      if (owner && e.target === dialog) dialog.close();
    }, { signal });
    dialog.addEventListener("close", () => {
      if (!owner) return;
      owner = false;
      image.removeAttribute("src");
      items()[index]?.focus();
    }, { signal });
    const cleanup = () => {
      controller.abort();
      if (owner && dialog.open) dialog.close();
      owner = false;
      cleanups10.delete(gallery);
    };
    cleanups10.set(gallery, cleanup);
    return cleanup;
  }
  function setupGalleries(root = document) {
    return combineCleanups([...root.querySelectorAll("[data-gallery]")].map(setupGallery));
  }

  // js/layout-rules.ts
  var IMAGE_RATIOS = {
    pano: 21 / 9,
    wide: 16 / 9,
    classic: 3 / 2,
    photo: 4 / 3,
    square: 1,
    portrait: 3 / 4
  };
  var EPS = 0.01;
  var clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  function parseProtect(spec) {
    if (!spec) return [];
    return spec.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
      const [x, y, w, h] = part.split(/\s+/).map(Number);
      if (![x, y, w, h].every(Number.isFinite)) throw new Error(`data-protect ung\xFCltig: \xAB${part}\xBB`);
      return { x, y, w, h };
    });
  }
  function visibleRegion(natural, ratio, focus = { x: 0.5, y: 0.5 }) {
    const imageRatio = natural.w / natural.h;
    if (imageRatio > ratio) {
      const w = ratio / imageRatio;
      return { x: (1 - w) * focus.x, y: 0, w, h: 1 };
    }
    const h = imageRatio / ratio;
    return { x: 0, y: (1 - h) * focus.y, w: 1, h };
  }
  function lostShare(protect, visible) {
    let lost = 0;
    for (const p of protect) {
      lost += Math.max(0, visible.x - p.x) + Math.max(0, p.x + p.w - (visible.x + visible.w));
      lost += Math.max(0, visible.y - p.y) + Math.max(0, p.y + p.h - (visible.y + visible.h));
    }
    return lost;
  }
  function boundingBox(rects) {
    const x0 = Math.min(...rects.map((r) => r.x)), y0 = Math.min(...rects.map((r) => r.y));
    const x1 = Math.max(...rects.map((r) => r.x + r.w)), y1 = Math.max(...rects.map((r) => r.y + r.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function focusFor(natural, ratio, protect) {
    if (protect.length === 0) return { x: 0.5, y: 0.5 };
    const box = boundingBox(protect);
    const vis = visibleRegion(natural, ratio, { x: 0, y: 0 });
    const along = (center, size) => size >= 1 - EPS ? 0.5 : clamp((center - size / 2) / (1 - size), 0, 1);
    return { x: along(box.x + box.w / 2, vis.w), y: along(box.y + box.h / 2, vis.h) };
  }
  function fitImage(natural, ratio, protect = [], preferred) {
    if (protect.length === 0) {
      return { fit: "cover", focus: preferred ?? { x: 0.5, y: 0.5 }, keepsProtected: true, reason: "Kein gesch\xFCtzter Bereich angegeben; Beschnitt nicht gepr\xFCft." };
    }
    if (preferred && lostShare(protect, visibleRegion(natural, ratio, preferred)) <= EPS) {
      return { fit: "cover", focus: preferred, keepsProtected: true, reason: "Gesch\xFCtzter Bereich bleibt mit dem gew\xE4hlten Fokus sichtbar." };
    }
    const best = focusFor(natural, ratio, protect);
    if (lostShare(protect, visibleRegion(natural, ratio, best)) <= EPS) {
      return { fit: "cover", focus: best, keepsProtected: true, reason: "Fokus auf den gesch\xFCtzten Bereich verschoben." };
    }
    return { fit: "contain", focus: { x: 0.5, y: 0.5 }, keepsProtected: true, reason: "Kein Ausschnitt in diesem Format h\xE4lt den gesch\xFCtzten Bereich; Bild wird ganz gezeigt." };
  }
  function bestRatio(natural, protect = [], candidates = ["wide", "classic", "photo", "square", "portrait"]) {
    let best = null;
    for (const name of candidates) {
      const ratio = IMAGE_RATIOS[name];
      const focus = focusFor(natural, ratio, protect);
      const vis = visibleRegion(natural, ratio, focus);
      if (lostShare(protect, vis) > EPS) continue;
      const kept = vis.w * vis.h;
      if (!best || kept > best.kept + EPS) best = { name, kept };
    }
    return best ? best.name : null;
  }
  function planGallery(count, options = {}) {
    const max = options.max ?? 13;
    const n = Math.min(Math.max(0, Math.floor(count)), max);
    const rest = (shown) => Math.max(0, Math.floor(count)) - shown;
    if (n <= 1) return { variant: "none", className: "", show: n, rest: rest(n) };
    if (n <= 3) return { variant: "fit", className: "gallery gallery--fit", show: n, rest: rest(n) };
    const lead = n - (n - 1) % 4;
    const plain = n - n % 4;
    const useLead = lead > plain || options.preferLead === true && lead >= 5;
    return useLead && lead >= 5 ? { variant: "lead", className: "gallery gallery--lead", show: lead, rest: rest(lead) } : { variant: "default", className: "gallery", show: plain, rest: rest(plain) };
  }
  function planHero(image, options = {}) {
    const minWidth = options.minWidth ?? 1280;
    const ratio = options.ratio ?? IMAGE_RATIOS.wide;
    if (!image) return { variant: "head-text-only", className: "hero hero--head", reason: "Kein Bild vorhanden." };
    if (image.natural.w < minWidth) {
      return { variant: "head-text-only", className: "hero hero--head", reason: `Bild ist ${image.natural.w}px breit, n\xF6tig sind ${minWidth}px f\xFCr ein scharfes Einstiegsbild.` };
    }
    if (image.natural.w < image.natural.h) {
      return { variant: "head-text-only", className: "hero hero--head", reason: "Hochformat tr\xE4gt kein breites Einstiegsbild." };
    }
    const fit = fitImage(image.natural, ratio, image.protect ?? []);
    if (fit.fit === "contain") {
      return { variant: "head-text-only", className: "hero hero--head", reason: "Der gesch\xFCtzte Bereich h\xE4lt im Kopfformat nicht; Bild als Abschnittsbild im eigenen Format zeigen." };
    }
    return { variant: "head", className: "hero hero--head", reason: "Bild tr\xE4gt das Kopfformat." };
  }
  function stageLabels(sameViewpoint, states = ["Bestand", "Nach dem Umbau"]) {
    return sameViewpoint ? ["Vorher", "Nachher"] : states;
  }
  var SECTION_WEIGHT = {
    "hero": "gross",
    "gallery": "gross",
    "project-stages": "gross",
    "legend-figure": "gross",
    "reference-grid": "gross",
    "editorial-split": "mittel",
    "service-grid": "mittel",
    "spec": "ruhig",
    "project-facts": "ruhig",
    "faq-section": "ruhig",
    "trustbar": "ruhig",
    "section-head": "ruhig",
    "cta-band": "mittel",
    "contact-section": "mittel"
  };
  function validatePage(sections, options = {}) {
    const issues = [];
    const maxHeavyRun = options.maxHeavyRun ?? 3;
    const heroes = sections.filter((s) => s.pattern === "hero").length;
    if (sections.length === 0) return [{ rule: "leer", message: "Die Seite hat keine Abschnitte." }];
    if (sections[0].pattern !== "hero") issues.push({ rule: "einstieg", message: "Die Seite beginnt nicht mit einem Kopf (hero).", index: 0 });
    if (heroes > 1) issues.push({ rule: "ein-kopf", message: `${heroes} K\xF6pfe auf einer Seite; es gibt genau einen Einstieg.` });
    const h1 = sections.filter((s) => s.headingLevel === 1).length;
    if (h1 !== 1) issues.push({ rule: "ein-seitentitel", message: `${h1} Seitentitel (h1); n\xF6tig ist genau einer.` });
    let previous = 1;
    sections.forEach((s, i) => {
      if (s.headingLevel === void 0) return;
      if (s.headingLevel > previous + 1) {
        issues.push({ rule: "ueberschriften", message: `\xDCberschriftenebene springt von h${previous} auf h${s.headingLevel}.`, index: i });
      }
      previous = s.headingLevel;
    });
    let run = 0;
    sections.forEach((s, i) => {
      run = (SECTION_WEIGHT[s.pattern] ?? "mittel") === "gross" ? run + 1 : 0;
      if (run === maxHeavyRun + 1) {
        issues.push({ rule: "rhythmus", message: `Mehr als ${maxHeavyRun} bildschwere Abschnitte in Folge; ein ruhiger Abschnitt (Text, Eckdaten, Spezifikation) fehlt.`, index: i });
      }
    });
    for (let i = 1; i < sections.length; i++) {
      if (sections[i].pattern === "gallery" && sections[i - 1].pattern === "gallery" && sections[i].headingLevel === void 0) {
        issues.push({ rule: "galerien", message: "Zwei Galerien direkt nacheinander ohne eigene \xDCberschrift; ihr Unterschied ist nicht erkennbar.", index: i });
      }
    }
    const last = sections[sections.length - 1].pattern;
    if (last !== "cta-band" && last !== "contact-section") {
      issues.push({ rule: "naechster-schritt", message: "Die Seite endet ohne n\xE4chsten Schritt (cta-band oder contact-section).", index: sections.length - 1 });
    }
    return issues;
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
      setupThemeToggle(root),
      setupGalleries(root)
    ]);
  }
  return __toCommonJS(index_exports);
})();
