/**
 * anchor-popover — shared positioning for Popover + Combobox
 * ===========================================================
 *
 * Native Popover API rendert das Panel im Top-Layer. Das bricht
 * "position relative to trigger" — diese Utility positioniert das Panel
 * am Trigger und hält es im Viewport:
 *
 *   1. `beforetoggle` (open): Startposition unter dem Trigger, damit das
 *      Panel nie bei 0/0 aufblitzt.
 *   2. `toggle` (open): Panel ist gerendert und messbar → Flip nach oben,
 *      wenn unten kein Platz ist, und horizontale Begrenzung auf den
 *      Viewport (schmale Screens, Trigger am rechten Rand).
 *   3. Solange offen: Scroll und Resize führen die Position nach.
 *
 * Das Panel bekommt `data-placement="bottom" | "top"` für Styling-Hooks.
 *
 * Wichtig: `beforetoggle`/`toggle` bubbeln NICHT — Listener MUSS per-Element
 * attached werden. Diese Funktion erledigt das.
 *
 * Wo CSS Anchor Positioning verfügbar ist (Chrome 125+, Safari 26+,
 * Firefox: experimental), kann Konsument dies durch eigene CSS-Rule
 * mit unique anchor-name pro Trigger ersetzen. Panels mit gesetztem
 * `position-anchor` werden von dieser Utility nicht positioniert.
 */
const cleanups = new WeakMap();
/**
 * Findet den nativen Popover-Trigger ohne ungeprüfte ID-Interpolation.
 * CMS-generierte IDs dürfen selector-sensitive Zeichen enthalten; ein
 * ungültiger Selector darf das Öffnen des Popovers nicht abbrechen.
 */
export function findPopoverTrigger(panel) {
    if (!panel.id)
        return null;
    const doc = panel.ownerDocument;
    const escape = doc.defaultView?.CSS?.escape;
    if (typeof escape === "function") {
        return doc.querySelector(`[popovertarget="${escape(panel.id)}"]`);
    }
    // Fallback für ältere DOM-Implementierungen ohne CSS.escape().
    return [...doc.querySelectorAll("[popovertarget]")]
        .find((candidate) => candidate.getAttribute("popovertarget") === panel.id) ?? null;
}
function usesCssAnchor(panel, view) {
    const value = view.getComputedStyle(panel).getPropertyValue("position-anchor").trim();
    // Initialwert ist je nach Browser-Version `auto`, `normal` oder `none` —
    // nur ein expliziter dashed-ident bedeutet "Konsument ankert per CSS".
    return value.startsWith("--");
}
export function anchorPopoverByTrigger(panel, options = {}) {
    const existing = cleanups.get(panel);
    if (existing)
        return existing;
    const { matchWidth = false, offset = 4, margin = 8, onToggle } = options;
    const doc = panel.ownerDocument;
    const view = doc.defaultView;
    /** Positioniert das Panel. `measured` = Panel ist gerendert und messbar. */
    const place = (measured) => {
        const trigger = findPopoverTrigger(panel);
        if (!trigger || !view)
            return;
        if (usesCssAnchor(panel, view))
            return;
        const r = trigger.getBoundingClientRect();
        if (matchWidth)
            panel.style.minWidth = `${r.width}px`;
        const vw = doc.documentElement.clientWidth;
        const vh = doc.documentElement.clientHeight;
        const pw = measured ? panel.offsetWidth : 0;
        const ph = measured ? panel.offsetHeight : 0;
        const rtl = view.getComputedStyle(trigger).direction === "rtl";
        let left = rtl ? r.right - pw : r.left;
        const maxLeft = Math.max(margin, vw - pw - margin);
        left = Math.min(Math.max(left, margin), maxLeft);
        let top = r.bottom + offset;
        let placement = "bottom";
        if (measured && top + ph > vh - margin) {
            const above = r.top - offset - ph;
            if (above >= margin) {
                top = above;
                placement = "top";
            }
            else {
                // Weder unten noch oben genug Platz: im Viewport halten.
                top = Math.max(margin, vh - ph - margin);
            }
        }
        panel.style.top = `${Math.round(top)}px`;
        panel.style.left = `${Math.round(left)}px`;
        panel.dataset.placement = placement;
    };
    let stopTracking = null;
    const startTracking = () => {
        if (stopTracking || !view)
            return;
        let frame = 0;
        const schedule = () => {
            if (frame)
                return;
            frame = view.requestAnimationFrame(() => {
                frame = 0;
                place(true);
            });
        };
        // capture: fängt auch Scroll in verschachtelten Scroll-Containern.
        view.addEventListener("scroll", schedule, { capture: true, passive: true });
        view.addEventListener("resize", schedule, { passive: true });
        stopTracking = () => {
            view.removeEventListener("scroll", schedule, { capture: true });
            view.removeEventListener("resize", schedule);
            if (frame)
                view.cancelAnimationFrame(frame);
            stopTracking = null;
        };
    };
    const handleBeforeToggle = (rawEvent) => {
        const e = rawEvent;
        if (onToggle)
            onToggle(e);
        if (e.newState === "open")
            place(false);
        else
            stopTracking?.();
    };
    const handleToggle = (rawEvent) => {
        const e = rawEvent;
        if (e.newState !== "open")
            return;
        place(true);
        startTracking();
    };
    panel.addEventListener("beforetoggle", handleBeforeToggle);
    panel.addEventListener("toggle", handleToggle);
    let active = true;
    const cleanup = () => {
        if (!active)
            return;
        active = false;
        panel.removeEventListener("beforetoggle", handleBeforeToggle);
        panel.removeEventListener("toggle", handleToggle);
        stopTracking?.();
        panel.style.removeProperty("top");
        panel.style.removeProperty("left");
        panel.style.removeProperty("min-width");
        delete panel.dataset.placement;
        cleanups.delete(panel);
    };
    cleanups.set(panel, cleanup);
    return cleanup;
}
