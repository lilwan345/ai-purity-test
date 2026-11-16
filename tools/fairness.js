/*
 * tools/fairness.js — proves the draw and the judging have no favourite.
 *
 *   node tools/fairness.js                 every check, 200,000 seeds, on the
 *                                          real bank twice (two independent
 *                                          seed sources, see below), plus the
 *                                          controls
 *   node tools/fairness.js --n=50000       fewer seeds
 *   node tools/fairness.js --seeds=fixed   only the repeatable run (or =crypto)
 *   node tools/fairness.js --bank=synthetic  a made-up bank of 7 per stratum
 *                                          instead of content.js
 *   node tools/fairness.js --no-controls   skip the deliberately broken versions
 *
 * Exits with code 1 if any check fails (or if a control is NOT caught).
 *
 * THE CHECKS (the owner's rule: "no statistical error in the drawing and
 * judging, for example always giving one kind of question")
 *   (a) every statement is drawn equally often (2 in n for a stratum of n)
 *   (b) inside a stratum, every pair of statements is drawn together equally
 *       often
 *   (c) the picks in different strata are independent of each other (tested
 *       for every pair of strata: which pair here vs which pair there)
 *   (d) inside each band group, every statement is equally likely at each of
 *       the ten places, and every dimension is equally likely to come first
 *   (e) seeds that differ in one character give unrelated draws
 *   (f) the judging has no built-in favourite: with simulated players who
 *       treat the five dimensions identically, the five lite types come up
 *       equally often and so do the five deep types, and the secondary
 *       leaning names every section equally often (all three judged with
 *       the hidden rule switched off, because that one rule is about Bond
 *       and Heart on purpose; its own share is printed beside them), a tie
 *       decided by lot goes to each section equally often, and the lot order
 *       itself is uniform over all 120 orders
 *   (g) the play-off (two sections dead level after every tie-break the 30
 *       answers allow) has no favourite either: each statement it shows is
 *       drawn uniformly from the unseen statements of its stratum (so over
 *       many plays every statement of a stratum appears equally often), the
 *       order inside a round is a fair coin, with simulated players who treat
 *       the sections identically each tied section wins about half its
 *       play-offs, pair by pair, and the draw of the 30 is byte for byte what
 *       it was before the play-off existed (a digest of 20,000 draws)
 * The bank holds 105 statements, 7 in each of the 15 strata, so (a) expects
 * every statement to be shown in 2 of 7 plays. (The checks work for strata
 * of any size: each statement is held to 2 in the size of its own stratum.)
 *
 * TWO SEED SOURCES. The draw depends only on the seed and the stratum sizes,
 * so running the same seeds again on another bank of the same shape adds no
 * evidence. Instead the real bank is checked twice:
 *   fixed   seeds from a fixed generator (repeatable: same numbers each run)
 *   crypto  seeds from scoring.makeSeed(), exactly what the page uses
 *           (crypto.getRandomValues), so different numbers on every run
 * Each check prints what it observed, what was expected, the test statistic
 * and its p-value: the chance of seeing a deviation at least this large if
 * the draw were perfectly fair. A check fails when p < 0.001 (for a check
 * made of several tests, the smallest p times the number of tests, which is
 * the Bonferroni correction). With 200,000 seeds the checks notice a bias of
 * about 1 to 2 percent in how often a statement is shown; the controls at
 * the end show that real mistakes of that size are caught.
 *
 * The "fixed" run is repeatable; the "crypto" run is a fresh sample each time
 * (it can fail by pure chance about once in a thousand runs per check).
 */
'use strict';

var path = require('path');
var scoring = require(path.join(__dirname, '..', 'scoring.js'));
var stats = require('./stats.js');
var helpers = require('./sim-helpers.js');

var ALPHA = 0.001;
var SEED_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function zeros(n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = 0; return a; }
function fill(n, v) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = v; return a; }
function fmtP(p) { return p < 1e-4 ? p.toExponential(1) : p.toFixed(4); }
function pct(x, digits) { return (100 * x).toFixed(digits === undefined ? 2 : digits) + '%'; }
function sum(list) { return list.reduce(function (s, x) { return s + x; }, 0); }

// Index of the pair {i, j} (i < j) among the n*(n-1)/2 pairs of n things.
function pairIndex(i, j, n) {
  if (i > j) { var t = i; i = j; j = t; }
  return i * n - (i * (i + 1)) / 2 + (j - i - 1);
}

// Pearson test of a contingency table for independence (expected =
// row total x column total / N). Rows or columns that are all zero are skipped.
function independence(table, rows, cols) {
  var rowSum = zeros(rows), colSum = zeros(cols), n = 0;
  for (var r = 0; r < rows; r++) {
    for (var c = 0; c < cols; c++) {
      var v = table[r * cols + c];
      rowSum[r] += v; colSum[c] += v; n += v;
    }
  }
  var x = 0;
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      var e = rowSum[r] * colSum[c] / n;
      if (e > 0) x += (table[r * cols + c] - e) * (table[r * cols + c] - e) / e;
    }
  }
  var df = (rowSum.filter(Boolean).length - 1) * (colSum.filter(Boolean).length - 1);
  return { x: x, df: df };
}

// A check result: one line of verdict plus detail lines.
function result(id, title, stat, df, p, lines, testCount) {
  var tests = testCount || 1;
  var adjusted = Math.min(1, p * tests);
  return { id: id, title: title, stat: stat, df: df, p: p, adjustedP: adjusted, tests: tests, pass: adjusted >= ALPHA, lines: lines };
}

// ---------------------------------------------------------------------------
// The checks
// ---------------------------------------------------------------------------

