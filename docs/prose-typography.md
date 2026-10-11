# Website reading rhythm (opt-in)

Website paragraphs should not become full-width text walls. This contract
defines a readable **prose zone**, without changing cards, navigation, controls,
or existing generated sites that do not opt in.

## Usage

```html
<article class="prose">
  <h2>What matters to our customers</h2>
  <p>First paragraph of editorial website copy.</p>
  <p>Second paragraph of editorial website copy.</p>
  <h3>A useful subheading</h3>
  <p>The next paragraph is part of this topic.</p>
</article>
```

The `.prose` class is applied only when an editorial reading zone is intended.
Its rules target **direct children** (not nested component markup).
A page may use `.container--prose` for an editorial column and
`.prose` for the text rhythm within it. They are complementary:
`--prose-max` controls the optional outer column (70ch default);
`--prose-line-max` controls individual prose blocks (65ch default).

| Contract | Default | Reason |
| --- | --- | --- |
| Reading width | maximum 65ch | Limit long lines; responsive width remains fluid |
| Body line-height | 1.5 | Existing `--body-line-height` contract |
| Paragraph separation | 24px | Readable continuous text |
| Before H2/H3 | 48px | Separates topics |
| After H2/H3 | 12px | Connects heading to its next paragraph |

Sizes derive from the existing rem-based spacing scale (at 16px root).
`ch` measures the font's zero glyph width; **65ch does not guarantee
exactly 65 characters per line**. Test real fonts and word lengths.

This is **not** a global `p { max-width: 65ch }` rule: layout cards, nav,
buttons, labels and compact summaries keep their own contracts.
No hard minimum width is imposed, so paragraphs wrap naturally on phones.

## Editorial checks, separate from CSS

For longer content, review whether a descriptive H2/H3 is useful every
two to three substantial paragraphs; avoid formulaic headings for short text.
Use genuine lists, quotations or emphasis for scanning only when they
improve meaning. The content generator / editorial gate must make these
decisions, not CSS.

The `normal / wide` layout-spacing axis is independently versioned.
Changing overall whitespace must not silently change line-height, prose
line-length or the underlying business facts.

## Validation

`node scripts/check-prose-contract.js` checks the source contract without a browser.
`node scripts/check-prose-browser.js` verifies rendered CSS on desktop/mobile
using Puppeteer and the real DesignSystem imports.
