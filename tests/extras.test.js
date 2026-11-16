// extras.js: answer codes and the comparison, the AI's remarks, the
// collection; plus the card's footer line and the file versions in
// index.html. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const scoring = require('../scoring.js');
const extras = require('../extras.js');

require('../content.js');
const content = globalThis.APT_CONTENT;
const ROOT = path.join(__dirname, '..');
const { drawStatements, admitByCounts, score, makeGenerator, randomBelow, TYPE_IDS } = scoring;
assert.strictEqual(extras.REMARK_RULES.maxPerPlay, 6);
const {
  encodeAnswers, decodeAnswers, readCompareLink, comparePlays, remarkSchedule, remarkFor,
  validateRemarks, collectedTypes, rememberCollected, COLLECTION_KEY, REMARK_RULES
} = extras;

const SEED = 'k3x9q0';
const DRAWN = drawStatements(content, SEED);
const byId = Object.fromEntries(content.statements.map((s) => [s.id, s]));

// A random set of "Guilty" ids on a draw, from a fixed generator.
function randomAdmits(drawn, next, rate) {
  return drawn.filter(() => randomBelow(next, 100) < rate);
}

// ---------- answer codes ----------
test('answer codes: 8 characters of 0-9a-z, and decoding gives back exactly the Guilty ids', () => {
  const next = makeGenerator('extras-test-codes');
  for (let n = 0; n < 500; n++) {
    const seed = scoring.makeSeed((bytes) => { for (let i = 0; i < bytes.length; i++) bytes[i] = randomBelow(next, 252); });
    const drawn = drawStatements(content, seed);
    const yes = randomAdmits(drawn, next, randomBelow(next, 101));
    const code = encodeAnswers(seed, drawn, yes);
    assert.match(code, /^[0-9a-z]{8}$/);
    assert.deepStrictEqual(decodeAnswers(code, seed, drawn), yes, seed + ' ' + code);
  }
  // Nothing and everything.
  assert.deepStrictEqual(decodeAnswers(encodeAnswers(SEED, DRAWN, []), SEED, DRAWN), []);
  assert.deepStrictEqual(decodeAnswers(encodeAnswers(SEED, DRAWN, DRAWN), SEED, DRAWN), DRAWN);
  // A Set works, ids outside the draw are ignored, and upper case decodes.
  const outside = content.statements.find((s) => !DRAWN.includes(s.id)).id;
  const code = encodeAnswers(SEED, DRAWN, new Set([DRAWN[3], outside, DRAWN[29]]));
  assert.deepStrictEqual(decodeAnswers(code.toUpperCase(), SEED, DRAWN), [DRAWN[3], DRAWN[29]]);
});

test('answer codes: "Not sure" counts as not guilty (only admittedIds go in)', () => {
  const answers = { [DRAWN[0]]: 'yes', [DRAWN[1]]: 'unsure', [DRAWN[2]]: 'no', [DRAWN[5]]: 'yes' };
  const code = encodeAnswers(SEED, DRAWN, scoring.admittedIds(answers));
  assert.deepStrictEqual(decodeAnswers(code, SEED, DRAWN), [DRAWN[0], DRAWN[5]]);
});

