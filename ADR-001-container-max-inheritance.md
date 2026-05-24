# ADR-001: Container-Width-Inheritance bei tone-spezifischen Overrides

**Status:** Open

## Kontext

`base/layout.css` definiert `.container { max-width: var(--container-max, 1280px); }`. Premium-Theme verengt das auf `80ch` für Editorial-Lesbarkeit. Custom Properties cascadieren via DOM-Vererbung — sobald `data-tone="premium"` auf `<html>` sitzt, erbt jedes `.container` die `80ch`, auch UI-Container die voll-breit sein wollen (Topbar).

Die Demo löst das lokal mit `.topbar { --container-max: 1280px; }`. Korrektes CSS, aber drei Bedenken:

1. Magisch verklebt mit dem Wert in `semantic.css`. Bei Änderung der Baseline läuft die Topbar mit veraltetem Wert weiter.
2. Lebt im Demo-Markup, nicht im DS. Konsumenten stolpern in dieselbe Falle.
3. Keine semantische Unterscheidung zwischen "Layout-Container" und "Prose-Container".

## Lösungsoptionen

### A) Container-Varianten
`.container--prose` für verengbare Bereiche, `.container` Layout-weit konstant.

### B) Bleed-Container
`.container-bleed` als Opt-out für UI-Chrome.

### C) Neues Token
`--prose-max` für Content-Spalten, `--container-max` bleibt konstant. Premium setzt nur `--prose-max`. Breaking Change für DTCG-Export.

## Empfehlung

Keine — Design-System-Authority-Entscheidung. Tendenz zu A wegen "Contract-based"-Philosophie. Bis entschieden: `.topbar { --container-max: 1280px; }` mit Inline-Kommentar bleibt als bewusster lokaler Vererbungs-Eingriff in der Demo.
