// Run with: node --test tests/
// Rules tests on a small fixture built in code (not the real content.js),
// so every number below can be worked out by hand. See SCORING.md.
const test = require('node:test');
const assert = require('node:assert');
const {
  score, questionOrder, validateContent, validateProfiles,
  DIM_KEYS, TIE_ORDER, TYPE_IDS, UI_KEYS, BANDS, RULES
} = require('../scoring.js');

// ---------- a small, valid fixture ----------
// Statement ids: school s01-s10, work s11-s20, heart s21-s30, brain s31-s40, bond s41-s50.
// Level = position inside the dimension: s01 is school level 1, s18 is work level 8.
// Weights: levels 1-4 = 1 point, 5-7 = 2 points, 8-10 = 3 points; 19 points per dimension.
// The three soulmate flags sit on the LAST three bond statements (s48-s50).
const SOULMATE_IDS = ['s48', 's49', 's50'];

function pair(text) {
  return { en: text, zh: '中文' + text };
}

function makeContent() {
  const ui = {};
  UI_KEYS.forEach((key) => { ui[key] = pair(key); });

  const dimensions = DIM_KEYS.map((key) => ({
    key,
    name: pair(key),
    reads: { none: pair('none'), low: pair('low'), mid: pair('mid'), high: pair('high') }
  }));

  const statements = [];
  for (let i = 1; i <= 50; i++) {
    const id = 's' + String(i).padStart(2, '0');
    const s = { id, dim: DIM_KEYS[Math.floor((i - 1) / 10)], text: pair('Did thing ' + i) };
    if (SOULMATE_IDS.includes(id)) s.flag = 'soulmate';
    statements.push(s);
  }

  const types = TYPE_IDS.map((id, i) => ({
    id,
    code: 'T-' + String(i).padStart(2, '0'),
    name: pair(id),
    tagline: pair('tag'),
    roast: pair('roast'),
    superpower: pair('power'),
    weakness: pair('weak'),
    aiSays: pair('says'),
    color: '#F2C14E',
    why: pair('why'),
    signs: [pair('sign 1'), pair('sign 2'), pair('sign 3')],
    bestWith: TYPE_IDS[(i + 1) % TYPE_IDS.length],
    bestWithLine: pair('best'),
    clashWith: TYPE_IDS[(i + 2) % TYPE_IDS.length],
    clashWithLine: pair('clash')
  }));

  return { ui, dimensions, statements, types };
}

const content = makeContent();

// Statement id for (dimension, level), e.g. id('work', 8) -> 's18'.
function id(dim, level) {
  return 's' + String(DIM_KEYS.indexOf(dim) * 10 + level).padStart(2, '0');
}
// Ids for a list of levels in one dimension.
function levels(dim, list) {
  return list.map((level) => id(dim, level));
}
// Ids for the first n levels of a dimension.
function firstN(dim, n) {
  return levels(dim, Array.from({ length: n }, (_, i) => i + 1));
}
// Ticks from counts like { school: 3, bond: 5 } (the first n of each).
function tick(counts) {
  return Object.keys(counts).flatMap((dim) => firstN(dim, counts[dim]));
}

// ---------- basic numbers ----------
test('total, purity and perDim', () => {
  const r = score(tick({ school: 2, work: 3, bond: 1 }), content);
  assert.strictEqual(r.total, 6);
  assert.strictEqual(r.purity, 88);
  assert.deepStrictEqual(r.perDim, { school: 2, work: 3, heart: 0, brain: 0, bond: 1 });
});

test('weights: levels 1-4 = 1, 5-7 = 2, 8-10 = 3', () => {
  const pointsOf = (level) => score([id('school', level)], content).points.school;
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pointsOf), [1, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
  assert.strictEqual(score(firstN('work', 10), content).points.work, 19);
});

test('depth is points out of 19, as 0..100, rounded', () => {
  const r = score([].concat(firstN('school', 4), firstN('work', 7), firstN('heart', 8), firstN('brain', 10)), content);
  assert.deepStrictEqual(r.points, { school: 4, work: 10, heart: 13, brain: 19, bond: 0 });
  assert.deepStrictEqual(r.depth, { school: 21, work: 53, heart: 68, brain: 100, bond: 0 });
});

