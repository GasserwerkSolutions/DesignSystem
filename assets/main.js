/**
 * Zahnärztehaus Arch — Site-Interaction (Homepage)
 * =================================================
 *
 * Wird auf index.html geladen. Beinhaltet:
 *   - Mobile-Nav-Toggle (Hamburger)
 *   - Quick-Icon-Dropdowns (Praxis / Behandlungen) für <768 px
 *   - Submenu-Collapse innerhalb des Mobile-Drawers
 *   - Sticky-Bar: erst nach erstem Scroll einblenden
 *   - Form-Submit für #anfrage-form mit Turnstile-Token + Status-Feedback
 *   - Footer-Year (common.js liefert das auch — hier defensive Doppellinie
 *     für den Fall, dass common.js fehlt)
 *
 * Click-outside + Escape schliessen alle offenen Panels/Menüs.
 */

(() => {
  "use strict";

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setOpen(btn, open) {
    if (!btn) return;
    btn.setAttribute("aria-expanded", String(open));
  }

  // ----------------------------------------------------------------
  // Mobile-Nav-Toggle (Hamburger)
  // ----------------------------------------------------------------
  const toggle = $("#nav-toggle");
  const mainNav = $("#main-nav");

  if (toggle && mainNav) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !mainNav.classList.contains("is-open");
      mainNav.classList.toggle("is-open", open);
      setOpen(toggle, open);
      if (open) closeQuickPanels();
    });

    // Submenu-Collapse innerhalb des Mobile-Drawers:
    // Tap auf einen Parent-Link mit Submenu togglt nur das Submenu,
    // navigiert nicht.
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

  // ----------------------------------------------------------------
  // Quick-Icon-Dropdowns (Praxis / Behandlungen)
  // ----------------------------------------------------------------
  const quickButtons = $$(".nav-quick");
  const quickPanels = new Map();

  function closeQuickPanels(except) {
    for (const [btn, panel] of quickPanels) {
      if (btn === except) continue;
      panel.remove();
      setOpen(btn, false);
    }
    if (!except) quickPanels.clear();
    else {
      // remove all but the kept one
      for (const [btn] of [...quickPanels]) {
        if (btn !== except) quickPanels.delete(btn);
      }
    }
  }

  function buildQuickPanel(target) {
    // Quelle: die echte Sub-UL aus der Hauptnavigation
    const sourceLink = $(`#main-nav .nav__item--has-sub > a[href*="${target}"]`);
    const sourceSub = sourceLink ? sourceLink.parentElement.querySelector(".nav__sub") : null;
    if (!sourceSub) return null;

    const panel = sourceSub.cloneNode(true);
    panel.classList.remove("nav__sub");
    panel.classList.add("nav-quick-panel");
    panel.removeAttribute("aria-hidden");
    return panel;
  }

  quickButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = btn.dataset.target;
      if (!target) return;

      // Wenn dieses Quick-Panel offen ist → zu
      if (quickPanels.has(btn)) {
        quickPanels.get(btn).remove();
        quickPanels.delete(btn);
        setOpen(btn, false);
        return;
      }

      // Andere zu, dann öffnen
      closeQuickPanels();
      const header = btn.closest(".site-header");
      const panel = buildQuickPanel(target);
      if (!panel || !header) return;
      header.appendChild(panel);
      quickPanels.set(btn, panel);
      setOpen(btn, true);

      // Wenn Main-Nav-Drawer offen → schliessen
      if (mainNav?.classList.contains("is-open")) {
        mainNav.classList.remove("is-open");
        setOpen(toggle, false);
      }
    });
  });

  // ----------------------------------------------------------------
  // Click-outside + Escape schliessen alle Panels
  // ----------------------------------------------------------------
  document.addEventListener("click", (e) => {
    // Click innerhalb eines Panels oder Buttons?
    const insideQuick = e.target.closest(".nav-quick, .nav-quick-panel");
    if (!insideQuick) closeQuickPanels();

    const insideNav = e.target.closest("#main-nav, #nav-toggle");
    if (!insideNav && mainNav?.classList.contains("is-open")) {
      mainNav.classList.remove("is-open");
      setOpen(toggle, false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeQuickPanels();
    if (mainNav?.classList.contains("is-open")) {
      mainNav.classList.remove("is-open");
      setOpen(toggle, false);
    }
  });

  // ----------------------------------------------------------------
  // Sticky-Bar — erst nach erstem Scroll einblenden
  // ----------------------------------------------------------------
  const stickyBar = $(".sticky-bar");
  if (stickyBar) {
    const showAfter = 200;
    const onScroll = () => {
      if (window.scrollY > showAfter) {
        stickyBar.classList.add("is-visible");
      } else {
        stickyBar.classList.remove("is-visible");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ----------------------------------------------------------------
  // Footer-Year (Fallback wenn common.js fehlt)
  // ----------------------------------------------------------------
  $$("[data-current-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // ----------------------------------------------------------------
  // Anfrage-Form Submit
  // Nutzt Turnstile-Token (Cloudflare) — Widget muss bereits gerendert
  // sein (siehe <div class="cf-turnstile"…>). Submit POSTet JSON nach
  // /api/contact und zeigt Status in #anfrage-status.
  // ----------------------------------------------------------------
  const form = $("#anfrage-form");
  const status = $("#anfrage-status");
  const submit = $("#anfrage-submit");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!status || !submit) return;

      status.removeAttribute("data-state");
      status.textContent = "";

      // Honeypot
      if (form.elements.website?.value) {
        status.dataset.state = "ok";
        status.textContent = "Vielen Dank, wir melden uns zeitnah.";
        return;
      }

      // Turnstile-Token einsammeln
      const tsField = form.querySelector('[name="cf-turnstile-response"]');
      const token = tsField?.value || (window.turnstile?.getResponse?.() ?? "");
      if (!token) {
        status.dataset.state = "err";
        status.textContent = "Bitte den Captcha-Check abschliessen.";
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      data["cf-turnstile-response"] = token;

      submit.disabled = true;
      const originalLabel = submit.textContent;
      submit.textContent = "Wird gesendet …";

      try {
        const res = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(data),
        });
        const payload = await res.json().catch(() => ({}));

        if (res.ok) {
          status.dataset.state = "ok";
          status.textContent =
            "Vielen Dank — wir melden uns am nächsten Werktag.";
          form.reset();
          if (window.turnstile?.reset) window.turnstile.reset();
        } else {
          const msg =
            {
              rate_limited:
                "Zu viele Anfragen von dieser Adresse — bitte später erneut versuchen.",
              turnstile_failed:
                "Captcha-Check fehlgeschlagen. Bitte Seite neu laden.",
              missing_fields: "Bitte alle Pflichtfelder ausfüllen.",
              spam: "Anfrage wurde blockiert.",
            }[payload?.error] ||
            "Senden fehlgeschlagen. Bitte rufen Sie uns an: +41 32 679 37 88";
          status.dataset.state = "err";
          status.textContent = msg;
        }
      } catch {
        status.dataset.state = "err";
        status.textContent =
          "Netzwerkfehler. Bitte rufen Sie uns an: +41 32 679 37 88";
      } finally {
        submit.disabled = false;
        submit.textContent = originalLabel;
      }
    });
  }
})();
