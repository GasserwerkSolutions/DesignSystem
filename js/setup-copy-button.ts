/**
 * Copy-Button Setup
 * =================
 *
 * Wires `.copy-btn` elements with data-copy-target (ID-Ref) or
 * data-copy-text (Inline-String). Sets data-state="copied" on success,
 * "error" on failure. Auto-clears state after 1500ms.
 */

import { combineCleanups, type Cleanup } from "./lifecycle.js";

const cleanups = new WeakMap<HTMLButtonElement, Cleanup>();

function setupButton(btn: HTMLButtonElement): Cleanup {
  const existing = cleanups.get(btn);
  if (existing) return existing;
  const timeouts = new Set<number>();
  const handleClick = async (): Promise<void> => {
    const target = btn.dataset.copyTarget
      ? btn.ownerDocument.getElementById(btn.dataset.copyTarget)
      : null;
    const text = btn.dataset.copyText ?? target?.textContent?.trim() ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      btn.dataset.state = "copied";
      const timeout = window.setTimeout(() => {
        delete btn.dataset.state;
        timeouts.delete(timeout);
      }, 1500);
      timeouts.add(timeout);
    } catch {
      btn.dataset.state = "error";
      const timeout = window.setTimeout(() => {
        delete btn.dataset.state;
        timeouts.delete(timeout);
      }, 2000);
      timeouts.add(timeout);
    }
  };
  btn.addEventListener("click", handleClick);
  const cleanup: Cleanup = () => {
    btn.removeEventListener("click", handleClick);
    for (const timeout of timeouts) window.clearTimeout(timeout);
    timeouts.clear();
    delete btn.dataset.state;
    cleanups.delete(btn);
  };
  cleanups.set(btn, cleanup);
  return cleanup;
}

export function setupCopyButton(root: ParentNode = document): Cleanup {
  const buttons = root.querySelectorAll<HTMLButtonElement>(".copy-btn");
  return combineCleanups([...buttons].map(setupButton));
}
