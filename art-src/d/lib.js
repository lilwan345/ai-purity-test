// lib.js: the shared hand for all 14 type drawings ("two-plate print").
// A drawing is a short file: make a scene from the card colour, stage one big
// object and the person, return scene.svg().
//
//   const L = require('./lib');
//   module.exports = () => { const s = L.scene('#E9C46A'); ...; return s.svg(); };
//
// Output: <g class="plates"> (colour plate, slightly off register, fades in
// as one pass) then <g class="ink"> (pen lines, in the order they are drawn).

// ---------------------------------------------------------------- numbers
const INK = '#1C2541', PAPER = '#F6EFE2', SIGNAL = '#3A7BFF', SIGNAL_TINT = '#9DBDFF';
const OFFSET = [1.8, 1.4];          // register offset of the colour plate
const LINE = 3, FINE = 2.4;         // pen weights: outlines, details

// seeded jitter so lines are hand-drawn but repeatable
let seed = 7;
const reseed = (n) => { seed = n; };
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const jit = (pts, a = 0.6) => pts.map(([x, y]) => [x + (rnd() - 0.5) * a, y + (rnd() - 0.5) * a]);

// ---------------------------------------------------------------- paths
// Catmull-Rom through points -> compact relative cubic path.
// Small shapes keep one decimal so they stay round.
const r1 = (n) => Math.round(n * 10) / 10;
const num = (a) => a.map((v, i) => (i && v >= 0 ? ' ' : '') + r1(v)).join('').replace(/(^|[ -])0\./g, '$1.');
function cr(pts, closed = false) {
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const small = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) < 18;
  const R = small ? r1 : Math.round;
  const n = pts.length;
  if (n === 1) return `M${num([R(pts[0][0]), R(pts[0][1])])}h.1`;
  const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let cur = [R(pts[0][0]), R(pts[0][1])];
  let d = 'M' + num(cur);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const e = [R(p2[0]), R(p2[1])];
    if (n === 2) { d += 'l' + num([e[0] - cur[0], e[1] - cur[1]]); cur = e; continue; }
    const c1 = [R(p1[0] + (p2[0] - p0[0]) / 6), R(p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [R(p2[0] - (p3[0] - p1[0]) / 6), R(p2[1] - (p3[1] - p1[1]) / 6)];
    d += 'c' + num([c1[0] - cur[0], c1[1] - cur[1], c2[0] - cur[0], c2[1] - cur[1], e[0] - cur[0], e[1] - cur[1]]);
    cur = e;
  }
  return closed ? d + 'z' : d;
}

// ---------------------------------------------------------------- geometry
const rot = (deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return ([x, y]) => [x * c - y * s, x * s + y * c]; };
const rotP = (cx, cy, deg) => { const r = rot(deg); return ([x, y]) => { const q = r([x - cx, y - cy]); return [cx + q[0], cy + q[1]]; }; };
// a frame: local points -> card points (scale k, rotate deg, then move to [x, y])
const frame = (x, y, deg = 0, k = 1) => { const r = rot(deg); return ([u, v]) => { const q = r([u * k, v * k]); return [x + q[0], y + q[1]]; }; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const ellipse = (cx, cy, rx, ry, deg = 0, n = 14, a0 = 0, a1 = 360) => {
  const out = [], r = rotP(cx, cy, deg), full = a1 - a0 >= 360;
  for (let i = 0; i < (full ? n : n + 1); i++) {
    const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    out.push(r([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]));
  }
  return out;
};
// rounded rectangle as points, straight sides kept straight
const rrect = (x, y, w, h, r) => {
  const k = 0.29;
  const pts = [[x + r, y], [x + w - r, y], [x + w - r * k, y + r * k], [x + w, y + r], [x + w, y + h - r],
    [x + w - r * k, y + h - r * k], [x + w - r, y + h], [x + r, y + h], [x + r * k, y + h - r * k],
    [x, y + h - r], [x, y + r], [x + r * k, y + r * k]];
  return dense(pts);
};
const dense = (pts, closed = true, step = 22) => {
  const out = [], n = pts.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    out.push(a);
    const m = Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / step);
    for (let j = 1; j <= m; j++) out.push(lerp(a, b, j / (m + 1)));
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
};
// a straight-sided polygon (keeps its sides straight through the smooth path)
const poly = (pts, step = 9) => dense(pts, true, step);
const inside = ([x, y], poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
// split a line into the runs that are not hidden behind any of `covers`
function visibleRuns(pts, closed, covers) {
  const fine = dense(pts, closed, 3);
  const vis = fine.map((q) => !covers.some((c) => inside(q, c)));
  if (vis.every(Boolean)) return [pts];
  const runs = []; let run = [];
  const n = fine.length;
  let start = 0;
  if (closed) { start = vis.findIndex((v, i) => v && !vis[(i + n - 1) % n]); if (start < 0) return []; }
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (vis[i]) run.push(fine[i]); else if (run.length) { runs.push(run); run = []; }
  }
  if (run.length) runs.push(run);
  // thin the dense runs back out so the paths stay small
  return runs.filter((r) => r.length > 1).map((r) => r.filter((q, i) => i % 3 === 0 || i === r.length - 1));
}

