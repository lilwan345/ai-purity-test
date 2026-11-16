// The question screen on large windows (styles.css, "The question screen on
// large windows"): it grows with --u from 900px, exactly today's size at
// 1280 x 800, capped at 1.5. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// The --u formula, evaluated for a window (vw and vh in px).
function unit(formula, w, h) {
  const m = formula.match(/clamp\(1px, min\(calc\(([\d.]+)vw \+ ([\d.]+)vh\), ([\d.]+)vw\), ([\d.]+)px\)/);
  assert.ok(m, 'the --u formula has the expected shape');
  const [a, b, c, cap] = m.slice(1).map(Number);
  return Math.max(1, Math.min(Math.min(a * w / 100 + b * h / 100, c * w / 100), cap));
}

function questionBlock() {
  const start = css.indexOf('/* ---------- The question screen on large windows');
  assert.ok(start > 0, 'the block exists');
  return css.slice(start);
}

test('question screen: --u is 1px at 1280 x 800, grows with the window and stops at 1.5px', () => {
  const block = questionBlock();
  const m = block.match(/body\.on-question \{\s*--u: ([^;]+);/);
  assert.ok(m);
  const f = m[1];
  assert.strictEqual(unit(f, 1280, 800), 1);
  assert.ok(Math.abs(unit(f, 1440, 900) - 1.125) < 1e-9);
  assert.ok(unit(f, 1408, 1300) > 1.3 && unit(f, 1408, 1300) < 1.4);
  assert.strictEqual(unit(f, 2560, 1440), 1.5);
  assert.strictEqual(unit(f, 3840, 2160), 1.5, 'never a poster');
  // Small or short windows stay at today's size.
  assert.strictEqual(unit(f, 1024, 768), 1);
  assert.strictEqual(unit(f, 1280, 700), 1);
});

test('question screen: every scaled rule lives under min-width 900px, so phones and tablets never change', () => {
  const block = questionBlock();
  // Every "body.on-question" rule in the block sits inside a 900px media query.
  const depth = [];
  let inside900 = 0;
  const re = /@media[^{]*\{|\{|\}/g;
  let mm;
  let count = 0;
  while ((mm = re.exec(block))) {
    if (mm[0].startsWith('@media')) { const is900 = /min-width: 900px/.test(mm[0]); depth.push(is900 ? 'm900' : 'media'); if (is900) inside900++; }
    else if (mm[0] === '{') depth.push('rule');
    else {
      const top = depth.pop();
      if (top === 'm900') inside900--;
    }
    if (mm[0] === '{') {
      const before = block.slice(Math.max(0, block.lastIndexOf('}', mm.index - 1) + 1), mm.index);
      if (/body\.on-question/.test(before)) { count++; assert.ok(inside900 > 0, 'inside min-width 900px: ' + before.trim().slice(0, 60)); }
    }
  }
  assert.ok(count >= 25, 'all the question-screen parts are covered (' + count + ' rules)');
  // The parts the brief names are all there.
  ['.q-card', '.q-text', '.q-dim', '.q-back', '.q-progress', '.q-count', '.q-purity-num', '.btn-answer', '.btn-unsure',
    '.answer-key', '.q-keys', '.q-playoff', '.ai-remark', '.ai-remark-tag', '.answer-tick']
    .forEach((s) => assert.ok(block.includes('body.on-question ' + s), s));
  // A little above the middle: free space above : below = 1 : 1.4.
  assert.match(block, /body\.on-question \.quiz::after \{ flex-grow: 1\.4; \}/);
});

test('question screen: the remark bubble\'s gaps follow the same unit', () => {
  assert.match(app, /const u = parseFloat\(getComputedStyle\(remarkNode\)\.fontSize\) \/ \(state\.lang === 'zh' \? 15 : 14\) \|\| 1;/);
  assert.match(app, /const side = room >= 200 \* u;/);
  assert.match(css, /body\.on-question \.ai-remark\.is-side \{\s*max-width: min\(var\(--room, 320px\), calc\(var\(--u\) \* 320\)\);/);
});
