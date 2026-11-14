// Run with: node --test tests/
// The seed and the draw: makeSeed, normalizeSeed, drawStatements.
// Every play shows 30 statements: in each dimension 2 mild, 2 medium and
// 2 extreme, the ten mild ones first, then the medium, then the extreme.
// (tests/fairness.test.js checks that the draw has no favourites.)
const test = require('node:test');
const assert = require('node:assert');
const {
  makeSeed, normalizeSeed, drawStatements, strataOf, randomBelow, makeGenerator,
  DIM_KEYS, STATEMENT_BANDS, DRAW_SIZE, SEED_LENGTH, SEED_ALPHABET
} = require('../scoring.js');
const { syntheticContent, seedStream } = require('../tools/sim-helpers.js');

require('../content.js');
const realContent = globalThis.APT_CONTENT;
const fullContent = syntheticContent(7);

// Checks that `drawn` is a valid play for `content`.
function assertValidDraw(content, drawn, label) {
  const byId = Object.fromEntries(content.statements.map((s) => [s.id, s]));
  assert.strictEqual(drawn.length, DRAW_SIZE, label + ': 30 statements');
  assert.strictEqual(new Set(drawn).size, DRAW_SIZE, label + ': no statement twice');
  drawn.forEach((id) => assert.ok(byId[id], label + ': unknown id ' + id));
  // Escalating: places 0-9 mild, 10-19 medium, 20-29 extreme.
  drawn.forEach((id, i) => {
    assert.strictEqual(byId[id].band, STATEMENT_BANDS[Math.floor(i / 10)], label + ': band at place ' + i);
  });
  // Two of every stratum, so six per dimension.
  DIM_KEYS.forEach((dim) => {
    assert.strictEqual(drawn.filter((id) => byId[id].dim === dim).length, 6, label + ': six ' + dim);
    STATEMENT_BANDS.forEach((band) => {
      const n = drawn.filter((id) => byId[id].dim === dim && byId[id].band === band).length;
      assert.strictEqual(n, 2, label + ': two ' + dim + '/' + band);
    });
  });
}

// ---------- seeds ----------
test('makeSeed: six characters of 0-9 and a-z, and normalizeSeed accepts it', () => {
  assert.strictEqual(SEED_LENGTH, 6);
  for (let i = 0; i < 500; i++) {
    const seed = makeSeed();
    assert.match(seed, /^[0-9a-z]{6}$/);
    assert.strictEqual(normalizeSeed(seed), seed);
  }
});

test('makeSeed: 500 fresh seeds are all different', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(makeSeed());
  assert.strictEqual(seen.size, 500);
});

test('makeSeed: maps bytes evenly, skipping bytes 252-255 (no modulo bias)', () => {
  // A fake random source that hands out the bytes we choose.
  const fake = (bytesList) => {
    let k = 0;
    return (bytes) => { for (let i = 0; i < bytes.length; i++) bytes[i] = bytesList[k++ % bytesList.length]; };
  };
  assert.strictEqual(makeSeed(fake([0, 1, 35, 36, 251, 71])), '01z0zz');
  // 252..255 would map to 0..3 a second time, so they are thrown away.
  assert.strictEqual(makeSeed(fake([252, 253, 254, 255, 10])), 'aaaaaa');
  // Every byte 0..251 is used, and each character comes from exactly 7 of them.
  const perChar = {};
  for (let b = 0; b < 252; b++) {
    const c = makeSeed(fake([b]))[0];
    perChar[c] = (perChar[c] || 0) + 1;
  }
  assert.strictEqual(Object.keys(perChar).length, 36);
  Object.values(perChar).forEach((n) => assert.strictEqual(n, 7));
  assert.throws(() => makeSeed(fake([255])), /no usable bytes/);
});

test('normalizeSeed: trims and lower-cases; anything else is null (the app then makes a fresh seed)', () => {
  assert.strictEqual(normalizeSeed(' K3X9Q0 '), 'k3x9q0');
  ['', 'abc', 'abcdefg', 'abc-12', 'abc 12', 'äbc123', null, undefined, 123456, {}].forEach((bad) => {
    assert.strictEqual(normalizeSeed(bad), null, JSON.stringify(bad));
  });
  assert.strictEqual(SEED_ALPHABET.length, 36);
});

