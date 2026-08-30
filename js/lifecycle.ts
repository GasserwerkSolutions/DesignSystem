/** Shared lifecycle contract for repeatable Builder previews and SPA mounts. */
export type Cleanup = () => void;

export const noopCleanup: Cleanup = () => {};

export function combineCleanups(cleanups: Iterable<Cleanup>): Cleanup {
  const list = [...cleanups];
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (const cleanup of list.reverse()) cleanup();
  };
}