test('answer codes: wrong length, bad characters, other seeds and edited codes are rejected', () => {
  const good = encodeAnswers(SEED, DRAWN, [DRAWN[0], DRAWN[7], DRAWN[20]]);
  const bad = [
    '', 'abc', good.slice(0, 7), good + '0', good.slice(0, 7) + '!', good.slice(0, 7) + '-',
    ' <script>', null, undefined, 12345678, {}, ['x'], good.replace(/./, (c) => (c === '0' ? '1' : '0'))
  ];
  bad.forEach((code) => assert.strictEqual(decodeAnswers(code, SEED, DRAWN), null, JSON.stringify(code)));
  // An answer part too big for 30 statements, with a correct-looking length.
  assert.strictEqual(decodeAnswers('zzzzzz00', SEED, DRAWN), null);
  // The same code on another seed (or another draw for the same seed) fails the check.
  let accepted = 0;
  for (let n = 0; n < 300; n++) {
    const other = 'q' + String(n).padStart(5, '0');
    if (decodeAnswers(good, other, drawStatements(content, other))) accepted++;
  }
  assert.ok(accepted <= 3, 'a code pasted onto other seeds is almost always rejected (' + accepted + ' of 300)');
  assert.strictEqual(decodeAnswers(good, SEED, DRAWN.slice().reverse()), null);
  // Every single-character edit of a code is caught nearly always.
  let slipped = 0;
  let tried = 0;
  for (let i = 0; i < 8; i++) {
    for (const ch of scoring.SEED_ALPHABET) {
      if (ch === good[i]) continue;
      tried++;
      if (decodeAnswers(good.slice(0, i) + ch + good.slice(i + 1), SEED, DRAWN)) slipped++;
    }
  }
  assert.ok(slipped / tried < 0.01, slipped + ' of ' + tried + ' edits slipped through');
  // A broken seed or draw never throws.
  assert.strictEqual(encodeAnswers('NOPE!!', DRAWN, []), null);
  assert.strictEqual(decodeAnswers(good, 'NOPE!!', DRAWN), null);
  assert.strictEqual(decodeAnswers(good, SEED, null), null);
});

