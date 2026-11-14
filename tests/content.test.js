// Checks the real content.js (not a fixture). Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  score, drawStatements, admitByCounts, bankReport, validateContent, validateProfiles, makeGenerator, randomBelow,
  DIM_KEYS, STATEMENT_BANDS, TYPE_IDS, UI_KEYS, BANK_PER_STRATUM
} = require('../scoring.js');

// content.js is a classic browser script: it sets globalThis.APT_CONTENT.
require('../content.js');
const content = globalThis.APT_CONTENT;

test('content.js: validateContent finds no problems (apart from the result-screen copy, checked below)', () => {
  const profileProblems = new Set(validateProfiles(content));
  assert.deepStrictEqual(validateContent(content).filter((p) => !profileProblems.has(p)), []);
});

// The result-screen copy that scoring v2 added: dimension `reads`, type `why`,
// `signs`, `bestWith`, `bestWithLine`, `clashWith`, `clashWithLine`.
test('content.js: result-screen copy is complete (reads, why, signs, bestWith, clashWith)', () => {
  assert.deepStrictEqual(validateProfiles(content), []);
});

// Length guide for the result-screen copy, so it fits the result screen on a
// 360 px phone. Chinese is counted in characters.
test('content.js: result-screen copy stays within its length guide', () => {
  const len = (s) => Array.from(s).length;
  const tooLong = [];
  function check(where, pair, maxEn, maxZh) {
    if (len(pair.en) > maxEn) tooLong.push(where + ' (en ' + len(pair.en) + ' > ' + maxEn + ')');
    if (len(pair.zh) > maxZh) tooLong.push(where + ' (zh ' + len(pair.zh) + ' > ' + maxZh + ')');
  }
  content.dimensions.forEach((d) => {
    Object.keys(d.reads).forEach((band) => check(d.key + ' reads.' + band, d.reads[band], 80, 30));
  });
  content.types.forEach((t) => {
    t.signs.forEach((sign, i) => check(t.id + ' signs[' + i + ']', sign, 70, 28));
    check(t.id + ' bestWithLine', t.bestWithLine, 80, 30);
    check(t.id + ' clashWithLine', t.clashWithLine, 80, 30);
    check(t.id + ' why', t.why, 170, 60);
    assert.notStrictEqual(t.bestWith, t.clashWith, t.id + ': bestWith and clashWith are the same type');
  });
  assert.deepStrictEqual(tooLong, []);
});

test('content.js: every ui key that app.js reads exists in both languages', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  // Matches calls like t('appName') or t('progress', {...}); skips the
  // t('key', ...) example in the comment above the t() helper.
  const used = new Set();
  for (const match of appSource.matchAll(/\bt\('([A-Za-z]+)'/g)) {
    if (match[1] !== 'key') used.add(match[1]);
  }
  assert.ok(used.size > 20, 'expected to find the ui keys app.js uses');
  for (const key of used) {
    const entry = content.ui[key];
    assert.ok(entry, 'ui key "' + key + '" is missing from content.js');
    assert.ok(entry.en && entry.zh, 'ui key "' + key + '" needs both en and zh');
  }
  // And the other way round: no leftover keys that nothing shows any more.
  const unused = Object.keys(content.ui).filter((key) => !used.has(key));
  assert.deepStrictEqual(unused, [], 'ui keys in content.js that app.js never reads');
  // scoring.js's UI_KEYS list (what validateContent checks) matches too.
  assert.deepStrictEqual([...UI_KEYS].sort(), [...used].sort());
});


// ---------- the interface copy matches a play of 30 ----------
test('ui copy: nothing still talks about fifty statements, levels or three hidden statements', () => {
  const stale = [];
  Object.keys(content.ui).forEach((key) => {
    const { en, zh } = content.ui[key];
    // ("dead level" and a 50% match are fine; "level 9 of 10", "{level}" or
    // "of the 50" are not. The card's bars really have 10 squares.)
    if (/\b50\b(?!%)|fifty|level \d|\{level\}|three hidden|19 points|\b42\b/i.test(en)) stale.push(key + ' (en): ' + en);
    if (/50(?!%)|五十|\{level\}|第 \d+ 级|三条隐藏|三道|19 分|42/.test(zh)) stale.push(key + ' (zh): ' + zh);
  });
  assert.deepStrictEqual(stale, []);
  // The index.html description too.
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.match(description, /Thirty/);
  assert.doesNotMatch(description, /Fifty|50/);
});

