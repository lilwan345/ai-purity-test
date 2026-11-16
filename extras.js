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
  // of 0-9 and a-z: 6 for the answers, 2 to check them.
  //   - answers: bit i is 1 when the i-th statement of the play (in asking
  //     order) was answered Guilty. "Not sure" and "Never" are both 0, so the
  //     code holds exactly what score() sees. 30 bits fit in 6 base-36
  //     characters (36^6 > 2^30).
  //   - check: two characters made from the seed, the 30 drawn ids and the
  //     answer part. A typo, a code pasted onto another seed, or a link from
  //     before the statement bank changed (same seed, other statements) fails
  //     the check, and the page falls back to its normal behaviour.
  // The check stops accidents, not people: anyone who reads this file can
  // make a valid code. That is fine, because the code only says which
  // statements were admitted; every type and number is recomputed from it.
  // ======================================================================
  var CODE_PATTERN = /^[0-9a-z]{8}$/;
  var ANSWER_PART = 6;

  function checkPart(seed, drawnIds, answerPart) {
    var h = scoring.hash128('apt-vs-v1|' + seed + '|' + drawnIds.join(',') + '|' + answerPart);
    return (h[0] % 1296).toString(36).padStart(2, '0');
  }

  function validDraw(seed, drawnIds) {
    return scoring.normalizeSeed(seed) === seed && Array.isArray(drawnIds) &&
      drawnIds.length > 0 && drawnIds.length <= 30;
  }

  /*
   * encodeAnswers(seed, drawnIds, admittedIds) -> "0k3x9qa7" (8 characters),
   * or null when the seed or the draw is not usable.
   * admittedIds: array or Set of the ids answered Guilty; ids outside the
   * draw are ignored.
   */
  function encodeAnswers(seed, drawnIds, admittedIds) {
    if (!validDraw(seed, drawnIds)) return null;
    var yes = new Set(Array.from(admittedIds || []));
    var bits = 0;
    drawnIds.forEach(function (id, i) { if (yes.has(id)) bits += Math.pow(2, i); });
    var answerPart = bits.toString(36).padStart(ANSWER_PART, '0');
    return answerPart + checkPart(seed, drawnIds, answerPart);
  }

  /*
   * decodeAnswers(code, seed, drawnIds) -> the admitted ids in asking order,
   * or null when the code is malformed (wrong length, other characters, a
   * number too large for the draw) or does not belong to this seed and draw.
   * Upper case is accepted (a link typed by hand); nothing else is.
   */
  function decodeAnswers(code, seed, drawnIds) {
    if (typeof code !== 'string' || !validDraw(seed, drawnIds)) return null;
    var c = code.trim().toLowerCase();
    if (!CODE_PATTERN.test(c)) return null;
    var answerPart = c.slice(0, ANSWER_PART);
    if (c.slice(ANSWER_PART) !== checkPart(seed, drawnIds, answerPart)) return null;
    var bits = parseInt(answerPart, 36);
    if (!(bits >= 0) || bits >= Math.pow(2, drawnIds.length)) return null;
    var out = [];
    drawnIds.forEach(function (id, i) {
      if (Math.floor(bits / Math.pow(2, i)) % 2 === 1) out.push(id);
    });
    return out;
  }

  /*
   * readCompareLink({ seed, vs, re }, content) -> what a link asks for:
   *   null                              not a comparison link, or a broken one
   *   { seed, drawn, vs: ids, re: null }    a challenge: play the same 30, then compare
   *   { seed, drawn, vs: ids, re: ids }     a reply: show the comparison straight away
   * vs = the challenger's answers, re = the answers of the friend who played
   * the challenge and sent it back. Every value that is present must be
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
      var vs = decodeAnswers(q.vs, seed, drawn);
      if (!vs) return null;
      var re = null;
      if (q.re !== null && q.re !== undefined) {
        re = decodeAnswers(q.re, seed, drawn);
        if (!re) return null;
      }
      return { seed: seed, drawn: drawn, vs: vs, re: re };
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
   * comparePlays(content, drawnIds, mineIds, friendIds) -> {
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

  function comparePlays(content, drawnIds, mineIds, friendIds) {
    var drawn = Array.from(drawnIds || []);
    var inDraw = new Set(drawn);
    var byId = {};
    (content.statements || []).forEach(function (s) { if (s && s.id) byId[s.id] = s; });
    var typesById = {};
    (content.types || []).forEach(function (t) { if (t && t.id) typesById[t.id] = t; });

    var mineSet = new Set(Array.from(mineIds || []).filter(function (id) { return inDraw.has(id); }));
    var friendSet = new Set(Array.from(friendIds || []).filter(function (id) { return inDraw.has(id); }));
    var mine = scoring.score(Array.from(mineSet), content, drawn);
    var friend = scoring.score(Array.from(friendSet), content, drawn);

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

  var api = {
    // leaving and coming back
    landingChoice: landingChoice,
    restartKeepsSet: restartKeepsSet,
    // comparison
    encodeAnswers: encodeAnswers,
    decodeAnswers: decodeAnswers,
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
