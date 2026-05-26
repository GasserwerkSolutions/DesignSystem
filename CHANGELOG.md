# Changelog

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