test('ui copy: the numbers in "How this is scored" and the grid are the real rules', () => {
  const { RULES, DRAW_SIZE } = require('../scoring.js');
  const ui = content.ui;
  ['en', 'zh'].forEach((lang) => {
    assert.ok(ui.howWeights[lang].includes(String(DRAW_SIZE)), 'howWeights ' + lang + ' says ' + DRAW_SIZE);
    assert.ok(ui.howWeights[lang].includes('12'), 'howWeights ' + lang + ' says 12 points');
    assert.ok(ui.howLead[lang].includes('7') && ui.howLead[lang].includes('12'), 'howLead ' + lang + ' says 7 of 12');
    assert.ok(ui.howSpecial[lang].includes(String(RULES.mergedMinTotal)), 'howSpecial ' + lang + ' merged');
    assert.ok(ui.howSpecial[lang].includes(String(RULES.untouchedMaxTotal)), 'howSpecial ' + lang + ' untouched');
    assert.ok(ui.howSpecial[lang].includes(String(RULES.balancedMinTotal)), 'howSpecial ' + lang + ' balanced');
    assert.ok(ui.typesRuleMerged[lang].includes(String(RULES.mergedMinTotal)), 'typesRuleMerged ' + lang);
    assert.ok(ui.typesRuleUntouched[lang].includes(String(RULES.untouchedMaxTotal)), 'typesRuleUntouched ' + lang);
    // Counts that depend on the play come in as placeholders.
    assert.ok(ui.cardTicks[lang].includes('{total}'), 'cardTicks ' + lang + ' uses {total}');
    assert.ok(ui.unsureNote[lang].includes('{total}'), 'unsureNote ' + lang + ' uses {total}');
    assert.ok(ui.dimRowMeta[lang].includes('{shown}') && ui.dimAria[lang].includes('{shown}'), 'section rows ' + lang + ' use {shown}');
    // Evidence speaks of bands, never level numbers.
    assert.ok(!ui.exhibitMeta[lang].includes('{level}'), 'exhibitMeta ' + lang + ' has no level');
    assert.ok(ui.exhibitMeta[lang].includes('{weight}'), 'exhibitMeta ' + lang + ' shows the band word');
  });
  assert.deepStrictEqual([ui.levelMild.zh, ui.levelMedium.zh, ui.levelExtreme.zh], ['轻度', '中度', '重度']);
  assert.deepStrictEqual([ui.levelMild.en, ui.levelMedium.en, ui.levelExtreme.en], ['mild', 'medium', 'extreme']);
});

test('ui copy: the new play keys exist, and the short ones stay short', () => {
  const len = (s) => Array.from(s).length;
  ['closeEnough', 'closeEnoughHint', 'seedFromLink', 'newQuestions', 'matchTieLot'].forEach((key) => {
    assert.ok(UI_KEYS.includes(key), key + ' is in UI_KEYS');
    assert.ok(content.ui[key] && content.ui[key].en && content.ui[key].zh, key + ' has en and zh');
  });
  // The hint shares one line with the section label on a 360 px phone.
  assert.ok(len(content.ui.closeEnoughHint.en) <= 22, 'closeEnoughHint en is short');
  assert.ok(len(content.ui.closeEnoughHint.zh) <= 8, 'closeEnoughHint zh is short');
  // The lot line says it was a lot, in both languages.
  assert.match(content.ui.matchTieLot.en, /lot/);
  assert.match(content.ui.matchTieLot.zh, /抽签/);
});

test('app.js: the share link carries the seed', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(appSource, /'\?from=' \+ encodeURIComponent\(typeId\) \+ '&seed=' \+ encodeURIComponent\(state\.seed\)/);
  assert.match(appSource, /'&lang=' \+ state\.lang/);
});

