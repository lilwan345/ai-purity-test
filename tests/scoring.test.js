// Run with: node --test tests/
// Rules tests on a small fixture built in code (not the real content.js),
// so every number below can be worked out by hand. See SCORING.md.
const test = require('node:test');
const assert = require('node:assert');
const {
  score, validateContent, validateProfiles, bankReport, questionOrder, admitByCounts, tieLotOrder,
  drawStatements, DIM_KEYS, TYPE_IDS, UI_KEYS, BANDS, STATEMENT_BANDS, RULES, BANK_TARGET
} = require('../scoring.js');

// ---------- a small, valid fixture: the full-size bank ----------
// 7 statements in every dimension x band (105 in all), ids s01..s105:
// school s01-s21 (mild s01-s07, medium s08-s14, extreme s15-s21), work s22-s42, ...
function pair(text) {
  return { en: text, zh: '中文' + text };
}

function makeContent(perStratum = 7) {
  const ui = {};
  UI_KEYS.forEach((key) => { ui[key] = pair(key); });
  const dimensions = DIM_KEYS.map((key) => ({
    key,
    name: pair(key),
    reads: { none: pair('none'), low: pair('low'), mid: pair('mid'), high: pair('high') }
  }));
  const statements = [];
  DIM_KEYS.forEach((dim) => {
    STATEMENT_BANDS.forEach((band) => {
      for (let i = 0; i < perStratum; i++) {
        const id = 's' + String(statements.length + 1).padStart(2, '0');
        statements.push({ id, dim, band, text: pair('Did thing ' + id) });
      }
    });
  });
  const types = TYPE_IDS.map((id, i) => ({
    id,
    code: 'T-' + String(i).padStart(2, '0'),
    name: pair(id), tagline: pair('tag'), roast: pair('roast'),
    superpower: pair('power'), weakness: pair('weak'), aiSays: pair('says'),
    color: '#F2C14E',
    why: pair('why'),
    signs: [pair('sign 1'), pair('sign 2'), pair('sign 3')],
    bestWith: TYPE_IDS[(i + 1) % TYPE_IDS.length], bestWithLine: pair('best'),
    clashWith: TYPE_IDS[(i + 2) % TYPE_IDS.length], clashWithLine: pair('clash')
  }));
  return { ui, dimensions, statements, types };
}

const content = makeContent();

// A fixed, valid "draw": the first two statements of every stratum, mild
// group first, then medium, then extreme (the order a real draw uses).
const DRAWN = [];
STATEMENT_BANDS.forEach((band) => {
  DIM_KEYS.forEach((dim) => {
    content.statements.filter((s) => s.dim === dim && s.band === band).slice(0, 2).forEach((s) => DRAWN.push(s.id));
  });
});
const byId = Object.fromEntries(content.statements.map((s) => [s.id, s]));

// The k-th (0 or 1) drawn statement of a stratum.
function pick(dim, band, k = 0) {
  return DRAWN.filter((id) => byId[id].dim === dim && byId[id].band === band)[k];
}
// Admitted ids from counts like { school: [mild, medium, extreme] }.
function adm(counts) {
  return admitByCounts(content, DRAWN, counts);
}
// Score counts on the fixed draw.
function sc(counts, rules) {
  return score(adm(counts), content, DRAWN, rules);
}
const ALL = (counts) => ({ school: counts, work: counts, heart: counts, brain: counts, bond: counts });

// ---------- basic numbers ----------
test('the fixture draw is a valid draw: 30, six per dimension, two per band', () => {
  assert.strictEqual(DRAWN.length, 30);
  assert.strictEqual(new Set(DRAWN).size, 30);
  DIM_KEYS.forEach((dim) => STATEMENT_BANDS.forEach((band) => {
    assert.strictEqual(DRAWN.filter((id) => byId[id].dim === dim && byId[id].band === band).length, 2);
  }));
});

test('total, purity, perDim, shown and maxPoints', () => {
  const r = sc({ school: [2, 0, 0], work: [1, 1, 1], bond: [1, 0, 0] });
  assert.strictEqual(r.total, 6);
  assert.strictEqual(r.drawnCount, 30);
  assert.strictEqual(r.purity, 80); // 100 * (1 - 6/30)
  assert.deepStrictEqual(r.perDim, { school: 2, work: 3, heart: 0, brain: 0, bond: 1 });
  assert.deepStrictEqual(r.shown, { school: 6, work: 6, heart: 6, brain: 6, bond: 6 });
  assert.deepStrictEqual(r.maxPoints, { school: 12, work: 12, heart: 12, brain: 12, bond: 12 });
});

test('purity = round(100 * (1 - admitted / 30))', () => {
  assert.strictEqual(score([], content, DRAWN).purity, 100);
  assert.strictEqual(sc({ school: [1, 0, 0] }).purity, 97); // 96.67
  assert.strictEqual(sc({ school: [2, 0, 0] }).purity, 93); // 93.33
  assert.strictEqual(sc(ALL([2, 2, 2])).purity, 0);
});

