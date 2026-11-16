// "How this result was reached": the trace must be score()'s own run, step
// for step, with every number equal to the result's. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const scoring = require('../scoring.js');
const extras = require('../extras.js');
const { PERSONAS, playoffByCounts } = require('../tools/personas.js');
const helpers = require('../tools/sim-helpers.js');
require('../content.js');
const content = globalThis.APT_CONTENT;
const { score, drawStatements, admitByCounts, DIM_KEYS, RULES } = scoring;
const J = content.judging;

function check(r, label) {
  const trace = extras.judgingTrace(r);
  const ids = trace.steps.map((s) => s.id);
  assert.deepStrictEqual(ids, ['merged', 'hidden', 'untouched', 'balanced', 'lead', 'depth'], label);
  const st = Object.fromEntries(trace.steps.map((s) => [s.id, s]));
  const decidedAt = { merged: 0, soulmate: 1, untouched: 2, balanced: 3 }[r.typeId];
  if (decidedAt !== undefined) {
    trace.steps.forEach((s, i) => {
      if (i < decidedAt) assert.strictEqual(s.status, 'no', label + ' step ' + s.id);
      else if (i === decidedAt) assert.strictEqual(s.status, 'yes', label + ' deciding step');
      else assert.strictEqual(s.status, 'skipped', label + ' after the deciding step');
    });
  } else {
    // A section type: the first four are "no", lead and depth decide it.
    trace.steps.slice(0, 4).forEach((s) => assert.strictEqual(s.status, 'no', label + ' ' + s.id));
    assert.strictEqual(st.lead.status, 'decides');
    assert.strictEqual(st.depth.status, 'decides');
    const lead = r.typeId.split('_')[0];
    const v = st.lead.answer.vars;
    assert.strictEqual(v.dim || v.a, lead, label + ' the lead row names the type\'s section');
    assert.strictEqual(r.dominantDim, lead);
    // The tie-break row is the one score() used.
    const keyFor = { null: 'plain', top: 'top', count: 'count', playoff: 'playoff', lot: 'lot' };
    assert.strictEqual(st.lead.answer.key, keyFor[r.tieBreak], label);
    if (r.tieBreak) assert.ok(r.tiedDims.includes(v.b), label + ' the other tied section');
    if (r.tieBreak === 'playoff') assert.strictEqual(v.r, r.playoff.decidedRound);
    if (v.p !== undefined) assert.strictEqual(v.p, r.points[lead]);
    if (v.others) assert.deepStrictEqual(v.others, DIM_KEYS.filter((k) => k !== lead).map((k) => ({ dim: k, p: r.points[k] })));
    // Depth: deep or lite as the type says, with the real points.
    const dv = st.depth.answer.vars;
    if (dv.p !== undefined) assert.strictEqual(dv.p, r.points[lead]);
    if (dv.max !== undefined) assert.strictEqual(dv.max, r.maxPoints[lead]);
    const line = Math.ceil(RULES.highFrom * r.maxPoints[lead] / 100);
    if (r.typeId.endsWith('_deep')) assert.ok(['line', 'extremes'].includes(st.depth.answer.key));
    else assert.strictEqual(st.depth.answer.key, 'lite');
    if (st.depth.answer.key === 'line') { assert.strictEqual(dv.line, line); assert.ok(r.points[lead] >= line); }
    if (st.depth.answer.key === 'extremes') assert.ok(r.points[lead] < line, 'deep only through both extremes');
  }
  // Numbers shown equal the result's.
  if (st.merged.answer && st.merged.answer.vars.n !== undefined) assert.strictEqual(st.merged.answer.vars.n, r.total);
  if (st.untouched.answer && st.untouched.answer.vars.n !== undefined) assert.strictEqual(st.untouched.answer.vars.n, r.total);
  assert.strictEqual(trace.total, r.total);
  assert.strictEqual(trace.match, r.match);
  // Why not SAMPLER: the condition named really fails, the ones before it hold,
  // and relaxing it (and those after it) makes the play balanced.
  if (st.balanced.status === 'no') {
    const key = st.balanced.answer.key;
    const v = st.balanced.answer.vars;
    const depth = (k) => 100 * r.points[k] / r.maxPoints[k];
    const ds = DIM_KEYS.map(depth).sort((a, b) => b - a);
    const ps = DIM_KEYS.map((k) => r.points[k]).sort((a, b) => b - a);
    const few = r.total < RULES.balancedMinTotal;
    const empty = DIM_KEYS.some((k) => r.perDim[k] === 0);
    const spread = ds[0] - ds[4] > RULES.balancedMaxSpread + 1e-9;
    const leadOk = ds[0] - ds[1] <= RULES.balancedMaxLead + 1e-9;
    const order = ['noFew', 'noEmpty', 'noSpread', 'noLead'];
    const fails = { noFew: few, noEmpty: empty, noSpread: spread, noLead: !leadOk };
    order.slice(0, order.indexOf(key)).forEach((k) => assert.strictEqual(fails[k], false, label + ' ' + k + ' should hold before ' + key));
    assert.strictEqual(fails[key], true, label + ' ' + key + ' really fails');
    if (key === 'noFew') assert.strictEqual(v.n, r.total);
    if (key === 'noEmpty') assert.strictEqual(r.perDim[v.dim], 0);
    if (key === 'noSpread') assert.strictEqual(v.k, ps[0] - ps[4]);
    if (key === 'noLead') { assert.strictEqual(v.k, ps[0] - ps[1]); assert.strictEqual(v.dim, r.dominantDim); }
    if (key === 'noLead' || key === 'noSpread') {
      const relaxed = Object.assign({}, RULES, { balancedMaxLead: Infinity, balancedMaxSpread: key === 'noSpread' ? Infinity : RULES.balancedMaxSpread });
      const admitted = r.__admitted;
      if (admitted) assert.strictEqual(score(admitted, content, r.__drawn, relaxed, r.__playoff).typeId, 'balanced', label + ' relaxing ' + key);
    }
  }
  if (r.typeId === 'balanced') {
    const v = st.balanced.answer.vars;
    const ps = DIM_KEYS.map((k) => r.points[k]).sort((a, b) => b - a);
    if (st.balanced.answer.key === 'yes') assert.strictEqual(v.k, ps[0] - ps[1]);
    else assert.ok(v.m >= 2);
  }
  // Every answer is a line in content.judging, in both languages.
  trace.steps.forEach((s) => {
    if (!s.answer) return;
    const line = J[s.id][s.answer.key];
    assert.ok(line && line.en && line.zh, s.id + '.' + s.answer.key);
    Object.keys(s.answer.vars).forEach((k) => assert.ok(line.en.includes('{' + k + '}') && line.zh.includes('{' + k + '}'), s.id + '.' + s.answer.key + ' uses {' + k + '}'));
  });
  return trace;
}