test('bands: 0 none, 1-4 points low, 5-10 mid, 11+ high', () => {
  const bandFor = (ids) => score(ids, content).band.school;
  assert.strictEqual(bandFor([]), 'none');
  assert.strictEqual(bandFor(levels('school', [1])), 'low');
  assert.strictEqual(bandFor(firstN('school', 4)), 'low');              // 4 points, depth 21
  assert.strictEqual(bandFor(levels('school', [1, 2, 3, 5])), 'mid');   // 5 points, depth 26
  assert.strictEqual(bandFor(firstN('school', 7)), 'mid');              // 10 points, depth 53
  assert.strictEqual(bandFor(levels('school', [1, 2, 3, 4, 5, 6, 8])), 'high'); // 11 points, depth 58
  // Every band name the scoring returns is one content.js writes a line for.
  const r = score(firstN('school', 9).concat(firstN('work', 5), firstN('heart', 1)), content);
  Object.values(r.band).forEach((b) => assert.ok(BANDS.includes(b)));
});

test('high band needs an extreme statement: all of levels 1-7 is still mid', () => {
  const r = score(firstN('school', 7), content);
  assert.strictEqual(r.points.school, 10);
  assert.strictEqual(r.band.school, 'mid');
  assert.strictEqual(r.typeId, 'school_lite');
});

test('unknown and duplicate ids are ignored; a Set works too', () => {
  const r = score(['s01', 's01', 'nope', 's02'], content);
  assert.strictEqual(r.total, 2);
  assert.strictEqual(score(new Set(['s01', 's02', 's03', 's04']), content).total, 4);
});

test('pure and deterministic: same answers in any order give the same result; nothing is changed', () => {
  const answers = ['s05', 's21', 's22', 's08', 's41', 's33', 's12'];
  const before = JSON.stringify(content);
  const a = score(answers, content);
  const b = score(answers.slice().reverse(), content);
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual(answers, ['s05', 's21', 's22', 's08', 's41', 's33', 's12']);
  assert.strictEqual(JSON.stringify(content), before);
});

test('content without the new profile fields still scores (the app must not crash)', () => {
  const c = makeContent();
  c.dimensions.forEach((d) => { delete d.reads; });
  c.types.forEach((t) => { delete t.why; delete t.signs; delete t.bestWith; delete t.clashWith; });
  assert.strictEqual(score(firstN('heart', 9), c).typeId, 'heart_deep');
});

// ---------- untouched ----------
test('untouched: nothing admitted', () => {
  const r = score([], content);
  assert.deepStrictEqual(
    [r.total, r.purity, r.typeId, r.secondaryTypeId, r.evidenceIds, r.match, r.dominantDim],
    [0, 100, 'untouched', null, [], 100, null]
  );
});

test('untouched: up to 4 mild statements; a 5th is not untouched', () => {
  assert.strictEqual(score(['s01', 's11', 's21', 's31'], content).typeId, 'untouched');
  assert.strictEqual(score(firstN('school', 4), content).typeId, 'untouched');
  assert.notStrictEqual(score(['s01', 's11', 's21', 's31', 's41'], content).typeId, 'untouched');
});

test('untouched: one medium or extreme statement is already a direction', () => {
  assert.strictEqual(score([id('school', 5)], content).typeId, 'school_lite');
  assert.strictEqual(score(['s01', 's02', 's11', id('brain', 10)], content).typeId, 'brain_lite');
});

test('untouched: evidence is whatever was admitted, most extreme first; match = purity', () => {
  const r = score(['s01', 's23', 's32'], content);
  assert.strictEqual(r.typeId, 'untouched');
  assert.deepStrictEqual(r.evidenceIds, ['s23', 's32', 's01']);
  assert.strictEqual(r.match, 94);
});

// ---------- soulmate ----------
test('soulmate: all three flagged statements, even with nothing else', () => {
  const r = score(SOULMATE_IDS, content);
  assert.strictEqual(r.typeId, 'soulmate');
  assert.strictEqual(r.match, 100);
});

test('soulmate: two of three is not enough', () => {
  const r = score(['s48', 's49', 's01', 's02', 's03'], content);
  assert.notStrictEqual(r.typeId, 'soulmate');
});

