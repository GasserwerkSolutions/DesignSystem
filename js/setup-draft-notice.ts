/**
 * setup-draft-notice — Entwurfshinweis (patterns/draft-notice.css)
 * ================================================================
 *
 * Wirkt nur, wenn <html data-stage="entwurf"> gesetzt ist:
 *   - setzt <meta name="robots" content="noindex, nofollow">, falls keines da ist
 *   - «Ausblenden» verbirgt den Hinweis für die Sitzung (sessionStorage)
 *   - ?entwurf=aus in der Adresse blendet ihn von Anfang an aus (Screenshots)
 *
 * Der Hinweis ersetzt keine Sperre: robots.txt und ein X-Robots-Tag-Header
 * gehören trotzdem auf jede Vorschau.
 */

import { combineCleanups, noopCleanup, type Cleanup } from "./lifecycle.js";

export interface DraftNoticeOptions {
  /** Schlüssel in sessionStorage (default "ds-draft-notice"). */
  storageKey?: string;
  /** Adressparameter zum Ausblenden (default "entwurf", Wert "aus"). */
  param?: string;
}

const cleanups = new WeakMap<HTMLElement, Cleanup>();

function readStore(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function writeStore(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch { /* Speicher gesperrt: nur diese Ansicht */ }
}

export function setupDraftNotice(notice: HTMLElement, options: DraftNoticeOptions = {}): Cleanup {
  const existing = cleanups.get(notice);
  if (existing) return existing;
  const doc = notice.ownerDocument;
  if (doc.documentElement.dataset.stage !== "entwurf") return noopCleanup;

  const key = options.storageKey ?? "ds-draft-notice";
  const param = options.param ?? "entwurf";
  const controller = new AbortController();

  let addedMeta: HTMLMetaElement | null = null;
  if (!doc.querySelector('meta[name="robots"]')) {
    addedMeta = doc.createElement("meta");
    addedMeta.name = "robots";
    addedMeta.content = "noindex, nofollow";
    doc.head.append(addedMeta);
  }

  const view = doc.defaultView;
  const off = view ? new URL(view.location.href).searchParams.get(param) === "aus" : false;
  // Der Adressparameter wirkt auch ohne sessionStorage; Speichern ist nur Zugabe.
  if (off) writeStore(key, "aus");
  if (off || readStore(key) === "aus") notice.hidden = true;

  const close = notice.querySelector<HTMLButtonElement>(".draft-notice__close");
  close?.addEventListener("click", () => {
    writeStore(key, "aus");
    notice.hidden = true;
  }, { signal: controller.signal });

  const cleanup: Cleanup = () => {
    controller.abort();
    addedMeta?.remove();
    cleanups.delete(notice);
  };
  cleanups.set(notice, cleanup);
  return cleanup;
}

export function setupDraftNotices(root: ParentNode = document, options: DraftNoticeOptions = {}): Cleanup {
  return combineCleanups(
    [...root.querySelectorAll<HTMLElement>("[data-draft-notice]")].map((el) => setupDraftNotice(el, options))
  );
}
