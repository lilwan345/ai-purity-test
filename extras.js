/*
 * extras.js — pure helpers for the parts of a play that are not scoring:
 *   1. comparing two players on the same 30 statements (challenge links)
 *   2. the AI's occasional remark while answering
 *   3. the collection of types reached on this device
 *
 * Works two ways, like scoring.js:
 *   - in the browser as a classic <script> after scoring.js: sets
 *     globalThis.APT_EXTRAS
 *   - in Node (tests): require('../extras.js') returns the same object
 *
 * Nothing here changes what a seed draws or how a result is judged: the
 * comparison calls scoring.score() on each player's answers, and the remarks
 * use their own generator (a different label), so the draw's generator is
 * never touched or advanced.
 */
(function (root) {
  'use strict';

  var scoring = root.APT_SCORING;
  if (!scoring && typeof require === 'function') scoring = require('./scoring.js');

  // ======================================================================
  // 1. ANSWER CODES AND THE COMPARISON
  //
  // A challenge link carries one player's answers for a play as 8 characters
  // of 0-9 and a-z (10 when the play needed a play-off):
  //   - answers (6): bit i is 1 when the i-th statement of the play (in
  //     asking order) was answered Guilty. "Not sure" and "Never" are both 0,
  //     so the code holds exactly what score() sees. 30 bits fit in 6 base-36
  //     characters (36^6 > 2^30).
  //   - play-off (2, only when there was one): how many play-off rounds were
  //     played (1-3) and which of their statements were answered Guilty, as
  //     one number, played x 64 + bits, so the friend's browser settles the
  //     same tie the same way. Codes without it (all codes made before the
  //     play-off existed) stay valid.
  //   - check (2): made from the seed, the 30 drawn ids and everything before
  //     it. A typo, a code pasted onto another seed, or a link from before the
  //     statement bank changed (same seed, other statements) fails the check,
  //     and the page falls back to its normal behaviour.
  // The check stops accidents, not people: anyone who reads this file can
  // make a valid code. That is fine, because the code only says which
  // statements were admitted; every type and number is recomputed from it.
  // ======================================================================
  var CODE_PATTERN = /^(?:[0-9a-z]{8}|[0-9a-z]{10})$/;
  var ANSWER_PART = 6;
  var PLAYOFF_PART = 2;

  function checkPart(seed, drawnIds, answerPart) {
    var h = scoring.hash128('apt-vs-v1|' + seed + '|' + drawnIds.join(',') + '|' + answerPart);
    return (h[0] % 1296).toString(36).padStart(2, '0');
  }

  function validDraw(seed, drawnIds) {
    return scoring.normalizeSeed(seed) === seed && Array.isArray(drawnIds) &&
      drawnIds.length > 0 && drawnIds.length <= 30;
  }

  // The play-off as a number: rounds played (from the first, both statements
  // answered) x 64 + one bit per play-off statement answered Guilty.
  function playoffNumber(playoff) {
    if (!playoff || !Array.isArray(playoff.rounds)) return 0;
    var answers = playoff.answers || {};
    var played = 0;
    var bits = 0;
    for (var i = 0; i < playoff.rounds.length && i < 3; i++) {
      var ids = playoff.rounds[i].ids;
      if (!ids.every(function (id) { return scoring.ANSWER_VALUES.indexOf(answers[id]) !== -1; })) break;
      played = i + 1;
      ids.forEach(function (id, k) { if (answers[id] === 'yes') bits += Math.pow(2, 2 * i + k); });
    }
    return played ? played * 64 + bits : 0;
  }

  /*
   * encodeAnswers(seed, drawnIds, admittedIds [, playoff]) -> "0k3x9qa7"
   * (8 characters, or 10 with a play-off), or null when the seed or the draw
   * is not usable. admittedIds: array or Set of the ids answered Guilty; ids
   * outside the draw are ignored. playoff: { rounds (result.playoff.rounds),
   * answers ({ id: 'yes' | 'no' | 'unsure' }) }, or nothing.
   */
  function encodeAnswers(seed, drawnIds, admittedIds, playoff) {
    if (!validDraw(seed, drawnIds)) return null;
    var yes = new Set(Array.from(admittedIds || []));
    var bits = 0;
    drawnIds.forEach(function (id, i) { if (yes.has(id)) bits += Math.pow(2, i); });
    var answerPart = bits.toString(36).padStart(ANSWER_PART, '0');
    var extra = playoffNumber(playoff);
    if (extra) answerPart += extra.toString(36).padStart(PLAYOFF_PART, '0');
    return answerPart + checkPart(seed, drawnIds, answerPart);
  }

  /*
   * decodeAnswerSet(code, seed, drawnIds [, content]) -> { admitted, playoff }
   * or null. admitted: the Guilty ids of the 30, in asking order. playoff:
   * { id: 'yes' | 'no' } for the play-off statements that were played ({}
   * when none). A code with a play-off part is only valid when this play
   * really ends in a tie for the lot and the rounds it names exist; content
   * is needed to check that (without it the play-off part is ignored).
   * Rejected: wrong length, other characters, a number too large, a failed
   * check. Upper case is accepted (a link typed by hand); nothing else is.
   */
  function decodeAnswerSet(code, seed, drawnIds, content) {
    if (typeof code !== 'string' || !validDraw(seed, drawnIds)) return null;
    var c = code.trim().toLowerCase();
    if (!CODE_PATTERN.test(c)) return null;
    var body = c.slice(0, c.length - 2);
    if (c.slice(-2) !== checkPart(seed, drawnIds, body)) return null;
    var bits = parseInt(body.slice(0, ANSWER_PART), 36);
    if (!(bits >= 0) || bits >= Math.pow(2, drawnIds.length)) return null;
    var admitted = [];
    drawnIds.forEach(function (id, i) {
      if (Math.floor(bits / Math.pow(2, i)) % 2 === 1) admitted.push(id);
    });
    var playoff = {};
    if (body.length > ANSWER_PART && content) {
      var extra = parseInt(body.slice(ANSWER_PART), 36);
      var played = Math.floor(extra / 64);
      var pbits = extra % 64;
      if (!(played >= 1 && played <= 3) || pbits >= Math.pow(2, 2 * played)) return null;
      var base = scoring.score(admitted, content, drawnIds);
      if (base.tieBreak !== 'lot' || !base.playoff) return null;
      var rounds = base.playoff.rounds;
      if (played > rounds.length) return null;
      for (var i = 0; i < played; i++) {
        rounds[i].ids.forEach(function (id, k) {
          playoff[id] = Math.floor(pbits / Math.pow(2, 2 * i + k)) % 2 === 1 ? 'yes' : 'no';
        });
      }
    }
    return { admitted: admitted, playoff: playoff };
  }

  // decodeAnswers(code, seed, drawnIds [, content]) -> just the admitted ids
  // of the 30 (in asking order), or null.
  function decodeAnswers(code, seed, drawnIds, content) {
    var set = decodeAnswerSet(code, seed, drawnIds, content);
    return set ? set.admitted : null;
  }

  /*
   * readCompareLink({ seed, vs, re }, content) -> what a link asks for:
   *   null                                    not a comparison link, or a broken one
   *   { seed, drawn, vs, vsPlayoff, re: null }  a challenge: play the same 30, then compare
   *   { seed, drawn, vs, vsPlayoff, re, rePlayoff }  a reply: show the comparison straight away
   * vs = the challenger's admitted ids, re = those of the friend who played
   * the challenge and sent it back; the *Playoff maps hold their play-off
   * answers ({} when there was none). Every value that is present must be
   * valid, or the whole thing is ignored (the page then treats the link as
   * an ordinary one). Never throws.
   */
  function readCompareLink(query, content) {
    try {
      var q = query || {};
      if (q.vs === null || q.vs === undefined) return null;
      var seed = scoring.normalizeSeed(q.seed);
      if (!seed) return null;
      var drawn = scoring.drawStatements(content, seed);
      var vs = decodeAnswerSet(q.vs, seed, drawn, content);
      if (!vs) return null;
      var re = null;
      if (q.re !== null && q.re !== undefined) {
        re = decodeAnswerSet(q.re, seed, drawn, content);
        if (!re) return null;
      }
      return {
        seed: seed, drawn: drawn, vs: vs.admitted, vsPlayoff: vs.playoff,
        re: re ? re.admitted : null, rePlayoff: re ? re.playoff : null
      };
    } catch (e) {
      return null;
    }
  }

  // The ids, heaviest first; equal weights keep the asking order.
  function heaviestFirst(ids, byId, drawnIds) {
    var order = {};
    drawnIds.forEach(function (id, i) { order[id] = i; });
    return ids.slice().sort(function (a, b) {
      return (scoring.statementWeight(byId[b]) - scoring.statementWeight(byId[a])) || (order[a] - order[b]);
    });
  }

  /*
   * comparePlays(content, drawnIds, mineIds, friendIds [, minePlayoff, friendPlayoff]) -> {
   *   mine, friend          the two scoring.score() results
   *   purer                 'mine' | 'friend' | 'tie'
   *   gap                   how many purity points apart (0 for a tie)
   *   relation              { kind, typeId } where kind is
   *                           'same'       both got the same type
   *                           'best'       your type's bestWith is theirs (line: your type's bestWithLine)
   *                           'clash'      your type's clashWith is theirs (line: your type's clashWithLine)
   *                           'theyBest'   only their type's bestWith points at yours
   *                           'theyClash'  only their type's clashWith points at yours
   *                           'none'       no pairing between the two
   *                         typeId = whose line to show ('best', 'clash'), else null
   *   both                  ids both admitted, heaviest first, at most 3
   *   onlyFriend, onlyMine  ids only one admitted, heaviest first, at most 2 each
   *   bothCount, onlyFriendCount, onlyMineCount   the full counts
   * }
   * "mine" is whoever the page calls "you". Pure: same input, same output.
   */
  var COMPARE_LIMITS = { both: 3, onlyFriend: 2, onlyMine: 2 };

  function comparePlays(content, drawnIds, mineIds, friendIds, minePlayoff, friendPlayoff) {
    var drawn = Array.from(drawnIds || []);
    var inDraw = new Set(drawn);
    var byId = {};
    (content.statements || []).forEach(function (s) { if (s && s.id) byId[s.id] = s; });
    var typesById = {};
    (content.types || []).forEach(function (t) { if (t && t.id) typesById[t.id] = t; });

    var mineSet = new Set(Array.from(mineIds || []).filter(function (id) { return inDraw.has(id); }));
    var friendSet = new Set(Array.from(friendIds || []).filter(function (id) { return inDraw.has(id); }));
    // Each side's play-off answers (if any) settle only that side's tie.
    var mine = scoring.score(Array.from(mineSet), content, drawn, null, minePlayoff || {});
    var friend = scoring.score(Array.from(friendSet), content, drawn, null, friendPlayoff || {});

    var both = [], onlyFriend = [], onlyMine = [];
    drawn.forEach(function (id) {
      if (mineSet.has(id) && friendSet.has(id)) both.push(id);
      else if (friendSet.has(id)) onlyFriend.push(id);
      else if (mineSet.has(id)) onlyMine.push(id);
    });

    var a = typesById[mine.typeId] || {};
    var b = typesById[friend.typeId] || {};
    var relation;
    if (mine.typeId === friend.typeId) relation = { kind: 'same', typeId: null };
    else if (a.bestWith === friend.typeId) relation = { kind: 'best', typeId: mine.typeId };
    else if (a.clashWith === friend.typeId) relation = { kind: 'clash', typeId: mine.typeId };
    else if (b.bestWith === mine.typeId) relation = { kind: 'theyBest', typeId: null };
    else if (b.clashWith === mine.typeId) relation = { kind: 'theyClash', typeId: null };
    else relation = { kind: 'none', typeId: null };

    var purer = mine.purity === friend.purity ? 'tie' : (mine.purity > friend.purity ? 'mine' : 'friend');
    return {
      mine: mine,
      friend: friend,
      purer: purer,
      gap: Math.abs(mine.purity - friend.purity),
      relation: relation,
      both: heaviestFirst(both, byId, drawn).slice(0, COMPARE_LIMITS.both),
      onlyFriend: heaviestFirst(onlyFriend, byId, drawn).slice(0, COMPARE_LIMITS.onlyFriend),
      onlyMine: heaviestFirst(onlyMine, byId, drawn).slice(0, COMPARE_LIMITS.onlyMine),
      bothCount: both.length,
      onlyFriendCount: onlyFriend.length,
      onlyMineCount: onlyMine.length
    };
  }

  // ======================================================================
  // 2. THE AI'S REMARKS
  //
  // While answering, a tap on Guilty sometimes gets a one-line dry remark.
  // Which statements can get one, and which line each would get, is fixed
  // per play by remarkSchedule (from the seed, with its own generator, so
  // the same link gives the same remarks). Whether one actually shows
  // depends on the answer, and on the limits in remarkFor:
  //   - only on Guilty, never on Never or Not sure (it must not read as an
  //     accusation)
  //   - never on the first 3 statements, nor on the last one (the result
  //     reveal starts right after it)
  //   - never on two statements in a row (the candidates are never next to
  //     each other, and remarkFor checks again)
  //   - at most 4 per play, each statement at most once
  // content.remarks holds the lines: general ones, one list per statement
  // band, one per section. A candidate's line comes from the general lines
  // plus those for its statement's band and section, never repeated in a play.
  // ======================================================================
  var REMARK_RULES = {
    maxPerPlay: 4,       // remarks shown in one play, at most
    skipFirst: 3,        // statements at the start that never get one
    candidates: 9,       // statements per play that may get one (if answered Guilty)
    maxEn: 40,           // length limits for the lines
    maxZh: 14
  };
  var REMARK_GROUPS = ['general', 'mild', 'medium', 'extreme'].concat(scoring.DIM_KEYS);

  function remarkList(content, group) {
    var r = content && content.remarks;
    return r && Array.isArray(r[group]) ? r[group] : [];
  }

  /*
   * remarkSchedule(content, seed, drawnIds) -> [{ index, group, n, line }]
   * sorted by index: the statements of this play that may get a remark, and
   * the line each would get (line = { en, zh }; group and n say where it
   * came from in content.remarks). Uses makeGenerator('apt-remarks-v1|' +
   * seed), never the draw's generator.
   */
  function remarkSchedule(content, seed, drawnIds) {
    var drawn = Array.from(drawnIds || []);
    var next = scoring.makeGenerator('apt-remarks-v1|' + String(seed));
    var byId = {};
    (content.statements || []).forEach(function (s) { if (s && s.id) byId[s.id] = s; });

    // Candidate places: from skipFirst to the second-to-last statement, in a
    // random order; keep each one that has no kept neighbour.
    var places = [];
    for (var i = REMARK_RULES.skipFirst; i < drawn.length - 1; i++) places.push(i);
    var taken = {};
    var picked = [];
    for (var k = places.length - 1; k >= 0 && picked.length < REMARK_RULES.candidates; k--) {
      var j = scoring.randomBelow(next, k + 1);
      var place = places[j];
      places[j] = places[k];
      places[k] = place;
      if (taken[place - 1] || taken[place + 1]) continue;
      taken[place] = true;
      picked.push(place);
    }
    picked.sort(function (a, b) { return a - b; });

    var used = {};
    return picked.map(function (index) {
      var s = byId[drawn[index]] || {};
      var pool = [];
      ['general', s.band, s.dim].forEach(function (group) {
        remarkList(content, group).forEach(function (line, n) {
          if (!used[group + ':' + n]) pool.push({ group: group, n: n, line: line });
        });
      });
      if (!pool.length) {
        remarkList(content, 'general').forEach(function (line, n) { pool.push({ group: 'general', n: n, line: line }); });
      }
      if (!pool.length) return null;
      var choice = pool[scoring.randomBelow(next, pool.length)];
      used[choice.group + ':' + choice.n] = true;
      return { index: index, group: choice.group, n: choice.n, line: choice.line };
    }).filter(Boolean);
  }

  /*
   * remarkFor(schedule, index, answer, shownIndices) -> the schedule entry to
   * show now, or null. shownIndices: the statements that already got a
   * remark in this play (the caller adds index to it when one shows).
   */
  function remarkFor(schedule, index, answer, shownIndices) {
    if (answer !== 'yes' || index < REMARK_RULES.skipFirst) return null;
    var shown = Array.from(shownIndices || []);
    if (shown.length >= REMARK_RULES.maxPerPlay) return null;
    if (shown.indexOf(index) !== -1 || shown.indexOf(index - 1) !== -1 || shown.indexOf(index + 1) !== -1) return null;
    for (var i = 0; i < (schedule || []).length; i++) {
      if (schedule[i].index === index) return schedule[i];
    }
    return null;
  }

  // validateRemarks(content) -> problems with content.remarks ([] = fine).
  function validateRemarks(content) {
    var problems = [];
    var r = content && content.remarks;
    if (!r || typeof r !== 'object') return ['remarks: missing'];
    REMARK_GROUPS.forEach(function (group) {
      if (!Array.isArray(r[group]) || !r[group].length) { problems.push('remarks.' + group + ': missing or empty'); return; }
      r[group].forEach(function (line, n) {
        var where = 'remarks.' + group + '[' + n + ']';
        if (!line || typeof line.en !== 'string' || typeof line.zh !== 'string' || !line.en.trim() || !line.zh.trim()) {
          problems.push(where + ': needs en and zh');
          return;
        }
        if (Array.from(line.en).length > REMARK_RULES.maxEn) problems.push(where + ': English is over ' + REMARK_RULES.maxEn + ' characters');
        if (Array.from(line.zh).length > REMARK_RULES.maxZh) problems.push(where + ': Chinese is over ' + REMARK_RULES.maxZh + ' characters');
        if (/[!！]/.test(line.en + line.zh)) problems.push(where + ': no exclamation marks');
        if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line.en + line.zh)) problems.push(where + ': no emoji');
      });
    });
    return problems;
  }

  // ======================================================================
  // 3. THE COLLECTION
  //
  // Which types the player has ended a play on, on this device. Like the
  // hidden type's unlock flag (scoring.hiddenUnlocked), it lives in
  // localStorage, holds no answers, and every access is wrapped: storage may
  // be missing, blocked or full, and then the collection is simply empty.
  // Stored as the type ids joined by commas; anything that is not a known
  // type id is ignored when reading.
  // ======================================================================
  var COLLECTION_KEY = 'apt-collected-v1';

  // The collected type ids, in scoring.TYPE_IDS order. Never throws.
  function collectedTypes(storage) {
    var raw = null;
    try { raw = storage ? storage.getItem(COLLECTION_KEY) : null; } catch (e) { raw = null; }
    if (typeof raw !== 'string') return [];
    var have = {};
    raw.split(',').forEach(function (id) { have[id.trim()] = true; });
    return scoring.TYPE_IDS.filter(function (id) { return have[id] === true; });
  }

  // Adds a type to the collection. Returns true when it is stored (or was
  // already), false for an unknown type or when storage refused.
  function rememberCollected(storage, typeId) {
    if (scoring.TYPE_IDS.indexOf(typeId) === -1 || !storage) return false;
    var list = collectedTypes(storage);
    if (list.indexOf(typeId) !== -1) return true;
    list.push(typeId);
    try {
      storage.setItem(COLLECTION_KEY, scoring.TYPE_IDS.filter(function (id) { return list.indexOf(id) !== -1; }).join(','));
      return true;
    } catch (e) {
      return false;
    }
  }

  // ======================================================================
  // 3b. PLAY HISTORY
  //
  // One play shows only 6 statements per section, so another draw can give
  // another type. The types of the last HISTORY_MAX finished plays are kept
  // on this device (localStorage, the type ids joined by commas, oldest
  // first; same safety as the collection), and from MIN_HISTORY plays on the
  // result says which type came up most often. Previews, peeks and reply
  // links never add to it: only finishing a play does (app.js, answer()).
  // ======================================================================
  var HISTORY_KEY = 'apt-history-v1';
  var HISTORY_MAX = 20;
  var MIN_HISTORY = 3;
  var HISTORY_SHOWN = 5;

  function playHistory(storage) {
    var raw = null;
    try { raw = storage ? storage.getItem(HISTORY_KEY) : null; } catch (e) { raw = null; }
    if (typeof raw !== 'string' || !raw) return [];
    return raw.split(',').map(function (id) { return id.trim(); })
      .filter(function (id) { return scoring.TYPE_IDS.indexOf(id) !== -1; })
      .slice(-HISTORY_MAX);
  }

  // Adds one finished play. Returns true when it was stored.
  function rememberPlay(storage, typeId) {
    if (scoring.TYPE_IDS.indexOf(typeId) === -1 || !storage) return false;
    var list = playHistory(storage).concat([typeId]).slice(-HISTORY_MAX);
    try {
      storage.setItem(HISTORY_KEY, list.join(','));
      return true;
    } catch (e) {
      return false;
    }
  }

  /*
   * historySummary(list) -> null below MIN_HISTORY plays, else
   *   { n: plays looked at (the last HISTORY_SHOWN), counts: [{ typeId, count }]
   *     most first (equal counts: the more recent first), most: [typeIds with
   *     the top count] }
   */
  function historySummary(list) {
    var all = Array.from(list || []).filter(function (id) { return scoring.TYPE_IDS.indexOf(id) !== -1; });
    if (all.length < MIN_HISTORY) return null;
    var recent = all.slice(-HISTORY_SHOWN);
    var counts = {};
    var lastSeen = {};
    recent.forEach(function (id, i) { counts[id] = (counts[id] || 0) + 1; lastSeen[id] = i; });
    var rows = Object.keys(counts).map(function (id) { return { typeId: id, count: counts[id] }; })
      .sort(function (a, b) { return (b.count - a.count) || (lastSeen[b.typeId] - lastSeen[a.typeId]); });
    var top = rows[0].count;
    return { n: recent.length, counts: rows, most: rows.filter(function (r) { return r.count === top; }).map(function (r) { return r.typeId; }) };
  }

  // How many of the kept plays ended on each type: { typeId: count }.
  function historyCounts(list) {
    var out = {};
    Array.from(list || []).forEach(function (id) { if (scoring.TYPE_IDS.indexOf(id) !== -1) out[id] = (out[id] || 0) + 1; });
    return out;
  }

  // ======================================================================
  // 3c. THE PERSONAL REASON LINES
  //
  // Two short lines under "Why you got this", built from the player's own
  // 30 answers and the same result the card shows, so they can never
  // disagree with it:
  //   1. a contrast in plain numbers (how much of the lead section against
  //      the rest; for the four special results, what fits that result)
  //   2. a counter-proof: a statement they did NOT admit that marks the edge
  //      of the result, quoted, or that they admitted everything there.
  // reasonLines(result, content, drawnIds, admittedIds) -> two lines (one
  // when there is nothing new for the second to say), each
  //   { key (a ui key), vars (numbers, section keys, a list), quoteId (or null) }
  // app.js turns section keys into names and the quoteId into the statement.
  // ======================================================================
  function reasonLines(result, content, drawnIds, admittedIds) {
    var byId = {};
    (content.statements || []).forEach(function (s) { if (s && s.id) byId[s.id] = s; });
    var drawn = Array.from(drawnIds || []).filter(function (id) { return byId[id]; });
    var yes = new Set(Array.from(admittedIds || []));
    var order = {};
    drawn.forEach(function (id, i) { order[id] = i; });
    var passed = drawn.filter(function (id) { return !yes.has(id); });
    var weight = function (id) { return scoring.statementWeight(byId[id]); };
    var heaviest = function (ids) {
      return ids.slice().sort(function (a, b) { return (weight(b) - weight(a)) || (order[a] - order[b]); })[0] || null;
    };
    var lightest = function (ids) {
      return ids.slice().sort(function (a, b) { return (weight(a) - weight(b)) || (order[a] - order[b]); })[0] || null;
    };
    var dims = scoring.DIM_KEYS;
    var per = result.perDim;
    var shown = result.shown;
    var all = result.drawnCount;
    var type = result.typeId;
    var passedLine = passed.length
      ? { key: 'reasonHeaviestPassed', vars: {}, quoteId: heaviest(passed) }
      : { key: 'reasonPassedNone', vars: { all: all }, quoteId: null };

    if (type.indexOf('_') > 0) {
      var lead = result.dominantDim;
      var others = dims.filter(function (k) { return k !== lead; });
      var avg = others.reduce(function (sum, k) { return sum + per[k]; }, 0) / others.length;
      var passedHere = passed.filter(function (id) { return byId[id].dim === lead; });
      var contrast = { key: 'reasonDimContrast', vars: { n: per[lead], shown: shown[lead], dim: lead, avg: String(Math.round(avg * 10) / 10) }, quoteId: null };
      if (passedHere.length) {
        return [contrast, { key: passedHere.length === 1 ? 'reasonDimOne' : 'reasonDimSome', vars: { dim: lead }, quoteId: heaviest(passedHere) }];
      }
      // Everything in the lead section was admitted, which the first line
      // already says. So the second says something new: the heaviest
      // statement passed on in the next section down (by points, then
      // statements, then section order), or further down if that one was
      // admitted in full too. Nothing passed on anywhere: one line only.
      var down = others.slice().sort(function (a, b) {
        return (result.points[b] - result.points[a]) || (per[b] - per[a]) || (dims.indexOf(a) - dims.indexOf(b));
      });
      for (var d = 0; d < down.length; d++) {
        var there = passed.filter(function (id) { return byId[id].dim === down[d]; });
        if (there.length) {
          return [contrast, { key: d === 0 ? 'reasonDimNext' : 'reasonDimElsewhere', vars: { dim: down[d] }, quoteId: heaviest(there) }];
        }
      }
      return [contrast];
    }
    if (type === 'untouched') {
      var mild = passed.filter(function (id) { return byId[id].band === 'mild'; });
      return [
        result.total === 0
          ? { key: 'reasonAnalogNone', vars: { total: all }, quoteId: null }
          : { key: 'reasonAnalogCount', vars: { n: result.total, total: all }, quoteId: null },
        { key: 'reasonAnalogPassed', vars: {}, quoteId: (mild.length ? mild[0] : lightest(passed)) }
      ];
    }
    if (type === 'balanced') {
      // SAMPLER is decided by points, so the lines give points: the five,
      // then how far the top is ahead of the next (at most 1 point by the
      // rules), or how many share the top.
      var pts = dims.map(function (k) { return result.points[k]; });
      var sorted = pts.slice().sort(function (a, b) { return b - a; });
      var level = pts.filter(function (x) { return x === sorted[0]; }).length;
      return [
        { key: 'reasonBalancedCounts', vars: { list: dims.map(function (k) { return { dim: k, n: result.points[k] }; }) }, quoteId: null },
        level >= 2
          ? { key: 'reasonBalancedLevel', vars: { n: level }, quoteId: null }
          : { key: 'reasonBalancedLead', vars: { pts: sorted[0] - sorted[1] }, quoteId: null }
      ];
    }
    if (type === 'merged') {
      var counts = dims.map(function (k) { return per[k]; });
      var max = Math.max.apply(null, counts);
      var min = Math.min.apply(null, counts);
      var empty = dims.filter(function (k) { return per[k] === 0; });
      return [
        empty.length
          ? { key: 'reasonMergedZero', vars: { total: result.total, all: all, max: max, shown: shown[dims[0]], dim: empty[0] }, quoteId: null }
          : (max === min
            ? { key: 'reasonMergedEven', vars: { total: result.total, all: all, max: max, shown: shown[dims[0]] }, quoteId: null }
            : { key: 'reasonMergedSpread', vars: { total: result.total, all: all, max: max, min: min, shown: shown[dims[0]] }, quoteId: null }),
        passedLine
      ];
    }
    // The hidden type.
    var heartExtremes = drawn.filter(function (id) { return byId[id].dim === 'heart' && byId[id].band === 'extreme'; });
    return [
      { key: 'reasonSoulmate', vars: { n: shown.bond, h: heartExtremes.filter(function (id) { return yes.has(id); }).length, hs: heartExtremes.length }, quoteId: null },
      passedLine
    ];
  }

  // ======================================================================
  // 4. LEAVING A PLAY AND COMING BACK
  //
  // The title in the top bar leads back to the landing page at any time,
  // without a confirm dialog: nothing is lost, because the landing then
  // offers to continue where the player was, or to start over.
  // ======================================================================

  /*
   * landingChoice(answers, drawnCount, index) -> what the landing page offers:
   *   { kind: 'start' }                        nothing answered yet: one start button
   *   { kind: 'continue', position: n }        a play under way: "Continue (n / 30)"
   *                                            (n = the statement they were on) + start over
   *   { kind: 'result' }                       every statement answered: back to the
   *                                            result + start over
   */
  function landingChoice(answers, drawnCount, index) {
    var answered = Object.keys(answers || {}).length;
    if (answered === 0) return { kind: 'start' };
    if (drawnCount > 0 && answered >= drawnCount) return { kind: 'result' };
    var i = typeof index === 'number' && index % 1 === 0 && index >= 0 && index < drawnCount ? index : 0;
    return { kind: 'continue', position: i + 1 };
  }

  /*
   * restartKeepsSet({ seedFromLink, challenge }) -> true when "Start over"
   * must keep this play's 30 statements: the play came from someone's link
   * (a seed link or a challenge link), so their results only compare on the
   * same set. Otherwise a restart draws a fresh set, as "New questions" does.
   */
  function restartKeepsSet(play) {
    return Boolean(play) && (play.seedFromLink === true || Boolean(play.challenge));
  }

  // ======================================================================
  // 5. VISIT STATISTICS (GoatCounter)
  //
  // The owner counts visits and results with GoatCounter. What is sent is
  // fixed here and nowhere else:
  //   - a page view of the landing page, always with the path "/"
  //   - events, each a name from STAT_EVENTS (or result:<type id>)
  //   - the screen width (GoatCounter's own "s" field), and with the page
  //     view only, the ORIGIN of a referrer on another site
  //     ("https://www.xiaohongshu.com", never a path or a query)
  // Never sent: the address's query (?seed=, ?vs=, ?re= and ?from= hold the
  // play and answer codes), statement ids, answers, the purity, the seed.
  // GoatCounter's own count.js always adds location.search to every hit and
  // the full referrer by default, so it is not used: statUrl builds the
  // documented /count request itself. And only the real site counts:
  // https://lilwan345.github.io, nothing from file://, localhost or a copy.
  // ======================================================================
  var STAT_ENDPOINT = 'https://leowan34.goatcounter.com/count';
  var STAT_HOST = 'lilwan345.github.io';
  var STAT_EVENTS = [
    'start', 'finish', 'tiebreak', 'save-image', 'copy-link', 'challenge-made', 'challenge-opened',
    'compare-shown', 'reply-opened', 'new-questions', 'start-over', 'lang:en', 'lang:zh'
  ];

  // True when a name may be sent: "/" (the page view), a fixed event, or
  // result:<one of the 14 type ids>.
  function statNameOk(name) {
    if (name === '/') return true;
    if (STAT_EVENTS.indexOf(name) !== -1) return true;
    var m = /^result:([a-z_]+)$/.exec(String(name));
    return Boolean(m) && scoring.TYPE_IDS.indexOf(m[1]) !== -1;
  }

  // Counting happens only on the real site, over https.
  function statsAllowed(loc) {
    return Boolean(loc) && loc.protocol === 'https:' && loc.hostname === STAT_HOST;
  }

  // The origin of a referrer on another site, or '' (same site, none, junk).
  function externalOrigin(referrer, ownHost) {
    try {
      var u = new URL(String(referrer));
      if (!/^https?:$/.test(u.protocol) || u.hostname === ownHost) return '';
      return u.origin;
    } catch (e) {
      return '';
    }
  }

  /*
   * statUrl(name, opts) -> the request URL, or null for a name not on the
   * list. opts: { screen (width), referrer (an origin; page view only),
   * rnd (cache buster) }. Only p, t, e, s, r and rnd ever appear.
   */
  function statUrl(name, opts) {
    if (!statNameOk(name)) return null;
    var o = opts || {};
    var pageView = name === '/';
    var parts = [
      'p=' + encodeURIComponent(name),
      't=' + encodeURIComponent(pageView ? 'AI Purity Test' : name)
    ];
    if (!pageView) parts.push('e=true');
    if (typeof o.screen === 'number' && o.screen > 0) parts.push('s=' + Math.round(o.screen));
    if (pageView && typeof o.referrer === 'string' && /^https?:\/\/[^/?#]+$/.test(o.referrer)) {
      parts.push('r=' + encodeURIComponent(o.referrer));
    }
    parts.push('rnd=' + encodeURIComponent(String(o.rnd || Math.random().toString(36).slice(2, 7)).replace(/[^0-9a-z]/g, '')));
    return STAT_ENDPOINT + '?' + parts.join('&');
  }

  /*
   * sendStat(name, env) -> true when a request was handed to env.send.
   * env: { location, referrer, screen, send(url) }. In the page, env is the
   * real window; tests pass a stub. Never throws.
   */
  function sendStat(name, env) {
    try {
      var e = env || {};
      if (!statsAllowed(e.location)) return false;
      var url = statUrl(name, {
        screen: e.screen,
        referrer: name === '/' ? externalOrigin(e.referrer, STAT_HOST) : ''
      });
      if (!url || typeof e.send !== 'function') return false;
      e.send(url);
      return true;
    } catch (err) {
      return false;
    }
  }

  var api = {
    // play history and the personal reason lines
    HISTORY_KEY: HISTORY_KEY,
    HISTORY_MAX: HISTORY_MAX,
    MIN_HISTORY: MIN_HISTORY,
    playHistory: playHistory,
    rememberPlay: rememberPlay,
    historySummary: historySummary,
    historyCounts: historyCounts,
    reasonLines: reasonLines,
    // statistics
    STAT_ENDPOINT: STAT_ENDPOINT,
    STAT_HOST: STAT_HOST,
    STAT_EVENTS: STAT_EVENTS,
    statNameOk: statNameOk,
    statsAllowed: statsAllowed,
    externalOrigin: externalOrigin,
    statUrl: statUrl,
    sendStat: sendStat,
    // leaving and coming back
    landingChoice: landingChoice,
    restartKeepsSet: restartKeepsSet,
    // comparison
    encodeAnswers: encodeAnswers,
    decodeAnswers: decodeAnswers,
    decodeAnswerSet: decodeAnswerSet,
    readCompareLink: readCompareLink,
    comparePlays: comparePlays,
    COMPARE_LIMITS: COMPARE_LIMITS,
    // remarks
    REMARK_RULES: REMARK_RULES,
    REMARK_GROUPS: REMARK_GROUPS,
    remarkSchedule: remarkSchedule,
    remarkFor: remarkFor,
    validateRemarks: validateRemarks,
    // collection
    COLLECTION_KEY: COLLECTION_KEY,
    collectedTypes: collectedTypes,
    rememberCollected: rememberCollected
  };

  root.APT_EXTRAS = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
