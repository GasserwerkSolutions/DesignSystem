# Changelog

## [0.24.0] — Performance: content-visibility + contain für Heavy-Components

Klein-aber-feiner Render-Boost für Pages mit vielen Component-Instanzen.

### Hinzugefügt

- **`.card`**: `contain: layout paint` — Card-Layout/Paint isoliert vom
  Page-Layout. Spürbar bei Grid mit 20+ Cards.
- **`.list-row`**: `contain: layout` — bei Activity-Feeds und Customer-
  Listen berechnet Browser jede Row isoliert, kein Reflow durch nachbar-
  Änderungen.
- **`.accordion`**: `content-visibility: auto` + `contain-intrinsic-size:
  auto 4rem` — geschlossene Accordions überspringen den Body-Render bis
  Detail-Toggle. Wichtig für FAQ-Pages mit 20+ Items.

### VRT-Update

- 12 Baselines neu generiert (0.004 - 0.017% Pixel-Shifts in Premium/
  Industrial durch contain-intrinsic-size-Placeholder).

### Pipeline

Lint, contrast (1008), visual (12 neu), journeys (6), site (50),
package, measure — alle grün.

---

## [0.23.0] — Recipes-Page (composed Patterns)

Ersetzt den Playground-Stub durch eine handkuratierte Recipes-Page mit
5 echten Product-Patterns. Zeigt das System in real-world-Komposition.

### Hinzugefügt — Recipes

1. **Booking-Form** — Service + Datetime + Segmented (Stylist) + Textarea + CTA
2. **Stat-Dashboard** — 4 Stat-Cards mit Trend, gefolgt von List-Row-Tagesliste
3. **Settings-Section** — 4 Switch-Toggles mit Hints, Cancel/Save-Cluster
4. **OTP-Verifizierung** — 6-stelliger Code mit Separator zwischen 3-3 Gruppen
5. **Empty-State mit Search + CTA** — Card mit Icon, Buttons, kbd-Hint-Strip

Jede Recipe nutzt das gleiche Live-Editor-Toolbar (Edit/Copy/Reset)
wie die Component-Beispiele. URL-Anchor-Navigation für direkte Links.

### Geändert

- Nav-Item "Playground" → "Recipes" (Playground bleibt als Stub mit
  Redirect-Hint für alte URLs).
- SMOKE_PAGES erweitert um recipes.html.

### Pipeline

Lint, contrast, visual, journeys, site (50 + 1 smoke for recipes),
package — alle grün.

---

## [0.22.0] — Drei neue Components + View-Transition-Race-Fix

### Hinzugefügt

- **`components/hover-card.css`** — Rich-Preview-Bubble bei Hover/Focus.
  300ms Open-Delay (verhindert ungewolltes Popping). Header mit Avatar +
  Meta, Body + Stats-Block. Touch-User sehen kein Hover-State (rein
  dekorativ, kein exclusive Content).
- **`components/back-to-top.css`** — Floating Button mit Scroll-driven-
  Animation. `@supports (animation-timeline: scroll())` enthüllt ab
  300px Scroll-Distanz. Pure CSS, kein JS nötig (Konsument kann
  `.is-visible`-Klasse togglen für volle Browser-Support).
- **`components/scroll-spy.css`** — Inline-Navigation mit aktivem Section-
  Marker. JS-Snippet im Header (~15 LOC IntersectionObserver). Modifier
  `--vertical` (default, Sidebar) und `--horizontal` (Sticky-Topbar).

### Behoben — View-Transition-Race-Condition

Bei v0.20.0 wurde `persist()` AUSSERHALB von `withTransition()` gerufen.
View-Transitions defer den Attribute-Update via rAF — `persist()` las
das alte Attribut, schrieb veraltetes Tone in URL. Fix: persist() ist
jetzt INSIDE der Transition-Callback. URL-Updates korrekt.

### Tests

Drei Site-Asserts haben Timeout-Bumps bekommen (50→200ms, 100→500ms)
weil view-transitions Frame-Delays produzieren.

### Bundle

  Bundle: 134.5 KB raw (+5.6) / 20.2 KB gzip (+0.7)
  Budget noch grün: 94-98%.

### Pipeline

57 Component-Pages (war 54). Lint, contrast (1008), visual (12),
journeys (6), site (50), package (72 imports), measure (4) — alle grün.

---

## [0.21.0] — Documentation Expansion (README + CONTRIBUTING)

README.md von 110 auf 290 Zeilen erweitert. Adoptions-orientiert.

### Hinzugefügt

- **README.md** Neu-Struktur:
  - Quick-Start (3 Zeilen, Achsen-Attribute auf html)
  - Install via npm + 4 Distribution-Optionen (full, min, per-component,
    per-theme)
  - Companion-JS-Setup (setupAll + tree-shakable per-component)
  - 4-Achsen-Tabelle (Tone × Mode × Density × Container)
  - **Framework-Integration**: React, Vue, Svelte, Astro/Next/SvelteKit
    konkrete Code-Snippets
  - Theme-Generator-Section mit Beispiel-Workflow
  - Theming-Architektur (light-dark + color-scheme)
  - 12 Scripts erklärt mit Anwendungsfall
  - Production-Stats-Block (54 components, 271 tokens, 17.5 KB gzip,
    1008 WCAG-AA-Paare, 50 site-asserts)
  - **Modern CSS Foundation** — komplette Liste der adoptierten 2024+
    Features (color-mix, light-dark, @container, @property,
    @starting-style, interpolate-size, field-sizing, accent-color,
    scrollbar-gutter, view-transitions)
  - Doc-Site-Übersicht mit allen Seiten + Features

- **CONTRIBUTING.md** (Neu):
  - Setup + Architektur-Regeln
  - "Neue Component hinzufügen" Workflow mit Header-Konvention
  - Tests-Tabelle mit allen 9 Check-Scripts
  - Commit-Style (Etappen-orientiert)
  - Kontrollrunden-Pattern (Layer-1-Prevention + Layer-2-Self-Test)
  - Release-Workflow
  - Browser-Support-Matrix mit Baseline-Hinweisen
  - ADR-Template-Beschreibung

### Distribution

- CONTRIBUTING.md zu package.json:files hinzugefügt — wird im Tarball
  ausgeliefert.

---

## [0.20.0] — View-Transitions + Companion-JS für neue Components

### Hinzugefügt — View-Transitions

- **Doc-Site `site.js`**: Tone/Mode/Density-Switches in `withTransition()`
  gewrapt. Wenn `document.startViewTransition` verfügbar (Chrome 111+,
  Safari 18+) und kein `prefers-reduced-motion: reduce`: smooth Cross-Fade
  zwischen Themes. Andere Browser: instant switch wie zuvor.
- **`::view-transition-old(root)` + `::view-transition-new(root)`**:
  240ms Crossfade-Timing in site.css. Reduced-motion respektiert.

### Hinzugefügt — TypeScript-Setups

- **`js/setup-copy-button.ts`** — wires `.copy-btn` mit data-copy-target /
  data-copy-text. Sets data-state="copied" / "error". Auto-clear nach
  1500ms (copied) / 2000ms (error).
- **`js/setup-otp-input.ts`** — auto-advance, Backspace-zurück, Arrow-Key-
  Navigation, Paste-Verteilung über alle Felder.
- **`js/setup-theme-toggle.ts`** — toggle data-mode mit View-Transition-
  Support + localStorage-Persistierung + aria-label-Update für Ziel-State.

### Exports

Alle drei via `@gws/design-system/js/setup-copy-button`,
`@gws/design-system/js/setup-otp-input`, `@gws/design-system/js/setup-
theme-toggle`. Auto-Init in `setupAll()`.

### Bundle

  JS-Bundle:  9.75 KB ESM (war 6.40, +3.35 für 3 neue Setups)
              11.59 KB IIFE (+3.6)
  CSS-Bundle: 128.9 KB raw / 19.5 KB gzip (+0.7 KB raw, +0.2 KB gzip durch
              view-transition pseudo-elements)

### Pipeline

Alle grün: lint, contrast (1008), visual (12), journeys (6), site (50),
package (69 imports), measure (4 budgets).

---

## [0.19.0] — Forced-Colors-Mode (Windows High Contrast) Erweiterte Coverage

`@media (forced-colors: active)` Block in state.css von 7 Components auf
20 erweitert — komplette Surface-Coverage für Windows-HC + Edge-HC-User.

### Hinzugefügt zu Forced-Colors-Block

**Surfaces** (sichtbare Trennung zu Canvas via `border: 1px solid CanvasText`):
btn, card, stat, callout, banner, **alert**, **toast**, **modal**, **drawer**,
**popover**, **tooltip**, table-wrap, badge, **tag**, **kbd**, **segmented**,
**copy-btn**, **cmd-palette**, **otp-input__field**, **theme-toggle**.

**State-Indikatoren**:
- `.btn:hover/:focus-visible` → `Highlight` / `HighlightText`
- `input/textarea/select:focus-visible` → `Highlight` outline + border
- `.segmented__item:has(input:checked)` → `Highlight` aktiv
- `.spinner, .skeleton` → `forced-color-adjust: none` + CanvasText-Border

**Disabled-State** (universell): `color: GrayText; border-color: GrayText`
für `:disabled` und `[aria-disabled="true"]`.

### Pipeline

Lint, contrast (1008), visual (12 pixel-identical — forced-colors greift
nur unter Forced-Colors-Mode, Normal-Render unverändert), journeys (6),
site (50) — alle grün.

---

## [0.18.0] — Drei komplexere Components: command-palette + otp-input + theme-toggle

Schließt die letzten 3 Standard-Lücken aus der Research-Phase.

### Hinzugefügt

- **`components/command-palette.css`** (Cmd+K Pattern) — Floating-Dialog
  mit Search + Filtered-List. Native `<dialog>` für A11Y + modal-blocking.
  Liste mit Groups (Aktionen, Suche, …), Items mit Icon + Label + Shortcut.
  Footer mit Hint-Hotkeys. @starting-style Entry/Exit-Animation.
- **`components/otp-input.css`** — Multi-Field-Code für 2FA, SMS-
  Verifizierung, Pin-Eingabe. Native `<input maxlength="1"
  autocomplete="one-time-code">` × N. JS-Pattern für Auto-advance, Paste-
  Verteilung, Backspace-Zurück, Arrow-Navigation im Header dokumentiert
  (~25 LOC).
- **`components/theme-toggle.css`** — Light/Dark-Toggle-Button.
  Sonne ↔ Mond Cross-Fade-Animation. Auto-Mode (prefers-color-scheme:
  dark)-Awareness via :root:not([data-mode]) Selektoren. Optional
  View-Transitions für smooth Cross-Page-Switch.

### Categorization

- command-palette → Overlay
- otp-input → Form
- theme-toggle → Primitive

### Bundle

  Bundle: 128.2 KB raw (+6.5 KB) / 19.3 KB gzip (+0.8 KB)
  Budget noch bei 90-94% — Headroom vorhanden.

### Pipeline

54 Component-Pages (war 51). Lint, contrast (1008), visual (12),
journeys (6), site (50 asserts), package (69 imports), measure (4
budgets) — alle grün.

---

## [0.17.0] — Drei neue Components: kbd + segmented + copy-button

Schließt drei häufig nachgefragte Lücken im Component-Inventar.

### Hinzugefügt

- **`components/kbd.css`** — Keyboard-Shortcut-Display via natives `<kbd>`.
  Single-Key oder Combo (`<kbd class="kbd-combo">⌘ + K</kbd>`). Modifier
  `.kbd--sm` / `.kbd--lg`.
- **`components/segmented.css`** — Segmented-Control (Hybrid zwischen
  Button-Group, Radios und Tabs). Native `<input type="radio">` + `<label>`
  → volle A11Y und Form-Integration. Aktiver Segment via `:has(:checked)`.
  Modifier `--sm`, `--lg`, `--block` (full-width).
- **`components/copy-button.css`** — Inline-Button mit Copy-to-Clipboard.
  `data-copy-target` (ID-Ref) oder `data-copy-text` (Inline-String).
  State-Feedback via `data-state="copied|error"` mit ✓-Icon-Replacement.
  JS-Snippet im Header dokumentiert.

### Categorization

- segmented → Form-Kategorie
- kbd + copy-button → Primitive-Kategorie

### Bundle

- Bundle: 121.7 KB raw (+7 KB) / 18.5 KB gzip (+1 KB)
- Budget angehoben: bundle.raw 130 → 140 KB, gzip 20 → 22 KB (+10% Reserve
  für weitere Component-Additions)

### Pipeline

51 Component-Pages generiert (war 48). Lint, contrast, visual, journeys,
site (50 asserts), package (66 imports), measure — alle grün.

---

## [0.16.0] — RTL-Support: typography-bullet fix + dir="rtl" Coverage-Test

Audit der 14 physischen Positions-Properties (left/right/top/bottom als
Properties) im Stack ergab:
- 13 davon sind RTL-safe (Centering mit 50% + translate, oder vertical
  top/bottom)
- 1 echter RTL-Bug: `ul li::before { left: calc(-1 * var(--space-12)) }`
  in base/typography.css — Bullet wurde IMMER auf der linken Seite
  gerendert, auch wenn `dir="rtl"`

### Behoben

- **`base/typography.css`**: `left:` → `inset-inline-start:` für Bullet-
  Position. Bullet rückt jetzt korrekt auf die rechte Seite bei `dir="rtl"`.

### Hinzugefügt

- **check-site RTL-Test**: lädt eine Component, vergleicht Layout in LTR
  vs `dir="rtl"`. Verifiziert dass logische Properties greifen (Icon
  wandert von links nach rechts beim Direction-Switch).

### Pipeline

Lint, contrast (1008), visual (12), journeys (6), site (50 — +2 RTL),
package — alle grün.

---

## [0.15.0] — Modern CSS: @property + field-sizing + accent-color + scrollbar-gutter

Path A der Modern-CSS-Adoption — die "smaller wins" Etappe. Vier neue CSS-
Features, jedes ein Quality-Upgrade ohne Architektur-Änderung.

### Hinzugefügt

- **`@property`** für 6 Tokens: `--color-interactive`, `--color-interactive-
  light`, `--color-interactive-dark`, `--color-focus-ring`, `--btn-radius`,
  `--range-fill-pct`. Typed Custom Properties — DevTools zeigt Color-Picker,
  Animation interpoliert korrekt, View-Transitions können Tokens smooth
  zwischen Themes überblenden.
- **`field-sizing: content`** auf `textarea` (base/reset.css). Textarea
  wächst automatisch mit Content, keine JS-Krücke mehr. Chrome 123+,
  Firefox 137+. Fallback: User-resize (vertical) wie zuvor.
- **`accent-color: var(--color-interactive)`** auf native checkbox/radio/
  range/progress. Branding für Form-Controls ohne appearance:none-Tax.
- **`scrollbar-gutter: stable`** auf `:root`. Reserviert 15px Gutter
  konsistent — verhindert Layout-Shift wenn lazy-loaded Content den
  Scrollbar triggert.

### VRT-Update

- Alle 12 Baselines neu generiert: Width 1280 → 1265 (15px gutter
  reserved). Page-Höhen unverändert.

