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
  const marker = `[data-space="${name}"],`;
  const start = form.indexOf(marker);
  assert.ok(start >= 0, `missing primary space selector ${name}`);
  const block = form.slice(form.indexOf('{', start) + 1, form.indexOf('}', start));
  assert.ok(block.includes(`--space-inline: var(--space-${inline});`), `${name} inline spacing`);
  assert.ok(block.includes(`--layout-gap: var(--space-${layout});`), `${name} group spacing`);
  assert.ok(block.includes(`--component-gap: var(--space-${component});`), `${name} internal spacing`);
  assert.equal(Number(layout), 2 * Number(component), `${name} proximity hierarchy`);
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