test('soulmate: evidence is the three flagged statements, most extreme first', () => {
  const r = score(SOULMATE_IDS.concat(firstN('heart', 9)), content);
  assert.deepStrictEqual(r.evidenceIds, ['s50', 's49', 's48']);
});

test('soulmate: secondary is the type the player would get without the soulmate rule', () => {
  // Just the trio: two of the three are extreme Bond statements -> bond_deep.
  assert.strictEqual(score(SOULMATE_IDS, content).secondaryTypeId, 'bond_deep');
  // A full heart section on top: heart 19 points is deeper -> heart_deep.
  assert.strictEqual(score(SOULMATE_IDS.concat(firstN('heart', 10)), content).secondaryTypeId, 'heart_deep');
  // The trio plus an even spread across everything -> balanced.
  const even = [].concat(firstN('school', 7), firstN('work', 7), firstN('heart', 7), firstN('brain', 7), SOULMATE_IDS, firstN('bond', 2));
  const r = score(even, content);
  assert.strictEqual(r.typeId, 'soulmate');
  assert.strictEqual(r.secondaryTypeId, 'balanced');
});

test('soulmate: merged wins when nearly everything is admitted, and soulmate becomes the secondary', () => {
  const all = content.statements.map((s) => s.id);
  const r = score(all, content);
  assert.strictEqual(r.typeId, 'merged');
  assert.strictEqual(r.secondaryTypeId, 'soulmate');
});

// ---------- merged ----------
test('merged: 42 admitted is merged, 41 is not', () => {
  const r42 = score(tick({ school: 10, work: 10, heart: 10, brain: 10, bond: 2 }), content);
  assert.strictEqual(r42.total, 42);
  assert.strictEqual(r42.typeId, 'merged');
  assert.strictEqual(r42.secondaryTypeId, null); // no soulmate trio
  assert.strictEqual(r42.match, 82);             // average depth: (100 x 4 + 100 x 2/19) / 5

  const r41 = score(tick({ school: 10, work: 10, heart: 10, brain: 10, bond: 1 }), content);
  assert.strictEqual(r41.total, 41);
  assert.notStrictEqual(r41.typeId, 'merged');
});

test('merged: evidence is the most extreme statement of each dimension, top three', () => {
  const r = score(content.statements.map((s) => s.id), content);
  // All five dimensions are full and tied, so the dimension ranking (TIE_ORDER) orders them.
  assert.deepStrictEqual(r.evidenceIds, ['s50', 's30', 's40']);
});

test('merged: every section in the high band is merged, even well below 42', () => {
  // Levels 1-8 everywhere: 13 points (high) in all five, 40 admitted.
  const r = score(tick({ school: 8, work: 8, heart: 8, brain: 8, bond: 8 }), content);
  assert.strictEqual(r.total, 40);
  assert.strictEqual(r.typeId, 'merged');
  assert.strictEqual(r.match, 68); // every section at depth 68
  // The thinnest way in: levels 7-10 in every section (2+3+3+3 = 11 points each), 20 admitted.
  const thin = [].concat(...DIM_KEYS.map((d) => levels(d, [7, 8, 9, 10])));
  assert.strictEqual(score(thin, content).typeId, 'merged');
  // One section short of high is not enough.
  const short = tick({ school: 8, work: 8, heart: 8, brain: 8, bond: 7 });
  assert.notStrictEqual(score(short, content).typeId, 'merged');
});

// ---------- balanced ----------
test('balanced: 2 mild in every dimension (10 in total)', () => {
  const r = score(tick({ school: 2, work: 2, heart: 2, brain: 2, bond: 2 }), content);
  assert.strictEqual(r.typeId, 'balanced');
  assert.strictEqual(r.secondaryTypeId, null);
  assert.strictEqual(r.match, 100);
});

test('balanced (even spread): needs at least 10 admitted', () => {
  // 9 admitted, all five touched, within 2 points, but only School on top: not balanced.
  const r = score(tick({ school: 3, work: 2, heart: 2, brain: 1, bond: 1 }), content);
  assert.strictEqual(r.total, 9);
  assert.strictEqual(r.typeId, 'school_lite');
});

test('balanced (even spread): every dimension must be touched', () => {
  const r = score(tick({ school: 4, work: 3, heart: 3, brain: 3 }), content);
  assert.strictEqual(r.typeId, 'school_lite');
});