test('weights: mild 1, medium 2, extreme 3; a full dimension is 12', () => {
  assert.strictEqual(sc({ school: [1, 0, 0] }).points.school, 1);
  assert.strictEqual(sc({ school: [0, 1, 0] }).points.school, 2);
  assert.strictEqual(sc({ school: [0, 0, 1] }).points.school, 3);
  assert.strictEqual(sc({ work: [2, 2, 2] }).points.work, 12);
});

test('depth is points out of 12, as 0..100, rounded', () => {
  const r = sc({ school: [2, 0, 0], work: [2, 1, 0], heart: [2, 2, 1], brain: [2, 2, 2] });
  assert.deepStrictEqual(r.points, { school: 2, work: 4, heart: 9, brain: 12, bond: 0 });
  assert.deepStrictEqual(r.depth, { school: 17, work: 33, heart: 75, brain: 100, bond: 0 });
});

test('bands: 0 none, 1-2 points low, 3-6 mid, 7+ high', () => {
  const bandFor = (counts) => sc({ school: counts }).band.school;
  assert.strictEqual(bandFor([0, 0, 0]), 'none');
  assert.strictEqual(bandFor([1, 0, 0]), 'low');   // 1 point
  assert.strictEqual(bandFor([2, 0, 0]), 'low');   // 2 points, depth 17
  assert.strictEqual(bandFor([0, 1, 0]), 'low');   // 2 points
  assert.strictEqual(bandFor([1, 1, 0]), 'mid');   // 3 points, depth 25
  assert.strictEqual(bandFor([2, 2, 0]), 'mid');   // 6 points, depth 50
  assert.strictEqual(bandFor([0, 2, 1]), 'high');  // 7 points, depth 58
  assert.strictEqual(bandFor([1, 0, 2]), 'high');  // 7 points
  const r = sc({ school: [2, 2, 2], work: [1, 1, 0], heart: [1, 0, 0] });
  Object.values(r.band).forEach((b) => assert.ok(BANDS.includes(b)));
});

test('high band needs an extreme statement: every mild and medium one is still mid', () => {
  const r = sc({ school: [2, 2, 0] });
  assert.strictEqual(r.points.school, 6);
  assert.strictEqual(r.band.school, 'mid');
  assert.strictEqual(r.typeId, 'school_lite');
});

test('unknown, duplicate and not-drawn ids are ignored; a Set works too', () => {
  const notDrawn = content.statements.find((s) => !DRAWN.includes(s.id)).id;
  const r = score([pick('school', 'mild'), pick('school', 'mild'), 'nope', notDrawn, pick('work', 'mild')], content, DRAWN);
  assert.strictEqual(r.total, 2);
  assert.strictEqual(score(new Set(adm({ school: [2, 2, 0] })), content, DRAWN).total, 4);
});

test('pure and deterministic: same answers in any order give the same result; nothing is changed', () => {
  const answers = adm({ school: [1, 1, 0], heart: [2, 0, 1], bond: [1, 0, 0] });
  const before = JSON.stringify(content);
  const drawnBefore = DRAWN.slice();
  const a = score(answers, content, DRAWN);
  const b = score(answers.slice().reverse(), content, DRAWN);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(JSON.stringify(content), before);
  assert.deepStrictEqual(DRAWN, drawnBefore);
});

test('without drawnIds, the whole bank counts as shown (old callers do not crash)', () => {
  const r = score([pick('school', 'extreme')], content);
  assert.strictEqual(r.drawnCount, 105);
  assert.strictEqual(r.maxPoints.school, 42);
  assert.strictEqual(r.typeId, 'school_lite');
});

test('content without the profile fields still scores (the app must not crash)', () => {
  const c = makeContent();
  c.dimensions.forEach((d) => { delete d.reads; });
  c.types.forEach((t) => { delete t.why; delete t.signs; delete t.bestWith; delete t.clashWith; });
  assert.strictEqual(score(adm({ heart: [2, 2, 2] }), c, DRAWN).typeId, 'heart_deep');
});

// ---------- untouched ----------
test('untouched: nothing admitted', () => {
  const r = score([], content, DRAWN);
  assert.deepStrictEqual(
    [r.total, r.purity, r.typeId, r.secondaryTypeId, r.evidenceIds, r.match, r.dominantDim, r.tieBreak],
    [0, 100, 'untouched', null, [], 100, null, null]
  );
});

test('untouched: up to 3 mild statements; a 4th is not untouched', () => {
  assert.strictEqual(sc({ school: [1, 0, 0], work: [1, 0, 0], heart: [1, 0, 0] }).typeId, 'untouched');
  assert.strictEqual(sc({ school: [2, 0, 0], bond: [1, 0, 0] }).typeId, 'untouched');
  // Four mild in four sections: a four-way tie, so balanced.
  assert.strictEqual(sc({ school: [1, 0, 0], work: [1, 0, 0], heart: [1, 0, 0], brain: [1, 0, 0] }).typeId, 'balanced');
  // Four mild, school leading: school_lite.
  assert.strictEqual(sc({ school: [2, 0, 0], work: [1, 0, 0], heart: [1, 0, 0] }).typeId, 'school_lite');
});

test('untouched: one medium or extreme statement is already a direction', () => {
  assert.strictEqual(sc({ school: [0, 1, 0] }).typeId, 'school_lite');
  assert.strictEqual(sc({ school: [1, 0, 0], work: [1, 0, 0], brain: [0, 0, 1] }).typeId, 'brain_lite');
});

