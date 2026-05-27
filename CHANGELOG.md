# Changelog

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
