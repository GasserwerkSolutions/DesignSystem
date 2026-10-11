# Cards follow content, not arbitrary height

## Principle

A card is the smallest visual enclosure necessary to present a coherent
piece of information. It should contain **enough** padding to avoid visual
crowding, but must not consume extra vertical space merely because the
adjacent card contains more text.

Content-first layout is the default recommendation for editorial/service,
team and blog cards. Uniform-height comparison grids are a deliberate
exception when users need to compare prices, benefits or equal action rows.

## Native building blocks

```html
<section class="card-grid--natural" aria-label="Leistungen">
  <article class="card card--content-fit card--fluid-pad">
    <div class="card__header"><span>Kategorie</span><h3>Leistung</h3></div>
    <div class="card__body"><p>Kurzbeschreibung mit passender Länge.</p></div>
    <div class="card__footer"><a href="/leistungen">Mehr erfahren</a></div>
  </article>
</section>
```

The default `.card-grid--natural` uses CSS Grid `auto-fill` and a
minimum track of `17rem` (overridable with `--card-grid-min`), with
`align-items:start`. Cards take their intrinsic content height, so
the bottom edges need not align. This prevents a short card from
looking half empty. Last-row cards do not grow across the entire grid.

`.card--content-fit` uses Flexbox with meaningful gaps; the header
uses the small shared space token `--space-8`, while groups of content
use the semantic `--component-gap`. Text margins are reset **only**
for direct descendants of the designated card header/body wrappers.

`.card--fluid-pad` is optional. Padding is bounded:
`clamp(var(--space-16), 2cqi, var(--card-padding, var(--component-padding)))`.
The `cqi` value reads from the nearest inline-size query container:
`.card-grid--natural` supplies one. This is **not** a content-length
sensor. It lets more generous layouts breathe while preserving semantic
Normal/Wide bounds from the spacing contract. It does not add empty
height to short cards.

### Explicit comparison exception

```html
<div class="card-grid--natural card-grid--compare">
  <article class="card card--content-fit card--action-aligned">
    <div class="card__body"><h3>Basis</h3><p>...</p></div>
    <div class="card__footer"><button>Wählen</button></div>
  </article>
  <!-- More comparable plan cards -->
</div>
```

Comparison mode stretches the cards to a shared row height. Only
`.card--action-aligned` pushes the action to the bottom; the default
content-first card keeps its footer next to its content.

## Quality gates

- Never set a general fixed `height` on a content card.
- Do not distribute arbitrary spare space between headline and
  explanation just to fill a tall card.
- Related label + title stays nearer than separate content groups.
- Reading line length and copy density require an editorial quality
  check; CSS cannot decide whether text is too short or excessively long.
- The outer grid should relate to the page margin through `--layout-gap`,
  but may not inflate a single card beyond a sensible track width.
- Do not apply equal-height behaviour to unrelated content.
- Check desktop and mobile for natural height, text wrapping and overflow.
- Comparison mode and fluid padding are opt-in, to protect existing sites.

### Versioning

This contract intentionally consumes existing `--component-gap`,
`--component-padding`, `--layout-gap` and `--space-*` values.
The proposed Normal/Wide spacing axis is tracked independently in PR #16;
do not merge global token changes into this card-specific PR.
