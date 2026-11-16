// The purity figure on the question screen: the stage table (extras.js), the
// drawing (art-src/c/out/purity-figure.svg, packed into art.js) and how app.js
// uses it. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const extras = require('../extras.js');
const pack = require('../tools/pack-art.js');

const ROOT = path.join(__dirname, '..');
const { FIGURE_STAGES, figureState, figureChange } = extras;
const PARTS = FIGURE_STAGES.map((s) => s.part);
// Every purity a play can show: round(100 * (1 - admitted / 30)).
const PURITIES = Array.from({ length: 31 }, (_, k) => Math.round(100 * (1 - k / 30)));

test('figure stages: one table, highest first, every threshold a purity a play can reach', () => {
  assert.deepStrictEqual(FIGURE_STAGES.map((s) => s.at), [97, 90, 80, 70, 60, 50, 40, 33, 17, 3]);
  assert.deepStrictEqual(PARTS, ['ant', 'eyeL', 'armR', 'eyeR', 'mouth', 'head', 'body', 'armL', 'legs', 'lights']);
  FIGURE_STAGES.forEach((s) => assert.ok(PURITIES.includes(s.at), s.at + ' is reachable'));
  assert.strictEqual(new Set(PARTS).size, PARTS.length);
});

test('figure state: the right parts for any purity value', () => {
  assert.deepStrictEqual(figureState(100), []);
  assert.deepStrictEqual(figureState(97), ['ant']);
  assert.deepStrictEqual(figureState(63), ['ant', 'eyeL', 'armR', 'eyeR']);
  assert.deepStrictEqual(figureState(50), ['ant', 'eyeL', 'armR', 'eyeR', 'mouth', 'head']);
  assert.deepStrictEqual(figureState(0), PARTS);
  // Not a number: a fresh, human figure.
  [undefined, null, '', 'x', NaN].forEach((v) => assert.deepStrictEqual(figureState(v), []));
  for (let p = 0; p <= 100; p += 0.5) {
    assert.deepStrictEqual(figureState(p), FIGURE_STAGES.filter((s) => p <= s.at).map((s) => s.part), String(p));
  }
});

test('figure state: on the way down each stage is reached exactly once, and one admission crosses at most one', () => {
  const seen = {};
  let before = figureState(PURITIES[0]);
  for (let k = 1; k < PURITIES.length; k++) {
    const now = figureState(PURITIES[k]);
    before.forEach((p) => assert.ok(now.includes(p), p + ' never turns back on the way down'));
    const added = now.filter((p) => !before.includes(p));
    assert.ok(added.length <= 1, 'one admission, at most one stage (k=' + k + ')');
    added.forEach((p) => { seen[p] = (seen[p] || 0) + 1; });
    const change = figureChange(PURITIES[k - 1], PURITIES[k]);
    assert.strictEqual(change.kind, added.length ? 'scan' : 'react');
    assert.deepStrictEqual(change.add, added);
    assert.deepStrictEqual(change.remove, []);
    before = now;
  }
  PARTS.forEach((p) => assert.strictEqual(seen[p], 1, p + ' reached once'));
  // The first admission already changes something.
  assert.strictEqual(figureChange(100, 97).kind, 'scan');
});

test('figure state: going back restores the earlier state; no change means nothing happens', () => {
  for (let k = 1; k < PURITIES.length; k++) {
    const back = figureChange(PURITIES[k], PURITIES[k - 1]);
    assert.deepStrictEqual(figureState(PURITIES[k - 1]), figureState(PURITIES[k]).filter((p) => !back.remove.includes(p)));
    assert.deepStrictEqual(back.add, []);
    assert.ok(back.kind === 'scan' || back.kind === 'none');
  }
  // A long jump back (several stages) and forward again ends where it started.
  assert.deepStrictEqual(figureChange(17, 90).remove, ['armR', 'eyeR', 'mouth', 'head', 'body', 'armL', 'legs']);
  assert.deepStrictEqual(figureChange(63, 63), { add: [], remove: [], kind: 'none' });
});

test('figure drawing: both forms of every part, the accent only on machine parts and the scan line, no text', () => {
  const svg = fs.readFileSync(path.join(ROOT, 'art-src', 'c', 'out', pack.FIGURE_FILE), 'utf8');
  assert.deepStrictEqual(pack.checkFigure(pack.normalizeSvg(svg)), []);
  PARTS.filter((p) => p !== 'lights').forEach((p) => {
    assert.ok(svg.includes('data-p="' + p + '" data-f="m"'), p + ' machine form');
    if (p !== 'ant') assert.ok(svg.includes('data-p="' + p + '" data-f="h"'), p + ' human form');
  });
  assert.strictEqual((svg.match(/class="pf-light"/g) || []).length, 2, 'two eye lights');
  ['pf-clip-new', 'pf-clip-old', 'pf-scan', 'id="pf-new"', 'id="pf-old"'].forEach((k) => assert.ok(svg.includes(k), k));
  assert.doesNotMatch(svg, /<text|<tspan|font-family/);
  // The accent appears only inside machine groups and the scan line.
  const accent = (svg.match(/const ACCENT = '([^']+)'/) || [])[1] || '#3A7BFF';
  const human = svg.split(/<g data-p="[a-zA-Z]+" data-f="h">/).slice(1).map((chunk) => chunk.split(/<g data-p=|<g class="pf-scan"/)[0]);
  human.forEach((chunk) => assert.ok(!chunk.includes(accent), 'no accent on a human part'));
  assert.ok(svg.includes(accent));
  // art.js carries it as APT_FIGURE, up to date.
  const sandbox = {}; sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'art.js'), 'utf8'), sandbox);
  assert.strictEqual(sandbox.APT_FIGURE, pack.normalizeSvg(svg), 'run `node tools/pack-art.js`');
});

test('figure in app.js: decorative, follows the purity, animated only on an answer, never blocking', () => {
  const app = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  assert.match(app, /svg\.setAttribute\('aria-hidden', 'true'\);/);
  assert.match(app, /const FIG = \{ scan: (\d+), settle: (\d+), react: (\d+) \};/);
  const [, scan, settle, react] = app.match(/const FIG = \{ scan: (\d+), settle: (\d+), react: (\d+) \};/).map(Number);
  assert.ok(scan + settle >= 400 && scan + settle <= 500, 'about 450 ms');
  assert.ok(react <= 200);
  assert.match(app, /if \(onQuestion\) syncFigure\(opts\.figure\);/);
  assert.match(app, /render\(\{ moveFocus: true, enter: enter, figure: way === 'next' \? 'animate' : 'instant' \}\);/);
  assert.match(app, /if \(fig\.shown === null \|\| mode !== 'animate' \|\| reducedMotion\(\)\) \{/);
  assert.match(app, /if \(change\.kind === 'scan'\) \{\s*stopFigure\(\);\s*scanFigure\(fig\.shown, target\);/);
  // A scan always ends in its end state, even if cut short.
  assert.match(app, /line\.oncancel = \(\) => done\(false\);/);
  assert.match(app, /fig\.timers\.push\(setTimeout\(\(\) => done\(false\), FIG\.scan \+ 200\)\);/);
  // No idle loop: no interval and no requestAnimationFrame for the figure.
  const block = app.slice(app.indexOf('// ---------- The purity figure ----------'), app.indexOf("// ---------- The AI's remarks while answering"));
  assert.doesNotMatch(block, /setInterval|requestAnimationFrame|iterations/);
});
