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
export function setupDismisser(button) {
    const selector = button.dataset.dismiss;
    if (!selector)
        return;
    button.addEventListener("click", () => {
        button.closest(selector)?.remove();
    });
}
export function setupDismissers(root = document) {
    root.querySelectorAll("[data-dismiss]").forEach(setupDismisser);
}
