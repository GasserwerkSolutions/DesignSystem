# ADR-002: Modern-CSS-Architektur (Baseline 2024+)

**Status**: Accepted (v0.12.0 — v0.20.0)
**Datum**: Mai 2026

## Context

Das DS hat in den ersten v0.X-Releases klassisches CSS verwendet: explicite
`[data-mode="dark"]`-Overrides, `@keyframes` für Animationen, Tokens als
universelle Strings.

Mit dem Verfügbar-Werden von "Baseline 2024+" CSS-Features (Chrome 117+,
Safari 17.5+, Firefox 129+) gab es die Möglichkeit, mehrere
Architektur-Schichten zu vereinfachen:

- **Dark-Mode** über doppelte Override-Blöcke + Descendant-Partner
  → 125 Zeilen Duplikation in dark.css
- **Overlay-Animationen** über `@keyframes` (nur Entry-Animation, kein Exit)
- **Tokens** als un-typisierte Custom Properties (kein DevTools-Picker,
  keine animation-Interpolation)

## Decision

Aggressiv adoptieren wo der Roll-out solid ist (Baseline-Newly-Available):

| Feature | Wozu | Status |
|---|---|---|
| `color-mix(in oklch, A, B, pct%)` | perceptually-uniform color mixing | seit v0.3 |
| `light-dark(L, D)` | single-source-of-truth mode-tokens | v0.12 |
| `@container (inline-size)` | component-level responsive | v0.9 |
| `@property` | typed custom properties (animatable) | v0.15 |
| `@starting-style` + `allow-discrete` | enter/exit animations | v0.14 |
| `interpolate-size: allow-keywords` | height: auto Animation | v0.14 |
| `field-sizing: content` | auto-grow textarea | v0.15 |
| `accent-color` | branding für native form controls | v0.15 |
| `scrollbar-gutter: stable` | kein Layout-Shift | v0.15 |
| `view-transitions` | smooth Cross-Fade theme-switch | v0.20 |
| `popover` (Native API) | Popover/Combobox/Command-Palette | seit v0.4 |
| `:has()` | parent-selectors (segmented checked) | v0.17 |

### `light-dark()` ersetzt die Override-Architektur

**Vorher**:
```css
/* semantic.css */
:root { --color-text: var(--gray-900); }

/* dark.css */
[data-mode="dark"],
[data-mode="dark"] [data-tone] {  /* Descendant-Partner Pflicht */
  --color-text: var(--gray-50);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-mode="light"]):not([data-mode="dark"]) {
    --color-text: var(--gray-50);   /* Duplikation */
  }
}
```

**Nachher**:
```css
/* semantic.css */
:root {
  color-scheme: light dark;
  --color-text: light-dark(var(--gray-900), var(--gray-50));
}

/* dark.css */
[data-mode="dark"] { color-scheme: dark; }
[data-mode="light"] { color-scheme: light; }
/* + nur edge-cases (multi-shadow) */
```

`color-scheme` erbt → Descendant-Partner-Pattern obsolet. dark.css
schrumpfte von 125 → 67 Zeilen.

### `@property` typed Custom Properties

Wir registrieren 6 zentrale Tokens als typed:
- `--color-interactive` (color)
- `--color-interactive-light` (color)
- `--color-interactive-dark` (color)
- `--color-focus-ring` (color)
- `--btn-radius` (length-percentage)
- `--range-fill-pct` (percentage)

Vorteile:
- DevTools zeigt Color-Picker im Inspector
- Animation interpoliert korrekt (View-Transitions können diese smooth
  zwischen Themes überblenden)
- Validierung beim Set (invalid value → initial-value, kein silent break)

Andere Tokens bleiben un-registered (universeller CSS-String).

### `@starting-style` für Overlay-Enter+Exit

`@keyframes`-Pattern gibt nur Entry-Animation. Bei `display: none` Close
springt das Element instant weg.

`@starting-style` + `transition-behavior: allow-discrete` enabled
Transition für `display` und `overlay` Properties → smooth in UND out.

```css
.popover {
  opacity: 1;
  transform: none;
  transition:
    opacity 150ms,
    display 150ms allow-discrete,
    overlay 150ms allow-discrete;
}
@starting-style {
  .popover:popover-open {
    opacity: 0;
    transform: translateY(-4px);
  }
}
.popover:not(:popover-open) {
  opacity: 0;
  transform: translateY(-4px);
}
```

## Consequences

### Vorteile

- **Code-Reduktion**: dark.css -46%, weniger Duplikation
- **Performance**: Containment, content-visibility, light-dark resolved
  in Browser-Native-Code (schneller als Cascade-Recalculation)
- **DevTools-Inspectability**: typed properties zeigen Color-Picker
- **A11Y-Konsistenz**: `prefers-reduced-motion` einheitlich respektiert
  in allen modernen Features

### Trade-Offs

- **Browser-Support**: Features sind Baseline 2024+ — User mit Browser
  vor Mai 2023 sehen Defaults (light-dark resolved zum ersten Argument,
  @starting-style ignored, interpolate-size ignored). System bleibt
  funktional, nur ohne die Polish.
- **Lint-Updates nötig**: Check 2 (destructive tokens) musste light-dark()
  als erlaubte Override-Form anerkennen. Check 3 (Descendant-Partner)
  komplett umgebaut.
- **Multi-Shadow + light-dark**: `light-dark()` parsed multi-comma values
  nicht (Schatten haben mehrere Shadows kommagetrennt). Diese bleiben in
  dark.css mode-overridden — eine kleine Ausnahme.

### Mitigations

- **VRT durchgehend grün**: 12 Baselines × 6 Tones × 2 Modes weiter
  pixel-identical mit den Pre-Modernisierungs-Snapshots (oder dokumentiert
  neu generiert für sichtbare verbesserungen wie scrollbar-gutter).
- **`@supports`-Wrappers** wo unklar: `@supports (animation-timeline:
  scroll())` für scroll-driven animations, `document.startViewTransition`
  feature-detection in JS.

## Alternatives Considered

### "Klassisches CSS bleiben" (Reject)

Pro: maximaler Browser-Support
Contra: 125 Zeilen Duplikation, Wartungsaufwand, kein DevTools-Polish

### "Modern-Only, kein Fallback" (Reject)

Pro: einfacherer Code
Contra: bricht IE11-Era-Workflows, kein Graceful-Degradation

### "Hybrid mit Feature-Queries" (gewählt)

Pro: Best-of-both-Worlds, graceful degradation
Contra: Feature-Detection-Boilerplate in einigen Stellen — akzeptiert,
weil alle Modernen Features den graceful fallback haben (light-dark
resolved zum ersten Argument, @starting-style wird ignored).
