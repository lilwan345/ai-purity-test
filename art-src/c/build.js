// Style C: "margin doodles". Every character is one lumpy notebook-margin
// person drawn in a single wobbly navy marker line. The only "fill" is a loose
// white marker scribble behind the line, deliberately off-register, so the
// line reads on dark cards. One accent per drawing (yellow or pink), also
// scribbled. Each type changes what the person IS, not just what they wear.
//
// Run `node build.js` in this folder. It writes out/<type id>.svg for all 14
// types. Every character resets the seed first, so a rebuild is identical.
const fs = require('fs'), path = require('path');
const INK = '#1C2541', WHITE = '#FFFFFF', YEL = '#FFC83D', PINK = '#FF8FA8';
const OUT = path.join(__dirname, 'out');
let seed = 1;
const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const J = a => (R() * 2 - 1) * a;
const f = n => Math.round(n); // whole units: a marker line does not need tenths, and it keeps every file under 10 KB

// ---------- path helpers ----------
function curve(pts) { // open Catmull-Rom through pts -> cubic path
  if (pts.length < 3) return 'M' + pts.map(p => f(p[0]) + ',' + f(p[1])).join('L');
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}
// subdivide a polyline so straight runs get a little hand wobble
function sub(pts, n = 2, a = 1.2) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [a0, b0] = [pts[i - 1], pts[i]];
    for (let k = 1; k <= n; k++) {
      const t = k / n, p = [a0[0] + (b0[0] - a0[0]) * t, a0[1] + (b0[1] - a0[1]) * t];
      out.push(k === n ? p : [p[0] + J(a), p[1] + J(a)]);
    }
  }
  return out;
}
// closed blob polygon (for both outline and scribble)
function blob(cx, cy, rx, ry, n = 12, jit = 2, tilt = 0, shape = () => 1) {
  const pts = [], c = Math.cos(tilt), sn = Math.sin(tilt);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, k = shape(a) * (1 + J(jit / Math.max(rx, ry)));
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    pts.push([cx + x * c - y * sn, cy + x * sn + y * c]);
  }
  return pts;
}
// rotate points about (ox, oy)
const rot = (pts, ox, oy, a) => pts.map(([x, y]) => [ox + (x - ox) * Math.cos(a) - (y - oy) * Math.sin(a), oy + (x - ox) * Math.sin(a) + (y - oy) * Math.cos(a)]);
// outline of a closed polygon that overshoots its start, like a pen loop
function loopPath(poly, over = 2) {
  const s = Math.floor(R() * poly.length);
  const pts = [];
  for (let i = 0; i <= poly.length + over - 1; i++) {
    const p = poly[(s + i) % poly.length];
    const drift = i >= poly.length ? 3 : 0;
    pts.push([p[0] + J(1) + drift * 0.6, p[1] + J(1) - drift * 0.4]);
  }
  return curve(pts);
}
// white (or accent) marker scribble inside a polygon, off-register by (dx,dy)
function scribble(poly, { sp = 7.5, w = 9, ang = -0.5, dx = 3, dy = 2.5, col = WHITE, shrink = 2 } = {}) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const rp = poly.map(([x, y]) => [x * c + y * s, -x * s + y * c]);
  const ys = rp.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const zz = [];
  let flip = false;
  for (let y = y0 + sp * 0.45; y < y1 - sp * 0.3; y += sp) {
    const xs = [];
    for (let i = 0; i < rp.length; i++) {
      const [a, b] = [rp[i], rp[(i + 1) % rp.length]];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    if (xs.length < 2) continue;
    const L = Math.min(...xs) + shrink + J(2.5), Rr = Math.max(...xs) - shrink + J(2.5);
    if (Rr - L < 2) continue;
    if (flip) zz.push([Rr, y], [L, y + sp * 0.5]); else zz.push([L, y], [Rr, y + sp * 0.5]);
    flip = !flip;
  }
  if (!zz.length) return '';
  const back = zz.map(([x, y]) => [x * c - y * s + dx, x * s + y * c + dy]);
  return `<path d="M${back.map(p => f(p[0]) + ',' + f(p[1])).join('L')}" stroke="${col}" stroke-width="${w}"/>`;
}
const ink = (d, w) => `<path d="${d}"${w ? ` stroke-width="${w}"` : ''}/>`;
const line = (pts, w, n = 2, a = 1.2) => ink(curve(sub(pts, n, a)), w);
// a line with a white marker halo under it, so thin things (strings, cords,
// handles) survive on dark cards and at 64 px
function halo(pts, w = 4.5, hw = 10, n = 2, a = 1) {
  const d = curve(sub(pts, n, a));
  return `<path d="${d}" stroke="${WHITE}" stroke-width="${hw}"/>` + ink(d, w);
}
// On the dark cards navy limbs vanish, so there limbs and shoes get the white
// halo too. DARK is set per character from the card colour (see the bottom).
let DARK = false;
const limb = (pts, w = 6) => DARK ? halo(pts, w, w + 5) : line(pts, w);
const dot = (x, y, r = 4.6) => `<circle cx="${f(x + J(0.4))}" cy="${f(y + J(0.4))}" r="${r}" fill="${INK}" stroke="none"/>`;
function shape(poly, opts = {}) { // scribble + outline
  return (opts.noFill ? '' : scribble(poly, opts)) + ink(loopPath(poly, opts.over ?? 2), opts.w);
}
// accent-filled shape: tighter scribble, thinner outline
const fillShape = (poly, col, w = 4.5, sp = 4.5) => scribble(poly, { col, sp, w: sp + 2, dx: 1, dy: 1, shrink: 0.5 }) + ink(loopPath(poly, 1), w);

// ---------- hand-lettered glyphs (10 x 14 box) ----------
const G = {
  '3': [[[1, 2], [5, 0], [9, 2.5], [7.5, 6], [4, 7]], [[4, 7], [9, 8.5], [9.5, 12], [5, 14], [1, 12]]],
  '2': [[[1, 3], [5, 0], [9, 3], [7.5, 7.5], [1, 14], [10, 14]]],
  '9': [[[9, 4], [6, 0], [2, 1.5], [1.5, 6], [5, 8], [9, 4.5], [9, 9], [7, 14]]],
  '6': [[[8, 0.5], [3.5, 3.5], [1.5, 9.5], [4, 14], [8, 12.5], [8.5, 9], [5, 7.5], [1.8, 10]]],
  ')': [[[1.5, -0.5], [6, 4], [6.5, 10], [2, 15]]],
  'B': [[[1.5, 0], [1, 14]], [[1.5, 0], [7, 0.5], [8.5, 3.5], [6.5, 6.5], [1.5, 7]], [[1.5, 7], [8, 7.5], [10, 10.5], [8, 14], [1, 14]]],
  'R': [[[1.5, 14], [1.5, 0], [7, 0.5], [9, 3.5], [7, 6.5], [1.5, 7]], [[4.5, 7.2], [10, 14]]],
  'A': [[[0.5, 14], [5, 0], [9.5, 14]], [[2.4, 8.8], [7.8, 8.6]]],
  '+': [[[5, 3.5], [5, 12.5]], [[0.5, 8], [9.5, 8]]],
  'k': [[[2, 0], [2, 14]], [[8.5, 5.5], [2.2, 10]], [[4.6, 8.4], [9, 14]]],
  '?': [[[1.5, 3.5], [4.5, 0.3], [8.5, 1.8], [8.5, 5.5], [5, 8], [5, 10]]],
};
function text(str, x, y, sc = 1, w = 3.4, gap = 12) {
  let s = '';
  [...str].forEach((ch, i) => {
    (G[ch] || []).forEach(st => { s += ink(curve(st.map(([a, b]) => [x + (a + i * gap) * sc + J(0.5), y + b * sc + J(0.5)])), w); });
    if (ch === '?') s += dot(x + (5 + i * gap) * sc, y + 14 * sc, 2.4);
    if (ch === '.') s += dot(x + (3 + i * gap) * sc, y + 13 * sc, w * 0.85);
  });
  return s;
}