/*
 * runFairness(content, options) -> { checks: [...], ok }
 *   options.n        number of seeds (default 200,000)
 *   options.label    makes the seed stream (default 'main')
 *   options.seedSource  a function returning one seed per call, used instead
 *                    of the label's fixed stream (e.g. scoring.makeSeed)
 *   options.draw     the draw function to test (default scoring.drawStatements)
 *   options.rules    rules passed to score() (default scoring.RULES)
 *   options.only     a string of check letters to run, e.g. 'abf'
 */
function runFairness(content, options) {
  options = options || {};
  var N = options.n || 200000;
  var draw = options.draw || scoring.drawStatements;
  var rules = options.rules || scoring.RULES;
  var only = options.only || 'abcdefg';
  var label = options.label || 'main';
  var checks = [];

  // --- the strata and where each statement sits in them ---
  var strataMap = scoring.strataOf(content);
  var strata = [];                // [{ dim, band, ids: [...] }]
  var where = {};                 // id -> { k: stratum, i: index, band: 0..2, b: index in band }
  var bandLists = [[], [], []];   // every statement of a band, all dimensions
  scoring.DIM_KEYS.forEach(function (dim) {
    scoring.STATEMENT_BANDS.forEach(function (band, g) {
      var ids = strataMap[dim][band].map(function (s) { return s.id; });
      var k = strata.length;
      strata.push({ dim: dim, band: band, ids: ids, n: ids.length, pairs: ids.length * (ids.length - 1) / 2 });
      ids.forEach(function (id, i) {
        where[id] = { k: k, i: i, g: g, b: bandLists[g].length, dim: scoring.DIM_KEYS.indexOf(dim) };
        bandLists[g].push(id);
      });
    });
  });
  var S = strata.length;
  var picks = scoring.PICKS_PER_STRATUM;
  var groupSize = scoring.DIM_KEYS.length * picks; // 10 per band group

  var nextSeed = options.seedSource || helpers.seedStream(label);
  var seeds = new Array(N);
  for (var t = 0; t < N; t++) seeds[t] = nextSeed();

  // =========================================================================
  // One pass over N draws for (a) to (d)
  // =========================================================================
  if (/[abcd]/.test(only)) {
    var stmtCount = {};
    Object.keys(where).forEach(function (id) { stmtCount[id] = 0; });
    var pairCounts = strata.map(function (s) { return zeros(s.pairs); });
    var joint = [];               // joint[k][l] for k < l: a pairs(k) x pairs(l) table
    for (var k = 0; k < S; k++) {
      joint.push([]);
      for (var l = 0; l < S; l++) joint[k].push(l > k ? zeros(strata[k].pairs * strata[l].pairs) : null);
    }
    var posCount = [0, 1, 2].map(function (g) {
      return fill(groupSize, null).map(function () { return zeros(bandLists[g].length); });
    });
    var firstDim = [zeros(5), zeros(5), zeros(5)];
    var pairOf = zeros(S), firstIdx = fill(S, -1);

    for (t = 0; t < N; t++) {
      var d = draw(content, seeds[t]);
      for (k = 0; k < S; k++) firstIdx[k] = -1;
      for (var p = 0; p < d.length; p++) {
        var w = where[d[p]];
        stmtCount[d[p]] += 1;
        if (firstIdx[w.k] === -1) firstIdx[w.k] = w.i;
        else pairOf[w.k] = pairIndex(firstIdx[w.k], w.i, strata[w.k].n);
        var g = Math.floor(p / groupSize), slot = p % groupSize;
        posCount[g][slot][w.b] += 1;
        if (slot === 0) firstDim[g][w.dim] += 1;
      }
      for (k = 0; k < S; k++) {
        pairCounts[k][pairOf[k]] += 1;
        for (l = k + 1; l < S; l++) joint[k][l][pairOf[k] * strata[l].pairs + pairOf[l]] += 1;
      }
    }

    // ---- (a) every statement equally often ----
    if (only.indexOf('a') !== -1) {
      // Pearson's statistic on a stratum's counts, with expected 2N/n each.
      // Each draw picks 2 DIFFERENT statements, so the counts vary a little
      // less than in a plain multinomial; multiplying by (n-1)/(n-2) makes
      // the statistic exactly chi-square with n-1 degrees of freedom again.
      // (A stratum of exactly 2 is always drawn whole and has nothing to test.)
      var xa = 0, dfa = 0, lines = [];
      var byBand = { mild: [], medium: [], extreme: [] };
      strata.forEach(function (s) {
        var expected = N * picks / s.n;
        var obs = s.ids.map(function (id) { return stmtCount[id]; });
        if (s.n > 2) {
          xa += stats.pearson(obs, fill(s.n, expected)) * (s.n - 1) / (s.n - 2);
          dfa += s.n - 1;
        }
        obs.forEach(function (o) { byBand[s.band].push({ chance: o / N, expected: picks / s.n }); });
      });
      Object.keys(byBand).forEach(function (band) {
        var list = byBand[band];
        var chances = list.map(function (x) { return x.chance; });
        var expectedChances = list.map(function (x) { return x.expected; });
        var worst = list.reduce(function (m, x) { return Math.max(m, Math.abs(x.chance / x.expected - 1)); }, 0);
        lines.push(band + ': expected chance ' + uniqueList(expectedChances) + ', observed ' +
          pct(Math.min.apply(null, chances)) + ' to ' + pct(Math.max.apply(null, chances)) +
          ' over ' + list.length + ' statements (largest relative deviation ' + pct(worst) + ')');
      });
      var ra = result('a', 'every statement is drawn equally often', xa, dfa, stats.chiSquareP(xa, dfa), lines);
      // The observed range over all three bands, for the tests: the result
      // page's small print quotes it (content.js, judging.drawNote).
      var allChances = [].concat(byBand.mild, byBand.medium, byBand.extreme).map(function (x) { return x.chance; });
      ra.range = { min: Math.min.apply(null, allChances), max: Math.max.apply(null, allChances) };
      checks.push(ra);
    }

    // ---- (b) pairs inside a stratum ----
    if (only.indexOf('b') !== -1) {
      var xb = 0, dfb = 0, minP = 1, lines2 = [];
      strata.forEach(function (s, k1) {
        if (s.pairs < 2) return;
        var expected = N / s.pairs;
        var x = stats.pearson(pairCounts[k1], fill(s.pairs, expected));
        var df = s.pairs - 1;
        xb += x; dfb += df;
        minP = Math.min(minP, stats.chiSquareP(x, df));
      });
      var allPairs = [];
      strata.forEach(function (s, k2) { pairCounts[k2].forEach(function (c) { allPairs.push({ c: c, e: N / s.pairs }); }); });
      lines2.push('each of the ' + uniqueList(strata.map(function (s) { return s.pairs; }), true) + ' pairs per stratum expected ' +
        uniqueList(strata.map(function (s) { return Math.round(N / s.pairs); }), true) + ' times; observed ' +
        Math.min.apply(null, allPairs.map(function (x) { return x.c; })) + ' to ' + Math.max.apply(null, allPairs.map(function (x) { return x.c; })));
      lines2.push('smallest p of the ' + S + ' strata on its own: ' + fmtP(minP));
      checks.push(result('b', 'every pair inside a stratum co-occurs equally often', xb, dfb, stats.chiSquareP(xb, dfb), lines2));
    }

    // ---- (c) independence between strata ----
    if (only.indexOf('c') !== -1) {
      var xc = 0, dfc = 0, minPc = 1, tables = 0, sameDim = { x: 0, df: 0 };
      for (k = 0; k < S; k++) {
        for (l = k + 1; l < S; l++) {
          var ind = independence(joint[k][l], strata[k].pairs, strata[l].pairs);
          if (ind.df <= 0) continue;
          xc += ind.x; dfc += ind.df; tables += 1;
          minPc = Math.min(minPc, stats.chiSquareP(ind.x, ind.df));
          if (strata[k].dim === strata[l].dim) { sameDim.x += ind.x; sameDim.df += ind.df; }
        }
      }
      // Two ways to fail: a little dependence spread over everything (the
      // total) or a lot of it in one pair of strata (the smallest p, times
      // the number of tables). Both are tested.
      var pTotal = stats.chiSquareP(xc, dfc);
      var pWorst = Math.min(1, minPc * tables);
      var linesC = [
        tables + ' pairs of strata, each a ' + 'table of "which pair here" x "which pair there"',
        'total: chi2 ' + xc.toFixed(0) + ' on ' + dfc + ' df (p ' + fmtP(pTotal) + ')',
        'same dimension only (asked one after the other): chi2 ' + sameDim.x.toFixed(0) + ' on ' + sameDim.df + ' df (p ' + fmtP(stats.chiSquareP(sameDim.x, sameDim.df)) + ')',
        'worst single pair of strata: p ' + fmtP(minPc) + ', x ' + tables + ' tables = ' + fmtP(pWorst)
      ];
      var rc = result('c', 'picks in different strata are independent', xc, dfc, Math.min(pTotal, pWorst), linesC);
      rc.pass = pTotal >= ALPHA && pWorst >= ALPHA;
      checks.push(rc);
    }

    // ---- (d) places inside each band group, and who goes first ----
    if (only.indexOf('d') !== -1) {
      // For one place in one group, the statement there is one of the band's
      // statements; statement s should be there with chance (2/n_s) / 10.
      // That is one observation per draw, so a plain chi-square test, one
      // for each of the 30 places (Bonferroni over 30).
      var minPd = 1, worstDev = 0, linesD = [], testsD = 0;
      for (g = 0; g < 3; g++) {
        var expectedHere = bandLists[g].map(function (id) { return N * (picks / strata[where[id].k].n) / groupSize; });
        for (var slot2 = 0; slot2 < groupSize; slot2++) {
          var obs = posCount[g][slot2];
          var pd = stats.chiSquareP(stats.pearson(obs, expectedHere), bandLists[g].length - 1);
          minPd = Math.min(minPd, pd); testsD += 1;
          obs.forEach(function (o, i) { worstDev = Math.max(worstDev, Math.abs(o / expectedHere[i] - 1)); });
        }
      }
      linesD.push('places: ' + testsD + ' tests (3 groups x 10 places), each over the band\'s ' +
        bandLists.map(function (b) { return b.length; }).join(' / ') + ' statements; smallest p ' + fmtP(minPd) +
        ', largest relative deviation of one statement at one place ' + pct(worstDev));
      var minFirst = 1;
      var firstLines = [];
      for (g = 0; g < 3; g++) {
        var pf = stats.chiSquareP(stats.pearson(firstDim[g], fill(5, N / 5)), 4);
        minFirst = Math.min(minFirst, pf); testsD += 1;
        firstLines.push(scoring.STATEMENT_BANDS[g] + ' group first: ' + scoring.DIM_KEYS.map(function (key, i) {
          return key + ' ' + pct(firstDim[g][i] / N, 1);
        }).join(', ') + ' (expected 20.0% each, p ' + fmtP(pf) + ')');
      }
      linesD = linesD.concat(firstLines);
      checks.push(result('d', 'every statement equally likely at every place; no dimension always first',
        null, null, Math.min(minPd, minFirst), linesD, testsD));
    }
  }

  // =========================================================================
  // (e) seeds one character apart
  // =========================================================================
  if (only.indexOf('e') !== -1) {
    var meta = scoring.makeGenerator('apt-fair-flip|' + label);
    // Under independence the overlap of two 2-picks from n is
    // hypergeometric: both the same 1/C, one shared 2(n-2)/C, none C(n-2,2)/C.
    var overlap = strata.map(function () { return zeros(3); });
    var matchSum = 0, matchSq = 0, identicalOrder = 0, identicalSet = 0;
    var bitFlips = zeros(128);
    for (t = 0; t < N; t++) {
      var a = seeds[t];
      var pos = scoring.randomBelow(meta, a.length);
      var old = SEED_ALPHABET.indexOf(a[pos]);
      var b = a.slice(0, pos) + SEED_ALPHABET[(old + 1 + scoring.randomBelow(meta, 35)) % 36] + a.slice(pos + 1);
      var da = draw(content, a), db = draw(content, b);
      var inA = {};
      da.forEach(function (id) { inA[id] = true; });
      var shared = zeros(S), matches = 0, sameSet = true;
      for (p = 0; p < db.length; p++) {
        if (inA[db[p]]) shared[where[db[p]].k] += 1; else sameSet = false;
        if (da[p] === db[p]) matches += 1;
      }
      for (k = 0; k < S; k++) overlap[k][shared[k]] += 1;
      matchSum += matches; matchSq += matches * matches;
      if (matches === da.length) identicalOrder += 1;
      if (sameSet) identicalSet += 1;
      // The generator itself: the first four outputs (128 bits) for both seeds.
      var ga = scoring.makeGenerator('apt-draw-v1|' + a), gb = scoring.makeGenerator('apt-draw-v1|' + b);
      for (var word = 0; word < 4; word++) {
        var diff = (ga() ^ gb()) >>> 0;
        for (var bit = 0; bit < 32; bit++) if ((diff >>> bit) & 1) bitFlips[word * 32 + bit] += 1;
      }
    }
    var xe = 0, dfe = 0, expShared = 0, obsShared = 0;
    strata.forEach(function (s, k3) {
      var C = s.pairs;
      var probs = [(s.n - 2) * (s.n - 3) / 2 / C, 2 * (s.n - 2) / C, 1 / C];
      var expected = probs.map(function (q) { return q * N; });
      var cells = probs.filter(function (q) { return q > 0; }).length;
      xe += stats.pearson(overlap[k3], expected); dfe += cells - 1;
      expShared += N * (probs[1] + 2 * probs[2]);
      obsShared += overlap[k3][1] + 2 * overlap[k3][2];
    });
    var pOverlap = stats.chiSquareP(xe, dfe);
    // Same statement at the same place: for one place the chance is the sum
    // over the band of (chance s is there)^2.
    var expectedMatches = 0;
    for (g = 0; g < 3; g++) {
      var q2 = sum(bandLists[g].map(function (id) { var q = (picks / strata[where[id].k].n) / groupSize; return q * q; }));
      expectedMatches += groupSize * q2;
    }
    var meanM = matchSum / N, varM = matchSq / N - meanM * meanM;
    var zM = (meanM - expectedMatches) / Math.sqrt(varM / N);
    var pMatch = stats.normalP(zM);
    var maxZ = 0, meanFlip = sum(bitFlips) / (128 * N);
    bitFlips.forEach(function (c) { maxZ = Math.max(maxZ, Math.abs((c - N / 2) / Math.sqrt(N / 4))); });
    var pBits = Math.min(1, stats.normalP(maxZ) * 128);
    var linesE = [
      'statements shared with the neighbour seed\'s draw: ' + (obsShared / N).toFixed(3) + ' per play, expected ' +
        (expShared / N).toFixed(3) + ' for unrelated draws (chi2 ' + xe.toFixed(1) + ' on ' + dfe + ' df, p ' + fmtP(pOverlap) + ')',
      'same statement at the same place: ' + meanM.toFixed(4) + ' places per play, expected ' + expectedMatches.toFixed(4) +
        ' (z ' + zM.toFixed(2) + ', p ' + fmtP(pMatch) + ')',
      'identical draws: ' + identicalOrder + ' in the same order, ' + identicalSet + ' with the same 30 statements (expected 0)',
      'generator bits that flip between neighbour seeds: ' + pct(meanFlip) + ' on average (expected 50%), worst of 128 bits z ' +
        maxZ.toFixed(2) + ' (p x 128 = ' + fmtP(pBits) + ')'
    ];
    var re = result('e', 'seeds one character apart give unrelated draws', xe, dfe, Math.min(pOverlap, pMatch, pBits), linesE, 3);
    re.pass = re.adjustedP >= ALPHA && identicalSet === 0;
    checks.push(re);
  }

  // =========================================================================
  // (f) the judging
  // =========================================================================
  if (only.indexOf('f') !== -1) {
    var players = helpers.makePlayerModel(content);
    var next = scoring.makeGenerator('apt-fair-players|' + label);
    var types = {};
    scoring.TYPE_IDS.forEach(function (id) { types[id] = 0; });
    var underlyingDeep = zeros(5), lite = zeros(5), deepShown = zeros(5);
    var lotWins = zeros(5), lotTotal = 0;
    var secondaryDim = zeros(5);
    var hiddenOff = Object.assign({}, rules, { soulmateHeartExtremes: Infinity });
    var perms = {}, permCount = 0;
    for (t = 0; t < N; t++) {
      var drawn = draw(content, seeds[t]);
      var answers = players.answer(next, drawn);
      var r = scoring.score(answers, content, drawn, rules);
      types[r.typeId] += 1;
      // The hidden type's rule is about Bond and Heart ON PURPOSE, so it
      // takes players away from those sections (mostly bond_deep, and the
      // Heart secondary that goes with it). To test the REST of the judging
      // for a favourite, a play that meets the hidden rule is judged again
      // with that one rule switched off; everything else is unchanged.
      var r0 = r.hiddenRule ? scoring.score(answers, content, drawn, hiddenOff) : r;
      if (r0.typeId.indexOf('_') > 0) {
        var di = scoring.DIM_KEYS.indexOf(r0.dominantDim);
        if (r0.typeId.slice(-5) === '_lite') lite[di] += 1; else underlyingDeep[di] += 1;
        // The runner-up leaning must not favour a section either.
        if (r0.secondaryTypeId) secondaryDim[scoring.DIM_KEYS.indexOf(r0.secondaryTypeId.split('_')[0])] += 1;
      }
      if (r.typeId.slice(-5) === '_deep') deepShown[scoring.DIM_KEYS.indexOf(r.typeId.split('_')[0])] += 1;
      if (r.tieBreak === 'lot') { lotWins[scoring.DIM_KEYS.indexOf(r.dominantDim)] += 1; lotTotal += 1; }
      var perm = scoring.tieLotOrder(drawn).join(',');
      if (!perms[perm]) { perms[perm] = 0; permCount += 1; }
      perms[perm] += 1;
    }
    var nLite = sum(lite), nDeep = sum(underlyingDeep);
    var xLite = stats.pearson(lite, fill(5, nLite / 5));
    var xDeep = stats.pearson(underlyingDeep, fill(5, nDeep / 5));
    var xLot = stats.pearson(lotWins, fill(5, lotTotal / 5));
    var nSec = sum(secondaryDim);
    var xSec = stats.pearson(secondaryDim, fill(5, nSec / 5));
    var permObs = Object.keys(perms).map(function (key) { return perms[key]; });
    while (permObs.length < 120) permObs.push(0);
    var xPerm = stats.pearson(permObs, fill(120, N / 120));

    // Forced exact ties: every pair of dimensions, the same answers in both
    // (both mild and one medium), nothing else. Only the lot can decide.
    var tieSeeds = helpers.seedStream('ties|' + label);
    var M = Math.max(100, Math.floor(N / 10));
    var xTie = 0, tieLines = [];
    for (var i1 = 0; i1 < 5; i1++) {
      for (var i2 = i1 + 1; i2 < 5; i2++) {
        var counts = {};
        counts[scoring.DIM_KEYS[i1]] = [2, 1, 0];
        counts[scoring.DIM_KEYS[i2]] = [2, 1, 0];
        var winsFirst = 0;
        for (t = 0; t < M; t++) {
          var dt = draw(content, tieSeeds());
          var rt = scoring.score(scoring.admitByCounts(content, dt, counts), content, dt, rules);
          if (rt.dominantDim === scoring.DIM_KEYS[i1]) winsFirst += 1;
        }
        xTie += stats.pearson([winsFirst, M - winsFirst], [M / 2, M / 2]);
        tieLines.push(scoring.DIM_KEYS[i1] + '/' + scoring.DIM_KEYS[i2] + ' ' + pct(winsFirst / M, 1));
      }
    }
    var pLite = stats.chiSquareP(xLite, 4), pDeep = stats.chiSquareP(xDeep, 4);
    var pLot = stats.chiSquareP(xLot, 4), pTie = stats.chiSquareP(xTie, 10), pPerm = stats.chiSquareP(xPerm, 119);
    var pSec = stats.chiSquareP(xSec, 4);
    function shares(list, total) {
      return scoring.DIM_KEYS.map(function (key, i) { return key + ' ' + pct(list[i] / total, 2); }).join(', ');
    }
    var linesF = [
      'lite types (share of all players, hidden rule switched off): ' + shares(lite, N) + ' (chi2 ' + xLite.toFixed(2) + ' on 4 df, p ' + fmtP(pLite) + ')',
      'deep types, with the hidden rule switched off: ' + shares(underlyingDeep, N) +
        ' (chi2 ' + xDeep.toFixed(2) + ' on 4 df, p ' + fmtP(pDeep) + ')',
      'deep types as shown on the card: ' + shares(deepShown, N) + '; hidden type ' + pct(types.soulmate / N) +
        ' (its rule is about Bond and Heart, so it takes its players mostly from bond_deep; by design, and why the',
      '  checks above switch it off: then nothing in the judging is about one section)',
      'exact ties the 30 answers cannot separate (they go to the play-off, see (g); the lot settles the ones it leaves level): ' +
        pct(lotTotal / N) + ' of players; the lot\'s pick: ' + shares(lotWins, lotTotal) +
        ' (chi2 ' + xLot.toFixed(2) + ' on 4 df, p ' + fmtP(pLot) + ')',
      'section named as the secondary leaning, hidden rule switched off (' + pct(nSec / N) + ' of players): ' + shares(secondaryDim, nSec) +
        ' (chi2 ' + xSec.toFixed(2) + ' on 4 df, p ' + fmtP(pSec) + ')',
      'forced mirror ties, share won by the first of each pair (expected 50%): ' + tieLines.join(', ') +
        ' (chi2 ' + xTie.toFixed(2) + ' on 10 df, p ' + fmtP(pTie) + ')',
      'lot order: ' + permCount + ' of the 120 possible orders seen, chi2 ' + xPerm.toFixed(1) + ' on 119 df (p ' + fmtP(pPerm) + ')'
    ];
    var rf = result('f', 'the judging has no favourite section', xLite + xDeep, 8,
      Math.min(pLite, pDeep, pLot, pTie, pPerm, pSec), linesF, 6);
    // Raw numbers for the tests.
    rf.shares = { lite: lite.map(function (c) { return c / N; }), deep: underlyingDeep.map(function (c) { return c / N; }),
      lotWins: lotWins.slice(), lotTotal: lotTotal, hidden: types.soulmate / N };
    checks.push(rf);
  }

  // =========================================================================
  // (g) the play-off
  // =========================================================================
  if (only.indexOf('g') !== -1) {
    var playoffDraw = options.playoffRounds || scoring.playoffRounds;
    var pairs = [];
    for (var pa = 0; pa < 5; pa++) for (var pb = pa + 1; pb < 5; pb++) pairs.push([scoring.DIM_KEYS[pa], scoring.DIM_KEYS[pb]]);
    // 1. Which statements a play-off shows: for every seed, the rounds of one
    //    pair (taking the ten pairs in turn). Every statement of a stratum is
    //    shown 2 times in 7 in the 30, so it is unseen 5 times in 7 and then
    //    picked 1 time in 5: overall 1 in 7, the same for all 7.
    var pickCounts = strata.map(function (st) { return zeros(st.n); });
    var pickTotal = zeros(S);
    var firstIsFirstDim = 0, roundsSeen = 0, shownAgain = 0;
    for (t = 0; t < N; t++) {
      var dg = draw(content, seeds[t]);
      var inDraw = {};
      dg.forEach(function (id) { inDraw[id] = true; });
      var pair = pairs[t % pairs.length];
      var rounds = playoffDraw(content, dg, pair);
      rounds.forEach(function (round) {
        roundsSeen += 1;
        if (where[round.ids[0]].dim === scoring.DIM_KEYS.indexOf(pair[0])) firstIsFirstDim += 1;
        round.ids.forEach(function (id) {
          if (inDraw[id]) shownAgain += 1;
          var w = where[id];
          pickCounts[w.k][w.i] += 1;
          pickTotal[w.k] += 1;
        });
      });
    }
    var xPick = 0, dfPick = 0, pickShares = [];
    strata.forEach(function (st, k) {
      if (!pickTotal[k]) return;
      xPick += stats.pearson(pickCounts[k], fill(st.n, pickTotal[k] / st.n));
      dfPick += st.n - 1;
      pickCounts[k].forEach(function (c) { pickShares.push(c / pickTotal[k]); });
    });
    var pPick = stats.chiSquareP(xPick, dfPick);
    var xOrder = stats.pearson([firstIsFirstDim, roundsSeen - firstIsFirstDim], [roundsSeen / 2, roundsSeen / 2]);
    var pOrder = stats.chiSquareP(xOrder, 1);
    // 2. Who wins: simulated players who treat the sections identically; for
    //    every play that would go to the lot, the same player answers the
    //    play-off. Pair by pair, the first section should win half of the
    //    play-offs that were decided.
    var players2 = helpers.makePlayerModel(content);
    var next2 = scoring.makeGenerator('apt-fair-playoff|' + label);
    var pairWins = zeros(10), pairDecided = zeros(10), playoffs = 0, settled = 0, winsBySection = zeros(5);
    for (t = 0; t < N; t++) {
      var dp = draw(content, seeds[t]);
      var player = players2.makePlayer(next2);
      var adm = players2.admits(next2, player, dp);
      var r0 = scoring.score(adm, content, dp, rules);
      if (r0.tieBreak !== 'lot' || !r0.playoff || !r0.playoff.rounds.length) continue;
      playoffs += 1;
      var r1 = scoring.score(adm, content, dp, rules, players2.playoff(next2, player, r0.playoff.rounds));
      if (r1.tieBreak !== 'playoff') continue;
      settled += 1;
      var sorted = scoring.DIM_KEYS.filter(function (key) { return r0.tiedDims.indexOf(key) !== -1; });
      var pi = pairIndex(scoring.DIM_KEYS.indexOf(sorted[0]), scoring.DIM_KEYS.indexOf(sorted[1]), 5);
      pairDecided[pi] += 1;
      if (r1.dominantDim === sorted[0]) pairWins[pi] += 1;
      winsBySection[scoring.DIM_KEYS.indexOf(r1.dominantDim)] += 1;
    }
    var xPair = 0, pairLines = [];
    pairs.forEach(function (pr, i) {
      if (pairDecided[i]) xPair += stats.pearson([pairWins[i], pairDecided[i] - pairWins[i]], [pairDecided[i] / 2, pairDecided[i] / 2]);
      pairLines.push(pr[0] + '/' + pr[1] + ' ' + (pairDecided[i] ? pct(pairWins[i] / pairDecided[i], 1) : '-'));
    });
    var pPair = stats.chiSquareP(xPair, 10);
    var xSection = stats.pearson(winsBySection, fill(5, settled / 5));
    var pSection = stats.chiSquareP(xSection, 4);
    // 3. The draw of the 30 is unchanged: a digest of 20,000 draws, recorded
    //    from the code before the play-off was added.
    var digestOk = null;
    var digestNote = 'not checked (only for the real bank and the synthetic 7-per-stratum bank)';
    var expected = DRAW_DIGESTS[bankKey(content)];
    if (expected && !options.draw) {
      var hash = require('crypto').createHash('sha256');
      var dseeds = helpers.seedStream('draw-digest');
      for (var q = 0; q < 20000; q++) hash.update(scoring.drawStatements(content, dseeds()).join(',') + '\n');
      var got = hash.digest('hex');
      digestOk = got === expected;
      digestNote = (digestOk ? 'identical' : 'DIFFERENT') + ' (sha-256 of 20,000 draws ' + got.slice(0, 16) + '..., recorded ' + expected.slice(0, 16) + '...)';
    }
    var linesG = [
      'how often each statement is the one a play-off shows from its stratum (expected 1 in 7 = 14.29% each): from ' +
        pct(Math.min.apply(null, pickShares)) + ' to ' + pct(Math.max.apply(null, pickShares)) + ' over ' + pickShares.length + ' statements (chi2 ' + xPick.toFixed(1) + ' on ' + dfPick + ' df, p ' + fmtP(pPick) + '); ' +
        shownAgain + ' play-off statements were already among the 30 (must be 0)',
      'order inside a round: the first section\'s statement comes first in ' + pct(firstIsFirstDim / roundsSeen, 2) + ' of ' + roundsSeen.toLocaleString('en-US') +
        ' rounds (expected 50%; chi2 ' + xOrder.toFixed(2) + ' on 1 df, p ' + fmtP(pOrder) + ')',
      'play-offs held: ' + pct(playoffs / N) + ' of players; settled by the play-off: ' + pct(playoffs ? settled / playoffs : 0) + ' of them (the rest go to the lot, checked in (f))',
      'play-offs won by the first section of each pair (expected 50%): ' + pairLines.join(', ') + ' (chi2 ' + xPair.toFixed(2) + ' on 10 df, p ' + fmtP(pPair) + ')',
      'play-offs won, by section: ' + scoring.DIM_KEYS.map(function (key, i) { return key + ' ' + pct(settled ? winsBySection[i] / settled : 0, 1); }).join(', ') +
        ' (chi2 ' + xSection.toFixed(2) + ' on 4 df, p ' + fmtP(pSection) + ')',
      'the draw of the 30: ' + digestNote
    ];
    var pG = Math.min(pPick, pOrder, pPair, pSection);
    var rg = result('g', 'the play-off has no favourite and leaves the draw alone', xPick + xPair, dfPick + 10,
      digestOk === false || shownAgain > 0 ? 0 : pG, linesG, 4);
    rg.playoff = { pickShares: pickShares, pairWins: pairWins.slice(), pairDecided: pairDecided.slice(), playoffs: playoffs, settled: settled,
      digestOk: digestOk, shownAgain: shownAgain, firstShare: firstIsFirstDim / roundsSeen };
    checks.push(rg);
  }

  return { checks: checks, ok: checks.every(function (c) { return c.pass; }) };
}

