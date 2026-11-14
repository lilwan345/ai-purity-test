/*
 * tools/simulate.js — checks the scoring rules against people.
 *
 *   node tools/simulate.js              personas + 200,000 random players,
 *                                       on the real bank (content.js)
 *   node tools/simulate.js --n=50000    fewer random players
 *   node tools/simulate.js --seed=7     a different (but repeatable) random run
 *   node tools/simulate.js --bank=full  a synthetic bank of the same shape
 *                                       instead (or --bank=both)
 *   node tools/simulate.js --mean=2.5   lighter players (--mean=4.5 heavier,
 *                                       --sd=1.5 or 3.5 more alike or more varied)
 *
 * Part a) prints what each named persona in tools/personas.js gets, so a
 * human can judge whether each result is fair. Personas are written as band
 * counts, so they fit any draw; the table uses one fixed draw for the
 * evidence column and checks the type over 500 other draws.
 * Part b) gives every simulated player their own random draw of 30, lets
 * them answer it under the player model (tools/sim-helpers.js), and prints
 * how often each of the 14 types comes up. The goal: no type above about 20%
 * and none below about 2% (the hidden type may be rarer). It also prints how
 * the match number spreads out and how often a tie decided the lead.
 *
 * No dependencies. Uses the real scoring.js.
 */
'use strict';

var path = require('path');
var scoring = require(path.join(__dirname, '..', 'scoring.js'));
var helpers = require('./sim-helpers.js');
require(path.join(__dirname, '..', 'content.js'));
var PERSONAS = require('./personas.js').PERSONAS;

// ---------- command line ----------
function arg(name, fallback) {
  var hit = process.argv.find(function (a) { return a.indexOf('--' + name + '=') === 0; });
  return hit ? hit.split('=')[1] : fallback;
}
var N = Number(arg('n', 200000));
var SEED = String(arg('seed', '20261113'));
var BANK = arg('bank', 'real');
var MODEL = {};
if (arg('mean', null) !== null) MODEL.baseReachMean = Number(arg('mean'));
if (arg('sd', null) !== null) MODEL.baseReachSd = Number(arg('sd'));

function pct(x) { return (100 * x).toFixed(1) + '%'; }
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

// What a persona expects, as text.
function expectText(p) {
  return p.expect.lot ? 'lot: ' + p.expect.lot.join(' or ') : p.expect.typeId + ' / ' + (p.expect.secondaryTypeId || '-');
}
// Does a result match what the persona expects?
function matches(p, r) {
  if (p.expect.lot) {
    var i = p.expect.lot.indexOf(r.typeId);
    return i !== -1 && r.secondaryTypeId === p.expect.lot[1 - i] && r.tieBreak === 'lot';
  }
  return r.typeId === p.expect.typeId && r.secondaryTypeId === p.expect.secondaryTypeId;
}

// ---------- a) personas ----------
function runPersonas(content, label) {
  console.log('\nA) PERSONAS (' + label + ')\n');
  console.log(pad('Persona', 44) + pad('Total', 6) + pad('Type', 13) + pad('Secondary', 13) + pad('Match', 6) + pad('Over 500 draws', 22) + 'Evidence (bands)');
  var byId = {};
  content.statements.forEach(function (s) { byId[s.id] = s; });
  var shownDraw = scoring.drawStatements(content, 'abc123');
  var mismatches = 0;
  PERSONAS.forEach(function (p) {
    var r = scoring.score(scoring.admitByCounts(content, shownDraw, p.counts), content, shownDraw);
    // The same persona on 500 other draws.
    var seeds = helpers.seedStream('persona|' + p.name);
    var ok = 0, lotFirst = 0;
    for (var i = 0; i < 500; i++) {
      var d = scoring.drawStatements(content, seeds());
      var rr = scoring.score(scoring.admitByCounts(content, d, p.counts), content, d);
      if (matches(p, rr)) ok += 1;
      if (p.expect.lot && rr.typeId === p.expect.lot[0]) lotFirst += 1;
    }
    if (ok !== 500) mismatches += 1;
    var over = ok + '/500 ok' + (p.expect.lot ? ' (' + p.expect.lot[0].split('_')[0] + ' ' + pct(lotFirst / 500) + ')' : '');
    var evidence = r.evidenceIds.map(function (id) { return byId[id].dim + ':' + byId[id].band; }).join(' ');
    console.log(pad(p.name, 44) + pad(r.total, 6) + pad(r.typeId, 13) + pad(r.secondaryTypeId || '-', 13) +
      pad(r.match, 6) + pad(over, 22) + evidence + (ok === 500 ? '' : '   <-- expected ' + expectText(p)));
  });
  console.log('\n' + (mismatches ? mismatches + ' persona(s) differ from their expectation.' : 'All personas match their expectation on every draw.'));
  return mismatches;
}

