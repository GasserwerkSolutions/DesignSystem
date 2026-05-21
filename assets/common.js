/**
 * Common — Skripte, die auf allen Seiten laufen.
 *
 * - Footer-Year-Stempel: jedes Element mit data-current-year bekommt
 *   das aktuelle Jahr eingesetzt.
 * - Mobile-Nav-Toggle + Quick-Panels + Sticky-Bar laufen auf allen
 *   Subseiten (auf der Homepage liefert main.js eine erweiterte
 *   Version mit Form-Submit).
 */

(() => {
  "use strict";

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Footer-Year
  $$("[data-current-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // Wenn main.js bereits Mobile-Nav-Logik geladen hat → hier nichts
  // doppeln. Marker per data-attr auf #nav-toggle.
  const toggle = $("#nav-toggle");
  if (!toggle || toggle.dataset.bound === "1") return;
  toggle.dataset.bound = "1";

  const mainNav = $("#main-nav");
  if (mainNav) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !mainNav.classList.contains("is-open");
      mainNav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });

    $$(".nav__item--has-sub > a", mainNav).forEach((link) => {
      link.addEventListener("click", (e) => {
        if (window.innerWidth >= 768) return;
        e.preventDefault();
        const item = link.parentElement;
        const wasOpen = item.classList.contains("is-open");
        $$(".nav__item--has-sub", mainNav).forEach((sib) =>
          sib.classList.remove("is-open")
        );
        if (!wasOpen) item.classList.add("is-open");
      });
    });
  }

  // Quick-Panels (Praxis/Behandlungen Mini-Dropdowns auf <768 px)
  const quickButtons = $$(".nav-quick");
  const quickPanels = new Map();

  function closeQuickPanels() {
    for (const [btn, panel] of quickPanels) {
      panel.remove();
      btn.setAttribute("aria-expanded", "false");
    }
    quickPanels.clear();
  }

  function buildQuickPanel(target) {
    const sourceLink = $(`#main-nav .nav__item--has-sub > a[href*="${target}"]`);
    const sourceSub = sourceLink ? sourceLink.parentElement.querySelector(".nav__sub") : null;
    if (!sourceSub) return null;
    const panel = sourceSub.cloneNode(true);
    panel.classList.remove("nav__sub");
    panel.classList.add("nav-quick-panel");
    return panel;
  }

  quickButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = btn.dataset.target;
      if (!target) return;
      if (quickPanels.has(btn)) {
        quickPanels.get(btn).remove();
        quickPanels.delete(btn);
        btn.setAttribute("aria-expanded", "false");
        return;
      }
      closeQuickPanels();
      const header = btn.closest(".site-header");
      const panel = buildQuickPanel(target);
      if (!panel || !header) return;
      header.appendChild(panel);
      quickPanels.set(btn, panel);
      btn.setAttribute("aria-expanded", "true");
    });
  });

  document.addEventListener("click", (e) => {
    const insideQuick = e.target.closest(".nav-quick, .nav-quick-panel");
    if (!insideQuick) closeQuickPanels();
    const insideNav = e.target.closest("#main-nav, #nav-toggle");
    if (!insideNav && mainNav?.classList.contains("is-open")) {
      mainNav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeQuickPanels();
    if (mainNav?.classList.contains("is-open")) {
      mainNav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  // Sticky-Bar
  const stickyBar = $(".sticky-bar");
  if (stickyBar) {
    const onScroll = () => {
      stickyBar.classList.toggle("is-visible", window.scrollY > 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
})();