// Digests of 20,000 draws (seed stream 'draw-digest'), recorded from the
// code before the play-off existed: the draw must never change.
var DRAW_DIGESTS = {
  real105: '128b6818ed576aada8c9481cea4c473b35a3702cdc300a883ca05f1ad5efbd7f',
  synthetic7: 'a6b85f12cf4fe4bbb553abf1e94d6ea62c616d76e77217fd5a0b5f48e0bbaed6'
};
function bankKey(content) {
  var ids = (content.statements || []).map(function (s) { return s.id; });
  if (ids.length !== 105) return null;
  // The synthetic bank numbers its statements s01..s105 by dimension and band.
  var synthetic = content.statements.every(function (s, i) { return /^Did s/.test(s.text && s.text.en) && s.id === 's' + String(i + 1).padStart(2, '0'); });
  return synthetic ? 'synthetic7' : 'real105';
}

// "28.57%" when every value is the same, else "28.57% / 50.00%".
function uniqueList(values, raw) {
  var seen = [];
  values.forEach(function (v) {
    var s = raw ? String(v) : pct(v);
    if (seen.indexOf(s) === -1) seen.push(s);
  });
  return seen.join(' / ');
}

// ---------------------------------------------------------------------------
// Controls: deliberately broken versions that the checks MUST catch.
// If a control passes, the checks are too weak to trust.
// ---------------------------------------------------------------------------