// ---------- shared anatomy (the family) ----------
// The head is a lumpy potato, slightly wider at the jaw, with a cowlick.
const potato = a => 1 + 0.07 * Math.sin(a) + 0.05 * Math.cos(2 * a);
function head(cx, cy, rx = 37, ry = 41, r = 0) {
  return blob(cx, cy, rx, ry, 13, 2.5, r, potato);
}
function cowlick(cx, top) { // one curl of hair, the family mark
  return line([[cx - 6, top + 3], [cx - 2, top - 9], [cx + 8, top - 13], [cx + 9, top - 5], [cx + 2, top - 6]], 5, 1);
}
function ear(x, y, side) { // little C
  return line([[x, y - 8], [x + 9 * side, y - 7], [x + 10 * side, y + 2], [x + 1 * side, y + 6]], 5, 1);
}
// deadpan eyes: dot + heavy flat lid. look shifts pupils.
function lidEyes(cx, cy, gap = 13, look = 0, lidTilt = 0) {
  return [-1, 1].map(s => {
    const x = cx + s * gap;
    return dot(x + look, cy + 2) + line([[x - 8, cy - 2 - s * lidTilt], [x + 8, cy - 2 + s * lidTilt]], 4.5, 1, 0.5);
  }).join('');
}
// eyes shut: two lids drawn as small downward arcs
function shutEyes(cx, cy, gap = 13, w = 8) {
  return [-1, 1].map(s => line([[cx + s * gap - w, cy - 1], [cx + s * gap, cy + 4], [cx + s * gap + w, cy - 1]], 4.5, 1, 0.4)).join('');
}
// the bulb nose that pokes out past the face edge: the ugly-cute bit
function bigNose(x, y, dir = 1) {
  return line([[x, y - 12], [x + 3 * dir, y - 1], [x + 12 * dir, y + 1], [x + 13 * dir, y + 8], [x + 4 * dir, y + 10], [x - 1 * dir, y + 7]], 5, 1);
}
function shoe(x, y, dir = 1, r = 0) {
  const p = blob(x + 4 * dir, y, 12, 6.5, 9, 1, r);
  return (DARK ? `<path d="${curve([...p, p[0], p[1]])}" stroke="${WHITE}" stroke-width="5"/>` : '') + scribble(p, { col: INK, sp: 4, w: 5, dx: 0, dy: 0, shrink: 1 }) + ink(loopPath(p, 1), 4.5);
}
// the sack body: same size for everyone; r leans it about its bottom centre
function sack(cx, top, r = 0) {
  const p = sub([[cx - 17, top + 2], [cx + 17, top], [cx + 23, top + 32], [cx + 23, top + 58], [cx - 21, top + 60], [cx - 25, top + 32]], 2, 1);
  return r ? rot(p, cx, top + 60, r) : p;
}
// standing legs + shoes under a sack at cx
function legs(cx, y = 178, foot = 206) {
  return limb([[cx - 11, y], [cx - 15, foot]]) + limb([[cx + 11, y], [cx + 15, foot]]) + shoe(cx - 20, foot + 4, -1) + shoe(cx + 18, foot + 4, 1);
}
function heart(x, y, s = 1, col = PINK) {
  const pts = [[0, 7], [-7, 0], [-9, -6], [-5, -10], [0, -6], [5, -10], [9, -6], [7, 0]].map(([a, b]) => [x + a * s, y + b * s]);
  return scribble(pts, { col, sp: 4.5, w: 6, dx: 1.5, dy: 1, shrink: 0.5 }) + ink(loopPath(pts, 1), 4);
}
// four-point sparkle
function sparkle(x, y, s = 1, col = YEL) {
  const p = [[0, -11], [2.5, -2.5], [11, 0], [2.5, 2.5], [0, 11], [-2.5, 2.5], [-11, 0], [-2.5, -2.5]].map(([a, b]) => [x + a * s, y + b * s]);
  return scribble(p, { col, sp: 3, w: 4, dx: 0.5, dy: 0.5, shrink: 0 }) + ink(loopPath(p, 1), 3.6);
}
// phone: body + screen inset; returns svg
function phone(x0, y0, x1, y1, tilt = 0, screenCol = null) {
  let p = sub([[x0, y0], [x1, y0 + 2], [x1 - 2, y1], [x0 - 2, y1 - 2]], 2, 0.8);
  let sc = [[x0 + 6, y0 + 9], [x1 - 6, y0 + 11], [x1 - 8, y1 - 9], [x0 - 4, y1 - 11]];
  if (tilt) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; p = rot(p, cx, cy, tilt); sc = rot(sc, cx, cy, tilt); }
  let s = shape(p, { sp: 7 });
  if (screenCol) s += scribble(sc, { col: screenCol, sp: 5, w: 7, dx: 0.5, dy: 0.5, shrink: 0.5 });
  return s + ink(loopPath(sub(sc, 1, 0.5), 1), 3.6);
}
// MIRROR: characters drawn facing right that get flipped to face left, so the
// set does not all look the same way
const MIRROR = new Set(['merged', 'brain_lite']);
function wrap(id, body) {
  const flip = MIRROR.has(id) ? ' transform="matrix(-1 0 0 1 240 0)"' : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><g fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"${flip}>${body}</g></svg>`;
  fs.writeFileSync(path.join(OUT, id + '.svg'), svg);
  return svg.length;
}
// second, thinner pen pass around a head: the sketchy "went over it twice" look
function ghost(poly) { return ink(loopPath(poly.map(([x, y]) => [x + J(2.2), y + J(2.2)]), 1), 2.4); }

const CHARS = {};

