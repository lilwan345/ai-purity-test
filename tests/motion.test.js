// Moving between statements (app.js MOTION / stepTo, styles.css keyframes).
// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');

function fn(name) {
  const m = app.match(new RegExp('function ' + name + '\\(([^)]*)\\) \\{([\\s\\S]*?)\\n {2}\\}'));
  assert.ok(m, name + ' exists');
  return m[2];
}

test('motion: the whole change takes about 300 ms or less', () => {
  const m = app.match(/const MOTION = \{([^}]*)\};/);
  assert.ok(m);
  const motion = Object.fromEntries(m[1].split(',').map((p) => p.split(':').map((x) => x.trim())).map(([k, v]) => [k, Number(v)]));
  Object.entries(motion).forEach(([k, v]) => assert.ok(v > 0 && v <= 300, k + ' is ' + v + ' ms'));
  // The CSS durations match.
  [['card-leave-yes', motion.leave], ['card-leave-no', motion.leave], ['card-rise', motion.enter], ['card-recede', motion.leave]]
    .forEach(([name, ms]) => assert.match(css, new RegExp('animation: ' + name + ' ' + ms + 'ms')));
  assert.match(css, /animation: card-leave-unsure (\d+)ms/);
  assert.ok(Number(css.match(/animation: card-leave-unsure (\d+)ms/)[1]) <= 300);
  assert.match(css, /\.q-bar span\.is-moving \{ animation: bar-move 300ms/);
});

test('motion: an answer is recorded and the next statement drawn at once, input is never held up', () => {
  const ans = fn('answer');
  // busy only around a remark's hold and the hand-over to the result.
  assert.match(ans, /busy = true;\s*pressAnswer\(value\);\s*if \(!inPlayoff && maybeRemark\(state\.index, value\)\) \{\s*updateLive\(\);\s*return;\s*\}\s*busy = false;/);
  assert.match(ans, /state\.index = next;\s*stepTo\('next', value, true\);/);
  assert.doesNotMatch(ans.split('if (next === null)')[1].split('return;\n    }')[1] || '', /setTimeout/, 'no timer before the next statement');
  // A double tap on a button is one answer; keys are never limited.
  assert.match(ans, /if \(tapped\) \{\s*const now = performance\.now\(\);\s*if \(now - lastTapAt < DOUBLE_TAP_MS\) return;/);
  assert.match(app, /onclick: \(\) => answer\(value, true\)/);
  assert.match(app, /if \(!event\.repeat\) answer\('yes'\);/);
});

test('motion: forward, back and the end of a hold all go through stepTo; reduced motion just swaps', () => {
  assert.match(fn('goBack'), /stepTo\('prev', given, false\);/);
  assert.match(fn('endHoldOnTime'), /stepTo\('next', 'yes', false\);/);
  assert.match(fn('onHoldEvent'), /if \(back\) render\(\{ moveFocus: true, enter: 'swap' \}\);\s*else stepTo\('next', 'yes', false\);/);
  const step = fn('stepTo');
  assert.match(step, /const enter = reduce \? 'swap' : \(way === 'next' \? 'rise' : 'return-' \+ \(value \|\| 'no'\)\);/);
  assert.match(step, /if \(reduce \|\| state\.screen !== 'question'\) return;/);
  // The old card becomes a ghost: no ids, not focusable, hidden from screen readers.
  assert.match(step, /oldCard\.setAttribute\('aria-hidden', 'true'\);/);
  assert.match(step, /n\.removeAttribute\('id'\); n\.removeAttribute\('data-focus'\); n\.removeAttribute\('tabindex'\);/);
  // It is always removed, even if no animation runs.
  assert.match(step, /oldCard\.addEventListener\('animationend', drop, \{ once: true \}\);\s*setTimeout\(drop,/);
});

test('motion: only transform and opacity are animated in the card, button, bar and number motion', () => {
  const names = ['card-leave-yes', 'card-leave-no', 'card-leave-unsure', 'card-recede', 'card-rise', 'card-return-yes',
    'card-return-no', 'card-return-unsure', 'btn-release', 'btn-flash', 'bar-move'];
  names.forEach((name) => {
    const m = css.match(new RegExp('@keyframes ' + name + ' \\{([\\s\\S]*?)\\}\\s*\\}|@keyframes ' + name + ' \\{([^\\n]*)\\}'));
    assert.ok(m, name);
    const body = m[1] || m[2];
    const props = (body.match(/([a-z-]+)\s*:/g) || []).map((p) => p.replace(/\s*:$/, ''));
    assert.ok(props.length > 0, name + ' animates something');
    props.forEach((p) => assert.ok(p === 'transform' || p === 'opacity', name + ' animates ' + p));
  });
  // The purity roll (Web Animations) and the bar's scaleX.
  const roll = fn('rollNumber');
  (roll.match(/\{ transform: [^}]*\}/g) || []).forEach((k) => assert.doesNotMatch(k.replace(/transform: '[^']*'|opacity: [\d.]+|offset: [\d.]+/g, ''), /[a-z]+:/));
  assert.match(app, /style: 'transform:scaleX\(' \+ frac\(state\.index\) \+ '\)'/);
  assert.doesNotMatch(css, /@keyframes bar-move \{ from \{ width/);
});
