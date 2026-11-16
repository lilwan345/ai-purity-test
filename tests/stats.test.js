// Visit statistics: what may be sent, and only from the real site.
// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const scoring = require('../scoring.js');
const extras = require('../extras.js');
require('../content.js');
const content = globalThis.APT_CONTENT;
const { statUrl, sendStat, statsAllowed, statNameOk, externalOrigin, STAT_EVENTS, STAT_ENDPOINT } = extras;

const REAL = { protocol: 'https:', hostname: 'guiltyofai.vercel.app', search: '?seed=k3x9q0&vs=0a1b2c3d&re=9z8y7x6w&from=bond_deep' };
const ALL_NAMES = ['/'].concat(STAT_EVENTS, scoring.TYPE_IDS.map((id) => 'result:' + id));

test('stats: the event list is the fixed one', () => {
  assert.deepStrictEqual(STAT_EVENTS, [
    'start', 'finish', 'tiebreak', 'save-image', 'copy-link', 'challenge-made', 'challenge-opened',
    'compare-shown', 'reply-opened', 'new-questions', 'start-over', 'lang:en', 'lang:zh'
  ]);
  ALL_NAMES.forEach((name) => assert.ok(statNameOk(name), name));
  ['', 'result:', 'result:nope', 'result:s01', 's01', 'start?seed=x', 'k3x9q0', '/?seed=k3x9q0', 'purity:63', 'lang:fr', null, 42]
    .forEach((name) => {
      assert.strictEqual(statNameOk(name), false, String(name));
      assert.strictEqual(statUrl(name), null, String(name));
    });
});

test('stats: a request holds only p, t, e, s, r and rnd, never a query, an id, an answer or a seed', () => {
  const ids = content.statements.map((s) => s.id);
  ALL_NAMES.forEach((name) => {
    const url = statUrl(name, { screen: 390, referrer: name === '/' ? 'https://www.xiaohongshu.com' : 'https://x.example', rnd: 'ab12c' });
    assert.ok(url.startsWith(STAT_ENDPOINT + '?'), url);
    const q = new URL(url).searchParams;
    [...q.keys()].forEach((key) => assert.ok(['p', 't', 'e', 's', 'r', 'rnd'].includes(key), 'unexpected field ' + key));
    assert.strictEqual(q.get('p'), name);
    assert.strictEqual(q.get('s'), '390');
    assert.strictEqual(q.get('e'), name === '/' ? null : 'true');
    // A referrer only with the page view, and only as an origin.
    assert.strictEqual(q.get('r'), name === '/' ? 'https://www.xiaohongshu.com' : null);
    assert.doesNotMatch(url, /seed|vs=|re=|from=|k3x9q0/);
    ids.forEach((id) => assert.ok(!new RegExp('\\b' + id + '\\b').test(decodeURIComponent(url)), id + ' in ' + url));
  });
  // A referrer with a path or query is refused outright.
  assert.strictEqual(new URL(statUrl('/', { referrer: 'https://guiltyofai.vercel.app/?seed=k3x9q0' })).searchParams.get('r'), null);
});

test('stats: only the real site counts', () => {
  assert.strictEqual(statsAllowed(REAL), true);
  [
    { protocol: 'file:', hostname: '' },
    { protocol: 'http:', hostname: 'localhost' },
    { protocol: 'http:', hostname: '127.0.0.1' },
    { protocol: 'http:', hostname: 'guiltyofai.vercel.app' },
    { protocol: 'https:', hostname: 'lilwan345.github.io' },
    { protocol: 'https:', hostname: 'someone-else.github.io' },
    { protocol: 'https:', hostname: 'guiltyofai.vercel.app.evil.com' },
    null
  ].forEach((loc) => assert.strictEqual(statsAllowed(loc), false, JSON.stringify(loc)));
});