### Pipeline

Lint, contrast (1008), visual (12 new baselines), journeys (6), tools
self-test (3), site (48) — alle grün.

Bundle: 114.6 KB raw / 17.7 KB gzip (+0.2 KB durch @property-Definitionen
und field-sizing/accent-color Regeln).

---

## [0.14.0] — Modern CSS: @starting-style + interpolate-size

Modernisiert die Overlay-Animationen via `@starting-style` und
`transition-behavior: allow-discrete` (Baseline 2024+). Ersetzt
`@keyframes`-Pattern, das nur Entry hatte — jetzt smooth in UND out.

### Geändert

- **popover.css**: `@starting-style` für Enter, `.popover:not(:popover-open)`
  für Exit. `transition-behavior: allow-discrete` aktiviert die Transition
  für `display` und `overlay` Properties (sonst springt das Popover instant).
- **modal.css**: ersetzt `@keyframes modal-enter` durch `@starting-style`.
  Backdrop bekommt eigene Exit-Animation. Modal-Close hat jetzt smooth
  fade-out + scale-down (vorher: instant disappear).
- **drawer.css**: ersetzt `@keyframes drawer-slide-start/end` durch
  `@starting-style`. Slide-Out funktioniert jetzt bei beiden Modifier-
  Varianten (`.drawer--start` und Default `.drawer`).
- **accordion.css**: `interpolate-size: allow-keywords` ermöglicht
  Animation zwischen `height: 0` und natürlicher Content-Höhe. Chrome
  129+ — andere Browser ignorieren still (instant toggle wie zuvor).

### Reduced-Motion

Alle Animationen respektieren `prefers-reduced-motion: reduce` —
`transition: none` und sofortiges Zeigen/Verstecken des Endzustands.

### Bundle

  Bundle:    114.6 KB raw / 17.7 KB gzip (+0.2 KB durch zusätzliche
             @starting-style + reduced-motion Blöcke)

### Pipeline

Lint, contrast (1008/1008), visual (12/12 pixel-identical), journeys
(6/6), a11y (passed) — alle grün. VRT bleibt identisch weil die End-
Zustände (open/closed) unverändert sind; nur die Bewegung dazwischen
ist jetzt smooth in beide Richtungen.

---

## [0.13.0] — Interactive Header + Modifier-Coverage + Favicon

User-Report-getrieben (fünf Wünsche in einer Session):
  1. Avatar-Stack-Größen-Modifier "nicht funktional"
  2. "Überprüfe alles auf Funktionen"
  3. Header verbessern, Kategorien werden zur Liste auf Hover
  4. Mobile-Optimierung
  5. Site braucht ein Favicon

Plus ein verstecktes Pre-existing Bug während der Session entdeckt:
  6. `var(--color-surface)` war an 15+ Stellen referenziert aber NIE definiert
     → alle "Surfaces" rendeten transparent. Heimlich-broken seit der ersten
     Site-Etappe.

### Hinzugefügt — Modifier-Vorschau-Sektion

Jede Component-Doc-Page bekommt unter "Beispiele" + "Tone-Übersicht" eine
neue Sektion: für jede dokumentierte Modifier-Klasse wird das Basis-Markup
mit dieser Klasse gerendert. Visueller Beweis, dass die Klasse funktional
ist.

- **Convenience-Syntax-Expander**: ".btn--sm / --lg" wird in [btn--sm,
  btn--lg] expandiert (vorher: Parser nahm nur das erste, Demo zeigte nur
  eine Variante). Genauso für ".alert--info / --success / --warning /
  --danger" und 8 weitere Components mit Slash-Syntax.
- **ID-Rewriting wiederverwendet** (siehe v0.11.0 Tone-Strip-Fix):
  Modifier-Tiles bekommen `m-<class>-` Prefix damit das Cloning keine
  HTML5-ID-Verletzungen + ARIA-Mishits produziert.

### Hinzugefügt — Mega-Menu im Header

- **Components-Nav-Item** wird zu einem Mega-Menu. Desktop: hover ODER click
  öffnet ein Panel mit allen 8 Kategorien + ihren Components (sortiert).
  Touch/Mobile: click-toggle. ARIA: aria-haspopup, aria-expanded, role=menu,
  role=menuitem. Escape schließt.
- **Hover-Intent** via `@media (hover: hover) and (pointer: fine)` — Touch-
  Devices (die hover-Events emulieren) öffnen NUR via click, kein
  versehentliches Aufpoppen.
- **Click-outside** schließt das Panel.

### Hinzugefügt — Mobile-Optimierung

- **Burger-Toggle** (`☰`) bei < 768px Viewport. Topbar-Nav wird zum
  Slide-Down-Drawer.
- **Switches im Drawer**: DOM-Restructure verschiebt Tone/Mode/Density-
  Switches DAS DRAWER-Ende. Stack natürlich, mit Border-Separator.
- **Sidebar versteckt** bei < 768px — Mega-Menu im Burger ersetzt die
  Component-Navigation. Main belegt die volle Breite.
- **Mega-Menu kollabiert** zu Inline-Accordion im Drawer (click-only,
  kein Hover-Pop-Layer auf Touch).

### Hinzugefügt — Favicon

- **`dist/site/assets/favicon.svg`**: SVG mit 4 OKLCH-Quadraten in den
  prominentesten Theme-Tones (trust-green, playful-amber, modern-blue,
  premium-dark). Vector, dark-mode-kompatibel, ~290 Byte.
- **`<link rel="icon" type="image/svg+xml">`** in pageShell().

### Behoben — Pre-existing: --color-surface nicht definiert

- `var(--color-surface)`, `var(--color-surface-subtle)`,
  `var(--color-surface-hover)`, `var(--color-on-interactive)` waren in 15+
  CSS-Regeln im Site-Stack referenziert, aber NIE in semantic.css definiert.
  Resultat: transparente Surfaces für Topbar, Sidebar, Cards, Mega-Panel,
  Drawer, Foundations-Token-Tiles, Theme-Gen-Preview etc.
- Jetzt in semantic.css als light-dark()-Tokens. Stack-Bug der mobile-
  Optimierung sichtbar gemacht hat (Drawer war transparent → unleserlich).

### Tests

- **+9 Site-Asserts**:
  - 6× Header-Nav (favicon-link, mega-click, mega-link-count, mega-Escape,
    mobile-burger-visibility, mobile-burger-click)
  - 3× Modifier-Preview (avatar-stack --sm vs --lg verschieden, count
    >= 3, alert-variants 4 verschiedene bgs)
- **Gesamt site-asserts**: 48 (war 34, +14)

### Pipeline-Status

  lint, test:lint (21), contrast (1008), visual (12), journeys (6),
  measure (4 budgets), site (48), package (73 coverage) — alle grün.

---

## [0.12.0] — Modern CSS: light-dark() ersetzt die Override-Architektur

Path A der Modern-CSS-Adoption. Vor v0.12.0 wurde Dark-Mode über zwei
Mechanismen umgesetzt:

  1. `[data-mode="dark"] { ... }` Re-Overrides aller mode-sensitiven
     Tokens (manuell)
  2. `@media (prefers-color-scheme: dark) { :root:not(...) { ... } }`
     identische Re-Overrides für Auto-Dark

Mit Descendant-Partner-Selektor (`[data-mode="dark"] [data-tone]`) damit
nested Tone-Scopes nicht ihre Identity verlieren. dark.css: 125 Zeilen
Duplikation.

**Neue Architektur**: jeder mode-sensitive Token nutzt `light-dark(L, D)`
in seiner Definition. `color-scheme` auf `:root` (oder `[data-mode]`)
treibt die Auflösung. `color-scheme` erbt automatisch — der Descendant-
Partner-Pattern entfällt.

### Migriert

- **`semantic.css`**: 11 Color-Tokens (--color-bg/-secondary/-tertiary/
  -inverse, --color-text-primary/-secondary/-tertiary/-muted, --color-
  border/-light/-dark, --card-bg, --input-bg) → `light-dark()`. Chart-
  Palette (8 Tokens) ebenfalls. `:root` bekommt `color-scheme: light dark`.
- **`dark.css`**: schrumpft von 125 Zeilen auf 67. Enthält nur noch:
  (1) `data-mode → color-scheme` Mappings, (2) Multi-Shadow-Overrides
  (light-dark() kann multi-comma values nicht parsen), (3) edge-case
  `--code-block-bg` Override (kann nicht trivial via inversem Token
  abgeleitet werden).
- **`themes/`**: minimal (10 Tokens), trust (2), premium (2), industrial
  (3) konvertiert zu light-dark(). Themes behalten ihre Light-Identity,
  delegieren Dark an globale defaults.

### Lint-Update

- **Check 2 (destructive tokens)**: light-dark()-Werte gelten nicht mehr
  als destruktiv. Themes können mode-sensitive Tokens überschreiben
  WENN sie light-dark() nutzen (explizit + sicher).
- **Check 3 (descendant-partner)**: komplett umgebaut. Beim alten Setup
  Pflicht. Mit color-scheme-Inheritance obsolet. Stattdessen: dark.css
  darf nur die definierten ALLOWED_DARK_OVERRIDES enthalten (Shadows,
  code-block-bg, focus-ring). Alle anderen mode-sensitiven Tokens
  müssen in semantic.css mit light-dark() leben.
- **`readModeSensitiveTokens()`** scannt jetzt zusätzlich semantic.css
  nach light-dark()-Verwendung. Themes die diese Tokens ohne light-dark()
  überschreiben → soft-warn.

### check:contrast erweitert

- Parser unterstützt jetzt `light-dark(L, D)` und unwrappt basierend auf
  ctx.mode/ctx.prefersColorScheme. Alle 1008 kritischen Paare über alle
  4 Modi grün.

### check:visual self-test crash-safe

- Frühere Self-Test-Runs konnten mutated Theme-Files hinterlassen wenn
  der Subprocess interrupted wurde (passiert während v0.12.0 Migration:
  trust+modern hatten radius-24 hardcoded). Neue Implementation:
  SIGINT/SIGTERM/uncaughtException Handler → restoreAll() auf alle
  pending Mutationen.

### Stats

- **dark.css**: 125 → 67 Zeilen (-46%)
- **Mode-sensitive Token-Coverage**: 11 Color-Tokens + 8 Chart-Tokens
  in semantic.css statt 2× dupliziert in dark.css
- **Bundle**: 114.3 KB raw / 17.5 KB gzip (-0.4 KB raw durch Reduktion
  von Duplikation, gzip ~identisch)
- **Pipeline**: lint, test:lint (21/21), contrast (1008/1008), visual
  (12/12), self-test (3/3), journeys (6/6), site (34/34), measure
  (4/4 budget), package (73/73 coverage) — alle grün

---

## [0.11.0] — Interactive Component Pages

Aus statischer Doc wird eine Spielwiese. Jedes Markup-Beispiel hat jetzt
einen Live-Editor (HTML-Änderungen reaktivieren die Preview sofort), einen
Copy-Button, einen Reset-Button. Plus: pro Component eine Tone-Übersicht
mit allen 6 Tones nebeneinander — Klick auf eine Kachel schaltet die ganze
Seite auf diesen Tone.

### Hinzugefügt

- **Live HTML-Editor pro Beispiel**: Klick auf "Edit" enthüllt ein
  Textarea mit dem Markup. Tippen modifiziert die Preview live. `DS.setupAll()`
  wird nach jedem Input neu aufgerufen, damit Popovers/Combobox-Trigger
  weiter funktionieren wenn man den Markup editiert hat.
- **Copy-Button**: kopiert das aktuelle (ggf. editierte) Markup in die
  Zwischenablage. ✓-Confirm + Reset nach 1.2s.
- **Reset-Button**: Restored das Original aus dem `data-original`-
  Attribut. Sichtbar nur wenn Markup vom Original abweicht.
- **Tone-Übersicht-Strip**: jede Component zeigt sich in 6 Tile-Previews
  (trust / playful / premium / industrial / modern / minimal). Klick auf
  eine Tile setzt `data-tone` global — komplette Seite wechselt den Tone.
- **`check-site` +5 Asserts** für die neue Interaktion: edit-toggle
  reveals source, textarea input re-renders preview, reset visibility,
  reset restores, tone-strip tile click switches root.

### Bugfix

- **`hidden`-attribut versteckte die Reset-Buttons nicht**, weil
  `.btn { display: inline-flex }` aus der components-Layer das UA-default
  `[hidden] { display: none }` überstimmte. Specific CSS-Rule:
  `.site-example__toolbar [hidden] { display: none }` fixt das.

### Stats

  Bundled:    114.7 KB raw · 17.5 KB gzip (unchanged)
  Site-Asserts: 39 / 39 grün (war 34, +5 für Editor/Tone-Strip)
  Pipeline:     6 / 6 grün

---

## [0.10.0] — Bundle Discipline (Measurement + Budget + Minified Output)

Was Konsumenten interessiert ist die ausgelieferte Größe. Bisher gemessen:
nichts. Diese Release misst, dokumentiert, budgetiert.

### Hinzugefügt

- **`scripts/measure-size.js`** — bundlet `main.css` über esbuild (resolved
  alle `@imports`), misst raw + gzip + brotli, dazu minified-Variante.
  Zusätzlich per-Layer (tokens / semantic / themes / base / state /
  components) und per-Component-Breakdown (Top 10).
- **`npm run measure`** (Report) + **`npm run measure:check`** (Budget-
  Enforcement, exit 1 bei Überschreitung).
- **`dist/main.min.css`** — minified Output (esbuild-minify), exportiert
  via `@gws/design-system/min`. Konsumenten bekommen direkt eine
  optimierte Variante, ohne eigenen Build-Step.
- **`dist/bundle-stats.json`** — strukturierte Stats, exportiert via
  `@gws/design-system/bundle-stats.json` für Dashboards/Reports.
- **`bundleBudget`** in `package.json` — Reserve ~10% über aktuellem
  Stand. Schlägt fehl wenn die Größe wächst (Regression-Detection).
- **Foundations-Site zeigt Bundle-Stats** prominent am Seitenanfang.
- **`check:full` chained `measure:check`** — Budget-Verstoß failed das
  publish-vor-Check.

### Stats (Baseline v0.10.0)

  Bundled (resolved):  114.7 KB raw · 17.5 KB gzip · 14.8 KB brotli
  Minified:             91.4 KB raw · 16.3 KB gzip · 14.1 KB brotli

  Per Layer:
    tokens       7.5 KB    (1 Datei)
    semantic    17.2 KB    (3 Dateien)
    themes      10.6 KB    (6 Dateien)
    base        12.4 KB    (4 Dateien)
    state        2.2 KB    (1 Datei)
    components 136.0 KB   (48 Dateien)

  Top 3 größte Components:
    combobox     8.9 KB  (custom listbox + search)
    file-upload  5.4 KB  (drag-drop pattern)
    popover      5.3 KB  (anchor + native popover)

### Distribution-Optionen

- **`@gws/design-system`** → `main.css` (vollständig, alle Components)
- **`@gws/design-system/min`** → `main.min.css` (minified)
- **`@gws/design-system/components/<name>`** → per-Component-Import (tree-
  shake auf CSS-Ebene, importiere nur was nötig)
