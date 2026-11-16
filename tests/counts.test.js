// The public totals read back from GoatCounter, and the landing copy.
// Real numbers only: below a threshold or on any failure, nothing shows.
// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const scoring = require('../scoring.js');
const extras = require('../extras.js');
require('../content.js');
const content = globalThis.APT_CONTENT;
const { parseCount, finishToShow, rankingFrom, fetchCounts, counterUrl, counterPaths, readCountsCache, writeCountsCache } = extras;

test('parseCount: GoatCounter\'s formatted strings, and nothing odd', () => {
  assert.strictEqual(parseCount('1,234'), 1234);
  assert.strictEqual(parseCount('1 234'), 1234);
  assert.strictEqual(parseCount('1 234'), 1234);
  assert.strictEqual(parseCount('1 234'), 1234);
  assert.strictEqual(parseCount(' 87 '), 87);
  assert.strictEqual(parseCount(0), 0);
  assert.strictEqual(parseCount(42), 42);
  ['', '-3', '1.5', '12k', 'abc', null, undefined, {}, [], -1, 2.5, NaN].forEach((v) => assert.strictEqual(parseCount(v), null, JSON.stringify(v)));
});

test('thresholds: the count line from 100 finished tests, the ranking from 200 results', () => {
  assert.strictEqual(finishToShow(99), null);
  assert.strictEqual(finishToShow(100), 100);
  assert.strictEqual(finishToShow(null), null);
  assert.strictEqual(extras.FINISH_MIN, 100);
  assert.strictEqual(extras.RANKING_MIN, 200);
  const counts = {};
  scoring.TYPE_IDS.forEach((id) => { counts['result:' + id] = 14; });  // 196
  assert.strictEqual(rankingFrom(counts), null, 'below 200: no ranking at all');
  counts['result:merged'] = 18;                                      // 200
  assert.ok(rankingFrom(counts));
});

test('rankingFrom: shares over the sum of the fourteen, ties in type order, a missing type is zero', () => {
  const counts = { 'result:heart_deep': 120, 'result:school_lite': 120, 'result:untouched': 60, 'result:balanced': 40, 'result:merged': 30,
    'result:brain_lite': 20, 'result:soulmate': 10, 'result:bond_lite': null };
  const r = rankingFrom(counts);
  assert.strictEqual(r.total, 400);
  // school_lite comes before heart_deep in scoring.TYPE_IDS, so it wins the tie.
  assert.deepStrictEqual(r.top.map((x) => x.typeId), ['school_lite', 'heart_deep', 'untouched', 'balanced', 'merged']);
  assert.deepStrictEqual(r.top.map((x) => x.share), [30, 30, 15, 10, 7.5]);
  assert.strictEqual(r.rows.length, 14);
  // The rare ones: the three least common, least first; missing types are 0 and keep type order.
  const zeros = scoring.TYPE_IDS.filter((id) => !counts['result:' + id]);
  assert.deepStrictEqual(r.rare.map((x) => x.typeId), zeros.slice(-3).reverse());
  r.rare.forEach((x) => assert.strictEqual(x.share, 0));
  // One decimal.
  const odd = { 'result:merged': 199, 'result:untouched': 2 };
  assert.deepStrictEqual(rankingFrom(odd).top.slice(0, 2).map((x) => x.share), [99, 1]);
  const third = { 'result:merged': 200, 'result:untouched': 100, 'result:balanced': 1 };
  assert.strictEqual(rankingFrom(third).top[0].share, 66.4);
});

function fakeResponse(status, body) {
  return { status, json: () => (body instanceof Error ? Promise.reject(body) : Promise.resolve(body)) };
}

