# Design System Quality Review Checklist

This checklist defines the next review gate for the generated documentation site and the website-pattern extension.

The goal is not to verify that examples render once. The goal is to prove that the system behaves like a reusable design-system product: stable tokens, documented contracts, responsive layouts, dark-mode parity, keyboard interaction, and Pages-safe navigation.

## 1. Token visual consistency

Review whether semantic tokens produce one coherent visual language across all tones.

Check:

- surfaces, borders and shadows remain legible across light and dark mode
- interactive colors feel related across button, link, form, badge and alert components
- spacing rhythm is consistent between cards, forms, lists and documentation chrome
- typography hierarchy remains stable across all generated pages
- density changes do not destroy component proportions

Evidence:

- `npm run check:contrast`
- `npm run check:contrast:browser`
- `npm run check:visual`
- manual scan of `index.html`, `foundations.html`, `themes.html`, `recipes.html` and selected component pages

## 2. Responsive behavior

Review the documentation site at narrow, medium and wide widths.

Viewport set:

- 360 px mobile
- 768 px tablet
- 1280 px desktop
- 1440 px wide desktop

Check:

- top navigation remains reachable
- sidebar does not cover content
- component examples do not overflow horizontally unless explicitly scrollable
- grids collapse cleanly
- container-query examples adapt to their container, not only to viewport width
- website patterns remain usable without layout-specific overrides

Evidence:

- `npm run check:site`
- manual browser pass with devtools viewport presets

## 3. Dark mode parity

Every documented component must remain usable in dark mode.

Check:

- text contrast remains AA
- focus rings remain visible
- cards and nested surfaces still separate from the page background
- overlays remain readable above the rest of the surface
- status colors remain clear without becoming alarmist

Evidence:

- `npm run check:contrast:browser`
- `npm run check:a11y`
- manual dark-mode scan of representative pages

## 4. Keyboard navigation

Interactive documentation must work without pointer input.

Check:

- tab order starts in the top bar and proceeds predictably
- skip links work
- theme, mode and density controls are reachable
- mega menu opens, closes and returns focus predictably
- dialogs, drawers, popovers and command palette preserve focus contracts
- examples remain copyable/editable through keyboard interaction

Evidence:

- `npm run check:a11y`
- `npm run check:journeys`
- manual keyboard pass through representative pages

## 5. Reusable contracts, not just examples

A component page is complete only if it documents the reusable contract, not just a rendered HTML snippet.

Check:

- every component with custom properties exposes them in the parsed contract table
- required and optional tokens are separated
- modifiers have working previews
- ARIA expectations are present for interactive components
- examples use stable class names, not project-specific naming
- website patterns use neutral terminology such as `service-card`, `trustbar`, `editorial-split`, `cta-band`

Evidence:

- generated component pages
- `npm run build:site`
- `npm run check:site`

## 6. Pages URL and asset safety

The generated site must work when `dist/site` is published as the GitHub Pages root.

Check:

- every generated HTML file resolves its CSS from `assets/ds/main.css`
- nested pages resolve scripts and styles with the correct relative prefix
- internal links point to existing generated files
- `.nojekyll` is present in the deployed artifact
- no link points outside the published site unless intentionally external

Evidence:

- `npm run build:site`
- `npm run check:site:links`
- GitHub Actions Pages deployment

## Release gate

Before calling the documentation site production-ready, run:

```bash
npm run lint
npm run test:lint
npm run check:contrast
npm run check:contrast:browser
npm run check:a11y
npm run check:site:links
npm run build:site
npm run check:site
npm run measure:check
```
