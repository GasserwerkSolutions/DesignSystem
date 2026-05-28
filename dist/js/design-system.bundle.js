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

// js/setup-copy-button.ts
function setupCopyButton(root = document) {
  const buttons = root.querySelectorAll(".copy-btn");
  buttons.forEach((btn) => {
    if (btn.dataset.copyInit === "1") return;
    btn.dataset.copyInit = "1";
    btn.addEventListener("click", async () => {
      const target = btn.dataset.copyTarget ? document.getElementById(btn.dataset.copyTarget) : null;
      const text = btn.dataset.copyText ?? target?.textContent?.trim() ?? "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        btn.dataset.state = "copied";
        setTimeout(() => delete btn.dataset.state, 1500);
      } catch {
        btn.dataset.state = "error";
        setTimeout(() => delete btn.dataset.state, 2e3);
      }
    });
  });
}

// js/setup-otp-input.ts
function setupOtpInput(root = document) {
  const groups = root.querySelectorAll(".otp-input");
  groups.forEach((group) => {
    if (group.dataset.otpInit === "1") return;
    group.dataset.otpInit = "1";
    const fields = Array.from(
      group.querySelectorAll(".otp-input__field")
    );
    fields.forEach((field, i) => {
      field.addEventListener("input", () => {
        field.value = field.value.replace(/[^0-9]/g, "").slice(0, 1);
        if (field.value && i < fields.length - 1) {
          fields[i + 1].focus();
        }
      });
      field.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !field.value && i > 0) {
          fields[i - 1].focus();
        } else if (e.key === "ArrowLeft" && i > 0) {
          fields[i - 1].focus();
          e.preventDefault();
        } else if (e.key === "ArrowRight" && i < fields.length - 1) {
          fields[i + 1].focus();
          e.preventDefault();
        }
      });
      field.addEventListener("paste", (e) => {
        e.preventDefault();
        const data = (e.clipboardData?.getData("text") || "").replace(/[^0-9]/g, "");
        for (let j = 0; j < data.length && i + j < fields.length; j++) {
          fields[i + j].value = data[j];
        }
        const focusIdx = Math.min(i + data.length, fields.length - 1);
        fields[focusIdx].focus();
      });
    });
  });
}

// js/setup-theme-toggle.ts
function setupThemeToggle(root = document) {
  const buttons = root.querySelectorAll("[data-theme-toggle]");
  buttons.forEach((btn) => {
    if (btn.dataset.toggleInit === "1") return;
    btn.dataset.toggleInit = "1";
    btn.addEventListener("click", () => {
      const html = document.documentElement;
      const current = html.getAttribute("data-mode") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      const apply = () => {
        html.setAttribute("data-mode", next);
        try {
          localStorage.setItem("ds-mode", next);
        } catch {
        }
        btn.setAttribute(
          "aria-label",
          next === "dark" ? "Auf Light Mode wechseln" : "Auf Dark Mode wechseln"
        );
      };
      const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const docWithVT = document;
      if (docWithVT.startViewTransition && !reducedMotion) {
        docWithVT.startViewTransition(apply);
      } else {
        apply();
      }
    });
  });
}

// js/index.ts
function setupAll(root = document) {
  setupDismissers(root);
  setupPopovers(root);
  setupComboboxes(root);
  setupFileUploads(root);
  setupSliders(root);
  setupCopyButton(root);
  setupOtpInput(root);
  setupThemeToggle(root);
}
export {
  anchorPopoverByTrigger,
  setupAll,
  setupCombobox,
  setupComboboxes,
  setupCopyButton,
  setupDismisser,
  setupDismissers,
  setupFileUpload,
  setupFileUploads,
  setupOtpInput,
  setupPopover,
  setupPopovers,
  setupSlider,
  setupSliders,
  setupThemeToggle
};