// The draw with the classic mistake: "random % n" on one random byte.
// 256 is not a multiple of 3, 4 or 7, so low indexes come up a little more
// often (for n = 7: 37/256 instead of 36/256, about 3% too often).
function drawWithModuloBias(content, seed) {
  var strata = scoring.strataOf(content);
  var next = scoring.makeGenerator('apt-draw-v1|' + seed);
  function biased(n) { return (next() & 255) % n; }
  var groups = { mild: [], medium: [], extreme: [] };
  scoring.DIM_KEYS.forEach(function (key) {
    scoring.STATEMENT_BANDS.forEach(function (band) {
      var pool = strata[key][band].map(function (s) { return s.id; });
      for (var i = 0; i < 2; i++) {
        var j = i + biased(pool.length - i);
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
        groups[band].push(pool[i]);
      }
    });
  });
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = scoring.randomBelow(next, i + 1);
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    return list;
  }
  return shuffle(groups.mild).concat(shuffle(groups.medium), shuffle(groups.extreme));
}

// The draw with a "shuffle" by sorting with a random comparator, a popular
// shortcut that does not give every order the same chance.
// (It picks the same statements as the real draw, puts each group back in
// content order, school first, and then "shuffles" it that way.)
function drawWithSortShuffle(content, seed) {
  var fair = scoring.drawStatements(content, seed);
  var order = {};
  content.statements.forEach(function (s, i) { order[s.id] = i; });
  var next = scoring.makeGenerator('apt-sort|' + seed);
  function sortShuffle(list) {
    return list.slice()
      .sort(function (a, b) { return order[a] - order[b]; })
      .sort(function () { return next() / 4294967296 - 0.5; });
  }
  return sortShuffle(fair.slice(0, 10)).concat(sortShuffle(fair.slice(10, 20)), sortShuffle(fair.slice(20)));
}