test('untouched: evidence is whatever was admitted, heaviest first; match = purity; no tie-break', () => {
  const r = sc({ school: [1, 0, 0], heart: [1, 0, 0], brain: [1, 0, 0] });
  assert.strictEqual(r.typeId, 'untouched');
  assert.strictEqual(r.evidenceIds.length, 3);
  assert.strictEqual(r.match, 90);
  assert.strictEqual(r.tieBreak, null); // a tie that decides nothing is not reported
});

// ---------- the hidden type (soulmate) ----------
test('soulmate: every Bond statement shown plus one extreme Heart statement, even with nothing else', () => {
  const r = sc({ bond: [2, 2, 2], heart: [0, 0, 1] });
  assert.strictEqual(r.typeId, 'soulmate');
  assert.strictEqual(r.hiddenRule, true);
  assert.strictEqual(r.match, 100);
  assert.strictEqual(r.secondaryTypeId, 'bond_deep');
});

test('soulmate: five of six Bond, or no extreme Heart, is not enough', () => {
  assert.strictEqual(sc({ bond: [2, 2, 1], heart: [0, 0, 2] }).typeId, 'bond_deep'); // 9 vs 6 points
  assert.strictEqual(sc({ bond: [2, 2, 1], heart: [0, 0, 2] }).hiddenRule, false);
  assert.strictEqual(sc({ bond: [2, 2, 2], heart: [2, 2, 0] }).typeId, 'bond_deep');
  assert.strictEqual(sc({ bond: [2, 2, 2], heart: [2, 2, 0] }).hiddenRule, false);
  // Extreme statements of other sections do not count for the hidden rule.
  assert.strictEqual(sc({ bond: [2, 2, 2], school: [0, 0, 1] }).typeId, 'bond_deep');
});

test('soulmate: evidence is the two extreme Bond statements, then the extreme Heart one', () => {
  const r = sc({ bond: [2, 2, 2], heart: [2, 2, 2] });
  assert.strictEqual(r.typeId, 'soulmate');
  assert.strictEqual(r.evidenceIds.length, 3);
  const dims = r.evidenceIds.map((id) => byId[id].dim).sort();
  assert.deepStrictEqual(dims, ['bond', 'bond', 'heart']);
  r.evidenceIds.forEach((id) => assert.strictEqual(byId[id].band, 'extreme'));
});

test('soulmate: secondary is the type the player would get without the hidden rule', () => {
  assert.strictEqual(sc({ bond: [2, 2, 2], heart: [0, 0, 1] }).secondaryTypeId, 'bond_deep');
  // Bond, Heart and School all full: a three-way tie at the top -> balanced underneath.
  const r = sc({ bond: [2, 2, 2], heart: [2, 2, 2], school: [2, 2, 2] });
  assert.strictEqual(r.typeId, 'soulmate');
  assert.strictEqual(r.secondaryTypeId, 'balanced');
});

test('soulmate: merged wins when nearly everything is admitted, and soulmate becomes the secondary', () => {
  const r = sc(ALL([2, 2, 2]));
  assert.strictEqual(r.typeId, 'merged');
  assert.strictEqual(r.secondaryTypeId, 'soulmate');
  assert.strictEqual(r.hiddenRule, true);
});

// ---------- merged ----------
test('merged: 25 admitted is merged, 24 is not', () => {
  const r25 = sc({ school: [2, 2, 2], work: [2, 2, 2], heart: [2, 2, 2], brain: [2, 2, 2], bond: [1, 0, 0] });
  assert.strictEqual(r25.total, 25);
  assert.strictEqual(r25.typeId, 'merged');
  assert.strictEqual(r25.secondaryTypeId, null);
  assert.strictEqual(r25.match, 82); // average depth: (100 x 4 + 100/12) / 5 = 81.7
  const r24 = sc({ school: [2, 2, 2], work: [2, 2, 2], heart: [2, 2, 2], brain: [2, 2, 2] });
  assert.strictEqual(r24.total, 24);
  assert.notStrictEqual(r24.typeId, 'merged');
});

test('merged: every section in the high band is merged, even well below 25', () => {
  const r = sc(ALL([2, 1, 1])); // 7 points (high) everywhere, 20 admitted
  assert.strictEqual(r.total, 20);
  assert.strictEqual(r.typeId, 'merged');
  assert.strictEqual(r.match, 58);
  // The thinnest way in: one mild and both extreme everywhere, 15 admitted.
  assert.strictEqual(sc(ALL([1, 0, 2])).typeId, 'merged');
  // One section short of high is not enough.
  assert.notStrictEqual(sc({ school: [2, 1, 1], work: [2, 1, 1], heart: [2, 1, 1], brain: [2, 1, 1], bond: [2, 2, 0] }).typeId, 'merged');
});

test('merged: evidence is the heaviest statement of each dimension, top three', () => {
  const r = sc({ school: [2, 2, 2], work: [2, 2, 2], heart: [2, 2, 2], brain: [2, 2, 2], bond: [2, 2, 0] });
  assert.strictEqual(r.typeId, 'merged');
  assert.strictEqual(r.evidenceIds.length, 3);
  r.evidenceIds.forEach((id) => assert.strictEqual(byId[id].band, 'extreme'));
  assert.strictEqual(new Set(r.evidenceIds.map((id) => byId[id].dim)).size, 3);
});

