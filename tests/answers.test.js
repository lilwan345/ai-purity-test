// The answers the app keeps ({ s01: 'yes' | 'no' | 'unsure' }) and how they
// reach scoring. Run with: node --test tests/
// The rule under test: "Not sure" counts exactly like "Never". It is stored
// (so going back shows it) but never passed to score() as admitted.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  score, drawStatements, cleanAnswers, admittedIds, unsureCount,
  ANSWER_VALUES, UNSURE_MANY, UI_KEYS
} = require('../scoring.js');

require('../content.js');
const content = globalThis.APT_CONTENT;
// One play: the 30 statements a fixed seed draws from the real bank.
const DRAWN = drawStatements(content, 'abc123');
const byId = Object.fromEntries(content.statements.map((s) => [s.id, s]));
const ORDER = DRAWN.map((id) => byId[id]);

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
    s01: 'yes', s999: 'yes', s02: 'maybe', s03: true, s04: null, s05: 'UNSURE',
    constructor: 'yes', __proto__x: 'no', s06: 'unsure'
  };
  assert.deepStrictEqual(cleanAnswers(saved, content), { s01: 'yes', s06: 'unsure' });
  [null, undefined, 'yes', 42, ['s01'], true].forEach((junk) => {
    assert.deepStrictEqual(cleanAnswers(junk, content), {}, 'junk: ' + JSON.stringify(junk));
  });
});

test('cleanAnswers: with the play\'s drawn ids, answers to statements outside the play are dropped', () => {
  const inPlay = DRAWN.slice(0, 3);
  const outOfPlay = content.statements.map((s) => s.id).find((id) => !DRAWN.includes(id));
  const saved = { [inPlay[0]]: 'yes', [inPlay[1]]: 'unsure', [inPlay[2]]: 'no', [outOfPlay]: 'yes', s999: 'yes' };
  assert.deepStrictEqual(cleanAnswers(saved, content, DRAWN), { [inPlay[0]]: 'yes', [inPlay[1]]: 'unsure', [inPlay[2]]: 'no' });
  // Without drawn ids, any real statement is kept (the old behaviour).
  assert.ok(outOfPlay in cleanAnswers(saved, content));
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
    const a = score(admittedIds(answers), content, DRAWN);
    const b = score(admittedIds(asNever), content, DRAWN);
    assert.deepStrictEqual(a, b, 'player ' + p);
    // No unsure statement is ever evidence.
    a.evidenceIds.forEach((id) => assert.strictEqual(answers[id], 'yes', 'player ' + p + ' evidence ' + id));
  }
});

test('scoring: all 30 answered "unsure" is the same as all "no"', () => {
  const answers = {};
  ORDER.forEach((s) => { answers[s.id] = 'unsure'; });
  assert.deepStrictEqual(score(admittedIds(answers), content, DRAWN), score([], content, DRAWN));
  assert.strictEqual(score(admittedIds(answers), content, DRAWN).purity, 100);
  assert.strictEqual(unsureCount(answers), 30);
});

test('app.js: the player\'s answers reach scoring only through admittedIds', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  // yesIds() is the one place that turns stored answers into admitted ids...
  assert.match(src, /function yesIds\(\) \{\s*return scoring\.admittedIds\(state\.answers\);\s*\}/);
  // ...and nothing hands the raw answers object to score().
  assert.doesNotMatch(src, /scoring\.score\(\s*state\.answers/);
  // (no second, hand-rolled "yes" filter that could drift from admittedIds)
  assert.doesNotMatch(src, /state\.answers\[[a-z]+\] === 'yes'/);
  // Saved state goes through the shared helper (resumePlay, tested below),
  // which cleans the answers against the play's own draw.
  assert.match(src, /scoring\.resumePlay\(saved, params\.get\('seed'\), content\)/);
  // Live purity, the result and the samples are all scored on the drawn set.
  assert.doesNotMatch(src, /scoring\.score\([^)]*content\)/, 'every score() call passes the drawn ids');
  // The 50-statement save is never read.
  assert.match(src, /const STORE_KEY = 'apt-state-v3';/);
});

// ---------- resumePlay: which play a tab shows when the page loads ----------
const { resumePlay, normalizeSeed } = require('../scoring.js');

