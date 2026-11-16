// IDK / The Coin Flipper: "Has a consultant for things that don't need one."
// The moment: the coin (a chat bubble minted on it) is still in the air, and
// the person is already on their knees, hands clasped, begging it to decide.
// A life-or-death face for a choice that does not matter.
module.exports = (L) => {
  const s = L.scene('#E9C46A');
  const { pal } = s;

  // ---- the coin, high and to the right, mid-flip ----
  const cx = 174, cy = 62, rx = 40, ry = 31, ang = -24, off = [6, 8];
  const front = L.ellipse(cx, cy, rx, ry, ang, 18);
  const back = L.ellipse(cx + off[0], cy + off[1], rx, ry, ang, 18);
  const inFront = (q) => L.inside(q, L.ellipse(cx, cy, rx + 0.8, ry + 0.8, ang, 36));
  const R = L.rot(ang);
  const C = (u, v) => { const q = R([u, v * ry / rx]); return [cx + q[0], cy + q[1]]; };   // flat coin face -> tilted
  const bubble = L.rrect(-17, -13, 34, 22, 9).map(([u, v]) => C(u, v));
  const tail = [[-9, 9], [-13, 17], [-1, 9]].map(([u, v]) => C(u, v));

  // ground first (plates): the person's shadow and the coin's, far below it
  s.shadow(80, 222, 46, 4.5);
  s.shadow(184, 222, 13, 2.6);
  // colour plate of the coin
  s.fill(back, pal.ai);
  s.fill(front, pal.paper);
  s.dots(L.ellipse(cx, cy, rx, ry, ang, 9, 0, 180).concat(L.ellipse(cx - 5, cy - 7, rx, ry, ang, 9, 180, 0)), pal.aiTint, 3, 1);
  s.fill(bubble.concat([]), pal.ai);
  s.fill(tail, pal.ai);
  [-8, 0, 8].forEach((u) => { const q = C(u, -2); s.spot(q[0], q[1], 2.2, pal.paper); });

  // ---- the person, kneeling, looking up at it ----
  const P = L.person(s, {
    at: [70, 190], k: 1.12, lean: 12,
    head: { dx: 2, dy: 2, tilt: -12, look: 0.8 },
    face: { eyes: 'wide', gaze: [0.9, -1], brows: 'up', mouth: 'wobble', blush: true, sweat: true },
    arms: [{ to: [104, 142], bend: 0.3, hand: null }, { to: [106, 143], bend: -0.3 }],   // hands clasped: one fist
    legs: [
      { knee: [88, 214], to: [56, 218], shoe: 180, behind: true },
      { knee: [97, 214], to: [66, 219], shoe: 180 }
    ]
  });

  // ---- pen plate of the coin, after the person ----
  s.line(front, { closed: true, j: 0.4 });
  // the visible part of the back rim: one run, starting where it leaves the face
  const all = L.ellipse(cx + off[0], cy + off[1], rx, ry, ang, 60);
  const vis = all.map((q) => !inFront(q));
  const st = vis.findIndex((v, i) => v && !vis[(i + 59) % 60]);
  const run = []; for (let i = 0; i < 60 && vis[(st + i) % 60]; i++) run.push(all[(st + i) % 60]);
  s.line(run);
  L.ellipse(cx, cy, rx, ry, ang, 34).forEach((q) => {
    const m = [q[0] + off[0] * 0.5, q[1] + off[1] * 0.5];
    if (!inFront(m)) s.line([[q[0] + off[0] * 0.15, q[1] + off[1] * 0.15], [q[0] + off[0] * 0.85, q[1] + off[1] * 0.85]], { w: 1.6 });
  });
  s.line(bubble, { closed: true, w: L.FINE });
  s.line(tail, { w: L.FINE });
  // spin, and the flight path up from the clasped hands
  s.line(L.ellipse(cx + 3, cy + 4, rx + 13, ry + 12, ang, 6, 200, 250), { w: L.FINE });
  s.line(L.ellipse(cx + 3, cy + 4, rx + 13, ry + 12, ang, 6, 25, 70), { w: L.FINE });
  [[121, 139], [130, 129], [138, 118], [145, 107]].forEach(([x, y], i) => s.dot(x, y, 4 - i * 0.4));
  return s.svg();
};
