/**
 * Theme-Toggle Setup
 * ==================
 *
 * Klickbarer Button toggelt `data-mode` zwischen light/dark auf html-root,
 * persistiert in localStorage. Nutzt View-Transitions wenn verfügbar für
 * smooth Cross-Fade aller mode-sensitiven Tokens.
 *
 * Labels (aria-label), in dieser Reihenfolge aufgelöst:
 *   1. `data-label-light` / `data-label-dark` auf dem Button
 *   2. `options.labels`
 *   3. Sprache aus `<html lang>` (de, fr, it, en), Fallback Deutsch
 *
 * Kein Aufblitzen beim Laden: `setupThemeToggle()` läuft erst nach dem
 * JS-Load. Damit der gespeicherte Modus schon vor dem ersten Paint greift,
 * `THEME_INIT_SNIPPET` als Inline-Script in den `<head>` setzen (vor dem
 * Stylesheet):
 *
 *   <script>try{var m=localStorage.getItem("ds-mode");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-mode",m)}catch(e){}</script>
 */
import { type Cleanup } from "./lifecycle.js";
export interface ThemeToggleLabels {
    /** aria-label, wenn ein Klick auf Light Mode wechselt (aktuell dark). */
    toLight: string;
    /** aria-label, wenn ein Klick auf Dark Mode wechselt (aktuell light). */
    toDark: string;
}
export interface ThemeToggleOptions {
    labels?: Partial<ThemeToggleLabels>;
}
/**
 * Inline-Script für den `<head>`: wendet den gespeicherten Modus vor dem
 * ersten Paint an. Inhalt ist stabil und darf per CSP-Hash freigegeben werden.
 */
export declare const THEME_INIT_SNIPPET = "try{var m=localStorage.getItem(\"ds-mode\");if(m===\"light\"||m===\"dark\")document.documentElement.setAttribute(\"data-mode\",m)}catch(e){}";
export declare function setupThemeToggle(root?: ParentNode, options?: ThemeToggleOptions): Cleanup;
