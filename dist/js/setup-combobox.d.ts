/**
 * setup-combobox — Keyboard, Selection, Filter, Anchoring
 * =========================================================
 *
 * WAI-ARIA-Combobox-Pattern 1.2. Volle Keyboard-Navigation
 * (ArrowUp/Down/Enter/Esc), aria-selected-Toggle, optionaler
 * Search-Filter via data-search-Stichworte, Trigger-Anchoring
 * (shared mit setup-popover).
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
export declare function setupCombobox(combobox: HTMLElement): void;
export declare function setupComboboxes(root?: ParentNode): void;
