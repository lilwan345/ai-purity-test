// Run with: node --test tests/
// Every persona in tools/personas.js, scored with the REAL content.js, must get
// exactly the type and secondary type a human agreed was right. If a rule change
// moves one of them, this fails: decide whether the new result is better, then
// update the persona's `expect` (and SCORING.md) on purpose.
const test = require('node:test');
const assert = require('node:assert');
const { score, TYPE_IDS } = require('../scoring.js');
const { PERSONAS } = require('../tools/personas.js');

require('../content.js');
const content = globalThis.APT_CONTENT;

test('personas: there are at least 16, with unique names and valid ids', () => {
  assert.ok(PERSONAS.length >= 16);
  assert.strictEqual(new Set(PERSONAS.map((p) => p.name)).size, PERSONAS.length);
  const known = new Set(content.statements.map((s) => s.id));
  PERSONAS.forEach((p) => p.ids.forEach((id) => assert.ok(known.has(id), p.name + ': unknown id ' + id)));
});

PERSONAS.forEach((p) => {
  test('persona "' + p.name + '" -> ' + p.expect.typeId + (p.expect.secondaryTypeId ? ' + ' + p.expect.secondaryTypeId : ''), () => {
    const r = score(p.ids, content);
    assert.strictEqual(r.typeId, p.expect.typeId);
    assert.strictEqual(r.secondaryTypeId, p.expect.secondaryTypeId);
    // The evidence quoted back must be things this persona actually admitted.
    r.evidenceIds.forEach((id) => assert.ok(p.ids.includes(id)));
  });
});

test('personas: between them, every one of the 14 types comes up', () => {
  const got = new Set(PERSONAS.map((p) => score(p.ids, content).typeId));
  assert.deepStrictEqual(TYPE_IDS.filter((id) => !got.has(id)), []);
});
