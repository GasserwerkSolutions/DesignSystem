# Design System

Contract-based Multi-Tone CSS Design System.
**7 Tones × 2 Modes × 3 Densities × Container-Queries** = 4 orthogonale Achsen.
**54 Components**, **WCAG-AA validiert**, **17.5 KB gzip**.

```html
<link rel="stylesheet" href="./node_modules/@gasserwerksolutions/design-system/main.css">
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
npm install @gasserwerksolutions/design-system
```

```css
@import "@gasserwerksolutions/design-system";              /* alles, 17.5 KB gzip */
@import "@gasserwerksolutions/design-system/min";          /* pre-minified */
```

Per-Component-Import (CSS-Tree-Shaking):

```css
@import "@gasserwerksolutions/design-system/tokens/tokens.css";
@import "@gasserwerksolutions/design-system/semantic/semantic.css";
@import "@gasserwerksolutions/design-system/themes/trust.css";
@import "@gasserwerksolutions/design-system/components/button.css";
/* … nur was du brauchst */
```

Optional: Companion-JS (TypeScript) für interactive Components (Combobox,
File-Upload, Slider, Theme-Toggle, OTP-Input, Copy-Button, Popover-Anchor):

```js
import { setupAll } from "@gasserwerksolutions/design-system/js";
setupAll();
```

Tree-shakable per Component:

```js
import { setupCombobox } from "@gasserwerksolutions/design-system/js/setup-combobox";
import { setupThemeToggle } from "@gasserwerksolutions/design-system/js/setup-theme-toggle";
```

IIFE-Variante für `file://` ohne Build-Step:

```html
<script src="./node_modules/@gasserwerksolutions/design-system/dist/js/design-system.iife.js"></script>
<script>DS.setupAll()</script>
```

---

## 4 Achsen

| Achse | Werte | Wie | Beispiel |
|---|---|---|---|
| **Tone** | trust, playful, premium, industrial, modern, minimal, musikraum | `<html data-tone="trust">` | Brand-Identität |
| **Mode** | light, dark, auto | `<html data-mode="dark">` | Light/Dark/System |
| **Density** | comfortable, compact, spacious | `<html data-density="compact">` | Touch vs Desktop |
| **Container** | inline-size queries | `<div class="cq">…</div>` | Component reagiert auf Container, nicht Viewport |

Achsen sind **orthogonal** — jede Kombination funktioniert (über 100 Modi
× Tones validiert, 1008 WCAG-AA-Paare im static-Contrast-Check).

---

## Musikraum Tone

Der Tone `musikraum` bildet die warme, stille und editoriale Markenwelt von
Musikraum / Franz Gasser ab. Die Token-Werte stammen aus der bestehenden
Musikraum-Spezifikation (`assets/klang.css`): warme Papier- und Holzflächen,
dunkle Wald-/Steintöne, gedämpfte Akzente, Serif-Headlines und ruhige Motion.

```html
<html data-tone="musikraum" data-mode="light" data-density="comfortable">
  <body>
    <section class="section">
      <div class="container container--prose">
        <p class="badge">Musikraum</p>
        <h1>Jeder Mensch ist musikalisch</h1>
        <p>Gemeinsam spielen, entdecken und aufeinander hören.</p>
        <a class="btn" href="/Klangabende/">Klangabend entdecken</a>
      </div>
    </section>
  </body>
</html>
```

Selektiver Import für statische oder CMS-generierte Sites:

```css
@import "@gasserwerksolutions/design-system/tokens/tokens.css";
@import "@gasserwerksolutions/design-system/semantic/semantic.css";
@import "@gasserwerksolutions/design-system/themes/musikraum.css";
@import "@gasserwerksolutions/design-system/semantic/dark.css";
@import "@gasserwerksolutions/design-system/semantic/density.css";
@import "@gasserwerksolutions/design-system/base/reset.css";
@import "@gasserwerksolutions/design-system/base/typography.css";
@import "@gasserwerksolutions/design-system/base/layout.css";
@import "@gasserwerksolutions/design-system/components/button.css";
@import "@gasserwerksolutions/design-system/components/card.css";
@import "@gasserwerksolutions/design-system/components/section.css";
@import "@gasserwerksolutions/design-system/components/nav.css";
```

Für den Musikraum-Rebuild gilt: `musikraum` liefert die Theme-Tokens; Header,
Hero/Subhero, Footer, Booking-Mount und spezifische Seiten-Sections bleiben
Projektkomponenten der Website oder der CMS-Plattform.

---

## Framework Integration

CSS-First-DS — funktioniert mit jedem Framework via CSS-Import.

### React

```jsx
// main.jsx
import "@gasserwerksolutions/design-system";
import { setupAll } from "@gasserwerksolutions/design-system/js";

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
import "@gasserwerksolutions/design-system";
import { setupAll } from "@gasserwerksolutions/design-system/js";

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
  import "@gasserwerksolutions/design-system";
  import { setupAll } from "@gasserwerksolutions/design-system/js";
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
- **7 Tones × 2 Modes × 3 Densities × Container-Queries**
- **1008** WCAG-AA-Paare verifiziert