test('resumePlay: nothing saved and no link seed gives a fresh seed and an empty play', () => {
  [null, undefined, 'junk', 42, [], {}].forEach((saved) => {
    const play = resumePlay(saved, null, content);
    assert.ok(normalizeSeed(play.seed), 'a valid seed for ' + JSON.stringify(saved));
    assert.strictEqual(play.drawn.length, 30);
    assert.deepStrictEqual(play.drawn, drawStatements(content, play.seed));
    assert.deepStrictEqual(play.answers, {});
    assert.strictEqual(play.screen, 'landing');
    assert.strictEqual(play.index, 0);
    assert.strictEqual(play.seedFromLink, false);
  });
  // The test hook gives a known seed.
  assert.strictEqual(resumePlay(null, null, content, 'zz9zz9').seed, 'zz9zz9');
});

test('resumePlay: a saved play comes back as it was (refresh, language switch)', () => {
  const answers = { [DRAWN[0]]: 'yes', [DRAWN[1]]: 'unsure', [DRAWN[2]]: 'no' };
  const saved = { seed: 'abc123', seedFromLink: false, answers, screen: 'question', index: 3 };
  const play = resumePlay(saved, null, content);
  assert.strictEqual(play.seed, 'abc123');
  assert.deepStrictEqual(play.drawn, DRAWN);
  assert.deepStrictEqual(play.answers, answers);
  assert.strictEqual(play.screen, 'question');
  assert.strictEqual(play.index, 3);
  // The same seed in the address changes nothing (the app keeps it there).
  assert.deepStrictEqual(resumePlay(saved, 'abc123', content), play);
  assert.deepStrictEqual(resumePlay(saved, ' ABC123 ', content), play);
});

test('resumePlay: a link with another seed wins, fresh, and remembers it came from a link', () => {
  const saved = { seed: 'abc123', answers: { [DRAWN[0]]: 'yes' }, screen: 'result', index: 29 };
  const play = resumePlay(saved, 'k3x9q0', content);
  assert.strictEqual(play.seed, 'k3x9q0');
  assert.deepStrictEqual(play.drawn, drawStatements(content, 'k3x9q0'));
  assert.deepStrictEqual(play.answers, {});
  assert.strictEqual(play.screen, 'landing');
  assert.strictEqual(play.seedFromLink, true);
  // After the app saves that play, a refresh keeps the "from a link" mark.
  const again = resumePlay({ seed: play.seed, seedFromLink: true, answers: {}, screen: 'landing', index: 0 }, 'k3x9q0', content);
  assert.strictEqual(again.seedFromLink, true);
});

test('resumePlay: an invalid link seed is ignored (saved play, or a fresh seed)', () => {
  ['', 'abc', 'abc1234', 'abc-12', '<script>', 123456, null].forEach((bad) => {
    assert.strictEqual(resumePlay({ seed: 'abc123' }, bad, content).seed, 'abc123', JSON.stringify(bad));
    const fresh = resumePlay(null, bad, content);
    assert.ok(normalizeSeed(fresh.seed));
    assert.strictEqual(fresh.seedFromLink, false);
  });
});

test('resumePlay: a save from the 50-statement version, or a broken save, is discarded safely', () => {
  // v2 had no seed: { answers, screen, index } over s01-s50 in a fixed order.
  const old = { answers: { s01: 'yes', s02: 'no', s30: 'yes' }, screen: 'result', index: 49 };
  const play = resumePlay(old, null, content);
  assert.deepStrictEqual(play.answers, {});
  assert.strictEqual(play.screen, 'landing');
  // A broken seed is no seed.
  assert.deepStrictEqual(resumePlay({ seed: 'NOPE!!', answers: old.answers }, null, content).answers, {});
});

test('resumePlay: answers outside the draw, bad positions and an unfinished "result" are repaired', () => {
  const outside = content.statements.map((s) => s.id).find((id) => !DRAWN.includes(id));
  const saved = {
    seed: 'abc123',
    answers: { [DRAWN[0]]: 'yes', [outside]: 'yes', [DRAWN[1]]: 'maybe' },
    screen: 'result', index: 99
  };
  const play = resumePlay(saved, null, content);
  assert.deepStrictEqual(play.answers, { [DRAWN[0]]: 'yes' });
  // Only one of 30 answered, so "result" goes back to the first open statement.
  assert.strictEqual(play.screen, 'question');
  assert.strictEqual(play.index, 1);
  // Junk screen and index fall back to the start.
  const junk = resumePlay({ seed: 'abc123', screen: 'gallery', index: 2.5 }, null, content);
  assert.strictEqual(junk.screen, 'landing');
  assert.strictEqual(junk.index, 0);
  // A finished play stays on its result.
  const all = Object.fromEntries(DRAWN.map((id) => [id, 'no']));
  assert.strictEqual(resumePlay({ seed: 'abc123', answers: all, screen: 'result', index: 29 }, null, content).screen, 'result');
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