test('readCompareLink: a challenge, a reply, and every broken variant falls back to null', () => {
  const vs = encodeAnswers(SEED, DRAWN, [DRAWN[1], DRAWN[12]]);
  const re = encodeAnswers(SEED, DRAWN, [DRAWN[12], DRAWN[25]]);
  const challenge = readCompareLink({ seed: SEED, vs: vs, re: null }, content);
  assert.deepStrictEqual(challenge, { seed: SEED, drawn: DRAWN, vs: [DRAWN[1], DRAWN[12]], vsPlayoff: {}, re: null, rePlayoff: null });
  const reply = readCompareLink({ seed: SEED.toUpperCase(), vs: vs, re: re }, content);
  assert.deepStrictEqual(reply.re, [DRAWN[12], DRAWN[25]]);
  assert.strictEqual(reply.seed, SEED);
  [
    {}, { seed: SEED }, { seed: SEED, re: re }, { seed: null, vs: vs }, { seed: 'abc', vs: vs },
    { seed: SEED, vs: 'x' }, { seed: SEED, vs: vs, re: '' }, { seed: SEED, vs: vs, re: re.slice(1) },
    { seed: 'zzzzzz', vs: vs }, { seed: SEED, vs: re.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')) }, null
  ].forEach((q) => assert.strictEqual(readCompareLink(q, content), null, JSON.stringify(q)));
  // Broken content never throws either.
  assert.strictEqual(readCompareLink({ seed: SEED, vs: vs }, { statements: [] }), null);
});

// ---------- the comparison ----------
// Two fixed players on the same draw, written as band counts like the
// sample players in app.js.
const UNTOUCHED = { school: [1, 0, 0], brain: [1, 0, 0] };
const BRAIN_DEEP = { brain: [2, 2, 2], school: [1, 0, 0], work: [1, 0, 0], heart: [1, 0, 0], bond: [1, 0, 0] };

test('comparePlays: two fixed players, scored exactly as score() scores them alone', () => {
  const mine = admitByCounts(content, DRAWN, UNTOUCHED);
  const friend = admitByCounts(content, DRAWN, BRAIN_DEEP);
  const cmp = comparePlays(content, DRAWN, mine, friend);
  assert.deepStrictEqual(cmp.mine, score(mine, content, DRAWN));
  assert.deepStrictEqual(cmp.friend, score(friend, content, DRAWN));
  assert.strictEqual(cmp.mine.typeId, 'untouched');
  assert.strictEqual(cmp.friend.typeId, 'brain_deep');
  assert.strictEqual(cmp.purer, 'mine');
  assert.strictEqual(cmp.gap, cmp.mine.purity - cmp.friend.purity);
  // The Analog gets on with the Brain deep type (content.js), so its own line is used.
  assert.deepStrictEqual(cmp.relation, { kind: 'best', typeId: 'untouched' });
  // Overlap: the first mild School and Brain statements are admitted by both.
  const both = mine.filter((id) => friend.includes(id));
  assert.strictEqual(cmp.bothCount, both.length);
  assert.deepStrictEqual([...cmp.both].sort(), [...both].sort());
  assert.strictEqual(cmp.onlyMineCount, 0);
  assert.deepStrictEqual(cmp.onlyMine, []);
  assert.strictEqual(cmp.onlyFriendCount, friend.length - both.length);
  // Only the friend: at most 2, heaviest first (the two extreme Brain statements).
  assert.strictEqual(cmp.onlyFriend.length, 2);
  cmp.onlyFriend.forEach((id) => assert.strictEqual(byId[id].band, 'extreme'));
  // Turned round: the purer side flips and the gap stays.
  const back = comparePlays(content, DRAWN, friend, mine);
  assert.strictEqual(back.purer, 'friend');
  assert.strictEqual(back.gap, cmp.gap);
  assert.deepStrictEqual(back.onlyMine, cmp.onlyFriend);
  const bd = content.types.find((t) => t.id === 'brain_deep');
  const expected = bd.bestWith === 'untouched' ? 'best' : bd.clashWith === 'untouched' ? 'clash' : 'theyBest';
  assert.strictEqual(back.relation.kind, expected);
});

test('comparePlays: same answers tie on the same type; lists are capped and heaviest first', () => {
  const next = makeGenerator('extras-test-compare');
  for (let n = 0; n < 200; n++) {
    const seed = 'c' + String(n).padStart(5, '0');
    const drawn = drawStatements(content, seed);
    const a = randomAdmits(drawn, next, 45);
    const b = randomAdmits(drawn, next, 45);
    const cmp = comparePlays(content, drawn, a, b);
    assert.ok(cmp.both.length <= 3 && cmp.onlyFriend.length <= 2 && cmp.onlyMine.length <= 2);
    [cmp.both, cmp.onlyFriend, cmp.onlyMine].forEach((list) => {
      for (let i = 1; i < list.length; i++) {
        const w0 = scoring.statementWeight(byId[list[i - 1]]);
        const w1 = scoring.statementWeight(byId[list[i]]);
        assert.ok(w0 > w1 || (w0 === w1 && drawn.indexOf(list[i - 1]) < drawn.indexOf(list[i])));
      }
    });
    cmp.both.forEach((id) => assert.ok(a.includes(id) && b.includes(id)));
    cmp.onlyFriend.forEach((id) => assert.ok(b.includes(id) && !a.includes(id)));
    cmp.onlyMine.forEach((id) => assert.ok(a.includes(id) && !b.includes(id)));
    // Through the link codes, the numbers are the same as the players saw.
    const viaLinks = comparePlays(content, drawn,
      decodeAnswers(encodeAnswers(seed, drawn, a), seed, drawn),
      decodeAnswers(encodeAnswers(seed, drawn, b), seed, drawn));
    assert.deepStrictEqual(viaLinks.mine, score(a, content, drawn));
    assert.deepStrictEqual(viaLinks.friend, score(b, content, drawn));
    const same = comparePlays(content, drawn, a, a);
    assert.strictEqual(same.purer, 'tie');
    assert.strictEqual(same.gap, 0);
    assert.strictEqual(same.relation.kind, 'same');
  }
});

test('comparePlays: nothing admitted on either side', () => {
  const cmp = comparePlays(content, DRAWN, [], []);
  assert.strictEqual(cmp.purer, 'tie');
  assert.strictEqual(cmp.mine.purity, 100);
  assert.deepStrictEqual([cmp.both, cmp.onlyFriend, cmp.onlyMine], [[], [], []]);
});

// ---------- the AI's remarks ----------
test('remarks: every line is short, plain and in both languages', () => {
  assert.deepStrictEqual(validateRemarks(content), []);
  let count = 0;
  extras.REMARK_GROUPS.forEach((group) => content.remarks[group].forEach((line) => {
    count++;
    assert.ok(Array.from(line.en).length <= 40, line.en);
    assert.ok(Array.from(line.zh).length <= 14, line.zh);
    assert.doesNotMatch(line.en + line.zh, /[!！]/);
  }));
  assert.ok(count >= 30, 'about 30 lines per language (' + count + ')');
  assert.ok(content.remarks.general.length >= 8);
  ['mild', 'medium', 'extreme'].concat(scoring.DIM_KEYS).forEach((g) => assert.ok(content.remarks[g].length >= 2, g));
  // The checker catches what it should.
  const broken = JSON.parse(JSON.stringify(content));
  broken.remarks.general[0] = { en: 'Way too long for a remark, honestly, by a lot', zh: '好！' };
  assert.strictEqual(validateRemarks(broken).length, 2);
});

test('remarks: every statement has its own line in both languages, plain, and within its limits', () => {
  const lines = content.remarks.statements;
  content.statements.forEach((s) => {
    const line = lines[s.id];
    assert.ok(line && line.en.trim() && line.zh.trim(), s.id + ' has a line in both languages');
    assert.ok(Array.from(line.en).length <= REMARK_RULES.statementMaxEn, s.id + ' en ' + line.en.length);
    assert.ok(Array.from(line.zh).length <= REMARK_RULES.statementMaxZh, s.id + ' zh ' + line.zh);
    assert.doesNotMatch(line.en + line.zh, /[!！]/);
  });
  assert.deepStrictEqual(Object.keys(lines).filter((id) => !byId[id]), [], 'no line for a statement that does not exist');
  // A statement without its own line falls back to the groups.
  const bare = JSON.parse(JSON.stringify(content));
  delete bare.remarks.statements;
  const drawn = drawStatements(bare, SEED);
  const schedule = remarkSchedule(bare, SEED, drawn);
  schedule.forEach((e) => {
    const s = byId[drawn[e.index]];
    assert.ok(['general', s.band, s.dim].includes(e.group));
    assert.strictEqual(e.line, bare.remarks[e.group][e.n]);
  });
  assert.strictEqual(extras.statementRemark(bare, drawn[3]), null);
  // How long a remark stays: 1.6 s plus 55 ms a character (Chinese counts 2), at most 3.2 s.
  assert.strictEqual(extras.remarkDuration(''), 1600);
  assert.strictEqual(extras.remarkDuration('Go on.'), 1600 + 55 * 5);
  assert.strictEqual(extras.remarkDuration('记下了。'), 1600 + 55 * 8);
  assert.strictEqual(extras.remarkDuration('x'.repeat(200)), 2800);
  assert.deepStrictEqual([extras.REMARK_RULES.baseMs, extras.REMARK_RULES.perUnitMs, extras.REMARK_RULES.maxMs], [1600, 55, 2800]);
  content.statements.forEach((s) => ['en', 'zh'].forEach((lang) => {
    const ms = extras.remarkDuration(lines[s.id][lang]);
    assert.ok(ms >= 1600 && ms <= 2800);
  }));
});

test('remark schedule: same seed, same schedule; never in the first 3, on the last, or side by side', () => {
  for (let n = 0; n < 2000; n++) {
    const seed = 'm' + String(n).padStart(5, '0');
    const drawn = drawStatements(content, seed);
    const schedule = remarkSchedule(content, seed, drawn);
    assert.deepStrictEqual(remarkSchedule(content, seed, drawn), schedule, 'deterministic');
    assert.strictEqual(schedule.length, REMARK_RULES.candidates);
    const keys = new Set();
    schedule.forEach((entry, i) => {
      assert.ok(entry.index >= 3 && entry.index <= drawn.length - 2, 'place ' + entry.index);
      if (i > 0) assert.ok(entry.index - schedule[i - 1].index >= 2, 'never side by side');
      // The line is the one written for that statement.
      assert.strictEqual(entry.group, 'statement');
      assert.strictEqual(entry.n, drawn[entry.index]);
      assert.strictEqual(entry.line, content.remarks.statements[drawn[entry.index]]);
      keys.add(entry.group + ':' + entry.n);
    });
    assert.strictEqual(keys.size, schedule.length, 'no line twice in a play');
  }
});

test('remark schedule: its own generator, so the draw is untouched and the places do not depend on it', () => {
  const before = drawStatements(content, SEED);
  remarkSchedule(content, SEED, before);
  assert.deepStrictEqual(drawStatements(content, SEED), before);
  // The places come only from the seed: a different list of statements
  // gives the same places.
  const places = remarkSchedule(content, SEED, DRAWN).map((e) => e.index);
  const other = drawStatements(content, 'zz0000');
  assert.deepStrictEqual(remarkSchedule(content, SEED, other).map((e) => e.index), places);
  // And extras.js never uses the draw's label.
  const src = fs.readFileSync(path.join(ROOT, 'extras.js'), 'utf8');
  assert.doesNotMatch(src, /apt-draw-v1/);
  assert.match(src, /makeGenerator\('apt-remarks-v1\|'/);
  // Across seeds, every eligible place is used (no favourite position).
  const used = new Array(30).fill(0);
  for (let n = 0; n < 3000; n++) {
    const seed = 'p' + String(n).padStart(5, '0');
    remarkSchedule(content, seed, drawStatements(content, seed)).forEach((e) => used[e.index]++);
  }
  for (let i = 3; i <= 28; i++) assert.ok(used[i] > 300, 'place ' + i + ' used ' + used[i] + ' times');
  [0, 1, 2, 29].forEach((i) => assert.strictEqual(used[i], 0));
});

test('remarkFor: only on Guilty, at most 6 per play, never twice in a row, never the same statement twice', () => {
  const next = makeGenerator('extras-test-remarkfor');
  for (let n = 0; n < 1000; n++) {
    const seed = 'f' + String(n).padStart(5, '0');
    const drawn = drawStatements(content, seed);
    const schedule = remarkSchedule(content, seed, drawn);
    const shown = [];
    const answers = drawn.map(() => ['yes', 'no', 'unsure'][randomBelow(next, 3)]);
    answers.forEach((answer, index) => {
      const entry = remarkFor(schedule, index, answer, shown);
      if (!entry) return;
      assert.strictEqual(answer, 'yes');
      assert.strictEqual(entry.index, index);
      shown.push(index);
      // Going back and answering Guilty again shows nothing new.
      assert.strictEqual(remarkFor(schedule, index, 'yes', shown), null);
    });
    assert.ok(shown.length <= REMARK_RULES.maxPerPlay);
    for (let i = 1; i < shown.length; i++) assert.ok(shown[i] - shown[i - 1] >= 2);
    assert.ok(shown.every((i) => i >= 3));
  }
  // All Guilty: exactly 6 remarks.
  const schedule = remarkSchedule(content, SEED, DRAWN);
  const shown = [];
  DRAWN.forEach((id, i) => { if (remarkFor(schedule, i, 'yes', shown)) shown.push(i); });
  assert.strictEqual(shown.length, 6);
  // Never on Never or Not sure, and a hand-made neighbour is refused too.
  schedule.forEach((e) => {
    assert.strictEqual(remarkFor(schedule, e.index, 'no', []), null);
    assert.strictEqual(remarkFor(schedule, e.index, 'unsure', []), null);
    assert.strictEqual(remarkFor(schedule, e.index, 'yes', [e.index - 1]), null);
  });
});

// ---------- the collection ----------
function fakeStorage() {
  const data = {};
  return {
    data: data,
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); }
  };
}
const brokenStorage = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('QuotaExceededError'); }
};