// The old "soulmate" idea: one flagged statement per stratum forced into
// every draw (here the first extreme Bond statement), the second pick fair.
// That statement is shown in every play instead of 2 in 7.
function drawWithForcedStatement(content, seed) {
  var fair = scoring.drawStatements(content, seed);
  var forced = scoring.strataOf(content).bond.extreme[0].id;
  if (fair.indexOf(forced) !== -1) return fair;
  // Replace one of the two extreme Bond picks with the forced statement.
  var byId = {};
  content.statements.forEach(function (s) { byId[s.id] = s; });
  var out = fair.slice();
  for (var p = 20; p < 30; p++) {
    if (byId[out[p]].dim === 'bond') { out[p] = forced; break; }
  }
  return out;
}

// No shuffle inside the band groups: each group of ten stays in dimension
// order (school first), so every play opens with School.
function drawWithoutGroupShuffle(content, seed) {
  var fair = scoring.drawStatements(content, seed);
  var byId = {};
  content.statements.forEach(function (s) { byId[s.id] = s; });
  function byDim(list) {
    return list.slice().sort(function (a, b) {
      return scoring.DIM_KEYS.indexOf(byId[a].dim) - scoring.DIM_KEYS.indexOf(byId[b].dim);
    });
  }
  return byDim(fair.slice(0, 10)).concat(byDim(fair.slice(10, 20)), byDim(fair.slice(20)));
}

