// Run with: node --test tests/
// Every persona in tools/personas.js must get exactly the type and secondary
// type a human agreed was right, on EVERY draw: personas are written as band
// counts ("both mild School statements shown, one medium..."), and
// admitByCounts turns them into real ids for each draw. Checked over 300
// draws of the real content.js and 300 of a full-size bank.
// If a rule change moves one, this fails: decide whether the new result is
// better, then update the persona's `expect` (and SCORING.md) on purpose.
const test = require('node:test');
const assert = require('node:assert');
const { score, admitByCounts, drawStatements, TYPE_IDS, DIM_KEYS, STATEMENT_BANDS } = require('../scoring.js');
const { PERSONAS, playoffByCounts } = require('../tools/personas.js');
const { syntheticContent, seedStream } = require('../tools/sim-helpers.js');

require('../content.js');
const BANKS = [['real content.js', globalThis.APT_CONTENT], ['full-size bank', syntheticContent(7)]];
const DRAWS = 300;

test('personas: at least 16, unique names, counts are 0-2 per band of a known dimension', () => {
  assert.ok(PERSONAS.length >= 16);
  assert.strictEqual(new Set(PERSONAS.map((p) => p.name)).size, PERSONAS.length);
  PERSONAS.forEach((p) => {
    Object.keys(p.counts).forEach((dim) => {
      assert.ok(DIM_KEYS.includes(dim), p.name + ': unknown dimension ' + dim);
      assert.strictEqual(p.counts[dim].length, STATEMENT_BANDS.length, p.name + ': ' + dim + ' needs [mild, medium, extreme]');
      p.counts[dim].forEach((n) => assert.ok([0, 1, 2].includes(n), p.name + ': ' + dim + ' count ' + n));
    });
    assert.ok(p.expect.lot || TYPE_IDS.includes(p.expect.typeId), p.name + ': expect a type or a lot');
  });
});

PERSONAS.forEach((p) => {
  const label = p.expect.lot ? 'lot between ' + p.expect.lot.join(' and ')
    : p.expect.typeId + (p.expect.secondaryTypeId ? ' + ' + p.expect.secondaryTypeId : '');
  test('persona "' + p.name + '" -> ' + label + ', on every draw', () => {
    BANKS.forEach(([bank, content]) => {
      const seeds = seedStream('persona-test|' + p.name);
      const lotWinners = {};
      for (let i = 0; i < DRAWS; i++) {
        const drawn = drawStatements(content, seeds());
        const admitted = admitByCounts(content, drawn, p.counts);
        // A tie the 30 cannot settle goes to a play-off, answered the
        // persona's way (playoffByCounts in tools/personas.js).
        const first = score(admitted, content, drawn);
        const pa = first.playoff ? playoffByCounts(content, first.playoff.rounds, p.counts) : {};
        const r = score(admitted, content, drawn, null, pa);
        if (p.expect.lot) {
          // A mirror tie: level through all three play-off rounds, so one of
          // the two wins by this play's lot, the other is the secondary, and
          // the screen is told it was a lot.
          const k = p.expect.lot.indexOf(r.typeId);
          assert.ok(k !== -1, bank + ': got ' + r.typeId);
          assert.strictEqual(r.secondaryTypeId, p.expect.lot[1 - k]);
          assert.strictEqual(r.tieBreak, 'lot');
          assert.strictEqual(r.playoff.played, 3, 'the play-off was played to the end');
          lotWinners[r.typeId] = (lotWinners[r.typeId] || 0) + 1;
        } else {
          assert.strictEqual(r.typeId, p.expect.typeId, bank);
          assert.strictEqual(r.secondaryTypeId, p.expect.secondaryTypeId, bank);
          if (p.expect.playoff) {
            assert.strictEqual(r.tieBreak, 'playoff', bank);
            assert.strictEqual(r.playoff.decidedRound, p.expect.playoff, bank);
          }
        }
        // The evidence quoted back must be things this persona actually admitted.
        r.evidenceIds.forEach((id) => assert.ok(admitted.includes(id)));
        // And the same play always gives the same result.
        if (i < 5) assert.deepStrictEqual(score(admitted, content, drawn, null, pa), r);
      }
      if (p.expect.lot) {
        // Over 300 plays both sides win; 300 fair coin flips stay within 50% +- 10 points.
        p.expect.lot.forEach((typeId) => {
          const share = (lotWinners[typeId] || 0) / DRAWS;
          assert.ok(share > 0.4 && share < 0.6, bank + ': ' + typeId + ' won ' + share);
        });
      }
    });
  });
});

test('personas: between them, every one of the 14 types comes up', () => {
  const content = BANKS[0][1];
  const drawn = drawStatements(content, 'abc123');
  const got = new Set();
  PERSONAS.forEach((p) => {
    (p.expect.lot || [p.expect.typeId]).forEach((id) => got.add(id));
    got.add(score(admitByCounts(content, drawn, p.counts), content, drawn).typeId);
  });
  assert.deepStrictEqual(TYPE_IDS.filter((id) => !got.has(id)), []);
});
