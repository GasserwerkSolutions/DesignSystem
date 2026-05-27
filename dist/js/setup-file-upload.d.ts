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
export declare function setupFileUpload(label: HTMLElement): void;
export declare function setupFileUploads(root?: ParentNode): void;
