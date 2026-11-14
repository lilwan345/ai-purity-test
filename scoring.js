/*
 * scoring.js — pure functions, no DOM.
 *
 * Works two ways:
 *   - in the browser as a classic <script>: sets globalThis.APT_SCORING
 *   - in Node (tests): require('../scoring.js') returns the same object
 *
 * The rules here are the product spec. SCORING.md explains them in plain
 * English and Chinese; tools/simulate.js checks them against personas and
 * 200,000 simulated players. If you change a rule, change the tests and
 * SCORING.md too.
 */
(function (root) {
  'use strict';

  // Dimension keys, in display order. content.js must use exactly these.
  var DIM_KEYS = ['school', 'work', 'heart', 'brain', 'bond'];

  // Last resort when two dimensions are tied on everything else (points, most
  // extreme statement, count): the one earlier in this list wins. This only
  // decides exact mirror-image pairs (say levels 1-5 in School and in Heart),
  // and the result screen says so and shows the other one as the secondary
  // type. Three or more sections tied at the top are never settled this way:
  // that is the balanced type (see RULES.balancedTieMin).
  var TIE_ORDER = ['bond', 'heart', 'brain', 'work', 'school'];

  // Every type id the scoring can return. content.js must define all 14.
  var TYPE_IDS = [
    'untouched', 'merged', 'balanced', 'soulmate',
    'school_lite', 'school_deep', 'work_lite', 'work_deep',
    'heart_lite', 'heart_deep', 'brain_lite', 'brain_deep',
    'bond_lite', 'bond_deep'
  ];

  // Interface text keys that app.js reads. validateContent checks they all exist.
  var UI_KEYS = [
    'appName', 'intro', 'meta', 'start', 'fromFriend', 'typesTeaser',
    'langSwitch', 'langSwitchLabel',
    'progress', 'liveLabel', 'back', 'answerYes', 'answerNo', 'answerUnsure', 'keysHint',
    'resultHeading', 'previewBadge', 'cardTicks', 'cardNote', 'barsLabel', 'barAria',
    'superpower', 'weakness', 'aiSays',
    'saveImage', 'copyLink', 'share', 'startOver',
    'imageSaved', 'imageFailed', 'saveHint', 'close', 'linkCopied', 'copyFailed', 'shareText',
    'footer',
    // result screen: card additions, "why you got this", the other sections
    'cardMatch', 'cardAlso',
    'whyTitle', 'evidenceLead', 'evidenceLeadOnly', 'evidenceLeadSome', 'evidenceLeadHidden',
    'evidenceLeadSpread', 'evidenceLeadSample',
    'evidenceNone', 'exhibitLabel', 'exhibitMeta', 'levelMild', 'levelMedium', 'levelExtreme',
    'matchHeading', 'matchDim', 'matchDimAlone', 'matchTieTop', 'matchTieCount', 'matchTieOrder',
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

  // The four depth bands. Each dimension has one sentence per band in content.js.
  var BANDS = ['none', 'low', 'mid', 'high'];

  // Length limits from the brief. Chinese is counted in characters.
  var LIMITS = {
    statementEn: 90, statementZh: 34,
    taglineEn: 60, taglineZh: 24
  };

  var TOTAL_STATEMENTS = 50;
  var PER_DIM = 10;
  var SOULMATE_FLAGS = 3;
  var SIGNS_PER_TYPE = 3;

  /*
   * RULES: every number the type decision uses, in one place.
   * They were tuned with tools/simulate.js (personas + 200,000 random
   * players); SCORING.md has the reasoning and the resulting type shares.
   */
  var RULES = {
    // A statement's level is its position inside its dimension (1 = mildest,
    // 10 = most extreme). Its weight: levels 1-4 count 1 point, 5-7 count 2,
    // 8-10 count 3. A full dimension is therefore worth 4 + 6 + 9 = 19 points.
    mediumFrom: 5,   // first level that weighs 2
    extremeFrom: 8,  // first level that weighs 3

    // depth = 100 * points / 19, rounded. Bands: 0 = none, below midFrom =
    // low, below highFrom = mid, otherwise high. With 19 points per dimension:
    //   low  = 1-4 points  (at most the four mild statements)
    //   mid  = 5-10 points (into the medium statements)
    //   high = 11+ points  (impossible without at least one extreme statement,
    //                       because levels 1-7 together are only worth 10)
    // A dimension type is "deep" when its dimension is in the high band, or
    // when two or more of its extreme statements were admitted (deepFromExtremes).
    midFrom: 25,
    highFrom: 55,
    // ...or when at least this many of the section's extreme statements
    // (levels 8-10) were admitted, whatever the band.
    deepFromExtremes: 2,

    // merged: at least this many of the 50 statements admitted (purity 16 or
    // lower), OR every one of the five dimensions in the high band. Someone
    // who reached the heavy end of all five is not "a little of everything".
    mergedMinTotal: 42,

    // untouched: at most this many statements admitted, all of them mild
    // (levels 1-4). One medium or extreme confession is already a direction.
    untouchedMaxTotal: 4,

    // balanced, way 1: at least this many admitted, every dimension touched,
    // and the deepest and shallowest dimensions at most this many depth points
    // apart (22 depth points = 4 weighted points, since one point is about 5.3).
    balancedMinTotal: 10,
    balancedMaxSpread: 22,
    // balanced, way 2: this many dimensions (or more) share the top points
    // exactly. No single section leads, so no section type would be honest.
    balancedTieMin: 3,

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

  // Weight of one statement, from its level inside its dimension.
  function weightForLevel(level, rules) {
    if (level >= rules.extremeFrom) return 3;
    if (level >= rules.mediumFrom) return 2;
    return 1;
  }

  // Band name for a depth from 0 to 100.
  function bandForDepth(depth, rules) {
    if (depth <= 0) return 'none';
    if (depth < rules.midFrom) return 'low';
    if (depth < rules.highFrom) return 'mid';
    return 'high';
  }

  // Sorts admitted statements most extreme first. Within one level, the
  // dimension that ranks higher for this player goes first (rankIndex).
  function byExtremeFirst(rankIndex) {
    return function (a, b) {
      if (b.level !== a.level) return b.level - a.level;
      return (rankIndex[a.dim] || 0) - (rankIndex[b.dim] || 0);
    };
  }

  /**
   * score(answers, content [, rules]) -> {
   *   total, purity, perDim,           counts, as before
   *   points:  { dim: weighted points }
   *   depth:   { dim: 0..100 }          points as a share of the dimension's maximum
   *   band:    { dim: 'none'|'low'|'mid'|'high' }
   *   dominantDim                       the dimension that ranks first (null if nothing admitted)
   *   typeId, secondaryTypeId (or null), evidenceIds (0-3 ids), match (0..100)
   *
   *   Extras so the result screen can explain itself without redoing the rules:
   *   runnerUpDim                       the dimension that ranks second (null if only one has points)
   *   tiedDims                          dimensions sharing the top points, in rank order ([] if no tie)
   *   tieBreak                          how the lead beat an equal runner-up: 'top' (heavier top
   *                                     statement), 'count' (more statements), 'order' (TIE_ORDER), or null
   *   matchCap                          the cap that lowered `match` (60 or 80), or null
   * }
   *
   * answers: an array or a Set of the statement ids answered "Guilty".
   * "Not sure" answers are never passed in (see admittedIds below), so they
   * count exactly like "Never".
   * Unknown ids and duplicates are ignored. `rules` is optional and only
   * there so tools/simulate.js can try other thresholds; the app never passes it.
   * Pure and deterministic: same answers, same result.
   */
  function score(answers, content, rules) {
    rules = rules || RULES;
    var admitted = new Set(Array.from(answers || []));

    // --- 1. Per-dimension numbers ---------------------------------------
    var perDim = {}, points = {}, maxPoints = {}, topLevel = {}, admittedIn = {};
    DIM_KEYS.forEach(function (key) {
      perDim[key] = 0; points[key] = 0; maxPoints[key] = 0; topLevel[key] = 0; admittedIn[key] = [];
    });

    var total = 0;
    var flagged = [];          // every soulmate-flagged statement, admitted or not
    var allAdmitted = [];      // { id, dim, level } for every admitted statement
    var levelCounter = {};     // running position inside each dimension

    content.statements.forEach(function (s) {
      if (!s || !Object.prototype.hasOwnProperty.call(perDim, s.dim)) return;
      levelCounter[s.dim] = (levelCounter[s.dim] || 0) + 1;
      var level = levelCounter[s.dim];
      var weight = weightForLevel(level, rules);
      maxPoints[s.dim] += weight;

      var item = { id: s.id, dim: s.dim, level: level };
      var isAdmitted = admitted.has(s.id);
      if (s.flag === 'soulmate') flagged.push({ item: item, admitted: isAdmitted });
      if (!isAdmitted) return;

      total += 1;
      perDim[s.dim] += 1;
      points[s.dim] += weight;
      if (level > topLevel[s.dim]) topLevel[s.dim] = level;
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
    // Deepest first; ties go to the dimension with the more extreme
    // statement, then to more statements, then to TIE_ORDER.
    var ranked = DIM_KEYS.slice().sort(function (a, b) {
      if (depthExact[b] !== depthExact[a]) return depthExact[b] - depthExact[a];
      if (topLevel[b] !== topLevel[a]) return topLevel[b] - topLevel[a];
      if (perDim[b] !== perDim[a]) return perDim[b] - perDim[a];
      return TIE_ORDER.indexOf(a) - TIE_ORDER.indexOf(b);
    });
    var rankIndex = {};
    ranked.forEach(function (key, i) { rankIndex[key] = i; });
    var dominant = ranked[0];
    var runnerUp = ranked[1];

    // Sections that share the top points exactly (only counts when there are
    // points at all), and, for two of them, which tie-break picked the lead.
    var tiedDims = ranked.filter(function (key) { return points[key] > 0 && points[key] === points[dominant]; });
    if (tiedDims.length < 2) tiedDims = [];
    var tieBreak = null;
    if (tiedDims.length >= 2) {
      if (topLevel[dominant] !== topLevel[runnerUp]) tieBreak = 'top';
      else if (perDim[dominant] !== perDim[runnerUp]) tieBreak = 'count';
      else tieBreak = 'order';
    }

    // The lite or deep type of one dimension. Deep means either the section is
    // in the high band, or the player admitted at least two of its three most
    // extreme statements: two of those already describe the "deep" person, even
    // if little else in the section was admitted.
    function dimType(key) {
      var extremes = admittedIn[key].filter(function (it) { return it.level >= rules.extremeFrom; }).length;
      var isDeep = depth[key] >= rules.highFrom || extremes >= rules.deepFromExtremes;
      return key + (isDeep ? '_deep' : '_lite');
    }

    // --- 3. The type: the first rule that matches wins --------------------
    var allFlagsAdmitted = flagged.length > 0 && flagged.every(function (f) { return f.admitted; });
    var highestAdmittedLevel = allAdmitted.reduce(function (m, it) { return Math.max(m, it.level); }, 0);
    var depths = DIM_KEYS.map(function (key) { return depthExact[key]; });
    var spread = Math.max.apply(null, depths) - Math.min.apply(null, depths);
    var everyDimTouched = DIM_KEYS.every(function (key) { return perDim[key] > 0; });
    var everyDimHigh = DIM_KEYS.every(function (key) { return band[key] === 'high'; });

    var isUntouched = total <= rules.untouchedMaxTotal && highestAdmittedLevel < rules.mediumFrom;
    // Balanced has two ways in: an even spread over all five sections, or a
    // three-way (or bigger) tie for the top, where no section can claim you.
    var isBalanced = (total >= rules.balancedMinTotal && everyDimTouched && spread <= rules.balancedMaxSpread) ||
      tiedDims.length >= rules.balancedTieMin;

    // The type the player gets when the soulmate rule is skipped. Used as the
    // soulmate's secondary type, so it lives in its own function.
    function typeWithoutSoulmate() {
      if (isUntouched) return 'untouched';
      if (isBalanced) return 'balanced';
      return dimType(dominant);
    }

    var typeId;
    if (total >= rules.mergedMinTotal || everyDimHigh) typeId = 'merged';
    else if (allFlagsAdmitted) typeId = 'soulmate';
    else typeId = typeWithoutSoulmate();

    // --- 4. Secondary type (a runner-up leaning, or null) -----------------
    var secondaryTypeId = null;
    if (typeId === 'merged') {
      secondaryTypeId = allFlagsAdmitted ? 'soulmate' : null;
    } else if (typeId === 'soulmate') {
      secondaryTypeId = typeWithoutSoulmate();
      if (secondaryTypeId === 'untouched') secondaryTypeId = null;
    } else if (typeId !== 'untouched' && typeId !== 'balanced') {
      // A dimension type: the runner-up counts when it is nearly as deep.
      // (The tiny 1e-9 keeps an exact 3-out-of-4 ratio from losing to
      // floating-point rounding: 6 points vs 8 points must count as close.)
      if (depthExact[runnerUp] > 0 && depthExact[runnerUp] + 1e-9 >= rules.closeRatio * depthExact[dominant]) {
        secondaryTypeId = dimType(runnerUp);
      }
    }

    // --- 5. Evidence: the admitted statements that best justify the type --
    var evidence;
    if (typeId === 'soulmate') {
      evidence = flagged.map(function (f) { return f.item; });
    } else if (typeId === 'merged' || typeId === 'balanced') {
      // The most extreme statement of each dimension, then the top few of those.
      evidence = DIM_KEYS.map(function (key) {
        return admittedIn[key].reduce(function (best, it) { return !best || it.level > best.level ? it : best; }, null);
      }).filter(Boolean);
    } else if (typeId === 'untouched') {
      evidence = allAdmitted.slice();
    } else {
      evidence = admittedIn[dominant].slice();
    }
    evidence.sort(byExtremeFirst(rankIndex));
    var evidenceIds = evidence.slice(0, rules.evidenceMax).map(function (it) { return it.id; });

    // --- 6. Match: how strongly the answers fit the type (0..100) ---------
    var match;
    var matchCap = null;
    if (typeId === 'untouched') {
      match = 100 - 2 * total;                 // same as purity: the less admitted, the better the fit
    } else if (typeId === 'merged') {
      // How deep the player went, averaged over all five sections.
      match = Math.round(depths.reduce(function (sum, d) { return sum + d; }, 0) / depths.length);
    } else if (typeId === 'soulmate') {
      match = 100;                             // all three conditions met; no partial credit
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
      var lead = points[dominant];
      var next = points[runnerUp];
      match = Math.round(100 * lead / (lead + next));
      // One or two answers cannot prove much, so the number is capped.
      var cap = perDim[dominant] === 1 ? rules.matchCapOne : (perDim[dominant] === 2 ? rules.matchCapTwo : null);
      if (cap !== null && match > cap) {
        match = cap;
        matchCap = cap;
      }
    }

    return {
      total: total,
      purity: 100 - 2 * total,
      perDim: perDim,
      points: points,
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
      matchCap: matchCap
    };
  }

  /**
   * questionOrder(content) -> the statements in the order the quiz asks them.
   *
   * content.js lists statements section by section, mildest first. The quiz
   * deals them out in rounds instead: round 1 is the first statement of every
   * dimension, round 2 the second of every dimension, and so on. Topics mix,
   * and the whole quiz gets spicier as it goes. Inside a round, dimensions
   * follow the order of content.dimensions.
   *
   * Statements with an unknown dim are left out (validateContent reports them).
   * If a dimension has fewer statements than the others, its later rounds
   * simply skip it.
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

  // A list entry must be a plain object; a stray null or string is reported, not thrown.
  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
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
   * validateContent(content) -> array of human-readable problems ([] = all good).
   * Run it after editing content.js (the app also logs problems to the console).
   */
  function validateContent(content) {
    var problems = [];
    if (!content || typeof content !== 'object') {
      return ['content is missing (is content.js loaded before scoring.js runs?)'];
    }

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
    if (statements.length !== TOTAL_STATEMENTS) {
      problems.push('statements: expected ' + TOTAL_STATEMENTS + ', found ' + statements.length);
    }
    var seenIds = {};
    var dimCounts = {};
    DIM_KEYS.forEach(function (key) { dimCounts[key] = 0; });
    var soulmateCount = 0;
    var lastDimIndex = 0;

    statements.forEach(function (s, i) {
      if (!isObject(s)) { problems.push('statements[' + i + ']: not an object'); return; }
      var where = 'statements[' + i + '] (' + s.id + ')';
      var expectedId = 's' + String(i + 1).padStart(2, '0');

      if (seenIds[s.id]) problems.push(where + ': duplicate id "' + s.id + '"');
      seenIds[s.id] = true;
      if (s.id !== expectedId) problems.push(where + ': id should be "' + expectedId + '"');

      var dimIndex = DIM_KEYS.indexOf(s.dim);
      if (dimIndex === -1) {
        problems.push(where + ': unknown dim "' + s.dim + '"');
      } else {
        dimCounts[s.dim] += 1;
        if (dimIndex < lastDimIndex) {
          problems.push(where + ': statements must be grouped by dimension in order');
        }
        lastDimIndex = dimIndex;
      }

      checkPair(problems, s, 'text', where);
      if (s.text && typeof s.text.en === 'string' && charLength(s.text.en) > LIMITS.statementEn) {
        problems.push(where + ': English text is ' + charLength(s.text.en) + ' chars (max ' + LIMITS.statementEn + ')');
      }
      if (s.text && typeof s.text.zh === 'string' && charLength(s.text.zh) > LIMITS.statementZh) {
        problems.push(where + ': Chinese text is ' + charLength(s.text.zh) + ' chars (max ' + LIMITS.statementZh + ')');
      }

      if (s.flag !== undefined) {
        if (s.flag === 'soulmate') soulmateCount += 1;
        else problems.push(where + ': unknown flag "' + s.flag + '"');
      }
    });

    DIM_KEYS.forEach(function (key) {
      if (statements.length && dimCounts[key] !== PER_DIM) {
        problems.push('statements: "' + key + '" has ' + dimCounts[key] + ' statements (need ' + PER_DIM + ')');
      }
    });
    if (soulmateCount !== SOULMATE_FLAGS) {
      problems.push('statements: ' + soulmateCount + ' carry flag "soulmate" (need exactly ' + SOULMATE_FLAGS + ')');
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

  // Keeps only answers that name a real statement and use a known value.
  // Used on whatever sessionStorage hands back, which may be from an older
  // version of the page (v2 saves only had 'yes' / 'no', which still pass),
  // hand-edited, or not an object at all.
  function cleanAnswers(saved, content) {
    var out = {};
    if (!isObject(saved)) return out;
    var validIds = {};
    (content.statements || []).forEach(function (s) { if (s && s.id) validIds[s.id] = true; });
    Object.keys(saved).forEach(function (id) {
      if (validIds[id] === true && ANSWER_VALUES.indexOf(saved[id]) !== -1) out[id] = saved[id];
    });
    return out;
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
  // "Also PLUS-1". Both mean all three hidden statements were admitted.
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
    TIE_ORDER: TIE_ORDER,
    TYPE_IDS: TYPE_IDS,
    UI_KEYS: UI_KEYS,
    BANDS: BANDS,
    LIMITS: LIMITS,
    RULES: RULES,
    score: score,
    questionOrder: questionOrder,
    validateContent: validateContent,
    validateProfiles: validateProfiles,
    ANSWER_VALUES: ANSWER_VALUES,
    UNSURE_MANY: UNSURE_MANY,
    cleanAnswers: cleanAnswers,
    admittedIds: admittedIds,
    unsureCount: unsureCount,
    galleryOrder: galleryOrder,
    HIDDEN_UNLOCK_KEY: HIDDEN_UNLOCK_KEY,
    earnedHidden: earnedHidden,
    hiddenUnlocked: hiddenUnlocked,
    rememberHiddenUnlocked: rememberHiddenUnlocked
  };

  root.APT_SCORING = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
