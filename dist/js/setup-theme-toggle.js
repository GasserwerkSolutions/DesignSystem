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
import { combineCleanups } from "./lifecycle.js";
const STORAGE_KEY = "ds-mode";
/**
 * Inline-Script für den `<head>`: wendet den gespeicherten Modus vor dem
 * ersten Paint an. Inhalt ist stabil und darf per CSP-Hash freigegeben werden.
 */
export const THEME_INIT_SNIPPET = `try{var m=localStorage.getItem("${STORAGE_KEY}");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-mode",m)}catch(e){}`;
const LABELS = {
    de: { toLight: "Auf Light Mode wechseln", toDark: "Auf Dark Mode wechseln" },
    fr: { toLight: "Passer en mode clair", toDark: "Passer en mode sombre" },
    it: { toLight: "Passa alla modalità chiara", toDark: "Passa alla modalità scura" },
    en: { toLight: "Switch to light mode", toDark: "Switch to dark mode" },
};
const cleanups = new WeakMap();
const buttonLabels = new WeakMap();
function getStoredMode() {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        return value === "light" || value === "dark" ? value : null;
    }
    catch {
        return null;
    }
}
function getCurrentMode(doc) {
    const explicit = doc.documentElement.getAttribute("data-mode");
    if (explicit === "light" || explicit === "dark")
        return explicit;
    const view = doc.defaultView;
    return view?.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function resolveLabels(btn) {
    const lang = (btn.closest("[lang]")?.lang ?? "").toLowerCase().split("-")[0];
    const base = LABELS[lang] ?? LABELS.de;
    const custom = buttonLabels.get(btn) ?? {};
    return {
        toLight: btn.dataset.labelLight ?? custom.toLight ?? base.toLight,
        toDark: btn.dataset.labelDark ?? custom.toDark ?? base.toDark,
    };
}
function syncButtonLabel(btn, mode) {
    const labels = resolveLabels(btn);
    btn.setAttribute("aria-label", mode === "dark" ? labels.toLight : labels.toDark);
}
function setupButton(btn) {
    const existing = cleanups.get(btn);
    if (existing)
        return existing;
    const doc = btn.ownerDocument;
    const html = doc.documentElement;
    const handleClick = () => {
        const current = getCurrentMode(doc);
        const next = current === "dark" ? "light" : "dark";
        const apply = () => {
            html.setAttribute("data-mode", next);
            try {
                localStorage.setItem(STORAGE_KEY, next);
            }
            catch { /* private mode */ }
            doc.querySelectorAll("[data-theme-toggle]")
                .forEach((button) => syncButtonLabel(button, next));
        };
        const reducedMotion = doc.defaultView?.matchMedia("(prefers-reduced-motion: reduce)").matches ?? false;
        const docWithVT = doc;
        if (docWithVT.startViewTransition && !reducedMotion)
            docWithVT.startViewTransition(apply);
        else
            apply();
    };
    btn.addEventListener("click", handleClick);
    const cleanup = () => {
        btn.removeEventListener("click", handleClick);
        buttonLabels.delete(btn);
        cleanups.delete(btn);
    };
    cleanups.set(btn, cleanup);
    return cleanup;
}
export function setupThemeToggle(root = document, options = {}) {
    const doc = root instanceof Document ? root : (root.ownerDocument ?? document);
    const html = doc.documentElement;
    const storedMode = getStoredMode();
    if (storedMode && html.getAttribute("data-mode") !== storedMode) {
        html.setAttribute("data-mode", storedMode);
    }
    const buttons = root.querySelectorAll("[data-theme-toggle]");
    buttons.forEach((btn) => {
        if (options.labels)
            buttonLabels.set(btn, options.labels);
        syncButtonLabel(btn, getCurrentMode(doc));
    });
    return combineCleanups([...buttons].map(setupButton));
}
