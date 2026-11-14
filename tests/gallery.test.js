// The "all types" grid: its order, the hidden type's unlock flag, and its
// interface text. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  score, drawStatements, admitByCounts, galleryOrder, earnedHidden, hiddenUnlocked, rememberHiddenUnlocked,
  HIDDEN_UNLOCK_KEY, DIM_KEYS, TYPE_IDS, UI_KEYS
} = require('../scoring.js');

require('../content.js');
const content = globalThis.APT_CONTENT;
const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// A stand-in for window.localStorage.
function fakeStorage() {
  const data = {};
  return {
    data: data,
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); }
  };
}
// Storage that refuses everything, like a blocked or private-mode browser.
const brokenStorage = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('QuotaExceededError'); }
};

test('galleryOrder: every type exactly once, sections in pairs, the hidden type last', () => {
  const order = galleryOrder();
  const all = order.sections.concat(order.special);
  assert.strictEqual(all.length, TYPE_IDS.length);
  assert.deepStrictEqual([...all].sort(), [...TYPE_IDS].sort());
  // Two per section, in section order, light before deep.
  assert.deepStrictEqual(order.sections, DIM_KEYS.flatMap((key) => [key + '_lite', key + '_deep']));
  assert.strictEqual(order.special[order.special.length - 1], 'soulmate');
  // Every id has a type in content.js.
  all.forEach((id) => assert.ok(content.types.some((t) => t.id === id), id + ' is in content.js'));
});

test('unlock flag: locked until remembered, then stays unlocked', () => {
  const storage = fakeStorage();
  assert.strictEqual(hiddenUnlocked(storage), false);
  assert.strictEqual(rememberHiddenUnlocked(storage), true);
  assert.strictEqual(hiddenUnlocked(storage), true);
  assert.deepStrictEqual(storage.data, { [HIDDEN_UNLOCK_KEY]: '1' }, 'only one flag is stored, no answers');
  // Remembering again changes nothing.
  rememberHiddenUnlocked(storage);
  assert.strictEqual(hiddenUnlocked(storage), true);
  // Anything other than '1' under the key does not count.
  const odd = fakeStorage();
  odd.setItem(HIDDEN_UNLOCK_KEY, 'true');
  assert.strictEqual(hiddenUnlocked(odd), false);
});

test('unlock flag: missing or blocked storage means locked, never an error', () => {
  [null, undefined, brokenStorage].forEach((storage) => {
    assert.strictEqual(hiddenUnlocked(storage), false);
    assert.strictEqual(rememberHiddenUnlocked(storage), false);
  });
});

test('earnedHidden: the hidden result, or merged with it as the secondary', () => {
  // The hidden rule on a real draw: all six Bond statements shown, plus at
  // least one extreme Heart statement.
  const drawn = drawStatements(content, 'abc123');
  const play = (counts) => score(admitByCounts(content, drawn, counts), content, drawn);
  const soulmate = play({ bond: [2, 2, 2], heart: [0, 0, 1] });
  assert.strictEqual(soulmate.typeId, 'soulmate');
  assert.strictEqual(earnedHidden(soulmate), true);

  // Everything admitted: merged, with the hidden type as its secondary.
  const everything = score(drawn, content, drawn);
  assert.strictEqual(everything.typeId, 'merged');
  assert.strictEqual(everything.secondaryTypeId, 'soulmate');
  assert.strictEqual(earnedHidden(everything), true);

  // Everything except one extreme Bond statement: merged, but not earned.
  const all = { school: [2, 2, 2], work: [2, 2, 2], heart: [2, 2, 2], brain: [2, 2, 2] };
  const allButOne = play(Object.assign({ bond: [2, 2, 1] }, all));
  assert.strictEqual(allButOne.typeId, 'merged');
  assert.strictEqual(earnedHidden(allButOne), false);

  // A full Bond section without an extreme Heart statement is not enough.
  assert.strictEqual(earnedHidden(play({ bond: [2, 2, 2], heart: [2, 2, 0] })), false);
  assert.strictEqual(earnedHidden(score([], content, drawn)), false);
  assert.strictEqual(earnedHidden(null), false);
});

test('app.js: only a real result unlocks the hidden card, never a preview or a peek', () => {
  assert.match(appSource, /if \(!isSample && scoring\.earnedHidden\(result\)\) scoring\.rememberHiddenUnlocked\(deviceStorage\(\)\);/);
  assert.strictEqual(appSource.split('rememberHiddenUnlocked(').length - 1, 1, 'remembered in exactly one place');
  // ?types=1 opens the grid.
  assert.match(appSource, /params\.get\('types'\) === '1'/);
});

