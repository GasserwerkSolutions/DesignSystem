const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const form = read('semantic/form.css');
const semantic = read('semantic/semantic.css');
for (const [axis, choices] of Object.entries({space:['compact','spacious'],shape:['defined','soft'],weight:['fine','strong']})) {
  for(const value of choices) assert.ok(form.includes(`[data-${axis}="${value}"]`), `${axis}=${value}`);
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
