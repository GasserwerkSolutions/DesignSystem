/**
 * setup-file-upload — Drag-Counter + Drop + Selected-File-Anzeige
 * =================================================================
 *
 * `dragleave` feuert auch beim Übertritt auf Kind-Elemente (Icon,
 * Text-Spans). Counter-Pattern hält dragging=true bis der Pointer
 * wirklich die Dropzone verlässt.
 *
 * Selected-Filename wird im .file-upload__text-Element angezeigt,
 * mit "+N weitere"-Suffix bei multiple-Selection.
 */
import { combineCleanups } from "./lifecycle.js";
const cleanups = new WeakMap();
export function setupFileUpload(label) {
    const existing = cleanups.get(label);
    if (existing)
        return existing;
    const input = label.querySelector('input[type="file"]');
    const text = label.querySelector(".file-upload__text");
    const defaultText = text?.textContent ?? "";
    const controller = new AbortController();
    const signal = controller.signal;
    let depth = 0;
    label.addEventListener("dragenter", (ev) => {
        ev.preventDefault();
        depth++;
        label.dataset.dragging = "true";
    }, { signal });
    label.addEventListener("dragover", (ev) => ev.preventDefault(), { signal });
    label.addEventListener("dragleave", () => {
        depth = Math.max(0, depth - 1);
        if (depth === 0)
            delete label.dataset.dragging;
    }, { signal });
    label.addEventListener("drop", (ev) => {
        ev.preventDefault();
        depth = 0;
        delete label.dataset.dragging;
        if (!input || !ev.dataTransfer?.files?.length)
            return;
        input.files = ev.dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
    }, { signal });
    input?.addEventListener("change", () => {
        if (!text)
            return;
        const n = input.files?.length ?? 0;
        if (n === 0) {
            text.textContent = defaultText;
        }
        else if (n === 1) {
            text.textContent = `✓ ${input.files[0].name}`;
        }
        else {
            text.textContent = `✓ ${input.files[0].name}  (+${n - 1} weitere)`;
        }
    }, { signal });
    const cleanup = () => {
        controller.abort();
        depth = 0;
        delete label.dataset.dragging;
        cleanups.delete(label);
    };
    cleanups.set(label, cleanup);
    return cleanup;
}
export function setupFileUploads(root = document) {
    return combineCleanups([...root.querySelectorAll(".file-upload")].map(setupFileUpload));
}