- **`@gws/design-system/themes/<tone>`** → per-Theme-Import
- **`@gws/design-system/tokens.json`** → DTCG-Token-Export
- **`@gws/design-system/bundle-stats.json`** → strukturierte Stats

### Quality

  34/34 site-checks · 6/6 pipeline-checks · 4/4 budget-categories grün

---

## [0.9.0] — Container-Queries als 4. Achse

Components passen sich jetzt an ihren tatsächlichen Container an — nicht
an die Viewport-Breite. Damit wächst das DS-Achsenmodell von 3 auf 4:

  Tone × Mode × Density × Container

Opt-in via `.cq`-Wrapper-Klasse — backward-compatible. Bestehende
Components ohne `.cq`-Wrapper verhalten sich unverändert.

### Hinzugefügt

- **Tokens** (`tokens.css` → CONTAINER-QUERY BREAKPOINTS):
  `--cq-bp-sm` (480px), `--cq-bp-md` (640px), `--cq-bp-lg` (800px),
  `--cq-bp-xl` (1024px). CSS-Caveat: `@container` kann derzeit kein
  `var()` lesen — die Tokens sind als Konvention für Components
  dokumentiert, die Breakpoints werden in den Rules literal verwendet.
- **`.cq` Wrapper** (`base/layout.css`): `container-type: inline-size`.
  Macht Kinder Container-Query-aware. Opt-in, weil Containment
  Nebeneffekte hat (z.B. `height: 100%` Children).
- **`.card--split`** Modifier: vertikal default, horizontal split
  (1:φ Goldener Schnitt) sobald der Container ≥ 600px breit ist.
  Demonstriert die Bewegung zwischen Layouts.
- **`.list-row` Container-Awareness**: in einem `.cq`-Wrapper < 480px
  Breite wird `__meta` versteckt — Sidebar-Slots überfordern sonst die
  Title-Truncation.
- **Foundations-Site: Container-Demo-Sektion** mit nativem
  `resize: horizontal`-Handle. User zieht die gestrichelte Box, Card +
  List-Row reagieren live.

### Tests

- **check-site +4 Container-Query-Asserts**: card--split grid-cols
  (2 wide, 1 narrow), list-row__meta visibility (visible wide, hidden
  narrow). Programmatic resize triggert deterministisch die Layout-
  Wechsel.

### Quality

  Site-Checks      38 → grün (4 neue Container-Asserts)
  Pipeline-Checks  6 / 6 grün (lint, test:lint, contrast, a11y, visual, journeys)
  Tokens           267 (4 neue --cq-bp-* )

### Design-Entscheidungen

- **App-Shell bleibt @media (viewport-basiert)** — page-level Shells
  sind logisch viewport-bezogen. Container-Queries sind das richtige
  Werkzeug für Component-interne Layout-Anpassung, nicht für Page-
  Level-Shells.
- **Opt-in statt Default**: `.cq` muss explizit gesetzt werden. Damit
  bleibt der Default-Pfad backward-compatible und Performance-Footprint
  von Containment ist nur dort wo gewünscht.

---

## [0.8.0] — Interactive Documentation Site + Theme-Generator

Ausgeliefert in 5 Etappen auf einem Branch — jede Etappe ein in sich
geschlossener Mehrwert. End-to-End: aus den Component-Headern entstehen
48 Doc-Pages, 263 Tokens werden im Browser live editierbar, eine
HEX-Farbe wird zu einer kompletten 11-Step-OKLCH-Palette mit Color-Blind-
Safety-Verdict und CSS-Export, und alle Konfigurationen sind teilbar via
URL.

### Etappe 5 — Missing Struktur-Blocks + Parser-Härtung

- Struktur-Blöcke ergänzt in **badge / button / card / section / select /
  spinner / switch / avatar / tag / tree / nav / chevron / combobox**.
  Diese Source-Improvements wirken sowohl direkt im Repo (bessere
  CONTRACT-Header) als auch in der generierten Site (Live-Markup-Beispiele).
- **Parser-Bug behoben**: Vorhin akzeptierte der Section-Label-Parser
  Intro-Prose wie `Markup nutzt native <input ...>` als Label, weil der
  post-loop-Test schon ein einzelnes `:` irgendwo in der Akkumulation
  zugelassen hat (z.B. via `appearance:none` im Prose). Neue Logik:
  `isLabelComplete = /^:/ || /:\s*$/` — Label muss entweder mit `:` direkt
  am Anfang ein Inline-Value liefern, oder die akkumulierten Zeilen
  müssen mit `:` enden. Markup-Erkennung jetzt 48/48 Components.

### Etappe 4 — URL-State + GitHub-Pages-Workflow

Macht den Stand teilbar.

- URL-State-Persistierung in site.js:
  - `?tone=premium&mode=dark&density=compact` — Axis-Switchers schreiben
    bei jeder Änderung via `history.replaceState()` (rAF-debounced).
  - `?t.--btn-radius=2rem&t.--color-interactive=...` — Live-Token-Edits.
  - `?hex=...&name=...` — Theme-Generator-Eingabe.
  - Beim Page-Load werden alle Werte ausgelesen und angewendet.
- **Share-URL-Button** auf Foundations kopiert `location.href`.
- **`--asset-root=` / `DS_ASSET_ROOT` Env-Var**: konfigurierbarer
  Project-Root-Pfad. Default = relativ für file://-Demo; Deployment-
  Workflow setzt `./_ds/` damit DS-Assets unter einem Subpfad gestaged
  werden können.
- **`.github/workflows/deploy-site.yml`**: GitHub-Pages-Workflow.
  Trigger: push auf main + manuelles workflow_dispatch.
- **Check-Site +4 URL-State-Asserts**.

### Etappe 3 — Theme-Generator (HEX → OKLCH-Palette)

- **Color-Konvertierung in JS**: sRGB ↔ linear-sRGB ↔ OKLab ↔ OKLCH
  (Ottosson 2020). Gamut-Mapping via Bisection auf Chroma.
- **Palette-Generierung**: User-HEX → 11-Step-Skala (50–950). OKLCH-Hue
  konstant, Lightness folgt einer Tailwind-orientierten Zielkurve,
  Chroma fällt zu den Extremen ab.
- **Color-Blind-Safety-Check**: Brettel/Viénot-Mollon-Simulation für
  Deuteranopie / Protanopie / Tritanopie. Min-Lightness-Delta zwischen
  adjacenten Steps wird gemeldet; Verdict pro CB-Typ als Badge.
- **Live-Preview**: Card mit Buttons + Alert + Badges bekommt die
  generierten Tokens via scoped `<style>` + `data-tone`.
- **CSS-Export**: vollständiger `[data-tone~="<name>"]`-Block mit allen
  abgeleiteten Tokens. Copy-to-Clipboard-Button.

### Etappe 2 — Foundations + Live-Token-Editor

- 263 Tokens werden aus `tokens/tokens.css` + `semantic/semantic.css`
  gelesen und nach 9 Foundation-Gruppen sortiert.
- Pro Token-Kind ein passendes Swatch: Farbflächen, Spacing-Balken,
  Radius-Quadrate, Border-Linien, Schatten-Boxes, Font-Samples,
  animierte Motion-Pulse-Dots.
- Live-Editor via `.style.setProperty()` auf `:root` — wirkt sofort auf
  alle Beispiele. Edited-Marker, Reset-Button, URL-Persistierung.

### Etappe 1 — Site Foundation (Doc-Site direkt aus Component-Headern)

- **`scripts/build-site.js`** — statischer Generator. Parst die JSDoc-Header
  aller 48 Components und extrahiert Titel, Intro (mit Bullet-Listen),
  CONTRACT, Struktur (HTML-Beispiele), Modifier. Multi-line Section-Labels
  werden korrekt zusammengeführt (z.B. `Struktur (mit korrektem A11Y-Markup
  …):` über zwei Header-Zeilen). Indent-basierte Boundary trennt Prose von
  HTML.
- **`scripts/check-site.js`** — Smoke + Interactions + Foundations + Theme-
  Generator + URL-State. **28 Asserts** insgesamt, hängt nicht am
  vorderen `check:full`, kann standalone laufen.
- **`dist/site/`** — 48 Component-Pages + Index-Grid + Foundations + Themes
  + Playground-Stub. App-Shell-Layout aus dem DS, Sidebar mit Kategorien-
  Gruppen, Topbar mit Axis-Switchers.
- **npm-scripts** `build:site` und `check:site`. `check:full` chained beide.

### Stats

- **48** Component-Pages generiert (100% Markup-Coverage nach Etappe 5)
- **263** Tokens im Foundations-Browser
- **11** Steps in der OKLCH-Theme-Generator-Palette
- **28** automated Site-Asserts (Smoke + Interactions + Live-Edit + Theme-
  Gen + URL-State)
- **0** pageerror/404/console.error in der generierten Site

---

## [0.7.3] — Vorschau-Fix: Ghost-Buttons + Topbar-Wrap

User-Report (Folge-Bug): Demo-Vorschau hatte sichtbare Issues — Topbar wrappte
in 2 Zeilen bei Premium/Industrial, DARK-Toggle wanderte in 2. Zeile und war
"verloren". Plus stale Hero-Text "29 Components" statt aktuell 50.

### Behoben

- **Ghost-Buttons übernahmen Theme-Identity-Tokens** (`--btn-transform: uppercase`, `--btn-letter`, `--btn-weight`) von Premium/Industrial → wurden zu UPPERCASE Text-Spalten ohne erkennbaren Button-Charakter. **Topbar-Folge-Bug:** durch die längere Uppercase-Breite wrappte die Topbar in 2 Zeilen, DARK-Toggle landete unten und schien "fehlend" — das war die ursprüngliche User-Beschwerde "Premium/Industrial haben keinen Dark-Mode toggle". Beides ein Bug, ein Fix.
  - **Lösung:** `.btn--ghost` resetet `--btn-transform: none` + `--btn-letter: 0` + `--btn-weight: var(--fw-500)`. Ghost ist explicit das "subtle"-Pattern, opinionated Identity-Tokens passen nicht dazu. Primary + Secondary behalten Theme-Identity unverändert.
- **Stale Hero-Text aktualisiert:** "29 Components" → "50 Components" + Achsen-Spezifikation "6 Tones × 2 Modes × 3 Densities".

### VRT-Baselines aktualisiert

12 PNGs regeneriert wegen Ghost-Button-Visual-Änderung + Hero-Text-Update.

### Lehre

User-Report-Symptom "kein Dark-Toggle" → echte Ursache nicht das Toggle selbst, sondern Layout-Wrap durch zu breite Topbar-Buttons. Mein Probe v0.7.2 testete den Toggle programmatisch (klick → state-change) und sah ihn "funktional", aber visuell war er außerhalb des Viewport-Sweet-Spots. **Pixel-Inspektion vor Probe-Logic.**

---

## [0.7.2] — Density universal + systematische Bug-Klassen-Detection

User-Bug-Report: "Spacing ist nur für Trust und Modern verfügbar, Premium und
Industrial haben keinen Dark-Mode toggle und das Auswählen des Spacings hat Bugs."
Plus Anweisung: "Durchsuche das ganze System systematisch nach ähnlichen Bugs,
finde alle. Du musst alle finden und beheben."

### Behoben

- **Density-Block in 4 Themes** (Premium, Playful, Industrial, Minimal):
  alle setzten `--btn-px` + `--btn-py` hardcoded → blockten die Density-Achse.
  v0.3.2-Designentscheidung "opinionated Themes behalten Identity-Sizing"
  von User-Erwartung "Density universal" überstimmt. Entlassen, jetzt
  density-responsive (50/42/58 px in comfortable/compact/spacious — verifiziert).
  Identität via radius/color/weight/letter/transform statt Padding.
- **Dist/js/-Bundle-Loss-Verständnis**: User-Report "Dark-Mode-Toggle in
  Premium/Industrial broken" war Symptom des Bundle-fehlt-Bugs. Wenn dist/js/
  zwischen Builds verloren ging (z.B. durch `rm -rf dist`), brach das ganze
  Demo-JS — Dark-Toggle technisch ok, aber Companion-JS broken machte den
  Eindruck. Mitigiert durch `prepare`-Hook + dist/js/ committed.

### Hinzugefügt — Systematische Detection

- **Lint Check 5: Cross-Axis-Token-Block-Detection**. Auto-detected aus
  semantic+components+base: welche Component-Tokens haben Fallback auf
  `--density-*` (Pattern A: `var(--X, var(--density-...))`) oder werden
  direkt darauf definiert (Pattern B: `--X: var(--density-...)`). Themes
  die diese Tokens hartcoded setzen → hard-fail. **Keine Whitelist** —
  zukünftige axis-Achsen (forced-colors, prefers-contrast in v0.8) werden
  durch Erweitern von `AXIS_PREFIXES` automatisch erfasst.
- **20 axis-sensitive Tokens auto-detected** in der ersten Iteration.
  Aktuell 0 Blocker — alle Themes konform.
- **`scripts/audit-system.js`**: heuristische Pattern-Scans für 5 Bug-Klassen
  (A: Density-Blocker, B: A11Y, C: hardcoded Sizing in Components, D: Magic-
  Numbers in Themes, E: Demo inline-styles). A+B durch Pipeline-Checks
  covered; C+D aktuell 0 Befunde; E ist heuristisch (Demo-naturally OK).
- **`npm run audit`**: einmaliger Scan, kein hard-fail (Pattern-Diagnose).
- **3 neue Integration-Tests in `test-lint.js`** (21 Tests total):
  - axis-blocker (--btn-py hardcoded) → exit 1
  - axis-blocker (--table-cell-py hardcoded) → exit 1
  - non-axis token (--btn-radius) → exit 0 (Theme-Identity OK)

### VRT-Baselines aktualisiert

Premium / Playful / Industrial / Minimal haben jetzt density-default
Button-Padding — visuell anders als bisher. 12/12 Baselines regeneriert.

### Strategie-Lehre

Nicht "alle Bugs ad-hoc finden", sondern **Klassen mechanisch erkennbar machen**:
- Cross-Axis-Blocker: Lint Check 5 (regelt für künftige Axes mit)
- Hardcoded Sizing in Components: Audit Class C
- Magic-Number Tokens in Themes: Audit Class D
- Jeder neue Bug-Typ wird im Pattern aufgenommen, einmal — danach automatisch.

### Pipeline-Stand

8-stufig grün: `build:js → Lint(5 Checks) → Test-Lint(21) → Static-Contrast(1008) → Browser-Contrast(180) → A11Y(0) → Visual(12) → Journeys(6)`

---

## [0.7.0] — Companion-JS in TypeScript

Erste v0.7-Etappe: das DS bekommt eine offizielle JavaScript-Library für
die interaktiven Components. Bisher kopierten Konsumenten die JS-Snippets
aus den Component-Headern manuell — fehleranfällig (v0.6.5 entdeckte 3
Diagnostik-Probleme rund um Click-Handling und Event-Timing, die jeder
Konsument einzeln getroffen hätte).