test('balanced (tie): three or more sections sharing the top points is balanced', () => {
  // Four sections at 3 points, Bond empty: no section can claim this player.
  const four = score(tick({ school: 3, work: 3, heart: 3, brain: 3 }), content);
  assert.strictEqual(four.typeId, 'balanced');
  assert.deepStrictEqual(four.tiedDims, ['heart', 'brain', 'work', 'school']);
  assert.strictEqual(four.match, 100); // empty sections are left out of the evenness
  assert.strictEqual(four.secondaryTypeId, null);
  // Fewer than 10 admitted still counts: 2 + 2 + 2 + 2 + 1.
  assert.strictEqual(score(tick({ school: 2, work: 2, heart: 2, brain: 2, bond: 1 }), content).typeId, 'balanced');
  // Three medium statements in three sections, nothing else.
  assert.strictEqual(score([id('school', 5), id('work', 5), id('heart', 5)], content).typeId, 'balanced');
  // Three full sections, two empty: still a three-way tie.
  const heavy = score(tick({ school: 10, heart: 10, brain: 10 }), content);
  assert.strictEqual(heavy.typeId, 'balanced');
  assert.strictEqual(heavy.match, 100);
  // A two-way tie is not balanced: it stays a section type with the other as secondary.
  const two = score(tick({ school: 5, heart: 5 }), content);
  assert.deepStrictEqual([two.typeId, two.secondaryTypeId], ['heart_lite', 'school_lite']);
});

test('balanced (tie): untouched is checked first', () => {
  // s01, s11, s21: three-way tie at 1 point, but three mild statements is the Analog.
  assert.strictEqual(score(['s01', 's11', 's21'], content).typeId, 'untouched');
  // One mild statement in each of the five sections (5 admitted) is a five-way tie.
  assert.strictEqual(score(['s01', 's11', 's21', 's31', 's41'], content).typeId, 'balanced');
});

test('balanced: deepest and shallowest at most 4 points apart; 5 apart is a leaning', () => {
  const others = tick({ work: 2, heart: 2, brain: 2, bond: 2 }); // 2 points each
  const four = score(firstN('school', 5).concat(others), content); // school 6 points
  assert.strictEqual(four.typeId, 'balanced');
  assert.strictEqual(four.match, 79); // 100 - (100 * 4 / 19)

  const five = score(levels('school', [1, 2, 3, 5, 6]).concat(others), content); // school 7 points
  assert.strictEqual(five.typeId, 'school_lite');
});

test('balanced: one clear obsession is never balanced', () => {
  const r = score(firstN('heart', 10).concat(tick({ school: 3, work: 3, brain: 3, bond: 3 })), content);
  assert.strictEqual(r.typeId, 'heart_deep');
});

test('balanced: evidence is one statement per dimension, most extreme first', () => {
  const r = score([].concat(firstN('school', 3), firstN('work', 2), firstN('heart', 4), firstN('brain', 2), firstN('bond', 3)), content);
  assert.strictEqual(r.typeId, 'balanced');
  // heart level 4, then bond and school at level 3 (bond ranks higher: same depth and level, TIE_ORDER).
  assert.deepStrictEqual(r.evidenceIds, ['s24', 's43', 's03']);
});

// ---------- dimension types ----------
test('dimension types: each dimension can lead', () => {
  DIM_KEYS.forEach((dim) => {
    assert.strictEqual(score(firstN(dim, 6), content).typeId, dim + '_lite');
    assert.strictEqual(score(firstN(dim, 8), content).typeId, dim + '_deep');
  });
});

test('lite vs deep: decided by the leading dimension, 10 points lite, 11 points deep', () => {
  assert.strictEqual(score(firstN('work', 7), content).typeId, 'work_lite');                     // 10 points
  assert.strictEqual(score(levels('work', [1, 2, 3, 4, 5, 6, 8]), content).typeId, 'work_deep'); // 11 points
});

test('lite vs deep: not decided by the overall total', () => {
  // A full school section and nothing else: only 10 admitted, but deep.
  assert.strictEqual(score(firstN('school', 10), content).typeId, 'school_deep');
  // 22 admitted (more than the full school section above), but school only reaches medium: lite.
  const r = score(firstN('school', 7).concat(tick({ work: 4, heart: 4, brain: 4, bond: 3 })), content);
  assert.strictEqual(r.total, 22);
  assert.strictEqual(r.typeId, 'school_lite');
});

