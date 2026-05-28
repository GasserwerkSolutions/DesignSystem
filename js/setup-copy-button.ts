/**
 * Copy-Button Setup
 * =================
 *
 * Wires `.copy-btn` elements with data-copy-target (ID-Ref) or
 * data-copy-text (Inline-String). Sets data-state="copied" on success,
 * "error" on failure. Auto-clears state after 1500ms.
 */

export function setupCopyButton(root: ParentNode = document): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>(".copy-btn");
  buttons.forEach((btn) => {
    if (btn.dataset.copyInit === "1") return;
    btn.dataset.copyInit = "1";

    btn.addEventListener("click", async () => {
      const target = btn.dataset.copyTarget
        ? document.getElementById(btn.dataset.copyTarget)
        : null;
      const text =
        btn.dataset.copyText ??
        target?.textContent?.trim() ??
        "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        btn.dataset.state = "copied";
        setTimeout(() => delete btn.dataset.state, 1500);
      } catch {
        btn.dataset.state = "error";
        setTimeout(() => delete btn.dataset.state, 2000);
      }
    });
  });
}
