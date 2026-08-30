/**
 * setup-popover — Trigger-Anchoring + aria-expanded sync
 * ========================================================
 *
 * Native Popover API liefert Light-Dismiss, Esc und Top-Layer gratis.
 * Diese Setup-Funktion fügt das Trigger-Anchoring hinzu (anchor-popover
 * Utility) plus syncs aria-expanded auf dem Trigger-Button.
 */
import { type Cleanup } from "./lifecycle.js";
export declare function setupPopover(panel: HTMLElement): Cleanup;
export declare function setupPopovers(root?: ParentNode): Cleanup;