// ---------- ANALOG (untouched): smug human, shows off long division on paper ----------
CHARS.untouched = () => {
  seed = 11;
  let s = '';
  s += line([[84, 176], [80, 206]]) + line([[106, 176], [110, 206]]);
  s += shoe(75, 210, -1) + shoe(113, 210, 1);
  const body = sub([[78, 124], [112, 122], [118, 154], [118, 180], [74, 182], [70, 154]], 2, 1.2);
  s += line([[76, 132], [52, 152], [74, 166]]); // hand on hip
  s += shape(body);
  // the paper, held up to your face
  const paper = sub([[150, 80], [214, 90], [206, 166], [140, 156]], 3, 1.5);
  s += shape(paper, { sp: 8 });
  s += text('32', 174, 98, 0.95, 3.4, 12);
  s += line([[162, 120], [168, 118], [205, 123]], 3.6, 2, 0.6);
  s += text('3)96', 147, 123, 1.0, 3.4, 11.5);
  s += line([[112, 132], [132, 138], [146, 130]]);
  s += line([[140, 121], [150, 119], [153, 129], [143, 134]], 4.5, 1);
  // pencil tucked behind the ear: drawn first so the head sits on top
  const pencil = [[36, 26], [44, 20], [76, 52], [68, 58]];
  s += scribble(pencil, { col: YEL, sp: 4, w: 6, dx: 0.5, dy: 0.5, shrink: 0.5 });
  s += ink(loopPath(pencil, 1), 4) + line([[36, 26], [30, 16], [44, 20]], 4, 1);
  const h = head(96, 72, 40, 42, -0.18);
  s += shape(h) + ghost(h);
  s += cowlick(90, 30);
  s += ear(57, 78, -1);
  // smug: lids low, pupils slid toward the paper, one brow hiked
  s += lidEyes(98, 66, 14, 3.5, 1.5);
  s += line([[104, 46], [113, 41], [122, 44]], 4.5, 1);
  s += line([[78, 50], [90, 51]], 4.5, 1);
  s += bigNose(124, 78, 1);
  s += line([[90, 98], [102, 99], [113, 93]], 4.5, 1);
  s += line([[136, 32], [136, 46]], 4) + line([[129, 39], [143, 39]], 4);
  s += line([[148, 52], [148, 60]], 3.6) + line([[144, 56], [152, 56]], 3.6);
  return s;
};

// ---------- CC-BOT (heart_deep): a marionette, and the chat bubble holds the strings ----------
CHARS.heart_deep = () => {
  seed = 23;
  let s = '';
  const bub = sub([[66, 12], [180, 10], [182, 46], [138, 48], [126, 62], [124, 48], [64, 46]], 2, 1);
  // strings get a white halo so they still read at 64 px and on the dark card
  s += halo([[82, 44], [66, 128]], 4.5, 10, 3, 0.4) + halo([[168, 44], [180, 122]], 4.5, 10, 3, 0.4);
  s += halo([[123, 46], [122, 60]], 4.5, 10, 1, 0.3);
  s += shape(bub, { sp: 7 });
  s += dot(103, 29, 5.5) + dot(123, 29, 5.5) + dot(143, 29, 5.5);
  // limp dangling legs, toes down: nobody is standing here
  s += limb([[110, 182], [106, 200], [108, 214]]) + limb([[132, 182], [138, 198], [136, 212]]);
  s += shoe(106, 220, 1, 1.35) + shoe(136, 218, 1, 1.75);
  const body = sub([[102, 134], [140, 134], [146, 162], [144, 186], [98, 186], [96, 162]], 2, 1);
  s += limb([[102, 142], [84, 154], [66, 130]], 6);
  s += limb([[140, 142], [160, 154], [180, 124]], 6);
  s += shape(body);
  s += heart(62, 120, 1.35);
  const h = head(121, 96, 38, 38, 0.08);
  s += shape(h) + ghost(h);
  [-1, 1].forEach(sd => {
    const ex = 121 + sd * 15;
    s += ink(loopPath(blob(ex, 88, 8, 9, 8, 0.6), 1), 4.2) + dot(ex + sd * 0.5, 89, 3.2);
    s += line([[ex - 9, 74], [ex, 69 - (sd > 0 ? 2 : 0)], [ex + 9, 74]], 4.2, 1);
  });
  [-1, 1].forEach(sd => { s += scribble(blob(121 + sd * 26, 104, 6.5, 5, 8, 0.4), { col: PINK, sp: 3.5, w: 4.5, dx: 0, dy: 0, shrink: 0 }); });
  // painted grin + the hinged jaw of a ventriloquist dummy
  s += line([[106, 105], [121, 109], [136, 105]], 4.5, 1);
  s += line([[107, 106], [106, 128]], 4.2, 1, 0.4) + line([[135, 106], [136, 128]], 4.2, 1, 0.4);
  s += line([[106, 117], [121, 119], [136, 117]], 4.2, 1);
  s += line([[160, 78], [155, 89], [160, 93], [165, 89], [160, 78]], 3.6, 1);
  return s;
};

// ---------- 404 (brain_deep): the head is out of office; the brain left with a suitcase ----------
CHARS.brain_deep = () => {
  seed = 37;
  let s = '';
  s += limb([[72, 178], [68, 206]]) + limb([[94, 178], [98, 206]]);
  s += shoe(62, 210, -1) + shoe(101, 210, 1);
  const body = sub([[64, 122], [102, 122], [108, 154], [106, 182], [60, 182], [58, 154]], 2, 1);
  s += limb([[64, 130], [50, 158], [52, 178]]) + limb([[102, 130], [116, 158], [114, 178]]);
  s += shape(body);
  s += limb([[76, 122], [76, 112]], 6) + limb([[90, 122], [90, 112]], 6);
  // dashed outline where the head should be
  const h = head(83, 70, 40, 42, 0);
  for (let i = 0; i < h.length; i++) {
    const a = h[i], b = h[(i + 1) % h.length];
    s += ink(curve([[a[0] + (b[0] - a[0]) * 0.15, a[1] + (b[1] - a[1]) * 0.15], [a[0] + (b[0] - a[0]) * 0.7 + J(1), a[1] + (b[1] - a[1]) * 0.7 + J(1)]]), 5);
  }
  const note = sub([[58, 54], [106, 50], [109, 90], [61, 94]], 2, 0.8);
  s += scribble(note, { col: YEL, sp: 6, w: 8.5, dx: 1.5, dy: 1.5, shrink: 1 }) + ink(loopPath(note, 1), 4.5);
  s += text('BRB', 65, 64, 1.1, 3.8, 12);
  // the brain, walking out
  const br = blob(166, 146, 30, 23, 14, 1.5, -0.08, a => 1 + 0.08 * Math.sin(7 * a));
  s += limb([[156, 166], [150, 194]], 5.5) + limb([[176, 166], [186, 192]], 5.5);
  s += shoe(142, 198, -1) + shoe(188, 196, 1);
  s += line([[120, 136], [132, 136]], 4, 1) + line([[116, 150], [130, 150]], 4, 1) + line([[122, 164], [132, 164]], 4, 1);
  s += shape(br, { col: PINK, sp: 6, w: 8 });
  s += line([[167, 125], [164, 138], [171, 148], [167, 162]], 3.6, 1);
  s += line([[184, 136], [180, 146], [188, 152]], 3.6, 1);
  s += dot(146, 146, 3.6) + dot(157, 145, 3.6) + line([[146, 155], [151, 158], [157, 155]], 3.6, 1);
  // arm to suitcase
  s += line([[190, 152], [200, 166]], 5, 1);
  const cs = sub([[190, 166], [222, 166], [222, 194], [190, 194]], 2, 0.8);
  s += shape(cs, { sp: 6 }) + line([[199, 166], [200, 159], [211, 159], [212, 166]], 4, 1);
  return s;
};

