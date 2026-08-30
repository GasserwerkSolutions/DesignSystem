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
const cleanups = new WeakMap();
export function anchorPopoverByTrigger(panel, options = {}) {
    const existing = cleanups.get(panel);
    if (existing)
        return existing;
    const { matchWidth = false, offset = 4, onToggle } = options;
    const handleToggle = (rawEvent) => {
        const e = rawEvent;
        if (onToggle)
            onToggle(e);
        if (e.newState !== "open")
            return;
        const trigger = panel.ownerDocument.querySelector(`[popovertarget="${panel.id}"]`);
        if (!trigger)
            return;
        const r = trigger.getBoundingClientRect();
        panel.style.top = `${r.bottom + offset}px`;
        panel.style.left = `${r.left}px`;
        if (matchWidth)
            panel.style.minWidth = `${r.width}px`;
    };
    panel.addEventListener("beforetoggle", handleToggle);
    let active = true;
    const cleanup = () => {
        if (!active)
            return;
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