### Hinzugefügt

- **`js/` als TypeScript-Source-Verzeichnis** mit 6 Modulen:
  - `setup-dismiss.ts` — generic `[data-dismiss]`-Pattern
  - `setup-popover.ts` — Trigger-Anchoring + `aria-expanded`-Sync
  - `setup-combobox.ts` — Keyboard (Arrow/Enter/Esc), Selection, Filter, Anchoring
  - `setup-file-upload.ts` — Drag-Counter robust, Drop-Übernahme, Selected-File-Anzeige
  - `setup-slider.ts` — Track-Fill + Output-Sync, optionale `data-format-prefix`/`-suffix`-Formatter
  - `anchor-popover.ts` — shared Utility, von Combobox + Popover genutzt
  - `index.ts` — Re-Exports + `setupAll()`
- **`tsconfig.json`** mit strict mode + DOM-Lib + ES2022-Target. Declaration-Files (`*.d.ts`) für TypeScript-Konsumenten.
- **`scripts/build-js.js`** als Build-Orchestrator: `tsc` für per-File-ESM + `esbuild` für 2 Bundles:
  - `dist/js/design-system.bundle.js` (ESM, 6.4 KB) — für npm-Konsumenten mit eigenem Bundler
  - `dist/js/design-system.iife.js` (IIFE als `window.DS`, 8.0 KB) — für direkte `<script src>`-Einbindung, **file://-kompatibel** ohne CORS-Issues
- **`package.json` exports map**: Subpath-Imports für tree-shaking
  - `@gws/design-system` — CSS-Entry
  - `@gws/design-system/js` — TypeScript-typisierte ESM-API
  - `@gws/design-system/js/bundle` — ESM-Bundle
  - `@gws/design-system/js/iife` — IIFE-Bundle
  - `@gws/design-system/components/*` — einzelne Component-CSS
  - `@gws/design-system/themes/*` — einzelne Theme-CSS
- **`npm run build:js`** als Pre-Step in `check:full` — garantiert dass die Demo-getestete Pipeline gegen den frisch gebauten Bundle läuft.

### Geändert

- **Demo (`index.html`)** lädt Companion-JS jetzt via `<script src="./dist/js/design-system.iife.js">` + `DS.setupAll()` statt eigener inline-Snippets. ~150 Zeilen inline-JS entfernt; demo-spezifisches JS (Theme/Mode/Density-Switcher) bleibt inline.
- **Slider-Demo `slider-price`**: `data-format-prefix="CHF "` statt ID-spezifischer Sonderbehandlung im JS — sauberer und konfigurierbar pro Markup.

### Diagnostische Erkenntnisse

- **ES-Module von `file://` werden CORS-blockiert** (Browser-Security). `<script type="module" src="...">` UND inline `<script type="module">import...</script>` beide nicht nutzbar offline. **Lösung:** IIFE-Bundle zusätzlich zur ESM-Variante. Im Component-Header dokumentiert.
- **`tsconfig.json` `rootDir`** muss explizit gesetzt sein, sonst landen Outputs in `dist/js/js/`-Doppel-Hierarchie.
- **`dist/js/` wird committed** trotz Build-Artefakt-Status: 76 KB sind trivial, ermöglichen `git clone + open index.html` ohne npm install. `.d.ts.map`-Source-Maps bleiben gitignored.

### Validierung

- 6/6 Journey-Tests bestätigen funktionale Äquivalenz zur inline-Snippet-Variante (alle Interactions weiterhin korrekt).
- TypeScript-Build erzeugt 0 Errors mit strict mode.
- ESM 6.4 KB + IIFE 8.0 KB — kein Tree-Shaking nötig für lean Adoption.
- Komplette 7-stufige Pipeline grün, jetzt mit `build:js` als 0. Schritt.

---

## [0.6.6] — Host-Diagnostic + Pipeline-Orchestrator (Schwächen #3 + #5 — ehrlich partial)

Ursprünglich geplant: "Playwright-Migration löst #3 + #5 magisch". Realität:
in der sandboxed Dev-Umgebung kein Internet für Playwright-Browser-Binaries,
plus zwei eigene Optimierungs-Versuche brachen den Determinismus (Wait-
Strategy) oder hatten keinen Effekt (Parallelisierung auf single-vCPU).

Resultat: pragmatische Teil-Lösungen statt Big-Bang-Migration.

### Hinzugefügt

