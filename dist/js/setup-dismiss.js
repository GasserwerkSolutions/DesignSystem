/**
 * setup-dismiss — generic [data-dismiss] pattern
 * ================================================
 *
 * Konsumenten markieren Close-Buttons mit data-dismiss="<selector>",
 * Click entfernt den nächsten matching Ancestor. Spart 3 duplizierte
 * Listener für Alert / Tag / Toast.
 *
 * Markup:
 *   <button data-dismiss=".alert">×</button>
 *   <button data-dismiss=".tag">×</button>
 *
 * Auto-Init via setupDismissers(); Single-Element via setupDismisser(el).
 */
import { combineCleanups, noopCleanup } from "./lifecycle.js";
const cleanups = new WeakMap();
export function setupDismisser(button) {
    const existing = cleanups.get(button);
    if (existing)
        return existing;
    const selector = button.dataset.dismiss;
    if (!selector)
        return noopCleanup;
    const handleClick = () => {
        try {
            button.closest(selector)?.remove();
        }
        catch {
            /* Invalid consumer selectors must not break unrelated controls. */
        }
    };
    button.addEventListener("click", handleClick);
    const cleanup = () => {
        button.removeEventListener("click", handleClick);
        cleanups.delete(button);
    };
    cleanups.set(button, cleanup);
    return cleanup;
}
export function setupDismissers(root = document) {
    return combineCleanups([...root.querySelectorAll("[data-dismiss]")].map(setupDismisser));
}