// ---------- random building blocks ----------
test('randomBelow: never out of range, and uses rejection for the incomplete top block', () => {
  const next = makeGenerator('test');
  for (let n = 1; n <= 21; n++) {
    for (let i = 0; i < 200; i++) {
      const x = randomBelow(next, n);
      assert.ok(Number.isInteger(x) && x >= 0 && x < n);
    }
  }
  // A source that first returns a value from the top block (rejected), then 5.
  const values = [4294967295, 5];
  assert.strictEqual(randomBelow(() => values.shift(), 7), 5);
});

test('makeGenerator: same label same stream, different label different stream', () => {
  const a = makeGenerator('apt-draw-v1|abc123'), b = makeGenerator('apt-draw-v1|abc123'), c = makeGenerator('apt-draw-v1|abc124');
  const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()];
  assert.deepStrictEqual(sa, sb);
  assert.notDeepStrictEqual(sa, sc);
});

// ---------- the draw ----------
[['real content.js', realContent], ['full-size bank', fullContent]].forEach(([label, content]) => {
  test('drawStatements (' + label + '): 2,000 seeds give valid, escalating, repeatable draws', () => {
    const seeds = seedStream('draw-test|' + label);
    const distinct = new Set();
    for (let i = 0; i < 2000; i++) {
      const seed = seeds();
      const drawn = drawStatements(content, seed);
      assertValidDraw(content, drawn, label + ' seed ' + seed);
      assert.deepStrictEqual(drawStatements(content, seed), drawn, 'same seed, same draw');
      distinct.add(drawn.join(','));
    }
    // Different seeds give different draws (a repeat among 2,000 would be
    // astronomically unlikely for either bank).
    assert.strictEqual(distinct.size, 2000);
  });
});

test('drawStatements: does not change the content, and ignores the order of content.js', () => {
  const before = JSON.stringify(fullContent);
  const drawn = drawStatements(fullContent, 'k3x9q0');
  assert.strictEqual(JSON.stringify(fullContent), before);
  const shuffledFile = Object.assign({}, fullContent, { statements: fullContent.statements.slice().reverse() });
  assert.deepStrictEqual(drawStatements(shuffledFile, 'k3x9q0'), drawn);
  // strataOf sorts by id number, so s100 comes after s99.
  const strata = strataOf(fullContent);
  assert.deepStrictEqual(strata.bond.extreme.map((s) => s.id), ['s99', 's100', 's101', 's102', 's103', 's104', 's105']);
});

test('drawStatements: with exactly 2 in a stratum, both are always shown', () => {
  const small = syntheticContent(2);
  const drawn = drawStatements(small, 'abc123');
  assertValidDraw(small, drawn, 'bank of 2 per stratum');
  assert.deepStrictEqual(new Set(drawn), new Set(small.statements.map((s) => s.id)));
});

test('drawStatements: a stratum with fewer than 2 statements throws a clear error', () => {
  const broken = syntheticContent(7);
  broken.statements = broken.statements.filter((s) => !(s.dim === 'heart' && s.band === 'extreme')).concat(
    [{ id: 's200', dim: 'heart', band: 'extreme', text: { en: 'x', zh: 'x' } }]);
  assert.throws(() => drawStatements(broken, 'abc123'), /"heart" has only 1 extreme statement/);
});

test('drawStatements: a fixed seed gives a fixed draw (changing the draw breaks share links: do it on purpose)', () => {
  // If this fails, the draw algorithm changed: every existing share link now
  // shows different statements. Bump the 'apt-draw-v1' label in scoring.js
  // if that is intended, then update this list.
  // (The real-bank list also changes when statements are added; that is
  // expected while the bank is being filled: update it then.)
  if (realContent.statements.length === 50) {
    assert.deepStrictEqual(drawStatements(realContent, 'abc123'), [
      's21', 's32', 's41', 's22', 's12', 's02', 's01', 's33', 's44', 's14',
      's35', 's17', 's16', 's05', 's06', 's37', 's27', 's26', 's45', 's46',
      's39', 's20', 's18', 's09', 's28', 's30', 's50', 's48', 's08', 's40']);
  }
  assert.deepStrictEqual(drawStatements(fullContent, '000000'), [
    's27', 's45', 's67', 's28', 's01', 's85', 's86', 's44', 's07', 's68',
    's92', 's52', 's32', 's51', 's14', 's34', 's74', 's96', 's75', 's08',
    's21', 's36', 's104', 's78', 's61', 's15', 's101', 's42', 's60', 's84']);
});
