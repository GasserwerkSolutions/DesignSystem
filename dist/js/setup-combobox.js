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
import { combineCleanups, noopCleanup } from "./lifecycle.js";
const cleanups = new WeakMap();
function hidePopover(panel) {
    const popover = panel;
    popover.hidePopover?.();
}
export function setupCombobox(combobox) {
    const existing = cleanups.get(combobox);
    if (existing)
        return existing;
    const trigger = combobox.querySelector(".combobox__trigger");
    const panel = combobox.querySelector(".combobox__panel");
    if (!trigger || !panel)
        return noopCleanup;
    const controller = new AbortController();
    const signal = controller.signal;
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
        hidePopover(panel);
    };
    const releaseAnchor = anchorPopoverByTrigger(panel, {
        matchWidth: true,
        onToggle: (e) => {
            trigger.setAttribute("aria-expanded", e.newState === "open" ? "true" : "false");
            if (e.newState !== "open")
                return;
            setActive(-1);
            panel.ownerDocument.defaultView?.requestAnimationFrame(() => search?.focus());
        },
    });
    panel.addEventListener("click", (e) => {
        const opt = e.target.closest(".combobox__option");
        if (opt)
            select(opt);
    }, { signal });
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
            hidePopover(panel);
            trigger.focus();
        }
    }, { signal });
    search?.addEventListener("input", () => {
        const q = search.value.toLowerCase();
        panel.querySelectorAll(".combobox__option").forEach((o) => {
            const haystack = (o.dataset.search ?? o.textContent ?? "").toLowerCase();
            o.hidden = q !== "" && !haystack.includes(q);
        });
        setActive(-1);
    }, { signal });
    const cleanup = () => {
        controller.abort();
        releaseAnchor();
        trigger.setAttribute("aria-expanded", "false");
        panel.querySelectorAll(".combobox__option--active")
            .forEach((option) => option.classList.remove("combobox__option--active"));
        cleanups.delete(combobox);
    };
    cleanups.set(combobox, cleanup);
    return cleanup;
}
export function setupComboboxes(root = document) {
    return combineCleanups([...root.querySelectorAll(".combobox")].map(setupCombobox));
}