// ---------- balanced ----------
test('balanced: both mild statements in every dimension (10 in total)', () => {
  const r = sc(ALL([2, 0, 0]));
  assert.strictEqual(r.typeId, 'balanced');
  assert.strictEqual(r.secondaryTypeId, null);
  assert.strictEqual(r.match, 100);
  assert.strictEqual(r.tieBreak, null);
});

test('balanced (even spread): needs at least 6 admitted', () => {
  // 5 admitted, all five touched, School alone on top: not balanced.
  const five = sc({ school: [0, 1, 0], work: [1, 0, 0], heart: [1, 0, 0], brain: [1, 0, 0], bond: [1, 0, 0] });
  assert.strictEqual(five.total, 5);
  assert.strictEqual(five.typeId, 'school_lite');
  // One more mild Adulting statement: 6 admitted, within 1 point, balanced.
  const six = sc({ school: [0, 1, 0], work: [2, 0, 0], heart: [1, 0, 0], brain: [1, 0, 0], bond: [1, 0, 0] });
  assert.strictEqual(six.total, 6);
  assert.strictEqual(six.typeId, 'balanced');
});

test('balanced (even spread): every dimension must be touched', () => {
  const r = sc({ school: [1, 1, 0], work: [2, 0, 0], heart: [2, 0, 0], brain: [2, 0, 0] });
  assert.strictEqual(r.typeId, 'school_lite');
});

test('balanced: deepest and shallowest at most 2 points apart; 3 apart is a leaning', () => {
  const others = { work: [1, 0, 0], heart: [1, 0, 0], brain: [1, 0, 0], bond: [1, 0, 0] }; // 1 point each
  const two = sc(Object.assign({ school: [1, 1, 0] }, others));   // school 3 points
  assert.strictEqual(two.typeId, 'balanced');
  assert.strictEqual(two.match, 83);                              // 100 - 100 * 2 / 12
  const three = sc(Object.assign({ school: [1, 0, 1] }, others)); // school 4 points
  assert.strictEqual(three.typeId, 'school_lite');
});

test('balanced (tie): three or more sections sharing the top points is balanced', () => {
  const four = sc({ school: [2, 1, 0], work: [2, 1, 0], heart: [2, 1, 0], brain: [2, 1, 0] });
  assert.strictEqual(four.typeId, 'balanced');
  assert.strictEqual(four.tiedDims.length, 4);
  assert.strictEqual(four.match, 100);
  assert.strictEqual(four.secondaryTypeId, null);
  assert.strictEqual(four.tieBreak, null);
  // Three medium statements in three sections, nothing else.
  assert.strictEqual(sc({ school: [0, 1, 0], work: [0, 1, 0], heart: [0, 1, 0] }).typeId, 'balanced');
  // Three full sections, two empty.
  assert.strictEqual(sc({ school: [2, 2, 2], heart: [2, 2, 2], brain: [2, 2, 2] }).typeId, 'balanced');
  // A two-way tie is not balanced: a section type with the other as secondary.
  const two = sc({ school: [2, 1, 0], heart: [2, 1, 0] });
  assert.ok(['school_lite', 'heart_lite'].includes(two.typeId));
  assert.ok(['school_lite', 'heart_lite'].includes(two.secondaryTypeId));
  assert.notStrictEqual(two.typeId, two.secondaryTypeId);
});

test('balanced (tie): untouched is checked first', () => {
  assert.strictEqual(sc({ school: [1, 0, 0], work: [1, 0, 0], heart: [1, 0, 0] }).typeId, 'untouched');
  assert.strictEqual(sc(ALL([1, 0, 0])).typeId, 'balanced');
});

test('balanced: one clear obsession is never balanced', () => {
  const r = sc({ heart: [2, 2, 2], school: [2, 1, 0], work: [2, 1, 0], brain: [2, 1, 0], bond: [2, 1, 0] });
  assert.strictEqual(r.typeId, 'heart_deep');
});

test('balanced: evidence is one statement per dimension, heaviest first', () => {
  const r = sc({ school: [2, 0, 0], work: [1, 0, 0], heart: [1, 1, 0], brain: [2, 0, 0], bond: [1, 0, 0] });
  assert.strictEqual(r.typeId, 'balanced');
  assert.strictEqual(byId[r.evidenceIds[0]].dim, 'heart');
  assert.strictEqual(byId[r.evidenceIds[0]].band, 'medium');
  assert.strictEqual(new Set(r.evidenceIds.map((id) => byId[id].dim)).size, 3);
});

// ---------- dimension types ----------
test('dimension types: each dimension can lead', () => {
  DIM_KEYS.forEach((dim) => {
    assert.strictEqual(sc({ [dim]: [2, 2, 0] }).typeId, dim + '_lite');
    assert.strictEqual(sc({ [dim]: [2, 2, 1] }).typeId, dim + '_deep');
  });
});

