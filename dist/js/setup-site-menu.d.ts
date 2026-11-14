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
import { type Cleanup } from "./lifecycle.js";
export declare function setupSiteMenu(header: HTMLElement): Cleanup;
export declare function setupSiteMenus(root?: ParentNode): Cleanup;
