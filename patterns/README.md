# Website Patterns

Higher-level, content-first sections for normal customer websites.

This layer sits above `components/`: components are reusable UI parts, patterns are page sections composed from components and layout primitives.

## Included patterns

- `site-header` — brand, navigation, optional sticky header
- `hero` — centered, split, soft, fullbleed landing sections
- `section-head` — eyebrow, title, lead text for repeatable sections
- `trustbar` — compact facts, signals, opening hours, review snippets
- `service-grid` / `service-card` — services, treatments, offers, feature cards
- `feature-grid` / `feature-card` — benefit or concept grids
- `editorial-split` — text/media sections for story and explanation blocks
- `cta-band` — boxed, centered, split or strong call-to-action sections
- `faq-section` / `faq-list` — wrapper for accordion/disclosure content
- `contact-section` / `contact-card` — form plus contact details
- `sticky-action` — mobile contact, booking or urgent action bar
- `site-footer` — multi-column footer with bottom row

## Import

Full bundle:

```css
@import "@gasserwerksolutions/design-system";
```

Pattern-only import, when the rest of the system is already loaded:

```css
@import "@gasserwerksolutions/design-system/patterns/website.css";
```

## Contract style

Patterns expose CSS custom properties and consume existing semantic tokens. Themes should still set tokens, not pattern selectors.

```css
.hero {
  --hero-bg: var(--color-bg-secondary);
  --hero-py: var(--space-96);
}

.cta-band--strong {
  --cta-band-bg: var(--color-bg-inverse);
  --cta-band-fg: var(--color-text-on-dark);
}
```

## Example

```html
<html data-tone="trust" data-mode="light" data-density="comfortable">
  <body>
    <header class="site-header site-header--sticky">
      <div class="container site-header__inner">
        <a class="site-header__brand" href="/">Praxis Beispiel</a>
        <nav class="site-header__nav" aria-label="Hauptnavigation">
          <a href="#leistungen">Leistungen</a>
          <a href="#team">Team</a>
          <a href="#kontakt">Kontakt</a>
        </nav>
      </div>
    </header>

    <main>
      <section class="section hero hero--split hero--soft cq">
        <div class="container hero__inner">
          <div class="hero__content">
            <p class="hero__eyebrow">Lokale Dienstleistung</p>
            <h1 class="hero__title">Eine klare Startseite für normale Kunden.</h1>
            <p class="hero__lead">Erklärt Angebot, Vertrauen und nächsten Schritt ohne Sonderlayout.</p>
            <div class="hero__actions">
              <a class="btn" href="#kontakt">Anfragen</a>
              <a class="btn btn--ghost" href="#leistungen">Leistungen ansehen</a>
            </div>
          </div>
          <div class="hero__media">
            <img src="hero.jpg" alt="" />
          </div>
        </div>
      </section>

      <section class="trustbar cq">
        <div class="container trustbar__grid">
          <div class="trustbar__item">
            <strong class="trustbar__value">24h</strong>
            <span class="trustbar__label">Antwortzeit</span>
          </div>
          <div class="trustbar__item">
            <strong class="trustbar__value">4.9/5</strong>
            <span class="trustbar__label">Bewertung</span>
          </div>
        </div>
      </section>

      <section id="leistungen" class="section cq">
        <div class="container">
          <header class="section-head section-head--center">
            <p class="section-head__eyebrow">Leistungen</p>
            <h2 class="section-head__title">Was Kunden häufig brauchen</h2>
            <p class="section-head__lead">Drei bis sechs Karten reichen für die meisten Websites.</p>
          </header>

          <div class="service-grid">
            <article class="service-card">
              <h3 class="service-card__title">Beratung</h3>
              <p class="service-card__text">Kurze Beschreibung des Angebots.</p>
              <a class="service-card__more" href="#kontakt">Mehr erfahren</a>
            </article>
          </div>
        </div>
      </section>

      <section id="kontakt" class="section cq">
        <div class="container">
          <div class="cta-band cta-band--split">
            <div>
              <h2 class="cta-band__title">Bereit für den nächsten Schritt?</h2>
              <p class="cta-band__text">Ein klarer Kontaktblock beendet die Seite.</p>
            </div>
            <div class="cta-band__actions">
              <a class="btn" href="mailto:info@example.com">Kontakt aufnehmen</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>
```

## Naming rule

Keep pattern names industry-neutral:

- use `service-card`, not `treat-card`
- use `sticky-action`, not `emergency-bar`
- use `editorial-split`, not a project-specific story block name
- use `trustbar` for compact proof/fact strips across industries

## Projektseiten-Pack (opt-in)

