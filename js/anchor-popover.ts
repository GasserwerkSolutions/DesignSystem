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

export function anchorPopoverByTrigger(
  panel: HTMLElement,
  options: AnchorOptions = {}
): void {
  const { matchWidth = false, offset = 4, onToggle } = options;

  panel.addEventListener("beforetoggle", (rawEvent) => {
    const e = rawEvent as ToggleEvent;
    if (onToggle) onToggle(e);
    if (e.newState !== "open") return;

    const trigger = document.querySelector<HTMLElement>(
      `[popovertarget="${panel.id}"]`
    );
    if (!trigger) return;

    const r = trigger.getBoundingClientRect();
    panel.style.top = `${r.bottom + offset}px`;
    panel.style.left = `${r.left}px`;
    if (matchWidth) panel.style.minWidth = `${r.width}px`;
  });
}
