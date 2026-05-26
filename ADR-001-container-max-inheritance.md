# ADR-001: Container-Width-Inheritance bei tone-spezifischen Overrides

**Status:** Accepted (Option A) — seit v0.3

## Kontext

`base/layout.css` definiert `.container { max-width: var(--container-max, 1280px); }`. Premium-Theme verengte das auf `80ch` für Editorial-Lesbarkeit. Custom Properties cascadieren via DOM-Vererbung — sobald `data-tone="premium"` auf `<html>` saß, erbte jedes `.container` die `80ch`, auch UI-Container, die voll-breit sein wollen (Topbar).

Die Demo löste das lokal mit `.topbar { --container-max: 1280px; }`. Korrektes CSS, aber drei Bedenken:

1. Magisch verklebt mit dem Wert in `semantic.css`. Bei Änderung der Baseline lief die Topbar mit veraltetem Wert weiter.
2. Lebte im Demo-Markup, nicht im DS. Konsumenten stolperten in dieselbe Falle.
3. Keine semantische Unterscheidung zwischen "Layout-Container" und "Prose-Container".

## Lösungsoptionen

### A) Container-Varianten *(gewählt)*
`.container--prose` für verengbare Bereiche, `.container` Layout-weit konstant.

### B) Bleed-Container
`.container-bleed` als Opt-out für UI-Chrome.

### C) Neues Token
`--prose-max` für Content-Spalten, `--container-max` bleibt konstant. Premium setzt nur `--prose-max`.

## Entscheidung

**Option A + Token-Split aus C kombiniert.** Begründung:

- **Contract-Treue.** Layout-Container und Prose-Container haben unterschiedliche Verträge. Eine separate Klasse macht den Vertrag explizit, statt ihn durch Token-Vererbung zu verstecken.
- **Lokalität der Entscheidung.** Der Konsument entscheidet beim Markup (`.container` vs `.container--prose`), nicht das Theme. Themes erweitern nur den Möglichkeitsraum (`--prose-max`).
- **Mechanisch durchgesetzt.** Lint-Check 4 verbietet `--container-max` in Themes (`FORBIDDEN_LAYOUT_TOKENS`). Wer Editorial-Verengung will, muss `--prose-max` setzen — die Falle ist nicht mehr stolperbar.

## Umsetzung

```css
/* semantic/semantic.css */
--container-max: 1280px;   /* invariant, Layout-Breite */
--prose-max:     70ch;     /* opt-in via .container--prose */

/* base/layout.css */
.container        { max-width: var(--container-max, 1280px); }
.container--prose { max-width: var(--prose-max, 70ch); }

/* themes/premium.css */
--prose-max: 80ch;   /* statt --container-max */
```

## Konsequenzen

- **Breaking:** Themes, die bisher `--container-max` setzten, müssen auf `--prose-max` migrieren. Lint fängt das auf.
- **Demo-Migration:** Der `.topbar { --container-max: 1280px; }`-Hack ist entfernt.
- **DTCG-Export:** `--prose-max` erscheint neu in `dist/tokens.json` als `dimension`.
- **Lint-Erweiterung:** Check 4 (`FORBIDDEN_LAYOUT_TOKENS`) ist erweiterbar, falls weitere Layout-Tokens identifiziert werden, die via Cascade destruktiv wirken.
