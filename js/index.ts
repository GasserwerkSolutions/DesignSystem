/**
 * @gasserwerksolutions/design-system — Companion JavaScript für interactive Components
 * ================================================================================
 *
 * Per-Component-Imports (tree-shakable):
 *   import { setupCombobox } from "@gasserwerksolutions/design-system/js/setup-combobox";
 *   import { setupPopovers } from "@gasserwerksolutions/design-system/js/setup-popover";
 *   import { setupDismissers } from "@gasserwerksolutions/design-system/js/setup-dismiss";
 *
 * Auto-Init alles in einem Aufruf:
 *   import { setupAll } from "@gasserwerksolutions/design-system/js";
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

import { setupDismissers } from "./setup-dismiss.js";
import { setupPopovers } from "./setup-popover.js";
import { setupComboboxes } from "./setup-combobox.js";
import { setupFileUploads } from "./setup-file-upload.js";
import { setupSliders } from "./setup-slider.js";
import { setupCopyButton } from "./setup-copy-button.js";
import { setupOtpInput } from "./setup-otp-input.js";
import { setupThemeToggle } from "./setup-theme-toggle.js";

/**
 * Initialisiert alle interactive Components in einem Aufruf.
 * Für selektive Adoption: einzelne setup*-Functions importieren.
 */
export function setupAll(root: ParentNode = document): void {
  setupDismissers(root);
  setupPopovers(root);
  setupComboboxes(root);
  setupFileUploads(root);
  setupSliders(root);
  setupCopyButton(root);
  setupOtpInput(root);
  setupThemeToggle(root);
}
