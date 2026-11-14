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
import { type Cleanup } from "./lifecycle.js";
export declare function setupGallery(gallery: HTMLElement): Cleanup;
export declare function setupGalleries(root?: ParentNode): Cleanup;