test('fetchCounts: in parallel, plain GET with no cookies or Referer; 403, 404, odd values and timeouts are no data', async () => {
  const seen = [];
  const answers = {
    finish: fakeResponse(200, { count: '1,234' }),
    'result:merged': fakeResponse(403, {}),
    'result:untouched': fakeResponse(404, {}),
    'result:balanced': fakeResponse(200, { count: 'many' }),
    'result:soulmate': fakeResponse(200, new Error('not json')),
    'result:school_lite': 'never'
  };
  const stub = (url, opts) => {
    seen.push({ url, opts });
    const path = decodeURIComponent(url.slice(extras.COUNTER_BASE.length, -'.json'.length));
    const a = answers[path];
    if (a === 'never') return new Promise(() => {});
    if (!a) return Promise.reject(new Error('offline'));
    return Promise.resolve(a);
  };
  const started = Date.now();
  const out = await fetchCounts(counterPaths(), { fetch: stub, timeoutMs: 150 });
  assert.ok(Date.now() - started < 1000, 'all in parallel, bounded by the timeout');
  assert.strictEqual(seen.length, 15);
  seen.forEach((r) => {
    assert.strictEqual(r.opts.method, 'GET');
    assert.strictEqual(r.opts.credentials, 'omit');
    assert.strictEqual(r.opts.referrerPolicy, 'no-referrer');
    assert.match(r.url, /^https:\/\/leowan34\.goatcounter\.com\/counter\/[^?#]+\.json$/);
  });
  assert.strictEqual(out.finish, 1234);
  ['result:merged', 'result:untouched', 'result:balanced', 'result:soulmate', 'result:school_lite', 'result:heart_deep']
    .forEach((p) => assert.strictEqual(out[p], null, p));
  assert.strictEqual(counterUrl('result:heart_deep'), 'https://leowan34.goatcounter.com/counter/result%3Aheart_deep.json');
  // No fetch at all: no data, no error.
  const none = await fetchCounts(['finish'], {});
  assert.deepStrictEqual(none, { finish: null });
});

test('the device cache: an hour, only paths that were asked, and blocked storage is fine', () => {
  const data = {};
  const st = { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
  assert.strictEqual(readCountsCache(st, 1000), null);
  assert.ok(writeCountsCache(st, 1000, { finish: 150, 'result:merged': null }));
  assert.deepStrictEqual(readCountsCache(st, 1000 + 59 * 60 * 1000), { finish: 150, 'result:merged': null });
  assert.strictEqual(readCountsCache(st, 1000 + 61 * 60 * 1000), null, 'older than an hour');
  data[extras.COUNTS_CACHE_KEY] = '{"at":1000,"counts":{"finish":"lots","result:merged":-2}}';
  assert.deepStrictEqual(readCountsCache(st, 2000), { finish: null, 'result:merged': null });
  data[extras.COUNTS_CACHE_KEY] = 'not json';
  assert.strictEqual(readCountsCache(st, 2000), null);
  const blocked = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
  assert.strictEqual(readCountsCache(blocked, 1), null);
  assert.strictEqual(writeCountsCache(blocked, 1, {}), false);
  assert.strictEqual(writeCountsCache(null, 1, {}), false);
});

test('landing copy: every line in both languages, nine sections in order', () => {
  assert.deepStrictEqual(extras.validateLanding(content), []);
  const L = content.landing;
  ['ranking', 'about', 'why', 'who', 'how', 'types', 'names', 'compare', 'faq'].forEach((k) => assert.ok(L[k], k));
  assert.strictEqual(L.why.items.length, 3);
  assert.strictEqual(L.who.items.length, 4);
  assert.strictEqual(L.how.steps.length, 4);
  assert.strictEqual(L.compare.rows.length, 7);
  assert.strictEqual(L.faq.items.length, 6);
  scoring.DIM_KEYS.forEach((k) => assert.ok(L.about[k], 'about.' + k));
  // The count lines take the real number.
  assert.ok(L.count.en.includes('{n}') && L.count.zh.includes('{n}'));
  assert.ok(L.ranking.total.en.includes('{n}') && L.ranking.total.zh.includes('{n}'));
  const broken = JSON.parse(JSON.stringify(content));
  broken.landing.faq.items[0].a.zh = '';
  assert.strictEqual(extras.validateLanding(broken).length, 1);
});

test('app.js: the counts are read only on the real site, lazily, and nothing shows without enough data', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'app.js'), 'utf8');
  assert.match(src, /function publicCounts\(paths\) \{\s*if \(!extras\.statsAllowed\(location\)\) return Promise\.resolve\(null\);/);
  assert.match(src, /function readPublicCounts\(paths\) \{/);
  assert.match(src, /requestAnimationFrame\(\(\) => setTimeout\(run, 0\)\)/, 'the count line waits for the first paint');
  assert.match(src, /new IntersectionObserver/, 'the ranking waits until it is near');
  assert.match(src, /const ranking = el\('section', \{ class: 'lp-card lp-ranking', id: 'lp-ranking', hidden: true \}\);/, 'hidden until filled');
  assert.match(src, /extras\.finishToShow\(counts\.finish\)/);
});
