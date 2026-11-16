// The play-off, the answer codes that carry it, the personal reason lines
// and the play history. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const scoring = require('../scoring.js');
const extras = require('../extras.js');
const { PERSONAS, playoffByCounts } = require('../tools/personas.js');
const { seedStream } = require('../tools/sim-helpers.js');
require('../content.js');
const content = globalThis.APT_CONTENT;
const { score, drawStatements, admitByCounts, playoffRounds, DIM_KEYS } = scoring;
const byId = Object.fromEntries(content.statements.map((s) => [s.id, s]));
const MIRROR = { school: [2, 1, 0], heart: [2, 1, 0] };

// A tied play: the seed, the draw, the admitted ids and the plain result.
function tiedPlay(seed) {
  const drawn = drawStatements(content, seed);
  const admitted = admitByCounts(content, drawn, MIRROR);
  return { seed, drawn, admitted, r: score(admitted, content, drawn) };
}
// Play-off answers: per round [answer for ids[0], answer for ids[1]].
function answersFor(rounds, perRound) {
  const out = {};
  perRound.forEach((pair, i) => { rounds[i].ids.forEach((id, k) => { out[id] = pair[k]; }); });
  return out;
}

test('playoffRounds: three rounds, medium then mild then extreme, one unseen statement per tied section', () => {
  const seeds = seedStream('playoff-rounds');
  for (let n = 0; n < 500; n++) {
    const drawn = drawStatements(content, seeds());
    const pair = [DIM_KEYS[n % 5], DIM_KEYS[(n + 2) % 5]];
    const rounds = playoffRounds(content, drawn, pair);
    assert.deepStrictEqual(rounds.map((r) => r.band), ['medium', 'mild', 'extreme']);
    rounds.forEach((round) => {
      assert.strictEqual(round.ids.length, 2);
      assert.deepStrictEqual(round.ids.map((id) => byId[id].dim).sort(), [...pair].sort());
      round.ids.forEach((id) => {
        assert.strictEqual(byId[id].band, round.band);
        assert.ok(!drawn.includes(id), id + ' was already among the 30');
      });
    });
    // Same play, same play-off; the order of the pair does not matter.
    assert.deepStrictEqual(playoffRounds(content, drawn, pair.slice().reverse()), rounds);
  }
  assert.deepStrictEqual(playoffRounds(content, drawStatements(content, 'abc123'), ['school']), []);
  assert.deepStrictEqual(playoffRounds(content, drawStatements(content, 'abc123'), ['school', 'nope']), []);
  // The draw of the 30 itself is untouched by asking for a play-off.
  const before = drawStatements(content, 'k3x9q0');
  playoffRounds(content, before, ['work', 'bond']);
  assert.deepStrictEqual(drawStatements(content, 'k3x9q0'), before);
  const src = fs.readFileSync(path.join(__dirname, '..', 'scoring.js'), 'utf8');
  assert.match(src, /makeGenerator\('apt-playoff-v1\|'/);
});

test('score: the play-off settles the lead in round 1, round 3, or falls to the lot; nothing else moves', () => {
  const seeds = seedStream('playoff-score');
  let checked = 0;
  for (let n = 0; n < 200; n++) {
    const p = tiedPlay(seeds());
    if (p.r.tieBreak !== 'lot') continue;
    checked += 1;
    const rounds = p.r.playoff.rounds;
    assert.strictEqual(p.r.playoff.played, 0);
    assert.strictEqual(p.r.playoff.complete, false);
    const dimOf = (id) => byId[id].dim;
    // Round 1: the first statement admitted, the second not.
    const one = score(p.admitted, content, p.drawn, null, answersFor(rounds, [['yes', 'no']]));
    assert.strictEqual(one.tieBreak, 'playoff');
    assert.strictEqual(one.playoff.decidedRound, 1);
    assert.strictEqual(one.dominantDim, dimOf(rounds[0].ids[0]));
    assert.strictEqual(one.typeId, dimOf(rounds[0].ids[0]) + '_lite');
    // Level twice, then the second section's extreme statement wins round 3.
    const three = score(p.admitted, content, p.drawn, null, answersFor(rounds, [['yes', 'yes'], ['no', 'unsure'], ['no', 'yes']]));
    assert.strictEqual(three.tieBreak, 'playoff');
    assert.strictEqual(three.playoff.decidedRound, 3);
    assert.strictEqual(three.dominantDim, dimOf(rounds[2].ids[1]));
    // Level through all three: the lot, as before, and it says the play-off was played.
    const level = score(p.admitted, content, p.drawn, null, answersFor(rounds, [['no', 'no'], ['yes', 'yes'], ['unsure', 'no']]));
    assert.strictEqual(level.tieBreak, 'lot');
    assert.strictEqual(level.playoff.played, 3);
    assert.strictEqual(level.playoff.complete, true);
    assert.strictEqual(level.typeId, p.r.typeId, 'the lot decides as before');
    // Half played: still open, the lot's answer stands for now.
    const half = score(p.admitted, content, p.drawn, null, answersFor(rounds, [['no', 'no']]));
    assert.strictEqual(half.playoff.played, 1);
    assert.strictEqual(half.playoff.complete, false);
    // Everything but the lead stays on the 30.
    [one, three, level].forEach((r) => {
      ['total', 'purity', 'drawnCount', 'match', 'matchCap'].forEach((k) => assert.deepStrictEqual(r[k], p.r[k], k));
      ['perDim', 'points', 'depth', 'band', 'shown'].forEach((k) => assert.deepStrictEqual(r[k], p.r[k], k));
      assert.deepStrictEqual([...r.tiedDims].sort(), [...p.r.tiedDims].sort());
      r.evidenceIds.forEach((id) => assert.ok(p.admitted.includes(id), 'evidence comes from the 30'));
      assert.strictEqual(r.secondaryTypeId, r.tiedDims[1] + '_lite');
    });
  }
  assert.ok(checked > 150, 'most seeds give the mirror tie (' + checked + ')');
});

test('score: play-off answers change nothing when there is no tie for the lot', () => {
  const drawn = drawStatements(content, 'abc123');
  const admitted = admitByCounts(content, drawn, { school: [2, 2, 1], heart: [1, 0, 0] });
  const plain = score(admitted, content, drawn);
  assert.strictEqual(plain.playoff, null);
  const unseen = content.statements.map((s) => s.id).filter((id) => !drawn.includes(id)).slice(0, 6);
  const noisy = score(admitted, content, drawn, null, Object.fromEntries(unseen.map((id) => [id, 'yes'])));
  assert.deepStrictEqual(noisy, plain);
});

test('answer codes: a play-off travels in the code, old 8-character codes still work', () => {
  const seeds = seedStream('playoff-codes');
  let n10 = 0;
  for (let n = 0; n < 120; n++) {
    const p = tiedPlay(seeds());
    if (p.r.tieBreak !== 'lot') continue;
    const rounds = p.r.playoff.rounds;
    const answers = answersFor(rounds, [['no', 'no'], ['yes', 'no']]);
    const own = score(p.admitted, content, p.drawn, null, answers);
    const code = extras.encodeAnswers(p.seed, p.drawn, p.admitted, { rounds, answers });
    assert.match(code, /^[0-9a-z]{10}$/);
    n10 += 1;
    const back = extras.decodeAnswerSet(code, p.seed, p.drawn, content);
    assert.deepStrictEqual(back.admitted, p.admitted);
    assert.deepStrictEqual(back.playoff, answers);
    // A friend's browser recomputes exactly the type the player saw.
    const cmp = extras.comparePlays(content, p.drawn, [], back.admitted, {}, back.playoff);
    assert.strictEqual(cmp.friend.typeId, own.typeId);
    assert.strictEqual(cmp.friend.tieBreak, 'playoff');
    // Without the play-off part, it is the old 8-character code.
    const old = extras.encodeAnswers(p.seed, p.drawn, p.admitted);
    assert.match(old, /^[0-9a-z]{8}$/);
    assert.deepStrictEqual(extras.decodeAnswerSet(old, p.seed, p.drawn, content), { admitted: p.admitted, playoff: {} });
    // An edited play-off part fails the check.
    assert.strictEqual(extras.decodeAnswerSet(code.slice(0, 6) + (code[6] === '1' ? '2' : '1') + code.slice(7), p.seed, p.drawn, content), null);
  }
  assert.ok(n10 > 80);
  // A play-off part on a play without a tie is refused, even with a valid check.
  const drawn = drawStatements(content, 'abc123');
  const admitted = admitByCounts(content, drawn, { school: [2, 2, 1] });
  const fake = { rounds: [{ band: 'medium', ids: [content.statements[0].id, content.statements[1].id] }], answers: {} };
  fake.answers[fake.rounds[0].ids[0]] = 'yes';
  fake.answers[fake.rounds[0].ids[1]] = 'no';
  const forged = extras.encodeAnswers('abc123', drawn, admitted, fake);
  assert.strictEqual(forged.length, 10);
  assert.strictEqual(extras.decodeAnswerSet(forged, 'abc123', drawn, content), null);
  // readCompareLink hands the play-off answers on.
  const p = tiedPlay('abc123');
  if (p.r.tieBreak === 'lot') {
    const answers = answersFor(p.r.playoff.rounds, [['yes', 'no']]);
    const vs = extras.encodeAnswers(p.seed, p.drawn, p.admitted, { rounds: p.r.playoff.rounds, answers });
    const link = extras.readCompareLink({ seed: p.seed, vs }, content);
    assert.deepStrictEqual(link.vsPlayoff, answers);
  }
});

// ---------- the personal reason lines ----------
test('reason lines: for every persona, two lines (one when nothing new) whose numbers agree with the result', () => {
  const seeds = seedStream('reason-lines');
  const seen = new Set();
  PERSONAS.forEach((persona) => {
    for (let n = 0; n < 20; n++) {
      const drawn = drawStatements(content, seeds());
      const admitted = admitByCounts(content, drawn, persona.counts);
      const first = score(admitted, content, drawn);
      const r = first.playoff ? score(admitted, content, drawn, null, playoffByCounts(content, first.playoff.rounds, persona.counts)) : first;
      const lines = extras.reasonLines(r, content, drawn, admitted);
      assert.ok(lines.length === 1 || lines.length === 2, persona.name);
      if (lines.length === 1) assert.ok(drawn.every((id) => admitted.includes(id)), 'one line only when nothing at all was passed on');
      lines.forEach((line) => {
        seen.add(line.key);
        const ui = content.ui[line.key];
        assert.ok(ui && ui.en && ui.zh, line.key + ' exists in both languages');
        Object.keys(line.vars).forEach((v) => assert.ok(ui.en.includes('{' + v + '}') && ui.zh.includes('{' + v + '}'), line.key + ' uses {' + v + '}'));
        if (line.quoteId) {
          assert.ok(ui.en.includes('{quote}') && ui.zh.includes('{quote}'));
          assert.ok(drawn.includes(line.quoteId) && !admitted.includes(line.quoteId), persona.name + ': quotes a statement shown but not admitted');
        }
      });
      const a = lines[0];
      const b = lines[1];
      if (r.typeId.includes('_')) {
        const lead = r.dominantDim;
        assert.strictEqual(a.key, 'reasonDimContrast');
        assert.deepStrictEqual([a.vars.n, a.vars.shown, a.vars.dim], [r.perDim[lead], r.shown[lead], lead]);
        const others = DIM_KEYS.filter((k) => k !== lead);
        assert.strictEqual(Number(a.vars.avg), Math.round(others.reduce((s, k) => s + r.perDim[k], 0) / 4 * 10) / 10);
        const passedHere = drawn.filter((id) => byId[id].dim === lead && !admitted.includes(id));
        if (passedHere.length === 0) {
          // The lead section was admitted in full: the second line must say
          // something else, a statement passed on in another section.
          if (b) {
            assert.ok(['reasonDimNext', 'reasonDimElsewhere'].includes(b.key), b.key);
            assert.notStrictEqual(byId[b.quoteId].dim, lead);
            assert.strictEqual(byId[b.quoteId].dim, b.vars.dim);
            const down = DIM_KEYS.filter((k) => k !== lead)
              .sort((x, y) => (r.points[y] - r.points[x]) || (r.perDim[y] - r.perDim[x]) || (DIM_KEYS.indexOf(x) - DIM_KEYS.indexOf(y)));
            if (b.key === 'reasonDimNext') assert.strictEqual(b.vars.dim, down[0], 'the next section down');
          }
        } else {
          assert.strictEqual(b.key, passedHere.length === 1 ? 'reasonDimOne' : 'reasonDimSome');
          assert.strictEqual(byId[b.quoteId].dim, lead);
          const heaviest = Math.max(...passedHere.map((id) => scoring.statementWeight(byId[id])));
          assert.strictEqual(scoring.statementWeight(byId[b.quoteId]), heaviest, 'the heaviest one passed on');
        }
      } else if (r.typeId === 'untouched') {
        assert.strictEqual(a.vars.total, r.drawnCount);
        if (r.total) assert.strictEqual(a.vars.n, r.total); else assert.strictEqual(a.key, 'reasonAnalogNone');
        assert.strictEqual(byId[b.quoteId].band, 'mild');
      } else if (r.typeId === 'balanced') {
        // Points, as the rule uses; the second line never claims more
        // evenness than there is: the real lead, or the real number level.
        assert.deepStrictEqual(a.vars.list.map((x) => x.n), DIM_KEYS.map((k) => r.points[k]));
        const sorted = DIM_KEYS.map((k) => r.points[k]).sort((x, y) => y - x);
        if (sorted[0] === sorted[1]) {
          assert.strictEqual(b.key, 'reasonBalancedLevel');
          assert.strictEqual(b.vars.n, sorted.filter((x) => x === sorted[0]).length);
        } else {
          assert.strictEqual(b.key, 'reasonBalancedLead');
          assert.strictEqual(b.vars.pts, sorted[0] - sorted[1]);
          assert.ok(b.vars.pts <= 1, 'SAMPLER never has a lead of 2 or more');
        }
      } else if (r.typeId === 'merged') {
        assert.strictEqual(a.vars.total, r.total);
        assert.strictEqual(a.vars.max, Math.max(...DIM_KEYS.map((k) => r.perDim[k])));
        if (r.total === r.drawnCount) assert.strictEqual(b.key, 'reasonPassedNone'); else assert.strictEqual(b.key, 'reasonHeaviestPassed');
      } else if (r.typeId === 'soulmate') {
        assert.strictEqual(a.key, 'reasonSoulmate');
        assert.strictEqual(a.vars.n, r.shown.bond);
        assert.ok(a.vars.h >= 1 && a.vars.h <= a.vars.hs);
      }
    }
  });
  ['reasonDimContrast', 'reasonDimOne', 'reasonDimSome', 'reasonDimNext', 'reasonAnalogCount', 'reasonAnalogPassed',
    'reasonBalancedCounts', 'reasonBalancedLead', 'reasonBalancedLevel', 'reasonMergedSpread', 'reasonMergedZero', 'reasonMergedEven', 'reasonHeaviestPassed', 'reasonPassedNone', 'reasonSoulmate']
    .forEach((key) => assert.ok(seen.has(key), key + ' comes up for some persona'));
  // Nothing admitted at all.
  const drawn = drawStatements(content, 'abc123');
  const none = extras.reasonLines(score([], content, drawn), content, drawn, []);
  assert.strictEqual(none[0].key, 'reasonAnalogNone');
});

// ---------- the play history ----------
function fakeStorage() {
  const data = {};
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
}
test('play history: the last 20 finished plays, a summary from 3 on, and blocked storage is fine', () => {
  const st = fakeStorage();
  assert.deepStrictEqual(extras.playHistory(st), []);
  assert.strictEqual(extras.historySummary(extras.playHistory(st)), null);
  ['heart_deep', 'heart_deep'].forEach((id) => assert.ok(extras.rememberPlay(st, id)));
  assert.strictEqual(extras.historySummary(extras.playHistory(st)), null, 'two plays are not enough');
  extras.rememberPlay(st, 'brain_lite');
  assert.deepStrictEqual(extras.historySummary(extras.playHistory(st)), {
    n: 3, counts: [{ typeId: 'heart_deep', count: 2 }, { typeId: 'brain_lite', count: 1 }], most: ['heart_deep']
  });
  for (let i = 0; i < 30; i++) extras.rememberPlay(st, i % 2 ? 'merged' : 'untouched');
  assert.strictEqual(extras.playHistory(st).length, 20);
  const s5 = extras.historySummary(extras.playHistory(st));
  assert.strictEqual(s5.n, 5);
  assert.deepStrictEqual(s5.most, ['merged']);
  assert.deepStrictEqual(extras.historyCounts(['merged', 'merged', 'nope', 'untouched']), { merged: 2, untouched: 1 });
  assert.strictEqual(extras.rememberPlay(st, 'nope'), false);
  st.setItem(extras.HISTORY_KEY, 'merged,<x>,,brain_deep');
  assert.deepStrictEqual(extras.playHistory(st), ['merged', 'brain_deep']);
  const blocked = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
  [null, undefined, blocked].forEach((s) => {
    assert.deepStrictEqual(extras.playHistory(s), []);
    assert.strictEqual(extras.rememberPlay(s, 'merged'), false);
  });
  // A tie for most often lists both.
  assert.deepStrictEqual(extras.historySummary(['merged', 'untouched', 'merged', 'untouched', 'balanced']).most, ['untouched', 'merged']);
});

test('app.js: the play-off flow, its statistics event, no remarks in it, and the history only from a finished play', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const ans = src.match(/function answer\(value, tapped\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(ans, /if \(!inPlayoff && maybeRemark\(state\.index, value\)\) \{\s*updateLive\(\);\s*return;\s*\}/);
  assert.match(ans, /if \(next >= state\.drawn\.length\) track\('tiebreak', 'play'\);/);
  assert.match(ans, /extras\.rememberPlay\(deviceStorage\(\), finished\.typeId\);/);
  assert.strictEqual((src.match(/extras\.rememberPlay\(/g) || []).length, 1, 'only a finished play is recorded');
  assert.match(src, /function currentScore\(\) \{\s*return scoring\.score\(yesIds\(\), content, state\.drawn, null, state\.playoffAnswers\);/);
  // Challenge links carry the play-off.
  assert.match(src, /extras\.encodeAnswers\(state\.seed, state\.drawn, yesIds\(\), playoffForCode\(\)\)/);
});