// ---------- the statement bank ----------
test('content.js: every statement has a band, and no statement has a flag or a level', () => {
  content.statements.forEach((s) => {
    assert.ok(STATEMENT_BANDS.includes(s.band), s.id + ' band');
    assert.strictEqual(s.flag, undefined, s.id + ' still has a flag');
    assert.ok(!('level' in s), s.id + ' still has a level');
  });
});

test('content.js: the original 50 keep their ids, and their bands follow the old levels', () => {
  // s01-s50 were ten per dimension, levels 1-10 in id order:
  // levels 1-4 -> mild, 5-7 -> medium, 8-10 -> extreme.
  const byId = Object.fromEntries(content.statements.map((s) => [s.id, s]));
  for (let n = 1; n <= 50; n++) {
    const id = 's' + String(n).padStart(2, '0');
    const s = byId[id];
    if (!s) continue; // a statement the editor dropped on purpose
    const level = ((n - 1) % 10) + 1;
    const expected = level <= 4 ? 'mild' : (level <= 7 ? 'medium' : 'extreme');
    assert.strictEqual(s.dim, DIM_KEYS[Math.floor((n - 1) / 10)], id + ' dim');
    // A dimension with a surplus may move a statement to a neighbouring band.
    if (s.band !== expected) assert.ok(Math.abs(STATEMENT_BANDS.indexOf(s.band) - STATEMENT_BANDS.indexOf(expected)) === 1, id + ' moved more than one band');
  }
});

test('content.js: a draw is possible (at least 2 per stratum); unequal strata are reported', () => {
  const report = bankReport(content);
  DIM_KEYS.forEach((dim) => STATEMENT_BANDS.forEach((band) => {
    assert.ok(report.sizes[dim][band] >= 2, dim + '/' + band + ' has ' + report.sizes[dim][band]);
  }));
  if (report.full) {
    // The finished bank: 7 per stratum, 105 statements, strictly valid.
    assert.strictEqual(report.total, 105);
    assert.deepStrictEqual(validateContent(content, { strict: true }).filter((p) => /statements/.test(p)), []);
  } else {
    // Still being filled: allowed, but the editor must be warned, because a
    // statement in a smaller stratum is shown more often.
    assert.ok(report.total < 105, 'a bank of 105 or more must be exactly 7 per stratum');
    if (!report.equal) assert.ok(report.warnings.some((w) => /different sizes/.test(w)));
    assert.ok(report.warnings.length > 0);
  }
  // Never more than the target in any stratum.
  DIM_KEYS.forEach((dim) => STATEMENT_BANDS.forEach((band) => {
    assert.ok(report.sizes[dim][band] <= BANK_PER_STRATUM, dim + '/' + band + ' is over ' + BANK_PER_STRATUM);
  }));
});

test('content.js: all 14 types are reachable on real draws', () => {
  // Random band counts (0-2 per stratum) on random draws of the real bank,
  // from a fixed generator so a failure can be replayed.
  const next = makeGenerator('content-test-reach');
  const found = {};
  for (let n = 0; n < 50000 && Object.keys(found).length < TYPE_IDS.length; n++) {
    const seed = 'r' + String(n).padStart(5, '0');
    const drawn = drawStatements(content, seed);
    const heaviness = randomBelow(next, 4); // vary how much a player admits
    const counts = {};
    DIM_KEYS.forEach((dim) => {
      counts[dim] = STATEMENT_BANDS.map(() => Math.min(2, randomBelow(next, 3 + heaviness) >> (heaviness > 1 ? 0 : 1)));
    });
    // Now and then a full Bond section, so the hidden rule gets tried.
    if (randomBelow(next, 8) === 0) counts.bond = [2, 2, 2];
    const ticked = admitByCounts(content, drawn, counts);
    const typeId = score(ticked, content, drawn).typeId;
    if (!found[typeId]) found[typeId] = { seed, ticked };
  }
  const missing = TYPE_IDS.filter((id) => !found[id]);
  assert.deepStrictEqual(missing, [], 'unreachable types: ' + missing.join(', '));
  // Double-check each example really scores as that type.
  TYPE_IDS.forEach((id) => {
    const drawn = drawStatements(content, found[id].seed);
    assert.strictEqual(score(found[id].ticked, content, drawn).typeId, id);
  });
});

