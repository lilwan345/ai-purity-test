// Run with: node --test tests/
// A faster copy of tools/fairness.js (20,000 seeds instead of 200,000), so a
// change that gives the draw or the judging a favourite fails the tests.
// The seeds come from a fixed stream, so the result is the same every run.
// Each check fails at p < 0.001 (Bonferroni-corrected where it combines
// several tests); the controls below prove the checks are sharp enough to
// catch real mistakes at this size.
const test = require('node:test');
const assert = require('node:assert');
const { runFairness, runControls } = require('../tools/fairness.js');
const { syntheticContent } = require('../tools/sim-helpers.js');

require('../content.js');
const N = 20000;

function describe(res) {
  return res.checks.map((c) => '(' + c.id + ') ' + (c.pass ? 'pass' : 'FAIL') + ' p=' + c.adjustedP.toExponential(2) +
    '\n    ' + c.lines.join('\n    ')).join('\n');
}

// The draw depends only on the seed and the stratum sizes, so the two runs
// use different seed streams; otherwise the second would repeat the first.
[['real content.js', () => globalThis.APT_CONTENT, 'unit-test'],
  ['synthetic bank (7 per stratum)', () => syntheticContent(7), 'unit-test-synthetic']]
  .forEach(([label, getContent, seedLabel]) => {
    test('fairness (' + label + '): checks (a) to (g) over ' + N.toLocaleString('en-US') + ' seeds', () => {
      const res = runFairness(getContent(), { n: N, label: seedLabel });
      assert.deepStrictEqual(res.checks.map((c) => c.id), ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      assert.ok(res.ok, describe(res));
      // (f) in plain numbers: each section's lite share, deep share and lot
      // wins stay within a generous band around their average.
      const f = res.checks.find((c) => c.id === 'f').shares;
      ['lite', 'deep'].forEach((kind) => {
        const mean = f[kind].reduce((s, x) => s + x, 0) / 5;
        f[kind].forEach((x) => assert.ok(Math.abs(x / mean - 1) < 0.15, kind + ' share ' + x + ' vs mean ' + mean));
      });
      f.lotWins.forEach((w) => assert.ok(Math.abs(w / (f.lotTotal / 5) - 1) < 0.2, 'lot wins ' + f.lotWins));
      assert.ok(f.hidden > 0.002 && f.hidden < 0.03, 'hidden type share ' + f.hidden);
      // (g) the play-off: the draw of the 30 is unchanged, no play-off
      // statement repeats one of the 30, every pair wins about half.
      const g = res.checks.find((c) => c.id === 'g').playoff;
      assert.strictEqual(g.digestOk, true, 'the draw of the 30 is byte for byte the same');
      assert.strictEqual(g.shownAgain, 0);
      assert.ok(Math.abs(g.firstShare - 0.5) < 0.02, 'order coin ' + g.firstShare);
      g.pickShares.forEach((x) => assert.ok(Math.abs(x * 7 - 1) < 0.2, 'play-off pick share ' + x));
      assert.ok(g.settled > 0.5 * g.playoffs, 'most play-offs settle the tie');
    });
  });

test('fairness controls: every deliberately broken draw or judging is caught at this size', () => {
  const controls = runControls(syntheticContent(7), N);
  assert.strictEqual(controls.length, 6);
  controls.forEach((c) => assert.ok(c.caught, 'not caught: ' + c.name));
});