function scoreWith(admitted, drawn, pa) {
  const r = score(admitted, content, drawn, null, pa);
  Object.defineProperty(r, '__admitted', { value: admitted });
  Object.defineProperty(r, '__drawn', { value: drawn });
  Object.defineProperty(r, '__playoff', { value: pa });
  return r;
}

test('judging trace: every persona on 200 draws, step for step as score() decided', () => {
  const seen = new Set();
  PERSONAS.forEach((p) => {
    const seeds = helpers.seedStream('trace|' + p.name);
    for (let i = 0; i < 200; i++) {
      const drawn = drawStatements(content, seeds());
      const admitted = admitByCounts(content, drawn, p.counts);
      const first = score(admitted, content, drawn);
      const pa = first.playoff ? playoffByCounts(content, first.playoff.rounds, p.counts) : {};
      const trace = check(scoreWith(admitted, drawn, pa), p.name);
      trace.steps.forEach((s) => { if (s.answer) seen.add(s.id + '.' + s.answer.key); });
    }
  });
  // Deep in all five with fewer than 20 admitted (one medium and both extreme everywhere: 15).
  const drawn = drawStatements(content, 'abc123');
  const deepAll = admitByCounts(content, drawn, { school: [0, 1, 2], work: [0, 1, 2], heart: [0, 1, 2], brain: [0, 1, 2], bond: [0, 1, 2] });
  const t = check(scoreWith(deepAll, drawn, {}), 'deep everywhere, 15 admitted');
  seen.add('merged.' + t.steps[0].answer.key);
  ['merged.yes', 'merged.yesDeep', 'hidden.yes', 'untouched.yes', 'balanced.yes', 'balanced.yesTie',
    'balanced.noFew', 'balanced.noEmpty', 'balanced.noLead', 'lead.plain', 'lead.top', 'lead.count', 'lead.playoff', 'lead.lot',
    'depth.line', 'depth.extremes', 'depth.lite'].forEach((k) => assert.ok(seen.has(k), k + ' comes up'));
});