// ---------- fit on the question card ----------
// These two checks are estimates, calibrated against Chrome measurements of
// every statement in the real card (360 px phone and 1280 px laptop). They
// exist so a line that is too long cannot slip back in unnoticed; the real
// check is still a look in a browser.

// English: the card is sized for 3 lines on a laptop and 4 on a 360 px phone.
// text-wrap: balance evens lines out but keeps the line count of plain greedy
// wrapping, so a greedy wrap with rough letter widths (in em) predicts it.
// Capacities: 14.3 em per line at 1280 px and 11.0 at 360 px matched the
// measured line count of every statement; the test uses a little less.
function enWidth(text) {
  return Array.from(text).reduce((sum, ch) => {
    if (ch === ' ') return sum + 0.27;
    if (/[iljtf'’.,:;!|I]/.test(ch)) return sum + 0.3;
    if (/[rs“”"\-‑()]/.test(ch)) return sum + 0.42;
    if (/[mwMW]/.test(ch)) return sum + 0.85;
    if (/[A-Z]/.test(ch)) return sum + 0.66;
    return sum + 0.56;
  }, 0);
}
function enLines(text, capacity) {
  // app.js turns "AI-written" into one unbreakable word (non-breaking hyphen)
  const words = text.replace(/(\w)-(\w)/g, '$1‑$2').split(' ');
  let lines = 1;
  let current = 0;
  words.forEach((word) => {
    const width = enWidth(word);
    if (current === 0) current = width;
    else if (current + 0.27 + width <= capacity) current += 0.27 + width;
    else { lines++; current = width; }
  });
  return lines;
}

test('content.js: every English statement fits the card (3 lines on a laptop, 4 on a 360 px phone)', () => {
  const tooLong = content.statements
    .filter((s) => enLines(s.text.en, 14.0) > 3 || enLines(s.text.en, 10.7) > 4)
    .map((s) => s.id + ' (' + s.text.en.length + ' chars): ' + s.text.en);
  assert.deepStrictEqual(tooLong, [], 'shorten these (about 80 characters is the most that fits)');
});

// Chinese: the card only breaks lines where statementPieces (app.js) allows,
// so each run between two break points must fit one 360 px line, or the
// browser breaks inside it and the next line can start with a "，".
// A 360 px line holds 11 Chinese characters but not 12; "AI" and the
// no-break spaces around it are narrower.
test('content.js: in Chinese, every run between break points fits one phone line', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const NO_LINE_START = eval(appSource.match(/const NO_LINE_START = (\/.*\/);/)[1]);
  const ZH_BREAK_AFTER = eval(appSource.match(/const ZH_BREAK_AFTER = (\/.*\/);/)[1]);
  // Same rules as statementPieces, without the DOM.
  function runs(text) {
    const chars = Array.from(text);
    const out = [];
    let run = '';
    let inQuote = false;
    chars.forEach((ch, i) => {
      if (ch === '「') { if (run) { out.push(run); run = ''; } inQuote = true; }
      if (ch === '」') inQuote = false;
      run += ch;
      const next = chars[i + 1];
      const afterNext = chars[i + 2] || '';
      if (next && !inQuote && ZH_BREAK_AFTER.test(ch) && !NO_LINE_START.test(next) &&
          !/\s/.test(next) && !NO_LINE_START.test(afterNext)) { out.push(run); run = ''; }
    });
    if (run) out.push(run);
    return out;
  }
  const width = (s) => Array.from(s).reduce((sum, ch) => sum + (/\s/.test(ch) ? 0.25 : /[\x21-\x7e]/.test(ch) ? 0.5 : 1), 0);
  const tooLong = [];
  content.statements.forEach((s) => runs(s.text.zh).forEach((run) => {
    if (width(run) > 11.5) tooLong.push(s.id + ': 「' + run + '」 is ' + width(run) + ' wide');
  }));
  // The two lines that once broke before a comma on a phone would fail here.
  assert.ok(runs('聊到一半直接关掉对话框，没说再见').some((r) => width(r) > 11.5));
  assert.ok(runs('课上有个词一直不懂装懂，最后偷偷问了 AI').some((r) => width(r) > 11.5));
  assert.deepStrictEqual(tooLong, [], 'add a break point (a comma) or shorten these clauses');
});
