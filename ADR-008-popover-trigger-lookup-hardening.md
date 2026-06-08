# ADR-008 — Popover Trigger Lookup Hardening

## Status

Recommended.

## Context

Interactive patterns such as Popover and Combobox locate their trigger through the native `popovertarget` relationship. The current implementation interpolates `panel.id` directly into an attribute selector:

```ts
document.querySelector<HTMLElement>(`[popovertarget="${panel.id}"]`)
```

This works for simple IDs, but it is fragile for generated markup and CMS output. If an ID contains selector-sensitive characters, the lookup can throw a selector syntax error or fail to find the trigger. That is especially relevant for a website factory, where IDs may be generated from content labels, slugs, imported CMS entities or translated headings.

## Decision

Trigger lookup should be centralized and selector-safe.

Recommended implementation:

```ts
export function findPopoverTrigger(panel: HTMLElement): HTMLElement | null {
  if (!panel.id) return null;
  return document.querySelector<HTMLElement>(
    `[popovertarget="${CSS.escape(panel.id)}"]`
  );
}
```

Then use `findPopoverTrigger(panel)` in both:

- `js/anchor-popover.ts`
- `js/setup-popover.ts`

## Consequences

- Popover and Combobox behavior becomes safe for generated IDs.
- The selector construction lives in one small utility instead of being duplicated.
- Consumers can keep using native `popovertarget` markup.
- The implementation remains framework-independent and compatible with the existing CSS-first architecture.

## Follow-up check

Add a regression case with an ID such as:

```html
<button popovertarget="team:dr.med.meyer">Team öffnen</button>
<div id="team:dr.med.meyer" popover class="popover">...</div>
```

The test should assert that setup does not throw and that `aria-expanded` still syncs on open/close.
