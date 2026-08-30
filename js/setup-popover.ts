/**
 * setup-popover — Trigger-Anchoring + aria-expanded sync
 * ========================================================
 *
 * Native Popover API liefert Light-Dismiss, Esc und Top-Layer gratis.
 * Diese Setup-Funktion fügt das Trigger-Anchoring hinzu (anchor-popover
 * Utility) plus syncs aria-expanded auf dem Trigger-Button.
 */

import { anchorPopoverByTrigger } from "./anchor-popover.js";
import { combineCleanups, type Cleanup } from "./lifecycle.js";

const cleanups = new WeakMap<HTMLElement, Cleanup>();

export function setupPopover(panel: HTMLElement): Cleanup {
  const existing = cleanups.get(panel);
  if (existing) return existing;
  const releaseAnchor = anchorPopoverByTrigger(panel, {
    onToggle: (e) => {
      const trigger = panel.ownerDocument.querySelector<HTMLElement>(
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
  const cleanup: Cleanup = () => {
    releaseAnchor();
    cleanups.delete(panel);
  };
  cleanups.set(panel, cleanup);
  return cleanup;
}

export function setupPopovers(root: ParentNode = document): Cleanup {
  return combineCleanups([...root.querySelectorAll<HTMLElement>(".popover")].map(setupPopover));
}
