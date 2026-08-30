export const noopCleanup = () => { };
export function combineCleanups(cleanups) {
    const list = [...cleanups];
    let active = true;
    return () => {
        if (!active)
            return;
        active = false;
        for (const cleanup of list.reverse())
            cleanup();
    };
}
