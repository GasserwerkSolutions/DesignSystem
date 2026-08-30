/**
 * anchor-popover — shared positioning for Popover + Combobox
 * ===========================================================
 *
 * Native Popover API rendert das Panel im Top-Layer. Das bricht
 * "position relative to trigger" — diese Utility schreibt top/left
 * vor jedem Open via beforetoggle.
 *
 * Wichtig: `beforetoggle` bubbelt NICHT — Listener MUSS per-Element
 * attached werden. Diese Funktion erledigt das.
 *
 * Wo CSS Anchor Positioning verfügbar ist (Chrome 125+, Safari 26+,
 * Firefox: experimental), kann Konsument dies durch eigene CSS-Rule
 * mit unique anchor-name pro Trigger ersetzen — dann onOpen weglassen.
 */

export interface AnchorOptions {
  /** Setzt minWidth des Panels auf Trigger-Breite (für Comboboxes). */
  matchWidth?: boolean;
  /** Vertikaler Offset unter dem Trigger (default 4 px). */
  offset?: number;
  /**
   * Zusätzlicher Hook, läuft bei beforetoggle (open + close).
   * Combobox nutzt das z.B. für aria-expanded-Sync + Search-Focus.
   */
  onToggle?: (event: ToggleEvent) => void;
}

import { type Cleanup } from "./lifecycle.js";

const cleanups = new WeakMap<HTMLElement, Cleanup>();

export function anchorPopoverByTrigger(
  panel: HTMLElement,
  options: AnchorOptions = {}
): Cleanup {
  const existing = cleanups.get(panel);
  if (existing) return existing;
  const { matchWidth = false, offset = 4, onToggle } = options;

  const handleToggle = (rawEvent: Event): void => {
    const e = rawEvent as ToggleEvent;
    if (onToggle) onToggle(e);
    if (e.newState !== "open") return;

    const trigger = panel.ownerDocument.querySelector<HTMLElement>(
      `[popovertarget="${panel.id}"]`
    );
    if (!trigger) return;

    const r = trigger.getBoundingClientRect();
    panel.style.top = `${r.bottom + offset}px`;
    panel.style.left = `${r.left}px`;
    if (matchWidth) panel.style.minWidth = `${r.width}px`;
  };
  panel.addEventListener("beforetoggle", handleToggle);

  let active = true;
  const cleanup: Cleanup = () => {
    if (!active) return;
    active = false;
    panel.removeEventListener("beforetoggle", handleToggle);
    panel.style.removeProperty("top");
    panel.style.removeProperty("left");
    panel.style.removeProperty("min-width");
    cleanups.delete(panel);
  };
  cleanups.set(panel, cleanup);
  return cleanup;
}