test('a few mild statements are never "deep"', () => {
  assert.strictEqual(score(['s01', 's02', 's03', 's04', 's11'], content).typeId, 'school_lite');
});

test('tie-break 1: higher depth wins, even against a more extreme statement', () => {
  // work: 4 mild = 4 points; school: one level-8 = 3 points.
  assert.strictEqual(score(firstN('work', 4).concat([id('school', 8)]), content).typeId, 'work_lite');
});

test('tie-break 2: equal depth -> the more extreme statement wins', () => {
  // school: s08 alone = 3 points; work: three mild = 3 points.
  const r = score([id('school', 8)].concat(firstN('work', 3)), content);
  assert.strictEqual(r.typeId, 'school_lite');
  assert.strictEqual(r.dominantDim, 'school');
});

test('tie-break 3: equal depth and top level -> more statements wins', () => {
  // bond: levels 5+6 = 4 points, top 6, 2 statements.
  // school: levels 1+2+6 = 4 points, top 6, 3 statements. School wins despite TIE_ORDER.
  const r = score(levels('bond', [5, 6]).concat(levels('school', [1, 2, 6])), content);
  assert.strictEqual(r.typeId, 'school_lite');
});

test('tie-break 4: a full tie follows bond > heart > brain > work > school', () => {
  for (let i = 0; i < TIE_ORDER.length; i++) {
    for (let j = i + 1; j < TIE_ORDER.length; j++) {
      const winner = TIE_ORDER[i];
      const loser = TIE_ORDER[j];
      const r = score(tick({ [winner]: 5, [loser]: 5 }), content);
      assert.strictEqual(r.typeId, winner + '_lite', winner + ' should beat ' + loser);
      const reversed = score(tick({ [loser]: 5, [winner]: 5 }), content);
      assert.strictEqual(reversed.typeId, winner + '_lite');
    }
  }
});

test('dimension types: evidence is the leading dimension, most extreme first, at most 3', () => {
  const r = score(levels('heart', [1, 2, 5, 9]).concat(['s01', 's02', 's41']), content);
  assert.strictEqual(r.typeId, 'heart_lite');
  assert.deepStrictEqual(r.evidenceIds, ['s29', 's25', 's22']);
  // Fewer than 3 admitted in the leading dimension -> fewer ids.
  assert.deepStrictEqual(score([id('brain', 10)], content).evidenceIds, ['s40']);
});

test('dimension types: match = lead / (lead + runner-up), 50 for a dead heat, 100 alone', () => {
  assert.strictEqual(score(firstN('brain', 8), content).match, 100);
  // work 8 points, school 8 points: 50.
  assert.strictEqual(score(firstN('school', 6).concat(firstN('work', 6)), content).match, 50);
  // school 8 points, heart 4 points, bond 1: 8 / 12 = 67. Bond does not count.
  assert.strictEqual(score(firstN('school', 6).concat(firstN('heart', 4), ['s41']), content).match, 67);
  // A heavy player with lots everywhere is not punished: 19 vs 10.
  const heavy = score(firstN('brain', 10).concat(firstN('school', 7), firstN('work', 7), firstN('heart', 7), firstN('bond', 7)), content);
  assert.strictEqual(heavy.typeId, 'brain_deep');
  assert.strictEqual(heavy.match, 66);
  assert.strictEqual(heavy.matchCap, null);
});

test('dimension types: match is capped at 60 for one answer, 80 for two', () => {
  const one = score([id('brain', 10)], content);
  assert.deepStrictEqual([one.typeId, one.match, one.matchCap], ['brain_lite', 60, 60]);
  const two = score([id('school', 5), id('school', 6)], content);
  assert.deepStrictEqual([two.match, two.matchCap], [80, 80]);
  // The cap only applies when it lowers the number: two answers in a tie stay at 50.
  const tie = score([id('school', 5), id('school', 6), id('heart', 5), id('heart', 6)], content);
  assert.deepStrictEqual([tie.match, tie.matchCap], [50, null]);
  // Three answers: no cap.
  assert.strictEqual(score(levels('heart', [5, 6, 7]), content).match, 100);
});

