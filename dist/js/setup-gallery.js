/**
 * setup-gallery — Lightbox für das Gallery-Pattern
 * ================================================
 *
 * Progressive Enhancement: Jede Kachel ist ein Link auf das grosse Bild.
 * Mit diesem Setup öffnet der Klick stattdessen die Lightbox (<dialog>).
 * Fokusfalle, Escape und Top-Layer kommen vom nativen Dialog.
 *
 * Tastatur: ←/→ blättern, Home/End springen, Esc schliesst. Beim Schliessen
 * kehrt der Fokus auf die zuletzt gezeigte Kachel zurück.
 *
 * Markup-Erwartung (siehe patterns/gallery.css Header):
 *   <ul class="gallery" data-gallery [data-lightbox="id"]>
 *     <li><a class="gallery__item" href="gross.jpg" data-caption="…"><img …></a></li>
 *   </ul>
 *   <dialog class="lightbox" [id="id"]>…</dialog>
 *
 * Ohne `data-lightbox` wird der nächste `dialog.lightbox` im Dokument genutzt.
 */
import { combineCleanups, noopCleanup } from "./lifecycle.js";
const cleanups = new WeakMap();
export function setupGallery(gallery) {
    const existing = cleanups.get(gallery);
    if (existing)
        return existing;
    const doc = gallery.ownerDocument;
    const dialog = gallery.dataset.lightbox
        ? doc.getElementById(gallery.dataset.lightbox)
        : doc.querySelector("dialog.lightbox");
    const image = dialog?.querySelector(".lightbox__image");
    if (!dialog || !image || typeof dialog.showModal !== "function")
        return noopCleanup;
    const caption = dialog.querySelector(".lightbox__caption");
    const prev = dialog.querySelector(".lightbox__nav--prev");
    const next = dialog.querySelector(".lightbox__nav--next");
    const close = dialog.querySelector(".lightbox__close");
    const controller = new AbortController();
    const signal = controller.signal;
    const items = () => [...gallery.querySelectorAll("a.gallery__item")];
    let index = -1;
    /** Nur die Galerie, die den Dialog geöffnet hat, reagiert auf dessen Events. */
    let owner = false;
    const show = (i) => {
        const list = items();
        if (list.length === 0)
            return;
        index = Math.min(Math.max(i, 0), list.length - 1);
        const item = list[index];
        const thumb = item.querySelector("img");
        const text = item.dataset.caption ?? thumb?.alt ?? "";
        image.src = item.href;
        image.alt = thumb?.alt ?? "";
        if (caption) {
            caption.textContent = list.length > 1 ? `${text} (${index + 1}/${list.length})`.trim() : text;
        }
        if (prev)
            prev.hidden = index === 0;
        if (next)
            next.hidden = index === list.length - 1;
    };
    gallery.addEventListener("click", (e) => {
        const item = e.target.closest("a.gallery__item");
        if (!item || !gallery.contains(item))
            return;
        // Neue-Tab-Klicks (Ctrl/Cmd/Shift/Mitteltaste) dem Browser überlassen.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
            return;
        e.preventDefault();
        owner = true;
        show(items().indexOf(item));
        if (!dialog.open)
            dialog.showModal();
    }, { signal });
    prev?.addEventListener("click", () => { if (owner)
        show(index - 1); }, { signal });
    next?.addEventListener("click", () => { if (owner)
        show(index + 1); }, { signal });
    close?.addEventListener("click", () => { if (owner)
        dialog.close(); }, { signal });
    dialog.addEventListener("keydown", (e) => {
        if (!owner)
            return;
        const last = items().length - 1;
        if (e.key === "ArrowLeft")
            show(index - 1);
        else if (e.key === "ArrowRight")
            show(index + 1);
        else if (e.key === "Home")
            show(0);
        else if (e.key === "End")
            show(last);
        else
            return;
        e.preventDefault();
    }, { signal });
    // Klick auf die dunkle Fläche (nicht auf Bild oder Buttons) schliesst.
    dialog.addEventListener("click", (e) => {
        if (owner && e.target === dialog)
            dialog.close();
    }, { signal });
    dialog.addEventListener("close", () => {
        if (!owner)
            return;
        owner = false;
        image.removeAttribute("src");
        items()[index]?.focus();
    }, { signal });
    const cleanup = () => {
        controller.abort();
        if (owner && dialog.open)
            dialog.close();
        owner = false;
        cleanups.delete(gallery);
    };
    cleanups.set(gallery, cleanup);
    return cleanup;
}
export function setupGalleries(root = document) {
    return combineCleanups([...root.querySelectorAll("[data-gallery]")].map(setupGallery));
}
