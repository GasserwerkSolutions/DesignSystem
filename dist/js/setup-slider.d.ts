/**
 * setup-slider — Track-Fill + Output-Sync auf input event
 * =========================================================
 *
 * .range erweitert um linear-gradient(fill X%, track X%) mit
 * --range-fill-pct Custom-Property. Diese Funktion updated:
 *   1. --range-fill-pct via input-Event
 *   2. <output for="...">-Element mit aktuellem Wert
 *
 * Optionale Custom-Formatter via data-formatter attribute oder
 * setupSlider(el, { format }) explicit. Beispiel:
 *   <input type="range" id="price" data-format-prefix="CHF ">
 * → output zeigt "CHF 120" statt "120".
 */
export interface SliderOptions {
    /** Custom formatter, e.g. (v) => `CHF ${v}`. Wenn nicht gesetzt:
     *  data-format-prefix + data-format-suffix Attribute werden gelesen. */
    format?: (value: string) => string;
}
export declare function setupSlider(slider: HTMLElement, opts?: SliderOptions): void;
export declare function setupSliders(root?: ParentNode): void;
