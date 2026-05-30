/**
 * Theme-Toggle Setup
 * ==================
 *
 * Klickbarer Button toggelt `data-mode` zwischen light/dark auf html-root,
 * persistiert in localStorage. Nutzt View-Transitions wenn verfügbar für
 * smooth Cross-Fade aller mode-sensitiven Tokens.
 */

export function setupThemeToggle(root: ParentNode = document): void {
  const buttons = root.querySelectorAll<HTMLElement>("[data-theme-toggle]");
  buttons.forEach((btn) => {
    if (btn.dataset.toggleInit === "1") return;
    btn.dataset.toggleInit = "1";

    btn.addEventListener("click", () => {
      const html = document.documentElement;
      const current =
        html.getAttribute("data-mode") ??
        (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";

      const apply = () => {
        html.setAttribute("data-mode", next);
        try {
          localStorage.setItem("ds-mode", next);
        } catch {
          /* ignore (private-browsing etc.) */
        }
        btn.setAttribute(
          "aria-label",
          next === "dark" ? "Auf Light Mode wechseln" : "Auf Dark Mode wechseln"
        );
      };

      const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const docWithVT = document as Document & {
        startViewTransition?: (cb: () => void) => unknown;
      };
      if (docWithVT.startViewTransition && !reducedMotion) {
        docWithVT.startViewTransition(apply);
      } else {
        apply();
      }
    });
  });
}