- **Host-Metadata für VRT** (Schwäche #3 partial): bei `--update`/`--create` schreibt `check-visual.js` `tests/visual/.metadata.json` mit `chromiumVersion`, `platform`, `arch`, `viewport`. Bei normalen Runs wird die aktuelle Host-Info verglichen → Drifts werden **soft-warned** mit klarer Diff-Anzeige. Aktiv verifiziert durch injizierten `darwin/Chrome120 vs linux/Chrome149`-Test.
  - **Pattern:** sichtbar machen statt magisch verhindern. Konsumenten sehen vor dem Debug, dass Pixel-Diffs auf Browser-Drift zurückgehen könnten.
- **`scripts/check-rendered.js`** als Parallel-Orchestrator für die 3 Puppeteer-Skripte (a11y, visual, journeys). Funktional korrekt, default-pipeline nutzt es nicht weil Sandbox-CPU-Limit Parallelisierung neutralisiert. **In CI mit Multi-Core wird Win realisiert** (Schwäche #5 partial — Werkzeug vorhanden, Aktivierung in v0.7 mit CI).
- **`playwright` als devDep** für künftige Cross-Browser-Aktivierung in v0.7+. Heute nicht produktiv genutzt — Browser-Binaries-Download in Sandbox nicht möglich.

### Diagnostische Erkenntnisse

- **Wait-Strategy-Optimization fehlgeschlagen:** `domcontentloaded` statt `networkidle0` sparte 7 s pro Run, brach aber Determinismus (Font-Fallback-Layout-Shifts → Dimension-Mismatch in 3/12 Baselines). `networkidle0` ist notwendig, im Code-Comment dokumentiert.
- **Parallelisierung neutralisiert** auf single-vCPU-Sandbox: parallel 50 s ≈ serial 50 s. Real-Time-Win nur mit echtem CPU-Headroom. `--serial`-Flag im Orchestrator für constrained Environments.
- **Visual-Real-Cost: ~38 s** (vorher fälschlich auf 12 s geschätzt). Dominiert die Pipeline. Echte Optimierung-Vektoren: weniger Tone×Mode-Kombinationen, kleinerer Viewport, oder Page-Reuse statt 12 page.goto-Calls (letztes ist riskant für State-Leakage).

### Schwächen-Hardening-Status (ehrlich)

- #1 ✓ v0.6.4 (Self-Tests)
- #2 ✓ v0.6.4 (Sensitivity-Suite)
- **#3 partial v0.6.6** (Host-Diagnostic sichtbar, echte Prevention erfordert Docker-pinned CI in v0.7+)
- #4 ✓ v0.6.5 (Journey-Tests)
- **#5 partial v0.6.6** (Orchestrator vorhanden, Aktivierung mit CI)

### Lehre

Mein v0.6.5-Versprechen "v0.6.6 löst #3 + #5 via Playwright-Migration" war über-optimistisch. Bundled-Chromium löst Cross-Host-Determinismus **nicht magisch** (Drift bei Updates bleibt). Parallelisierung bringt **nur unter bestimmten Bedingungen** Wert. Ehrliche partial-Lösungen + transparent dokumentierte Limitations > false-Promise-Big-Bang.

---

## [0.6.5] — User-Journey-Tests (adressiert Schwäche #4)

End-to-End-Behauptungen über echte User-Interaktionen. Schließt die Lücke
zwischen den Spezialisten-Tools — fängt Bugs die zwischen ARIA-Vertrag,
Lint-Source-Patterns und visueller Render-Verifikation liegen.

### Hinzugefügt

- **`scripts/check-journeys.js`** mit 6 Journeys, die kritische interactive Components durch echte User-Flows verifizieren:
  - **Combobox**: Label-Click → 3-stufen-Kaskade (Trigger-Focus synchron + Popover öffnet via dispatched click + Search-Focus async)
  - **Popover**: Trigger-Click → open, `hidePopover()` → close
  - **Alert**: `data-dismiss`-Click → Element aus DOM entfernt
  - **Slider**: Input-Event → `<output>` text synchronisiert + `--range-fill-pct` Custom-Property aktualisiert
  - **File-Upload**: Drag-Counter durch nested dragenter/dragleave robust
  - **Tree**: Summary-Click toggelt `[open]`-Attribut
- **`npm run check:journeys`** + Integration in `check:full` als 7. Pipeline-Schritt.

### Diagnostik-Erkenntnisse (während Implementation)

- **Puppeteer-Headless behandelt `page.click()` teils nicht als "trusted"** für native browser-Mechaniken (label-for, popovertarget). Lösung: `element.click()` via `page.evaluate()` triggert nativ korrekt. Im Code-Comment dokumentiert.
- **Async-Round-Trips zwischen Node und Browser-Context** können synchron gesetzte `document.activeElement` verlieren. Lösung: Aktion + Assertion in einem einzigen `page.evaluate()`-Block bündeln.
- **Combobox-Label-Click ist eine 3-stufen-Kaskade** (Trigger-Focus → Popover-Open → Search-Focus). Vorher implizit, jetzt explizit getestet.

### Schwäche #5 (Pipeline-Konsolidierung) — bewusst verschoben

3 puppeteer-Skripte zu einer Chrome-Instanz konsolidieren würde ~5-10 s sparen, kostet Refactor von 3 Skripten zu Modulen + Risiko von Cross-Test-Leakage. Bei aktueller Pipeline-Zeit (~32 s) ist das proaktiv, nicht akut. Wird natürlich in v0.6.6 mit Playwright-Migration kommen (Playwright hat One-Browser-Many-Tests-Pattern eingebaut).

### Pipeline-Stand

- `check:full` (7 Schritte): Lint(4) → Test-Lint(18) → Static-Contrast(1008) → Browser-Contrast(180) → A11Y(0) → Visual(12) → Journeys(6)
- `check:tools` (2 Self-Tests): VRT-Sensitivität + A11Y-Mutations

### Schwächen-Hardening-Status

- #1 (Tests ohne Beweise): ✓ v0.6.4
- #2 (empirische Thresholds): ✓ v0.6.4
- #3 (Cross-Host-Determinismus): → v0.6.6 (Playwright bundled Chromium)
- #4 (Tool-Vertrauen): ✓ v0.6.5
- #5 (Pipeline linear): → v0.6.6 (natural mit Playwright-Migration)

---

## [0.6.4] — Tools-Self-Test-Pattern (adressiert Schwächen #1 + #2)

Erste Etappe nach der ehrlichen Schwächen-Analyse v0.6.3. Pattern-Etablierung:
jeder Check-Skript beweist seine eigene Erkennungsfähigkeit. **Mutation
Testing für CSS-Systeme** — bisher als JS-Disziplin etabliert (Stryker),
wir adoptieren das Pattern für unsere Welt.

### Hinzugefügt

- **`check-visual.js --self-test`** mit Sensitivitäts-Suite (3 Mutations):
  - trust `--btn-radius 8 → 24`: erwartet 1000–50000 px Diff
  - premium `--space-section 96 → 32`: erwartet dimension-mismatch
  - modern `--btn-radius 4 → 24`: erwartet 1000–50000 px Diff
  - Mutationen werden via Subprocess-Call gegen Baselines geprüft, Range-Drift wird automatisch erkannt.
- **`check-a11y.js --self-test`** mit DOM-Mutation-Suite (3 Mutations):
  - `<button>` ohne accessible name → erwartet `button-name` critical
  - `<img>` ohne alt → erwartet `image-alt` critical
  - `<input>` ohne label → erwartet `label` critical
  - Mutationen werden im Browser-Context injiziert (kein File-Roundtrip).
- **`npm run check:tools`** als Master-Runner für alle Self-Tests. Separate Disziplin von `check:full`: prüft die Tools, nicht das Repo.

### Behoben

- **Code-Smell in allen 6 Themes** (durch Self-Test aufgedeckt): `--section-py` wurde in jedem Theme redundant gesetzt, obwohl `semantic.css` `--section-py: var(--space-section)` bereits per Indirection definiert. Effekt: Konsumenten, die nur `--space-section` änderten, sahen keinen Effekt (Self-Test premium-mutation produzierte "pixel-identical" trotz extremer Layout-Änderung). 6 redundante Zeilen entfernt, Indirection trägt jetzt. VRT-Baselines bleiben identisch (visueller Output unverändert).

### Self-Test-Implementation-Details

- **Parser-Robustheit:** Self-Test fängt sowohl `[fail] X-Y N px diff` als auch `[fail] X-Y dimensions: ...`-Patterns. Dimension-Mismatch ist eine valide Catch-Form bei extremen Layout-Shifts.
- **Cleanup-Garantie:** alle Mutations laufen in `try/finally`, File- bzw. DOM-State wird restored auch bei Errors.
- **Range-Validation:** Pixel-Counts müssen in `[minPixels, maxPixels]` liegen. Drift in beide Richtungen (zu wenig = schwacher Threshold; zu viel = unerwartete Sensitivität) wird sichtbar.

### Wirkung

- **Schwäche #1** (Tests ohne Beweise): jeder Check muss `--self-test` bestehen, bevor wir ihm vertrauen.
- **Schwäche #2** (empirische Thresholds): MAX_DIFF_PIXELS = 500 ist jetzt mit 3 Mutations kalibriert. Wenn das Threshold zu hoch wird (echte Bugs gehen durch), schreit der Self-Test.

### Pipeline-Stand

- `check:full` (6 Schritte): verifiziert das Repo
- `check:tools` (2 Self-Tests): verifiziert die Tools — neu

Geplante Reihenfolge der weiteren Schwächen-Hardening:
- v0.6.5: User-Journey-Tests (Schwäche #4) + Puppeteer-Konsolidierung (Schwäche #5)
- v0.6.6: Playwright + Cross-Browser (Schwäche #3 — Cross-Host-Determinismus via bundled Chromium)

---

## [0.6.3] — Visual-Regression-Testing (pixelmatch + Puppeteer)

Sechster Pipeline-Schritt: das visuelle Render wird jetzt deterministisch
gegen Baselines geprüft. Schließt die letzte Test-Lücke — Lint deckt
Source-Patterns, Contrast deckt numerische Cascade, A11Y deckt ARIA-
Verträge; VRT deckt **"sieht's gerendert noch aus wie erwartet?"**.

### Hinzugefügt

- **`scripts/check-visual.js`**: Puppeteer fährt 12 Tone × Mode-Kombinationen ab, macht full-page-Screenshots, vergleicht mit Baselines via `pixelmatch` (Anti-Aliasing-Toleranz pro Pixel: 0.1, max absolute Pixel-Diff: 500).
- **`tests/visual/<tone>-<mode>.png`** als Baselines (12 PNGs, total ~4.3 MB).
- **`tests/visual/_diff/`** (gitignored) für Fail-Cases — schreibt Diff-Image + Actual-Image, damit lokale Inspection möglich.
- **`npm run check:visual`** + **`check:visual:update`** + Integration in `check:full` als 6. Schritt.

### Determinismus-Fixes (entdeckt + behoben während Entwicklung)

- **Animation-Stop**: `prefers-reduced-motion: reduce` reichte NICHT — Spinner-CSS verlangsamt darunter nur (2.5s/Umdrehung statt 700ms). Headless Chromium tickt animation-frames non-deterministisch → erster Run failt mit 0.7% Diff in einem Theme, andere identisch. **Lösung:** vor jedem Screenshot injizierter Style-Tag setzt `animation-duration: 0.001ms !important` global → End-State sofort gerendert. Plus 2× `requestAnimationFrame()`-Wait für letzten Layout-Tick.
- **`localStorage.clear()` Reihenfolge**: lief vor `page.goto()` → SecurityError ("Access is denied for this document"). Reihenfolge umgekehrt.
- **Threshold-Kalibrierung**: erste Implementierung mit `MAX_DIFF_RATIO = 0.005` (0.5%) ließ einen 16px-Radius-Change in trust-Theme (= 2502 px Diff = 0.010%) durch. Negative-Test fing das, Threshold auf absolute `MAX_DIFF_PIXELS = 500` umgestellt — fängt jetzt realistische CSS-Token-Änderungen.
- **Stale-`_diff/`-Cleanup**: Diff-Files aus früheren Fail-Runs blieben liegen → Confusion mit veralteten Spuren. Beim Start des Skripts wird `_diff/` geleert.

### Validierung

- **Deterministisch:** zwei aufeinanderfolgende Runs → 12/12 pixel-identical ✓
- **Negative-Test (verifiziert):** trust `--btn-radius: 8 → 24` injiziert → trust-light + trust-dark fail mit 2502/2528 px Diff, exit=1, Diff-Bilder geschrieben ✓
- **Pipeline 6-stufig grün:** Lint (4) → Test-Lint (18) → Static-Contrast (1008) → Browser-Contrast (180) → A11Y (0) → Visual (12) ✓

### Bewusste Grenzen (für spätere Etappen)

- **Nur full-page-Screenshots, default-state.** Interaktive States (Popover/Combobox/Modal open, Drag-State, Hover) bekommen ihre eigenen Snapshots in v0.9 mit per-Component-Showcase.
- **Nur Chromium.** Cross-Browser (Firefox + Webkit) folgt in v0.6.5.
- **Demo als single Render-Quelle.** Pro-Component-Isolation kommt mit der Showcase-Site in v0.9.

---

## [0.6.2] — Self-Review-Pass: 2 echte Bugs in v0.6.0+v0.6.1 gefixt

Vor dem nächsten Roadmap-Schritt (Visual-Regression) eine systematische
Selbst-Review der frischen Quality-Gates. 4 Findings, 2 davon echte
Bugs mit Puppeteer-Proben verifiziert.

### Behoben

- **Bug 1 (Logic-Error):** `check-a11y.js --strict`-Mode war effektiv ein No-Op. `HARD_FAIL`-Set wurde nicht erweitert; `SOFT_WARN` wurde leer; moderate/minor-Violations fielen in den `[info]`-Bucket ohne Exit-Code-Effekt. **Fix:** `HARD_FAIL` enthält in STRICT-Mode alle 4 Severities.
- **Bug 2 (UX-Regress):** Combobox-Demo-Label hatte nach v0.6.1 zwar `id=` aber kein `for=` — Click auf den sichtbaren Label-Text fokussierte das Trigger-Button nicht (axe-Lint hat das nicht gemeldet, weil aria-labelledby den ARIA-Vertrag erfüllt). **Fix:** `<label for="cb-X-trigger">` + `<button id="cb-X-trigger">` + bestehendes `aria-labelledby`. Click-on-Label aktiviert jetzt das Trigger (Native Label-for-labelable-Element-Mechanik). Component-Header in combobox.css analog aktualisiert.

### Hinzugefügt

- **5 Integration-Tests in `test-lint.js`** (jetzt 18/18 statt 13/13). Spawnen `lint-themes.js` als Subprozess, prüfen Exit-Codes + stdout/stderr-Inhalte über tmp-Fixture-Themes. Schließt die Lücke, dass `test-lint.js` bisher nur PostCSS-Patterns isoliert testete, nicht das tatsächliche Programm. Coverage:
  - Good theme → exit 0
  - Forbidden `--container-max` → exit 1 mit Line-Number in stderr
  - Forbidden `:root` selector → exit 1
  - Destructive token default → exit 0 mit `[warn]` tag
  - Destructive token + `--strict` → exit 1
- **axe-`incomplete`-Results** im `--verbose`-Mode sichtbar (vorher komplett unterdrückt). Counter immer angezeigt, Details opt-in. Keine Exit-Code-Änderung — incomplete sind explizit "manual review", keine Violations.

### Bewertet aber nicht gefixt (False Concerns)

- **Parse-Error-Behandlung in lint-themes.js**: PostCSS toleriert auch krude Inputs wie `} } @@@ }` ohne Crash. Robustheits-Bedenken bestätigte sich nicht.

---

## [0.6.1] — Quality-Gates Etappe 1: axe-core A11Y-Lint

### Hinzugefügt

- **`scripts/check-a11y.js`**: lädt die Demo in headless Chromium, injiziert axe-core (lokales File, kein CDN), durchläuft die Page mit programmatisch geöffneten Popovers/Comboboxes, aggregiert Violations nach Severity (critical/serious → hard-fail, moderate/minor → soft-warn).
- **`npm run check:a11y`** + **`check:a11y:strict`** + Integration in **`npm run check:full`** als fünfter Pipeline-Schritt (Lint → Test-Lint → Static-Contrast → Browser-Contrast → A11Y-Lint).
- **Konfiguration:** axe filtert auf `wcag2a/aa, wcag21a/aa, wcag22aa`-Tags; Color-Contrast bleibt sekundärer Cross-Check (unsere check-contrast.js mit 1008 Cascade-simulierten Paaren ist die primäre Wahrheit für Farbe).
- **Popover-Aware:** Native Popover-API-Elemente werden via `showPopover()` aufgeklappt, bevor axe läuft — sonst sind Combobox-Listboxen und Popover-Menüs für den A11Y-Audit unsichtbar.

### Behoben

- **Combobox-Trigger ohne accessible name** (critical-Violation, beide Demo-Instanzen). WAI-ARIA-Combobox-1.2-Spec fordert `aria-labelledby` oder `aria-label` auf Trigger-Elementen mit `role="combobox"` — sichtbarer Span-Content im Button reicht nicht, weil Combobox als komplexes Composite-Widget eine explizite Namens-Verlinkung erwartet.
  - **Fix-Pattern** (in `combobox.css` Component-Header dokumentiert): `aria-labelledby="<label-id> <value-id>"` verkettet das Field-Label mit dem aktuellen Value-Span, sodass Screen-Reader "Service, combobox, Service wählen, collapsed" liest.
  - **Markup-Update** in beiden Demo-Comboboxes (Service-Picker, Stylist-Picker) plus Search-Input bekommt eigenes `aria-label` ("Services durchsuchen"), Listbox bekommt `aria-labelledby` auf das Field-Label.

### Validierung

- `npm run check:a11y`: **0 critical, 0 serious, 0 moderate, 0 minor** ✓
- Andere Pipeline-Schritte bleiben grün (1008 + 180 Contrast-Pairs, 13/13 Lint-Tests).

### Bug-Caught-Value

Der A11Y-Audit fand einen Bug, der durch das eigene "WAI-ARIA-Combobox-Pattern 1.2 implementiert"-Selbstverständnis verdeckt war. Konkret: zwei kritische Buttons mit unvollständigem Accessibility-Tree → Screen-Reader hätten sie als "button, expanded false" statt "Service, combobox, Service wählen, collapsed" angekündigt. Konsumenten der Demo hätten den Fehler kopiert.

---

## [0.6.0] — Quality-Gates Etappe 1: PostCSS-AST-Lint + Unit-Tests

Erster Schritt Richtung A+. Code-Qualität-Sprung: Hand-Parsing des
existing Lint-Skripts auf PostCSS-AST migriert, plus eine Unit-Test-
Suite, die die Lint-Logik gegen Edge-Cases absichert.

### Geändert

- **`scripts/lint-themes.js`** vollständig auf PostCSS-AST umgebaut. Externes Verhalten 1:1 (gleiche Output-Form, gleiche Exit-Codes, gleiche Findings). Intern:
  - `walkRules()`-Hand-Parser → `postcss.parse().walkRules()`
  - `stripComments()`-Regex → PostCSS-AST ignoriert Comments nativ
  - `extractDeclaredTokens()`-Split-by-`;` → `rule.walkDecls(/^--/, ...)`
  - **Bonus:** Source-Line-Reporting pro Finding (`(line 41)` statt nur Token-Name) — präzise Lokalisierung für Konsumenten.
- **Robust gegen Edge-Cases**, die das Hand-Parsing fragil machten:
  - Verschachtelte `@media` / `@supports` / `@container` / `@layer`
  - `:not()` / `:is()` / `:where()` in Selektoren
  - Werte mit `{}`-Chars (z.B. `--grid-template: "a b" "c d"`)
  - Comments an beliebigen Stellen, inkl. innerhalb Selektor-Listen
  - Strings mit `"`/`'`-Chars

### Hinzugefügt

- **`scripts/test-lint.js`** als Unit-Test-Suite (Node-native, keine Dependency). **13 Tests** decken:
  - Token-Extraction über verschachtelte at-Rules (3 Tests)
  - Selector-Contract über Comma-Listen + nested @media (5 Tests)
  - Nested-Mode-Coverage inkl. `:not()`-Edge-Case (3 Tests — fängt den `:root:not([data-mode="light"]):not([data-mode="dark"])`-Auto-Block-Fall ab, der einen falschen "missing descendant"-Alarm hätte auslösen können)
  - Brace-Edge-Cases in Property-Values (2 Tests)
- **`npm run test:lint`**-Script registriert.
- **`npm run check` und `check:full`** rufen jetzt auch test:lint auf → CI-Gate.

### Architektur-Begründung

Hand-Parsing per balanced-brace + Regex hat in v0.x funktioniert, aber jeder neue Check (z.B. forced-colors-coverage in v0.8 geplant) hätte das Parsing weiter überfrachtet. PostCSS-AST gibt der Lint-Engine eine echte Programmierschnittstelle (`rule.parent`, `rule.source.start.line`, walkers für jeden Node-Typ) — neue Checks sind jetzt 5-10 Zeilen statt 50+.

### Validierung

- `npm run lint` mit existing themes: 18 dokumentierte destruktive warnings, 0 fails ✓
- Active-Negative-Test: trust.css mit injiziertem `--container-max: 90ch` → `exit=1, line 41 lokalisiert` ✓
- `npm run test:lint`: 13/13 grün ✓
- `npm run check:contrast`: 1008/1008 ✓
- `npm run check:contrast:browser`: 180/180 ✓

---

## [0.5.9] — Shared Chevron-Utility (Konsolidierung)

Three-Chevron-Refactor aus dem Code-Review angegangen. Tree und Combobox
ziehen jetzt aus einer gemeinsamen `.chevron`-Utility statt jeweils
eigenen Triangle-Border-Trick zu pflegen.

### Hinzugefügt

- **`components/chevron.css`** als zusammensetzbare CSS-only Utility. Border-Trick (kein SVG-Mask, kein Image), `currentColor`-aware, configurable über `--chevron-size`, `--chevron-thickness`, `--chevron-color`.
- **`.chevron`-Default** = pointing-down (▼) für Dropdowns / Disclosure-Down.
- **`.chevron--right`** = pointing-right (▸) für Tree / Accordion-Expand.
- **`prefers-reduced-motion: reduce`** killt die Rotation-Transition.

### Geändert

- **Tree:** `tree__chevron` → `chevron chevron--right` (Markup + CSS). Rotation-Rule (`90°` auf `[open]`) zieht jetzt direkt auf `.chevron`. `--tree-chevron-color`-Token entfernt; Tinting via `.tree__summary > .chevron { --chevron-color: var(--color-text-tertiary); }`.
- **Combobox:** `combobox__chevron` → `chevron` (Markup + CSS). Rotation-Rule (`180°` auf `[aria-expanded="true"]`) zieht jetzt direkt auf `.chevron`. Tinting analog via `--chevron-color`-Override.
- **9 Chevron-Instances in der Demo** auf die neue Class umgestellt (Tree + Combobox + nested Folder-Hierarchie).

### Bewusst belassen

- **Select** behält das Pseudo-Element-Pattern (`.select-wrap::after` mit SVG-mask). Begründung: markup-light API — Konsumenten brauchen kein Extra-DOM-Element für den Arrow. Im Component-Header dokumentiert.

### Validierung

- Smoke (puppeteer, mit `transition: none` injection um Headless-RAF-Quirk zu umgehen):
  - Tree open: `matrix(0, 1, -1, 0, 0, 0)` = exakt `rotate(90deg)` ✓
  - Combobox expanded: `matrix(-1, 0, 0, -1, 0, 0)` = exakt `rotate(180deg)` ✓
- Lint + Static-Contrast (1008/1008) + Browser-Contrast (180/180) WCAG-AA grün.

### Headless-Test-Note

Puppeteer-Headless tickt Animation-Frames nicht selbstständig — Transitions bleiben mid-flight stehen, `getComputedStyle().transform` zeigt fälschlich Identity-Matrix. Die `transition: none`-Injection im Probe-Skript spiegelt den finalen Render-State. Im echten Browser keine Rolle.

---

## [0.5.8] — Combobox (Custom-Listbox mit Search)

### Hinzugefügt

- **`.combobox`-Component** als Custom Single-Select für Use-Cases, die Native `<select>` nicht abdeckt: Search-Filter über viele Optionen, Custom-Content-Options (Label + Hint), volle visuelle Kontrolle. Wo Native ausreicht → `.select` (v0.4.7) bleibt die erste Wahl.
- **Nutzt Native Popover API** (v0.4.6) für das Listbox-Panel — Top-Layer-Render, Light-Dismiss, kein z-index-Wrangling.
- **WAI-ARIA-Combobox-Pattern 1.2:** `role="combobox"` + `aria-expanded`/`-controls`/`-haspopup` auf Trigger, `role="listbox"` mit `aria-label` auf Panel, `role="option"` + `aria-selected` auf Items.
- **Sub-Elemente:** `.combobox__trigger` (sieht aus wie `.select`), `.combobox__value`, `.combobox__chevron` (rotiert via `[aria-expanded]`), `.combobox__panel`, `.combobox__search`, `.combobox__search-input`, `.combobox__listbox`, `.combobox__option`, `.combobox__option-label`, `.combobox__option-hint`.
- **JS-Snippet (~50 Zeilen) im Component-Header dokumentiert:** Keyboard-Navigation (ArrowUp/Down/Enter/Esc), Selection-Logik mit `aria-selected`-Toggle, Search-Filter über `data-search`-Stichworte, Panel-Anchoring an Trigger via `beforetoggle`-Listener. Demo-JS implementiert das Snippet 1:1.
- **Density-aware** durch Trigger-Padding-Fallback auf `--density-control-{py,px}` — Combobox-Höhe matched Button/Input/Select.
- **Demo-Section "Combobox"** mit zwei Patterns: Service-Picker (7 Optionen mit Hint + Search via `data-search`-Stichworten), Stylist-Picker (4 Optionen ohne Search bei kurzer Liste).

### Validierung

- Smoke (puppeteer):
  - Initial: "Färben & Strähnen" vorausgewählt, ARIA-Expanded=false ✓
  - Filter "haar": ARIA-Expanded=true, 2 sichtbare Optionen ("Damen-Haarschnitt", "Herren-Haarschnitt"), Rest hidden ✓
  - Click auf Bart-Trim: Trigger-Label aktualisiert, Panel schließt, ARIA-Selected wechselt ✓
- Lint, Static-Contrast (1008/1008), Browser-Contrast (180/180) WCAG-AA grün.

---

## [0.5.7] — Date / Time Inputs

### Hinzugefügt

- **`components/date-input.css`** als styled-Native-Erweiterung für `<input type="date|time|datetime-local|month|week">`. Padding und Border kommen vom generischen Input-Styling in `base/reset.css` (automatisch density-aware) — diese Datei justiert nur den webkit-Picker-Indicator und liefert das `.date-range`-Wrapper-Pattern.
- **Mode-aware Picker-Indicator** via `filter: invert(1)` im Dark-Mode. Beide Blöcke (manuell + auto-dark) symmetrisch — keine Mode-Lücke.
- **`.date-range`-Wrapper** für From-To-Patterns: zwei native inputs nebeneinander mit `__separator` (default em-dash). Inputs behalten Native-Picker individuell.
- **Demo-Section "Date / Time"** mit vier Patterns: Date, Time, Month, Date-Range.

### Architektur

- Bewusst **kein** Custom-Calendar-Component. Native `<input type="date">` deckt 95% der Use-Cases mit perfekter Mobile- und A11Y-Integration. Custom-Calendar (mit Inline-Popover, Disabled-Dates, Range-Selection-Visual) bleibt v0.6 als Combobox-ähnliches Pattern auf Popover-Basis.

### Validierung

- Lint, Static-Contrast (1008/1008), Browser-Contrast (180/180) WCAG-AA grün.

---

## [0.5.6] — Chart-Container + kategorische Palette

Datenvisualisierung in den DS-Stack aufgenommen. Library-agnostischer
Container plus eine Color-Blind-Safe Palette als Foundation-Token-Set.

### Hinzugefügt

- **Okabe-Ito-Palette** in `semantic.css`: `--chart-1` bis `--chart-8`. Color-Blind-Safe (Cell Press / academic gold standard für Deuteranopie, Protanopie, Tritanopie). Tone-agnostisch — gleich in allen 6 Themes, weil Daten-Farben Konsistenz brauchen.
- **Mode-aware Palette-Overrides** in `dark.css` (manuell + auto-Block beide ergänzt): hellere + leicht ent-sättigte Varianten der 8 Slots. Identitäts-Reihenfolge (orange → sky-blue → green → …) bleibt erhalten — Konsumenten-Code muss nichts umstellen beim Mode-Switch.
- **Semantic-Aliases:** `--chart-positive` / `--chart-negative` / `--chart-neutral` ziehen aus den Status-Bordern (v0.3.1) — Trend-Färbung bleibt konsistent zu Callout/Banner/Alert.
- **`.chart`-Container-Component** als Library-agnostischer Frame mit `__header` (Title + Subtitle + Trend), `__body` (für SVG/Canvas/Library-Output), `__legend` (mit `__swatch`-Sub-Element), `__source`-Slots.
- **Trend-Modifier:** `.chart__trend--positive` / `--negative` / `--neutral` mit color-mixed bg + fg aus den semantic-Aliases — mode-aware durch Vererbung.
- **Demo-Section "Chart-Container"** mit drei realistischen Charts:
  - Bar (Umsatz Q1, `--chart-1`, positive Trend-Chip)
  - Line (Buchungen vs No-Shows, `--chart-3` + `--chart-6`, negative Trend-Chip)
  - Palette-Übersicht (alle 8 Kategorien als Swatch-Reihe)

### Architektur

- **Library-agnostisch:** DS liefert Container + Palette, kein Chart-Engine. Konsument bringt SVG inline, Canvas, Chart.js, D3, Recharts oder Observable Plot mit — alle nutzen `var(--chart-N)` für Kategorien.
- **`.chart__body > svg`** wird automatisch `width: 100%; height: auto; display: block;` — responsive ohne dass Konsument das einzeln setzen muss.

### Validierung

- Smoke (puppeteer):
  - Light: Okabe-Ito exakt (8 Hex-Werte korrekt)
  - Dark: alle 8 Slots wechseln zu helleren Varianten
  - Trend-Chips ziehen `--chart-positive`/`--chart-negative` korrekt
- DTCG-Export: 263 Tokens (vorher 252) — `chart.1..8` plus `chart.positive/-negative/-neutral` sauber als nested tree.
- Lint, Static-Contrast (1008/1008), Browser-Contrast (180/180) WCAG-AA grün.

---

## [0.5.5] — Goldener Schnitt im Layout

Foundation-Erweiterung: φ als harmonische Konstante für Editorial-Splits
und Aspect-Ratios — ergänzt den 4px-Grid (UI-Controls), ersetzt ihn nicht.

### Hinzugefügt

- **Token `--phi: 1.618`** in `tokens.css` mit `--phi-short: 38.2%` und `--phi-long: 61.8%` als abgeleitete Prozent-Werte.
- **`.split`-Layout-Primitive** in `base/layout.css`: zwei-Spalten-Grid, default 1:1, Verhältnis via `--split-ratio`-Custom-Property überschreibbar ohne neue Klasse.
- **`.split--golden` / `.split--golden-reverse`** Modifier für 1 : φ und φ : 1.
- **`.aspect-golden`** Utility für `φ : 1` Landscape, `.aspect-golden--portrait` für `1 : φ`.
- **Responsive Collapse** bei <768px: `.split` wird single-column wie `.grid-*`.
- **Demo-Section "Goldener Schnitt"** mit Editorial-Split (Sidebar-Note 1 : Body φ) und drei Aspect-Cards (landscape / portrait / square zum Vergleich).

### Architektur-Entscheidung

- **φ ist eine optionale Layout-Achse, kein Default für UI-Controls.** Buttons / Inputs / Density bleiben auf der 4px-Grid-Skala. φ wirkt nur dort, wo Konsumenten explizit `.split--golden` oder `.aspect-golden` setzen — niemand bekommt φ-Proportionen "automatisch" aufgepfropft.

### Validierung

- Smoke (puppeteer): mathematisch präzise
  - Split-Verhältnis: 431px / 697px = **1.618 exakt** ✓
  - Landscape: 956 / 591 = 1.618 ✓
  - Portrait: 591 / 365 = 1.618 ✓
- DTCG-Export: `phi`-Token, 252 Tokens total (vorher 249).
- Lint, Static-Contrast (1008/1008), Browser-Contrast (180/180) WCAG-AA grün.

---

## [0.5.4] — Advanced Components (Schritt 5: Tree)

### Hinzugefügt

- **`.tree`-Component** als hierarchische Liste mit Expand/Collapse via native `<details>`/`<summary>`. Disclosure-Semantik, Keyboard (Enter/Space) und A11Y-Verlinkung kommen vom Browser — **kein JS nötig**.
- **Token-Contract:** `--tree-indent` (default `--space-16`), `--tree-item-py/-px`, `--tree-hover-bg`, `--tree-chevron-color`.
- **Sub-Elemente:** `.tree__node` (auf `<details>`), `.tree__summary` (clickable header), `.tree__chevron` (rotiert via `[open]`), `.tree__label`, `.tree__leaf` (für blattlose Items mit aligned indent).
- **`aria-current="true"`** auf `.tree__leaf` für active-state (zieht aus `--color-interactive-light/-dark`).
- **CSS-only Chevron** via Triangle-Border-Trick (kein SVG, currentColor-aware).
- **Demo-Section "Tree"** mit zwei Patterns: Folder-Struktur (3 Ebenen tief, mit Badges + aria-current) und Settings-Navigation.

### Architektur-Hinweis

- Bewusst Disclosure-Pattern statt vollständigem WAI-ARIA Tree-Pattern (mit Arrow-Key-Navigation und `role="tree"`). Disclosure ist robuster, einfacher und für 90% der Use-Cases ausreichend. Wer echte Tree-Keyboard-Navigation braucht, bringt eigene JS-Implementation mit — im Component-Header explizit dokumentiert.

### Validierung

- Lint, Static-Contrast (1008/1008), Browser-Contrast (180/180) WCAG-AA grün.

---

## [0.5.3] — Advanced Components (Schritt 4: Timeline)

### Hinzugefügt

- **`.timeline`-Component** als vertikale Aktivitäts-Liste (Booking-History, Activity-Feed, Audit-Log, Order-Tracking). Pures CSS, kein JS.
- **Token-Contract:** `--timeline-marker-size/-gap/-offset`, `--timeline-line-color/-width`, `--timeline-item-spacing`.
- **Sub-Elemente:** `.timeline__item` (Grid mit Marker-Spalte + Body), `.timeline__marker` (Bullet), `.timeline__body` (Container für `.timeline__time`, `.timeline__title`, beliebigen `<p>`-Inhalt).
- **Linie via pseudo-element pro Item** (`::before`) — läuft vom Marker-Top bis Item-Bottom, kontinuierlich da row-gap=0; Marker überdeckt die Schnittpunkte via eigenen Background. Letztes Item bekommt kein `::before` → saubere Linien-Terminierung.
- **4 Marker-Variants** ziehen aus dem `--status-*`-Token-Set (v0.3.1): `--success`, `--warning`, `--danger`, plus `--current` (mit Focus-Ring-Glow für aktiven Schritt).
- **Demo-Section "Timeline"** mit zwei realistischen Patterns: Booking-Verlauf (success → success → current → default) und System-Events (success/warning/danger).

### Validierung

- Smoke (puppeteer):
  - 4 Items rendern, letztes hat kein `::before` ✓
  - Marker-Variants korrekt gefärbt (success rgb(22,163,74), default hollow) ✓
  - Marker-Title-Alignment nachjustiert (`--timeline-marker-offset: 0.2rem` für Time+Title-Pattern, override auf `0.4rem` wenn nur Title) ✓
- Lint + Static-Contrast (1008/1008) + Browser-Contrast (180/180) WCAG-AA grün.

---

## [0.5.2] — Advanced Components (Schritt 3: File-Upload)

### Hinzugefügt

- **`.file-upload`-Component** als styled `<label>` mit verstecktem nativen `<input type="file">`. Click + Keyboard funktionieren **ohne JS** (Native Label-for-Input-Mechanik), Drag &amp; Drop + Selected-File-Anzeige aus dem JS-Snippet im Header.
- **Token-Contract:** `--file-upload-bg/-border/-radius/-padding/-hover-bg/-active-border`.
- **Sub-Elemente:** `.file-upload__input` (sr-only, focus-zugänglich), `.file-upload__icon`, `.file-upload__text`, `.file-upload__hint`.
- **`.file-upload--compact`-Variante** für inline Form-Anhänge (horizontal layout, kleineres Icon).
- **`:focus-within`-Pattern** bringt den Outline-Ring auf das visuelle Label statt den versteckten Input — sauberere A11Y-UX.
- **`data-dragging`-Attribut** schaltet den Drag-Hover-Visual; JS setzt/entfernt per `dragenter`/`dragleave`/`drop`-Event.
- **JS-Snippet (24 Zeilen) im Component-Header dokumentiert:** Drag-State + Drop-Übernahme (`input.files = dataTransfer.files`) + Selected-File-Text-Anzeige. Demo-JS implementiert das Snippet.

### Validierung

- Smoke (puppeteer):
  - Hero: dashed border, column-Layout, Input visually-hidden aber Focus-zugänglich ✓
  - Compact: row-Layout ✓
  - `dragenter` → `data-dragging="true"`, border-color wechselt ✓
  - `dragleave` → Attribut entfernt ✓
  - File-Selektion → Text "✓ logo.png" ✓
- Lint, Static-Contrast (1008/1008), Browser-Contrast (180/180) WCAG-AA grün.

---

## [0.5.1] — Advanced Components (Schritt 2: Slider)

### Hinzugefügt

- **`.slider`-Component** als Composition-Wrapper um die existing `.range`. Bringt Label, Value-Display via native `<output>` und optionale min/mid/max-Skala zusammen.
- **Sub-Elemente:** `.slider__header` (Label + Value nebeneinander), `.slider__label`, `.slider__value` (Mono-Font, tabular-nums, Interactive-Color), `.slider__scale` (Tertiary-Text-Marker).
- **`.range` um Track-Fill erweitert** — `linear-gradient(to right, fill X%, track X%)` mit Custom-Property `--range-fill-pct` (default 0% = solid track, backward-kompatibel). Über `-webkit-` und `-moz-`-Pseudos symmetrisch.
- **JS-Snippet im Component-Header dokumentiert** (12 Zeilen): updated Track-Fill-Property und synct `<output>` auf `input`-Event. Demo-JS implementiert das Snippet plus custom Formatter für Preis-Slider ("CHF X").
- **Demo-Section "Slider"** mit zwei Beispielen: Lautstärke (0–100) und Max-Preis (CHF 20–500, step 10).

### Validierung

- Smoke (puppeteer): Math korrekt
  - Volume 50 → fill 50%, output "50"
  - Price 120 → fill 20.83% (= (120−20)/(500−20)), output "CHF 120"
  - Nach Change auf 260 → fill 50%, output "CHF 260" ✓
- Lint + Static-Contrast (1008/1008) + Browser-Contrast (180/180) WCAG-AA grün.

---

## [0.5.0] — Advanced Components (Schritt 1: App-Shell)

Eröffnet v0.5 — die größeren Layout/Composition-Components. App-Shell ist
der natürliche Einstieg: hoher Hebel, kein JS, baut auf bestehenden
Components (Nav, Stat, Badge, Cluster) auf.

### Hinzugefügt

- **`.app-shell`-Layout-Primitive** als vollständiges Page-Grid für Dashboard- und App-Pages. CSS Grid mit Named Areas (`header / sidebar / main / footer`). Pures CSS, kein JS.
- **Token-Contract:** `--app-shell-sidebar-w` (default 16rem), `--app-shell-header-h` (default 3.5rem), `--app-shell-min-h` (default 100vh — für embedded Demo-Frames auf fixe rem überschreibbar).
- **Sub-Elemente:** `.app-shell__header` (sticky, backdrop-blur), `.app-shell__sidebar` (scrollable, eigener bg), `.app-shell__main` (Content-Region), `.app-shell__footer` (optional).
- **Modifier:**
  - `.app-shell--right-sidebar` — spiegelt Grid-Spalten + Border-Inline-Direction
  - `.app-shell--no-header` — Header-Row weg, Sidebar+Main füllen voll
  - Beide Modifier kombinierbar
- **Responsive Collapse** bei Viewport <768px: Sidebar stapelt sich über Main, Header bleibt sticky oben. Border-Inline-Direction wechselt zu Border-Block-End.

### Demo

- Embedded App-Shell als Mini-Frame (24rem Höhe) mit echter Nav, Stat-Grid und Header-Toolbar. Zeigt das Layout in Aktion ohne die Demo-Page-Struktur umzubauen.

### Validierung

- Smoke (puppeteer):
  - Desktop 1400px: sidebar 256px (= 16rem) links, header 56px (= 3.5rem), side-by-side mit main ✓
  - Mobile 600px: sidebar full-width gestapelt über main, header sticky ✓
- Lint + 1008 Static-Contrast + 180 Browser-Contrast WCAG-AA grün.

---

## [0.4.7] — Component-Lücken (Schritt 8 / final: Select)

Damit schließt v0.4 ab — alle 8 ursprünglich identifizierten Component-Lücken sind gefüllt.

### Hinzugefügt

- **`.select`-Component** als styled native `<select>`. Behält alle starken Native-Eigenschaften:
  - Form-Integration (FormData, POST-Submit, reset)
  - Native Keyboard (Type-ahead, Arrow-Keys, Enter, Esc)
  - Mobile-Picker (iOS scroll-wheel, Android list)
  - Screen-Reader-Support out of the box
- **`.select-wrap`-Wrapper** für mode-aware Custom-Arrow via `mask-image` + `background-color: var(--color-text-tertiary)`. Arrow wechselt automatisch im Dark-Mode (gray-500 hat ≥3:1 Kontrast auf beiden Surfaces — WCAG SC 1.4.11 für UI-Components erfüllt).
- **Token-Contract:** `--select-py/-px/-bg/-fg/-border/-radius/-arrow-color`. Padding defaultet auf `--density-control-{py,px}` → automatisch density-responsive.
- **Modifier:** `.select--multiple` (Listbox-Display mit native list-style, kein Arrow via `:has(> .select--multiple)`-Selector), `.select-wrap--inline` (auto-width statt 100%).

### Architektur-Entscheidung

- **Native-styled, kein Custom-Listbox in v0.4.** Native-Select deckt 80%+ der Use-Cases mit perfekter A11Y/Mobile-Integration. Custom-Listbox (Combobox mit Search, Custom-Content-Options, Multi-Select-Chips) bleibt **v0.5-Roadmap** — eigene Component-Architektur mit Popover-API-Basis und dokumentiertem ARIA-Keyboard-Handler-Pattern.

### Validierung

- Smoke (puppeteer): Density wirkt (Select-Heights 50/42/58 px = identisch zu Button-Heights, beide ziehen `--density-control-py`), Arrow rendert in beiden Modes mit `--color-text-tertiary`, `:has()`-Selektor blendet Arrow bei `.select--multiple` aus ✓
- Lint, Static-Contrast (1008/1008), Browser-Contrast (180/180) WCAG-AA grün.

### v0.4-Bilanz

8 neue Components / Patterns in 8 Schritten ergänzt:

| Schritt | Component | Schlüsselmerkmal |
|---|---|---|
| 0.4.0 | Switch | Native checkbox + role=switch, calc()-verkettete Track-Geometrie |
| 0.4.1 | Spinner | Border-Trick, currentColor inheritance, reduced-motion slowdown |
| 0.4.2 | Alert | Dismissible, zieht --status-*-Tokens, role-Differenzierung |
| 0.4.3 | Tag | Interactive Chip, AA-Trade-off im Header dokumentiert |
| 0.4.4 | Avatar-Stack | Composition via Custom-Property-Cascade |
| 0.4.5 | Stack & Cluster | Layout-Primitives mit konsistenter xs/sm/md/lg/xl-Skala |
| 0.4.6 | Popover | Native Popover API, JS-Anchoring per-Element |
| 0.4.7 | Select | Styled-Native, Mask-Image-Arrow, density-responsive |

---

## [0.4.6] — Component-Lücken (Schritt 7: Popover)

### Hinzugefügt

- **`.popover`-Component** auf Basis der **Native Popover API** (Baseline 2024+: Chrome 114+, Safari 17+, Firefox 125+). Light-Dismiss (Click-outside / Esc), Top-Layer-Render und automatische ARIA-Verlinkung kommen vom Browser — kein DS-Custom-Behavior nötig.
- **Token-Contract:** `--popover-bg/-fg/-border/-radius/-padding/-shadow/-min-width/-max-width/-offset`. Default shadow `--elevation-4` (mode-aware aus v0.3.3).
- **Sub-Elemente:** `.popover__menu` (Listen-Pattern mit `role="menu"`), `.popover__item` (mit `--danger`-Variante via `--status-danger-{bg,fg}`), `.popover__header`, `.popover__divider`.
- **Entry-Animation** (opacity + translateY) auf `:popover-open`, `prefers-reduced-motion: reduce` respektiert.
- **JS-Anchoring-Snippet** im Component-Header dokumentiert (8 Zeilen). Demo-JS implementiert das Snippet.
- **Demo-Section "Popover"** mit zwei Patterns: Action-Menu (4 Items + Separator + Danger-Action) und Info-Popover (Header + Body + Link).

### Architektur-Entscheidungen

- **CSS Anchor Positioning als Opt-in dokumentiert, nicht im Default.** Bei mehreren Popovers im DOM kollidieren shared `anchor-name`-Werte. JS-Positioning ist Multi-Popover-safe; Konsumenten mit Single-Popover-Pages können CSS-Anchor selbst aktivieren via inline-style.
- **`beforetoggle`-Listener müssen per-Element attached werden** (Event bubbelt nicht). Demo + Component-Header dokumentieren das korrekt.

### Validierung

- Smoke (puppeteer): beide Demo-Popovers ankern korrekt am eigenen Trigger (gap 4px, `leftMatch: true`), Esc-Dismiss schließt sauber ✓.

---

## [0.4.5] — Component-Lücken (Schritt 6: Layout-Primitives — Stack & Cluster)

### Hinzugefügt

- **`.cluster`** als horizontaler Layout-Container mit `flex-wrap`. Toolbars, Tag-Listen, gemischte Inline-Inhalte mit konsistentem Gap und natürlichem Umbruch bei schmaler Viewport. Lebt in `base/layout.css` als reines Layout-Primitive, kein Component.
- **5 Cluster-Größen** (`--xs/--sm/--md/--lg/--xl`) parallel zur Stack-Skala — konsistentes Gap-Vokabular über alle Layout-Achsen.
- **3 Cluster-Alignment-Modifier:** `--between` (space-between), `--end` (flex-end), `--center` (justify-content: center). Toolbars und Footer-Action-Bars haben damit ein 1-Wort-API.
- **`.stack--xs`** als feinste Größe (4px), füllt die Lücke unter `--sm`.
- **Custom-Property-Konfiguration** für ad-hoc Alignment ohne neue Klassen: `--stack-align`, `--cluster-align`, `--cluster-justify` lokal überschreibbar.

### Demo

- Neue Section "Layout-Primitives: Stack & Cluster" mit vier praxisnahen Patterns: vertikaler Action-Stack, Tag-Cluster mit Wrap, Toolbar mit `--between`, rechtsbündige Action-Bar mit `--end`.

### Validierung

- Cluster-Wrap unter 400px Viewport: 7 Tags → 2 Rows ✓ (Puppeteer-Smoke).

---

## [0.4.4] — Component-Lücken (Schritt 5: Avatar-Stack)

### Hinzugefügt

- **`.avatar-stack`-Component** als Layout-Wrapper auf der existierenden `.avatar`-Component. Keine neue Visual-Identity, nur Composition.
- **Token-Contract:** `--avatar-stack-overlap` (default −0.625rem), `--avatar-stack-ring` (default `--color-bg` → mode-aware), `--avatar-stack-ring-width` (default 2px). `--avatar-size` wird vom Stack-Container an alle Kinder vererbt.
- **Modifier:** `.avatar-stack--sm` / `--lg` (Größen-Presets, steuern via Custom-Property alle Kinder), `.avatar-stack--hoverable` (fan-out-Animation, `prefers-reduced-motion: reduce` respektiert).
- **`.avatar--more`-Variante** als Counter-Element (`+3`, `+12`) — nutzt `--color-bg-tertiary` + `--color-text-secondary` für mode-awareness. Keine separate Component.
- **Demo-Section "Avatar-Stack"** mit 3 Größen-Varianten + hoverable Fan-Out.

### Architektur

- **Composition statt Replikation:** Avatar-Stack erweitert `.avatar` via Wrapper + Custom-Property-Cascade. Größen-Modifier auf dem Stack setzen `--avatar-size` für alle Kinder. Counter ist ein Token-Override-Modifier, keine separate Component.

---

## [0.4.3] — Component-Lücken (Schritt 4: Tag / Chip)

### Hinzugefügt

- **`.tag`-Component** als interactive Chip. Semantische Differenzierung zu Badge:
  - Badge: read-only Status-Label, klein (font-xs), pill (radius-full)
  - **Tag: interactive Chip (font-sm, radius-md), optional removable/clickable**
- **Token-Contract:** `--tag-bg/-fg/-border/-hover-bg`, `--tag-px/-py/-radius/-size`.
- **Modifier:** `.tag--solid` (filled accent), `.tag--outline` (transparent + border), `.tag--clickable` (hover + focus-visible), `.tag--sm` (kleiner).
- **Sub-Element `.tag__remove`** mit Touch-Affordance (1rem×1rem, opacity-fade-in on hover, currentColor inheritance, focus-visible).
- **Dismiss-Pattern** im Component-Header dokumentiert, JS-Snippet im Demo eingebaut (analog zu Alert / Toast).
- **Demo-Section "Tags"** zeigt 4 statische Varianten, 3 clickable Filter, 3 removable Multi-Select-Chips.

### A11Y

- **Klare WCAG-Notiz im Component-Header** zu `--tag--solid`: Default ~3:1 Kontrast (X-600 + white) folgt Button-Pattern. UI-Component-Norm (SC 1.4.11) erfüllt, strict-AA für normal text (SC 1.4.3) borderline. Override-Pfad dokumentiert (X-700/800-Variante setzen).
- Remove-Button hat eigenen Touch-Target, eigenes focus-visible-Ring, ARIA-Label verpflichtend.

---

## [0.4.2] — Component-Lücken (Schritt 3: Inline-Alert)

### Hinzugefügt

- **`.alert`-Component** als dismissible Status-Feedback im Content-Flow. Schwester von Callout, aber:
  - Callout: editorial, eyebrow-Title (uppercase, font-xs), kein Close
  - Banner: Page-Top, persistent, full-width
  - Toast: floating (position:fixed), auto-dismiss
  - **Alert: inline, dismissible, paragraph-Title, Close-Button als Erstklasse-Element**
- **Token-Contract:** `--alert-bg/-fg/-stripe/-accent`, `--alert-py/-px/-radius`. Ziehen Variants aus `--status-{info,success,warning,danger}-{bg,fg,border}` (v0.3.1).
- **Sub-Elemente:** `.alert__icon`, `.alert__title`, `.alert__body`, `.alert__close`.
- **ARIA-Pattern dokumentiert:** `role="status"` (info/success, polite) vs. `role="alert"` (warning/danger, assertive). Konsument wählt je nach Dringlichkeit.
- **JS-Dismiss-Snippet** in Component-Header dokumentiert (analog zu `.toast__close`-Pattern). Demo nutzt es.
- **Browser-Contrast-Check** erweitert um 4 Alert-Title-Pairs × 6 Tones × 2 Modes = **180 Paare** (vorher 132). Alle WCAG-AA.

### Demo

- Neue Section "Inline-Alerts" mit allen vier Variants, vollständigem Markup-Beispiel inkl. Icon-Slot + Close-Button. Dismiss funktioniert (verifiziert via Puppeteer-Smoke).

---

## [0.4.1] — Component-Lücken (Schritt 2: Spinner)

### Hinzugefügt

- **`.spinner`-Component** als CSS-only Loading-Indicator. Border-Trick (`border-top-color` als Arc, restliche Borders als Track), `animation: spinner-rotate` linear infinite.
- **Token-Contract:** `--spinner-size`, `--spinner-stroke`, `--spinner-color`, `--spinner-track-color`, `--spinner-duration`.
- **`currentColor` als Default** für `--spinner-color`: Spinner inline in einem Button erbt automatisch die Button-Textfarbe — weiß in primary, gray-900 in secondary, interactive in ghost. Verifiziert via Smoke-Test.
- **Track-Color als `color-mix(... 20% ... transparent)`** des Arc — bleibt automatisch konsistent, egal wie der Konsument die Farbe setzt.
- **Modifier:** `.spinner--sm` (14px) und `.spinner--lg` (32px); Default 20px.
- **`.spinner-block`-Wrapper** für centered Loading-States (Card, Section).
- **Demo-Section "Spinner / Loading-States"** mit drei Use-Cases: standalone-Größen, inline in 3 Button-Varianten, block-centered.

### A11Y

- **Reduced-Motion:** Spinner stoppt nicht (Loading-Affordance würde verschwinden), sondern verlangsamt von 700 ms auf 2500 ms. Keine flackernde Rotation, Status bleibt sichtbar.
- **ARIA:** Konsumenten setzen `role="status" aria-label="…"` für standalone; `aria-hidden="true"` für inline-in-Button (Button-Label trägt die Semantik).

---

## [0.4.0] — Component-Lücken (Schritt 1: Switch)

Erster v0.4-Component: Switch / Toggle als binary on/off-Control.

### Hinzugefügt

- **`.switch`-Component** in `components/switch.css`. Native `<input type="checkbox">` + `role="switch"` für ARIA-Konformität, Keyboard, Form-Submission und Screen-Reader-Garantien — visueller Rebuild via `appearance:none`. Gleicher Pfad wie `.checkbox` und `.radio`, konsistente Choice-Wrapper-Nutzung.
- **Token-Contract:** `--switch-track-w/h`, `--switch-thumb-size/inset`, `--switch-track-bg/-checked`, `--switch-thumb-bg`, `--switch-radius`. Track-Geometrie ist calc()-verkettet — wer die Track-Breite überschreibt, bekommt den korrigierten Thumb-Travel automatisch.
- **RTL-Support:** Thumb-Travel kehrt das Vorzeichen via `:dir(rtl)`-Pseudo-Klasse. translateX bleibt GPU-accelerated.
- **Demo-Section "Toggle-Controls"** zeigt Switch / Checkbox / Radio nebeneinander mit klar getrennten Use-Cases.
- **Thumb nutzt `var(--elevation-1)`** für subtle hairline-Schatten — automatisch dark-mode-aware durch die in v0.3.3 etablierte Elevation-Skala.

### Semantik

- Switch ist binary on/off, sofort wirksam (kein "Apply"-Button nötig).
- Checkbox ist Auswahl-Entscheidung (eine oder mehrere aus einem Set).
- Beide nutzen `<input type="checkbox">` — die Unterscheidung liegt in `role` + visueller Sprache.

---

## [0.3.3] — Foundation-Härtung (Schritt 4: Elevation-Skala)

### Hinzugefügt

- **`--elevation-0..5`** als kanonische Schatten-Skala in `semantic.css`. Sechs-Stufen-Pattern (M3-Style), semantisch eindeutig benannt:
  - `0` flat · `1` hairline (active-states) · `2` resting · `3` raised (Cards default) · `4` floating (Toast, Popover) · `5` overlay (Modal, Drawer)
- **Mode-aware durch Alias-Chain.** `--elevation-X` zeigt auf raw `--shadow-X`, das in `dark.css` umgesetzt wird → höhere Opacity (0.4–0.6) auf dunklem BG, sonst verschwindet der Schatten.

### Behoben

- **`--shadow-xl` fehlte im `auto-dark`-Block** (nur im manuellen `[data-mode="dark"]`-Block gesetzt). Modal und Drawer hätten unter `prefers-color-scheme: dark` die hellen Light-Werte gezeigt — schlafender Bug, jetzt symmetrisch in beiden Blöcken.
- **Verstreute Direkt-Verwendung von `--shadow-X` in Components** war architektonisch unklar. Components nutzen jetzt durchgehend `--elevation-X` als publike API; `--shadow-X` bleiben als raw primitives in `tokens.css` für legacy direct use.

### Geändert

- **Components migriert** auf `--elevation-X`:
  - Card default: `--card-shadow, var(--elevation-3))` (Wert identisch zu vorher)
  - Card-flat / Card-bordered: `var(--elevation-0)`
  - Toast: `var(--elevation-4)`
  - Modal: `var(--modal-shadow, var(--elevation-5))` (neuer überschreibbarer Token)
  - Drawer: `var(--drawer-shadow, var(--elevation-5))` (neuer überschreibbarer Token)
  - Tabs `aria-selected`: `var(--elevation-1)`
  - Range-Thumb: `var(--elevation-1)`
- **Legacy semantic-Aliase** `--shadow-card/elevated/modal` mappen jetzt auf `--elevation-3/4/5` (bisher direkt auf `--shadow-md/lg/xl`). Werte identisch, Indirektion sauberer.

### Migration

Keine Breaking Changes — alle visuellen Werte 1:1 erhalten. Konsumenten können auf `--elevation-X` umstellen (empfohlen) oder die alten `--shadow-X` / `--shadow-card` weiter nutzen.

---

## [0.3.2] — Foundation-Härtung (Schritt 3: Density-Achse)

### Hinzugefügt

- **Density als dritte orthogonale Achse** neben `data-tone` und `data-mode`. Drei Stufen via `data-density="compact|comfortable|spacious"`. Default ohne Attribut = comfortable.
- **`--density-{control,row,item}-{py,px}`-Token-Set** in `semantic/semantic.css` als 3-Tier-Skala:
  - `control` für Buttons, Inputs, Tabs (Haupt-Controls)
  - `row` für Table-Cells, List-Rows, Accordion-Summary (Listen-Items)
  - `item` für Nav-Items (sekundäre Controls)
- **`semantic/density.css`** als neue Datei im `mode`-Layer mit Overrides für compact + spacious. Sub-tree-fähig wie `data-tone` und `data-mode`.
- **Components migriert** auf Density-Fallback-Pattern (`var(--btn-py, var(--density-control-py))`): Button, Input (via reset.css), Table-Cells, List-Row, Nav-Item, Tabs, Accordion-Summary.
- **Demo-Topbar**: drei Density-Buttons mit localStorage-Persistierung, Readout, JS-Handler analog zu Tone/Mode.
- **Demo-Section "Density-Achse"** mit Input + Button-Pair + Table — zeigt density-responsive Verhalten direkt.

### Geändert

- **Trust und Modern Themes**: redundante `--btn-px/--btn-py`-Setzungen (Default-Werte) entfernt. Diese beiden Themes sind jetzt density-responsive. Premium / Playful / Industrial / Minimal behalten ihre identitätsstiftenden Sizing-Tokens und gewinnen bewusst über Density.
- **`semantic.css` Component-Contract-Defaults für `--btn-px/--btn-py`** zeigen jetzt auf `--density-control-{px,py}` statt auf hardcoded `space-20/space-12` — Token-Vererbung trägt die Density-Achse durch.

### A11Y

- WCAG 2.5.8 (Mindest-Touch-Target 24×24 CSS-px) eingehalten: compact ergibt ~32px-Controls, sicher über dem Limit. Tiefer geht die Skala bewusst nicht.

---

## [0.3.1] — Foundation-Härtung (Schritt 2: Status-Token-Konsolidierung)

### Hinzugefügt

- **`--status-{info,success,warning,danger,neutral}-{bg,fg,border}`-Token-Set** in `semantic/semantic.css`. Gemeinsame Basis für Callout / Badge / Banner / Toast — vier Components ziehen aus derselben Quelle. **Mode-aware durch Token-Vererbung:** `--status-X-bg` mixt gegen `--color-bg`, `--status-X-fg` gegen `--color-text-primary`. Wechseln die im Dark-Mode, folgen die color-mix-Resultate automatisch — kein separater Dark-Override nötig.
- **`--callout-stripe` als eigene Token-Achse** (Border-Inline-Start-Farbe), getrennt von `--callout-accent` (Title-Text-Farbe). Stripe nutzt die pure Statusfarbe, Accent den dunkleren `--status-X-fg` — sauberer Vertrag und höherer Title-Kontrast.
- **Contrast-Check-Erweiterung:** Static-Checker prüft jetzt **1008 Paare** (336 vorher), davon 8 zusätzliche Status-Paare pro Tone×Mode×Nested-Kombination. Browser-Checker prüft **132 Paare** (36 vorher) inkl. 8 Status-Components in der Demo.
- **Canvas-basierte sRGB-Konvertierung im Browser-Checker.** Chromium liefert `getComputedStyle()` für `color-mix(in oklch, ...)`-Werte als `oklch(...)` zurück — der alte `parseRgb` (nur `rgb(...)`) hat alle Status-Pairs als "skip" markiert. Canvas im Browser-Context konvertiert beliebige CSS-Color-Notationen verlässlich zu sRGB-Triples.

### Behoben

- **Dark-Mode-Kontrast für Status-Components.** Callout/Badge/Banner mixten Variants vorher hartcodiert gegen `white`/`black` — im Dark-Mode blieb der Pastel-bg also hell, was den Kontrast zu `--color-text-primary` (im Dark hell) auf 1.x:1 drückte. Mit Vererbung von `--color-bg`/`--color-text-primary` ist der Pastel-bg im Dark dunkel, fg hell — alle 12 Status-Paare (4 Variants × 3 Pairs) WCAG-AA in allen Tones × Modes.
- **Inkonsistente Mix-Ratios.** Callout (10-14%), Banner (10-15%), Badge (15-18%) hatten zufällige, nicht-designte Unterschiede. Konsolidiert auf 12% (warning: 14%) für bg, 60% für fg.

### Geändert

- **BREAKING (sehr eng):** Token-API von Callout — `--callout-accent` ist jetzt Title-Text-Farbe (vorher beides: Title + Border). Wer den Border separat steuern will, nutzt `--callout-stripe`.
- Callout / Badge / Banner / Toast `*--info/success/warning/danger/neutral`-Variants ziehen Werte aus `--status-*` statt sie inline mit `color-mix(..., white)` zu berechnen.

---

## [0.3.0] — Foundation-Härtung (Schritt 1: ADR-001 + Repo-Konsolidierung)

### Hinzugefügt

- **`.container--prose` + `--prose-max`-Token.** Opt-in-Variante für Editorial-Spalten; `.container` bleibt invariant auf `--container-max: 1280px`. Default `--prose-max: 70ch`, premium überschreibt auf `80ch`. Verhindert, dass UI-Chrome via Custom-Property-Cascade verengt wird.
- **Lint-Check 4: Layout-Token-Verbot (hard-fail).** Themes dürfen `--container-max` nicht setzen. Mechanisch durchgesetzt via `FORBIDDEN_LAYOUT_TOKENS`-Set in `scripts/lint-themes.js`. Verhindert die in ADR-001 beschriebene Vererbungs-Falle dauerhaft.
- **`.gitignore`** für `node_modules/`.

### Behoben

- **Repo-Konsolidierung: Duplikate Lint-/Contrast-Skripte entfernt.** `lint-themes.js`, `check-contrast.js`, `check-contrast-browser.js` lagen sowohl im Root als auch in `scripts/`. `package.json` zeigte auf `scripts/`, aber dort lagen die *alten* Versionen — d.h. `npm run lint` führte nur Check 1 aus, die in v0.2 dokumentierten Härtungen (destruktive-Token-Warnung + nested-mode-coverage + browser-checker) waren **de facto deaktiviert**. Root-Versionen sind jetzt die einzigen, in `scripts/` konsolidiert.
- **dark.css: fehlender Descendant-Partner ergänzt.** Sowohl `[data-mode="dark"]` als auch der Auto-Block (`prefers-color-scheme: dark`) hatten keinen `[data-mode] [data-tone]`-Descendant — der in v0.2 dokumentierte Nested-Dark-Fix war nie eingebaut. Jetzt aktiv und vom Lint geprüft. Browser-Check & Static-Check (336 Paare) beide grün.
- **README:** ADR-001-Pfad korrigiert (`./docs/...` → `./...`).
- **package.json:** Doppelte Puppeteer-Deklaration (optional v22 + dev v25) aufgeräumt — nur noch `devDependencies` v25.

### Geändert

- **BREAKING:** Themes dürfen `--container-max` nicht mehr setzen. Migration: `--container-max: Xch` → `--prose-max: Xch`. Verwendung dann mit `.container--prose` statt `.container`. Premium ist bereits migriert.
- **BREAKING:** Demo-`.topbar`-Hack (`--container-max: 1280px;`) entfernt — wird durch das neue Container-Modell überflüssig.

### Architektur

- ADR-001 → **Accepted** (Option A + Token-Split aus C). Lint-Check 4 setzt die Entscheidung mechanisch durch.

---

## [Unreleased]

### Behoben — Dark-Mode greift jetzt zuverlässig für alle Themes

Im echten Browser-Rendering hatte das Original-System **fünf kaputte Render-States**:

1. **premium / dark** — body schwarz auf schwarz (Kontrast 1.00:1)
2. **industrial / dark** — body fast schwarz auf schwarz (1.07:1)
3. **trust / dark** — Card-Headings unsichtbar auf weißer Card (1.04:1)
4. **minimal / dark** — Dark-Mode greift gar nicht; Theme bleibt in Light
5. **Nested Tone in Dark-Mode** (z. B. `<div data-tone="premium">` innerhalb `<html data-mode="dark">`) — nested Subtree verliert Dark-Mode komplett, Theme-Tokens cascadieren durch DOM-Vererbung, Mode-Tokens nicht

Drei zusammenwirkende Architektur-Probleme, drei Fixes:

#### Fix 1: Layer-Reihenfolge

`dark.css` wurde aus `layer(semantic)` in einen neuen `layer(mode)` **nach** `themes` verschoben. Layer-Cascade gewinnt über Selector-Specificity — vorher gewann `themes` immer gegen `dark.css`, weil semantic vor themes kommt.

```diff
- @layer reset, tokens, semantic, themes, base, state, components;
+ @layer reset, tokens, semantic, themes, mode, base, state, components;

- @import "./semantic/dark.css" layer(semantic);
+ @import "./semantic/dark.css" layer(mode);
```

#### Fix 2: DOM-Konvention

`data-tone` und `data-mode` müssen auf demselben Element sitzen. Original-Demo hatte `data-tone="trust"` auf `<body>` und `data-mode` auf `<html>`. Bei split-Attributen überschreibt body via Vererbung das html-Setup — selbst bei korrekter Layer-Reihenfolge bleibt der Bug.

```diff
- <html lang="de" data-mode="light">
- <body data-tone="trust">
+ <html lang="de" data-tone="trust" data-mode="light">
+ <body>
```

Plus JS-Handler: `body.setAttribute("data-tone", ...)` → `document.documentElement.setAttribute(...)`.

#### Fix 3: Nested-Mode-Coverage in dark.css

Jeder `[data-mode="dark"]`-Selektor in `dark.css` braucht einen Descendant-Partner. Sonst gilt der Dark-Mode-Override nur am Root-Element, nicht für nested `<div data-tone="X">`-Scopes — Theme-Tokens cascadieren dort destruktiv durch Vererbung.

```diff
- [data-mode="dark"] {
+ [data-mode="dark"],
+ [data-mode="dark"] [data-tone] {
    --color-bg: var(--gray-950);
    /* ... */
  }
```

### Behoben — kleinere Findings

- README: "Grid" und "Container" sind keine Components, sondern Layout-Utilities aus `base/layout.css`. Liste korrigiert.

### Hinzugefügt

- **Lint-Erweiterung 1: Destruktive-Token-Warnung.** Liest mode-sensitive Tokens dynamisch aus `semantic/dark.css` (aktuell 23) und warnt, wenn ein Theme einen davon hart setzt. Default: soft-warning (exit 0). Mit `--strict` als hard-fail. Findet aktuell 18 Warnungen über trust/premium/industrial/minimal — alle absichtlich, vom `mode`-Layer kompensiert, aber jetzt explizit dokumentiert.
- **Lint-Erweiterung 2: Nested-Mode-Coverage.** Prüft, dass jeder `[data-mode="X"]`-Selektor in `dark.css` auch einen `[data-mode="X"] [data-tone]`-Descendant-Partner hat. Hard-fail. Fängt Bug 5 künftig.
- **Erweiterter Contrast-Checker.** Liest Layer-Reihenfolge aus `main.css`, simuliert Kaskade mit `@media (prefers-color-scheme)` als rule-context, löst `color-mix(in oklch, …)` via OKLab. Prüft jetzt 336 Paare (Root: 96, Nested: 240).
- **Browser-basierter Contrast-Checker.** Lädt die echte `index.html` in headless Chromium, klickt sich durch alle Theme-Toggle, misst `getComputedStyle()`. Damit ist die Demo Teil der Validierung — ändert sich die DOM-Konvention falsch, schreit der Browser-Check. Mit `--compare`: Cross-Validation gegen static checker.
- **Auto-Mode-Coverage.** Beide Checker testen 4 Modi pro Tone: `light`, `dark`, `auto-light`, `auto-dark`. Letztere setzen kein `data-mode` und nutzen `prefers-color-scheme`-Emulation. Deckt damit den `:root:not([data-mode])`-Block in `dark.css` ab.
- **ADR-001:** Container-Width-Inheritance bei tone-spezifischen Overrides. Hält den `.topbar { --container-max: 1280px; }`-Override als bewussten Vererbungs-Eingriff fest und beschreibt 3 Lösungswege ohne zu empfehlen.

### Geändert

- **BREAKING:** Layer-Reihenfolge in `main.css` (siehe Fix 1)
- **BREAKING:** DOM-Konvention (siehe Fix 2)
- **BREAKING:** `dark.css`-Selektoren brauchen Descendant-Partner (siehe Fix 3)

---

## [0.1.0] — 2026-04-19

(Original-Release — siehe Git-History.)
