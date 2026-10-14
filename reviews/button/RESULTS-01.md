# Button 01 — Browsermessung und nichtproduktiver Variantenversuch

**Prüfdatum:** 2026-10-14 · **Reviewstatus:** SOURCE_DIFF_DONE / CHROMIUM_PASS / VISUAL_OWNER_REVIEW_PENDING.
**GitHub-CI:** https://github.com/GasserwerkSolutions/DesignSystem/actions/runs/38520764957
**Status der Bibliothek:** UNCHANGED; **Release/Merge:** BLOCKED.

## Tatsächliche Ergebnisse — Chromium, pinned Review-Branch

Testfixture: `reviews/button/fixture.html`. Skript: `scripts/check-button-review.js`.
Die Probe verwendet das **echte** `main.css` des kanonischen DesignSystems; keine zweite CSS-Implementierung.

| Messung | Normal/Defined/Fine | Wide/Soft/Strong |
| --- | ---: | ---: |
| Abstand innerhalb Button | 8 px | 16 px |
| Rahmenstärke | 1 px | 2 px |
| Radius | 2 px | 8 px |
| Höhe Button normaler Grösse | 42 px | 52 px |

Weitere Proben: `.btn--sm` 42,5 px; `.btn--lg` 65,5 px. Native `<button type="button">`: Tab fokussierbar, `:focus-visible` gibt solide Kontur, Enter und Leertaste lösen je genau eine Click-Aktion aus. Native `disabled` wird erkannt und Styling-Opacity beträgt 0,5. `<a href="#ziel" class="btn">` bewahrt Link-Semantik.

**Wichtig:** Das sind **positive Einzelproben** in Chromium; sie beweisen nicht generelle WCAG-AA-Konformität, mobile Brauchbarkeit, vollständige Tastatur-/Screenreader-Abdeckung, Farbkontrast aller Tones oder Cross-Browser-Parität.

## Reproduzierbar beobachtete Schwächen

| Probe | Messwert, original | Bedeutung |
| --- | --- | --- |
| 320px Viewport, langes deutsches Label | `documentWidth = 785px`, Button 751px breit, 513px aus 239px Container herausragend | Reflow/Overflow-Vertrag offen; `white-space:nowrap` auf `.btn` ist in solchen Fällen ungeeignet |
| Normale Buttonhöhe | 42px | Unter projektspezifischem 44px-Ziel für wichtige Aktionen |
| Kleine Buttonhöhe | 42,5px | Unter projektspezifischem 44px-Ziel; 24px-WCAG-AA-Ziel separat bestanden |
| Forced-colors, mehrere Browser, VoiceOver/NVDA | nicht geprüft | UNKNOWN, nicht PASS |

## A/B-Experiment nur im Browser

Nach einem unveränderten Baseline-Screenshot wurde diese CSS-Regel **ausschliesslich via Puppeteer** ergänzt:

```css
.btn {
  white-space: normal;
  overflow-wrap: anywhere;
  max-inline-size: 100%;
  min-inline-size: 0;
  min-block-size: 2.75rem;
}
```

**Ergebnis:** Bei 320px Viewport ist die Dokumentbreite 305px (vorher 785px). Der lange Button passt mit 237px Breite in den 239px Container, protrusion 0px, benötigt aber 138px Höhe. Normal- und Small-Button sind je 44px hoch. Das ist ein **technisch funktionierender Kandidat**, aber noch **keine akzeptierte Ästhetik**: Für einen 138px hohen Aktionsbutton ist eventuell eine bessere redaktionelle Kurzbeschriftung oder separate UI-Alternative sinnvoll. Blindes `overflow-wrap:anywhere` darf keine schlechten Texte kaschieren.

CI speichert separate Desktop-, Mobil-Baseline- und Mobil-Experiment-Screenshots als Artefakt `button-01-screenshots`. Keine bestehenden Golden-Baselines wurden geändert.

## Entscheidungsvorschlag (noch nicht freigegeben)

1. Kanonischen `gap:var(--component-gap)` und `border:var(--stroke-default)` beibehalten.
2. Für erlaubte mehrzeilige Buttonlabels einen dokumentierten, geprüften Container-/Umbruchvertrag verabschieden; testen mit langen deutschen, englischen und RTL-Labels.
3. Für **wichtige Touch-Aktionen** 44px als Gestaltungsziel vereinbaren; die Small-Grösse ggf. nur in dichten, ausreichend grossen Kontexten zulassen. Das 24×24px WCAG-AA-Mindestkriterium nicht fälschlich als 44px deklarieren.
4. Danach die visuelle Variante in 2 Modes × relevante Tones und Formachsen begutachten und erst in einem separaten Implementierungs-PR in die produktiven Komponenten übernehmen.

Offen bleiben Farb-/Contrast-Audits, Fehler-/Loading-Zustände, Anchor-disabled-Policy, Icon-only-Zugänglichkeit, Touch/RTL/forced-colors, Profilversionierung und reale Consumer-Integration.

**Normquellen:** https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum ; https://www.w3.org/WAI/ARIA/apg/patterns/button/ ; https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button .