test('lite vs deep: 6 points lite, 7 points deep; both extremes alone are deep', () => {
  assert.strictEqual(sc({ work: [2, 2, 0] }).typeId, 'work_lite');  // 6 points
  assert.strictEqual(sc({ work: [0, 2, 1] }).typeId, 'work_deep');  // 7 points
  assert.strictEqual(sc({ work: [0, 0, 2] }).typeId, 'work_deep');  // 6 points, both extremes
  assert.strictEqual(sc({ work: [2, 0, 1] }).typeId, 'work_lite');  // 5 points, one extreme
});

test('lite vs deep: not decided by the overall total', () => {
  assert.strictEqual(sc({ school: [2, 2, 2] }).typeId, 'school_deep'); // 6 admitted
  const r = sc({ school: [2, 2, 0], work: [2, 0, 0], heart: [2, 0, 0], brain: [2, 0, 0], bond: [2, 0, 0] });
  assert.strictEqual(r.total, 12);
  assert.strictEqual(r.typeId, 'school_lite');
});

test('a few mild statements are never "deep"', () => {
  assert.strictEqual(sc({ school: [2, 0, 0], work: [1, 0, 0], heart: [1, 0, 0] }).typeId, 'school_lite');
});

test('tie-break 1: more points win, even against a heavier statement', () => {
  assert.strictEqual(sc({ work: [2, 1, 0], school: [0, 0, 1] }).typeId, 'work_lite'); // 4 vs 3
});

test('tie-break 2: equal points -> the heavier admitted statement wins', () => {
  const r = sc({ school: [0, 0, 1], work: [1, 1, 0] }); // 3 vs 3, extreme vs medium
  assert.strictEqual(r.typeId, 'school_lite');
  assert.strictEqual(r.tieBreak, 'top');
});

test('tie-break 3: equal points and heaviest band -> more statements wins', () => {
  const r = sc({ school: [2, 1, 1], heart: [0, 2, 1] }); // 7 vs 7, both reach extreme, 4 vs 3 statements
  assert.strictEqual(r.typeId, 'school_deep');
  assert.strictEqual(r.secondaryTypeId, 'heart_deep');
  assert.strictEqual(r.tieBreak, 'count');
});

test('tie-break 4: a mirror image is decided by this play\'s lot, the same way every time', () => {
  const r = sc({ school: [2, 1, 0], heart: [2, 1, 0] });
  const lot = tieLotOrder(DRAWN);
  const winner = lot.indexOf('school') < lot.indexOf('heart') ? 'school' : 'heart';
  assert.strictEqual(r.tieBreak, 'lot');
  assert.strictEqual(r.dominantDim, winner);
  assert.strictEqual(r.typeId, winner + '_lite');
  assert.deepStrictEqual(sc({ school: [2, 1, 0], heart: [2, 1, 0] }), r);
});

test('tie-break 4: across plays the lot gives every section its share of mirror ties', () => {
  // 400 real draws of the same mirror tie between each pair: both sides win.
  const real = makeContent(3);
  for (let i = 0; i < DIM_KEYS.length; i++) {
    for (let j = i + 1; j < DIM_KEYS.length; j++) {
      const a = DIM_KEYS[i], b = DIM_KEYS[j];
      let winsA = 0;
      for (let n = 0; n < 400; n++) {
        const drawn = drawStatements(real, 'seed' + String(n).padStart(2, '0'));
        const r = score(admitByCounts(real, drawn, { [a]: [2, 1, 0], [b]: [2, 1, 0] }), real, drawn);
        if (r.dominantDim === a) winsA += 1;
      }
      // 400 coin flips: 50% +- 4 standard deviations (10 points).
      assert.ok(winsA > 120 && winsA < 280, a + ' vs ' + b + ': ' + winsA + ' of 400');
    }
  }
});

test('tie-break 4: rules.fixedTieOrder (tools only) restores a fixed order', () => {
  const rules = Object.assign({}, RULES, { fixedTieOrder: ['bond', 'heart', 'brain', 'work', 'school'] });
  assert.strictEqual(sc({ school: [2, 1, 0], heart: [2, 1, 0] }, rules).dominantDim, 'heart');
  assert.strictEqual(RULES.fixedTieOrder, undefined);
});

test('dimension types: evidence is the leading dimension, heaviest first, at most 3', () => {
  const r = sc({ heart: [2, 1, 1], school: [1, 0, 0], bond: [1, 0, 0] });
  assert.strictEqual(r.typeId, 'heart_deep');
  assert.deepStrictEqual(r.evidenceIds.map((id) => byId[id].band), ['extreme', 'medium', 'mild']);
  r.evidenceIds.forEach((id) => assert.strictEqual(byId[id].dim, 'heart'));
  assert.deepStrictEqual(sc({ brain: [0, 0, 1] }).evidenceIds, [pick('brain', 'extreme')]);
  // Equal weight: the one asked first comes first.
  assert.deepStrictEqual(sc({ brain: [2, 0, 0] }).evidenceIds, [pick('brain', 'mild', 0), pick('brain', 'mild', 1)]);
});

