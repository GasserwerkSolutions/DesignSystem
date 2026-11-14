/**
 * setup-site-menu — Menü-Knopf für das Site-Header-Pattern
 * ========================================================
 *
 * Progressive Enhancement: Ohne JavaScript bleibt `.site-header__toggle`
 * verborgen und die Navigation bricht unter die Marke um. Dieses Setup misst
 * bei jeder Breitenänderung, ob alle Links in einer Zeile neben der Marke
 * Platz haben, und setzt `data-menu="inline"` oder `data-menu="collapsed"`.
 * Es gibt keinen festen Breakpoint: zehn Ziele klappen früher als vier,
 * und bei 200 % Textgrösse klappt das Menü von selbst.
 *
 * Verhalten:
 *   - Klick auf den Knopf öffnet/schliesst (aria-expanded, data-menu-open)
 *   - Escape schliesst und gibt den Fokus an den Knopf zurück
 *   - Klick auf einen Link im Menü schliesst
 *   - Passen die Links wieder in eine Zeile, schliesst das Menü
 *
 * Markup-Erwartung (siehe patterns/site-header.css):
 *   <header class="site-header site-header--menu">
 *     … <button class="site-header__toggle" aria-expanded="false" aria-controls="nav">Menü</button>
 *       <nav class="site-header__nav" id="nav">…</nav>
 *   </header>
 */

import { combineCleanups, noopCleanup, type Cleanup } from "./lifecycle.js";

const cleanups = new WeakMap<HTMLElement, Cleanup>();

export function setupSiteMenu(header: HTMLElement): Cleanup {
  const existing = cleanups.get(header);
  if (existing) return existing;

  const toggle = header.querySelector<HTMLButtonElement>(".site-header__toggle");
  const navId = toggle?.getAttribute("aria-controls");
  const nav = navId
    ? header.ownerDocument.getElementById(navId)
    : header.querySelector<HTMLElement>(".site-header__nav");
  if (!toggle || !nav) return noopCleanup;

  const controller = new AbortController();
  const signal = controller.signal;
  const view = header.ownerDocument.defaultView;

  const brand = header.querySelector<HTMLElement>(".site-header__brand");
  const inner = nav.parentElement ?? header;

  const setOpen = (open: boolean): void => {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) header.setAttribute("data-menu-open", "");
    else header.removeAttribute("data-menu-open");
  };
  const isOpen = (): boolean => toggle.getAttribute("aria-expanded") === "true";
  const collapsed = (): boolean => header.getAttribute("data-menu") === "collapsed";

  /** Links in einer Zeile neben der Marke? Gemessen im ausgeklappten Zustand. */
  const measure = (): void => {
    const wasOpen = isOpen();
    header.setAttribute("data-menu", "inline");
    const overflow = nav.scrollWidth > nav.clientWidth + 1 || inner.scrollWidth > inner.clientWidth + 1;
    const below = brand ? nav.getBoundingClientRect().top >= brand.getBoundingClientRect().bottom - 1 : false;
    if (overflow || below) {
      header.setAttribute("data-menu", "collapsed");
      setOpen(wasOpen);
    } else {
      setOpen(false);
    }
  };

  let frame = 0;
  const schedule = (): void => {
    if (!view) return measure();
    view.cancelAnimationFrame(frame);
    frame = view.requestAnimationFrame(measure);
  };

  measure();
  let lastWidth = header.clientWidth;
  const observer = typeof ResizeObserver === "function"
    ? new ResizeObserver(() => {
      // Nur auf Breitenänderung reagieren: das offene Menü ändert die Höhe.
      if (header.clientWidth === lastWidth) return;
      lastWidth = header.clientWidth;
      schedule();
    })
    : null;
  observer?.observe(header);
  // Webfonts ändern die Breite der Links nach dem ersten Messen.
  header.ownerDocument.fonts?.ready.then(() => { if (!signal.aborted) schedule(); });

  toggle.addEventListener("click", () => setOpen(!isOpen()), { signal });

  header.ownerDocument.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  }, { signal });

  nav.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a") && collapsed()) setOpen(false);
  }, { signal });

  const cleanup: Cleanup = () => {
    controller.abort();
    observer?.disconnect();
    view?.cancelAnimationFrame(frame);
    header.removeAttribute("data-menu");
    header.removeAttribute("data-menu-open");
    toggle.setAttribute("aria-expanded", "false");
    cleanups.delete(header);
  };
  cleanups.set(header, cleanup);
  return cleanup;
}

export function setupSiteMenus(root: ParentNode = document): Cleanup {
  return combineCleanups(
    [...root.querySelectorAll<HTMLElement>(".site-header--menu")].map(setupSiteMenu)
  );
}
