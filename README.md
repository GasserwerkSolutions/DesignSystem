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

### Combobox in Formularen

Ein optionales Hidden-Input im Combobox-Root bekommt den gewählten Wert
(`data-value` der Option, sonst das Label) und feuert `input` + `change`.
Der Root feuert zusätzlich `combobox:change`:

```html
<div class="combobox">
  <button class="combobox__trigger" popovertarget="svc-panel">…</button>
  <input type="hidden" class="combobox__input" name="service">
  <div class="combobox__panel" id="svc-panel" popover>…</div>
</div>
```

```js
combobox.addEventListener("combobox:change", (e) => {
  console.log(e.detail.value, e.detail.label);
});
```

### Popover-Positionierung

`setupPopover` und `setupCombobox` halten das Panel im Viewport: Flip nach
oben, wenn unten kein Platz ist, horizontale Begrenzung auf schmalen Screens,
Nachführen bei Scroll und Resize. Das Panel trägt `data-placement="top|bottom"`.

### Theme-Toggle ohne Aufblitzen und mehrsprachig

Der gespeicherte Modus greift vor dem ersten Paint, wenn dieses Snippet im
`<head>` vor dem Stylesheet steht (identisch als `THEME_INIT_SNIPPET`
exportiert, z.B. für SSR oder CSP-Hashes):

```html
<script>try{var m=localStorage.getItem("ds-mode");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-mode",m)}catch(e){}</script>
```

Das `aria-label` folgt `<html lang>` (de, fr, it, en). Eigene Texte per
Attribut oder Option:

```html
<button data-theme-toggle data-label-dark="Dunkle Ansicht" data-label-light="Helle Ansicht"></button>
```

```js
setupThemeToggle(document, { labels: { toDark: "Dunkel", toLight: "Hell" } });
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
| **Tone** | trust, playful, premium, industrial, modern, minimal, musikraum, earth | `<html data-tone="trust">` | Brand-Identität |
| **Mode** | light, dark, auto | `<html data-mode="dark">` | Light/Dark/System |
| **Density** | comfortable, compact, spacious | `<html data-density="compact">` | Touch vs Desktop |
| **Container** | inline-size queries | `<div class="cq">…</div>` | Component reagiert auf Container, nicht Viewport |

Achsen sind **orthogonal** — jede Kombination funktioniert (über 100 Modi
× Tones validiert, 1728 WCAG-AA-Paare im static-Contrast-Check). Die Tone-Liste
aller Gates wird aus den Theme-Imports in `main.css` gelesen — ein neuer Tone
läuft automatisch durch Kontrast- und Visual-Checks.

`musikraum` ist ein Marken-Tone (warme Papier- und Holzflächen, Serif-Headlines).
`earth` ist der Handwerks-Tone (helles Papier, dunkle Tinte, Sandakzent, serifenlos), gedacht für Holzbau- und Projektseiten.
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
npm run check:contrast       # 1728 WCAG-AA Paare (8×4×kritisch + nested)
npm run check:a11y           # axe-core lint + self-test mutations
npm run check:visual         # VRT — 18 baselines + 3 sensitivity-suite
npm run check:journeys       # Puppeteer user flows (12 journeys)
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
- **1728** WCAG-AA-Paare verifiziert