// A play-off that does not draw: always the first unseen statement of the
// stratum, the first section first. The same statements every time.
function playoffWithFirstUnseen(content, drawnIds, tiedDims) {
  var pair = scoring.DIM_KEYS.filter(function (key) { return tiedDims.indexOf(key) !== -1; });
  var inDraw = {};
  drawnIds.forEach(function (id) { inDraw[id] = true; });
  var strata = scoring.strataOf(content);
  return scoring.PLAYOFF_BANDS.map(function (band) {
    return { band: band, ids: pair.map(function (dim) { return strata[dim][band].filter(function (s) { return !inDraw[s.id]; })[0].id; }) };
  });
}

function runControls(content, n) {
  var controls = [
    { name: '"random % n" on a byte in the draw', options: { draw: drawWithModuloBias, only: 'ab' } },
    { name: 'one statement forced into every draw (the old flag idea)', options: { draw: drawWithForcedStatement, only: 'ab' } },
    { name: 'shuffle by sorting with a random comparator', options: { draw: drawWithSortShuffle, only: 'd' } },
    { name: 'band groups left in dimension order (School always first)', options: { draw: drawWithoutGroupShuffle, only: 'd' } },
    { name: 'a play-off that always shows the first unseen statement of a stratum', options: { playoffRounds: playoffWithFirstUnseen, only: 'g' } },
    { name: 'the old fixed tie order (bond > heart > brain > work > school)',
      options: { rules: Object.assign({}, scoring.RULES, { fixedTieOrder: ['bond', 'heart', 'brain', 'work', 'school'] }), only: 'f' } }
  ];
  return controls.map(function (c) {
    var res = runFairness(content, Object.assign({ n: n, label: 'control' }, c.options));
    var failed = res.checks.filter(function (x) { return !x.pass; }).map(function (x) { return '(' + x.id + ') p ' + fmtP(x.adjustedP); });
    return { name: c.name, caught: failed.length > 0, failed: failed };
  });
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

function printReport(title, res) {
  console.log('\n=== ' + title + ' ===');
  res.checks.forEach(function (c) {
    var head = '(' + c.id + ') ' + (c.pass ? 'PASS' : 'FAIL') + '  ' + c.title;
    var stat = c.stat !== null ? '  chi2 ' + c.stat.toFixed(1) + ' on ' + c.df + ' df,' : ' ';
    console.log(head + '\n   ' + stat + ' p ' + fmtP(c.p) + (c.tests > 1 ? ' (smallest of ' + c.tests + ' tests; x ' + c.tests + ' = ' + fmtP(c.adjustedP) + ')' : ''));
    c.lines.forEach(function (line) { console.log('    - ' + line); });
  });
}

if (require.main === module) {
  var argv = process.argv.slice(2);
  var getArg = function (name, fallback) {
    var hit = argv.find(function (a) { return a.indexOf('--' + name + '=') === 0; });
    return hit ? hit.split('=')[1] : fallback;
  };
  var n = Number(getArg('n', 200000));
  var bank = getArg('bank', 'real');
  var seedsArg = getArg('seeds', 'both');
  var withControls = argv.indexOf('--no-controls') === -1;

  require(path.join(__dirname, '..', 'content.js'));
  var bankContent = bank === 'synthetic' ? helpers.syntheticContent(7) : globalThis.APT_CONTENT;
  var bankName = bank === 'synthetic' ? 'SYNTHETIC BANK (7 per stratum)'
    : 'REAL BANK (content.js, ' + scoring.bankReport(globalThis.APT_CONTENT).total + ' statements)';
  var banks = [];
  if (seedsArg !== 'crypto') banks.push({ title: bankName + ', fixed seeds (label "main")', content: bankContent, options: { label: 'main' } });
  if (seedsArg !== 'fixed') banks.push({ title: bankName + ', crypto seeds from scoring.makeSeed()', content: bankContent, options: { label: 'crypto', seedSource: function () { return scoring.makeSeed(); } } });

  console.log('Fairness checks over ' + n.toLocaleString('en-US') + ' seeds per run. A check fails when p < ' + ALPHA + '.');
  var allOk = true;
  banks.forEach(function (b) {
    var started = Date.now();
    var res = runFairness(b.content, Object.assign({ n: n }, b.options));
    printReport(b.title, res);
    scoring.bankReport(b.content).warnings.forEach(function (w) { console.log('   WARNING ' + w); });
    console.log('   (' + ((Date.now() - started) / 1000).toFixed(1) + ' s)');
    if (!res.ok) allOk = false;
  });

  if (withControls) {
    console.log('\n=== CONTROLS: broken versions on the full-size bank, which must FAIL ===');
    runControls(helpers.syntheticContent(7), n).forEach(function (c) {
      console.log((c.caught ? 'caught    ' : 'NOT CAUGHT') + '  ' + c.name + (c.failed.length ? '  -> ' + c.failed.join(', ') : ''));
      if (!c.caught) allOk = false;
    });
  }

  console.log('\n' + (allOk ? 'ALL FAIRNESS CHECKS PASS.' : 'SOME FAIRNESS CHECKS FAILED.'));
  process.exit(allOk ? 0 : 1);
}

module.exports = { runFairness: runFairness, runControls: runControls, ALPHA: ALPHA,
  drawWithModuloBias: drawWithModuloBias, drawWithSortShuffle: drawWithSortShuffle,
  drawWithForcedStatement: drawWithForcedStatement, drawWithoutGroupShuffle: drawWithoutGroupShuffle };
