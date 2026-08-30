/**
 * Theme-Toggle Setup
 * ==================
 *
 * Klickbarer Button toggelt `data-mode` zwischen light/dark auf html-root,
 * persistiert in localStorage. Nutzt View-Transitions wenn verfügbar für
 * smooth Cross-Fade aller mode-sensitiven Tokens.
 */

const STORAGE_KEY = "ds-mode";
import { combineCleanups, type Cleanup } from "./lifecycle.js";

const cleanups = new WeakMap<HTMLElement, Cleanup>();

function getStoredMode(): "light" | "dark" | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function getCurrentMode(): "light" | "dark" {
  const explicit = document.documentElement.getAttribute("data-mode");
  if (explicit === "light" || explicit === "dark") return explicit;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function syncButtonLabel(btn: HTMLElement, mode: "light" | "dark"): void {
  btn.setAttribute(
    "aria-label",
    mode === "dark" ? "Auf Light Mode wechseln" : "Auf Dark Mode wechseln"
  );
}

function setupButton(btn: HTMLElement): Cleanup {
  const existing = cleanups.get(btn);
  if (existing) return existing;
  const html = btn.ownerDocument.documentElement;
  const handleClick = (): void => {
    const current = getCurrentMode();
    const next = current === "dark" ? "light" : "dark";

    const apply = () => {
      html.setAttribute("data-mode", next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
      btn.ownerDocument.querySelectorAll<HTMLElement>("[data-theme-toggle]")
        .forEach((button) => syncButtonLabel(button, next));
    };

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const docWithVT = btn.ownerDocument as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (docWithVT.startViewTransition && !reducedMotion) docWithVT.startViewTransition(apply);
    else apply();
  };
  btn.addEventListener("click", handleClick);
  const cleanup: Cleanup = () => {
    btn.removeEventListener("click", handleClick);
    cleanups.delete(btn);
  };
  cleanups.set(btn, cleanup);
  return cleanup;
}

export function setupThemeToggle(root: ParentNode = document): Cleanup {
  const html = document.documentElement;
  const storedMode = getStoredMode();
  if (storedMode && html.getAttribute("data-mode") !== storedMode) {
    html.setAttribute("data-mode", storedMode);
  }

  const buttons = root.querySelectorAll<HTMLElement>("[data-theme-toggle]");
  buttons.forEach((btn) => {
    syncButtonLabel(btn, getCurrentMode());
  });
  return combineCleanups([...buttons].map(setupButton));
}
