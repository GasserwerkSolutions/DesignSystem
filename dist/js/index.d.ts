/**
 * @gws/design-system-js — Companion JavaScript für interactive Components
 * ========================================================================
 *
 * Per-Component-Imports (tree-shakable):
 *   import { setupCombobox } from "@gws/design-system-js/setup-combobox";
 *   import { setupPopovers } from "@gws/design-system-js/setup-popover";
 *   import { setupDismissers } from "@gws/design-system-js/setup-dismiss";
 *
 * Auto-Init alles in einem Aufruf:
 *   import { setupAll } from "@gws/design-system-js";
 *   setupAll();
 */
export { setupDismisser, setupDismissers } from "./setup-dismiss.js";
export { setupPopover, setupPopovers } from "./setup-popover.js";
export { setupCombobox, setupComboboxes } from "./setup-combobox.js";
export { setupFileUpload, setupFileUploads } from "./setup-file-upload.js";
export { setupSlider, setupSliders, type SliderOptions } from "./setup-slider.js";
export { setupCopyButton } from "./setup-copy-button.js";
export { setupOtpInput } from "./setup-otp-input.js";
export { setupThemeToggle } from "./setup-theme-toggle.js";
export { anchorPopoverByTrigger, type AnchorOptions } from "./anchor-popover.js";
/**
 * Initialisiert alle interactive Components in einem Aufruf.
 * Für selektive Adoption: einzelne setup*-Functions importieren.
 */
export declare function setupAll(root?: ParentNode): void;