test('tie extras: runnerUpDim, tiedDims and tieBreak say how the lead was picked', () => {
  const alone = score(firstN('brain', 3), content);
  assert.deepStrictEqual([alone.runnerUpDim, alone.tiedDims, alone.tieBreak], [null, [], null]);
  // school s08 (3 points, top level 8) vs work s11-s13 (3 points, top level 3).
  const top = score([id('school', 8)].concat(firstN('work', 3)), content);
  assert.deepStrictEqual([top.dominantDim, top.runnerUpDim, top.tiedDims, top.tieBreak], ['school', 'work', ['school', 'work'], 'top']);
  // bond 5+6 (4 points, top 6, 2 statements) vs school 1+2+6 (4 points, top 6, 3 statements).
  assert.strictEqual(score(levels('bond', [5, 6]).concat(levels('school', [1, 2, 6])), content).tieBreak, 'count');
  // A mirror image: only the fixed order can decide.
  assert.strictEqual(score(tick({ school: 5, heart: 5 }), content).tieBreak, 'order');
  // No tie: null.
  assert.strictEqual(score(firstN('school', 5).concat(firstN('heart', 4)), content).tieBreak, null);
});

// ---------- secondary type ----------
test('secondary: runner-up at 75% of the leader counts (8 vs 6 points); 8 vs 5 does not', () => {
  const close = score(firstN('school', 6).concat(firstN('heart', 5)), content); // 8 vs 6
  assert.strictEqual(close.typeId, 'school_lite');
  assert.strictEqual(close.secondaryTypeId, 'heart_lite');

  const far = score(firstN('school', 6).concat(levels('heart', [1, 2, 3, 5])), content); // 8 vs 5
  assert.strictEqual(far.typeId, 'school_lite');
  assert.strictEqual(far.secondaryTypeId, null);
});

test('secondary: the runner-up gets its own lite or deep', () => {
  // school 19 points (deep), heart 16 points (deep).
  const both = score(firstN('school', 10).concat(firstN('heart', 9)), content);
  assert.deepStrictEqual([both.typeId, both.secondaryTypeId], ['school_deep', 'heart_deep']);
  // school 13 points (deep), heart 10 points (lite): 77%, close.
  const mixed = score(firstN('school', 8).concat(firstN('heart', 7)), content);
  assert.deepStrictEqual([mixed.typeId, mixed.secondaryTypeId], ['school_deep', 'heart_lite']);
});

test('secondary: null for a single dimension, untouched and balanced', () => {
  assert.strictEqual(score(firstN('brain', 9), content).secondaryTypeId, null);
  assert.strictEqual(score(['s01'], content).secondaryTypeId, null);
  assert.strictEqual(score(tick({ school: 3, work: 3, heart: 3, brain: 3, bond: 3 }), content).secondaryTypeId, null);
});

test('secondary: a tied runner-up is named', () => {
  const r = score(tick({ heart: 5, school: 5 }), content);
  assert.deepStrictEqual([r.typeId, r.secondaryTypeId], ['heart_lite', 'school_lite']);
});

