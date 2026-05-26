# Changelog

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
