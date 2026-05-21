# Design System

Contract-based Multi-Tone CSS Design-System. 6 Themes, Dark-Mode, 33 Components, WCAG AA validated.

```html
<link rel="stylesheet" href="main.css">
<body data-tone="trust" data-mode="light">
  <button class="btn">Call to action</button>
</body>
```

---

## Core Principles

1. **Contract-based** — Components define required/optional Tokens. Themes set only Tokens, never Selectors. Enforced via Lint.
2. **`@layer`-deterministic cascade** — `reset < tokens < semantic < themes < base < state < components`. Priority is spec-level, not convention.
3. **Tone × Mode matrix** — 6 Tones (Trust, Playful, Premium, Industrial, Modern, Minimal) × 2 Modes (Light, Dark). Nestable (`premium` inside `trust`).
4. **A11Y by construction** — WCAG AA contrast verified per Theme × Token-Pair. `prefers-reduced-motion`, `prefers-contrast`, `forced-colors` supported.
5. **Zero runtime** — Pure CSS. No framework dependency. Works with any stack.

---

## Usage

### Install

```bash
npm install @gasserwerksolutions/design-system
```

Or include directly:

```html
<link rel="stylesheet" href="https://unpkg.com/@gasserwerksolutions/design-system/main.css">
```

### Activate a Theme

```html
<html data-tone="trust">
  <body>
    <h1>Das ist Trust</h1>
    <button class="btn">Action</button>
  </body>
</html>
```

Available tones: `trust`, `playful`, `premium`, `industrial`, `modern`, `minimal`.

### Dark Mode

```html
<html data-mode="dark">  <!-- oder "light" oder weglassen für Auto -->
```

Without `data-mode`, the System respects `prefers-color-scheme`. `data-mode="light"` explicitly opts out of Auto-Dark.

### Nested Scoping

```html
<body data-tone="trust">
  <main>
    <div data-tone="premium">
      <!-- This section is premium, rest of page stays trust -->
      <h2>Premium Feature</h2>
      <button class="btn">Upgrade</button>
    </div>
  </main>
</body>
```

---

## Architecture

```
tokens/           Primitive values (rem-based, fluid typography)
semantic/         Meaning mapping (--color-interactive, --card-bg, ...)
  dark.css        Dark-mode orthogonal overrides
themes/           6 tones, each setting only tokens
base/             Reset, Typography, Layout, Print
state/            Global interaction defaults, prefers-* media queries
components/       33 components — each a contract (tokens in) + selectors (CSS out)
scripts/          Lint, Contrast-Check, Token-Export, Type-Generator
dist/             Generated — tokens.json (W3C DTCG) + tokens.d.ts
```

### Layer Order

```css
@layer reset, tokens, semantic, themes, base, state, components;
```

- `reset` has lowest priority — any rule overrides browser defaults
- `components` wins against `state` — themed Buttons beat generic `button:hover`
- `themes` only override Tokens, never Selectors (enforced by Lint)

---

## Components

**Foundation**: Button, Button-Group, Card, Section, Badge, Stat, Nav (sidebar/topbar), Callout, Steps, Table

**Layout**: List-Row, Funnel, Stack, Grid, Container

**Form**: Checkbox, Radio, Field, Input, Search, Range-Slider

**Overlay**: Modal, Drawer, Popover, Tooltip

**Content**: Tabs, Accordion, Breadcrumbs, Pagination

**Feedback**: Empty-State, Skeleton, Spinner, Toast, Progress, Trend

**Data**: Avatar, Code-Block, Panel-List, Divider, Banner

See [index.html](./index.html) for live demos of every component.

---

## Scripts

```bash
npm run lint              # Contract-Enforcement (Themes only set tokens)
npm run check:contrast    # WCAG AA for each Theme × critical pair
npm run check             # lint + contrast
npm run build:tokens      # dist/tokens.json (W3C DTCG format)
npm run build:types       # dist/tokens.d.ts (TypeScript unions)
npm run build             # tokens + types
npm run dev               # npx serve for local preview
```

