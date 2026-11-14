/*
 * scoring.js — pure functions, no DOM.
 *
 * Works two ways:
 *   - in the browser as a classic <script>: sets globalThis.APT_SCORING
 *   - in Node (tests): require('../scoring.js') returns the same object
 *
 * The rules here are the product spec. SCORING.md explains them in plain
 * English and Chinese; tools/simulate.js checks them against personas and
 * 200,000 simulated players, and tools/fairness.js proves the draw and the
 * judging have no built-in favourite. If you change a rule, change the tests
 * and SCORING.md too.
 *
 * The three jobs, in order of a play:
 *   1. makeSeed()                         a short random seed for a new play
 *   2. drawStatements(content, seed)      the 30 statements this play shows
 *   3. score(admittedIds, content, drawnIds)   the result
 */
(function (root) {
  'use strict';

  // Dimension keys, in display order. content.js must use exactly these.
  var DIM_KEYS = ['school', 'work', 'heart', 'brain', 'bond'];

  // Every type id the scoring can return. content.js must define all 14.
  var TYPE_IDS = [
    'untouched', 'merged', 'balanced', 'soulmate',
    'school_lite', 'school_deep', 'work_lite', 'work_deep',
    'heart_lite', 'heart_deep', 'brain_lite', 'brain_deep',
    'bond_lite', 'bond_deep'
  ];

  // Interface text keys that app.js reads. validateContent checks they all exist.
  var UI_KEYS = [
    'appName', 'intro', 'meta', 'closeEnough', 'seedFromLink', 'start', 'fromFriend', 'typesTeaser',
    'langSwitch', 'langSwitchLabel',
    'progress', 'liveLabel', 'back', 'closeEnoughHint', 'answerYes', 'answerNo', 'answerUnsure', 'keysHint',
    'resultHeading', 'previewBadge', 'cardTicks', 'cardNote', 'barsLabel', 'barAria',
    'superpower', 'weakness', 'aiSays',
    'saveImage', 'copyLink', 'share', 'newQuestions',
    'imageSaved', 'imageFailed', 'saveHint', 'close', 'linkCopied', 'copyFailed', 'shareText',
    'footer',
    // result screen: card additions, "why you got this", the other sections
    'cardMatch', 'cardAlso',
    'whyTitle', 'evidenceLead', 'evidenceLeadOnly', 'evidenceLeadSome', 'evidenceLeadHidden',
    'evidenceLeadSpread', 'evidenceLeadSample',
    'evidenceNone', 'exhibitLabel', 'exhibitMeta', 'levelMild', 'levelMedium', 'levelExtreme',
    'matchHeading', 'matchDim', 'matchDimAlone', 'matchTieTop', 'matchTieCount', 'matchTieLot',
    'matchCapOne', 'matchCapTwo', 'matchBalanced', 'matchBalancedExact', 'matchMerged',
    'matchSoulmate', 'matchUntouched', 'matchSample', 'unsureNote', 'unsureMany',
    'signsTitle', 'dimsTitle', 'dimsNote', 'dimsSample', 'dimRowMeta', 'dimAria', 'pointOne', 'pointMany',
    'bandNone', 'bandLow', 'bandMid', 'bandHigh', 'dimLeads', 'dimSecond', 'dimTied',
    'secondaryTitle', 'secondaryDim', 'secondaryTie', 'secondarySoulmate', 'secondaryMerged', 'seeType',
    'bestWithTitle', 'clashWithTitle', 'peekNote', 'peekBack', 'peekBackTo',
    'howTitle', 'howWeights', 'howUnsure', 'howLead', 'howSpecial', 'howSecondary', 'howHonest',
    // the "all types" screen and the links that open it
    'typesLink', 'typesTitle', 'typesIntro', 'typesSections', 'typesSpecial', 'typesLite', 'typesDeep',
    'typesRuleUntouched', 'typesRuleBalanced', 'typesRuleMerged', 'typesHidden', 'typesLocked',
    'typesLockedHint', 'typesYou', 'typesBack', 'typesBackHome', 'typesBackQuiz'
  ];

  // The four DEPTH bands of a dimension in a result (how far the player went
  // in that section). Each dimension has one `reads` sentence per band.
  var BANDS = ['none', 'low', 'mid', 'high'];

  // The three bands a STATEMENT can have, mildest first, and what each weighs.
  // (Not to be confused with BANDS above, which describe a result.)
  var STATEMENT_BANDS = ['mild', 'medium', 'extreme'];
  var BAND_WEIGHTS = { mild: 1, medium: 2, extreme: 3 };

  // Length limits from the brief. Chinese is counted in characters.
  var LIMITS = {
    statementEn: 90, statementZh: 34,
    taglineEn: 60, taglineZh: 24
  };

  // The draw: per play, this many statements from every stratum
  // (dimension x band). 5 dimensions x 3 bands x 2 = 30 statements per play,
  // and every dimension is worth 2x1 + 2x2 + 2x3 = 12 points.
  var PICKS_PER_STRATUM = 2;
  var DRAW_SIZE = DIM_KEYS.length * STATEMENT_BANDS.length * PICKS_PER_STRATUM; // 30

  // The bank the editor is filling: 7 statements per stratum, 21 per
  // dimension, 105 in all. Until every stratum has the same size, the
  // statements in smaller strata are shown more often (see bankReport).
  var BANK_PER_STRATUM = 7;
  var BANK_TARGET = DIM_KEYS.length * STATEMENT_BANDS.length * BANK_PER_STRATUM; // 105

  var SIGNS_PER_TYPE = 3;

  /*
   * RULES: every number the type decision uses, in one place.
   * They were tuned with tools/simulate.js (personas + 200,000 random
   * players, each on their own random draw); SCORING.md has the reasoning
   * and the resulting type shares. Every number assumes the standard draw:
   * six statements per dimension (2 mild, 2 medium, 2 extreme), 12 points.
   */
  var RULES = {
    // depth = 100 * points / 12, rounded. Bands: 0 = none, below midFrom =
    // low, below highFrom = mid, otherwise high. With 12 points per dimension:
    //   low  = 1-2 points  (at most the two mild statements, or one medium)
    //   mid  = 3-6 points  (into the medium statements)
    //   high = 7+ points   (impossible without an extreme statement, because
    //                       both mild and both medium together are only 6)
    midFrom: 25,
    highFrom: 55,
    // A dimension type is "deep" when its dimension is in the high band, or
    // when this many of its extreme statements were admitted (both of the
    // two shown), whatever the band.
    deepFromExtremes: 2,

    // merged: at least this many of the 30 admitted (purity 17 or lower),
    // OR every one of the five dimensions in the high band.
    mergedMinTotal: 25,

    // untouched: at most this many admitted (purity 90 or higher), all of
    // them mild. One medium or extreme confession is already a direction.
    untouchedMaxTotal: 3,

    // balanced, way 1: at least this many admitted, every dimension touched,
    // and the deepest and shallowest dimensions at most this many depth
    // points apart (one point of 12 is 8.3 depth points, so 17 = 2 points).
    balancedMinTotal: 6,
    balancedMaxSpread: 17,
    // balanced, way 2: this many dimensions (or more) share the top points
    // exactly. No single section leads, so no section type would be honest.
    balancedTieMin: 3,

    // hidden type (soulmate): every Bond statement shown was admitted, and at
    // least this many extreme Heart statements were admitted.
    soulmateHeartExtremes: 1,

    // secondary type: the runner-up dimension counts as "close" when its depth
    // is at least this share of the winner's depth.
    closeRatio: 0.75,

    // match for a section type is capped when the lead section rests on very
    // few answers: one answer at most 60, two answers at most 80.
    matchCapOne: 60,
    matchCapTwo: 80,

    // How many statements the result screen quotes back as evidence.
    evidenceMax: 3
  };

  // Counts characters the way a reader would (an emoji or CJK character = 1).
  function charLength(text) {
    return Array.from(String(text)).length;
  }

  // A list entry must be a plain object; a stray null or string is reported, not thrown.
  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  // Weight of one statement (1, 2 or 3), from its band. 0 for a bad band.
  function statementWeight(statement) {
    return (statement && BAND_WEIGHTS[statement.band]) || 0;
  }

  // Band name for a depth from 0 to 100.
  function bandForDepth(depth, rules) {
    if (depth <= 0) return 'none';
    if (depth < rules.midFrom) return 'low';
    if (depth < rules.highFrom) return 'mid';
    return 'high';
  }

  // ======================================================================
  // RANDOMNESS
  //
  // Everything random in a play comes from a short seed string, so the same
  // seed always gives the same play (a refresh, a language switch and a
  // friend's share link all see the same 30 statements), while different
  // seeds give unrelated plays. tools/fairness.js tests every claim below.
  // ======================================================================

  /*
   * hash128(text) -> four 32-bit numbers.
   * cyrb128, a small public-domain string hash with good avalanche: changing
   * one character changes about half of the output bits. It turns the seed
   * (and a label that keeps different uses apart) into generator state.
   */
  function hash128(text) {
    var h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (var i = 0; i < text.length; i++) {
      var k = text.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
  }

  /*
   * makeGenerator(label) -> a function returning uniform 32-bit integers.
   * sfc32 ("small fast counting" generator, 128-bit state): passes the
   * PractRand and BigCrush test batteries, and its built-in counter rules
   * out short cycles. The first 15 outputs are thrown away so that similar
   * seeds have fully drifted apart before anything is used.
   */
  function makeGenerator(label) {
    var s = hash128(label);
    var a = s[0], b = s[1], c = s[2], d = s[3];
    function next() {
      var t = (a + b) | 0;
      d = (d + 1) | 0;
      t = (t + d) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      return t >>> 0;
    }
    for (var i = 0; i < 15; i++) next();
    return next;
  }

  /*
   * randomBelow(next, n) -> a whole number from 0 to n-1, each exactly
   * equally likely. "random % n" would favour small numbers whenever n does
   * not divide 2^32, so numbers from the top, incomplete block are rejected
   * and drawn again (rejection sampling). For n <= 21 that happens less than
   * once in 200 million draws, so it costs nothing.
   */
  function randomBelow(next, n) {
    var limit = 4294967296 - (4294967296 % n); // largest multiple of n that fits
    var x;
    do { x = next(); } while (x >= limit);
    return x % n;
  }

  // Fisher-Yates shuffle of a copy of `list`: every order equally likely.
  function shuffled(next, list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = randomBelow(next, i + 1);
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  // Seeds: 6 characters of 0-9 and a-z (36^6 = 2.2 billion plays).
  var SEED_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
  var SEED_LENGTH = 6;
  var SEED_PATTERN = /^[0-9a-z]{6}$/;

  // Fills a byte array with random bytes: crypto.getRandomValues where it
  // exists (every current browser and Node), Math.random otherwise.
  function defaultRandomBytes(bytes) {
    var c = root.crypto;
    if (c && typeof c.getRandomValues === 'function') {
      c.getRandomValues(bytes);
      return;
    }
    for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }

  /*
   * makeSeed([fillRandomBytes]) -> a fresh seed like "k3x9q0".
   * Each character comes from one random byte. Bytes 252-255 are skipped:
   * 252 = 7 x 36, so the bytes that are kept map evenly onto the 36
   * characters (byte % 36 on all 256 bytes would favour 0-3).
   * The argument is only for tests; the app calls makeSeed().
   */
  function makeSeed(fillRandomBytes) {
    var fill = fillRandomBytes || defaultRandomBytes;
    var out = '';
    var guard = 0;
    while (out.length < SEED_LENGTH) {
      var bytes = new Uint8Array(16);
      fill(bytes);
      for (var i = 0; i < bytes.length && out.length < SEED_LENGTH; i++) {
        if (bytes[i] < 252) out += SEED_ALPHABET[bytes[i] % 36];
      }
      if (++guard > 1000) throw new Error('makeSeed: the random source returned no usable bytes');
    }
    return out;
  }

  /*
   * normalizeSeed(value) -> the seed in its standard form, or null when it is
   * not a valid seed. Accepts upper case and surrounding spaces (a link typed
   * by hand), nothing else. The app gives a fresh seed for null.
   */
  function normalizeSeed(value) {
    if (typeof value !== 'string') return null;
    var s = value.trim().toLowerCase();
    return SEED_PATTERN.test(s) ? s : null;
  }

  // The number inside an id ("s07" -> 7), for sorting. Bad ids sort last.
  function idNumber(id) {
    var m = /^s(\d+)$/.exec(String(id));
    return m ? Number(m[1]) : Infinity;
  }

  /*
   * strataOf(content) -> { school: { mild: [statements], medium: [...],
   * extreme: [...] }, work: {...}, ... }, each list sorted by id number
   * (s01, s02, ... s105). Sorting by id, not by file position, means moving
   * statements around in content.js never changes what a seed draws, so old
   * share links keep working after an editor tidies the file. Statements with
   * an unknown dim or band are left out (validateContent reports them).
   */
  function strataOf(content) {
    var strata = {};
    DIM_KEYS.forEach(function (key) {
      strata[key] = {};
      STATEMENT_BANDS.forEach(function (band) { strata[key][band] = []; });
    });
    (content && Array.isArray(content.statements) ? content.statements : []).forEach(function (s) {
      if (!isObject(s) || !strata[s.dim] || !strata[s.dim][s.band]) return;
      strata[s.dim][s.band].push(s);
    });
    DIM_KEYS.forEach(function (key) {
      STATEMENT_BANDS.forEach(function (band) {
        strata[key][band].sort(function (a, b) {
          var d = idNumber(a.id) - idNumber(b.id);
          return d === 0 || isNaN(d) ? 0 : d; // stable sort keeps file order for equal or bad ids
        });
      });
    });
    return strata;
  }

  /*
   * drawStatements(content, seed) -> the ids of the 30 statements this play
   * shows, in the order they are asked.
   *
   *  - Which: in every dimension, 2 mild, 2 medium and 2 extreme, picked
   *    uniformly at random without replacement inside each stratum
   *    (dimension x band). Nothing is forced in and nothing is left out, so
   *    in a stratum of n statements each one is shown in exactly 2 of every
   *    n plays on average (2 in 7 once the bank is full).
   *  - Order: the ten mild ones first, then the ten medium, then the ten
   *    extreme, so every play escalates. Each group of ten is shuffled
   *    uniformly, so any statement is equally likely at any place in its
   *    group and no dimension is always asked first.
   *
   * Same seed + same content = same 30 in the same order. Reordering
   * content.js changes nothing (strata are sorted by id); adding or removing
   * statements changes what an old seed draws (acceptable: a seed lives for
   * one play and its share link). Throws if a stratum has fewer than 2.
   */
  function drawStatements(content, seed) {
    var strata = strataOf(content);
    var next = makeGenerator('apt-draw-v1|' + String(seed));
    var groups = { mild: [], medium: [], extreme: [] };

    DIM_KEYS.forEach(function (key) {
      STATEMENT_BANDS.forEach(function (band) {
        var pool = strata[key][band].map(function (s) { return s.id; });
        if (pool.length < PICKS_PER_STRATUM) {
          throw new Error('drawStatements: "' + key + '" has only ' + pool.length + ' ' + band +
            ' statement(s); a draw needs ' + PICKS_PER_STRATUM);
        }
        // A partial Fisher-Yates: after k steps the first k entries are a
        // uniformly random k-subset of the pool, each in random order.
        for (var i = 0; i < PICKS_PER_STRATUM; i++) {
          var j = i + randomBelow(next, pool.length - i);
          var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
          groups[band].push(pool[i]);
        }
      });
    });

    return shuffled(next, groups.mild)
      .concat(shuffled(next, groups.medium), shuffled(next, groups.extreme));
  }

  /*
   * tieLotOrder(drawnIds) -> the five dimension keys in a random order that
   * belongs to this play. When two sections are still tied after every
   * tie-break that depends on the answers, the one earlier in this order
   * wins. The order is made from the drawn ids (which come from the play's
   * seed), so the same play always gives the same result, while across
   * players every dimension is equally likely to win a tie: no section is
   * favoured by a fixed order.
   */
  function tieLotOrder(drawnIds) {
    var next = makeGenerator('apt-lot-v1|' + Array.from(drawnIds || []).join(','));
    return shuffled(next, DIM_KEYS);
  }

  /*
   * admitByCounts(content, drawnIds, counts) -> admitted ids.
   * counts: { school: [mild, medium, extreme], ... } says how many of the
   * shown statements of each stratum to admit (0, 1 or 2); missing
   * dimensions admit nothing. It takes the first ones in the drawn order.
   * Used by tools/personas.js, the tests, and the app's sample players,
   * since a fixed list of ids would not fit every draw.
   */
  function admitByCounts(content, drawnIds, counts) {
    var byId = {};
    (content.statements || []).forEach(function (s) { if (isObject(s)) byId[s.id] = s; });
    var taken = {};
    var out = [];
    Array.from(drawnIds || []).forEach(function (id) {
      var s = byId[id];
      if (!s || !counts[s.dim]) return;
      var want = counts[s.dim][STATEMENT_BANDS.indexOf(s.band)] || 0;
      var key = s.dim + '/' + s.band;
      taken[key] = taken[key] || 0;
      if (taken[key] < want) { taken[key] += 1; out.push(id); }
    });
    Object.keys(counts).forEach(function (dim) {
      STATEMENT_BANDS.forEach(function (band, b) {
        var want = counts[dim][b] || 0;
        if ((taken[dim + '/' + band] || 0) < want) {
          throw new Error('admitByCounts: wanted ' + want + ' ' + band + ' "' + dim + '" statements, the draw shows fewer');
        }
      });
    });
    return out;
  }

  // ======================================================================
  // SCORING
  // ======================================================================

  /**
   * score(admittedIds, content, drawnIds [, rules]) -> {
   *   total                     statements admitted (of the drawn ones)
   *   drawnCount                statements shown in this play (30)
   *   purity                    round(100 * (1 - total / drawnCount))
   *   perDim:    { dim: admitted count }
   *   shown:     { dim: statements shown (6) }
   *   points:    { dim: weighted points }
   *   maxPoints: { dim: the most points possible in this play (12) }
   *   depth:     { dim: 0..100 }   points as a share of maxPoints
   *   band:      { dim: 'none'|'low'|'mid'|'high' }
   *   dominantDim                  the dimension that ranks first (null if nothing admitted)
   *   typeId, secondaryTypeId (or null), evidenceIds (0-3 ids), match (0..100)
   *
   *   Extras so the result screen can explain itself without redoing the rules:
   *   runnerUpDim                  the dimension that ranks second (null if only one has points)
   *   tiedDims                     dimensions sharing the top points, in rank order ([] if no tie)
   *   tieBreak                     how the lead beat an equal runner-up: 'top' (heavier admitted
   *                                statement), 'count' (more statements), 'lot' (decided by lot,
   *                                see tieLotOrder), or null
   *   matchCap                     the cap that lowered `match` (60 or 80), or null
   *   hiddenRule                   true when the hidden type's rule is met (even if merged won)
   * }
   *
   * admittedIds: an array or Set of the statement ids answered "Guilty".
   *   "Not sure" answers are never passed in (see admittedIds below), so they
   *   count exactly like "Never". Unknown ids, duplicates and ids that were
   *   not drawn are ignored.
   * drawnIds: the ids this play showed (drawStatements). If it is left out,
   *   every statement in the bank counts as shown; that is only there so an
   *   older caller does not crash, and the thresholds assume a real draw.
   * rules: optional, only so tools/simulate.js can try other thresholds.
   * Pure and deterministic: same answers and same draw, same result.
   */
  function score(answers, content, drawnIds, rules) {
    rules = rules || RULES;

    var byId = {};
    (content.statements || []).forEach(function (s) {
      if (isObject(s) && DIM_KEYS.indexOf(s.dim) !== -1 && statementWeight(s) > 0) byId[s.id] = s;
    });

    // The statements shown in this play, once each, in the order shown.
    var drawnList = drawnIds ? Array.from(drawnIds) : (content.statements || []).map(function (s) { return s && s.id; });
    var drawn = [];
    var position = {};
    drawnList.forEach(function (id) {
      if (byId[id] && !Object.prototype.hasOwnProperty.call(position, id)) {
        position[id] = drawn.length;
        drawn.push(id);
      }
    });
    var admitted = new Set(Array.from(answers || []));

    // --- 1. Per-dimension numbers ---------------------------------------
    var perDim = {}, shown = {}, points = {}, maxPoints = {}, topWeight = {}, admittedIn = {};
    DIM_KEYS.forEach(function (key) {
      perDim[key] = 0; shown[key] = 0; points[key] = 0; maxPoints[key] = 0; topWeight[key] = 0; admittedIn[key] = [];
    });

    var total = 0;
    var allAdmitted = [];      // { id, dim, weight, pos } for every admitted statement
    drawn.forEach(function (id) {
      var s = byId[id];
      var weight = statementWeight(s);
      shown[s.dim] += 1;
      maxPoints[s.dim] += weight;
      if (!admitted.has(id)) return;
      var item = { id: id, dim: s.dim, weight: weight, pos: position[id] };
      total += 1;
      perDim[s.dim] += 1;
      points[s.dim] += weight;
      if (weight > topWeight[s.dim]) topWeight[s.dim] = weight;
      admittedIn[s.dim].push(item);
      allAdmitted.push(item);
    });

    var depthExact = {}, depth = {}, band = {};
    DIM_KEYS.forEach(function (key) {
      depthExact[key] = maxPoints[key] ? 100 * points[key] / maxPoints[key] : 0;
      depth[key] = Math.round(depthExact[key]);
      band[key] = bandForDepth(depth[key], rules);
    });

    // --- 2. Rank the dimensions -----------------------------------------
    // Deepest first; ties go to the dimension with the heavier admitted
    // statement, then to more statements, and only then to this play's lot.
    // (rules.fixedTieOrder exists only so tools/fairness.js can show that the
    // old fixed order WAS a favourite; RULES never sets it.)
    var lot = rules.fixedTieOrder || tieLotOrder(drawn);
    var ranked = DIM_KEYS.slice().sort(function (a, b) {
      if (depthExact[b] !== depthExact[a]) return depthExact[b] - depthExact[a];
      if (topWeight[b] !== topWeight[a]) return topWeight[b] - topWeight[a];
      if (perDim[b] !== perDim[a]) return perDim[b] - perDim[a];
      return lot.indexOf(a) - lot.indexOf(b);
    });
    var rankIndex = {};
    ranked.forEach(function (key, i) { rankIndex[key] = i; });
    var dominant = ranked[0];
    var runnerUp = ranked[1];

    // Sections that share the top points exactly (only counts when there are
    // points at all), and, for two of them, which tie-break picked the lead.
    // (tieBreak itself is filled in below, once we know whether the lead
    // section actually decides a section type.)
    var tiedDims = ranked.filter(function (key) { return depthExact[key] > 0 && depthExact[key] === depthExact[dominant]; });
    if (tiedDims.length < 2) tiedDims = [];
    var tieBreak = null;

    // How many extreme statements were admitted in a dimension.
    function extremesIn(key) {
      return admittedIn[key].filter(function (it) { return it.weight === BAND_WEIGHTS.extreme; }).length;
    }

    // The lite or deep type of one dimension. Deep means either the section
    // is in the high band, or both of its extreme statements were admitted.
    function dimType(key) {
      var isDeep = depth[key] >= rules.highFrom || extremesIn(key) >= rules.deepFromExtremes;
      return key + (isDeep ? '_deep' : '_lite');
    }

    // --- 3. The type: the first rule that matches wins --------------------
    var heaviestAdmitted = allAdmitted.reduce(function (m, it) { return Math.max(m, it.weight); }, 0);
    var depths = DIM_KEYS.map(function (key) { return depthExact[key]; });
    var spread = Math.max.apply(null, depths) - Math.min.apply(null, depths);
    var everyDimTouched = DIM_KEYS.every(function (key) { return perDim[key] > 0; });
    var everyDimHigh = DIM_KEYS.every(function (key) { return band[key] === 'high'; });

    // The hidden type: every Bond statement shown was admitted, plus at least
    // one extreme Heart statement. Every draw shows six Bond statements and
    // two extreme Heart ones, so every play can reach it.
    var hiddenRule = shown.bond > 0 && perDim.bond === shown.bond &&
      extremesIn('heart') >= rules.soulmateHeartExtremes;

    var isUntouched = total <= rules.untouchedMaxTotal && heaviestAdmitted <= BAND_WEIGHTS.mild;
    // Balanced has two ways in: an even spread over all five sections, or a
    // three-way (or bigger) tie for the top, where no section can claim you.
    // (The 1e-9 keeps floating-point rounding from deciding a spread that
    // sits exactly on the limit.)
    var isBalanced = (total >= rules.balancedMinTotal && everyDimTouched && spread <= rules.balancedMaxSpread + 1e-9) ||
      tiedDims.length >= rules.balancedTieMin;

    // The type the player gets when the hidden rule is skipped. Used as the
    // soulmate's secondary type, so it lives in its own function.
    function typeWithoutSoulmate() {
      if (isUntouched) return 'untouched';
      if (isBalanced) return 'balanced';
      return dimType(dominant);
    }

    var typeId;
    if (total >= rules.mergedMinTotal || everyDimHigh) typeId = 'merged';
    else if (hiddenRule) typeId = 'soulmate';
    else typeId = typeWithoutSoulmate();

    // How an exact two-way tie for the lead was settled, but only when that
    // lead decides a section type (the type itself, or the type underneath
    // the hidden one). A tie of three or more is balanced, and an untouched
    // or merged result does not depend on the lead at all, so they get null.
    var sectionTypeDecided = typeId.indexOf('_') > 0 ||
      (typeId === 'soulmate' && typeWithoutSoulmate().indexOf('_') > 0);
    if (tiedDims.length === 2 && sectionTypeDecided) {
      if (topWeight[dominant] !== topWeight[runnerUp]) tieBreak = 'top';
      else if (perDim[dominant] !== perDim[runnerUp]) tieBreak = 'count';
      else tieBreak = 'lot';
    }

    // --- 4. Secondary type (a runner-up leaning, or null) -----------------
    var secondaryTypeId = null;
    if (typeId === 'merged') {
      secondaryTypeId = hiddenRule ? 'soulmate' : null;
    } else if (typeId === 'soulmate') {
      secondaryTypeId = typeWithoutSoulmate();
      if (secondaryTypeId === 'untouched') secondaryTypeId = null;
    } else if (typeId !== 'untouched' && typeId !== 'balanced') {
      // A dimension type: the runner-up counts when it is nearly as deep.
      // (The tiny 1e-9 keeps an exact 3-out-of-4 ratio from losing to
      // floating-point rounding.)
      if (depthExact[runnerUp] > 0 && depthExact[runnerUp] + 1e-9 >= rules.closeRatio * depthExact[dominant]) {
        secondaryTypeId = dimType(runnerUp);
      }
    }

    // --- 5. Evidence: the admitted statements that best justify the type --
    // Heaviest first; at equal weight the higher-ranked section first, then
    // the one asked earlier.
    function heaviestFirst(a, b) {
      if (b.weight !== a.weight) return b.weight - a.weight;
      if (rankIndex[a.dim] !== rankIndex[b.dim]) return rankIndex[a.dim] - rankIndex[b.dim];
      return a.pos - b.pos;
    }
    var evidence;
    if (typeId === 'soulmate') {
      // What the rule is made of: the two extreme Bond statements, then the
      // first extreme Heart statement admitted.
      var bondTop = admittedIn.bond.filter(function (it) { return it.weight === BAND_WEIGHTS.extreme; });
      var heartTop = admittedIn.heart.filter(function (it) { return it.weight === BAND_WEIGHTS.extreme; });
      evidence = bondTop.sort(heaviestFirst).slice(0, 2).concat(heartTop.sort(heaviestFirst).slice(0, 1));
    } else if (typeId === 'merged' || typeId === 'balanced') {
      // The heaviest statement of each dimension, then the top few of those.
      evidence = DIM_KEYS.map(function (key) {
        return admittedIn[key].slice().sort(heaviestFirst)[0];
      }).filter(Boolean).sort(heaviestFirst);
    } else if (typeId === 'untouched') {
      evidence = allAdmitted.slice().sort(heaviestFirst);
    } else {
      evidence = admittedIn[dominant].slice().sort(heaviestFirst);
    }
    var evidenceIds = evidence.slice(0, rules.evidenceMax).map(function (it) { return it.id; });

    // --- 6. Match: how strongly the answers fit the type (0..100) ---------
    var purity = drawn.length ? Math.round(100 * (1 - total / drawn.length)) : 100;
    var match;
    var matchCap = null;
    if (typeId === 'untouched') {
      match = purity;                          // the less admitted, the better the fit
    } else if (typeId === 'merged') {
      // How deep the player went, averaged over all five sections.
      match = Math.round(depths.reduce(function (sum, d) { return sum + d; }, 0) / depths.length);
    } else if (typeId === 'soulmate') {
      match = 100;                             // the rule is met or not; no partial credit
    } else if (typeId === 'balanced') {
      // 100 minus the depth gap between the deepest and shallowest section the
      // player touched. Empty sections are left out, so a four-way tie with
      // one empty section still counts as perfectly even among the four.
      var touched = DIM_KEYS.filter(function (key) { return perDim[key] > 0; })
        .map(function (key) { return depthExact[key]; });
      match = Math.round(100 - (Math.max.apply(null, touched) - Math.min.apply(null, touched)));
    } else {
      // A section type: how clearly the lead section beats the next one.
      // lead / (lead + runner-up) runs from 50 (a dead heat) to 100 (nothing
      // else touched). A share of ALL points would punish people who admit a
      // lot everywhere, so only the top two are compared.
      var lead = depthExact[dominant];
      var second = depthExact[runnerUp];
      match = Math.round(100 * lead / (lead + second));
      // One or two answers cannot prove much, so the number is capped.
      var cap = perDim[dominant] === 1 ? rules.matchCapOne : (perDim[dominant] === 2 ? rules.matchCapTwo : null);
      if (cap !== null && match > cap) {
        match = cap;
        matchCap = cap;
      }
    }

    return {
      total: total,
      drawnCount: drawn.length,
      purity: purity,
      perDim: perDim,
      shown: shown,
      points: points,
      maxPoints: maxPoints,
      depth: depth,
      band: band,
      dominantDim: total > 0 ? dominant : null,
      runnerUpDim: points[runnerUp] > 0 ? runnerUp : null,
      tiedDims: tiedDims,
      tieBreak: tieBreak,
      typeId: typeId,
      secondaryTypeId: secondaryTypeId,
      evidenceIds: evidenceIds,
      match: match,
      matchCap: matchCap,
      hiddenRule: hiddenRule
    };
  }

  /**
   * questionOrder(content) -> DEPRECATED. app.js plays drawStatements now and
   * no longer calls this; it is kept only for its old test. It lists the whole
   * bank in rounds (one statement of every dimension per round, in content
   * order). A play no longer shows the whole bank: use drawStatements.
   */
  function questionOrder(content) {
    var byDim = content.dimensions.map(function (d) {
      return content.statements.filter(function (s) { return s && s.dim === d.key; });
    });
    var rounds = Math.max.apply(null, byDim.map(function (list) { return list.length; }).concat(0));
    var order = [];
    for (var round = 0; round < rounds; round++) {
      byDim.forEach(function (list) {
        if (round < list.length) order.push(list[round]);
      });
    }
    return order;
  }

  // Pushes a problem unless obj[field] has non-empty en and zh strings.
  function checkPair(problems, obj, field, where) {
    var pair = obj ? obj[field] : undefined;
    if (!pair || typeof pair !== 'object') {
      problems.push(where + ': missing "' + field + '"');
      return;
    }
    ['en', 'zh'].forEach(function (lang) {
      if (typeof pair[lang] !== 'string' || pair[lang].trim() === '') {
        problems.push(where + ': "' + field + '" is missing ' + lang);
      }
    });
  }

  /**
   * validateProfiles(content) -> problems with the result-screen copy only:
   * each dimension's `reads` (one line per band) and each type's `why`,
   * `signs`, `bestWith`/`bestWithLine` and `clashWith`/`clashWithLine`.
   *
   * Kept separate so the tests can tell "the quiz is broken" apart from
   * "the profile copy is not written yet". validateContent includes these
   * problems too. The app never needs them to run: it falls back without them.
   */
  function validateProfiles(content) {
    var problems = [];
    if (!isObject(content)) return problems;

    (Array.isArray(content.dimensions) ? content.dimensions : []).forEach(function (d, i) {
      if (!isObject(d)) return; // reported by validateContent
      var where = 'dimensions[' + i + '] (' + d.key + ')';
      if (!isObject(d.reads)) {
        problems.push(where + ': missing "reads" (one line for each band: ' + BANDS.join(', ') + ')');
        return;
      }
      BANDS.forEach(function (b) { checkPair(problems, d.reads, b, where + ' reads'); });
    });

    (Array.isArray(content.types) ? content.types : []).forEach(function (t, i) {
      if (!isObject(t)) return; // reported by validateContent
      var where = 'types[' + i + '] (' + t.id + ')';
      checkPair(problems, t, 'why', where);

      if (!Array.isArray(t.signs)) {
        problems.push(where + ': missing "signs" (a list of ' + SIGNS_PER_TYPE + ' { en, zh } lines)');
      } else {
        if (t.signs.length !== SIGNS_PER_TYPE) {
          problems.push(where + ': "signs" has ' + t.signs.length + ' lines (need ' + SIGNS_PER_TYPE + ')');
        }
        t.signs.forEach(function (sign, k) { checkPair(problems, t.signs, k, where + ' signs'); });
      }

      ['bestWith', 'clashWith'].forEach(function (field) {
        if (TYPE_IDS.indexOf(t[field]) === -1) {
          problems.push(where + ': "' + field + '" must be one of the 14 type ids, found "' + t[field] + '"');
        } else if (t[field] === t.id) {
          problems.push(where + ': "' + field + '" points at the type itself');
        }
        checkPair(problems, t, field + 'Line', where);
      });
    });
    return problems;
  }

  /**
   * bankReport(content) -> how full the statement bank is:
   * {
   *   sizes:    { school: { mild: 4, medium: 3, extreme: 3 }, ... }
   *   total:    statements with a valid dim and band
   *   equal:    true when every stratum (dimension x band) has the same size
   *   full:     true when every stratum has exactly BANK_PER_STRATUM (7)
   *   chance:   { school: { mild: 0.5, ... }, ... } the chance that one
   *             statement of that stratum is shown in a play (2 / size)
   *   warnings: plain sentences for the editor ([] when the bank is full)
   * }
   * Unequal strata are not a bug in the draw: inside a stratum every
   * statement still has the same chance. But a statement in a stratum of 3 is
   * shown more often than one in a stratum of 4, so the bank should end with
   * the same size everywhere.
   */
  function bankReport(content) {
    var strata = strataOf(content);
    var sizes = {}, chance = {}, all = [], total = 0;
    DIM_KEYS.forEach(function (key) {
      sizes[key] = {}; chance[key] = {};
      STATEMENT_BANDS.forEach(function (band) {
        var n = strata[key][band].length;
        sizes[key][band] = n;
        chance[key][band] = n ? Math.min(1, PICKS_PER_STRATUM / n) : 0;
        all.push(n);
        total += n;
      });
    });
    var equal = all.every(function (n) { return n === all[0]; });
    var full = all.every(function (n) { return n === BANK_PER_STRATUM; });
    var warnings = [];
    if (!equal) {
      warnings.push('bank: strata have different sizes (' + DIM_KEYS.map(function (key) {
        return key + ' ' + STATEMENT_BANDS.map(function (b) { return sizes[key][b]; }).join('/');
      }).join(', ') + ', as mild/medium/extreme), so statements in smaller strata are shown more often. ' +
        'Fill every stratum to ' + BANK_PER_STRATUM + '.');
    } else if (!full) {
      warnings.push('bank: every stratum has ' + all[0] + ' statements; the target is ' + BANK_PER_STRATUM + '.');
    }
    return { sizes: sizes, total: total, equal: equal, full: full, chance: chance, warnings: warnings };
  }

  /**
   * validateContent(content [, options]) -> array of human-readable problems
   * ([] = all good). Run it after editing content.js (the app also logs
   * problems to the console). bankReport(content).warnings lists the softer
   * issues (a bank that is not full yet).
   *
   * Unequal strata are a warning while the bank is still being filled, and a
   * problem once it holds BANK_TARGET (105) statements or more, or when
   * options.strict is true.
   */
  function validateContent(content, options) {
    var problems = [];
    if (!content || typeof content !== 'object') {
      return ['content is missing (is content.js loaded before scoring.js runs?)'];
    }
    var strict = Boolean(options && options.strict);

    // --- ui ---
    var ui = content.ui;
    if (!ui || typeof ui !== 'object') {
      problems.push('ui: missing');
    } else {
      UI_KEYS.forEach(function (key) {
        if (!(key in ui)) problems.push('ui: missing key "' + key + '"');
      });
      Object.keys(ui).forEach(function (key) { checkPair(problems, ui, key, 'ui'); });
    }

    // --- dimensions ---
    var dims = Array.isArray(content.dimensions) ? content.dimensions : [];
    if (dims.length !== DIM_KEYS.length) {
      problems.push('dimensions: expected ' + DIM_KEYS.length + ', found ' + dims.length);
    }
    dims.forEach(function (d, i) {
      var where = 'dimensions[' + i + ']';
      if (!isObject(d)) { problems.push(where + ': not an object'); return; }
      if (d.key !== DIM_KEYS[i]) {
        problems.push(where + ': key should be "' + DIM_KEYS[i] + '", found "' + d.key + '"');
      }
      checkPair(problems, d, 'name', where);
    });

    // --- statements ---
    var statements = Array.isArray(content.statements) ? content.statements : [];
    var seenIds = {};
    statements.forEach(function (s, i) {
      if (!isObject(s)) { problems.push('statements[' + i + ']: not an object'); return; }
      var where = 'statements[' + i + '] (' + s.id + ')';

      if (typeof s.id !== 'string' || !/^s\d{2,}$/.test(s.id)) {
        problems.push(where + ': id must look like "s01" or "s105"');
      } else if (seenIds[s.id]) {
        problems.push(where + ': duplicate id "' + s.id + '"');
      }
      seenIds[s.id] = true;

      if (DIM_KEYS.indexOf(s.dim) === -1) problems.push(where + ': unknown dim "' + s.dim + '"');
      if (STATEMENT_BANDS.indexOf(s.band) === -1) {
        problems.push(where + ': band must be "mild", "medium" or "extreme", found "' + s.band + '"');
      }
      // Flags are gone: a flagged statement would have to be forced into
      // draws, and then it would be shown far more often than the others.
      if (s.flag !== undefined) {
        problems.push(where + ': has flag "' + s.flag + '", but statements carry no flags any more ' +
          '(every statement must have the same chance of being drawn)');
      }
      if ('level' in s) problems.push(where + ': "level" is not used any more; give it a band');

      checkPair(problems, s, 'text', where);
      if (s.text && typeof s.text.en === 'string' && charLength(s.text.en) > LIMITS.statementEn) {
        problems.push(where + ': English text is ' + charLength(s.text.en) + ' chars (max ' + LIMITS.statementEn + ')');
      }
      if (s.text && typeof s.text.zh === 'string' && charLength(s.text.zh) > LIMITS.statementZh) {
        problems.push(where + ': Chinese text is ' + charLength(s.text.zh) + ' chars (max ' + LIMITS.statementZh + ')');
      }
    });

    // Every stratum needs at least 2, or no play can be drawn.
    var report = bankReport(content);
    DIM_KEYS.forEach(function (key) {
      STATEMENT_BANDS.forEach(function (band) {
        var n = report.sizes[key][band];
        if (n < PICKS_PER_STRATUM) {
          problems.push('statements: "' + key + '" has ' + n + ' ' + band + ' statement(s); a draw needs at least ' + PICKS_PER_STRATUM);
        }
      });
    });
    // Equal strata = equal chances. Strict once the bank is (over) full.
    if (!report.equal && (strict || report.total >= BANK_TARGET)) {
      problems.push('statements: every stratum (dimension x band) must have the same size, found ' +
        DIM_KEYS.map(function (key) {
          return key + ' ' + STATEMENT_BANDS.map(function (b) { return report.sizes[key][b]; }).join('/');
        }).join(', ') + ' (mild/medium/extreme)');
    }

    // --- types ---
    var types = Array.isArray(content.types) ? content.types : [];
    if (types.length !== TYPE_IDS.length) {
      problems.push('types: expected ' + TYPE_IDS.length + ', found ' + types.length);
    }
    var seenTypes = {};
    types.forEach(function (t, i) {
      if (!isObject(t)) { problems.push('types[' + i + ']: not an object'); return; }
      var where = 'types[' + i + '] (' + t.id + ')';
      if (TYPE_IDS.indexOf(t.id) === -1) problems.push(where + ': unknown type id "' + t.id + '"');
      if (seenTypes[t.id]) problems.push(where + ': duplicate type id "' + t.id + '"');
      seenTypes[t.id] = true;

      if (typeof t.code !== 'string' || !/^[A-Z0-9-]{3,7}$/.test(t.code)) {
        problems.push(where + ': code must be 3-7 chars of A-Z, 0-9 or "-", found "' + t.code + '"');
      }
      if (typeof t.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(t.color)) {
        problems.push(where + ': color must be a 6-digit hex like "#F2C14E"');
      }
      ['name', 'tagline', 'roast', 'superpower', 'weakness', 'aiSays'].forEach(function (field) {
        checkPair(problems, t, field, where);
      });
      if (t.tagline && typeof t.tagline.en === 'string' && charLength(t.tagline.en) > LIMITS.taglineEn) {
        problems.push(where + ': English tagline is ' + charLength(t.tagline.en) + ' chars (max ' + LIMITS.taglineEn + ')');
      }
      if (t.tagline && typeof t.tagline.zh === 'string' && charLength(t.tagline.zh) > LIMITS.taglineZh) {
        problems.push(where + ': Chinese tagline is ' + charLength(t.tagline.zh) + ' chars (max ' + LIMITS.taglineZh + ')');
      }
    });
    TYPE_IDS.forEach(function (id) {
      if (!seenTypes[id]) problems.push('types: missing type id "' + id + '"');
    });

    // --- result-screen copy (reads, why, signs, bestWith, clashWith) ---
    return problems.concat(validateProfiles(content));
  }

  /*
   * Answers as the app keeps them: { s01: 'yes', s11: 'no', s23: 'unsure' }.
   *   'yes'    = Guilty: the only answer score() ever sees (via admittedIds).
   *   'no'     = Never.
   *   'unsure' = Not sure: the player did not understand the statement or
   *              cannot remember. It counts exactly like 'no': no points, no
   *              purity lost, never used as evidence. It is kept separately
   *              only so going back shows it, and so the result screen can
   *              say how many there were.
   */
  var ANSWER_VALUES = ['yes', 'no', 'unsure'];

  // From this many "not sure" answers, the result screen adds one line that
  // the purity is probably flattering. Not a scoring rule: the score is the same.
  var UNSURE_MANY = 8;

  /*
   * cleanAnswers(saved, content [, drawnIds]) -> only the answers that name a
   * real statement and use a known value. With drawnIds, also only the
   * statements this play drew (an answer to a statement that is not in the
   * play is dropped). Used on whatever sessionStorage hands back, which may
   * be from an older version of the page, hand-edited, or not an object.
   */
  function cleanAnswers(saved, content, drawnIds) {
    var out = {};
    if (!isObject(saved)) return out;
    var validIds = {};
    (content.statements || []).forEach(function (s) { if (s && s.id) validIds[s.id] = true; });
    if (drawnIds) {
      var inDraw = {};
      Array.from(drawnIds).forEach(function (id) { if (validIds[id] === true) inDraw[id] = true; });
      validIds = inDraw;
    }
    Object.keys(saved).forEach(function (id) {
      if (validIds[id] === true && ANSWER_VALUES.indexOf(saved[id]) !== -1) out[id] = saved[id];
    });
    return out;
  }

  /*
   * resumePlay(saved, linkSeed, content [, newSeed]) -> the play the page
   * should show when it loads:
   *   { seed, drawn, answers, screen, index, seedFromLink }
   *
   *   saved     what sessionStorage handed back for this tab (anything: it may
   *             be missing, junk, or from an older version of the page)
   *   linkSeed  the ?seed= in the address (anything; invalid = none)
   *   newSeed   only for tests; the app lets this call makeSeed()
   *
   * Which seed wins:
   *   1. a valid link seed that differs from the saved one: the person opened
   *      someone's link, so they get THAT draw, fresh (the saved answers
   *      belong to another set of statements and are dropped);
   *   2. otherwise a valid saved seed: carry on (a refresh, a language switch,
   *      or a link to the play already under way);
   *   3. otherwise a brand-new seed.
   * seedFromLink is true when the draw came from a link (and stays true across
   * refreshes of that play), so the landing page can say the statements are
   * the same as the sender's.
   *
   * Saved answers are limited to this play's drawn statements, the position
   * must be a real one, and a saved "result" with unanswered statements goes
   * back to the first unanswered one instead.
   */
  function resumePlay(saved, linkSeed, content, newSeed) {
    var fromLink = normalizeSeed(linkSeed);
    var savedSeed = isObject(saved) ? normalizeSeed(saved.seed) : null;

    var seed, keep, seedFromLink;
    if (fromLink && fromLink !== savedSeed) {
      seed = fromLink; keep = false; seedFromLink = true;
    } else if (savedSeed) {
      seed = savedSeed; keep = true; seedFromLink = saved.seedFromLink === true;
    } else {
      seed = typeof newSeed === 'string' && normalizeSeed(newSeed) ? normalizeSeed(newSeed) : makeSeed();
      keep = false; seedFromLink = false;
    }

    var drawn = drawStatements(content, seed);
    var play = { seed: seed, drawn: drawn, answers: {}, screen: 'landing', index: 0, seedFromLink: seedFromLink };
    if (!keep) return play;

    play.answers = cleanAnswers(saved.answers, content, drawn);
    if (['landing', 'question', 'result'].indexOf(saved.screen) !== -1) play.screen = saved.screen;
    if (typeof saved.index === 'number' && saved.index % 1 === 0 && saved.index >= 0 && saved.index < drawn.length) {
      play.index = saved.index;
    }
    if (play.screen === 'result') {
      var firstOpen = drawn.findIndex(function (id) { return !play.answers[id]; });
      if (firstOpen !== -1) { play.screen = 'question'; play.index = firstOpen; }
    }
    return play;
  }

  // The ids answered "yes" (Guilty): exactly what score() should be given.
  // "unsure" and "no" are left out on purpose.
  function admittedIds(answers) {
    return Object.keys(answers || {}).filter(function (id) { return answers[id] === 'yes'; });
  }

  // How many statements were answered "not sure".
  function unsureCount(answers) {
    return Object.keys(answers || {}).filter(function (id) { return answers[id] === 'unsure'; }).length;
  }

  /*
   * The "all types" screen: which order the 14 cards appear in.
   *   sections: the ten section types, two per section in section order,
   *             light before deep (so on a phone each row is one section)
   *   special:  the four rule types, with the hidden one last
   * Display only: nothing here changes how a result is decided.
   */
  function galleryOrder() {
    var sections = [];
    DIM_KEYS.forEach(function (key) { sections.push(key + '_lite', key + '_deep'); });
    return { sections: sections, special: ['untouched', 'balanced', 'merged', 'soulmate'] };
  }

  /*
   * The hidden type's card on the "all types" screen stays locked until the
   * player has earned it on this device. One flag in localStorage remembers
   * that ('1' under HIDDEN_UNLOCK_KEY); no answers are kept there.
   * Storage is passed in (window.localStorage in the page, a fake in tests).
   * Reading or writing it can throw (private mode, blocked storage), so both
   * helpers swallow errors: locked is the safe answer.
   */
  var HIDDEN_UNLOCK_KEY = 'apt-hidden-unlocked-v1';

  // True when a result counts as having met the hidden type: it is the
  // result, or (for the merged type) its secondary, which the card shows as
  // "Also PLUS-1". Both mean the hidden rule was met.
  function earnedHidden(result) {
    return Boolean(result) && (result.typeId === 'soulmate' || result.secondaryTypeId === 'soulmate');
  }
  function hiddenUnlocked(storage) {
    try { return Boolean(storage) && storage.getItem(HIDDEN_UNLOCK_KEY) === '1'; } catch (e) { return false; }
  }
  // Returns true when the flag was written.
  function rememberHiddenUnlocked(storage) {
    try {
      if (!storage) return false;
      storage.setItem(HIDDEN_UNLOCK_KEY, '1');
      return true;
    } catch (e) { return false; }
  }

  var api = {
    DIM_KEYS: DIM_KEYS,
    TYPE_IDS: TYPE_IDS,
    UI_KEYS: UI_KEYS,
    BANDS: BANDS,
    STATEMENT_BANDS: STATEMENT_BANDS,
    BAND_WEIGHTS: BAND_WEIGHTS,
    LIMITS: LIMITS,
    RULES: RULES,
    DRAW_SIZE: DRAW_SIZE,
    PICKS_PER_STRATUM: PICKS_PER_STRATUM,
    BANK_PER_STRATUM: BANK_PER_STRATUM,
    BANK_TARGET: BANK_TARGET,
    SEED_LENGTH: SEED_LENGTH,
    // a play
    makeSeed: makeSeed,
    normalizeSeed: normalizeSeed,
    drawStatements: drawStatements,
    score: score,
    statementWeight: statementWeight,
    tieLotOrder: tieLotOrder,
    admitByCounts: admitByCounts,
    strataOf: strataOf,
    SEED_ALPHABET: SEED_ALPHABET,
    // building blocks, exported for tools/fairness.js and the tests
    hash128: hash128,
    makeGenerator: makeGenerator,
    randomBelow: randomBelow,
    // content
    validateContent: validateContent,
    validateProfiles: validateProfiles,
    bankReport: bankReport,
    questionOrder: questionOrder, // deprecated, see above
    // answers
    ANSWER_VALUES: ANSWER_VALUES,
    UNSURE_MANY: UNSURE_MANY,
    cleanAnswers: cleanAnswers,
    resumePlay: resumePlay,
    admittedIds: admittedIds,
    unsureCount: unsureCount,
    // the "all types" screen
    galleryOrder: galleryOrder,
    HIDDEN_UNLOCK_KEY: HIDDEN_UNLOCK_KEY,
    earnedHidden: earnedHidden,
    hiddenUnlocked: hiddenUnlocked,
    rememberHiddenUnlocked: rememberHiddenUnlocked
  };

  root.APT_SCORING = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
