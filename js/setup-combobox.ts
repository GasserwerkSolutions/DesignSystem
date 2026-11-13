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

import { anchorPopoverByTrigger } from "./anchor-popover.js";
import { combineCleanups, noopCleanup, type Cleanup } from "./lifecycle.js";

export interface ComboboxChangeDetail {
  value: string;
  label: string;
  option: HTMLElement;
}

const cleanups = new WeakMap<HTMLElement, Cleanup>();
let uid = 0;

function hidePopover(panel: HTMLElement): void {
  const popover = panel as HTMLElement & { hidePopover?: () => void };
  popover.hidePopover?.();
}

export function setupCombobox(combobox: HTMLElement): Cleanup {
  const existing = cleanups.get(combobox);
  if (existing) return existing;
  const trigger = combobox.querySelector<HTMLButtonElement>(".combobox__trigger");
  const panel   = combobox.querySelector<HTMLElement>(".combobox__panel");
  if (!trigger || !panel) return noopCleanup;
  const controller = new AbortController();
  const signal = controller.signal;

  const search = panel.querySelector<HTMLInputElement>(".combobox__search-input");
  const value  = trigger.querySelector<HTMLElement>(".combobox__value");
  const field  = combobox.querySelector<HTMLInputElement>("input.combobox__input");
  const idBase = panel.id || combobox.id || `combobox-${++uid}`;
  const generatedIds: HTMLElement[] = [];
  panel.querySelectorAll<HTMLElement>(".combobox__option").forEach((opt, i) => {
    if (opt.id) return;
    opt.id = `${idBase}-opt-${i}`;
    generatedIds.push(opt);
  });
  const optionLabel = (opt: HTMLElement): string => {
    const label = opt.querySelector<HTMLElement>(".combobox__option-label");
    return (label?.textContent ?? opt.textContent ?? "").trim();
  };
  const visibleOptions = (): NodeListOf<HTMLElement> =>
    panel.querySelectorAll<HTMLElement>(".combobox__option:not([hidden])");
  let active = -1;

  const setActive = (idx: number): void => {
    const opts = visibleOptions();
    opts.forEach((el, j) => el.classList.toggle("combobox__option--active", j === idx));
    const current = idx >= 0 ? opts[idx] : undefined;
    if (current) current.scrollIntoView({ block: "nearest" });
    // aria-activedescendant gehört auf das Element mit DOM-Focus; der Focus
    // liegt je nach Markup auf Search-Input oder Trigger → beide synchron.
    for (const owner of [search, trigger]) {
      if (!owner) continue;
      if (current) owner.setAttribute("aria-activedescendant", current.id);
      else owner.removeAttribute("aria-activedescendant");
    }
    active = current ? idx : -1;
  };

  const select = (opt: HTMLElement): void => {
    panel.querySelectorAll<HTMLElement>(".combobox__option")
         .forEach((o) => o.setAttribute("aria-selected", "false"));
    opt.setAttribute("aria-selected", "true");
    const label = optionLabel(opt);
    const nextValue = opt.dataset.value ?? label;
    if (value) value.textContent = label;
    if (field && field.value !== nextValue) {
      field.value = nextValue;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
    combobox.dispatchEvent(new CustomEvent<ComboboxChangeDetail>("combobox:change", {
      bubbles: true,
      detail: { value: nextValue, label, option: opt },
    }));
    hidePopover(panel);
  };

  const releaseAnchor = anchorPopoverByTrigger(panel, {
    matchWidth: true,
    onToggle: (e) => {
      trigger.setAttribute(
        "aria-expanded",
        e.newState === "open" ? "true" : "false"
      );
      if (e.newState !== "open") {
        setActive(-1);
        return;
      }
      // Beim Öffnen auf der gewählten Option starten (APG-Empfehlung).
      const opts = [...visibleOptions()];
      setActive(opts.findIndex((o) => o.getAttribute("aria-selected") === "true"));
      panel.ownerDocument.defaultView?.requestAnimationFrame(() => search?.focus());
    },
  });

  panel.addEventListener("click", (e) => {
    const opt = (e.target as HTMLElement).closest<HTMLElement>(".combobox__option");
    if (opt) select(opt);
  }, { signal });

  combobox.addEventListener("keydown", (e) => {
    const opts = visibleOptions();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(active + 1, opts.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(active - 1, 0));
    } else if (e.key === "Home" && opts.length > 0 && e.target !== search) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && opts.length > 0 && e.target !== search) {
      e.preventDefault();
      setActive(opts.length - 1);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      select(opts[active]);
    } else if (e.key === "Escape") {
      hidePopover(panel);
      trigger.focus();
    }
  }, { signal });

  search?.addEventListener("input", () => {
    const q = search.value.toLowerCase();
    panel.querySelectorAll<HTMLElement>(".combobox__option").forEach((o) => {
      const haystack = (o.dataset.search ?? o.textContent ?? "").toLowerCase();
      o.hidden = q !== "" && !haystack.includes(q);
    });
    setActive(-1);
  }, { signal });

  const cleanup: Cleanup = () => {
    controller.abort();
    releaseAnchor();
    trigger.setAttribute("aria-expanded", "false");
    panel.querySelectorAll<HTMLElement>(".combobox__option--active")
      .forEach((option) => option.classList.remove("combobox__option--active"));
    search?.removeAttribute("aria-activedescendant");
    trigger.removeAttribute("aria-activedescendant");
    generatedIds.forEach((option) => option.removeAttribute("id"));
    cleanups.delete(combobox);
  };
  cleanups.set(combobox, cleanup);
  return cleanup;
}

export function setupComboboxes(root: ParentNode = document): Cleanup {
  return combineCleanups([...root.querySelectorAll<HTMLElement>(".combobox")].map(setupCombobox));
}