test('judging trace: 20,000 simulated players, every one consistent with score()', () => {
  const players = helpers.makePlayerModel(content);
  const next = scoring.makeGenerator('trace-players');
  const seeds = helpers.seedStream('trace-seeds');
  const seen = new Set();
  for (let n = 0; n < 20000; n++) {
    const drawn = drawStatements(content, seeds());
    const player = players.makePlayer(next);
    const admitted = players.admits(next, player, drawn);
    const first = score(admitted, content, drawn);
    const pa = first.playoff ? players.playoff(next, player, first.playoff.rounds) : {};
    const trace = check(scoreWith(admitted, drawn, pa), 'player ' + n);
    trace.steps.forEach((s) => { if (s.answer) seen.add(s.id + '.' + s.answer.key); });
  }
  assert.ok(seen.has('balanced.noSpread'), 'the spread reason comes up');
});

test('judging trace: the hidden rule is never spelled out, and the header\'s numbers are the real ones', () => {
  const hiddenText = JSON.stringify(J.hidden);
  assert.doesNotMatch(hiddenText, /Bond|Heart|羁绊|感情|extreme|重度|six|6/);
  assert.ok(J.header.en.includes(String(scoring.DRAW_SIZE)) && J.header.en.includes(String(scoring.BANK_TARGET)));
  assert.ok(J.header.zh.includes(String(scoring.DRAW_SIZE)) && J.header.zh.includes(String(scoring.BANK_TARGET)));
  assert.ok(J.header.en.includes('{seed}') && J.header.zh.includes('{seed}'));
  assert.ok(J.merged.q.en.includes(String(RULES.mergedMinTotal)) && J.merged.q.zh.includes(String(RULES.mergedMinTotal)));
  assert.ok(J.untouched.q.en.includes(String(RULES.untouchedMaxTotal)) && J.untouched.q.zh.includes(String(RULES.untouchedMaxTotal)));
  assert.deepStrictEqual(extras.validateJudging(content), []);
});

test('judging trace small print: the observed range is what tools/fairness.js reports (fixed seeds)', () => {
  const { runFairness } = require('../tools/fairness.js');
  const res = runFairness(content, { n: 200000, label: 'main', only: 'a' });
  const range = res.checks[0].range;
  const lo = (100 * range.min).toFixed(1);
  const hi = (100 * range.max).toFixed(1);
  ['en', 'zh'].forEach((lang) => {
    assert.ok(J.drawNote[lang].includes(lo + '%'), lang + ' quotes ' + lo + '%');
    assert.ok(J.drawNote[lang].includes(hi + '%'), lang + ' quotes ' + hi + '%');
  });
  // 2 in 7 is PICKS_PER_STRATUM / BANK_PER_STRATUM.
  assert.strictEqual(scoring.PICKS_PER_STRATUM / scoring.BANK_PER_STRATUM, 2 / 7);
  assert.ok(J.drawNote.en.includes('28.57%') && J.drawNote.zh.includes('28.57%'));
});

test('landing stat tiles: every number is the repo\'s own', () => {
  const tiles = content.landing.how.stats.tiles;
  assert.strictEqual(tiles[0].value.en, scoring.PICKS_PER_STRATUM + '/' + scoring.BANK_PER_STRATUM);
  const fair = fs.readFileSync(path.join(__dirname, '..', 'tools', 'fairness.js'), 'utf8');
  assert.match(fair, /var N = options\.n \|\| 200000;/);
  assert.strictEqual(tiles[1].value.en, '200,000');
  const letters = fair.match(/var only = options\.only \|\| '([a-z]+)';/)[1];
  assert.strictEqual(tiles[2].value.en, String(letters.length));
  assert.ok(tiles[2].value.zh.startsWith(String(letters.length)));
  const { runControls } = require('../tools/fairness.js');
  const controls = runControls(helpers.syntheticContent(7), 2000).length;
  assert.ok(tiles[2].text.en.includes(controls + ' deliberately broken') && tiles[2].text.zh.includes(controls + ' 种'));
});

