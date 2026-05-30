/**
 * Copy-Button Setup
 * =================
 *
 * Wires `.copy-btn` elements with data-copy-target (ID-Ref) or
 * data-copy-text (Inline-String). Sets data-state="copied" on success,
 * "error" on failure. Auto-clears state after 1500ms.
 */
export declare function setupCopyButton(root?: ParentNode): void;
