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

function makeFormatter(input: HTMLInputElement, opts: SliderOptions): (v: string) => string {
  if (opts.format) return opts.format;
  const prefix = input.dataset.formatPrefix ?? "";
  const suffix = input.dataset.formatSuffix ?? "";
  return (v: string) => `${prefix}${v}${suffix}`;
}

export function setupSlider(slider: HTMLElement, opts: SliderOptions = {}): void {
  const input  = slider.querySelector<HTMLInputElement>('input[type="range"]');
  const output = slider.querySelector<HTMLOutputElement>(".slider__value");
  if (!input) return;

  const format = makeFormatter(input, opts);

  const sync = (): void => {
    const min = parseFloat(input.min || "0");
    const max = parseFloat(input.max || "100");
    const pct = ((input.valueAsNumber - min) / (max - min)) * 100;
    input.style.setProperty("--range-fill-pct", `${pct}%`);
    if (output) output.value = format(input.value);
  };

  input.addEventListener("input", sync);
  sync();
}

export function setupSliders(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(".slider").forEach((el) => setupSlider(el));
}
