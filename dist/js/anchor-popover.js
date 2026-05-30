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
export function anchorPopoverByTrigger(panel, options = {}) {
    const { matchWidth = false, offset = 4, onToggle } = options;
    panel.addEventListener("beforetoggle", (rawEvent) => {
        const e = rawEvent;
        if (onToggle)
            onToggle(e);
        if (e.newState !== "open")
            return;
        const trigger = document.querySelector(`[popovertarget="${panel.id}"]`);
        if (!trigger)
            return;
        const r = trigger.getBoundingClientRect();
        panel.style.top = `${r.bottom + offset}px`;
        panel.style.left = `${r.left}px`;
        if (matchWidth)
            panel.style.minWidth = `${r.width}px`;
    });
}
