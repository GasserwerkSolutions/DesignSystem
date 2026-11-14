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
import { type Cleanup } from "./lifecycle.js";
export interface DraftNoticeOptions {
    /** Schlüssel in sessionStorage (default "ds-draft-notice"). */
    storageKey?: string;
    /** Adressparameter zum Ausblenden (default "entwurf", Wert "aus"). */
    param?: string;
}
export declare function setupDraftNotice(notice: HTMLElement, options?: DraftNoticeOptions): Cleanup;
export declare function setupDraftNotices(root?: ParentNode, options?: DraftNoticeOptions): Cleanup;
