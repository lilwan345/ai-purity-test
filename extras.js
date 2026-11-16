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
  //   - at most 6 per play, each statement at most once
  // While a remark shows, the statement it answers stays on screen (app.js,
  // the "hold"); remarkDuration is how long, unless a tap skips on.
  // content.remarks holds the lines: general ones, one list per statement
  // band, one per section. A candidate's line comes from the general lines
  // plus those for its statement's band and section, never repeated in a play.
  // ======================================================================
  var REMARK_RULES = {
    maxPerPlay: 6,       // remarks shown in one play, at most
    skipFirst: 3,        // statements at the start that never get one
    candidates: 12,      // statements per play that may get one (if answered Guilty)
    maxEn: 40,           // length limits for the fallback lines (the groups)
    maxZh: 14,
    statementMaxEn: 56,  // length limits for the per-statement lines
    statementMaxZh: 20,
    baseMs: 1600,        // how long a remark stays: baseMs + perUnitMs for every
    perUnitMs: 55,       // character (a Chinese character counts as 2), at most
    maxMs: 2800          // maxMs. The answered statement is held that long (or until any tap or key)
  };
  var REMARK_GROUPS = ['general', 'mild', 'medium', 'extreme'].concat(scoring.DIM_KEYS);

  function remarkList(content, group) {
    var r = content && content.remarks;
    return r && Array.isArray(r[group]) ? r[group] : [];
  }

  // The line written for one statement, or null.
  function statementRemark(content, id) {
    var map = content && content.remarks && content.remarks.statements;
    var line = map && Object.prototype.hasOwnProperty.call(map, id) ? map[id] : null;
    return line && typeof line.en === 'string' && typeof line.zh === 'string' && line.en.trim() && line.zh.trim() ? line : null;
  }

  /*
   * remarkSchedule(content, seed, drawnIds) -> [{ index, group, n, line }]
   * sorted by index: the statements of this play that may get a remark, and
   * the line each would get. The line is the one written for that statement
   * (group 'statement'); only a statement without one falls back to the
   * groups (general, its band, its section; never the same line twice).
   * The places: REMARK_RULES.candidates of them, between statement 4 and the
   * second-to-last, never next to each other, every such set equally likely
   * (k places from n with gaps = k places from n - k + 1, each moved up by
   * its rank). Uses makeGenerator('apt-remarks-v1|' + seed), never the
   * draw's generator.
   */
  function remarkSchedule(content, seed, drawnIds) {
    var drawn = Array.from(drawnIds || []);
    var next = scoring.makeGenerator('apt-remarks-v1|' + String(seed));
    var byId = {};
    (content.statements || []).forEach(function (s) { if (s && s.id) byId[s.id] = s; });

    var first = REMARK_RULES.skipFirst;
    var n = Math.max(0, drawn.length - 1 - first);        // places first .. length-2
    var k = Math.min(REMARK_RULES.candidates, Math.ceil(n / 2));
    var slots = [];
    for (var i = 0; i < n - k + 1; i++) slots.push(i);
    for (var j = 0; j < k; j++) {                          // partial Fisher-Yates
      var r = j + scoring.randomBelow(next, slots.length - j);
      var tmp = slots[j]; slots[j] = slots[r]; slots[r] = tmp;
    }
    var picked = slots.slice(0, k).sort(function (a, b) { return a - b; })
      .map(function (slot, rank) { return first + slot + rank; });

    var used = {};
    return picked.map(function (index) {
      var id = drawn[index];
      var own = statementRemark(content, id);
      if (own) return { index: index, group: 'statement', n: id, line: own };
      var s = byId[id] || {};
      var pool = [];
      ['general', s.band, s.dim].forEach(function (group) {
        remarkList(content, group).forEach(function (line, m) {
          if (!used[group + ':' + m]) pool.push({ group: group, n: m, line: line });
        });
      });
      if (!pool.length) {
        remarkList(content, 'general').forEach(function (line, m) { pool.push({ group: 'general', n: m, line: line }); });
      }
      if (!pool.length) return null;
      var choice = pool[scoring.randomBelow(next, pool.length)];
      used[choice.group + ':' + choice.n] = true;
      return { index: index, group: choice.group, n: choice.n, line: choice.line };
    }).filter(Boolean);
  }

  // How long a remark stays on screen, in ms: long enough to read.
  function remarkDuration(text) {
    var units = 0;
    Array.from(String(text || '')).forEach(function (ch) {
      if (/\s/.test(ch)) return;
      units += /[⺀-鿿豈-﫿＀-￯　-〿]/.test(ch) ? 2 : 1;
    });
    return Math.min(REMARK_RULES.maxMs, REMARK_RULES.baseMs + REMARK_RULES.perUnitMs * units);
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
    function check(line, where, maxEn, maxZh) {
      if (!line || typeof line.en !== 'string' || typeof line.zh !== 'string' || !line.en.trim() || !line.zh.trim()) {
        problems.push(where + ': needs en and zh');
        return;
      }
      if (Array.from(line.en).length > maxEn) problems.push(where + ': English is over ' + maxEn + ' characters');
      if (Array.from(line.zh).length > maxZh) problems.push(where + ': Chinese is over ' + maxZh + ' characters');
      if (/[!！]/.test(line.en + line.zh)) problems.push(where + ': no exclamation marks');
      if (/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line.en + line.zh)) problems.push(where + ': no emoji');
    }
    REMARK_GROUPS.forEach(function (group) {
      if (!Array.isArray(r[group]) || !r[group].length) { problems.push('remarks.' + group + ': missing or empty'); return; }
      r[group].forEach(function (line, n) { check(line, 'remarks.' + group + '[' + n + ']', REMARK_RULES.maxEn, REMARK_RULES.maxZh); });
    });
    var map = r.statements && typeof r.statements === 'object' ? r.statements : {};
    var ids = {};
    (content.statements || []).forEach(function (s) { if (s && s.id) ids[s.id] = true; });
    Object.keys(map).forEach(function (id) {
      if (!ids[id]) problems.push('remarks.statements.' + id + ': not a statement id');
      check(map[id], 'remarks.statements.' + id, REMARK_RULES.statementMaxEn, REMARK_RULES.statementMaxZh);
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
  // https://guiltyofai.vercel.app, nothing from file://, localhost or a copy.
  // ======================================================================
  var STAT_ENDPOINT = 'https://leowan34.goatcounter.com/count';
  var STAT_HOST = 'guiltyofai.vercel.app';
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

  // ======================================================================
  // 6. PUBLIC TOTALS (read back from GoatCounter, real numbers only)
  //
  // GoatCounter publishes a count per path at
  //   https://leowan34.goatcounter.com/counter/<path>.json  ->  {"count": "1,234"}
  // (a formatted string; 404 for a path with no hits; their cache is up to
  // four hours; 403 while the owner has it switched off). The landing page
  // shows "N tests finished" from the "finish" count once it is at least
  // FINISH_MIN, and the ranking of the 14 types from the "result:<type id>"
  // counts once they add up to RANKING_MIN. Anything less, or any failure,
  // and nothing is shown: no placeholders, no invented or zero numbers.
  // ======================================================================
  var COUNTER_BASE = 'https://leowan34.goatcounter.com/counter/';
  var FINISH_MIN = 100;
  var RANKING_MIN = 200;
  var COUNTS_CACHE_KEY = 'apt-public-counts-v1';
  var COUNTS_CACHE_MS = 60 * 60 * 1000;

  // The counter URL for one path ("finish", "result:heart_deep").
  function counterUrl(path) {
    return COUNTER_BASE + encodeURIComponent(path) + '.json';
  }
  // The paths the page asks for: "finish" and the 14 results.
  function counterPaths() {
    return ['finish'].concat(scoring.TYPE_IDS.map(function (id) { return 'result:' + id; }));
  }

  // "1,234", "1 234" (with any kind of space), "1234" or 1234 -> 1234;
  // anything else (negative, fractional, words, empty) -> null.
  function parseCount(raw) {
    if (typeof raw === 'number') return Number.isInteger(raw) && raw >= 0 ? raw : null;
    if (typeof raw !== 'string') return null;
    var s = raw.trim().replace(/[\s   ,]/g, '');
    if (!/^\d{1,12}$/.test(s)) return null;
    return parseInt(s, 10);
  }

  // The finish count to show, or null below FINISH_MIN (or no data).
  function finishToShow(n) {
    return typeof n === 'number' && n >= FINISH_MIN ? n : null;
  }

  /*
   * rankingFrom(counts) -> null when the 14 result counts add up to less
   * than RANKING_MIN, else { total, rows: [{ typeId, count, share }] most
   * common first, top: the first five, rare: the three least common, least
   * first }. counts: { 'result:<id>': number | null }; a missing or null
   * type counts as zero. Ties keep the fixed type order (scoring.TYPE_IDS).
   * share = count / total * 100, one decimal.
   */
  function rankingFrom(counts) {
    var c = counts || {};
    var rows = scoring.TYPE_IDS.map(function (id, order) {
      var n = c['result:' + id];
      return { typeId: id, count: typeof n === 'number' && n > 0 ? n : 0, order: order };
    });
    var total = rows.reduce(function (sum, r) { return sum + r.count; }, 0);
    if (total < RANKING_MIN) return null;
    rows.forEach(function (r) { r.share = Math.round(r.count / total * 1000) / 10; });
    rows.sort(function (a, b) { return (b.count - a.count) || (a.order - b.order); });
    rows.forEach(function (r) { delete r.order; });
    var rare = rows.slice(-3).reverse();
    return { total: total, rows: rows, top: rows.slice(0, 5), rare: rare };
  }

  /*
   * fetchCounts(paths, options) -> Promise of { path: number | null }, never
   * rejects. options: { fetch (the fetch function), timeoutMs }. All paths in
   * parallel; each is a plain GET with no cookies and no Referer; anything
   * but a 200 with {"count": <parseable>} is null; past timeoutMs, null.
   */
  function fetchCounts(paths, options) {
    var o = options || {};
    var doFetch = o.fetch;
    var timeoutMs = o.timeoutMs || 4000;
    var list = Array.from(paths || []);
    if (typeof doFetch !== 'function') return Promise.resolve(emptyCounts(list));
    return Promise.all(list.map(function (path) {
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = null;
      var timeout = new Promise(function (resolve) {
        timer = setTimeout(function () { if (controller) controller.abort(); resolve(null); }, timeoutMs);
      });
      var request;
      try {
        request = Promise.resolve(doFetch(counterUrl(path), {
          method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer',
          signal: controller ? controller.signal : undefined
        })).then(function (res) {
          if (!res || res.status !== 200 || typeof res.json !== 'function') return null;
          return res.json().then(function (body) { return body && typeof body === 'object' ? parseCount(body.count) : null; }, function () { return null; });
        }, function () { return null; });
      } catch (e) {
        request = Promise.resolve(null);
      }
      return Promise.race([request, timeout]).then(function (value) {
        clearTimeout(timer);
        return [path, value === undefined ? null : value];
      });
    })).then(function (pairs) {
      var out = {};
      pairs.forEach(function (p) { out[p[0]] = p[1]; });
      return out;
    });
  }
  function emptyCounts(paths) {
    var out = {};
    paths.forEach(function (p) { out[p] = null; });
    return out;
  }

  // The device cache of the parsed numbers (one hour). Never throws.
  function readCountsCache(storage, now) {
    try {
      var raw = storage ? JSON.parse(storage.getItem(COUNTS_CACHE_KEY)) : null;
      if (!raw || typeof raw !== 'object' || typeof raw.at !== 'number' || !raw.counts || typeof raw.counts !== 'object') return null;
      if (!(now - raw.at >= 0 && now - raw.at < COUNTS_CACHE_MS)) return null;
      // Only the paths that were fetched; a path that is not there was not asked yet.
      var out = {};
      counterPaths().forEach(function (p) {
        if (!Object.prototype.hasOwnProperty.call(raw.counts, p)) return;
        var v = raw.counts[p];
        out[p] = typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : null;
      });
      return out;
    } catch (e) {
      return null;
    }
  }
  function writeCountsCache(storage, now, counts) {
    try {
      if (!storage) return false;
      storage.setItem(COUNTS_CACHE_KEY, JSON.stringify({ at: now, counts: counts }));
      return true;
    } catch (e) {
      return false;
    }
  }

  // validateLanding(content) -> problems with content.landing ([] = fine):
  // every leaf needs non-empty en and zh (the comparison table's empty
  // top-left English cell excepted).
  function validateLanding(content) {
    var problems = [];
    var l = content && content.landing;
    if (!l || typeof l !== 'object') return ['landing: missing'];
    (function walk(node, where) {
      if (Array.isArray(node)) { node.forEach(function (x, i) { walk(x, where + '[' + i + ']'); }); return; }
      if (!node || typeof node !== 'object') { problems.push(where + ': not text'); return; }
      if ('en' in node || 'zh' in node) {
        var emptyOk = /\.compare\.head$/.test(where);
        ['en', 'zh'].forEach(function (lang) {
          if (typeof node[lang] !== 'string' || (!node[lang].trim() && !(emptyOk && lang === 'en'))) problems.push(where + ': missing ' + lang);
        });
        return;
      }
      Object.keys(node).forEach(function (k) { walk(node[k], where + '.' + k); });
    })(l, 'landing');
    return problems;
  }

  // validateJudging(content) -> problems with content.judging ([] = fine).
  function validateJudging(content) {
    var problems = [];
    var j = content && content.judging;
    if (!j || typeof j !== 'object') return ['judging: missing'];
    (function walk(node, where) {
      if (!node || typeof node !== 'object') { problems.push(where + ': not text'); return; }
      if ('en' in node || 'zh' in node) {
        ['en', 'zh'].forEach(function (lang) {
          if (typeof node[lang] !== 'string' || !node[lang].trim()) problems.push(where + ': missing ' + lang);
        });
        return;
      }
      Object.keys(node).forEach(function (k) { walk(node[k], where + '.' + k); });
    })(j, 'judging');
    return problems;
  }

  // ======================================================================
  // 7. THE JUDGING TRACE ("How this result was reached")
  //
  // The rows of score()'s own run on one play, in the order score() checks
  // them: (1) merged, (2) the hidden combination, (3) untouched, (4)
  // balanced, (5) which section leads, (6) how deep. Built from the result
  // score() returned (and its play-off), with the thresholds read from
  // scoring.RULES, the same numbers score() uses; it never decides a type
  // on its own. tests/judging.test.js checks it against score() for every
  // persona on many draws, including that the failing balanced condition it
  // names is really the one that failed.
  //
  // judgingTrace(result) -> {
  //   total, typeId, match,
  //   steps: [{ id, status: 'no' | 'yes' | 'decides' | 'skipped', answer: { key, vars } }]
  // }
  // answer.key names the line in content.judging[id]; vars hold numbers and
  // section keys (app.js turns those into names). A skipped step has no answer.
  // ======================================================================
  function judgingTrace(result) {
    var R = scoring.RULES;
    var dims = scoring.DIM_KEYS;
    var type = result.typeId;
    var depthOf = function (k) { return result.maxPoints[k] ? 100 * result.points[k] / result.maxPoints[k] : 0; };
    var steps = [];
    var done = false;
    function step(id, status, key, vars) {
      if (done) { steps.push({ id: id, status: 'skipped', answer: null }); return; }
      steps.push({ id: id, status: status, answer: { key: key, vars: vars || {} } });
      if (status === 'yes') done = true;
    }

    // 1. merged
    if (type === 'merged') {
      if (result.total >= R.mergedMinTotal) step('merged', 'yes', 'yes', { n: result.total });
      else step('merged', 'yes', 'yesDeep');
    } else {
      step('merged', 'no', 'no', { n: result.total });
    }
    // 2. the hidden combination (never spelled out)
    step('hidden', type === 'soulmate' ? 'yes' : 'no', type === 'soulmate' ? 'yes' : 'no');
    // 3. untouched
    step('untouched', type === 'untouched' ? 'yes' : 'no', type === 'untouched' ? 'yes' : 'no', type === 'untouched' ? { n: result.total } : {});
    // 4. balanced: the real reason it holds or fails, in the order score() tests it
    var pts = dims.map(function (k) { return result.points[k]; });
    var sortedPts = pts.slice().sort(function (a, b) { return b - a; });
    var topCount = pts.filter(function (p) { return p === sortedPts[0]; }).length;
    if (type === 'balanced') {
      if (result.tiedDims.length >= R.balancedTieMin) step('balanced', 'yes', 'yesTie', { m: result.tiedDims.length });
      else if (sortedPts[0] === sortedPts[1]) step('balanced', 'yes', 'yesTie', { m: topCount });
      else step('balanced', 'yes', 'yes', { k: sortedPts[0] - sortedPts[1] });
    } else if (!done) {
      var depths = dims.map(depthOf);
      var byDepth = depths.slice().sort(function (a, b) { return b - a; });
      var empty = dims.filter(function (k) { return result.perDim[k] === 0; });
      if (result.total < R.balancedMinTotal) step('balanced', 'no', 'noFew', { n: result.total });
      else if (empty.length) step('balanced', 'no', 'noEmpty', { dim: empty[0] });
      else if (byDepth[0] - byDepth[4] > R.balancedMaxSpread + 1e-9) step('balanced', 'no', 'noSpread', { k: sortedPts[0] - sortedPts[4] });
      else step('balanced', 'no', 'noLead', { dim: result.dominantDim, k: sortedPts[0] - sortedPts[1] });
    } else {
      step('balanced', 'no', 'noFew', {});
    }
    // 5. which section leads, and 6. how deep (section types only)
    if (!done) {
      var lead = result.dominantDim;
      var other = result.tiedDims.length === 2 ? result.tiedDims.filter(function (k) { return k !== lead; })[0] : result.runnerUpDim;
      var p = result.points[lead];
      var tb = result.tieBreak;
      if (tb === 'top' || tb === 'count') steps.push({ id: 'lead', status: 'decides', answer: { key: tb, vars: { a: lead, b: other, p: p } } });
      else if (tb === 'playoff') steps.push({ id: 'lead', status: 'decides', answer: { key: 'playoff', vars: { a: lead, b: other, r: result.playoff.decidedRound } } });
      else if (tb === 'lot') steps.push({ id: 'lead', status: 'decides', answer: { key: 'lot', vars: { a: lead, b: other } } });
      else {
        steps.push({ id: 'lead', status: 'decides', answer: { key: 'plain', vars: { dim: lead, p: p,
          others: dims.filter(function (k) { return k !== lead; }).map(function (k) { return { dim: k, p: result.points[k] }; }) } } });
      }
      var max = result.maxPoints[lead];
      var line = Math.ceil(R.highFrom * max / 100);
      var deep = type.slice(-5) === '_deep';
      var key = !deep ? 'lite' : (depthOf(lead) >= R.highFrom ? 'line' : 'extremes');
      var dvars = key === 'line' ? { p: p, max: max, line: line } : (key === 'lite' ? { p: p, max: max } : {});
      steps.push({ id: 'depth', status: 'decides', answer: { key: key, vars: dvars } });
    } else {
      steps.push({ id: 'lead', status: 'skipped', answer: null }, { id: 'depth', status: 'skipped', answer: null });
    }
    return { total: result.total, typeId: type, match: result.match, steps: steps };
  }

  // ======================================================================
  // Part 8. The purity figure on the question screen
  // ======================================================================
  // A small marker person whose parts become machine parts as purity falls.
  // FIGURE_STAGES is the one table to retune from real play data: a part is a
  // machine part once purity is at or below its `at`. Purity moves in steps of
  // 100/30 (it is round(100 * (1 - admitted / 30))), and every `at` is one of
  // those values, so each admission crosses at most one stage. Why these: in
  // the simulated players the final purity has median 63, quartiles 47 and 80,
  // and 5% end at 23 or lower, so the first admission already changes
  // something, a typical play ends part machine, and few end all machine; 33
  // is also where the merged type starts. The parts are the groups in
  // art-src/c/out/purity-figure.svg ("lights" is the eye lights going full).
  var FIGURE_STAGES = [
    { at: 97, part: 'ant' },     // antenna
    { at: 90, part: 'eyeL' },    // first eye becomes a screen
    { at: 80, part: 'armR' },    // right arm becomes a claw arm
    { at: 70, part: 'eyeR' },    // second eye
    { at: 60, part: 'mouth' },   // mouth becomes a grille
    { at: 50, part: 'head' },    // square head
    { at: 40, part: 'body' },    // a box with a panel
    { at: 33, part: 'armL' },    // left arm
    { at: 17, part: 'legs' },    // wheels
    { at: 3, part: 'lights' }    // the eye lights go fully on
  ];

  // The machine parts at this purity, in table order (anything that is not a
  // number counts as 100: a fresh, human figure).
  function figureState(purity) {
    var p = Number(purity);
    if (purity === null || purity === undefined || purity === '' || !isFinite(p)) p = 100;
    return FIGURE_STAGES.filter(function (s) { return p <= s.at; }).map(function (s) { return s.part; });
  }

  // What changes between two purities: the parts that turn machine (add) or
  // back to human (remove), and the kind of change: 'scan' (a part changes),
  // 'react' (purity fell but no part changes) or 'none'.
  function figureChange(fromPurity, toPurity) {
    var a = figureState(fromPurity);
    var b = figureState(toPurity);
    var add = b.filter(function (x) { return a.indexOf(x) < 0; });
    var remove = a.filter(function (x) { return b.indexOf(x) < 0; });
    var kind = add.length || remove.length ? 'scan' : (Number(toPurity) < Number(fromPurity) ? 'react' : 'none');
    return { add: add, remove: remove, kind: kind };
  }

  var api = {
    // the purity figure
    FIGURE_STAGES: FIGURE_STAGES,
    figureState: figureState,
    figureChange: figureChange,
    // the judging trace
    judgingTrace: judgingTrace,
    validateJudging: validateJudging,
    // public totals and the landing copy
    COUNTER_BASE: COUNTER_BASE,
    FINISH_MIN: FINISH_MIN,
    RANKING_MIN: RANKING_MIN,
    COUNTS_CACHE_KEY: COUNTS_CACHE_KEY,
    COUNTS_CACHE_MS: COUNTS_CACHE_MS,
    counterUrl: counterUrl,
    counterPaths: counterPaths,
    parseCount: parseCount,
    finishToShow: finishToShow,
    rankingFrom: rankingFrom,
    fetchCounts: fetchCounts,
    readCountsCache: readCountsCache,
    writeCountsCache: writeCountsCache,
    validateLanding: validateLanding,
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
    remarkDuration: remarkDuration,
    statementRemark: statementRemark,
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