// ---------------------------------------------------------------- colour
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
const lum = (h) => { const [r, g, b] = hex(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const dist = (a, b) => { const p = hex(a), q = hex(b); return Math.hypot(p[0] - q[0], (p[1] - q[1]) * 1.3, p[2] - q[2]); };
// The person's shirt: the warm ink that stands furthest from the card.
const SHIRTS = ['#E8735E', '#EF8BA8', '#F2B33D', '#86CFC1', '#B79AE0'];
// One palette rule for all 14 cards:
//   paper  cream, for everything solid that is not the AI or the shirt
//   ai     signal blue, ONLY on the AI, always set inside cream paper with an
//          ink edge, so it reads on blue cards too
//   shirt  the person's colour, picked by distance from the card
//   shadow a darker tint of the card, printed as halftone dots
function palette(card, opt = {}) {
  const dark = opt.dark !== undefined ? opt.dark : lum(card) < 0.3;
  const shirt = opt.shirt || SHIRTS.slice().sort((a, b) => dist(b, card) - dist(a, card))[0];
  return {
    card, dark, ink: INK, paper: PAPER, ai: SIGNAL, aiTint: SIGNAL_TINT, shirt,
    shirtShade: mix(shirt, INK, 0.35),
    blush: '#E5677F',
    shadow: dark ? mix(card, '#000000', 0.38) : mix(card, INK, 0.3),
    shoe: dark ? PAPER : INK
  };
}

// ---------------------------------------------------------------- scene
function scene(card, opt = {}) {
  const pal = palette(card, opt);
  const plates = [], ink = [], pats = {};
  const pattern = (col, cell = 3.2, r = 0.95, ang = 30) => {
    const id = 'h' + Object.keys(pats).length;
    const key = [col, cell, r, ang].join();
    if (pats[key]) return pats[key].id;
    pats[key] = { id, s: `<pattern id="${id}" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" patternTransform="rotate(${ang})"><rect x="${r1(cell / 2 - r)}" y="${r1(cell / 2 - r)}" width="${2 * r}" height="${2 * r}" rx="${r}" fill="${col}"/></pattern>` };
    return id;
  };
  const s = {
    pal,
    // colour plate
    fill: (pts, col) => plates.push(`<path d="${cr(pts, true)}" fill="${col}"/>`),
    dots: (pts, col, cell, r) => plates.push(`<path d="${cr(pts, true)}" fill="url(#${pattern(col, cell, r)})"/>`),
    band: (pts, col, w, closed = false) => plates.push(`<path d="${cr(pts, closed)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`),
    spot: (x, y, r, col) => plates.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${col}"/>`),
    // a cream underlay so a line still reads on a dark card (plates only)
    under: (pts, w = 8, closed = false) => { if (pal.dark) s.band(pts, pal.paper, w, closed); },
    // pen plate. opt: { w, closed, cut: [polygons that hide it], j: jitter }
    line: (pts, o = {}) => {
      const w = o.w || LINE;
      const p = o.j ? jit(pts, o.j) : pts;
      const runs = o.cut ? visibleRuns(p, !!o.closed, o.cut) : [p];
      runs.forEach((r, i) => {
        const closed = !!o.closed && runs.length === 1 && r === p;
        ink.push(`<path d="${cr(r, closed)}"${w === LINE ? '' : ` stroke-width="${w}"`}/>`);
      });
    },
    dot: (x, y, w = 6) => ink.push(`<path d="${cr([[x, y]])}" stroke-width="${w}"/>`),
    // a shape: fill on the colour plate, outline on the pen plate
    shape: (pts, col, o = {}) => { if (col) s.fill(pts, col); s.line(pts, Object.assign({ closed: true, j: 0.6 }, o)); },
    // ground shadow: an ellipse of dots in a darker tint of the card
    shadow: (cx, cy, rx, ry = 4) => s.dots(ellipse(cx, cy, rx, ry, 0, 12), pal.shadow, 2.6, 0.85),
    svg: () => {
      const defs = Object.values(pats).map((p) => p.s).join('');
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">` +
        (defs ? `<defs>${defs}</defs>` : '') +
        `<g class="plates" transform="translate(${OFFSET[0]},${OFFSET[1]})" stroke="none">${plates.join('')}</g>` +
        `<g class="ink" fill="none" stroke="${INK}" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round">${ink.join('')}</g></svg>`;
    }
  };
  return s;
}

// ---------------------------------------------------------------- the person
// The round-headed person with the curl and the bean body (the purity figure).
// Everything is in card coordinates except the body and head, which hang off
// the hip point:
//   at: [x, y]  hip (bottom of the bean)      k: scale (1 = head r 27)
//   lean: body tilt in degrees (+ = top to the right): the line of action
//   head: { dx, dy, tilt, look }  offset in body units, tilt in degrees,
//          look -1..1 turns the face left/right (ear goes the other way)
//   arms: [right, left]  each { to: [x, y], bend, hand: null to hide it, behind, cut: [polygons] }
//   legs: [right, left]  each { to: [x, y], knee: [x, y] | bend, shoe: angle deg, behind }
//   face: { eyes, brows, mouth, blush, sweat }   (see FACE below)
//   cover: polygons in front of the person (their lines are cut there)
//   before(B, H): draw colour behind the person (B, H map body / head points)
// Returns { head, body, hands } polygons for cutting other lines.
const HEAD_R = 27;
function person(s, o) {
  const k = o.k || 1, lean = o.lean || 0, pal = s.pal;
  const B = frame(o.at[0], o.at[1], lean, k);
  const h = Object.assign({ dx: 0, dy: 0, tilt: 0, look: 0 }, o.head || {});
  const r = HEAD_R;
  const hc = B([h.dx, -44 - r * 0.86 + h.dy]);
  const H = frame(hc[0], hc[1], lean + h.tilt, k);
  const headPoly = ellipse(0, 0, r * 1.04, r, 0, 14).map((q, i) => H([q[0] * (1 + 0.02 * Math.sin(i * 1.7)), q[1]]));
  const bodyPoly = [[-12, -45], [0, -46.5], [12, -45], [17, -31], [16, -10], [0, -1], [-16, -10], [-17, -31]].map(B);
  const shoulders = [B([-13, -37]), B([13, -37])];
  const hips = [B([-7, -5]), B([7, -5])];
  const cover = o.cover || [];
  const W = LINE * Math.max(0.9, Math.min(1.15, k));

  // limb: elbow / knee from a bend (fraction of length, + = bow to the right of travel)
  const joint = (a, b, bend) => {
    const m = lerp(a, b, 0.5), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    return [m[0] + nx * bend * L, m[1] + ny * bend * L];
  };
  const limbPts = (from, l) => [from, l.knee || l.elbow || joint(from, l.to, l.bend || 0), l.to];
  const arms = (o.arms || []).map((l, i) => l && Object.assign({ pts: limbPts(shoulders[i], l) }, l));
  const legs = (o.legs || []).map((l, i) => l && Object.assign({ pts: limbPts(hips[i], l) }, l));
  const handPoly = (l) => ellipse(l.to[0], l.to[1], 4.8 * k, 4.6 * k, 0, 10);
  const shoePoly = (l) => {
    const a = (l.shoe || 0) * Math.PI / 180;
    const c = [l.to[0] + Math.cos(a) * 3 * k, l.to[1] + Math.sin(a) * 3 * k + 1.5 * k];
    return ellipse(c[0], c[1], 7.6 * k, 4.4 * k, l.shoe || 0, 10);
  };

  // things behind the person (a backpack, a chair) get drawn here, on the plate
  if (o.before) o.before(B, H);
  // ---- colour plate: underlays (dark cards), legs, body, head, hands, shoes
  [...legs, ...arms].forEach((l) => l && s.under(l.pts, 6.5 * k));
  s.fill(bodyPoly, pal.shirt);
  s.dots([B([16, -31]), B([16, -10]), B([0, -1]), B([-12, -6]), B([2, -7]), B([10, -16]), B([11, -30])], pal.shirtShade, 2.6, 0.9);
  s.fill(headPoly, pal.paper);
  arms.forEach((l) => l && l.hand !== null && s.fill(handPoly(l), pal.paper));
  legs.forEach((l) => l && l.shoe !== null && s.fill(shoePoly(l), pal.shoe));
  if (o.under) o.under();

  // ---- pen plate, in drawing order: head, curl, ear, face, body, arms, legs
  const fc = o.face || {};
  const look = h.look;
  s.line(headPoly, { closed: true, w: W, cut: cover });
  const F = (u, v) => H([u + look * 7, v]);
  // the curl, near the top, leaning away from the look
  const ct = -r + 1, cx = -3 - look * 6;
  s.line([H([cx, ct]), H([cx - 2, ct - 7]), H([cx + 3, ct - 11.5]), H([cx + 7.5, ct - 8]), H([cx + 3.5, ct - 4.5])], { w: FINE * k, cut: cover });
  // ear, on the side away from the look (hidden when facing straight)
  if (look !== 0) {
    const ex = -Math.sign(look) * (r * 1.04 - 1.5);
    s.line([H([ex, -4]), H([ex - Math.sign(look) * 4.5, -3.5]), H([ex - Math.sign(look) * 4.5, 4]), H([ex, 4.5])], { w: FINE * k, cut: cover });
  }
  face(s, F, k, fc, pal);
  // limbs behind the body are cut by it; the body is cut by limbs in front? (no: lines only)
  const behindCut = (l) => (l.behind ? [bodyPoly, headPoly] : [headPoly]).concat(cover, l.cut || []);
  s.line(bodyPoly, { closed: true, w: W, cut: cover, j: 0.5 });
  arms.forEach((l) => {
    if (!l) return;
    s.line(l.pts, { w: W, cut: behindCut(l) });
    if (l.hand !== null) s.line(handPoly(l), { closed: true, w: FINE * k, cut: cover });
  });
  legs.forEach((l) => {
    if (!l) return;
    s.line(l.pts, { w: W, cut: behindCut(l) });
    if (l.shoe !== null) s.line(shoePoly(l), { closed: true, w: FINE * k, cut: cover });
  });
  return { head: headPoly, body: bodyPoly, hands: arms.map((l) => l && handPoly(l)), H, B, F };
}

// ---------------------------------------------------------------- faces
// F(u, v): a point on the face (u right, v down, head radius 27).
// gaze: [x, y] -1..1 moves the pupils (dot, wide)
// eyes:  dot | wide | blank | heart | happy (^ ^) | bliss (u u) | squeeze (> <) | lidded | shut | spiral
// brows: up (worried) | pinch (cross) | raised | skeptic (one up) | flat | null
// mouth: smile | grin (open, filled) | open | o | grit | tongue | wobble | flat | frown | smirk | null
// blush, sweat: true / false
function face(s, F, k, f, pal) {
  const E = 9.5, EY = -1, w = FINE * k;
  const eyes = f.eyes || 'dot';
  const [gx, gy] = f.gaze || [0, 0];   // where the pupils look, -1..1 of the eye
  [-1, 1].forEach((sd) => {
    const x = sd * E;
    const L = (pts, ww = w) => s.line(pts.map(([u, v]) => F(x + u, EY + v)), { w: ww });
    if (eyes === 'dot') { const q = F(x + gx * 1.5, EY + gy * 1.5); s.dot(q[0], q[1], 7 * k); }
    if (eyes === 'wide') { s.line(ellipse(0, 0, 5, 5.6, 0, 10).map(([u, v]) => F(x + u, EY + v)), { closed: true, w }); const q = F(x + gx * 2, EY + gy * 2.2); s.dot(q[0], q[1], 4.6 * k); }
    if (eyes === 'happy') L([[-4.5, 2], [-2.5, -1.5], [0, -2.6], [2.5, -1.5], [4.5, 2]], w + 0.4);
    if (eyes === 'bliss') L([[-4.5, -1.5], [-2.5, 1.6], [0, 2.6], [2.5, 1.6], [4.5, -1.5]], w + 0.4);
    if (eyes === 'squeeze') L([[-sd * 4, -4], [sd * 3, 0], [-sd * 4, 4]], w + 0.4);
    if (eyes === 'lidded') { L([[-5, -2.5], [5, -2.5]]); const q = F(x + 1.5, EY + 1); s.dot(q[0], q[1], 5.4 * k); }
    if (eyes === 'shut') L([[-4.5, 0], [4.5, 0]], w + 0.4);
    if (eyes === 'blank') s.line(ellipse(0, 0, 4.6, 4.6, 0, 10).map(([u, v]) => F(x + u, EY + v)), { closed: true, w });
    if (eyes === 'heart') { const hp = [[0, 4.5], [-4.6, -0.5], [-4, -3.8], [-1.4, -4], [0, -2], [1.4, -4], [4, -3.8], [4.6, -0.5]].map(([u, v]) => F(x + u, EY + v)); s.fill(hp, pal.blush); s.line(hp, { closed: true, w: w * 0.85 }); }
    if (eyes === 'spiral') L([[0, 0], [2, -1], [1.5, 2], [-2, 2], [-3, -2], [1, -4.5], [4.5, -1]]);
    const b = f.brows;
    const inner = -sd * 5, outer = sd * 5;   // inner end is the one nearer the nose
    if (b === 'up') L([[outer, -7.5], [inner, -13]]);
    if (b === 'pinch') L([[outer, -12.5], [inner, -7]]);
    if (b === 'raised') L([[-5, -10], [0, -12.5], [5, -10]]);
    if (b === 'skeptic') L(sd < 0 ? [[-5, -13], [0, -14.5], [5, -12]] : [[-5, -8.5], [5, -8.5]]);
    if (b === 'flat') L([[-5, -9.5], [5, -9.5]]);
  });
  const M = (pts, closed) => s.line(pts.map(([u, v]) => F(u, v)), { w, closed });
  const m = f.mouth;
  if (m === 'smile') M([[-5, 9], [-2.5, 11.6], [0, 12.4], [2.5, 11.6], [5, 9]]);
  if (m === 'flat') M([[-4, 11], [4, 11]]);
  if (m === 'frown') M([[-5, 12.5], [0, 9.5], [5, 12.5]]);
  if (m === 'smirk') M([[-4, 11.5], [2, 11], [6, 8]]);
  if (m === 'wobble') M([[-7, 11], [-3.5, 9.5], [0, 11], [3.5, 9.5], [7, 11]]);
  if (m === 'o') M(ellipse(0, 11, 3, 3.6, 0, 10), true);
  if (m === 'grin') { const g = [[-8, 7.5], [8, 7.5], [5, 14], [0, 15.5], [-5, 14]]; s.fill(g.map(([u, v]) => F(u, v)), '#E5677F'); M(g, true); }
  if (m === 'tongue') { M([[-5, 10], [5, 10]]); const t = [[1, 10], [1.5, 15], [4.5, 15.5], [5.5, 10]]; s.fill(t.map(([u, v]) => F(u, v)), pal.blush); M(t); }
  if (m === 'open') { const g = ellipse(0, 11.5, 4.5, 5.5, 0, 10); s.fill(g.map(([u, v]) => F(u, v)), '#E5677F'); M(g, true); }
  if (m === 'grit') { const g = [[-8, 7], [8, 7], [8, 14], [-8, 14]]; s.fill(g.map(([u, v]) => F(u, v)), pal.paper); M(g, true); M([[-8, 10.5], [8, 10.5]]); [-3, 3].forEach((u) => M([[u, 7], [u, 14]])); }
  if (f.blush) [-1, 1].forEach((sd) => s.dots(ellipse(0, 0, 4.6, 3, 0, 8).map(([u, v]) => F(sd * 15 + u, 9 + v)), pal.blush, 2.2, 0.8));
  if (f.sweat) {
    const d = [[0, -7], [4, 1], [0, 4.5], [-4, 1]].map(([u, v]) => F(31 + u, -6 + v));
    s.fill(d, pal.paper); s.line(d, { closed: true, w });
  }
}

// ---------------------------------------------------------------- the AI
// The AI is always the same presence: signal blue set inside cream, with an
// ink edge, and (when it has one) a face printed in cream on the blue.
// inset: shrink a roundish shape toward its centre by d
const inset = (pts, d) => {
  const c = pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length], [0, 0]);
  return pts.map((q) => { const L = Math.hypot(q[0] - c[0], q[1] - c[1]); return lerp(q, c, d / L); });
};
// a speech bubble outline (with its tail) centred at cx, cy
function bubble(cx, cy, w, h, o = {}) {
  const r = Math.min(h / 2, o.r || 12), x = cx - w / 2, y = cy - h / 2;
  const tx = o.tail === undefined ? -0.25 : o.tail;            // tail position along the bottom, -0.5..0.5
  const bx = cx + tx * w, tl = o.tailLen || h * 0.38, dir = tx < 0 ? -1 : 1;
  const corner = (ccx, ccy, a0) => [0, 45, 90].map((d) => [ccx + r * Math.cos((a0 + d) * Math.PI / 180), ccy + r * Math.sin((a0 + d) * Math.PI / 180)]);
  const pts = [
    ...corner(x + w - r, y + r, -90), ...corner(x + w - r, y + h - r, 0),
    [bx + 7, y + h], [bx + dir * 4 - 2, y + h + tl], [bx - 3, y + h],
    ...corner(x + r, y + h - r, 90), ...corner(x + r, y + r, 180)
  ];
  const R = rotP(cx, cy, o.deg || 0);
  return dense(pts, true, 16).map(R);
}
// cream body, blue inside, ink edge. Returns the blue polygon.
function aiBody(s, pts, o = {}) {
  const blue = inset(pts, o.rim === undefined ? 4 : o.rim);
  s.fill(pts, s.pal.paper);
  s.fill(blue, s.pal.ai);
  if (o.shine !== false) s.dots(blue.slice(0, Math.ceil(blue.length * 0.3)).concat([blue.reduce((a, q) => [a[0] + q[0] / blue.length, a[1] + q[1] / blue.length], [0, 0])]), s.pal.aiTint, 3, 1);
  if (o.ink !== false) s.line(pts, { closed: true, j: 0.5, cut: o.cut });
  return blue;
}
// the AI's face, printed in cream: G(u, v) maps face points (about +-14 wide)
function aiFace(s, G, mood = 'calm', w = 3.4) {
  const B = (pts) => s.band(pts.map(([u, v]) => G(u, v)), s.pal.paper, w);
  const D = (u, v, r) => { const q = G(u, v); s.spot(q[0], q[1], r || w * 0.75, s.pal.paper); };
  const arcs = (up) => [-1, 1].forEach((sd) => B([[sd * 9 - 5, 0], [sd * 9, up ? -5 : 4], [sd * 9 + 5, 0]]));
  if (mood === 'calm') { arcs(true); B([[-4, 9], [0, 12], [4, 9]]); }
  if (mood === 'happy') { arcs(true); B([[-6, 8], [0, 14], [6, 8]]); }
  if (mood === 'blank') { D(-8, 0); D(8, 0); B([[-4, 10], [4, 10]]); }
  if (mood === 'sad') { D(-8, 1); D(8, 1); B([[-5, 12], [0, 9], [5, 12]]); }
  if (mood === 'shut') { B([[-12, 0], [-5, 0]]); B([[5, 0], [12, 0]]); B([[-3, 10], [3, 10]]); }
  if (mood === 'dots') [-8, 0, 8].forEach((u) => D(u, 0, w * 0.8));
  if (mood === 'wide') { D(-8, 0, w); D(8, 0, w); B([[-4, 10], [0, 12], [4, 10]]); }
}

module.exports = {
  poly, inset, bubble, aiBody, aiFace,
  INK, PAPER, SIGNAL, LINE, FINE, reseed, rnd, jit, cr, rot, rotP, frame, add, lerp, ellipse, rrect, dense, inside,
  visibleRuns, mix, lum, palette, scene, person, face
};