test('ui keys: the "all types" text exists in both languages and stays short where it must', () => {
  const keys = UI_KEYS.filter((key) => key.startsWith('types') && key !== 'typesTeaser');
  assert.ok(keys.length >= 15, 'expected the types* keys in UI_KEYS');
  const len = (s) => Array.from(s).length;
  keys.forEach((key) => {
    const entry = content.ui[key];
    assert.ok(entry && entry.en && entry.zh, key + ' has en and zh');
  });
  // The small top line on a grid card shares a ~130 px wide card with the
  // "You" tag on a 360 px phone.
  ['typesRuleUntouched', 'typesRuleBalanced', 'typesRuleMerged', 'typesHidden', 'typesLite', 'typesDeep'].forEach((key) => {
    assert.ok(len(content.ui[key].en) <= 24, key + ' en is short');
    assert.ok(len(content.ui[key].zh) <= 11, key + ' zh is short');
  });
  assert.ok(len(content.ui.typesYou.en) <= 4 && len(content.ui.typesYou.zh) <= 2, 'typesYou is a word');
  // The hint must not quote any statement.
  content.statements.forEach((s) => {
    assert.ok(!content.ui.typesLockedHint.en.includes(s.text.en), 'hint gives away ' + s.id);
    assert.ok(!content.ui.typesLockedHint.zh.includes(s.text.zh), 'hint gives away ' + s.id);
  });
  // Where a label names the number of types, it is the real number.
  ['typesLink', 'typesTitle'].forEach((key) => {
    ['en', 'zh'].forEach((lang) => {
      const digits = content.ui[key][lang].match(/\d+/);
      if (digits) assert.strictEqual(Number(digits[0]), TYPE_IDS.length, key + ' ' + lang + ' counts the types');
    });
  });
});

test('app.js: the hidden type stays locked everywhere until earned', () => {
  // No landing sticker shows its code and colour.
  const teaser = appSource.match(/const TEASER_TYPES = (\[[^\]]*\])/);
  assert.ok(teaser, 'TEASER_TYPES found');
  const teaserIds = JSON.parse(teaser[1].replace(/'/g, '"'));
  assert.ok(!teaserIds.includes('soulmate'), 'no hidden-type sticker on the landing page');
  teaserIds.forEach((id) => assert.ok(TYPE_IDS.includes(id), id + ' is a type'));
  // The grid, the pairing cards (MY-BOT gets on with it) and peekAt all ask
  // the same helper, so no card or link can open it early.
  assert.match(appSource, /const hiddenOpen = hiddenOpenNow\(\);/);
  assert.match(appSource, /if \(otherId === 'soulmate' && !hiddenOpenNow\(\)\) \{/);
  assert.match(appSource, /if \(typeId === 'soulmate' && !hiddenOpenNow\(\)\) return;/);
  assert.ok(content.types.some((t) => t.bestWith === 'soulmate' || t.clashWith === 'soulmate'),
    'some type pairs with the hidden one (otherwise this check is moot)');
});

// The sample players (?preview= and the peek) are band counts in app.js
// (SAMPLE_COUNTS), turned into ids on whatever the play drew. Read that
// object straight from the source: it is plain data on purpose.
function sampleCounts() {
  const match = appSource.match(/const SAMPLE_COUNTS = (\{[\s\S]*?\n {2}\});/);
  assert.ok(match, 'SAMPLE_COUNTS found in app.js');
  const literal = match[1].replace(/\/\/[^\n]*/g, ''); // drop the comments
  return new Function('return ' + literal)();
}

test('app.js: every sample player scores as its own type on any draw, never by lot', () => {
  const samples = sampleCounts();
  assert.deepStrictEqual(Object.keys(samples).sort(), [...TYPE_IDS].sort(), 'one sample per type');
  for (let i = 0; i < 300; i++) {
    const drawn = drawStatements(content, 'p' + String(i).padStart(5, '0'));
    TYPE_IDS.forEach((typeId) => {
      const result = score(admitByCounts(content, drawn, samples[typeId]), content, drawn);
      assert.strictEqual(result.typeId, typeId, typeId + ' sample on draw ' + i);
      // A sample decided by lot could change type from one draw to the next.
      assert.notStrictEqual(result.tieBreak, 'lot', typeId + ' sample needs the lot on draw ' + i);
    });
  }
});

// The merged sample must not unlock or show the hidden type (it would put
// the locked PLUS-1 on its card as the "Also" chip).
test('app.js: the merged sample (preview and peek) does not earn the hidden type', () => {
  const merged = sampleCounts().merged;
  for (let i = 0; i < 100; i++) {
    const drawn = drawStatements(content, 'q' + String(i).padStart(5, '0'));
    const result = score(admitByCounts(content, drawn, merged), content, drawn);
    assert.strictEqual(result.typeId, 'merged');
    assert.strictEqual(earnedHidden(result), false, 'draw ' + i);
  }
});

test('the merged sample counts (persona "Nearly everything, drew the line at love") never earn the hidden type', () => {
  const { PERSONAS } = require('../tools/personas.js');
  const persona = PERSONAS.find((p) => p.name === 'Nearly everything, drew the line at love');
  for (let i = 0; i < 50; i++) {
    const drawn = drawStatements(content, 'm' + String(i).padStart(5, '0'));
    const result = score(admitByCounts(content, drawn, persona.counts), content, drawn);
    assert.strictEqual(result.typeId, 'merged');
    assert.strictEqual(earnedHidden(result), false);
  }
});
