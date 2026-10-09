# Design System

Contract-based Multi-Tone CSS Design System.
**7 Tones × 2 Modes × 3 Densities × Container-Queries** = 4 orthogonale Achsen.
**57 Components**, **WCAG-AA validiert**, **23.9 KB gzip** im Vollprofil.

Katalog: [gasserwerksolutions.github.io/DesignSystem](https://gasserwerksolutions.github.io/DesignSystem/)

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

Bis zur separaten Veröffentlichung im öffentlichen npm-Register wird immer
ein exakter GitHub-Release installiert:

```bash
npm install "github:GasserwerkSolutions/DesignSystem#v0.32.0"
```

```css
@import "@gasserwerksolutions/design-system";              /* Vollprofil, 23.9 KB gzip */
@import "@gasserwerksolutions/design-system/min";          /* pre-minified */
```

Per-Component-Import (nur die Layer, die du brauchst):

```css
@import "@gasserwerksolutions/design-system/tokens/tokens.css";
@import "@gasserwerksolutions/design-system/semantic/semantic.css";
@import "@gasserwerksolutions/design-system/themes/trust.css";
@import "@gasserwerksolutions/design-system/components/button.css";
/* base/*, semantic/*, state/*, tokens/* sind ebenfalls exportiert */
```

Für den Gasserwerk Builder existiert ein versioniertes Website-Profil ohne
Dashboard- und Spezialkomponenten:

```css
@import "@gasserwerksolutions/design-system/profiles/builder";
```

Das Builder-Profil enthält sieben kuratierte Components und elf Website-
Patterns. Es wird zusätzlich als selbstständiges JavaScript-Artefakt mit
eingebettetem CSS, Manifest und SHA-256 ausgeliefert:

```js
import "@gasserwerksolutions/design-system/profiles/builder.js";
```

---

## Wann JavaScript nötig ist

Die meisten Components sind reines CSS. Diese brauchen den Companion
(`setupAll()` oder den Einzel-Import):

| Component | Setup |
|---|---|
| Combobox | `setupCombobox` |
| File-Upload | `setupFileUpload` |
| Slider | `setupSlider` |
| OTP-Input | `setupOtpInput` |
| Copy-Button | `setupCopyButton` |
| Popover-Anchor | `setupPopover` |
| Theme-Toggle | `setupThemeToggle` |
| Dismiss (Toast, Banner) | `setupDismissers` |

```js
import { setupAll } from "@gasserwerksolutions/design-system/js";
const cleanup = setupAll();
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

`musikraum` ist ein Marken-Tone (warme Papier- und Holzflächen, Serif-Headlines).
Token-Quelle und Seitenaufbau bleiben beim konsumierenden Projekt; das System
liefert nur die Theme-Tokens. Beispiel: `examples/`.

---

## Framework Integration

CSS-First. Die Achsen sitzen auf `document.documentElement`, nicht im
Komponentenbaum.

### React

```jsx
// main.jsx
import "@gasserwerksolutions/design-system";
import { setupAll } from "@gasserwerksolutions/design-system/js";
import { useEffect } from "react";

const root = document.documentElement;
root.dataset.tone = "trust";
root.dataset.mode = "light";
root.dataset.density = "comfortable";

export function App() {
  useEffect(() => setupAll(), []);
  return <button className="btn">CTA</button>;
}
```

### Vue

```js
// main.js
import "@gasserwerksolutions/design-system";
import { setupAll } from "@gasserwerksolutions/design-system/js";

const root = document.documentElement;
root.dataset.tone = "trust";
root.dataset.mode = "light";
```

```vue
<script setup>
import { onMounted, onUnmounted } from "vue";
let cleanup = () => {};
onMounted(() => { cleanup = setupAll(); });
onUnmounted(() => cleanup());
</script>

<template>
  <button class="btn">CTA</button>
</template>
```

### Svelte

```svelte
<script>
  import "@gasserwerksolutions/design-system";
  import { setupAll } from "@gasserwerksolutions/design-system/js";
  import { onMount } from "svelte";

  document.documentElement.dataset.tone = "trust";
  document.documentElement.dataset.mode = "light";
  onMount(setupAll);
</script>

<button class="btn">CTA</button>
```

### Astro / Next.js / SvelteKit

CSS-Import in der Entry-Datei. Achsen auf dem Dokument-`<html>` setzen
(Astro/SvelteKit-Layout, Next `app/layout`). `setupAll()` nur in einem
client-only-Hook.

---

## Theme Generator

HEX → 11-Step-OKLCH-Skala mit Color-Blind-Safety-Check und CSS-Export.
Im Katalog: [themes.html](https://gasserwerksolutions.github.io/DesignSystem/themes.html).

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
}
```

---

## Scripts

```bash
npm run lint:strict          # Theme-Contract inkl. destruktiver Mode-Tokens
npm run test:lint            # Lint regression tests (21 cases)
npm run check:contrast       # 1008 WCAG-AA Paare (6×4×kritisch + nested)
npm run check:a11y           # axe-core lint + self-test mutations
npm run check:visual         # VRT — 12 baselines + 3 sensitivity-suite
npm run check:journeys       # Puppeteer user flows (7 journeys)
npm run check:rendered       # axe + VRT + Journeys parallel
npm run check:examples       # 4 Beispiele × 5 Viewports, Assets + Overflow
npm run check:profiles       # Builder-Manifest, Hash und Größenbudget
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

- **57 Components**
- **275 Design Tokens** (DTCG-konform exportiert in `dist/tokens.json`)
- **23.9 KB** gzipped (Vollprofil)
- **9.5 KB** gzipped (kuratiertes Builder-Profil)
- **7 Tones × 2 Modes × 3 Densities × Container-Queries**
- **1008** WCAG-AA-Paare verifiziert