Bildführung und Projektseiten für Betriebe mit Referenzobjekten (Holzbau,
Handwerk). Nicht Teil von `main.css`, damit Bundle und Builder-Profil
unverändert bleiben (18.9 KB roh, 5.2 KB gzip):

```css
@import "@gasserwerksolutions/design-system";
@import "@gasserwerksolutions/design-system/patterns/project.css";
```

- `media`: Bildrahmen mit sechs festen Formaten (21/9, 16/9, 3/2, 4/3, 1/1,
  3/4) und Fokuspunkt `--media-focus`. Kein Inhaltsbild in freier Grösse.
- `hero--stage` / `hero--head` / `hero--dark`: drei Kopf-Varianten mit einer
  gemeinsamen Höhe `--hero-stage-h`. Unter 40rem steht das Bild oben im festen
  Format und der Text darunter, weil ein Querformat im hohen Rahmen bis auf
  einen Streifen beschnitten würde.
- `project-facts`: Eckdaten eines Leitprojekts.
- `spec`: Bauteil-Spezifikation als Begriff/Wert-Zeilen pro Bauteil.
- `legend-figure`: Bild mit nummerierten Marken und Legende (CSS-Counter).
- `gallery` + `lightbox`: Raster mit 2 Spalten auf Telefonen und höchstens 4
  sonst. `gallery--lead` füllt lückenlos bei 5, 9, 13 Bildern, `gallery--fit`
  ist für 2–3 Bilder. Lightbox über `setupGallery` (in `setupAll` enthalten);
  ohne JavaScript öffnet der Link das grosse Bild.
- `project-stages`: zwei benannte Projektstadien nebeneinander mit Textmarke.
  «Vorher/Nachher» nur bei gleichem Standpunkt; bewusst kein Schieberegler.

`spec`, `legend-figure` und `project-stages` reagieren auf den Container: ein
Vorfahre braucht `.cq`, nicht das Element selbst.

Beispiele: `examples/holzbau-projekt.html` (viel Inhalt) und
`examples/holzbau-leistung.html` (wenig Inhalt). Die Bilder dort sind
Platzhalter; `check:examples` prüft für jedes `<img>` Alt-Text, feste Masse
und den Sitz im Formatraster.

### Manifest mit Inhaltsgrenzen

`manifest/project-pack.json` beschreibt pro Pattern die Slots und Grenzen:
wie viele Bilder eine Galerie-Variante verträgt, wie lang ein Titel sein darf,
welche Bildbreite ein vollflächiger Hero braucht. Ein CMS oder Agent wählt
damit die passende Variante, ohne das CSS zu lesen.

`npm run check:project-pack` prüft, dass das Manifest alle Module des Packs
beschreibt und dass jede Regel in mindestens einer Beispielseite greift und
eingehalten wird.

- `reference-grid`: Übersicht der Referenzobjekte. Eckdaten sind pro Feld
  optional; fehlt Ort oder Jahr, bleibt keine Lücke.
  Beispiel: `examples/holzbau-referenzen.html`.

### Geschützte Bildbereiche

Ein Fokuspunkt richtet den Beschnitt aus, sagt aber nicht, was sichtbar
bleiben muss. `data-protect="x y w h"` am `<img>` (Anteile 0–1 des Originals,
mehrere Bereiche mit `;`) benennt den Bereich, ohne den die Aussage verloren
geht. `check:examples` rechnet bei jeder Breite aus Bildmass, Rahmen und
`object-position` nach, ob der Bereich sichtbar ist. Hält kein Format, greift
eine Ausweichregel: `media--contain`, `media--natural`,
`reference-card--contain` oder ein anderes Motiv.

### Robustheit

Für Seiten mit dem Projekt-Pack prüft `check:examples` zusätzlich:
Textvergrösserung auf 200 % und die WCAG-Textabstände (1.4.12) ohne Überlauf,
`srcset`-Breitenangaben gegen die wirklichen Pixelmasse, das Einstiegsbild
nicht `loading="lazy"` und höchstens ein `fetchpriority="high"` pro Seite.

### Layout-Regeln für das CMS

`js/layout-rules` enthält die Layout-Entscheidungen als reine Funktionen ohne
DOM. Ein CMS füllt Slots und fragt die Funktionen; es erfindet keine
Gestaltung und liest kein CSS.

```js
import { planGallery, fitImage, bestRatio, planHero, stageLabels, validatePage }
  from "@gasserwerksolutions/design-system/js/layout-rules";

planGallery(7);
// → { variant: "lead", className: "gallery gallery--lead", show: 5, rest: 2 }

fitImage({ w: 1280, h: 615 }, 4 / 3, parseProtect("0.05 0.1 0.9 0.8"));
// → { fit: "contain", reason: "Kein Ausschnitt in diesem Format hält den geschützten Bereich; …" }

validatePage([{ pattern: "hero", headingLevel: 1 }, { pattern: "gallery", headingLevel: 2 }]);
// → [{ rule: "naechster-schritt", message: "Die Seite endet ohne nächsten Schritt …" }]
```