// ---------- MY-BOT (bond_deep): bride in a veil, cheek on a phone in a top hat that has no idea ----------
CHARS.bond_deep = () => {
  seed = 53;
  let s = '';
  // veil: billowy, wavy hem, see-through scribble
  const veilL = [[84, 52], [66, 90], [46, 140], [30, 196], [44, 190], [58, 200], [72, 190], [84, 196]];
  const veilR = [[140, 56], [150, 100], [152, 150], [158, 196], [146, 190], [134, 198], [124, 190]];
  const veilPoly = [...veilL, ...veilR.slice().reverse()];
  s += scribble(sub(veilPoly, 2, 1), { sp: 11, w: 6, dx: 2, dy: 2, ang: 0.9 });
  s += ink(curve(sub(veilL.slice(0, 4), 2, 1.2)), 4.2) + ink(curve(veilL.slice(3)), 4.2);
  s += ink(curve(sub(veilR.slice(0, 4), 2, 1.2)), 4.2) + ink(curve(veilR.slice(3)), 4.2);
  s += limb([[104, 178], [100, 206]]) + limb([[124, 178], [128, 206]]);
  s += shoe(94, 210, -1) + shoe(131, 210, 1);
  const body = sub([[94, 124], [132, 124], [138, 154], [136, 182], [90, 182], [88, 154]], 2, 1);
  s += shape(body);
  // phone, the groom, in a tiny top hat
  const ph = sub([[152, 82], [196, 88], [188, 170], [144, 164]], 2, 0.8);
  s += shape(ph, { sp: 7 });
  s += ink(loopPath(sub([[157, 94], [188, 98], [181, 156], [150, 152]], 1, 0.5), 1), 3.6);
  s += text('?', 160, 112, 1.6, 4.2, 12);
  // top hat: white crown + ink band, so it reads as a hat, not a blob, at 64 px
  const hat = sub([[161, 48], [187, 51], [185, 80], [159, 78]], 1, 0.6);
  s += shape(hat, { sp: 4.5, w: 4.5, dx: 1, dy: 1, shrink: 0.5 });
  s += line([[160, 70], [186, 72]], 7, 1, 0.4);
  s += line([[146, 80], [174, 84], [200, 86]], 6, 2);
  // hugging arms over the phone
  s += limb([[96, 134], [126, 156], [154, 148]], 6) + limb([[130, 134], [152, 130], [170, 134]], 6);
  s += line([[152, 138], [162, 136], [164, 146], [154, 150]], 4.5, 1);
  s += `<circle cx="162" cy="130" r="4.5" stroke="${YEL}" stroke-width="4"/>`;
  // head leaned onto the phone, eyes shut, dreamy
  const h = head(110, 90, 40, 42, 0.3);
  s += shape(h) + ghost(h);
  s += cowlick(98, 49);
  s += line([[76, 66], [96, 52], [118, 48], [140, 56]], 5, 2);
  [[86, 58], [108, 49], [130, 51]].forEach(([x, y]) => {
    const fl = blob(x, y, 6, 6, 7, 0.6);
    s += scribble(fl, { col: WHITE, sp: 3, w: 4, dx: 0, dy: 0, shrink: 0 }) + ink(loopPath(fl, 1), 3.8);
  });
  [-1, 1].forEach(sd => {
    const ex = 110 + sd * 14;
    s += line([[ex - 8, 84], [ex, 90], [ex + 8, 85]], 4.5, 1);
  });
  s += bigNose(134, 96, 1);
  s += line([[103, 110], [111, 115], [120, 111]], 4.5, 1);
  s += heart(210, 36, 1.1) + heart(56, 30, 0.9) + heart(206, 112, 0.75);
  return s;
};

// ---------- PLUG-IN (merged): a person who has to be plugged into the wall ----------
CHARS.merged = () => {
  seed = 61;
  let s = '';
  // double wall outlet: top socket taken, bottom socket's face still showing
  const plate = sub([[12, 66], [58, 64], [60, 162], [14, 164]], 2, 1);
  s += shape(plate, { sp: 7 });
  const sock = blob(36, 136, 12, 15, 10, 0.8);
  s += ink(loopPath(sock, 1), 4) + line([[31, 128], [31, 137]], 4, 1, 0.3) + line([[41, 128], [41, 137]], 4, 1, 0.3) + dot(36, 145, 2.6);
  // the cord, from the plug to a port in the back of the head
  s += halo([[50, 92], [64, 108], [80, 116], [92, 108], [86, 98], [78, 104], [86, 116], [102, 114], [114, 94]], 6, 13, 1, 0.6);
  const plug = sub([[22, 78], [52, 80], [50, 106], [20, 104]], 1, 0.6);
  s += shape(plug, { sp: 5, w: 5, dx: 1, dy: 1 });
  s += legs(150);
  const body = sack(150, 122);
  s += limb([[130, 132], [116, 160], [120, 180]]) + limb([[170, 132], [184, 160], [180, 180]]);
  s += shape(body);
  // battery on the chest, charging
  const bat = sub([[131, 140], [165, 139], [166, 162], [132, 163]], 1, 0.6);
  s += scribble(bat.map(([x, y]) => [Math.min(x, 156), y]), { col: YEL, sp: 4, w: 6, dx: 0.5, dy: 0.5, shrink: 1.5 });
  s += ink(loopPath(bat, 1), 4.5) + line([[166, 146], [171, 146], [171, 156], [166, 156]], 4.5, 1, 0.3);
  const h = head(150, 72, 39, 41, 0.05);
  s += shape(h) + ghost(h);
  s += cowlick(146, 30);
  // content, eyes half shut: charging
  s += lidEyes(156, 70, 13, 0, 1.5);
  s += bigNose(170, 84, 1);
  s += line([[142, 100], [153, 103], [163, 99]], 4.5, 1);
  return s;
};

// ---------- SAMPLER (balanced): a pie in five exactly equal slices, one bite out of each ----------
CHARS.balanced = () => {
  seed = 71;
  let s = '';
  s += legs(78);
  const body = sack(78, 122);
  // knife hand out to the side, other hand holding the pie
  s += line([[60, 134], [40, 146], [26, 136]]);
  const blade = sub([[22, 132], [30, 132], [31, 98], [22, 108]], 1, 0.5);
  s += shape(blade, { sp: 4, w: 4.5, dx: 1, dy: 1, shrink: 0.5 });
  s += line([[26, 134], [26, 150]], 7, 1, 0.3);
  s += shape(body);
  s += line([[96, 134], [110, 150], [114, 146]]);
  const cx = 168, cy = 116, r = 44, bites = [0, 1, 2, 3, 4].map(i => -Math.PI / 2 + (i + 0.5) * (2 * Math.PI / 5));
  const pie = [];
  // sample densely only inside the bites, so the file stays small
  const angs = [];
  for (let a = 0; a < Math.PI * 2 - 0.01;) {
    angs.push(a);
    a += bites.some(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.31) ? 0.075 : 0.2;
  }
  for (const a of angs) {
    let rr = r;
    bites.forEach(b => {
      let d = Math.atan2(Math.sin(a - b), Math.cos(a - b));
      const x = d * r; // arc distance from the bite centre
      [[-7, 2.5], [0, 0.5], [7, 2.5]].forEach(([xi, lift]) => {
        if (Math.abs(x - xi) < 6) rr = Math.min(rr, r + lift - Math.sqrt(6 ** 2 - (x - xi) ** 2));
      });
    });
    pie.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  const plate = blob(cx, cy + 3, r + 14, r + 12, 16, 1.5);
  s += shape(plate, { sp: 7, w: 5 });
  s += scribble(pie, { col: YEL, sp: 6, w: 8, dx: 1, dy: 1, shrink: 1 });
  s += ink(curve([...pie, pie[0], pie[1]]), 4.5);
  // the crust: a rim just inside the edge, broken where the bites are
  bites.forEach(b => {
    const arc = [];
    for (let t = 0.34; t <= 2 * Math.PI / 5 - 0.33; t += 0.15) arc.push([cx + Math.cos(b + t) * (r - 10), cy + Math.sin(b + t) * (r - 10)]);
    s += ink(curve(arc), 3.4);
  });
  // five dead-equal cuts
  [0, 1, 2, 3, 4].forEach(i => {
    const a = -Math.PI / 2 + i * (2 * Math.PI / 5);
    s += line([[cx, cy], [cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1)]], 4.5, 2, 0.6);
  });
  s += line([[110, 148], [116, 138], [124, 146], [116, 154]], 4.5, 1);
  const h = head(78, 70, 38, 41, -0.05);
  s += shape(h) + ghost(h);
  s += cowlick(74, 29);
  s += ear(42, 76, -1);
  s += lidEyes(82, 66, 13, 4, 1.5);
  s += bigNose(98, 80, 1);
  s += line([[70, 96], [80, 101], [92, 96]], 4.5, 1);
  return s;
};

