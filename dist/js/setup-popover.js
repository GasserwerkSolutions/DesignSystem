/**
 * setup-popover — Trigger-Anchoring + aria-expanded sync
 * ========================================================
 *
 * Native Popover API liefert Light-Dismiss, Esc und Top-Layer gratis.
 * Diese Setup-Funktion fügt das Trigger-Anchoring hinzu (anchor-popover
 * Utility) plus syncs aria-expanded auf dem Trigger-Button.
 */
import { anchorPopoverByTrigger } from "./anchor-popover.js";
import { combineCleanups } from "./lifecycle.js";
const cleanups = new WeakMap();
export function setupPopover(panel) {
    const existing = cleanups.get(panel);
    if (existing)
        return existing;
    const releaseAnchor = anchorPopoverByTrigger(panel, {
        onToggle: (e) => {
            const trigger = panel.ownerDocument.querySelector(`[popovertarget="${panel.id}"]`);
            if (trigger) {
                trigger.setAttribute("aria-expanded", e.newState === "open" ? "true" : "false");
            }
        },
    });
    const cleanup = () => {
        releaseAnchor();
        cleanups.delete(panel);
    };
    cleanups.set(panel, cleanup);
    return cleanup;
}
export function setupPopovers(root = document) {
    return combineCleanups([...root.querySelectorAll(".popover")].map(setupPopover));
}