// ---------- b) random players ----------
function runSample(content, label) {
  var players = helpers.makePlayerModel(content, MODEL);
  var next = scoring.makeGenerator('apt-sim-players|' + SEED);
  var seeds = helpers.seedStream('apt-sim-seeds|' + SEED);
  var counts = {}, matchesByType = {}, secondaryCount = 0, totalSum = 0;
  var tieBreaks = { top: 0, count: 0, lot: 0 }, capped = 0;
  scoring.TYPE_IDS.forEach(function (id) { counts[id] = 0; matchesByType[id] = []; });
  for (var n = 0; n < N; n++) {
    var drawn = scoring.drawStatements(content, seeds());
    var r = scoring.score(players.answer(next, drawn), content, drawn);
    counts[r.typeId] += 1;
    matchesByType[r.typeId].push(r.match);
    if (r.secondaryTypeId) secondaryCount += 1;
    if (r.tieBreak) tieBreaks[r.tieBreak] += 1;
    if (r.matchCap) capped += 1;
    totalSum += r.total;
  }

  // The p-th percentile (0..1) of a list of numbers.
  function percentile(list, p) {
    var sorted = list.slice().sort(function (a, b) { return a - b; });
    return sorted.length ? sorted[Math.floor(p * (sorted.length - 1))] : '-';
  }

  console.log('\nB) ' + N.toLocaleString('en-US') + ' RANDOM PLAYERS, each on their own draw (' + label + ', seed ' + SEED + ')\n');
  console.log('Average statements admitted: ' + (totalSum / N).toFixed(1) + ' of 30 (average purity ' +
    (100 * (1 - totalSum / N / 30)).toFixed(0) + ')');
  console.log('Results with a secondary type: ' + pct(secondaryCount / N) + '\n');
  var problems = [];
  scoring.TYPE_IDS.forEach(function (id) {
    var share = counts[id] / N;
    var flag = '';
    if (share > 0.20) flag = '  <-- above 20%';
    else if (share < 0.02 && id !== 'soulmate') flag = '  <-- below 2%';
    if (flag) problems.push(id);
    var m = matchesByType[id];
    console.log(pad(id, 13) + pad(pct(share), 8) +
      pad('match ' + percentile(m, 0.1) + ' / ' + percentile(m, 0.5) + ' / ' + percentile(m, 0.9), 22) + flag);
  });
  console.log('(match: 10th percentile / median / 90th percentile)');
  console.log('\n' + (problems.length ? 'Out of range: ' + problems.join(', ') : 'Every type is between 2% and 20% (the hidden type excepted).'));
  console.log('Section types whose lead was an exact two-way tie, settled by: heavier admitted statement ' + pct(tieBreaks.top / N) +
    ', more statements ' + pct(tieBreaks.count / N) + ', lot ' + pct(tieBreaks.lot / N) + ' of all players.');
  console.log('Section-type matches lowered by the one- or two-answer cap: ' + pct(capped / N) + ' of all players.');
  return problems.length;
}

var banks = [];
if (BANK !== 'full') banks.push({ label: 'real bank, ' + scoring.bankReport(globalThis.APT_CONTENT).total + ' statements', content: globalThis.APT_CONTENT });
if (BANK !== 'real') banks.push({ label: 'full-size synthetic bank, 105 statements', content: helpers.syntheticContent(7) });
var bad = 0;
banks.forEach(function (b) {
  bad += runPersonas(b.content, b.label);
  bad += runSample(b.content, b.label);
});
process.exitCode = bad ? 1 : 0;