// ---------- PLUS-1 (soulmate): 2 a.m., in bed, the phone has its own pillow and nightcap ----------
CHARS.soulmate = () => {
  seed = 83;
  let s = '';
  // headboard
  s += line([[16, 150], [16, 74], [40, 50], [120, 38], [200, 50], [224, 74], [224, 150]], 5, 2, 1.2);
  // pillows
  const pl = blob(68, 112, 46, 22, 12, 2), pr = blob(170, 112, 46, 22, 12, 2);
  s += shape(pl, { sp: 7 }) + shape(pr, { sp: 7 });
  // the phone, tucked in, in a nightcap, screen still lit
  s += phone(150, 64, 190, 142, 0.12, YEL);
  s += dot(162, 104, 3.2) + dot(171, 105, 3.2) + dot(180, 106, 3.2);
  s += shape(sub([[150, 67], [190, 71], [180, 48], [204, 30], [170, 40]], 1, 0.6), { sp: 5, w: 4.5, dx: 1, dy: 1, shrink: 0.5 });
  const pom = blob(206, 28, 7, 7, 8, 0.5);
  s += shape(pom, { sp: 3.5, w: 4, dx: 0.5, dy: 0.5, shrink: 0 });
  // the person, wide awake, looking at it
  const h = head(70, 100, 34, 36, -0.1);
  s += shape(h) + ghost(h);
  s += cowlick(62, 64);
  s += lidEyes(80, 96, 12, 4.5, 1.5);
  s += bigNose(96, 108, 1);
  s += line([[68, 121], [77, 126], [87, 121]], 4.5, 1);
  // the blanket, pulled up to two chins: a big lump for you, a small one for it
  const bl = [[10, 134], [60, 126], [120, 136], [180, 130], [230, 134], [228, 210], [170, 214], [120, 208], [70, 214], [12, 210]];
  s += shape(sub(bl, 1, 1.2), { sp: 8 });
  s += line([[14, 148], [70, 144], [120, 150], [180, 144], [228, 148]], 4.5, 3, 1.2);
  // shoes on, in bed
  s += shoe(46, 214, -1, -1.3) + shoe(84, 214, 1, 1.3);
  // a hand out of the covers, resting by the phone
  s += line([[112, 146], [124, 138], [134, 142], [126, 150], [114, 150]], 4.5, 1);
  // the moon outside, for the hour
  const moon = [[30, 8], [20, 18], [22, 32], [34, 36], [26, 26], [28, 14]];
  s += fillShape(sub(moon, 1, 0.4), YEL, 3.8, 3.5);
  return s;
};

// ---------- TLDR (school_lite): sits on the fat book, reads the short version ----------
CHARS.school_lite = () => {
  seed = 97;
  let s = '';
  // the book, closed: top cover, page edges, spine
  const top = sub([[30, 140], [180, 132], [214, 152], [62, 162]], 2, 1);
  const front = sub([[62, 162], [214, 152], [212, 204], [60, 214]], 2, 1);
  const spine = sub([[30, 140], [62, 162], [60, 214], [28, 192]], 1, 0.6);
  s += fillShape(top, YEL, 5, 6) + fillShape(spine, YEL, 5, 6) + shape(front, { sp: 7 });
  [0.28, 0.5, 0.72].forEach(t => s += line([[64, 162 + 52 * t], [138, 158 + 52 * t], [210, 152 + 52 * t]], 3, 2, 0.8));
  // sitting on it, legs dangling over the edge
  s += line([[108, 140], [104, 168], [100, 186]]) + line([[128, 140], [132, 168], [130, 188]]);
  s += shoe(92, 190, -1) + shoe(134, 192, 1);
  const body = sack(118, 86);
  s += line([[100, 98], [86, 126], [90, 142]]);
  s += shape(body);
  // the tiny note, held up like it is the whole book
  s += line([[136, 98], [156, 104], [168, 90]]);
  const note = sub([[156, 56], [200, 54], [202, 84], [178, 86], [168, 96], [170, 86], [158, 86]], 1, 0.6);
  s += shape(note, { sp: 5, w: 4.5, dx: 1, dy: 1, shrink: 0.5 });
  s += line([[166, 68], [192, 67]], 3.6, 1, 0.3) + line([[166, 76], [180, 76]], 3.6, 1, 0.3);
  s += line([[162, 88], [168, 84], [172, 92]], 4.5, 1);
  const h = head(114, 50, 34, 36, 0.05);
  s += shape(h) + ghost(h);
  s += cowlick(110, 13);
  s += lidEyes(118, 46, 12, 4.5, 1);
  s += bigNose(132, 58, 1);
  s += line([[110, 74], [120, 75], [128, 72]], 4.5, 1);
  return s;
};

// ---------- CRAMBOT (school_deep): study partner is a phone in a mortarboard; it gets an A ----------
CHARS.school_deep = () => {
  seed = 101;
  let s = '';
  const body = sack(74, 120);
  s += limb([[56, 132], [44, 156], [56, 166]]);
  s += shape(body);
  // the phone, in a graduation cap, propped on the desk
  s += phone(152, 100, 196, 166, 0.08);
  s += dot(164, 132, 3.2) + dot(174, 133, 3.2) + dot(184, 134, 3.2);
  s += line([[168, 99], [168, 88], [184, 88], [186, 101]], 4.5, 1, 0.4);
  const board = sub([[144, 84], [176, 72], [210, 82], [178, 94]], 1, 0.6);
  s += shape(board, { sp: 4.5, w: 4.5, dx: 1, dy: 1, shrink: 0.5 });
  s += line([[177, 83], [200, 88], [204, 104]], 3.6, 1) + dot(204, 106, 3.4);
  // the desk
  const desk = sub([[10, 164], [230, 162], [230, 178], [10, 180]], 3, 0.8);
  s += shape(desk, { sp: 6 });
  s += limb([[24, 180], [22, 228]]) + limb([[216, 178], [218, 228]]);
  // holding up the A+ they gave it
  s += limb([[92, 130], [110, 112], [120, 86]]);
  const paper = sub([[100, 26], [144, 30], [140, 84], [98, 80]], 1, 0.8);
  s += fillShape(paper, YEL, 4.5, 5.5);
  s += text('A+', 103, 40, 1.45, 4.4, 10.5);
  s += line([[114, 90], [122, 80], [128, 88], [120, 96]], 4.5, 1);
  const h = head(70, 78, 36, 39, -0.05);
  s += shape(h) + ghost(h);
  s += cowlick(64, 39);
  s += ear(36, 84, -1);
  s += lidEyes(76, 74, 12, 4.5, 1);
  s += bigNose(92, 86, 1);
  s += line([[66, 104], [76, 108], [86, 103]], 4.5, 1);
  return s;
};