test('collection: remembers each type once, in type order, and holds nothing else', () => {
  const storage = fakeStorage();
  assert.deepStrictEqual(collectedTypes(storage), []);
  assert.strictEqual(rememberCollected(storage, 'heart_deep'), true);
  assert.strictEqual(rememberCollected(storage, 'untouched'), true);
  assert.strictEqual(rememberCollected(storage, 'heart_deep'), true);
  assert.deepStrictEqual(collectedTypes(storage), ['untouched', 'heart_deep']);
  assert.deepStrictEqual(Object.keys(storage.data), [COLLECTION_KEY]);
  assert.strictEqual(storage.data[COLLECTION_KEY], 'untouched,heart_deep');
  // Unknown types are refused and junk in storage is ignored.
  assert.strictEqual(rememberCollected(storage, 'nope'), false);
  storage.setItem(COLLECTION_KEY, 'merged,<b>,,bond_lite,merged,42');
  assert.deepStrictEqual(collectedTypes(storage), ['merged', 'bond_lite']);
  TYPE_IDS.forEach((id) => rememberCollected(storage, id));
  assert.deepStrictEqual(collectedTypes(storage), TYPE_IDS);
});

test('collection: missing, blocked or full storage means an empty collection, never an error', () => {
  [null, undefined, brokenStorage, {}].forEach((storage) => {
    assert.deepStrictEqual(collectedTypes(storage), []);
    assert.strictEqual(rememberCollected(storage, 'heart_deep'), false);
  });
  const full = fakeStorage();
  full.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.strictEqual(rememberCollected(full, 'heart_deep'), false);
  const odd = fakeStorage();
  odd.setItem(COLLECTION_KEY, 12);
  assert.deepStrictEqual(collectedTypes({ getItem: () => 12 }), []);
});

