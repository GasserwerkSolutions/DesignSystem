/**
 * layout-rules — Layout-Entscheidungen als reine Funktionen
 * =========================================================
 *
 * Ein CMS soll keine Gestaltung erfinden und kein CSS lesen. Es fragt diese
 * Funktionen: «Ich habe 7 Bilder, welche Galerie?», «Hält dieses Foto im
 * 4:3-Rahmen, was sichtbar bleiben muss?», «Ist diese Abschnittsfolge
 * zulässig?». Die Antworten sind deterministisch und entsprechen den Grenzen
 * in manifest/project-pack.json und den Prüfungen in check:examples.
 *
 * Ohne DOM: läuft im Browser, in Node und im Build.
 *
 *   import { planGallery, fitImage, planHero, validatePage }
 *     from "@gasserwerksolutions/design-system/js/layout-rules";
 */
/** Rechteck in Anteilen (0–1) des Originalbilds. */
export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}
export interface Size {
    w: number;
    h: number;
}
export interface Point {
    x: number;
    y: number;
}
/** Die sechs Formate des Bildrasters (patterns/media.css). */
export declare const IMAGE_RATIOS: {
    readonly pano: number;
    readonly wide: number;
    readonly classic: number;
    readonly photo: number;
    readonly square: 1;
    readonly portrait: number;
};
export type RatioName = keyof typeof IMAGE_RATIOS;
/** "0.08 0.16 0.87 0.5; …" (data-protect) → Rechtecke. */
export declare function parseProtect(spec: string | null | undefined): Rect[];
/**
 * Welcher Teil des Originals ist in einem Rahmen mit `ratio` sichtbar, wenn
 * das Bild ihn füllt (object-fit: cover) und auf `focus` ausgerichtet ist
 * (object-position)?
 */
export declare function visibleRegion(natural: Size, ratio: number, focus?: Point): Rect;
/** Anteil der geschützten Bereiche, der ausserhalb von `visible` liegt (0 = alles sichtbar). */
export declare function lostShare(protect: Rect[], visible: Rect): number;
/** Fokus, der den geschützten Bereich im Rahmen zentriert, soweit der Beschnitt es zulässt. */
export declare function focusFor(natural: Size, ratio: number, protect: Rect[]): Point;
export interface ImageFit {
    /** cover: Bild füllt den Rahmen. contain: Bild ganz im Rahmen (Ausweichregel). */
    fit: "cover" | "contain";
    /** Für `--media-focus` (als Prozent setzen). */
    focus: Point;
    /** true, wenn der geschützte Bereich mit `fit` vollständig sichtbar ist. */
    keepsProtected: boolean;
    /** Warum diese Entscheidung, als Satz für die redaktionelle Vorschau. */
    reason: string;
}
/**
 * Entscheidet für eine Bildverwendung in einem festen Rahmen: füllen oder
 * ganz zeigen. Probiert den gewünschten Fokus, dann den bestmöglichen, und
 * weicht erst dann auf `contain` aus.
 */
export declare function fitImage(natural: Size, ratio: number, protect?: Rect[], preferred?: Point): ImageFit;
/** Das Raster-Format, das den geschützten Bereich hält und am wenigsten vom Bild wegschneidet. */
export declare function bestRatio(natural: Size, protect?: Rect[], candidates?: RatioName[]): RatioName | null;
export interface GalleryPlan {
    /** none: keine Galerie (0–1 Bild → einzelnes `media`). */
    variant: "none" | "fit" | "default" | "lead";
    /** CSS-Klassen für <ul>. */
    className: string;
    /** So viele Bilder zeigt das Raster lückenlos. */
    show: number;
    /** Bilder, die nicht ins Raster passen (zweite Galerie oder weglassen). */
    rest: number;
}
/**
 * Galerie-Variante aus der Bildzahl. Das Raster hat 2 Spalten auf Telefonen
 * und 4 sonst; lückenlos füllen es 2–3 Bilder (fit), Vielfache von 4
 * (default) oder 4n + 1 Bilder mit grossem erstem Bild (lead).
 */
export declare function planGallery(count: number, options?: {
    max?: number;
    preferLead?: boolean;
}): GalleryPlan;
export interface HeroPlan {
    variant: "head" | "head-text-only";
    className: string;
    reason: string;
}
/**
 * Kopf einer Seite. Text auf dem Foto (`hero--stage`) wird nie automatisch
 * gewählt: das ist eine begründete Einzelentscheidung mit Kontrastprüfung.
 */
export declare function planHero(image: {
    natural: Size;
    protect?: Rect[];
} | null, options?: {
    minWidth?: number;
    ratio?: number;
}): HeroPlan;
/** Marken für zwei Projektstadien. «Vorher/Nachher» nur bei gleichem Standpunkt. */
export declare function stageLabels(sameViewpoint: boolean, states?: [string, string]): [string, string];
/** Gewicht eines Abschnitts im Seitenrhythmus. */
export type SectionWeight = "gross" | "mittel" | "ruhig";
export interface SectionSummary {
    /** Pattern-id aus dem Manifest oder der website-Patterns, z.B. "hero", "gallery", "spec", "cta-band". */
    pattern: string;
    /** Überschriftenebene des Abschnittstitels (1–6), falls vorhanden. */
    headingLevel?: number;
}
/** Gewicht je Pattern: wie viel Aufmerksamkeit ein Abschnitt beansprucht. */
export declare const SECTION_WEIGHT: Record<string, SectionWeight>;
export interface PageIssue {
    rule: string;
    message: string;
    index?: number;
}
/**
 * Prüft die Abschnittsfolge einer Seite. Die Regeln sichern Einstieg,
 * Rhythmus und nächsten Schritt; sie schreiben keine Seitenform vor.
 */
export declare function validatePage(sections: SectionSummary[], options?: {
    maxHeavyRun?: number;
}): PageIssue[];
