/**
 * setup-combobox — Keyboard, Selection, Filter, Anchoring
 * =========================================================
 *
 * WAI-ARIA-Combobox-Pattern 1.2. Volle Keyboard-Navigation
 * (ArrowUp/Down/Home/End/Enter/Esc), aria-selected-Toggle, optionaler
 * Search-Filter via data-search-Stichworte, Trigger-Anchoring
 * (shared mit setup-popover).
 *
 * Screenreader: Die aktive Option wird per `aria-activedescendant` auf dem
 * fokussierten Element (Search-Input bzw. Trigger) gemeldet. Optionen ohne
 * id bekommen automatisch eine.
 *
 * Formulare: Ein optionales `<input type="hidden" class="combobox__input"
 * name="…">` im Combobox-Root bekommt den gewählten Wert (`data-value` der
 * Option, sonst deren Label) und feuert `input` + `change`. Zusätzlich
 * feuert der Root ein bubbelndes `combobox:change` mit
 * `detail: { value, label, option }`.
 *
 * Markup-Erwartung (siehe components/combobox.css Header):
 *   <div class="combobox">
 *     <button class="combobox__trigger" popovertarget="...">
 *       <span class="combobox__value">…</span>
 *       <span class="chevron"></span>
 *     </button>
 *     <div class="combobox__panel" popover>
 *       <div class="combobox__search">
 *         <input class="combobox__search-input">
 *       </div>
 *       <ul class="combobox__listbox" role="listbox">
 *         <li class="combobox__option" role="option" aria-selected="false">…</li>
 *       </ul>
 *     </div>
 *   </div>
 */
import { type Cleanup } from "./lifecycle.js";
export interface ComboboxChangeDetail {
    value: string;
    label: string;
    option: HTMLElement;
}
export declare function setupCombobox(combobox: HTMLElement): Cleanup;
export declare function setupComboboxes(root?: ParentNode): Cleanup;