test('app.js: previews, peeks and comparison links never add to the collection', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const calls = src.match(/extras\.rememberCollected\([^)]*\)/g) || [];
  assert.strictEqual(calls.length, 1);
  assert.match(src, /if \(!isSample\) extras\.rememberCollected\(deviceStorage\(\), result\.typeId\);/);
  // The reply view never calls renderResult.
  const reply = src.match(/function renderReply\(\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.doesNotMatch(reply, /renderResult|rememberCollected|rememberHiddenUnlocked/);
});

// ---------- the card's footer line ----------
test('card footer: the address alone, in both languages', () => {
  assert.strictEqual(content.ui.cardNote.en, 'lilwan345.github.io/ai-purity-test');
  assert.strictEqual(content.ui.cardNote.zh, 'lilwan345.github.io/ai-purity-test');
});

// ---------- the challenge link's privacy line ----------
test('challenge: the privacy line says what the link reveals, in both languages', () => {
  assert.match(content.ui.challengePrivacy.en, /see which statements you admitted/);
  assert.match(content.ui.challengePrivacy.zh, /认了哪几条/);
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  // Shown next to the button, before anything is copied.
  assert.match(src, /onclick: copyChallengeLink \}, \[t\('challengeAction'\)\]\),\s*el\('p', \{ class: 'challenge-note', text: t\('challengePrivacy'\) \}\)/);
});