// ---------- invariants over many random players ----------
test('invariants hold for 20,000 random answer sets', () => {
  let seed = 12345;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let n = 0; n < 20000; n++) {
    const p = rand();
    const ids = content.statements.filter((s, i) => rand() < p * (1.2 - (i % 10) / 10)).map((s) => s.id);
    const r = score(ids, content);
    const admitted = new Set(ids);
    const dimOf = (sid) => DIM_KEYS[Math.floor((Number(sid.slice(1)) - 1) / 10)];
    const levelOf = (sid) => ((Number(sid.slice(1)) - 1) % 10) + 1;

    assert.ok(TYPE_IDS.includes(r.typeId));
    assert.ok(r.secondaryTypeId === null || (TYPE_IDS.includes(r.secondaryTypeId) && r.secondaryTypeId !== r.typeId));
    assert.ok(r.match >= 0 && r.match <= 100);
    assert.ok(r.evidenceIds.length <= 3 && r.evidenceIds.every((e) => admitted.has(e)));
    // Evidence is most extreme first.
    for (let k = 1; k < r.evidenceIds.length; k++) assert.ok(levelOf(r.evidenceIds[k - 1]) >= levelOf(r.evidenceIds[k]));

    if (r.typeId.endsWith('_deep')) {
      const dim = r.typeId.split('_')[0];
      assert.ok(ids.some((sid) => dimOf(sid) === dim && levelOf(sid) >= 8), 'deep without an extreme statement');
    }
    if (r.typeId.includes('_')) {
      const dim = r.typeId.split('_')[0];
      assert.strictEqual(r.dominantDim, dim);
      assert.ok(r.evidenceIds.length >= 1 && r.evidenceIds.every((e) => dimOf(e) === dim));
      DIM_KEYS.forEach((k) => assert.ok(r.depth[k] <= r.depth[dim]));
    }
    if (r.typeId === 'balanced') {
      const even = r.total >= 10 && DIM_KEYS.every((k) => r.perDim[k] > 0);
      assert.ok(even || r.tiedDims.length >= 3, 'balanced without an even spread or a three-way tie');
    }
    if (r.typeId.includes('_')) {
      // Never a three-way tie, and the match runs from 50 (dead heat) to 100.
      assert.ok(r.tiedDims.length <= 2);
      assert.ok(r.match >= 50 && r.match <= 100);
      if (r.tiedDims.length === 2) assert.ok(r.secondaryTypeId && r.secondaryTypeId.startsWith(r.tiedDims[1]));
    }
    if (r.typeId === 'merged') assert.ok(r.total >= 42 || DIM_KEYS.every((k) => r.band[k] === 'high'));
    if (r.typeId === 'untouched') assert.ok(r.total <= 4);
  }
});

// ---------- RULES ----------
test('RULES: thresholds are the documented ones (update SCORING.md if you change them)', () => {
  assert.deepStrictEqual(
    [RULES.mediumFrom, RULES.extremeFrom, RULES.midFrom, RULES.highFrom, RULES.mergedMinTotal,
      RULES.untouchedMaxTotal, RULES.balancedMinTotal, RULES.balancedMaxSpread, RULES.balancedTieMin,
      RULES.closeRatio, RULES.matchCapOne, RULES.matchCapTwo, RULES.evidenceMax],
    [5, 8, 25, 55, 42, 4, 10, 22, 3, 0.75, 60, 80, 3]
  );
});

// ---------- questionOrder ----------
test('questionOrder: rounds of one statement per dimension, mildest first', () => {
  const ids = questionOrder(content).map((s) => s.id);
  assert.strictEqual(ids.length, 50);
  assert.deepStrictEqual(ids.slice(0, 5), ['s01', 's11', 's21', 's31', 's41']);
  assert.deepStrictEqual(ids.slice(5, 10), ['s02', 's12', 's22', 's32', 's42']);
  assert.deepStrictEqual(ids.slice(45), ['s10', 's20', 's30', 's40', 's50']);
});

test('questionOrder: every statement exactly once', () => {
  const ids = questionOrder(content).map((s) => s.id);
  assert.strictEqual(new Set(ids).size, 50);
  assert.deepStrictEqual([...ids].sort(), content.statements.map((s) => s.id).sort());
});

test('questionOrder: position p is round floor(p/5), dimension p%5', () => {
  questionOrder(content).forEach((s, p) => {
    assert.strictEqual(s.dim, DIM_KEYS[p % 5], 'position ' + p);
    const indexInDim = Number(s.id.slice(1)) - 1 - DIM_KEYS.indexOf(s.dim) * 10;
    assert.strictEqual(indexInDim, Math.floor(p / 5), 'position ' + p);
  });
});

test('questionOrder: follows content.dimensions order and copes with uneven sizes', () => {
  const c = makeContent();
  c.dimensions = [c.dimensions[4], c.dimensions[0]]; // bond first, then school
  c.statements = c.statements.filter((s) => s.id === 's41' || s.id === 's42' || s.id === 's01');
  assert.deepStrictEqual(questionOrder(c).map((s) => s.id), ['s41', 's01', 's42']);
});

test('questionOrder: does not change the content it reads', () => {
  const c = makeContent();
  const before = JSON.stringify(c);
  questionOrder(c);
  assert.strictEqual(JSON.stringify(c), before);
});

// ---------- validateContent ----------
function problemsAfter(mutate) {
  const c = makeContent();
  mutate(c);
  return validateContent(c);
}

