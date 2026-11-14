/**
 * setup-gallery — Lightbox für das Gallery-Pattern
 * ================================================
 *
 * Progressive Enhancement: Jede Kachel ist ein Link auf das grosse Bild.
 * Mit diesem Setup öffnet der Klick stattdessen die Lightbox (<dialog>).
 * Fokusfalle, Escape und Top-Layer kommen vom nativen Dialog.
 *
 * Tastatur: ←/→ blättern, Home/End springen, Esc schliesst, Tab bleibt im Dialog. Beim Schliessen
 * kehrt der Fokus auf die zuletzt gezeigte Kachel zurück.
 *
 * Markup-Erwartung (siehe patterns/gallery.css Header):
 *   <ul class="gallery" data-gallery [data-lightbox="id"]>
 *     <li><a class="gallery__item" href="gross.jpg" data-caption="…"><img …></a></li>
 *   </ul>
 *   <dialog class="lightbox" [id="id"]>…</dialog>
 *
 * Ohne `data-lightbox` wird der nächste `dialog.lightbox` im Dokument genutzt.
 *
 * Übrige Bilder: `<li data-gallery-rest>` blendet das Setup aus und setzt
 * einen Knopf `.gallery__more` hinter die Liste («3 weitere Bilder zeigen»,
 * Text aus `data-more-label` oder planGallery().moreLabel). Ein Klick zeigt
 * sie und setzt den Fokus auf das erste davon. Die Lightbox zeigt immer alle.
 */

import { combineCleanups, type Cleanup } from "./lifecycle.js";
import { galleryMoreLabel } from "./layout-rules.js";

/** Blendet übrige Bilder hinter einen sichtbaren Knopf. Ohne Lightbox nutzbar. */
function setupRest(gallery: HTMLElement, signal: AbortSignal): () => void {
  const rest = gallery.querySelectorAll<HTMLElement>(":scope > [data-gallery-rest]");
  if (rest.length === 0) return () => {};
  const doc = gallery.ownerDocument;
  const button = doc.createElement("button");
  button.type = "button";
  button.className = "gallery__more";
  button.textContent = gallery.dataset.moreLabel ?? galleryMoreLabel(rest.length);
  gallery.setAttribute("data-collapsed", "");
  gallery.after(button);
  button.addEventListener("click", () => {
    gallery.removeAttribute("data-collapsed");
    rest[0].querySelector<HTMLElement>("a, button")?.focus();
    button.remove();
  }, { signal });
  return () => {
    gallery.removeAttribute("data-collapsed");
    button.remove();
  };
}

const cleanups = new WeakMap<HTMLElement, Cleanup>();

export function setupGallery(gallery: HTMLElement): Cleanup {
  const existing = cleanups.get(gallery);
  if (existing) return existing;

  const doc = gallery.ownerDocument;
  const controller = new AbortController();
  const signal = controller.signal;
  const undoRest = setupRest(gallery, signal);
  const dialog = gallery.dataset.lightbox
    ? (doc.getElementById(gallery.dataset.lightbox) as HTMLDialogElement | null)
    : doc.querySelector<HTMLDialogElement>("dialog.lightbox");
  const image = dialog?.querySelector<HTMLImageElement>(".lightbox__image");
  if (!dialog || !image || typeof dialog.showModal !== "function") {
    const restOnly: Cleanup = () => { controller.abort(); undoRest(); cleanups.delete(gallery); };
    cleanups.set(gallery, restOnly);
    return restOnly;
  }

  const caption = dialog.querySelector<HTMLElement>(".lightbox__caption");
  const prev = dialog.querySelector<HTMLButtonElement>(".lightbox__nav--prev");
  const next = dialog.querySelector<HTMLButtonElement>(".lightbox__nav--next");
  const close = dialog.querySelector<HTMLButtonElement>(".lightbox__close");

  const items = (): HTMLAnchorElement[] =>
    [...gallery.querySelectorAll<HTMLAnchorElement>("a.gallery__item")];
  let index = -1;
  /** Nur die Galerie, die den Dialog geöffnet hat, reagiert auf dessen Events. */
  let owner = false;

  const show = (i: number): void => {
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
    const item = (e.target as HTMLElement).closest<HTMLAnchorElement>("a.gallery__item");
    if (!item || !gallery.contains(item)) return;
    // Neue-Tab-Klicks (Ctrl/Cmd/Shift/Mitteltaste) dem Browser überlassen.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    owner = true;
    show(items().indexOf(item));
    if (!dialog.open) dialog.showModal();
  }, { signal });

  prev?.addEventListener("click", () => { if (owner) show(index - 1); }, { signal });
  next?.addEventListener("click", () => { if (owner) show(index + 1); }, { signal });
  close?.addEventListener("click", () => { if (owner) dialog.close(); }, { signal });

  dialog.addEventListener("keydown", (e) => {
    if (!owner) return;
    const last = items().length - 1;
    // Tab bleibt im Dialog: ohne das springt Chrome nach dem letzten Knopf
    // in die Adressleiste, und Shift+Tab läuft aus dem ersten heraus.
    if (e.key === "Tab") {
      const stops = [...dialog.querySelectorAll<HTMLElement>("button")].filter((b) => !b.hidden && b.getClientRects().length > 0);
      if (stops.length === 0) return;
      const first = stops[0], last = stops[stops.length - 1];
      const active = doc.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && (active === last || !dialog.contains(active))) { first.focus(); e.preventDefault(); }
      return;
    }
    if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "Home") show(0);
    else if (e.key === "End") show(last);
    else return;
    e.preventDefault();
  }, { signal });

  // Klick auf die dunkle Fläche (nicht auf Bild oder Buttons) schliesst.
  dialog.addEventListener("click", (e) => {
    if (owner && e.target === dialog) dialog.close();
  }, { signal });

  dialog.addEventListener("close", () => {
    if (!owner) return;
    owner = false;
    image.removeAttribute("src");
    const shown = items()[index];
    // Ein ausgeblendetes übriges Bild kann keinen Fokus bekommen: dann der Knopf.
    const more = gallery.nextElementSibling;
    if (shown?.closest("[data-gallery-rest]") && gallery.hasAttribute("data-collapsed")
      && more instanceof HTMLElement && more.matches(".gallery__more")) more.focus();
    else shown?.focus();
  }, { signal });

  const cleanup: Cleanup = () => {
    controller.abort();
    undoRest();
    if (owner && dialog.open) dialog.close();
    owner = false;
    cleanups.delete(gallery);
  };
  cleanups.set(gallery, cleanup);
  return cleanup;
}

export function setupGalleries(root: ParentNode = document): Cleanup {
  return combineCleanups([...root.querySelectorAll<HTMLElement>("[data-gallery]")].map(setupGallery));
}
