// The answers the app keeps ({ s01: 'yes' | 'no' | 'unsure' }) and how they
// reach scoring. Run with: node --test tests/
// The rule under test: "Not sure" counts exactly like "Never". It is stored
// (so going back shows it) but never passed to score() as admitted.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  score, questionOrder, cleanAnswers, admittedIds, unsureCount,
  ANSWER_VALUES, UNSURE_MANY, UI_KEYS
} = require('../scoring.js');

require('../content.js');
const content = globalThis.APT_CONTENT;
const ORDER = questionOrder(content);

test('answers: the three values, and the "many" threshold', () => {
  assert.deepStrictEqual(ANSWER_VALUES, ['yes', 'no', 'unsure']);
  assert.strictEqual(UNSURE_MANY, 8);
});

test('cleanAnswers: keeps yes, no and unsure for real statements', () => {
  const saved = { s01: 'yes', s11: 'no', s21: 'unsure' };
  assert.deepStrictEqual(cleanAnswers(saved, content), saved);
});

test('cleanAnswers: an older v2 save (yes / no only) loads unchanged', () => {
  const saved = { s01: 'yes', s02: 'no', s50: 'yes' };
  assert.deepStrictEqual(cleanAnswers(saved, content), saved);
});

test('cleanAnswers: drops unknown ids, unknown values and junk', () => {
  const saved = {
    s01: 'yes', s99: 'yes', s02: 'maybe', s03: true, s04: null, s05: 'UNSURE',
    constructor: 'yes', __proto__x: 'no', s06: 'unsure'
  };
  assert.deepStrictEqual(cleanAnswers(saved, content), { s01: 'yes', s06: 'unsure' });
  [null, undefined, 'yes', 42, ['s01'], true].forEach((junk) => {
    assert.deepStrictEqual(cleanAnswers(junk, content), {}, 'junk: ' + JSON.stringify(junk));
  });
});

test('admittedIds: only "yes" answers; unsureCount: only "unsure"', () => {
  const answers = { s01: 'yes', s02: 'unsure', s03: 'no', s04: 'yes', s05: 'unsure' };
  assert.deepStrictEqual(admittedIds(answers).sort(), ['s01', 's04']);
  assert.strictEqual(unsureCount(answers), 2);
  assert.deepStrictEqual(admittedIds({}), []);
  assert.deepStrictEqual(admittedIds(undefined), []);
  assert.strictEqual(unsureCount({}), 0);
  assert.strictEqual(unsureCount(undefined), 0);
});

// A small seeded random generator, so a failure can be replayed.
function rng(seed) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

test('scoring: "unsure" scores exactly like "no" (1,000 random players)', () => {
  const rand = rng(20261113);
  for (let p = 0; p < 1000; p++) {
    const answers = {};
    const asNever = {};
    ORDER.forEach((s) => {
      const r = rand();
      const value = r < 0.35 ? 'yes' : (r < 0.7 ? 'no' : 'unsure');
      answers[s.id] = value;
      asNever[s.id] = value === 'unsure' ? 'no' : value;
    });
    const a = score(admittedIds(answers), content);
    const b = score(admittedIds(asNever), content);
    assert.deepStrictEqual(a, b, 'player ' + p);
    // No unsure statement is ever evidence.
    a.evidenceIds.forEach((id) => assert.strictEqual(answers[id], 'yes', 'player ' + p + ' evidence ' + id));
  }
});

test('scoring: all 50 answered "unsure" is the same as all "no"', () => {
  const answers = {};
  ORDER.forEach((s) => { answers[s.id] = 'unsure'; });
  assert.deepStrictEqual(score(admittedIds(answers), content), score([], content));
  assert.strictEqual(score(admittedIds(answers), content).purity, 100);
  assert.strictEqual(unsureCount(answers), 50);
});

test('app.js: the player\'s answers reach scoring only through admittedIds', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  // yesIds() is the one place that turns stored answers into admitted ids...
  assert.match(src, /function yesIds\(\) \{\s*return scoring\.admittedIds\(state\.answers\);\s*\}/);
  // ...and nothing hands the raw answers object to score().
  assert.doesNotMatch(src, /scoring\.score\(\s*state\.answers/);
  // (no second, hand-rolled "yes" filter that could drift from admittedIds)
  assert.doesNotMatch(src, /state\.answers\[[a-z]+\] === 'yes'/);
  // Saved state is cleaned by the shared helper (tested above).
  assert.match(src, /scoring\.cleanAnswers\(saved\.answers, content\)/);
});

test('ui keys: the "not sure" keys exist in both languages', () => {
  ['answerUnsure', 'unsureNote', 'unsureMany', 'howUnsure'].forEach((key) => {
    assert.ok(UI_KEYS.includes(key), key + ' is in UI_KEYS');
    const entry = content.ui[key];
    assert.ok(entry && entry.en && entry.zh, key + ' has en and zh');
  });
  assert.ok(content.ui.unsureNote.en.includes('{n}') && content.ui.unsureNote.zh.includes('{n}'), 'unsureNote keeps {n}');
  // The middle button is small: keep its label short.
  assert.ok(content.ui.answerUnsure.en.length <= 10, 'answerUnsure en is short');
  assert.ok(Array.from(content.ui.answerUnsure.zh).length <= 4, 'answerUnsure zh is short');
  // The keyboard hint names the key app.js listens for.
  assert.ok(content.ui.keysHint.en.includes('↓') && content.ui.keysHint.zh.includes('↓'), 'keysHint mentions ↓');
});
