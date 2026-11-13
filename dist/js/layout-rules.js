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
/** Die sechs Formate des Bildrasters (patterns/media.css). */
export const IMAGE_RATIOS = {
    pano: 21 / 9,
    wide: 16 / 9,
    classic: 3 / 2,
    photo: 4 / 3,
    square: 1,
    portrait: 3 / 4,
};
const EPS = 0.01;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
function assertUnitRect(rect, label = "geschützter Bereich") {
    const { x, y, w, h } = rect;
    if (![x, y, w, h].every(Number.isFinite))
        throw new Error(`${label} enthält keine endlichen Zahlen.`);
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > 1 || y + h > 1) {
        throw new Error(`${label} liegt ausserhalb des Bilds (erwartet: x/y ≥ 0, w/h > 0, x+w/y+h ≤ 1).`);
    }
}
function assertImageGeometry(natural, ratio, focus) {
    if (![natural.w, natural.h, ratio].every(Number.isFinite) || natural.w <= 0 || natural.h <= 0 || ratio <= 0) {
        throw new Error("Bildbreite, Bildhöhe und Rahmenverhältnis müssen endliche positive Zahlen sein.");
    }
    if (![focus.x, focus.y].every(Number.isFinite) || focus.x < 0 || focus.x > 1 || focus.y < 0 || focus.y > 1) {
        throw new Error("Fokuskoordinaten müssen zwischen 0 und 1 liegen.");
    }
}
/** "0.08 0.16 0.87 0.5; …" (data-protect) → Rechtecke. */
export function parseProtect(spec) {
    if (!spec)
        return [];
    return spec.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
        const [x, y, w, h] = part.split(/\s+/).map(Number);
        if (![x, y, w, h].every(Number.isFinite))
            throw new Error(`data-protect ungültig: «${part}»`);
        const rect = { x, y, w, h };
        assertUnitRect(rect, `data-protect «${part}»`);
        return rect;
    });
}
/**
 * Welcher Teil des Originals ist in einem Rahmen mit `ratio` sichtbar, wenn
 * das Bild ihn füllt (object-fit: cover) und auf `focus` ausgerichtet ist
 * (object-position)?
 */
