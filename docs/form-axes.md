# Form axes (CSS contract)

Three independent choices, usable on `<html>` or a subtree:

```html
<div data-space="normal" data-shape="defined" data-weight="fine">...</div>
```

| Axis | Values | Responsibility |
| --- | --- | --- |
| `data-space` | `normal`, `wide` | Gaps, padding, section rhythm (public naming) |
| `data-shape` | `defined`, `soft` | Corner radii of controls, surfaces and media |
| `data-weight` | `fine`, `strong` | Physical stroke widths; not font-weight |

The spacing scale is deliberately an everyday website range rather than an
"extra tight" mode. **Normal** is the comfortable baseline; **Wide** adds room
between content blocks. Both preserve the proximity hierarchy (gap between
independent groups roughly twice the gap within one group).

| Spacing token | Normal | Wide |
| --- | ---: | ---: |
| Outer inline padding | 16px | 24px |
| Internal component gap | 8px | 16px |
| Layout gap between groups | 16px | 32px |
| Component padding | 16px | 32px |
| Section rhythm | 48px | 96px |

Pixel values are based on a 16px browser root size; the CSS uses rem-backed
shared tokens, not hardcoded pixels. Breakpoints, content density, legibility,
and individual components may require opt-in overrides. These values are
**presets**, not a continuous slider implementation.

For compatibility, `compact` remains an alias of `normal`, and `spacious`
remains an alias of `wide`. Existing generated sites keep their output.
New builder controls should show **Normal – Wide** and emit the new values;
renderer contracts can migrate independently with tests.

There is no color or motion coupling. Brand colors and color modes remain separate.
Absence of attributes preserves the current semantic defaults.

Contract consumers:
- Layout: `--layout-gap`, `--component-gap`, `--space-inline`, `--space-block`, `--space-section`
- Panels: `--component-padding`, `--shape-surface`
- Controls: `--control-px`, `--control-py`, `--shape-control`
- Media: `--shape-media`
- Strokes: `--stroke-default`, `--stroke-emphasis`

Explicit per-component overrides remain possible. Legacy `data-tone` is not removed in this change and can still set other CSS properties. `data-density` continues to serve legacy consumers while the new space axis overrides mapped control tokens where specified.

The form scopes are imported in both `main.css` and `profiles/builder.css`, in the mode cascade layer after theme layers.
