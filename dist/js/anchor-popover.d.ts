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
export interface AnchorOptions {
    /** Setzt minWidth des Panels auf Trigger-Breite (für Comboboxes). */
    matchWidth?: boolean;
    /** Vertikaler Offset zum Trigger (default 4 px). */
    offset?: number;
    /** Mindestabstand zum Viewport-Rand (default 8 px). */
    margin?: number;
    /**
     * Zusätzlicher Hook, läuft bei beforetoggle (open + close).
     * Combobox nutzt das z.B. für aria-expanded-Sync + Search-Focus.
     */
    onToggle?: (event: ToggleEvent) => void;
}
import { type Cleanup } from "./lifecycle.js";
/**
 * Findet den nativen Popover-Trigger ohne ungeprüfte ID-Interpolation.
 * CMS-generierte IDs dürfen selector-sensitive Zeichen enthalten; ein
 * ungültiger Selector darf das Öffnen des Popovers nicht abbrechen.
 */
export declare function findPopoverTrigger(panel: HTMLElement): HTMLElement | null;
export declare function anchorPopoverByTrigger(panel: HTMLElement, options?: AnchorOptions): Cleanup;