test('app.js: the trace sits after "Why you got this", never for a sample, never in a comparison or reply', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(src, /renderVerdict\(type, result, isSample\),\s*\/\/[^\n]*\n\s*!isSample && renderTrace\(type, result\),/);
  const reply = src.match(/function renderReply\(\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.doesNotMatch(reply, /renderTrace/);
  const compare = src.match(/function renderCompare\(opts\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.doesNotMatch(compare, /renderTrace/);
  assert.match(src, /extras\.judgingTrace\(result\)/);
});

test('question screen: a labelled back button ("← Back" / "← 上一题"), not there on the first statement', () => {
  assert.strictEqual(content.ui.back.en, 'Back');
  assert.strictEqual(content.ui.back.zh, '上一题');
  assert.ok(content.ui.keysHint.zh.includes('上一题') && !content.ui.keysHint.zh.includes('上一条'));
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(src, /class: 'btn btn-ghost q-back',[\s\S]{0,80}hidden: state\.index === 0 \? true : null,/);
  assert.match(src, /el\('span', \{ class: 'q-back-arrow', 'aria-hidden': 'true', text: '←' \}\), t\('back'\)\]\)/);
  assert.match(src, /key === 'Backspace'\) \{\s*event\.preventDefault\(\);\s*goBack\(\);/, 'Backspace still goes back');
});

test('index.html: link preview tags with absolute URLs, a canonical link and og.png at 1200 x 630', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const SITE = 'https://guiltyofai.vercel.app/';
  assert.ok(html.includes('<link rel="canonical" href="' + SITE + '">'));
  ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']
    .forEach((name) => assert.match(html, new RegExp('(property|name)="' + name + '" content="[^"]+"'), name));
  assert.ok(html.includes('content="' + SITE + 'og.png"'));
  assert.ok(html.includes('<meta property="og:image:width" content="1200">') && html.includes('<meta property="og:image:height" content="630">'));
  const png = fs.readFileSync(path.join(__dirname, '..', 'og.png'));
  assert.strictEqual(png.readUInt32BE(16), 1200);
  assert.strictEqual(png.readUInt32BE(20), 630);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'tools', 'og.html')));
});

test('remark hold: the answered statement stays while its remark shows, then the play moves on', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const may = src.match(/function maybeRemark\(index, value\) \{([\s\S]*?)\n {2}\}/)[1];
  // Only when remarkFor says so; never on the last statement or into the play-off.
  assert.match(may, /extras\.remarkFor\(remarkSchedule\(\), index, value, state\.remarked\)/);
  assert.match(may, /if \(next === null \|\| next >= state\.drawn\.length\) return false;/);
  // The answer is recorded and the saved position is already the next statement.
  assert.match(may, /state\.index = next;\s*saveState\(\);/);
  // Reading time from remarkDuration (capped at 2.8 s).
  assert.match(may, /setTimeout\(endHoldOnTime, extras\.remarkDuration\(text\)\)/);
  assert.strictEqual(extras.REMARK_RULES.maxMs, 2800);
  // Skips are swallowed in the capture phase, so they never answer the next statement.
  assert.match(may, /window\.addEventListener\('click', onHoldEvent, true\);/);
  assert.match(may, /window\.addEventListener\('keydown', onHoldEvent, true\);/);
  const on = src.match(/function onHoldEvent\(event\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(on, /event\.preventDefault\(\);\s*event\.stopImmediatePropagation\(\);/);
  assert.match(on, /if \(back\) state\.index = held;/);
  // Answers and Back are locked while holding; any redraw ends the hold.
  assert.match(src, /function answer\(value, tapped\) \{\s*if \(busy \|\| hold \|\| state\.screen !== 'question'\) return;/);
  assert.match(src, /function goBack\(\) \{\s*if \(busy \|\| hold \|\| state\.screen !== 'question'\) return;/);
  assert.match(src, /if \(hold\) releaseHold\(\);/);
  // Never in the play-off.
  const ans = src.match(/function answer\(value, tapped\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(ans, /if \(!inPlayoff && maybeRemark\(state\.index, value\)\) \{\s*updateLive\(\);\s*syncFigure\('animate'\);\s*return;\s*\}/);
});

test('remark hold: remarkFor never holds the last statement, a play-off position or a non-Guilty answer', () => {
  const seeds = helpers.seedStream('hold');
  for (let i = 0; i < 300; i++) {
    const seed = seeds();
    const drawn = drawStatements(content, seed);
    const schedule = extras.remarkSchedule(content, seed, drawn);
    const shown = [];
    drawn.forEach((id, index) => {
      ['no', 'unsure'].forEach((a) => assert.strictEqual(extras.remarkFor(schedule, index, a, shown), null));
      const e = extras.remarkFor(schedule, index, 'yes', shown);
      if (e) { assert.ok(index >= 3 && index < drawn.length - 1); shown.push(index); }
    });
    assert.ok(shown.length <= 6);
    [drawn.length, drawn.length + 1, drawn.length + 5].forEach((index) => assert.strictEqual(extras.remarkFor(schedule, index, 'yes', []), null));
  }
});