// ---------- NOTED (work_lite): polishing a giant envelope until it sparkles ----------
CHARS.work_lite = () => {
  seed = 113;
  let s = '';
  const env = sub([[118, 90], [222, 94], [218, 172], [114, 168]], 2, 1);
  s += shape(env, { sp: 7.5 });
  s += line([[120, 94], [168, 134], [220, 98]], 5, 2, 1);
  s += line([[116, 166], [156, 128]], 4, 1, 0.6) + line([[216, 170], [182, 130]], 4, 1, 0.6);
  s += sparkle(214, 64, 1.1) + sparkle(130, 66, 0.8) + sparkle(228, 190, 0.75) + sparkle(194, 186, 0.6);
  s += legs(62);
  const body = sack(62, 122);
  // spray bottle down at the side: bottle, neck, trigger head with a nozzle
  s += line([[44, 132], [30, 152], [26, 164]]);
  const btl = sub([[16, 178], [36, 178], [40, 210], [12, 210]], 1, 0.5);
  s += shape(btl, { sp: 4.5, w: 4.5, dx: 1, dy: 1, shrink: 0.5 });
  s += line([[21, 178], [21, 170], [31, 170], [31, 178]], 4, 1, 0.3);
  const trig = sub([[16, 170], [16, 158], [38, 158], [44, 162], [36, 166], [34, 170]], 1, 0.3);
  s += shape(trig, { sp: 3.5, w: 4.2, dx: 0.5, dy: 0.5, shrink: 0.3 });
  s += line([[34, 168], [38, 180]], 4, 1, 0.2);
  s += shape(body);
  // rag hand on the envelope, polishing in circles
  s += line([[80, 134], [104, 132], [122, 126]]);
  const rag = [[114, 110], [128, 114], [146, 106], [150, 122], [144, 138], [136, 132], [128, 150], [118, 136], [110, 128]];
  s += fillShape(rag, YEL, 4.5, 4.5) + line([[130, 118], [134, 134]], 3.4, 1, 0.3) + line([[142, 114], [140, 126]], 3.4, 1, 0.3);
  s += line([[160, 106], [170, 118], [164, 136], [150, 144]], 4, 2, 0.6) + line([[112, 104], [122, 98], [134, 96]], 4, 1, 0.4);
  const h = head(62, 70, 37, 40, 0);
  s += shape(h) + ghost(h);
  s += cowlick(58, 29);
  s += ear(26, 76, -1);
  s += lidEyes(68, 66, 12, 4.5, 1);
  s += bigNose(84, 78, 1);
  // concentrating: tongue out of the corner of the mouth
  s += line([[56, 98], [66, 99], [76, 96]], 4.5, 1) + line([[70, 98], [74, 104], [78, 98]], 3.6, 1, 0.3);
  return s;
};

// ---------- SYNERGY (work_deep): a ghost(writer) in a tie, with a briefcase ----------
CHARS.work_deep = () => {
  seed = 127;
  let s = '';
  s += limb([[104, 176], [100, 204]]) + limb([[124, 176], [128, 204]]);
  s += shoe(94, 208, -1) + shoe(132, 208, 1);
  // arm out from under the sheet to the briefcase
  s += limb([[150, 130], [168, 146], [182, 156]]);
  const cs = sub([[168, 158], [218, 156], [220, 194], [170, 196]], 2, 0.8);
  s += shape(cs, { sp: 6 }) + line([[184, 157], [186, 148], [202, 148], [204, 157]], 4.5, 1, 0.4) + line([[170, 172], [218, 171]], 3.6, 1, 0.6);
  const sheet = [[114, 26], [140, 32], [152, 56], [154, 74], [162, 82], [155, 92], [158, 120], [166, 150], [172, 182], [158, 176], [144, 186], [130, 178], [116, 188], [102, 178], [88, 186], [74, 176], [60, 182], [64, 150], [70, 120], [72, 80], [80, 42], [94, 30]];
  s += shape(sub(sheet, 1, 0.8), { sp: 7 });
  s += ghost(sheet);
  s += limb([[160, 142], [176, 148], [188, 150]]) + line([[186, 144], [192, 148], [188, 154]], 4.5, 1, 0.3);
  s += cowlick(110, 30);
  // eye holes with the usual deadpan lids inside
  [-1, 1].forEach(sd => {
    const ex = 114 + sd * 16;
    s += ink(loopPath(blob(ex, 70, 9, 8, 8, 0.6), 1), 4.2) + dot(ex + 2, 72, 3.4) + line([[ex - 8, 68], [ex + 8, 68]], 4.2, 1, 0.3);
  });
  // the tie, worn over the sheet
  // the tie, worn over the sheet, with a little shirt collar either side
  const tie = sub([[109, 112], [121, 112], [119, 120], [125, 156], [115, 168], [107, 156], [112, 120]], 1, 0.4);
  s += fillShape(tie, YEL, 4.2, 4);
  s += ink(loopPath([[98, 106], [111, 110], [106, 122]], 1), 4) + ink(loopPath([[132, 106], [119, 110], [124, 122]], 1), 4);
  // a small flat mouth, so nobody reads the tie as a tongue
  s += line([[108, 92], [116, 93], [124, 91]], 4.2, 1, 0.3);
  return s;
};

// ---------- HAHA-OK (heart_lite): a magnifying glass on a text that just says "k." ----------
CHARS.heart_lite = () => {
  seed = 139;
  let s = '';
  // the message, someone else's, tail pointing away
  const bub = sub([[118, 20], [222, 18], [224, 96], [200, 98], [212, 118], [184, 98], [116, 96]], 2, 1);
  s += shape(bub, { sp: 7.5 });
  s += line([[132, 36], [150, 36]], 3.2, 1, 0.3) + line([[132, 82], [146, 82]], 3.2, 1, 0.3);
  s += legs(66);
  const body = sack(66, 122);
  s += line([[48, 134], [36, 160], [50, 172]]);
  s += shape(body);
  // the glass: arm up, yellow handle, big "k." swimming in the lens
  s += line([[84, 134], [106, 128], [116, 116]]);
  s += line([[112, 124], [140, 92]], 9, 1, 0.3) + line([[112, 124], [140, 92]], 4.5, 1, 0.3).replace('/>', ` stroke="${YEL}"/>`);
  const lens = blob(166, 60, 36, 36, 14, 0.8);
  s += ink(loopPath(lens, 1), 6.5) + ink(loopPath(blob(166, 60, 30, 30, 12, 0.6), 1), 2.6);
  s += text('k.', 148, 40, 2.6, 5.5, 8);
  s += line([[108, 122], [116, 112], [122, 120]], 4.5, 1);
  const h = head(64, 72, 37, 40, 0.06);
  s += shape(h) + ghost(h);
  s += cowlick(58, 31);
  s += ear(28, 78, -1);
  // squint: one eye screwed shut, one lid crushing the other, brow down
  s += line([[56, 66], [64, 70], [56, 74]], 4.5, 1, 0.3);
  s += dot(84, 70) + line([[74, 64], [90, 67]], 4.5, 1, 0.3) + line([[72, 54], [86, 58]], 4.5, 1, 0.4);
  s += bigNose(92, 80, 1);
  s += line([[56, 100], [62, 97], [68, 101], [76, 97]], 4.2, 1, 0.3);
  return s;
};

