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
function makeFormatter(input, opts) {
    if (opts.format)
        return opts.format;
    const prefix = input.dataset.formatPrefix ?? "";
    const suffix = input.dataset.formatSuffix ?? "";
    return (v) => `${prefix}${v}${suffix}`;
}
export function setupSlider(slider, opts = {}) {
    const input = slider.querySelector('input[type="range"]');
    const output = slider.querySelector(".slider__value");
    if (!input)
        return;
    const format = makeFormatter(input, opts);
    const sync = () => {
        const min = parseFloat(input.min || "0");
        const max = parseFloat(input.max || "100");
        const pct = ((input.valueAsNumber - min) / (max - min)) * 100;
        input.style.setProperty("--range-fill-pct", `${pct}%`);
        if (output)
            output.value = format(input.value);
    };
    input.addEventListener("input", sync);
    sync();
}
export function setupSliders(root = document) {
    root.querySelectorAll(".slider").forEach((el) => setupSlider(el));
}
