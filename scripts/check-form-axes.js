const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const form = read('semantic/form.css');
const semantic = read('semantic/semantic.css');
for (const [axis, choices] of Object.entries({space:['normal','wide','compact','spacious'],shape:['defined','soft'],weight:['fine','strong']})) {
  for(const value of choices) assert.ok(form.includes(`[data-${axis}="${value}"]`), `${axis}=${value}`);
}
// Normal and Wide are the public endpoints. Old attribute values remain aliases.
// Values are semantic roles: related items need less space than independent groups.
for (const [name, inline, layout, component] of [
  ['normal', '16', '16', '8'],
  ['wide', '24', '32', '16'],
]) {
  const marker = `[data-space="${name}"]`;
  const start = form.indexOf(marker);
  assert.ok(start >= 0, `missing primary space selector ${name}`);
  const block = form.slice(form.indexOf('{', start) + 1, form.indexOf('}', start));
  assert.ok(block.includes(`--space-inline: var(--space-${inline});`), `${name} inline spacing`);
  assert.ok(block.includes(`--layout-gap: var(--space-${layout});`), `${name} group spacing`);
  assert.ok(block.includes(`--component-gap: var(--space-${component});`), `${name} internal spacing`);
  assert.equal(Number(layout), 2 * Number(component), `${name} proximity hierarchy`);
}
// The deprecated compact preset preserves its prior 12px outer + layout gap.
// It is deliberately not an alias of normal (16px), to avoid silent layout drift.
const oldStart = form.indexOf('[data-space="compact"]');
assert.ok(oldStart >= 0, 'missing legacy compact selector');
const oldBlock = form.slice(form.indexOf('{', oldStart) + 1, form.indexOf('}', oldStart));
for (const decl of [
  '--space-inline: var(--space-12);',
  '--layout-gap: var(--space-12);',
  '--component-gap: var(--space-8);',
]) assert.ok(oldBlock.includes(decl), `legacy compact changed: ${decl}`);

// Defined minimum from PR #15: all four shape roles start at 2px.
const defined = form.split('[data-shape="defined"] {')[1]?.split('}')[0];
assert.ok(defined, 'missing defined shape block');
for (const kind of ['control', 'surface', 'media', 'pill']) {
  assert.ok(defined.includes(`--shape-${kind}: var(--radius-2);`),
    `defined ${kind} must map to --radius-2`);
}

for (const p of ['main.css','profiles/builder.css']) assert.match(read(p), /semantic\/form\.css/);
for (const token of ['--layout-gap','--component-gap','--component-padding','--shape-control','--shape-surface','--shape-media','--stroke-default','--stroke-emphasis']) {
  assert.ok(semantic.includes(token), `missing default ${token}`);
}
for (const p of ['base/layout.css','components/card.css','components/button.css','patterns/hero.css','patterns/service-grid.css']) {
  assert.match(read(p), /--(?:layout-gap|component-gap|component-padding|shape-|stroke-)/, p);
}
assert.doesNotMatch(form, /--color-|--font-|--motion-|--duration-/);
console.log('OK: form axes structural contracts');
