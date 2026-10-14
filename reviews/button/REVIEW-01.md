# Button 01 — fachliche Einzelabnahme

**Status:** Review-Kandidat, nicht implementierungs-/releasefreigegeben. Stand 14.10.2026.

## Quellen (gebunden)

- Kanonisches DesignSystem `main@acb1dc6`: `components/button.css`, Git-Blob `c140616af0c3a6af272735ed40c300b540cd7211`.
- Gasserwerk-Monorepo `main@0767375`: `packages/design-system/components/button.css`, Git-Blob `3d239739203366f273764b22d282f547849e26c2`.
- **Zwei Differenzen:** `gap: var(--component-gap)` statt `gap: var(--space-8)`; `border: var(--stroke-default) solid ...` statt `border: 1px solid ...`.

**Vorschlag:** kanonische Version erhalten. Sie unterstützt bereits die achsengebundenen Abstände und Rahmenstärken. Die Monorepo-Version nicht blind übernehmen.

## Vorhandener Grundlagenvertrag

`data-space=normal|wide` steuert unter anderem Component-Gap 8 bzw. 16 px. `compact` hat ein eigenständiges altes Verhalten; `spacious` bleibt Wide-Alias. `data-shape=defined|soft` steuert Button-Ecken (2 bzw. 8 px); `data-weight=fine|strong` den Rahmen (1 bzw. 2 px). Tone, Mode und Density sind getrennte zusätzliche Achsen. Quellen: `semantic/form.css`, `docs/form-axes.md`.

## Abnahmevertrag (Vorschlag)

| Dimension | Test / Entscheidung |
| --- | --- |
| Native Semantik | Aktionen: `<button type="button">`; Navigation: `<a href>`; in Formularen bewusste Submit-Wahl |
| Varianten | Primary, Secondary, Ghost; sm/default/lg; kein unbegründeter Variantenzuwachs |
| Tastatur/Fokus | Enter, Space, sichtbarer Fokus, richtiger Fokus nach Aktion |
| Zustände | Hover, Pressed, Disabled, Pending, Erfolg/Fehler; Pending benötigt tatsächliche Consumer-Logik |
| Größen | WCAG 2.2 AA 2.5.8: 24×24 CSS px oder zulässige Ausnahmen; Projektziel wichtige Aktionen 44×44 px separat prüfen |
| Formachsen | Normal/Wide, Defined/Soft, Fine/Strong; alle kombinierten geometrischen Effekte im Browser messen |
| Themes/Mode | Light/Dark/Tones/forced-colors, tatsächlicher Kontrast, transparente Ghost-Buttons |
| Inhalte | 320 CSS px, 200% Zoom, lange deutsche Labels, RTL, Icon-only-Benennung |
| Motion | Reduced Motion/kein unerklärter Layout-Shift |
| Distribution | Vollprofil und Builder-Profil, reproduzierbare Assets und Consumer-Pin |

Primärquellen: https://www.w3.org/WAI/ARIA/apg/patterns/button/ · https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum · https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button .

## Erste ausführbare Probe

- `reviews/button/fixture.html`: reale Button-Varianten mit den beiden Formachsen.
- `scripts/check-button-review.js`: Chromium-Prüfung für Computed Styles, Native-Semantik/Keyboard, Fokus, Targets, Disabled; Desktop- und 320px-Screenshot.
- Lange Labels, 44px-Ziel, Screenreader, Cross-Browser und Theme-Gesamtmatrix werden **sichtbar als offen** geführt.

**Offene Reviewfragen:** Sollte `white-space: nowrap` bei langen Beschriftungen eine Mehrzeiligkeit erlauben? Wie wird ein nicht verfügbarer Navigationslink behandelt? Wann braucht eine Aktion Pending-Feedback? Sind die drei Varianten visuell überzeugend? Was ist bei Icon-only erlaubt?

Keine Freigabe durch reine Quellen- oder Chromium-Probe. Eigentümerentscheidung, visuelle Abnahme und unabhängige Accessibility-/Consumer-Tests stehen aus.
