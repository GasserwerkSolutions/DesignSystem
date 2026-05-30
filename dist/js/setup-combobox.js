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
import { anchorPopoverByTrigger } from "./anchor-popover.js";
export function setupCombobox(combobox) {
    const trigger = combobox.querySelector(".combobox__trigger");
    const panel = combobox.querySelector(".combobox__panel");
    if (!trigger || !panel)
        return;
    const search = panel.querySelector(".combobox__search-input");
    const value = trigger.querySelector(".combobox__value");
    const visibleOptions = () => panel.querySelectorAll(".combobox__option:not([hidden])");
    let active = -1;
    const setActive = (idx) => {
        const opts = visibleOptions();
        opts.forEach((el, j) => el.classList.toggle("combobox__option--active", j === idx));
        if (idx >= 0 && opts[idx])
            opts[idx].scrollIntoView({ block: "nearest" });
        active = idx;
    };
    const select = (opt) => {
        panel.querySelectorAll(".combobox__option")
            .forEach((o) => o.setAttribute("aria-selected", "false"));
        opt.setAttribute("aria-selected", "true");
        if (value) {
            const label = opt.querySelector(".combobox__option-label");
            value.textContent = (label?.textContent ?? opt.textContent ?? "").trim();
        }
        panel.hidePopover();
    };
    anchorPopoverByTrigger(panel, {
        matchWidth: true,
        onToggle: (e) => {
            trigger.setAttribute("aria-expanded", e.newState === "open" ? "true" : "false");
            if (e.newState !== "open")
                return;
            setActive(-1);
            requestAnimationFrame(() => search?.focus());
        },
    });
    panel.addEventListener("click", (e) => {
        const opt = e.target.closest(".combobox__option");
        if (opt)
            select(opt);
    });
    combobox.addEventListener("keydown", (e) => {
        const opts = visibleOptions();
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(Math.min(active + 1, opts.length - 1));
        }
        else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(active - 1, 0));
        }
        else if (e.key === "Enter" && active >= 0) {
            e.preventDefault();
            select(opts[active]);
        }
        else if (e.key === "Escape") {
            panel.hidePopover();
            trigger.focus();
        }
    });
    search?.addEventListener("input", () => {
        const q = search.value.toLowerCase();
        panel.querySelectorAll(".combobox__option").forEach((o) => {
            const haystack = (o.dataset.search ?? o.textContent ?? "").toLowerCase();
            o.hidden = q !== "" && !haystack.includes(q);
        });
        setActive(-1);
    });
}
export function setupComboboxes(root = document) {
    root.querySelectorAll(".combobox").forEach(setupCombobox);
}