test('dimension types: match = lead / (lead + runner-up), 50 for a dead heat, 100 alone', () => {
  assert.strictEqual(sc({ brain: [2, 2, 1] }).match, 100);
  assert.strictEqual(sc({ school: [2, 2, 0], work: [2, 2, 0] }).match, 50);
  // school 6 points, heart 3 points, bond 1: 6 / 9 = 67. Bond does not count.
  assert.strictEqual(sc({ school: [2, 2, 0], heart: [1, 1, 0], bond: [1, 0, 0] }).match, 67);
  // A heavy player with lots everywhere is not punished: 12 vs 6.
  const heavy = sc({ brain: [2, 2, 2], school: [2, 2, 0], work: [2, 2, 0], heart: [2, 2, 0], bond: [2, 2, 0] });
  assert.strictEqual(heavy.typeId, 'brain_deep');
  assert.strictEqual(heavy.match, 67);
  assert.strictEqual(heavy.matchCap, null);
});

test('dimension types: match is capped at 60 for one answer, 80 for two', () => {
  const one = sc({ brain: [0, 0, 1] });
  assert.deepStrictEqual([one.typeId, one.match, one.matchCap], ['brain_lite', 60, 60]);
  const two = sc({ school: [0, 2, 0] });
  assert.deepStrictEqual([two.match, two.matchCap], [80, 80]);
  const tie = sc({ school: [0, 2, 0], heart: [0, 2, 0] });
  assert.deepStrictEqual([tie.match, tie.matchCap], [50, null]);
  assert.strictEqual(sc({ heart: [1, 1, 1] }).match, 100);
});

test('tie extras: runnerUpDim, tiedDims and tieBreak say how the lead was picked', () => {
  const alone = sc({ brain: [2, 1, 0] });
  assert.deepStrictEqual([alone.runnerUpDim, alone.tiedDims, alone.tieBreak], [null, [], null]);
  const top = sc({ school: [0, 0, 1], work: [1, 1, 0] });
  assert.deepStrictEqual([top.dominantDim, top.runnerUpDim, top.tiedDims, top.tieBreak], ['school', 'work', ['school', 'work'], 'top']);
  assert.strictEqual(sc({ school: [2, 1, 0], heart: [2, 0, 0] }).tieBreak, null);
});

// ---------- secondary type ----------
test('secondary: runner-up at 75% of the leader counts (8 vs 6 points); 8 vs 5 does not', () => {
  const close = sc({ school: [2, 0, 2], heart: [2, 2, 0] }); // 8 vs 6
  assert.deepStrictEqual([close.typeId, close.secondaryTypeId], ['school_deep', 'heart_lite']);
  const far = sc({ school: [2, 0, 2], heart: [1, 2, 0] });   // 8 vs 5
  assert.deepStrictEqual([far.typeId, far.secondaryTypeId], ['school_deep', null]);
});

test('secondary: the runner-up gets its own lite or deep', () => {
  const both = sc({ school: [2, 2, 2], heart: [2, 2, 1] }); // 12 vs 9
  assert.deepStrictEqual([both.typeId, both.secondaryTypeId], ['school_deep', 'heart_deep']);
});

test('secondary: null for a single dimension, untouched and balanced', () => {
  assert.strictEqual(sc({ brain: [2, 2, 2] }).secondaryTypeId, null);
  assert.strictEqual(sc({ school: [1, 0, 0] }).secondaryTypeId, null);
  assert.strictEqual(sc(ALL([2, 1, 0])).secondaryTypeId, null);
});

test('secondary: a tied runner-up is named', () => {
  const r = sc({ heart: [0, 0, 1], school: [1, 1, 0] });
  assert.deepStrictEqual([r.typeId, r.secondaryTypeId], ['heart_lite', 'school_lite']);
});

// ---------- invariants over many random players on random draws ----------
test('invariants hold for 20,000 random answer sets on random draws', () => {
  let x = 12345;
  const rand = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  const weight = { mild: 1, medium: 2, extreme: 3 };
  for (let n = 0; n < 20000; n++) {
    const drawn = drawStatements(content, 'inv' + String(n).padStart(3, '0'));
    const p = rand();
    const ids = drawn.filter((id) => rand() < p * (1.3 - weight[byId[id].band] / 3));
    const r = score(ids, content, drawn);
    const admitted = new Set(ids);
    assert.strictEqual(r.drawnCount, 30);
    assert.strictEqual(r.purity, Math.round(100 * (1 - ids.length / 30)));
    assert.ok(TYPE_IDS.includes(r.typeId));
    assert.ok(r.secondaryTypeId === null || (TYPE_IDS.includes(r.secondaryTypeId) && r.secondaryTypeId !== r.typeId));
    assert.ok(r.match >= 0 && r.match <= 100);
    assert.ok(r.evidenceIds.length <= 3 && r.evidenceIds.every((e) => admitted.has(e)));
    for (let k = 1; k < r.evidenceIds.length; k++) {
      assert.ok(weight[byId[r.evidenceIds[k - 1]].band] >= weight[byId[r.evidenceIds[k]].band]);
    }
    if (r.typeId.endsWith('_deep')) {
      const dim = r.typeId.split('_')[0];
      assert.ok(ids.some((sid) => byId[sid].dim === dim && byId[sid].band === 'extreme'), 'deep without an extreme statement');
    }
    if (r.typeId.includes('_')) {
      const dim = r.typeId.split('_')[0];
      assert.strictEqual(r.dominantDim, dim);
      assert.ok(r.evidenceIds.length >= 1 && r.evidenceIds.every((e) => byId[e].dim === dim));
      DIM_KEYS.forEach((k) => assert.ok(r.depth[k] <= r.depth[dim]));
      assert.ok(r.tiedDims.length <= 2);
      assert.ok(r.match >= 50 && r.match <= 100);
      if (r.tiedDims.length === 2) {
        assert.ok(r.secondaryTypeId && r.secondaryTypeId.startsWith(r.tiedDims[1]));
        assert.ok(['top', 'count', 'lot'].includes(r.tieBreak));
      } else {
        assert.strictEqual(r.tieBreak, null);
      }
    }
    if (r.typeId === 'balanced') {
      const even = r.total >= 6 && DIM_KEYS.every((k) => r.perDim[k] > 0);
      assert.ok(even || r.tiedDims.length >= 3, 'balanced without an even spread or a three-way tie');
    }
    if (r.typeId === 'merged') assert.ok(r.total >= 25 || DIM_KEYS.every((k) => r.band[k] === 'high'));
    if (r.typeId === 'untouched') assert.ok(r.total <= 3);
    if (r.typeId === 'soulmate') assert.ok(r.perDim.bond === 6 && r.hiddenRule);
    if (r.hiddenRule && r.typeId !== 'soulmate') assert.strictEqual(r.typeId, 'merged');
  }
});

