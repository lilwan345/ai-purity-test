// Checks the real content.js (not a fixture). Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { score, questionOrder, validateContent, validateProfiles, DIM_KEYS, TYPE_IDS, UI_KEYS } = require('../scoring.js');

// content.js is a classic browser script: it sets globalThis.APT_CONTENT.
require('../content.js');
const content = globalThis.APT_CONTENT;

test('content.js: validateContent finds no problems (apart from the result-screen copy, checked below)', () => {
  const profileProblems = new Set(validateProfiles(content));
  assert.deepStrictEqual(validateContent(content).filter((p) => !profileProblems.has(p)), []);
});

// The result-screen copy that scoring v2 added: dimension `reads`, type `why`,
// `signs`, `bestWith`, `bestWithLine`, `clashWith`, `clashWithLine`.
test('content.js: result-screen copy is complete (reads, why, signs, bestWith, clashWith)', () => {
  assert.deepStrictEqual(validateProfiles(content), []);
});

// Length guide for the result-screen copy, so it fits the result screen on a
// 360 px phone. Chinese is counted in characters.
test('content.js: result-screen copy stays within its length guide', () => {
  const len = (s) => Array.from(s).length;
  const tooLong = [];
  function check(where, pair, maxEn, maxZh) {
    if (len(pair.en) > maxEn) tooLong.push(where + ' (en ' + len(pair.en) + ' > ' + maxEn + ')');
    if (len(pair.zh) > maxZh) tooLong.push(where + ' (zh ' + len(pair.zh) + ' > ' + maxZh + ')');
  }
  content.dimensions.forEach((d) => {
    Object.keys(d.reads).forEach((band) => check(d.key + ' reads.' + band, d.reads[band], 80, 30));
  });
  content.types.forEach((t) => {
    t.signs.forEach((sign, i) => check(t.id + ' signs[' + i + ']', sign, 70, 28));
    check(t.id + ' bestWithLine', t.bestWithLine, 80, 30);
    check(t.id + ' clashWithLine', t.clashWithLine, 80, 30);
    check(t.id + ' why', t.why, 170, 60);
    assert.notStrictEqual(t.bestWith, t.clashWith, t.id + ': bestWith and clashWith are the same type');
  });
  assert.deepStrictEqual(tooLong, []);
});

test('content.js: every ui key that app.js reads exists in both languages', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  // Matches calls like t('appName') or t('progress', {...}); skips the
  // t('key', ...) example in the comment above the t() helper.
  const used = new Set();
  for (const match of appSource.matchAll(/\bt\('([A-Za-z]+)'/g)) {
    if (match[1] !== 'key') used.add(match[1]);
  }
  assert.ok(used.size > 20, 'expected to find the ui keys app.js uses');
  for (const key of used) {
    const entry = content.ui[key];
    assert.ok(entry, 'ui key "' + key + '" is missing from content.js');
    assert.ok(entry.en && entry.zh, 'ui key "' + key + '" needs both en and zh');
  }
  // And the other way round: no leftover keys that nothing shows any more.
  const unused = Object.keys(content.ui).filter((key) => !used.has(key));
  assert.deepStrictEqual(unused, [], 'ui keys in content.js that app.js never reads');
  // scoring.js's UI_KEYS list (what validateContent checks) matches too.
  assert.deepStrictEqual([...UI_KEYS].sort(), [...used].sort());
});

test('content.js: the quiz asks the real statements in mixed rounds', () => {
  const order = questionOrder(content);
  assert.strictEqual(order.length, 50);
  // The first five are the mildest statement of each dimension.
  assert.deepStrictEqual(order.slice(0, 5).map((s) => s.dim), DIM_KEYS);
  DIM_KEYS.forEach((key, i) => {
    assert.strictEqual(order[i], content.statements.find((s) => s.dim === key));
  });
  // No two neighbours share a dimension, so topics always mix.
  for (let p = 1; p < order.length; p++) assert.notStrictEqual(order[p].dim, order[p - 1].dim);
});

// Ticks `counts[i]` statements in dimension i. With flagsFirst the soulmate
// statements are picked first, otherwise they are picked last.
function ticksFor(counts, flagsFirst) {
  const ids = [];
  DIM_KEYS.forEach((key, i) => {
    const inDim = content.statements.filter((s) => s.dim === key);
    inDim.sort((a, b) => {
      const order = (a.flag === 'soulmate') - (b.flag === 'soulmate');
      return flagsFirst ? -order : order;
    });
    inDim.slice(0, counts[i]).forEach((s) => ids.push(s.id));
  });
  return ids;
}

test('content.js: all 14 types are reachable by some set of ticks', () => {
  const found = {};
  // Try every per-section count from 0 to 10 (11^5 combinations), once
  // avoiding the soulmate statements and once ticking them first.
  for (let n = 0; n < 161051; n++) {
    const counts = [];
    let rest = n;
    for (let d = 0; d < 5; d++) { counts.push(rest % 11); rest = Math.floor(rest / 11); }
    [false, true].forEach((flagsFirst) => {
      const ticked = ticksFor(counts, flagsFirst);
      const typeId = score(ticked, content).typeId;
      if (!found[typeId]) found[typeId] = ticked;
    });
    if (Object.keys(found).length === TYPE_IDS.length) break;
  }
  const missing = TYPE_IDS.filter((id) => !found[id]);
  assert.deepStrictEqual(missing, [], 'unreachable types: ' + missing.join(', '));
  // Double-check each example really scores as that type.
  TYPE_IDS.forEach((id) => assert.strictEqual(score(found[id], content).typeId, id));
});
