/**
 * setup-popover — Trigger-Anchoring + aria-expanded sync
 * ========================================================
 *
 * Native Popover API liefert Light-Dismiss, Esc und Top-Layer gratis.
 * Diese Setup-Funktion fügt das Trigger-Anchoring hinzu (anchor-popover
 * Utility) plus syncs aria-expanded auf dem Trigger-Button.
 */

import { anchorPopoverByTrigger } from "./anchor-popover.js";

export function setupPopover(panel: HTMLElement): void {
  anchorPopoverByTrigger(panel, {
    onToggle: (e) => {
      const trigger = document.querySelector<HTMLElement>(
        `[popovertarget="${panel.id}"]`
      );
      if (trigger) {
        trigger.setAttribute(
          "aria-expanded",
          e.newState === "open" ? "true" : "false"
        );
      }
    },
  });
}

export function setupPopovers(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(".popover").forEach(setupPopover);
}