// ---------- IDK (brain_lite): flips a coin that is a little chat bubble, eyes shut ----------
CHARS.brain_lite = () => {
  seed = 151;
  let s = '';
  s += legs(92);
  const body = sack(92, 122);
  s += line([[74, 132], [54, 150], [72, 164]]); // hand on hip
  s += shape(body);
  // flicking arm
  s += line([[110, 132], [132, 120], [140, 102]]);
  s += line([[136, 104], [146, 98], [150, 106], [140, 112]], 4.5, 1) + line([[146, 98], [150, 88]], 4.5, 1, 0.3);
  // the coin, mid-spin: a tilted disc with its edge showing, and a little
  // chat bubble stamped where the head would be
  const disc = (cx, cy, k = 1) => { const p = []; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; p.push([cx + Math.cos(a) * 21 * k, cy + Math.sin(a) * 26 * k]); } return rot(p, cx, cy, 0.35); };
  s += shape(disc(185, 50, 1.02), { sp: 4.5, w: 4.2, dx: 0.5, dy: 0.5, shrink: 0.3 });
  s += shape(disc(179, 48, 1.06), { sp: 5, w: 4.5, dx: 0.5, dy: 0.5, shrink: 0.3 });
  const cb = rot(sub([[166, 36], [192, 34], [193, 54], [180, 55], [172, 63], [173, 55], [166, 55]], 1, 0.4), 179, 48, 0.35);
  s += fillShape(cb, PINK, 3.8, 3.5);
  // flight path and spin marks
  s += line([[150, 92], [146, 74], [150, 62]], 3.6, 2, 0.4).replace('/>', ' stroke-dasharray="5 8"/>');
  s += line([[198, 18], [212, 24], [218, 36]], 4, 1, 0.3) + line([[212, 76], [200, 82], [188, 82]], 4, 1, 0.3);
  const h = head(90, 70, 38, 41, -0.04);
  s += shape(h) + ghost(h);
  s += cowlick(86, 29);
  s += ear(53, 76, -1);
  s += shutEyes(96, 66, 13);
  s += bigNose(110, 80, 1);
  s += line([[86, 98], [96, 99], [104, 97]], 4.5, 1);
  return s;
};

// ---------- SORRY (bond_lite): bowing to a phone in a flowerpot, and watering it ----------
CHARS.bond_lite = () => {
  seed = 163;
  let s = '';
  // the pot and its phone, with two leaves
  s += phone(184, 92, 218, 170, 0.03);
  s += line([[192, 128], [200, 132], [208, 128]], 3.6, 1, 0.3);
  const lf = (x, y, d) => fillShape([[x, y], [x + 1 * d, y - 18], [x + 12 * d, y - 30], [x + 15 * d, y - 12]], WHITE, 4, 4) + line([[x + 2 * d, y - 4], [x + 9 * d, y - 20]], 3, 1, 0.2);
  s += lf(216, 138, 1) + lf(218, 162, 0.7);
  const pot = sub([[166, 164], [234, 162], [226, 222], [174, 224]], 2, 0.8);
  s += shape(pot, { sp: 7 });
  s += line([[168, 178], [232, 176]], 4.5, 2, 0.6);
  // water, falling from the spout
  [[176, 132], [182, 144], [174, 152]].forEach(([x, y]) => { s += halo([[x, y], [x + 1.5, y + 6]], 4, 9, 1, 0.2); });
  // the bow: body leaned forward from the hips
  s += line([[40, 178], [36, 206]]) + line([[62, 178], [66, 206]]);
  s += shoe(30, 210, -1) + shoe(70, 210, 1);
  const body = sack(50, 120, 0.7);
  s += shape(body);
  const h = head(108, 100, 34, 37, 0.75);
  s += shape(h) + ghost(h);
  s += cowlick(78, 72);
  // eyes shut, very sincere
  s += line([[104, 108], [110, 114], [118, 112]], 4.2, 1, 0.3) + line([[120, 94], [127, 100], [132, 97]], 4.2, 1, 0.3);
  s += bigNose(132, 116, 1);
  // arm out to the watering can, held well clear of the face
  s += line([[86, 146], [112, 160], [128, 158]]);
  const can = sub([[122, 142], [150, 140], [152, 168], [124, 170]], 1, 0.6);
  s += line([[150, 150], [166, 134], [174, 128]], 6, 1, 0.3) + line([[170, 124], [178, 132]], 6, 1, 0.3);
  s += fillShape(can, YEL, 5, 5);
  s += line([[126, 142], [130, 130], [144, 130], [148, 140]], 4.5, 1, 0.4);
  // bow lines over the back
  s += line([[46, 104], [40, 92]], 3.6, 1, 0.3) + line([[62, 96], [60, 84]], 3.6, 1, 0.3) + line([[32, 116], [24, 108]], 3.6, 1, 0.3);
  return s;
};

