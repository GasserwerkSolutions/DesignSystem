/** Shared lifecycle contract for repeatable Builder previews and SPA mounts. */
export type Cleanup = () => void;
export declare const noopCleanup: Cleanup;
export declare function combineCleanups(cleanups: Iterable<Cleanup>): Cleanup;
