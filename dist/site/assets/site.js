/* Site-Runtime — axis-switchers, sidebar-search, URL-state, token-edits.
   URL-State-Konvention:
     ?tone=premium&mode=dark&density=compact
     &t.--btn-radius=2rem&t.--color-interactive=%231db954
   Token-Edits werden mit "t."-Prefix vor dem Token-Namen kodiert. */
(function () {
  const root = document.documentElement;
  const editedTokens = new Map();
  let urlSyncQueued = false;

  function getUrlParams() {
    return new URLSearchParams(location.search);
  }

  function syncUrl() {
    if (urlSyncQueued) return;
    urlSyncQueued = true;
    requestAnimationFrame(() => {
      urlSyncQueued = false;
      const params = new URLSearchParams();
      const tone = root.getAttribute("data-tone");
      const mode = root.getAttribute("data-mode");
      const density = root.getAttribute("data-density");
      if (tone && tone !== "trust") params.set("tone", tone);
      if (mode && mode !== "light") params.set("mode", mode);
      if (density && density !== "comfortable") params.set("density", density);
      for (const [name, value] of editedTokens) {
        params.set("t." + name, value);
      }
      const search = params.toString();
      const url = location.pathname + (search ? "?" + search : "") + location.hash;
      history.replaceState(null, "", url);
    });
  }

  function readState() {
    const params = getUrlParams();
    const tone = params.get("tone") || localStorage.getItem("ds-tone") || "trust";
    const mode = params.get("mode") || localStorage.getItem("ds-mode") || "light";
    const density = params.get("density") || localStorage.getItem("ds-density") || "comfortable";
    root.setAttribute("data-tone", tone);
    root.setAttribute("data-mode", mode);
    root.setAttribute("data-density", density);
    document.querySelectorAll('[data-axis="tone"]').forEach((el) => (el.value = tone));
    document.querySelectorAll('[data-axis="density"]').forEach((el) => (el.value = density));

    for (const [key, value] of params) {
      if (key.startsWith("t.")) {
        const tokenName = key.slice(2);
        applyTokenEdit(tokenName, value);
      }
    }
  }

  function persist() {
    localStorage.setItem("ds-tone", root.getAttribute("data-tone"));
    localStorage.setItem("ds-mode", root.getAttribute("data-mode"));
    localStorage.setItem("ds-density", root.getAttribute("data-density"));
    syncUrl();
  }

  /* View-Transitions wrap: wenn die API verfügbar ist (Chrome 111+,
     Safari 18+), wird der Axis-Switch in eine startViewTransition gewrapt.
     Browser nimmt einen Snapshot vor + nach der Änderung und blendet
     smooth über (crossfade). Andere Browser: instant switch wie zuvor. */
  function withTransition(fn) {
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.startViewTransition(fn);
    } else {
      fn();
    }
  }

  /* withTransition wrapt das Update + persist gemeinsam. persist() liest
     dann das frisch gesetzte Attribut. */
  document.addEventListener("change", (e) => {
    const t = e.target.closest('[data-axis="tone"]');
    if (t) {
      withTransition(() => {
        root.setAttribute("data-tone", t.value);
        persist();
      });
      return;
    }
    const d = e.target.closest('[data-axis="density"]');
    if (d) {
      withTransition(() => {
        root.setAttribute("data-density", d.value);
        persist();
      });
      return;
    }
  });

  document.addEventListener("click", (e) => {
    const m = e.target.closest('[data-axis="mode"]');
    if (m) {
      const next = root.getAttribute("data-mode") === "dark" ? "light" : "dark";
      withTransition(() => {
        root.setAttribute("data-mode", next);
        persist();
      });
    }
  });

  document.addEventListener("input", (e) => {
    const s = e.target.closest("[data-sidebar-search]");
    if (!s) return;
    const q = s.value.trim().toLowerCase();
    document.querySelectorAll(".site-sidebar__link").forEach((a) => {
      const match = !q || a.textContent.toLowerCase().includes(q);
      a.style.display = match ? "" : "none";
    });
  });

  /* Foundations: Live-Token-Edit */
  function applyTokenEdit(name, value) {
    root.style.setProperty(name, value);
    editedTokens.set(name, value);
    const item = document.querySelector(`[data-token-name="${name}"]`);
    if (item) {
      item.classList.add("foundation-token--edited");
      const valueEl = item.querySelector(".foundation-token__value");
      if (valueEl && valueEl.tagName === "SPAN") valueEl.textContent = value;
    }
  }

  function setTokenValue(name, value) {
    applyTokenEdit(name, value);
    syncUrl();
  }

  function resetTokenValue(name) {
    root.style.removeProperty(name);
    editedTokens.delete(name);
    const item = document.querySelector(`[data-token-name="${name}"]`);
    if (item) item.classList.remove("foundation-token--edited");
    syncUrl();
  }

  function resetAllTokens() {
    for (const name of [...editedTokens.keys()]) {
      root.style.removeProperty(name);
      const item = document.querySelector(`[data-token-name="${name}"]`);
      if (item) item.classList.remove("foundation-token--edited");
    }
    editedTokens.clear();
    syncUrl();
  }

  document.addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit-token]");
    if (editBtn) {
      const name = editBtn.getAttribute("data-edit-token");
      const li = editBtn.closest(".foundation-token");
      const valueEl = li.querySelector(".foundation-token__value");
      const original = valueEl.getAttribute("data-original-value");
      const current = editedTokens.has(name) ? editedTokens.get(name) : original;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "foundation-token__edit-input";
      input.value = current;
      input.spellcheck = false;
      valueEl.replaceWith(input);
      input.focus();
      input.select();
      const commit = () => {
        const newValue = input.value.trim();
        const span = document.createElement("span");
        span.className = "foundation-token__value";
        span.setAttribute("data-original-value", original);
        span.textContent = newValue;
        input.replaceWith(span);
        if (newValue !== original) setTokenValue(name, newValue);
        else resetTokenValue(name);
      };
      input.addEventListener("blur", commit, { once: true });
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") input.blur();
        if (ev.key === "Escape") {
          input.value = original;
          input.blur();
        }
      });
      return;
    }
    const resetBtn = e.target.closest("[data-foundation-reset]");
    if (resetBtn) {
      resetAllTokens();
      document.querySelectorAll(".foundation-token__value").forEach((el) => {
        el.textContent = el.getAttribute("data-original-value");
      });
    }
    const shareBtn = e.target.closest("[data-share-url]");
    if (shareBtn) {
      navigator.clipboard.writeText(location.href).then(() => {
        const original = shareBtn.textContent;
        shareBtn.textContent = "✓ Kopiert";
        setTimeout(() => (shareBtn.textContent = original), 1500);
      }).catch(() => {
        shareBtn.textContent = "× Fehler";
      });
    }

    /* Example-Editor: Edit / Copy / Reset / Tone-Jump */
    const editToggle = e.target.closest("[data-edit-toggle]");
    if (editToggle) {
      const ex = editToggle.closest("[data-example]");
      const source = ex.querySelector("[data-source]").parentElement;
      const isHidden = source.hasAttribute("hidden");
      if (isHidden) {
        source.removeAttribute("hidden");
        editToggle.setAttribute("aria-pressed", "true");
        editToggle.textContent = "Hide source";
        ex.classList.add("is-editing");
      } else {
        source.setAttribute("hidden", "");
        editToggle.setAttribute("aria-pressed", "false");
        editToggle.textContent = "Edit";
        ex.classList.remove("is-editing");
      }
      return;
    }

    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const ex = copyBtn.closest("[data-example]");
      const ta = ex.querySelector("[data-source]");
      navigator.clipboard.writeText(ta.value).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = "✓";
        setTimeout(() => (copyBtn.textContent = original), 1200);
      }).catch(() => (copyBtn.textContent = "×"));
      return;
    }

    const exampleReset = e.target.closest("[data-reset]");
    if (exampleReset) {
      const ex = exampleReset.closest("[data-example]");
      const ta = ex.querySelector("[data-source]");
      const original = ta.getAttribute("data-original");
      ta.value = original;
      ex.querySelector("[data-preview]").innerHTML = original;
      exampleReset.hidden = true;
      return;
    }

    const toneJump = e.target.closest("[data-tone-jump]");
    if (toneJump) {
      const tone = toneJump.getAttribute("data-tone-jump");
      root.setAttribute("data-tone", tone);
      document.querySelectorAll('[data-axis="tone"]').forEach((el) => (el.value = tone));
      persist();
    }
  });

  /* Live-Editor: on input in source-textarea, re-render preview. */
  document.addEventListener("input", (e) => {
    const ta = e.target.closest("[data-source]");
    if (!ta) return;
    const ex = ta.closest("[data-example]");
    const preview = ex.querySelector("[data-preview]");
    preview.innerHTML = ta.value;
    const original = ta.getAttribute("data-original");
    const resetBtn = ex.querySelector("[data-reset]");
    if (resetBtn) resetBtn.hidden = ta.value === original;
    if (window.DS && typeof DS.setupAll === "function") DS.setupAll();
  });

  /* Mega-Menu (Components-Nav-Item):
     - Click auf Trigger → toggle das Panel (Touch + Mobile)
     - Hover (Desktop, fine-pointer) wird im CSS gehandhabt
     - Escape oder click-outside schließt das Panel
     Mobile-Menu-Toggle (Hamburger) öffnet/schließt das ganze topbar__nav. */
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-mega-trigger]");
    if (trigger) {
      const mega = trigger.closest("[data-mega]");
      const panel = mega.querySelector("[data-mega-panel]");
      const isOpen = panel.getAttribute("data-open") === "true";
      panel.setAttribute("data-open", isOpen ? "false" : "true");
      mega.setAttribute("data-open", isOpen ? "false" : "true");
      trigger.setAttribute("aria-expanded", isOpen ? "false" : "true");
      if (!isOpen) panel.removeAttribute("hidden");
      e.stopPropagation();
      return;
    }
    /* click-outside schließt Mega-Menu */
    document.querySelectorAll("[data-mega][data-open='true']").forEach((m) => {
      if (!m.contains(e.target)) {
        m.querySelector("[data-mega-panel]").setAttribute("data-open", "false");
        m.setAttribute("data-open", "false");
        m.querySelector("[data-mega-trigger]")?.setAttribute("aria-expanded", "false");
      }
    });

    const burger = e.target.closest("[data-mobile-menu]");
    if (burger) {
      const nav = document.getElementById("site-topbar-nav");
      const isOpen = nav.getAttribute("data-mobile-open") === "true";
      nav.setAttribute("data-mobile-open", isOpen ? "false" : "true");
      burger.setAttribute("aria-expanded", isOpen ? "false" : "true");
      burger.setAttribute("aria-label", isOpen ? "Menü öffnen" : "Menü schließen");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll("[data-mega][data-open='true']").forEach((m) => {
        m.querySelector("[data-mega-panel]").setAttribute("data-open", "false");
        m.setAttribute("data-open", "false");
        m.querySelector("[data-mega-trigger]")?.setAttribute("aria-expanded", "false");
      });
    }
  });

  readState();
  if (window.DS && typeof DS.setupAll === "function") DS.setupAll();
})();