// ---------- versions on the files index.html loads ----------
test('index.html: every local file carries the same non-empty ?v= version', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const refs = Array.from(html.matchAll(/(?:src|href)="([\w.-]+\.(?:css|js))(\?v=([^"]*))?"/g));
  const files = refs.map((m) => m[1]);
  ['styles.css', 'content.js', 'scoring.js', 'extras.js', 'art.js', 'app.js'].forEach((f) => assert.ok(files.includes(f), f));
  const versions = new Set(refs.map((m) => m[3]));
  assert.strictEqual(versions.size, 1, 'one version for all: ' + [...versions].join(', '));
  const [version] = versions;
  assert.ok(typeof version === 'string' && /^[\w.-]+$/.test(version), 'version is set: ' + version);
});

test('tools/bump-version.js: rewrites every reference at once, and picks the next free letter', () => {
  const { bump, nextVersion } = require('../tools/bump-version.js');
  const html = '<link rel="stylesheet" href="styles.css?v=old"><script src="a.js"></script>' +
    '<script src="app.js?v=x1"></script><link rel="icon" href="data:,"><a href="https://example.com/x.js">';
  const out = bump(html, '20990101b');
  assert.strictEqual(out.count, 3);
  assert.match(out.html, /styles\.css\?v=20990101b/);
  assert.match(out.html, /a\.js\?v=20990101b/);
  assert.match(out.html, /app\.js\?v=20990101b/);
  assert.match(out.html, /href="data:,"/);
  assert.match(out.html, /https:\/\/example\.com\/x\.js"/);
  const today = nextVersion('');
  assert.match(today, /^\d{8}a$/);
  assert.strictEqual(nextVersion('<script src="a.js?v=' + today + '"></script>'), today.slice(0, 8) + 'b');
  assert.strictEqual(nextVersion('<script src="a.js?v=' + today.slice(0, 8) + 'c"></script>'), today.slice(0, 8) + 'd');
  assert.strictEqual(nextVersion('<script src="a.js?v=20000101q"></script>'), today, 'an older date starts again at a');
});

// ---------- leaving a play and coming back ----------
test('landingChoice: start, continue at the statement they were on, or back to the result', () => {
  const { landingChoice } = extras;
  assert.deepStrictEqual(landingChoice({}, 30, 0), { kind: 'start' });
  assert.deepStrictEqual(landingChoice(null, 30, 5), { kind: 'start' });
  const seven = Object.fromEntries(DRAWN.slice(0, 7).map((id) => [id, 'no']));
  assert.deepStrictEqual(landingChoice(seven, 30, 7), { kind: 'continue', position: 8 });
  // "Not sure" and "Never" count as answered too; a bad index falls back to 1.
  assert.deepStrictEqual(landingChoice({ [DRAWN[0]]: 'unsure' }, 30, 99), { kind: 'continue', position: 1 });
  assert.deepStrictEqual(landingChoice({ [DRAWN[0]]: 'yes' }, 30, 2.5), { kind: 'continue', position: 1 });
  const all = Object.fromEntries(DRAWN.map((id) => [id, 'yes']));
  assert.deepStrictEqual(landingChoice(all, 30, 29), { kind: 'result' });
});

test('restartKeepsSet: a play from a seed link or a challenge link keeps its 30; any other gets a fresh set', () => {
  const { restartKeepsSet } = extras;
  assert.strictEqual(restartKeepsSet({ seedFromLink: true, challenge: null }), true);
  assert.strictEqual(restartKeepsSet({ seedFromLink: false, challenge: [DRAWN[0]] }), true);
  assert.strictEqual(restartKeepsSet({ seedFromLink: false, challenge: [] }), true, 'a challenger who admitted nothing still counts');
  assert.strictEqual(restartKeepsSet({ seedFromLink: false, challenge: null }), false);
  assert.strictEqual(restartKeepsSet(null), false);
  // Keeping the set really keeps the comparison: the same seed draws the same 30.
  assert.deepStrictEqual(drawStatements(content, SEED), DRAWN);
});

test('app.js: the title is a link home, the landing offers continue / start over, and no confirm dialog', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  // The top bar's name is a real link with a named way home.
  const brand = src.match(/function renderBrand\(\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(brand, /el\('a', \{/);
  assert.match(brand, /onclick: goHome/);
  assert.match(brand, /t\('brandHomeLabel'\)/);
  // No confirm() or alert() anywhere.
  assert.doesNotMatch(src, /\b(confirm|alert)\(/);
  // The landing's buttons come from landingChoice.
  const actions = src.match(/function landingActions\(\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(actions, /extras\.landingChoice\(state\.answers, state\.drawn\.length, state\.index\)/);
  assert.match(actions, /t\('continuePlay'/);
  assert.match(actions, /t\('startOver'\)/);
  // Start over: the link's set is kept by restartKeepsSet, otherwise a fresh
  // set; either way a new play (no answers, no remarks shown yet, statement 1).
  const restart = src.match(/function restartPlay\(\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(restart, /if \(extras\.restartKeepsSet\(state\)\) \{\s*playNo \+= 1;\s*state\.playoffAnswers = \{\};\s*state\.answers = \{\};\s*state\.index = 0;\s*state\.remarked = \[\];/);
  assert.match(restart, /startPlay\(\);/);
  assert.match(restart, /go\('question'\)/);
  const startPlay = src.match(/function startPlay\(\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(startPlay, /state\.remarked = \[\];/);
  // Going home never asks for the reveal; only the last answer does.
  assert.strictEqual((src.match(/reveal: !reduce/g) || []).length, 1);
});

test('ui copy: the restart keys exist, and Continue shows where you are', () => {
  ['continuePlay', 'startOver', 'restartSameSet', 'brandHomeLabel'].forEach((key) => {
    assert.ok(scoring.UI_KEYS.includes(key), key);
    assert.ok(content.ui[key].en && content.ui[key].zh, key);
  });
  ['en', 'zh'].forEach((lang) => {
    assert.ok(content.ui.continuePlay[lang].includes('{n}') && content.ui.continuePlay[lang].includes('{total}'));
  });
});