export function visibleRegion(natural, ratio, focus = { x: 0.5, y: 0.5 }) {
    assertImageGeometry(natural, ratio, focus);
    const imageRatio = natural.w / natural.h;
    if (imageRatio > ratio) {
        const w = ratio / imageRatio; // seitlich beschnitten
        return { x: (1 - w) * focus.x, y: 0, w, h: 1 };
    }
    const h = imageRatio / ratio; // oben/unten beschnitten
    return { x: 0, y: (1 - h) * focus.y, w: 1, h };
}
/** Anteil der geschützten Bereiche, der ausserhalb von `visible` liegt (0 = alles sichtbar). */
export function lostShare(protect, visible) {
    let lost = 0;
    for (const p of protect) {
        lost += Math.max(0, visible.x - p.x) + Math.max(0, p.x + p.w - (visible.x + visible.w));
        lost += Math.max(0, visible.y - p.y) + Math.max(0, p.y + p.h - (visible.y + visible.h));
    }
    return lost;
}
function boundingBox(rects) {
    const x0 = Math.min(...rects.map((r) => r.x)), y0 = Math.min(...rects.map((r) => r.y));
    const x1 = Math.max(...rects.map((r) => r.x + r.w)), y1 = Math.max(...rects.map((r) => r.y + r.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
/** Fokus, der den geschützten Bereich im Rahmen zentriert, soweit der Beschnitt es zulässt. */
export function focusFor(natural, ratio, protect) {
    protect.forEach((rect) => assertUnitRect(rect));
    if (protect.length === 0)
        return { x: 0.5, y: 0.5 };
    const box = boundingBox(protect);
    const vis = visibleRegion(natural, ratio, { x: 0, y: 0 });
    const along = (center, size) => size >= 1 - EPS ? 0.5 : clamp((center - size / 2) / (1 - size), 0, 1);
    return { x: along(box.x + box.w / 2, vis.w), y: along(box.y + box.h / 2, vis.h) };
}
/**
 * Entscheidet für eine Bildverwendung in einem festen Rahmen: füllen oder
 * ganz zeigen. Probiert den gewünschten Fokus, dann den bestmöglichen, und
 * weicht erst dann auf `contain` aus.
 */
export function fitImage(natural, ratio, protect = [], preferred) {
    assertImageGeometry(natural, ratio, preferred ?? { x: 0.5, y: 0.5 });
    protect.forEach((rect) => assertUnitRect(rect));
    if (protect.length === 0) {
        return { fit: "cover", focus: preferred ?? { x: 0.5, y: 0.5 }, keepsProtected: true, reason: "Kein geschützter Bereich angegeben; Beschnitt nicht geprüft." };
    }
    if (preferred && lostShare(protect, visibleRegion(natural, ratio, preferred)) <= EPS) {
        return { fit: "cover", focus: preferred, keepsProtected: true, reason: "Geschützter Bereich bleibt mit dem gewählten Fokus sichtbar." };
    }
    const best = focusFor(natural, ratio, protect);
    if (lostShare(protect, visibleRegion(natural, ratio, best)) <= EPS) {
        return { fit: "cover", focus: best, keepsProtected: true, reason: "Fokus auf den geschützten Bereich verschoben." };
    }
    return { fit: "contain", focus: { x: 0.5, y: 0.5 }, keepsProtected: true, reason: "Kein Ausschnitt in diesem Format hält den geschützten Bereich; Bild wird ganz gezeigt." };
}
/** Das Raster-Format, das den geschützten Bereich hält und am wenigsten vom Bild wegschneidet. */
export function bestRatio(natural, protect = [], candidates = ["wide", "classic", "photo", "square", "portrait"]) {
    protect.forEach((rect) => assertUnitRect(rect));
    let best = null;
    for (const name of candidates) {
        const ratio = IMAGE_RATIOS[name];
        const focus = focusFor(natural, ratio, protect);
        const vis = visibleRegion(natural, ratio, focus);
        if (lostShare(protect, vis) > EPS)
            continue;
        const kept = vis.w * vis.h;
        if (!best || kept > best.kept + EPS)
            best = { name, kept };
    }
    return best ? best.name : null;
}
/**
 * Galerie-Variante aus der Bildzahl. Das Raster hat 2 Spalten auf Telefonen
 * und 4 sonst; lückenlos füllen es 2–3 Bilder (fit), Vielfache von 4
 * (default) oder 4n + 1 Bilder mit grossem erstem Bild (lead).
 */
export function planGallery(count, options = {}) {
    const max = options.max ?? 13;
    const n = Math.min(Math.max(0, Math.floor(count)), max);
    const rest = (shown) => Math.max(0, Math.floor(count)) - shown;
    if (n <= 1)
        return { variant: "none", className: "", show: n, rest: rest(n) };
    if (n <= 3)
        return { variant: "fit", className: "gallery gallery--fit", show: n, rest: rest(n) };
    const lead = n - ((n - 1) % 4); // grösstes 4k + 1 ≤ n
    const plain = n - (n % 4); // grösstes 4k ≤ n
    const useLead = lead > plain || (options.preferLead === true && lead >= 5);
    return useLead && lead >= 5
        ? { variant: "lead", className: "gallery gallery--lead", show: lead, rest: rest(lead) }
        : { variant: "default", className: "gallery", show: plain, rest: rest(plain) };
}
/**
 * Kopf einer Seite. Text auf dem Foto (`hero--stage`) wird nie automatisch
 * gewählt: das ist eine begründete Einzelentscheidung mit Kontrastprüfung.
 */
export function planHero(image, options = {}) {
    const minWidth = options.minWidth ?? 1280;
    const ratio = options.ratio ?? IMAGE_RATIOS.wide;
    if (!image)
        return { variant: "head-text-only", className: "hero hero--head", reason: "Kein Bild vorhanden." };
    if (image.natural.w < minWidth) {
        return { variant: "head-text-only", className: "hero hero--head", reason: `Bild ist ${image.natural.w}px breit, nötig sind ${minWidth}px für ein scharfes Einstiegsbild.` };
    }
    if (image.natural.w < image.natural.h) {
        return { variant: "head-text-only", className: "hero hero--head", reason: "Hochformat trägt kein breites Einstiegsbild." };
    }
    const fit = fitImage(image.natural, ratio, image.protect ?? []);
    if (fit.fit === "contain") {
        return { variant: "head-text-only", className: "hero hero--head", reason: "Der geschützte Bereich hält im Kopfformat nicht; Bild als Abschnittsbild im eigenen Format zeigen." };
    }
    return { variant: "head", className: "hero hero--head", reason: "Bild trägt das Kopfformat." };
}
/** Marken für zwei Projektstadien. «Vorher/Nachher» nur bei gleichem Standpunkt. */
export function stageLabels(sameViewpoint, states = ["Bestand", "Nach dem Umbau"]) {
    return sameViewpoint ? ["Vorher", "Nachher"] : states;
}
/** Gewicht je Pattern: wie viel Aufmerksamkeit ein Abschnitt beansprucht. */
export const SECTION_WEIGHT = {
    "hero": "gross",
    "gallery": "gross",
    "project-stages": "gross",
    "legend-figure": "gross",
    "reference-grid": "gross",
    "editorial-split": "mittel",
    "service-grid": "mittel",
    "spec": "ruhig",
    "project-facts": "ruhig",
    "faq-section": "ruhig",
    "trustbar": "ruhig",
    "section-head": "ruhig",
    "cta-band": "mittel",
    "contact-section": "mittel",
};
/**
 * Prüft die Abschnittsfolge einer Seite. Die Regeln sichern Einstieg,
 * Rhythmus und nächsten Schritt; sie schreiben keine Seitenform vor.
 */
export function validatePage(sections, options = {}) {
    const issues = [];
    const maxHeavyRun = options.maxHeavyRun ?? 3;
    const heroes = sections.filter((s) => s.pattern === "hero").length;
    if (sections.length === 0)
        return [{ rule: "leer", message: "Die Seite hat keine Abschnitte." }];
    if (sections[0].pattern !== "hero")
        issues.push({ rule: "einstieg", message: "Die Seite beginnt nicht mit einem Kopf (hero).", index: 0 });
    if (heroes > 1)
        issues.push({ rule: "ein-kopf", message: `${heroes} Köpfe auf einer Seite; es gibt genau einen Einstieg.` });
    const h1 = sections.filter((s) => s.headingLevel === 1).length;
    if (h1 !== 1)
        issues.push({ rule: "ein-seitentitel", message: `${h1} Seitentitel (h1); nötig ist genau einer.` });
    let previous = 1;
    sections.forEach((s, i) => {
        if (s.headingLevel === undefined)
            return;
        if (s.headingLevel > previous + 1) {
            issues.push({ rule: "ueberschriften", message: `Überschriftenebene springt von h${previous} auf h${s.headingLevel}.`, index: i });
        }
        previous = s.headingLevel;
    });
    let run = 0;
    sections.forEach((s, i) => {
        run = (SECTION_WEIGHT[s.pattern] ?? "mittel") === "gross" ? run + 1 : 0;
        if (run === maxHeavyRun + 1) {
            issues.push({ rule: "rhythmus", message: `Mehr als ${maxHeavyRun} bildschwere Abschnitte in Folge; ein ruhiger Abschnitt (Text, Eckdaten, Spezifikation) fehlt.`, index: i });
        }
    });
    for (let i = 1; i < sections.length; i++) {
        if (sections[i].pattern === "gallery" && sections[i - 1].pattern === "gallery" && sections[i].headingLevel === undefined) {
            issues.push({ rule: "galerien", message: "Zwei Galerien direkt nacheinander ohne eigene Überschrift; ihr Unterschied ist nicht erkennbar.", index: i });
        }
    }
    const last = sections[sections.length - 1].pattern;
    if (last !== "cta-band" && last !== "contact-section") {
        issues.push({ rule: "naechster-schritt", message: "Die Seite endet ohne nächsten Schritt (cta-band oder contact-section).", index: sections.length - 1 });
    }
    return issues;
}