### Example Lint Output

```
[ok]   industrial.css
[ok]   minimal.css
[ok]   modern.css
[ok]   playful.css
[ok]   premium.css
[ok]   trust.css

Alle Themes erfüllen den Contract.
```

### Example Contrast-Check Output

```
=== premium ===
  [ok]   body-text on body-bg: 17.57:1  (threshold 4.5:1)  #0f0f0f / #f5f5f4
  [ok]   secondary-text on body-bg: 9.50:1  (threshold 4.5:1)  #404040 / #f5f5f4
  [ok]   body-text on card-bg: 19.17:1  (threshold 4.5:1)  #0f0f0f / white
```

---

## Creating a Theme

Themes are pure Token-Overrides scoped via `[data-tone~="…"]`. No selectors allowed:

```css
/* themes/sunset.css */
[data-tone~="sunset"] {
  --color-interactive:       #f97316;
  --color-interactive-light: #ffedd5;
  --color-interactive-dark:  #9a3412;

  --heading-font:        "Crimson Pro", Georgia, serif;
  --heading-weight:      600;
  --h1-letter:           -0.01em;

  --btn-bg:           #f97316;
  --btn-bg-hover:     #ea580c;
  --btn-radius:       var(--radius-8);
  --btn-hover-motion: translateY(-1px);
}
```

Then:

```css
/* main.css */
@import "./themes/sunset.css" layer(themes);
```

Run `npm run lint` — if your Theme has any selector other than `[data-tone~="sunset"]`, it fails.

---

## Creating a Component

Every component has a **Contract**: the Tokens a Theme may override. Tokens with fallbacks are optional; without fallback are required.

```css
/* components/chip.css */
/**
 * CONTRACT:
 *   Required: --chip-bg, --chip-fg
 *   Optional: --chip-radius, --chip-px, --chip-py
 */
.chip {
  display: inline-flex;
  gap: var(--space-xs);
  padding: var(--chip-py, var(--space-2)) var(--chip-px, var(--space-8));
  background: var(--chip-bg);
  color: var(--chip-fg);
  border-radius: var(--chip-radius, var(--radius-full));
  font-size: var(--font-xs);
}
```

Add defaults in `semantic.css`:

```css
--chip-bg: var(--color-interactive-light);
--chip-fg: var(--color-interactive-dark);
```

Themes override only what they care about:

```css
[data-tone~="industrial"] {
  --chip-radius: 0;
}
```

---

## Accessibility

- **WCAG AA contrast** validated via `npm run check:contrast` for every Theme × critical pair (primary/secondary text on background, text on card).
- **`prefers-reduced-motion`** globally disables animations.
- **`prefers-contrast: more`** boosts borders and text colors.
- **`forced-colors: active`** (Windows HCM) — Focus-Ring uses `Highlight`, components inherit system borders.
- **`prefers-reduced-data`** drops shadows and background-images.
- **Skip-to-Content** link pattern in demo.
- Logical properties (`padding-inline`, `margin-block`) → RTL-ready.

---

## TypeScript

Auto-generated `dist/tokens.d.ts` exposes:

```ts
import type { TokenName, ColorToken, Tone, Mode } from "@gasserwerksolutions/design-system/dist/tokens";

const tone: Tone = "trust";
const style: Record<Exclude<TokenName, never>, string> = {
  "--color-bg": "white",
  // ... autocomplete for all 221 tokens
};
```

---

## Browser Support

Modern browsers: Chrome 114+, Firefox 115+, Safari 16.4+.

Uses: `@layer`, `color-mix(in oklch, …)`, `:has()`, `text-wrap: balance`, `content-visibility`, CSS nesting in some examples.

Graceful degradation — older browsers lose progressive features (fluid typography falls back to min size, color-mix requires polyfill, etc.) but core styling remains intact.

---

## License

[MIT](./LICENSE)