// ---------- RULES ----------
test('RULES: thresholds are the documented ones (update SCORING.md if you change them)', () => {
  assert.deepStrictEqual(
    [RULES.midFrom, RULES.highFrom, RULES.deepFromExtremes, RULES.mergedMinTotal, RULES.untouchedMaxTotal,
      RULES.balancedMinTotal, RULES.balancedMaxSpread, RULES.balancedTieMin, RULES.soulmateHeartExtremes,
      RULES.closeRatio, RULES.matchCapOne, RULES.matchCapTwo, RULES.evidenceMax],
    [25, 55, 2, 25, 3, 6, 17, 3, 1, 0.75, 60, 80, 3]
  );
});

// ---------- questionOrder (deprecated) ----------
test('questionOrder (deprecated): still lists the whole bank in rounds, for the old app.js', () => {
  const order = questionOrder(content);
  assert.strictEqual(order.length, 105);
  assert.deepStrictEqual(order.slice(0, 5).map((s) => s.dim), DIM_KEYS);
});

// ---------- validateContent ----------
function problemsAfter(mutate, options) {
  const c = makeContent();
  mutate(c);
  return validateContent(c, options);
}

function assertProblem(mutate, pattern, options) {
  const problems = problemsAfter(mutate, options);
  assert.ok(problems.some((p) => pattern.test(p)), 'expected a problem matching ' + pattern + ', got:\n' + problems.join('\n'));
}

test('validateContent: the fixture is valid, strictly too', () => {
  assert.deepStrictEqual(validateContent(makeContent()), []);
  assert.deepStrictEqual(validateContent(makeContent(), { strict: true }), []);
});

test('validateContent: missing content', () => {
  assert.strictEqual(validateContent(undefined).length, 1);
});

test('validateContent: every statement needs a known band; no flags, no levels', () => {
  assertProblem((c) => { delete c.statements[0].band; }, /band must be "mild", "medium" or "extreme", found "undefined"/);
  assertProblem((c) => { c.statements[0].band = 'spicy'; }, /found "spicy"/);
  assertProblem((c) => { c.statements[0].flag = 'soulmate'; }, /has flag "soulmate", but statements carry no flags/);
  assertProblem((c) => { c.statements[0].level = 3; }, /"level" is not used any more/);
});

test('validateContent: a stratum with fewer than 2 statements makes a draw impossible', () => {
  const problems = problemsAfter((c) => {
    c.statements = c.statements.filter((s) => !(s.dim === 'heart' && s.band === 'extreme')).concat(
      [{ id: 's200', dim: 'heart', band: 'extreme', text: pair('only one') }]);
  });
  assert.ok(problems.some((p) => /"heart" has 1 extreme statement\(s\); a draw needs at least 2/.test(p)), problems.join('\n'));
});

test('validateContent: unequal strata are a warning while filling, a problem when strict or full', () => {
  // 3 / 3 / 3 everywhere except one stratum of 4: 46 statements, not full.
  const c = makeContent(3);
  c.statements.push({ id: 's99', dim: 'school', band: 'mild', text: pair('one more') });
  assert.deepStrictEqual(validateContent(c), []);
  assert.ok(bankReport(c).warnings.some((w) => /different sizes/.test(w)));
  assert.ok(validateContent(c, { strict: true }).some((p) => /must have the same size/.test(p)));
  // A full bank with one extra statement (106): always a problem.
  assertProblem((full) => { full.statements.push({ id: 's106', dim: 'bond', band: 'mild', text: pair('extra') }); }, /must have the same size/);
});

test('bankReport: sizes, chances and whether the bank is full', () => {
  const full = bankReport(makeContent());
  assert.strictEqual(full.total, BANK_TARGET);
  assert.strictEqual(full.equal, true);
  assert.strictEqual(full.full, true);
  assert.deepStrictEqual(full.warnings, []);
  assert.strictEqual(full.chance.school.mild, 2 / 7);
  const small = bankReport(makeContent(3));
  assert.strictEqual(small.equal, true);
  assert.strictEqual(small.full, false);
  assert.ok(/the target is 7/.test(small.warnings[0]));
});

