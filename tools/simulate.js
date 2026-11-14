/*
 * tools/simulate.js — checks the scoring rules against people.
 *
 *   node tools/simulate.js            personas + 200,000 random players
 *   node tools/simulate.js --n=50000  fewer random players
 *   node tools/simulate.js --seed=7   a different (but repeatable) random run
 *   node tools/simulate.js --mean=2.5 lighter players (--mean=4.5 heavier, --sd=2 or 3 more alike or more varied)
 *
 * Part a) prints what each named persona in tools/personas.js gets, so a
 * human can judge whether each result is fair.
 * Part b) samples random players under the model below and prints how often
 * each of the 14 types comes up. The goal: no type above about 20% and none
 * below about 2% (the hidden soulmate type may be rarer). It also prints how
 * the match number spreads out for each type, and how often an exact tie
 * decided the lead section.
 *
 * No dependencies. Uses the real content.js and scoring.js.
 */
'use strict';

var path = require('path');
var scoring = require(path.join(__dirname, '..', 'scoring.js'));
require(path.join(__dirname, '..', 'content.js'));
var content = globalThis.APT_CONTENT;
var PERSONAS = require('./personas.js').PERSONAS;

// ---------- command line ----------
function arg(name, fallback) {
  var hit = process.argv.find(function (a) { return a.indexOf('--' + name + '=') === 0; });
  return hit ? Number(hit.split('=')[1]) : fallback;
}
var N = arg('n', 200000);
var SEED = arg('seed', 20261113);

