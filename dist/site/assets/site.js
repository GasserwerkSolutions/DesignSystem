/* Site-Runtime — axis-switchers (tone/mode/density) + sidebar-search. */
(function () {
  const root = document.documentElement;

  function readState() {
    const params = new URLSearchParams(location.search);
    const tone = params.get("tone") || localStorage.getItem("ds-tone") || "trust";
    const mode = params.get("mode") || localStorage.getItem("ds-mode") || "light";
    const density = params.get("density") || localStorage.getItem("ds-density") || "comfortable";
    root.setAttribute("data-tone", tone);
    root.setAttribute("data-mode", mode);
    root.setAttribute("data-density", density);
    document.querySelectorAll('[data-axis="tone"]').forEach((el) => (el.value = tone));
    document.querySelectorAll('[data-axis="density"]').forEach((el) => (el.value = density));
  }

  function persist() {
    localStorage.setItem("ds-tone", root.getAttribute("data-tone"));
    localStorage.setItem("ds-mode", root.getAttribute("data-mode"));
    localStorage.setItem("ds-density", root.getAttribute("data-density"));
  }

  document.addEventListener("change", (e) => {
    const t = e.target.closest('[data-axis="tone"]');
    if (t) { root.setAttribute("data-tone", t.value); persist(); return; }
    const d = e.target.closest('[data-axis="density"]');
    if (d) { root.setAttribute("data-density", d.value); persist(); return; }
  });

  document.addEventListener("click", (e) => {
    const m = e.target.closest('[data-axis="mode"]');
    if (m) {
      const next = root.getAttribute("data-mode") === "dark" ? "light" : "dark";
      root.setAttribute("data-mode", next);
      persist();
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
  const editedTokens = new Map();

  function setTokenValue(name, value) {
    root.style.setProperty(name, value);
    editedTokens.set(name, value);
    const item = document.querySelector(`[data-token-name="${name}"]`);
    if (item) item.classList.add("foundation-token--edited");
  }

  function resetTokenValue(name) {
    root.style.removeProperty(name);
    editedTokens.delete(name);
    const item = document.querySelector(`[data-token-name="${name}"]`);
    if (item) item.classList.remove("foundation-token--edited");
  }

  function resetAllTokens() {
    for (const name of [...editedTokens.keys()]) resetTokenValue(name);
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
  });

  readState();
  if (window.DS && typeof DS.setupAll === "function") DS.setupAll();
})();
