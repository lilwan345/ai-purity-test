// The result reveal: its timeline and when it may play. The motion itself is
// checked in a real browser (frame by frame); these keep the numbers and the
// rules from drifting. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const R = eval('(' + src.match(/const REVEAL = (\{[\s\S]*?\n {2}\});/)[1] + ')');

test('reveal timeline: stages in order, the whole thing about 4.5 s', () => {
  // card lifted -> pen -> code -> impact -> words -> numbers -> settle -> the rest -> end
  const order = [R.beat, R.cardAt, R.drawAt, R.codeAt, R.impactAt, R.wordsAt, R.numbersAt, R.settleAt, R.restAt, R.end];
  for (let i = 1; i < order.length; i++) assert.ok(order[i] >= order[i - 1], 'stage ' + i + ' starts after the one before');
  assert.ok(R.end <= 4700, 'ends by about 4.5 s (' + R.end + ')');
  // The pen gets 1.6-2 s for the figure, and the fill strokes finish before the code comes.
  assert.ok(R.drawMs >= 1600 && R.drawMs <= 2000, 'drawing time ' + R.drawMs);
  assert.ok(R.drawAt + R.drawMs + R.fillMs <= R.codeAt, 'the figure is finished before the code lands');
  assert.ok(R.travelShare > 0 && R.travelShare < 0.4, 'the pen mostly draws, it does not mostly travel');
  // Impact: from about 2.5x down to size, the hit inside the slam.
  assert.strictEqual(R.codeFromScale, 2.5);
  assert.ok(R.codeMinFromScale > 1 && R.codeMinFromScale < R.codeFromScale);
  assert.ok(R.impactAt > R.codeAt && R.impactAt < R.codeAt + R.codeMs);
  assert.ok(R.knockDeg >= 2 && R.knockDeg <= 3, 'a 2-3 degree knock');
  // Numbers about 0.6 s, all before the card settles.
  assert.ok(R.numbersMs >= 500 && R.numbersMs <= 700);
  assert.ok(R.numbersAt + R.numbersMs <= R.settleAt + 60, 'numbers are done when the card settles');
  // The rest only after the card has (nearly) settled, 70-110 ms apart, a few blocks.
  assert.ok(R.restAt >= R.settleAt + R.settleMs * 0.5);
  assert.ok(R.restStep >= 70 && R.restStep <= 110);
  assert.ok(R.restAt + (R.restMax - 1) * R.restStep + R.restMs <= R.end + 20, 'the last block is in by the end');
  // Held up, a little larger, never huge.
  assert.ok(R.stageMaxScale > 1 && R.stageMaxScale <= 1.4);
});

test('reveal rules: only the last answer of a play asks for it, never with reduced motion', () => {
  // answer() is the only caller, and it passes reveal: !reduce.
  assert.strictEqual((src.match(/reveal: !reduce/g) || []).length, 1);
  assert.strictEqual((src.match(/render\([^)]*reveal:/g) || []).length, 1, 'no other render asks for a reveal');
  const ans = src.match(/function answer\(value\) \{([\s\S]*?)\n {2}\}/)[1];
  assert.match(ans, /const reduce = reducedMotion\(\);/);
  assert.match(ans, /if \(state\.index >= state\.drawn\.length - 1\) \{[\s\S]*?render\(\{ moveFocus: true, reveal: !reduce \}\)/);
  // render() starts it only on the player's own result (no preview, no reply link, no layer on top).
  assert.match(src, /if \(opts\.reveal && !state\.reply && layer === 'base' && state\.screen === 'result' && !state\.preview\) \{\s*startReveal\(/);
  // Any later render ends a reveal still playing (a language switch, say).
  assert.match(src, /function render\(options\) \{\s*const opts = options \|\| \{\};[\s\S]{0,200}finishReveal\(\);/);
});

test('reveal: a tap or a key skips to the end, and the end puts everything back', () => {
  const fn = src.match(/function startReveal\(section, typeId\) \{([\s\S]*?)\n {2}\}\n/)[1];
  assert.match(fn, /document\.addEventListener\('pointerdown', finish, true\)/);
  assert.match(fn, /document\.addEventListener\('keydown', onKey, true\)/);
  assert.match(fn, /timer = setTimeout\(finish, REVEAL\.end\)/);
  const fin = fn.match(/function finish\(\) \{([\s\S]*?)\n {4}\}/)[1];
  ['clearTimeout(timer)', 'cancelAnimationFrame(raf)', 'a.cancel()', 'extrasNodes.forEach((node) => node.remove())',
    "removeEventListener('pointerdown'", "removeEventListener('keydown'", "classList.remove('is-revealing')"].forEach((piece) => {
    assert.ok(fin.includes(piece), 'finish() does ' + piece);
  });
  // Counted-up numbers and the code's style attribute go back as they were.
  assert.match(fin, /restore\.forEach/);
  assert.match(fin, /restoreAttrs\.forEach/);
});