// ---------- a small seeded random generator (mulberry32) ----------
// Math.random cannot be seeded; this keeps every run repeatable.
function makeRandom(seed) {
  var a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// A normal draw from two uniforms (Box-Muller).
function normal(rand, mean, sd) {
  var u = 1 - rand();
  var v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/*
 * THE PLAYER MODEL (plain words)
 *
 * Every player has a "reach" in each section: roughly the level up to which
 * they say Guilty. A statement at level L is admitted with a probability that
 * falls smoothly as L passes the reach (50% exactly at the reach).
 *
 *  - Overall intensity differs between people: the base reach is drawn from
 *    a normal curve centred on 3.5 with spread 2.5. So most people admit the
 *    first few statements of a section, few go to the end.
 *  - People have favourite sections: 25% have none, 45% have one, 30% have
 *    two. A favourite section gets 2 to 6 extra levels of reach.
 *  - Every section also wobbles a little (spread 1 level) on its own.
 */
var MODEL = {
  baseReachMean: arg('mean', 3.5), // try --mean=2.5 (lighter users) or --mean=4.5 (heavier)
  baseReachSd: arg('sd', 2.5),
  favouriteOdds: [0.25, 0.45, 0.30], // chance of 0, 1, 2 favourite sections
  favouriteBoostMin: 2,
  favouriteBoostMax: 6,
  sectionWobbleSd: 1,
  softness: 1.2 // larger = the drop-off around the reach is more gradual
};

// Statements grouped by section, each with its level (1..10).
var bySection = scoring.DIM_KEYS.map(function (key) {
  return content.statements.filter(function (s) { return s.dim === key; })
    .map(function (s, i) { return { id: s.id, level: i + 1 }; });
});

function samplePlayer(rand) {
  var base = normal(rand, MODEL.baseReachMean, MODEL.baseReachSd);

  // How many favourite sections, and which.
  var r = rand();
  var favourites = r < MODEL.favouriteOdds[0] ? 0 : r < MODEL.favouriteOdds[0] + MODEL.favouriteOdds[1] ? 1 : 2;
  var order = [0, 1, 2, 3, 4];
  for (var i = order.length - 1; i > 0; i--) { // shuffle
    var j = Math.floor(rand() * (i + 1));
    var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }
  var boost = [0, 0, 0, 0, 0];
  for (var f = 0; f < favourites; f++) {
    boost[order[f]] = MODEL.favouriteBoostMin + rand() * (MODEL.favouriteBoostMax - MODEL.favouriteBoostMin);
  }

  var answers = [];
  bySection.forEach(function (statements, d) {
    var reach = base + boost[d] + normal(rand, 0, MODEL.sectionWobbleSd);
    statements.forEach(function (s) {
      var p = 1 / (1 + Math.exp((s.level - reach) / MODEL.softness));
      if (rand() < p) answers.push(s.id);
    });
  });
  return answers;
}

function pct(x) { return (100 * x).toFixed(1) + '%'; }
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }

// ---------- a) personas ----------
function runPersonas() {
  console.log('\nA) PERSONAS\n');
  console.log(pad('Persona', 42) + pad('Total', 6) + pad('Type', 13) + pad('Secondary', 13) + pad('Match', 6) + 'Evidence');
  var mismatches = 0;
  PERSONAS.forEach(function (p) {
    var r = scoring.score(p.ids, content);
    var ok = r.typeId === p.expect.typeId && r.secondaryTypeId === p.expect.secondaryTypeId;
    if (!ok) mismatches += 1;
    console.log(pad(p.name, 42) + pad(r.total, 6) + pad(r.typeId, 13) + pad(r.secondaryTypeId || '-', 13) +
      pad(r.match, 6) + r.evidenceIds.join(' ') + (ok ? '' : '   <-- expected ' + p.expect.typeId + ' / ' + p.expect.secondaryTypeId));
  });
  console.log('\n' + (mismatches ? mismatches + ' persona(s) differ from their expectation.' : 'All personas match their expectation.'));
}

// ---------- b) random players ----------
function runSample() {
  var rand = makeRandom(SEED);
  var counts = {}, matches = {}, secondaryCount = 0, totalSum = 0;
  var tieBreaks = { top: 0, count: 0, order: 0 }, capped = 0;
  scoring.TYPE_IDS.forEach(function (id) { counts[id] = 0; matches[id] = []; });
  for (var n = 0; n < N; n++) {
    var r = scoring.score(samplePlayer(rand), content);
    counts[r.typeId] += 1;
    matches[r.typeId].push(r.match);
    if (r.secondaryTypeId) secondaryCount += 1;
    // Only section types are decided by a tie-break; balanced absorbs 3-way ties.
    if (r.tieBreak && r.typeId.indexOf('_') > 0) tieBreaks[r.tieBreak] += 1;
    if (r.matchCap) capped += 1;
    totalSum += r.total;
  }

  // The p-th percentile (0..1) of a list of numbers.
  function percentile(list, p) {
    var sorted = list.slice().sort(function (a, b) { return a - b; });
    return sorted.length ? sorted[Math.floor(p * (sorted.length - 1))] : '-';
  }

  console.log('\nB) ' + N.toLocaleString('en-US') + ' RANDOM PLAYERS (seed ' + SEED + ')\n');
  console.log('Average statements admitted: ' + (totalSum / N).toFixed(1) + ' of 50 (average purity ' + (100 - 2 * totalSum / N).toFixed(0) + ')');
  console.log('Results with a secondary type: ' + pct(secondaryCount / N) + '\n');
  var problems = [];
  scoring.TYPE_IDS.forEach(function (id) {
    var share = counts[id] / N;
    var flag = '';
    if (share > 0.20) flag = '  <-- above 20%';
    else if (share < 0.02 && id !== 'soulmate') flag = '  <-- below 2%';
    if (flag) problems.push(id);
    var m = matches[id];
    console.log(pad(id, 13) + pad(pct(share), 8) +
      pad('match ' + percentile(m, 0.1) + ' / ' + percentile(m, 0.5) + ' / ' + percentile(m, 0.9), 22) + flag);
  });
  console.log('(match: 10th percentile / median / 90th percentile)');
  console.log('\n' + (problems.length ? 'Out of range: ' + problems.join(', ') : 'Every type is between 2% and 20% (soulmate excepted).'));
  console.log('Section types decided by an exact two-way tie: heavier top statement ' + pct(tieBreaks.top / N) +
    ', more statements ' + pct(tieBreaks.count / N) + ', fixed order ' + pct(tieBreaks.order / N) + ' of all players.');
  console.log('Section-type matches lowered by the one- or two-answer cap: ' + pct(capped / N) + ' of all players.');
}

runPersonas();
runSample();
