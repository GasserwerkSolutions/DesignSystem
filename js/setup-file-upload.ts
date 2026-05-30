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

export function setupFileUpload(label: HTMLElement): void {
  const input = label.querySelector<HTMLInputElement>('input[type="file"]');
  const text  = label.querySelector<HTMLElement>(".file-upload__text");
  const defaultText = text?.textContent ?? "";
  let depth = 0;

  label.addEventListener("dragenter", (ev) => {
    ev.preventDefault();
    depth++;
    label.dataset.dragging = "true";
  });

  label.addEventListener("dragover", (ev) => ev.preventDefault());

  label.addEventListener("dragleave", () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) delete label.dataset.dragging;
  });

  label.addEventListener("drop", (ev) => {
    ev.preventDefault();
    depth = 0;
    delete label.dataset.dragging;
    if (!input || !ev.dataTransfer?.files?.length) return;
    input.files = ev.dataTransfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  input?.addEventListener("change", () => {
    if (!text) return;
    const n = input.files?.length ?? 0;
    if (n === 0) {
      text.textContent = defaultText;
    } else if (n === 1) {
      text.textContent = `✓ ${input.files![0].name}`;
    } else {
      text.textContent = `✓ ${input.files![0].name}  (+${n - 1} weitere)`;
    }
  });
}

export function setupFileUploads(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>(".file-upload").forEach(setupFileUpload);
}