function assertProblem(mutate, pattern) {
  const problems = problemsAfter(mutate);
  assert.ok(problems.some((p) => pattern.test(p)), 'expected a problem matching ' + pattern + ', got:\n' + problems.join('\n'));
}

test('validateContent: the fixture is valid', () => {
  assert.deepStrictEqual(validateContent(makeContent()), []);
});

test('validateContent: missing content', () => {
  assert.strictEqual(validateContent(undefined).length, 1);
});

test('validateContent: wrong statement count', () => {
  assertProblem((c) => c.statements.pop(), /statements: expected 50, found 49/);
});

test('validateContent: wrong count in one dimension', () => {
  assertProblem((c) => { c.statements[9].dim = 'work'; }, /"school" has 9 statements/);
});

test('validateContent: wrong dimension count and key order', () => {
  assertProblem((c) => c.dimensions.pop(), /dimensions: expected 5/);
  assertProblem((c) => c.dimensions.reverse(), /key should be "school"/);
});

test('validateContent: unknown dim', () => {
  assertProblem((c) => { c.statements[0].dim = 'gym'; }, /unknown dim "gym"/);
});

test('validateContent: duplicate statement id', () => {
  assertProblem((c) => { c.statements[1].id = 's01'; }, /duplicate id "s01"/);
});

test('validateContent: statements out of order', () => {
  assertProblem((c) => {
    const tmp = c.statements[0];
    c.statements[0] = c.statements[15];
    c.statements[15] = tmp;
  }, /grouped by dimension/);
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

test('validateContent: wrong number of soulmate flags', () => {
  assertProblem((c) => { delete c.statements[49].flag; }, /2 carry flag "soulmate"/);
  assertProblem((c) => { c.statements[0].flag = 'soulmate'; }, /4 carry flag "soulmate"/);
  assertProblem((c) => { c.statements[0].flag = 'bestie'; }, /unknown flag "bestie"/);
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

test('profiles: missing why', () => {
  assertProblem((c) => { delete c.types[3].why; }, /\(soulmate\): missing "why"/);
});

test('profiles: signs must be a list of exactly 3 complete pairs', () => {
  assertProblem((c) => { delete c.types[0].signs; }, /\(untouched\): missing "signs"/);
  assertProblem((c) => { c.types[0].signs.pop(); }, /"signs" has 2 lines \(need 3\)/);
  assertProblem((c) => { c.types[0].signs[1] = { en: 'only english' }; }, /signs: "1" is missing zh/);
});

test('profiles: bestWith and clashWith must name another real type, with a line', () => {
  assertProblem((c) => { delete c.types[1].bestWith; }, /\(merged\): "bestWith" must be one of the 14 type ids/);
  assertProblem((c) => { c.types[1].clashWith = 'nobody'; }, /"clashWith" must be one of the 14 type ids, found "nobody"/);
  assertProblem((c) => { c.types[1].bestWith = 'merged'; }, /"bestWith" points at the type itself/);
  assertProblem((c) => { delete c.types[1].bestWithLine; }, /missing "bestWithLine"/);
  assertProblem((c) => { c.types[1].clashWithLine = { zh: '只有中文' }; }, /"clashWithLine" is missing en/);
});

test('profiles: validateProfiles reports exactly the profile problems that validateContent includes', () => {
  const c = makeContent();
  c.dimensions.forEach((d) => { delete d.reads; });
  c.types.forEach((t) => { delete t.why; delete t.signs; delete t.bestWith; delete t.bestWithLine; delete t.clashWith; delete t.clashWithLine; });
  const profileProblems = validateProfiles(c);
  // 5 dimensions x 1 + 14 types x (why, signs, bestWith, bestWithLine, clashWith, clashWithLine)
  assert.strictEqual(profileProblems.length, 5 + 14 * 6);
  assert.deepStrictEqual(validateContent(c), profileProblems);
});

test('deep: two extreme statements in the lead section make it deep even below the high band', () => {
  // Levels 9 and 10 of Heart only: 6 points (mid band), but two extreme confessions.
  const heart = content.statements.filter((x) => x.dim === 'heart').map((x) => x.id);
  assert.strictEqual(score([heart[8], heart[9]], content).typeId, 'heart_deep');
  // One extreme statement plus mild ones stays lite.
  assert.strictEqual(score([heart[0], heart[1], heart[9]], content).typeId, 'heart_lite');
});
