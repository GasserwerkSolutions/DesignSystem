# Form axes (CSS contract)

Three independent choices, usable on `<html>` or a subtree:

```html
<div data-space="compact" data-shape="defined" data-weight="fine">...</div>
```

| Axis | Values | Responsibility |
| --- | --- | --- |
| `data-space` | `compact`, `spacious` | Gaps, padding, section rhythm |
| `data-shape` | `defined`, `soft` | Corner radii of controls, surfaces and media |
| `data-weight` | `fine`, `strong` | Physical stroke widths; not font-weight |

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
