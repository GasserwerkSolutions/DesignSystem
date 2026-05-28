# Design System

Contract-based Multi-Tone CSS Design System.
**6 Tones × 2 Modes × 3 Densities × Container-Queries** = 4 orthogonale Achsen.
**54 Components**, **WCAG-AA validiert**, **17.5 KB gzip**.

```html
<link rel="stylesheet" href="./node_modules/@gws/design-system/main.css">
<html data-tone="trust" data-mode="light" data-density="comfortable">
  <body>
    <button class="btn">Call to action</button>
  </body>
</html>
```

Drei Achsen-Attribute auf `<html>`, ein Stylesheet, los geht's.

---

## Install

```bash
npm install @gws/design-system
```

```css
@import "@gws/design-system";              /* alles, 17.5 KB gzip */
@import "@gws/design-system/min";          /* pre-minified */
```

Per-Component-Import (CSS-Tree-Shaking):

```css
@import "@gws/design-system/tokens/tokens.css";
@import "@gws/design-system/semantic/semantic.css";
@import "@gws/design-system/themes/trust.css";
@import "@gws/design-system/components/button.css";
/* … nur was du brauchst */
```

Optional: Companion-JS (TypeScript) für interactive Components (Combobox,
File-Upload, Slider, Theme-Toggle, OTP-Input, Copy-Button, Popover-Anchor):

```js
import { setupAll } from "@gws/design-system/js";
setupAll();
```

Tree-shakable per Component:

```js
import { setupCombobox } from "@gws/design-system/js/setup-combobox";
import { setupThemeToggle } from "@gws/design-system/js/setup-theme-toggle";
```

IIFE-Variante für `file://` ohne Build-Step:

```html
<script src="./node_modules/@gws/design-system/dist/js/design-system.iife.js"></script>
<script>DS.setupAll()</script>
```

---

## 4 Achsen

| Achse | Werte | Wie | Beispiel |
|---|---|---|---|
| **Tone** | trust, playful, premium, industrial, modern, minimal | `<html data-tone="trust">` | Brand-Identität |
| **Mode** | light, dark, auto | `<html data-mode="dark">` | Light/Dark/System |
| **Density** | comfortable, compact, spacious | `<html data-density="compact">` | Touch vs Desktop |
| **Container** | inline-size queries | `<div class="cq">…</div>` | Component reagiert auf Container, nicht Viewport |

Achsen sind **orthogonal** — jede Kombination funktioniert (über 100 Modi
× Tones validiert, 1008 WCAG-AA-Paare im static-Contrast-Check).

---

## Framework Integration

CSS-First-DS — funktioniert mit jedem Framework via CSS-Import.

### React

```jsx
// main.jsx
import "@gws/design-system";
import { setupAll } from "@gws/design-system/js";

function App() {
  useEffect(() => { setupAll(); }, []);
  return (
    <html data-tone="trust" data-mode="light">
      <button className="btn">CTA</button>
    </html>
  );
}
```

### Vue

```vue
<!-- main.js -->
import "@gws/design-system";
import { setupAll } from "@gws/design-system/js";

<!-- App.vue -->
<script setup>
import { onMounted } from "vue";
onMounted(setupAll);
</script>

<template>
  <button class="btn">CTA</button>
</template>
```

### Svelte

```svelte
<!-- App.svelte -->
<script>
  import "@gws/design-system";
  import { setupAll } from "@gws/design-system/js";
  import { onMount } from "svelte";
  onMount(setupAll);
</script>

<button class="btn">CTA</button>
```

### Astro / Next.js / SvelteKit

CSS-Import in der jeweiligen entry-Datei. `setupAll()` in einem
client-only-Hook (Astro: `<script>`, Next: `useEffect`, SvelteKit:
`onMount`).

---

## Theme Generator

HEX → 11-Step-OKLCH-Skala mit Color-Blind-Safety-Check und CSS-Export.
Doc-Site: `/dist/site/themes.html`.

```bash
npm run build:site
open dist/site/themes.html
```

Generierten Block in `themes/my-tone.css` speichern, in `main.css`
importieren, fertig.

---

## Theming-Architektur

Layer-Cascade (`reset → tokens → semantic → themes → mode → base → state →
components`). **Themes setzen nur Tokens, niemals Selektoren** — Lint
enforced das.

Dark-Mode via **`light-dark(L, D)`** in semantic.css. `color-scheme` auf
`<html>` triggert die Resolution. Themes können light-dark() ebenfalls
nutzen für tone-spezifische Mode-Variants.

```css
[data-tone~="custom"] {
  --color-interactive: light-dark(#0080ff, #4da8ff);
  /* anderes Token */
}
```

