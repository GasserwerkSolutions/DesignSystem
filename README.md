# Design System

Contract-based Multi-Tone CSS Design-System. 6 Themes, Dark-Mode, Density-Achse, 29 Components, WCAG AA validated.

```html
<link rel="stylesheet" href="main.css">
<html data-tone="trust" data-mode="light" data-density="comfortable">
  <body>
    <button class="btn">Call to action</button>
  </body>
</html>
```

> **Wichtig:** `data-tone`, `data-mode` und `data-density` müssen auf demselben Element sitzen (idiomatisch: `<html>`). Sind sie auf verschiedenen Elementen, überschreibt das innere Element via Custom-Property-Vererbung das äußere — Dark-Mode greift dann nicht für tone-spezifische Token.

`data-density` ist optional; ohne Attribut gilt `comfortable`. Themes mit eigenen Sizing-Tokens (Premium, Playful, Industrial, Minimal) gewinnen über Density — Density-Achse wirkt auf alle anderen interaktiven Components und auf nicht-opinionated Themes (Trust, Modern).

---

## Core Principles

1. **Contract-based** — Components define required/optional Tokens. Themes set only Tokens, never Selectors. Enforced via Lint.
2. **`@layer`-deterministic cascade** — `reset < tokens < semantic < themes < mode < base < state < components`.
3. **Tone × Mode matrix** — 6 Tones × 2 Modes. Mode-Layer kommt nach Themes — Dark-Mode überschreibt destruktive Theme-Tokens (z. B. `--color-text-primary` in premium/industrial/minimal) zuverlässig.
4. **Nested Tone-Scopes funktionieren auch im Dark-Mode** — `dark.css`-Selektoren matchen auch verschachtelte Tone-Subtrees (`[data-mode="dark"] [data-tone]`). Sonst würden destruktive Theme-Tokens im nested Scope ohne Mode-Override gelten.
5. **A11Y by construction** — WCAG AA contrast verifiziert pro Theme × Mode × kritisches Paar, inklusive Nested-Tone-Kombinationen (336 Checks).

---

## Architecture

```
tokens/           Primitive values (rem-based, fluid typography)
semantic/         Meaning mapping (--color-interactive, --card-bg, ...)
  dark.css        Dark-mode orthogonal overrides — lebt im 'mode'-Layer
themes/           6 tones, each setting only tokens
base/             Reset, Typography, Layout, Print
state/            Global interaction defaults, prefers-* media queries
components/       29 components — each a contract (tokens in) + selectors (CSS out)
scripts/          Lint, Contrast-Check, Token-Export, Type-Generator
dist/             Generated — tokens.json (W3C DTCG) + tokens.d.ts
```

### Layer Order

```css
@layer reset, tokens, semantic, themes, mode, base, state, components;
```

**Warum `mode` nach `themes`?** Themes setzen Tone-Identität für Light-Mode (z. B. premium: `--color-text-primary: var(--gray-950)`). Ohne den Mode-Layer würde diese hart gesetzte Light-Farbe auch im Dark-Mode greifen — schwarz auf schwarz. Mode-Layer-Reihenfolge stellt sicher, dass Dark-Overrides gewinnen, ohne dass jedes Theme einen Dark-Block pflegen muss.

### Nested-Scope-Pattern in `dark.css`

Jede Mode-Rule in `dark.css` matched **zwei** Selektoren via Komma-Liste:

```css
[data-mode="dark"],
[data-mode="dark"] [data-tone] {
  --color-bg: var(--gray-950);
  /* ... */
}
```

Der zweite Selektor ist nötig, weil bei `<html data-mode="dark"><div data-tone="premium">` der nested `<div>` ein eigenes Custom-Property-Setup vom themes-Layer bekommt. Ohne den Descendant-Selektor würde der premium-Token (`--color-text-primary: var(--gray-950)` = fast schwarz) im Dark-Mode greifen — wieder schwarz auf schwarz. Der Lint prüft, dass jeder Mode-Selektor einen Descendant-Partner hat.

---

## Scripts

```bash
npm run lint                    # Contract + destruktive-Token-Warnung + nested-mode-coverage
npm run lint:strict             # destruktive Tokens als hard-fail
npm run check:contrast          # Static checker: 336 Tone×Mode×Pair Checks (inkl. nested)
npm run check:contrast:browser  # Browser checker: lädt index.html, klickt durch
npm run check:contrast:compare  # Beide + Diff
npm run check                   # lint + static
npm run check:full              # lint + static + browser
```

### Lint

Vier Checks:

1. **Selector-Contract (hard-fail):** Themes dürfen nur `[data-tone~="..."]` selektieren.
2. **Destruktive mode-sensitive Tokens (warn):** Themes, die Tokens setzen, die auch in `semantic/dark.css` stehen, werden gewarnt. Funktionieren nur wegen `mode`-Layer-Reihenfolge.
3. **Nested-Mode-Coverage (hard-fail):** Jeder `[data-mode="X"]`-Selektor in `dark.css` braucht einen `[data-mode="X"] [data-tone]`-Descendant-Partner. Sonst verlieren nested Tone-Scopes ihren Dark-Mode.
4. **Layout-Token-Verbot (hard-fail):** Themes dürfen `--container-max` nicht setzen. Custom-Property-Cascade verengt sonst jeden `.container` (auch UI-Chrome). Editorial-Verengung gehört in `--prose-max` + `.container--prose`. Siehe ADR-001.

### Static-Contrast-Checker

Liest Layer-Reihenfolge aus `main.css`, simuliert die Kaskade, resolved Token-References + `color-mix(in oklch, …)`. Prüft:

- **Root-Scope (96 Checks):** 6 Tones × 4 Modi (light/dark/auto-light/auto-dark) × 4 Pairs
- **Nested-Scope (240 Checks):** Jedes verschachtelte `<div data-tone="X">` innerhalb von jedem anderen Tone, in Light + Dark, × 4 Pairs

### Browser-Checker

Lädt die echte `index.html` in headless Chromium, klickt sich durch alle Theme-Buttons + Dark-Toggle, misst `getComputedStyle()` auf echten DOM-Elementen — inklusive der `.scoped-demo[data-tone~=premium]`-Section. Damit ist die Demo selbst Teil der Validierung: ändert jemand die DOM-Konvention falsch, schreit der Browser-Check.

---

## License

[MIT](./LICENSE)

---

## Architektur-Entscheidungen

- [ADR-001 — Container-Width-Inheritance bei tone-spezifischen Overrides](./ADR-001-container-max-inheritance.md)
