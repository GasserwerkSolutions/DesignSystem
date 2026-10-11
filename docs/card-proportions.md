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
  <div class="card-slot">
    <article class="card card--content-fit card--fluid-pad">
      <div class="card__header"><span>Kategorie</span><h3>Leistung</h3></div>
      <div class="card__body"><p>Kurzbeschreibung mit passender Länge.</p></div>
      <div class="card__footer"><a href="/leistungen">Mehr erfahren</a></div>
    </article>
  </div>
</section>
```

The default `.card-grid--natural` uses CSS Grid `auto-fill` and a
minimum track of `17rem` (overridable with `--card-grid-min`), with
`align-items:start`. Cards take their intrinsic content height, so
the bottom edges need not align. This prevents a short card from
looking half empty. Last-row cards do not grow across the entire grid.

`.card--content-fit` uses Flexbox with meaningful gaps; the header
uses half of `--component-gap` (via `calc()`), while groups of content
use the semantic `--component-gap`. Text margins are reset **only**
for direct descendants of the designated card header/body wrappers.

**Containment contract:** `.card-slot { container: card-slot / inline-size; }`
wraps **one** card; the grid itself is not the cqi reference. The wrapper
gets its width from the CSS Grid track (or another definite available
width) and its **height from the card's content**. Never apply
`container-type: size` to a natural-height card. The container name
avoids silently picking an unrelated ancestor.

`.card--fluid-pad` is optional and only fluid **inside a named
`card-slot`**. At 16px root:

```css
.card--fluid-pad { padding: var(--space-16); } /* safe 16px fallback */
@container card-slot (min-width: 0px) {
  .card--fluid-pad {
    padding: clamp(var(--space-16), 6cqi,
                   var(--card-padding, var(--component-padding)));
  }
}
```

Because `cqi` on the Card refers to its **ancestor** container, attaching
`container-type: inline-size` directly to the Card would not let it
measure its own width for its own padding. On a 300px card slot, 6cqi is
18px; on 520px, it is 31.2px, both bounded above by the semantic
`--card-padding`. Without `.card-slot`, padding stays 16px.

Do not add `flex-grow` to normal content. Only comparison rows may
intentionally distribute spare height. Long unbroken content can wrap
through `overflow-wrap: anywhere` in named card content groups.

### Explicit comparison exception

```html
<div class="card-grid--natural card-grid--compare">
  <div class="card-slot">
    <article class="card card--content-fit card--action-aligned">
      <div class="card__body"><h3>Basis</h3><p>...</p></div>
      <div class="card__footer"><button>Wählen</button></div>
    </article>
  </div>
  <!-- More comparable plan cards -->
</div>
```

Comparison mode stretches the slot and its card to a shared row height. Only
`.card--action-aligned` pushes the action to the bottom; the default
content-first card keeps its footer next to its content.

## Keyboard focus and visible overflow

The default legacy `.card` currently has `contain: layout paint` for
render isolation. **Paint containment clips the visual focus outline** of
edge-aligned descendants even when the link itself still receives focus.
The Chromium screenshot regression reproduced this with zero magenta
outline pixels outside the card border.

For opt-in `.card--content-fit` we therefore explicitly use
`contain: layout` (without `paint`). This keeps the natural height and
layout isolation while allowing focus rings and other meaningful visual
affordances to extend beyond the box. It does not silently change
legacy cards: removing their paint containment requires a separate
compatibility review.

A cross-engine Chromium/WebKit fixture checks screenshot **pixels** as
well as DOM focus state, long unbroken words, intrinsic height and
horizontal overflow. Tests cannot establish accessibility from
`scrollWidth` alone, nor from `:focus` alone.

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