---

## Scripts

```bash
npm run lint                 # Theme-Contract + axis-blocker (5 checks)
npm run test:lint            # Lint regression tests (21 cases)
npm run check:contrast       # 1008 WCAG-AA Paare (6×4×kritisch + nested)
npm run check:a11y           # axe-core lint + self-test mutations
npm run check:visual         # VRT — 12 baselines + 3 sensitivity-suite
npm run check:journeys       # Puppeteer user flows (6 journeys)
npm run check:site           # Site smoke + 50 interaction asserts
npm run check:package        # @imports in main.css ∈ files-list + exports map
npm run measure              # Bundle-Size-Report (raw/gzip/brotli per Layer)
npm run measure:check        # Bundle-Budget-Check (fails if exceeded)
npm run build                # Tokens + JS
npm run build:site           # Static doc-site → dist/site/
npm run check:full           # Alles, blocking gate vor publish
```

---

## Production Stats

- **54 Components**
- **271 Design Tokens** (DTCG-konform exportiert in `dist/tokens.json`)
- **17.5 KB** gzipped (bundle)
- **6 Tones × 2 Modes × 3 Densities × Container-Queries**
- **1008** WCAG-AA-Paare verifiziert
- **50** automated Site-Asserts (smoke + interactions + parser self-test)
- **6** End-to-End User-Journey-Tests
- **3** VRT Sensitivity-Suite Mutationen
- **0** pageerror in der generierten Doc-Site

---

## Modern CSS Foundation

Aggressiv adoptiert (Baseline 2024+):

- `color-mix(in oklch, ...)` — perceptually-uniform color mixing
- `light-dark(L, D)` — single-source-of-truth mode-aware tokens
- `@container (inline-size)` — Component-level responsive
- `@property` — typed custom properties (animatable, color-picker in DevTools)
- `@starting-style` + `transition-behavior: allow-discrete` — smooth
  enter/exit für popover, modal, drawer
- `interpolate-size: allow-keywords` — height: auto Animation
- `field-sizing: content` — auto-grow textarea
- `accent-color` — branding für native form controls
- `scrollbar-gutter: stable` — kein Layout-Shift
- `@scope` — vorbereitet (nicht aktiv)
- `view-transitions` — smooth Cross-Fade beim Tone/Mode-Switch (Chrome 111+)

Logical Properties durchgehend (RTL-bereit), `prefers-*` media queries
flächendeckend, forced-colors-mode (Windows HC) für 20 Surfaces explicit.

---

## Architektur

```
tokens/           Primitive Werte (rem-based, fluid typography)
semantic/         Bedeutungs-Mapping (--color-interactive, --card-bg, ...)
  semantic.css    light-dark() Mode-Resolution + Status-Token-Tripel
  dark.css        Multi-Shadow-Overrides + color-scheme-Mappings
  density.css     3 Density-Tiers (control/row/item)
themes/           6 Tones, jeder setzt nur Tokens
base/             Reset, Typography, Layout, Print
state/            Global interaction defaults, prefers-* + forced-colors
components/       54 Components — Contract (Tokens in) + Selektoren (CSS out)
js/               TypeScript Companion JS für interactive Components
scripts/          Lint, Contrast, A11Y, Visual, Journeys, Site-Builder, Release
dist/             Generated artifacts:
  main.min.css        Minified CSS
  tokens.json         W3C DTCG Token export
  tokens.d.ts         TypeScript types
  bundle-stats.json   Größen-Report
  js/                 Compiled JS bundles (ESM + IIFE)
  site/               Interactive Documentation Site
```

---

## Doc-Site

Generierte interactive Documentation:
- **Index**: Component-Grid nach Kategorien
- **Foundations**: 271 Tokens mit Live-Editor
- **Themes**: HEX → OKLCH-Palette-Generator + Color-Blind-Safety
- **Components/X**: Live-Beispiele, Tone-Übersicht (6 Tiles), Modifier-Demos
- **Mega-Menu**: alle 54 Components in 7 Kategorien
- **Mobile-optimized**

```bash
npm run build:site
open dist/site/index.html
```

---

## Architektur-Entscheidungen

- [ADR-001 — Container-Width-Inheritance](./ADR-001-container-max-inheritance.md)
- [ADR-002 — Modern-CSS-Architektur (light-dark, @starting-style, @property)](./ADR-002-modern-css-architecture.md)
- [CHANGELOG](./CHANGELOG.md) — vollständige Etappen-Historie v0.3 bis v0.25

---

## License

[MIT](./LICENSE)