// ---------- THE PURITY FIGURE (question screen) ----------
// One margin-doodle person whose parts are swapped for machine parts as
// purity falls (the stage table is extras.FIGURE_STAGES). Same hand as the 14:
// the same ink, line weights, wobble and white scribble fill. Every part comes
// twice in the file, as a group <g data-p="<part>" data-f="h"> (human) and
// data-f="m" (machine); app.js shows one form of each, and during a change it
// shows both, clipped either side of the scan line (the two clip paths at the
// top). The antenna has only a machine form; "lights" is not a drawing but the
// eye lights going from dim to full (class pf-light). The only colour besides
// ink and white is ACCENT, and only on machine parts and the scan line.
// Stands about 210 units tall; app.js shows it 46 to 78 px tall, so details
// are drawn big (screen eyes, a fat antenna tip) to survive at 48 px.
const ACCENT = '#3A7BFF';
function figurePart(p, form, seedN, body) {
  seed = seedN;
  return `<g data-p="${p}" data-f="${form}">${body()}</g>`;
}
function roundBox(x0, y0, x1, y1, r, n = 2, a = 0.8) {
  // a rounded rectangle as a wobbly polygon (corners cut at r)
  return sub([[x0 + r, y0], [x1 - r, y0 + 1], [x1, y0 + r], [x1 + 1, y1 - r], [x1 - r, y1], [x0 + r, y1 + 1], [x0, y1 - r], [x0 - 1, y0 + r]], n, a);
}
function screenEye(cx, cy) { // a little ink screen with a light inside
  const scr = roundBox(cx - 10, cy - 8, cx + 10, cy + 8, 4, 1, 0.4);
  return scribble(scr, { col: INK, sp: 4, w: 6, dx: 0, dy: 0, shrink: 0.5 }) + ink(loopPath(scr, 1), 4.2) +
    `<rect class="pf-light" x="${cx - 5}" y="${cy - 3}" width="10" height="6" rx="2" fill="${ACCENT}" stroke="none"/>`;
}
function wheel(cx, cy, r) {
  const w = blob(cx, cy, r, r, 12, 0.8);
  return shape(w, { sp: 5, w: 6, dx: 1, dy: 1, shrink: 0.5 }) + dot(cx, cy, 3.6);
}
const FIGURE_H = 214, FIGURE_X0 = 14, FIGURE_W = 122;
function purityFigure() {
  DARK = false;
  const parts = [];
  // antenna (machine only): drawn first, so either head covers its foot
  parts.push(figurePart('ant', 'm', 301, () =>
    line([[80, 34], [82, 20], [84, 12]], 5, 1, 0.4) +
    scribble(blob(85, 9, 7, 7, 8, 0.4), { col: ACCENT, sp: 3.5, w: 6, dx: 0.5, dy: 0.5, shrink: 0 }) +
    ink(loopPath(blob(85, 9, 7, 7, 8, 0.4), 1), 4)));
  // legs
  parts.push(figurePart('legs', 'h', 311, () =>
    line([[66, 160], [62, 194]]) + line([[86, 160], [90, 194]]) + shoe(56, 199, -1) + shoe(94, 199, 1)));
  parts.push(figurePart('legs', 'm', 312, () =>
    line([[64, 160], [64, 180]], 6, 1, 0.4) + line([[87, 160], [87, 180]], 6, 1, 0.4) +
    line([[52, 182], [99, 181]], 5, 2, 0.5) + wheel(60, 196, 13) + wheel(91, 196, 13)));
  // arms: "L" is the figure's own left (the viewer's right), "R" its right
  parts.push(figurePart('armR', 'h', 321, () => line([[54, 112], [38, 128], [32, 148]])));
  parts.push(figurePart('armR', 'm', 322, () =>
    line([[54, 112], [36, 124]], 6, 1, 0.4) + line([[36, 124], [32, 144]], 6, 1, 0.4) +
    `<circle cx="36" cy="124" r="4.5" fill="${WHITE}" stroke-width="3.6"/>` +
    line([[23, 146], [26, 156], [32, 158]], 4.5, 1, 0.3) + line([[41, 146], [38, 156], [33, 158]], 4.5, 1, 0.3)));
  parts.push(figurePart('armL', 'h', 331, () => line([[96, 112], [112, 126], [118, 146]])));
  parts.push(figurePart('armL', 'm', 332, () =>
    line([[96, 112], [114, 124]], 6, 1, 0.4) + line([[114, 124], [118, 144]], 6, 1, 0.4) +
    `<circle cx="114" cy="124" r="4.5" fill="${WHITE}" stroke-width="3.6"/>` +
    line([[109, 146], [112, 156], [118, 158]], 4.5, 1, 0.3) + line([[127, 146], [124, 156], [119, 158]], 4.5, 1, 0.3)));
  // body
  parts.push(figurePart('body', 'h', 341, () => shape(sack(75, 102))));
  parts.push(figurePart('body', 'm', 342, () => {
    const box = roundBox(51, 102, 100, 162, 5, 2, 0.9);
    const panel = roundBox(62, 116, 89, 140, 3, 1, 0.5);
    return shape(box, { sp: 7 }) + ink(loopPath(panel, 1), 3.6) +
      scribble(blob(75.5, 128, 5.5, 5.5, 8, 0.3), { col: ACCENT, sp: 3, w: 5, dx: 0.5, dy: 0.5, shrink: 0 }) +
      ink(loopPath(blob(75.5, 128, 5.5, 5.5, 8, 0.3), 1), 3.2) + dot(58, 152, 2.6) + dot(93, 152, 2.6);
  }));
  // head
  parts.push(figurePart('head', 'h', 351, () => {
    const h = head(75, 64, 33, 36, -0.04);
    return shape(h) + ghost(h) + cowlick(70, 30) + ear(42, 70, -1) + bigNose(98, 72, 1);
  }));
  parts.push(figurePart('head', 'm', 352, () => {
    const h = roundBox(43, 30, 107, 98, 9, 2, 0.9);
    return shape(h) + ghost(h) + dot(39, 64, 4.2) + dot(111, 64, 4.2) + line([[52, 40], [62, 39]], 3.4, 1, 0.3);
  }));
  // eyes (on either head): deadpan lid eye or a screen
  const lid = (x, y) => dot(x + 1, y + 2) + line([[x - 8, y - 2], [x + 8, y - 2]], 4.5, 1, 0.5);
  parts.push(figurePart('eyeL', 'h', 361, () => lid(88, 58)));
  parts.push(figurePart('eyeL', 'm', 362, () => screenEye(88, 59)));
  parts.push(figurePart('eyeR', 'h', 371, () => lid(63, 58)));
  parts.push(figurePart('eyeR', 'm', 372, () => screenEye(63, 59)));
  // mouth: a flat little line, or a speaker grille
  parts.push(figurePart('mouth', 'h', 381, () => line([[66, 86], [75, 88], [84, 85]], 4.5, 1)));
  parts.push(figurePart('mouth', 'm', 382, () => {
    const g = roundBox(62, 80, 88, 92, 3, 1, 0.3);
    return ink(loopPath(g, 1), 4) + [68.5, 75, 81.5].map((x) => line([[x, 82], [x, 90]], 3.2, 1, 0.2)).join('');
  }));
  // the scan line: drawn once at y = 0 and moved down by app.js
  const scan = `<g class="pf-scan" opacity="0"><path d="M${FIGURE_X0 - 2},0H${FIGURE_X0 + FIGURE_W + 2}" stroke="${ACCENT}" stroke-width="10" stroke-opacity=".2"/><path d="M${FIGURE_X0 - 2},0H${FIGURE_X0 + FIGURE_W + 2}" stroke="${ACCENT}" stroke-width="3"/></g>`;
  const clips = `<defs><clipPath id="pf-new"><rect class="pf-clip-new" x="${FIGURE_X0 - 10}" y="${-FIGURE_H}" width="${FIGURE_W + 20}" height="${FIGURE_H}"/></clipPath>` +
    `<clipPath id="pf-old"><rect class="pf-clip-old" x="${FIGURE_X0 - 10}" y="0" width="${FIGURE_W + 20}" height="${FIGURE_H}"/></clipPath></defs>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${FIGURE_X0} 0 ${FIGURE_W} ${FIGURE_H}" width="${FIGURE_W}" height="${FIGURE_H}">${clips}` +
    `<g fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}${scan}</g></svg>`;
  fs.writeFileSync(path.join(OUT, 'purity-figure.svg'), svg);
  return svg.length;
}

fs.mkdirSync(OUT, { recursive: true });
const ids = Object.keys(CHARS);
const only = process.argv.slice(2);
const sizes = {};
const DARK_CARDS = new Set(['merged', 'work_deep', 'bond_deep', 'school_deep', 'brain_deep', 'heart_deep']);
for (const id of ids) if (!only.length || only.includes(id)) DARK = DARK_CARDS.has(id), sizes[id] = wrap(id, CHARS[id]());
if (!only.length || only.includes('purity-figure')) sizes['purity-figure'] = purityFigure();
console.log(sizes); // bytes