- `fitImage` / `bestRatio`: füllen, Fokus verschieben oder ganz zeigen, je
  nachdem ob der geschützte Bereich hält. `bestRatio` gibt `null` zurück, wenn
  kein Raster-Format passt (dann `media--natural`).
- `planGallery`: Variante und Bildzahl, die das Raster lückenlos füllt.
- `planHero`: wählt nie Text auf dem Foto; zu kleine Bilder und Hochformate
  ergeben einen Kopf ohne Bild.
- `validatePage`: Abschnittsfolge (ein Kopf, ein Seitentitel, keine
  übersprungene Überschriftenebene, höchstens drei bildschwere Abschnitte in
  Folge, nächster Schritt am Ende).

Die Seitenrezepte stehen unter `seiten` im Manifest. `npm run test:layout`
prüft die Funktionen an Massen aus echtem Material; `check:project-pack`
prüft die Abschnittsfolge jeder Beispielseite mit derselben `validatePage`.

### Papierkörnung

`.texture-grain` (im Projekt-Pack) legt eine feine Körnung hinter den Inhalt
einer Fläche. Sie wird in der Textfarbe gezeichnet und wirkt deshalb in jedem
Tone und in Light wie Dark gleich stark. Stärke über
`--texture-grain-opacity` (Standard 0.05). Die Holzbau-Beispiele nutzen sie
zusammen mit dem Tone `earth`.

## Bewegungs-Pack (opt-in)

```css
@import "@gasserwerksolutions/design-system/patterns/motion.css";
```

Zurückhaltende Bewegung für Marketing- und Projektseiten, ganz ohne
JavaScript. Der Ruhezustand ist immer das fertige Layout: ohne Unterstützung
im Browser, bei «Bewegung reduzieren» und im Druck bleibt die Seite
vollständig und unbewegt. `check:patterns` bricht ab, wenn im Pack eine
Animation ausserhalb von `prefers-reduced-motion: no-preference` steht.

| Klasse | Wirkung | Technik | Unterstützung (Nov. 2026) |
| --- | --- | --- | --- |
| `reveal`, `reveal--fade`, `reveal--wipe` | Block blendet ein, während er ins Bild kommt | Scroll-driven Animation, `view()` | Chrome/Edge 115, Safari 26, Firefox 159 |
| `reveal-group` | Kinder nacheinander | `sibling-index()` im Bereich | Chrome/Edge 138, Safari 26.2, Firefox 154; sonst gleichzeitig |
| `vt-morph` + `--vt-name` | Bild wandert von der Übersicht in die Detailseite, Seite blendet über | Cross-document View Transition | Chrome/Edge 126, Safari 18.2; Firefox navigiert normal |
| `scroll-progress` | Linie für den Lesefortschritt | `scroll(root)` | wie `reveal` |
| `media-zoom` | Bild rückt bei Hover/Fokus näher | Transition auf `scale` | überall |
| `link-draw` | Unterstreichung zeichnet sich | Keyframes auf `background-size` | überall |
| `hero-settle` | Hero-Bild kommt beim Laden zur Ruhe | Keyframes auf `scale` | überall |
| `site-header--elevate` | Klebender Kopf bekommt Schatten beim Scrollen | `scroll(root)` | wie `reveal` |

Regeln für das CMS:

- `--vt-name` aus dem Slug des Projekts bilden (`projekt-<slug>`) und pro
  Seite nur einmal vergeben. Doppelte Namen lassen den Browser den ganzen
  Übergang überspringen. In einer Übersicht bekommt jede Karte ihren eigenen
  Namen, auf der Detailseite nur das Hero-Bild.
- `reveal` gehört auf einzelne Blöcke (Abschnittskopf, Figur, Faktenliste),
  `reveal-group` auf Raster und Galerien. Nicht auf das erste Bild der Seite.
- `media-zoom` und `hero-settle` schneiden das Bild während der Bewegung um
  bis zu 2% pro Seite an; `data-protect` gilt für den Ruhezustand.
- Laufbänder (Marquee), Parallax und hochzählende Zahlen sind bewusst nicht
  enthalten: Laufbänder brauchen nach WCAG 2.2.2 eine Pause-Taste, Parallax
  verträgt sich nicht mit geschützten Bildbereichen, und per CSS gezählte
  Zahlen werden von Screenreadern nicht verlässlich gelesen.