test('stats: sendStat hands one clean URL to the sender on the real site, nothing elsewhere, never throws', () => {
  const sent = [];
  const env = { location: REAL, referrer: 'https://guiltyofai.vercel.app/?seed=k3x9q0&vs=0a1b2c3d', screen: 1440, send: (u) => sent.push(u) };
  assert.strictEqual(sendStat('/', env), true);
  assert.strictEqual(sendStat('result:heart_deep', env), true);
  assert.strictEqual(sendStat('result:s07', env), false);
  assert.strictEqual(sent.length, 2);
  sent.forEach((u) => {
    assert.doesNotMatch(u, /seed|vs=|re=|from=|k3x9q0|0a1b2c3d/);
    assert.strictEqual(new URL(u).searchParams.get('r'), null, 'an internal referrer is never sent');
  });
  // An outside referrer goes as its origin only.
  sendStat('/', Object.assign({}, env, { referrer: 'https://www.xiaohongshu.com/explore/abc?x=1' }));
  assert.strictEqual(new URL(sent[2]).searchParams.get('r'), 'https://www.xiaohongshu.com');
  // Off the real site: nothing.
  const off = [];
  assert.strictEqual(sendStat('start', { location: { protocol: 'http:', hostname: 'localhost' }, send: (u) => off.push(u) }), false);
  assert.strictEqual(sendStat('start', { location: { protocol: 'file:', hostname: '' }, send: (u) => off.push(u) }), false);
  assert.deepStrictEqual(off, []);
  // A sender that throws, or none at all, is not an error.
  assert.strictEqual(sendStat('start', { location: REAL, send: () => { throw new Error('blocked'); } }), false);
  assert.strictEqual(sendStat('start', { location: REAL }), false);
  assert.strictEqual(externalOrigin('not a url', 'x'), '');
});

test('app.js: every count goes through track(), with a name from the list, and no third-party script is loaded', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const calls = [...src.matchAll(/\btrack\(([^)]*)\)/g)].map((m) => m[1]).filter((a) => !/^name, once$/.test(a));
  assert.ok(calls.length >= 15, 'found the call sites (' + calls.length + ')');
  calls.forEach((args) => {
    const m = /^'([^']+)'(?: \+ ([\w.]+))?(?:, '(play|load)')?$/.exec(args.trim());
    assert.ok(m, 'one plain call: track(' + args + ')');
    if (m[2]) {
      // Only result:<type id> and lang:<lang> are built, from the type id or the language.
      assert.ok((m[1] === 'result:' && m[2] === 'finished.typeId') || (m[1] === 'lang:' && m[2] === 'state.lang'), args);
    } else {
      assert.ok(statNameOk(m[1]), m[1] + ' is on the list');
    }
  });
  // Previews, peeks, the grid and reply links never send finish or result.
  const finishCalls = src.match(/track\('finish', 'play'\)/g) || [];
  assert.strictEqual(finishCalls.length, 1);
  const ans = src.match(/function answer\(value\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(ans, /track\('finish', 'play'\)/);
  assert.match(ans, /track\('result:' \+ finished\.typeId, 'play'\)/);
  // The only network code: sending through sendStat, and reading the public
  // totals back through extras.fetchCounts (a plain GET, no cookies, no
  // Referer). No GoatCounter script tag.
  assert.strictEqual((src.match(/\bfetch\(/g) || []).length, 2);
  assert.match(src, /extras\.fetchCounts\(missing, \{ fetch: \(url, opts\) => fetch\(url, opts\), timeoutMs: 4000 \}\)/);
  const ex = fs.readFileSync(path.join(__dirname, '..', 'extras.js'), 'utf8');
  assert.match(ex, /method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer'/);
  assert.match(src, /extras\.sendStat\(name, \{/);
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /goatcounter|gc\.zgo\.at/);
});

test('ui copy: the footer says what is counted and what a challenge link carries', () => {
  const f = content.ui.footer;
  assert.match(f.en, /counts visits/);
  assert.match(f.en, /never which statements/);
  assert.match(f.en, /challenge link/);
  assert.match(f.zh, /统计/);
  assert.match(f.zh, /不记录/);
  assert.match(f.zh, /挑战链接/);
});