test('validateContent: ids must look like s01 and be unique; file order is free', () => {
  assertProblem((c) => { c.statements[1].id = 's01'; }, /duplicate id "s01"/);
  assertProblem((c) => { c.statements[1].id = 'x1'; }, /id must look like/);
  const c = makeContent();
  c.statements.reverse();
  assert.deepStrictEqual(validateContent(c), []);
});

test('validateContent: unknown dim, wrong dimension count and key order', () => {
  assertProblem((c) => { c.statements[0].dim = 'gym'; }, /unknown dim "gym"/);
  assertProblem((c) => c.dimensions.pop(), /dimensions: expected 5/);
  assertProblem((c) => c.dimensions.reverse(), /key should be "school"/);
});

test('validateContent: missing en or zh', () => {
  assertProblem((c) => { delete c.statements[3].text.zh; }, /"text" is missing zh/);
  assertProblem((c) => { c.types[2].roast.en = ''; }, /"roast" is missing en/);
  assertProblem((c) => { delete c.dimensions[1].name; }, /missing "name"/);
  assertProblem((c) => { c.ui.start = { en: 'Start' }; }, /ui: "start" is missing zh/);
});

test('validateContent: missing ui key', () => {
  assertProblem((c) => { delete c.ui.saveImage; }, /ui: missing key "saveImage"/);
});

test('validateContent: missing, unknown and duplicate type ids', () => {
  assertProblem((c) => c.types.pop(), /missing type id "bond_deep"/);
  assertProblem((c) => { c.types[0].id = 'mystery'; }, /unknown type id "mystery"/);
  assertProblem((c) => { c.types[1].id = 'untouched'; }, /duplicate type id "untouched"/);
});

test('validateContent: bad code and colour', () => {
  assertProblem((c) => { c.types[0].code = 'lowercase'; }, /code must be/);
  assertProblem((c) => { c.types[0].color = 'yellow'; }, /color must be/);
});

test('validateContent: length limits', () => {
  assertProblem((c) => { c.statements[0].text.en = 'x'.repeat(91); }, /English text is 91 chars/);
  assertProblem((c) => { c.statements[0].text.zh = '字'.repeat(35); }, /Chinese text is 35 chars/);
  assertProblem((c) => { c.types[0].tagline.en = 'x'.repeat(61); }, /English tagline is 61/);
  assertProblem((c) => { c.types[0].tagline.zh = '字'.repeat(25); }, /Chinese tagline is 25/);
});

test('validateContent: a null or non-object entry is reported, not thrown', () => {
  assertProblem((c) => { c.statements[3] = null; }, /statements\[3\]: not an object/);
  assertProblem((c) => { c.types[0] = 'oops'; }, /types\[0\]: not an object/);
  assertProblem((c) => { c.dimensions[2] = null; }, /dimensions\[2\]: not an object/);
});

// ---------- validateContent: result-screen copy ----------
test('profiles: missing or incomplete dimension reads', () => {
  assertProblem((c) => { delete c.dimensions[2].reads; }, /dimensions\[2\] \(heart\): missing "reads"/);
  assertProblem((c) => { delete c.dimensions[0].reads.mid; }, /school\) reads: missing "mid"/);
  assertProblem((c) => { c.dimensions[4].reads.high = { en: 'x' }; }, /bond\) reads: "high" is missing zh/);
});

test('profiles: missing why; signs must be exactly 3 complete pairs', () => {
  assertProblem((c) => { delete c.types[3].why; }, /\(soulmate\): missing "why"/);
  assertProblem((c) => { delete c.types[0].signs; }, /\(untouched\): missing "signs"/);
  assertProblem((c) => { c.types[0].signs.pop(); }, /"signs" has 2 lines \(need 3\)/);
  assertProblem((c) => { c.types[0].signs[1] = { en: 'only english' }; }, /signs: "1" is missing zh/);
});

test('profiles: bestWith and clashWith must name another real type, with a line', () => {
  assertProblem((c) => { delete c.types[1].bestWith; }, /\(merged\): "bestWith" must be one of the 14 type ids/);
  assertProblem((c) => { c.types[1].clashWith = 'nobody'; }, /"clashWith" must be one of the 14 type ids, found "nobody"/);
  assertProblem((c) => { c.types[1].bestWith = 'merged'; }, /"bestWith" points at the type itself/);
  assertProblem((c) => { delete c.types[1].bestWithLine; }, /missing "bestWithLine"/);
});

test('profiles: validateProfiles reports exactly the profile problems that validateContent includes', () => {
  const c = makeContent();
  c.dimensions.forEach((d) => { delete d.reads; });
  c.types.forEach((t) => { delete t.why; delete t.signs; delete t.bestWith; delete t.bestWithLine; delete t.clashWith; delete t.clashWithLine; });
  const profileProblems = validateProfiles(c);
  assert.strictEqual(profileProblems.length, 5 + 14 * 6);
  assert.deepStrictEqual(validateContent(c), profileProblems);
});
