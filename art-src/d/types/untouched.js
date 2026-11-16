// ANALOG / The Analog: "Factory settings. Never updated."
// The moment: marching off with a pencil the size of a spear on one shoulder,
// chin up, eyes shut, very pleased with themselves. Behind them, small and
// alone on the ground, a chatbot is still waiting to be asked something.
module.exports = (L) => {
  const s = L.scene('#D9CBB4', { shirt: '#E8735E' });
  const { pal } = s;

  // the pencil, along an axis from the eraser end E toward the tip
  const E = [182, 152], T = [62, 36];
  const ang = Math.atan2(T[1] - E[1], T[0] - E[0]) * 180 / Math.PI;
  const Pf = L.frame(E[0], E[1], ang);
  const P = (pts) => pts.map(Pf);
  const eraser = P([[2, -8], [16, -8], [16, 8], [2, 8], [-1, 4], [-1, -4]]);
  const ferrule = P(L.poly([[16, -8.5], [26, -8.5], [26, 8.5], [16, 8.5]], 6));
  const body = P(L.poly([[26, -8], [132, -8], [132, 8], [26, 8]], 12));
  const cone = P([[132, -8], [156, -2.4], [156, 2.4], [132, 8]]);
  const lead = P([[156, -2.4], [165, 0], [156, 2.4]]);

  // the chatbot, waiting
  const bub = L.bubble(50, 196, 40, 30, { tail: 0.25, r: 11 });

  s.shadow(142, 224, 38, 4.5);
  s.shadow(52, 222, 22, 3);
  s.fill(body, pal.paper);
  s.dots(P([[26, 2], [132, 2], [132, 8], [26, 8]]), pal.shadow, 2.6, 0.9);
  s.fill(eraser, pal.shirt);
  s.fill(ferrule, pal.paper);
  s.fill(cone, pal.paper);
  s.dots(P([[132, 2], [156, 0], [156, 2.4], [132, 8]]), pal.shadow, 2.6, 0.9);
  s.fill(lead, pal.ink);
  L.aiBody(s, bub, { rim: 3.5, ink: false });
  L.aiFace(s, (u, v) => [50 + u * 0.75, 193 + v * 0.75], 'sad', 2.8);

  const me = L.person(s, {
    at: [138, 194], k: 1.05, lean: -5,
    head: { tilt: -10, look: 0.6 },
    face: { eyes: 'shut', brows: 'raised', mouth: 'smirk' },
    arms: [{ to: [104, 178], bend: 0.18 }, { to: [158, 132], bend: -0.45 }],
    legs: [{ to: [126, 222], bend: 0.05, shoe: 0 }, { knee: [166, 180], to: [166, 204], shoe: 15 }]
  });

  // pen: the pencil (behind the head), then the chatbot
  const cut = [me.head, me.hands[1]];
  [body, eraser, ferrule].forEach((p) => s.line(p, { closed: true, cut, j: 0.4 }));
  s.line(P([[30, 0], [128, 0]]), { w: 1.6, cut });
  s.line([cone[0], cone[1]], { w: L.FINE, cut });
  s.line([cone[3], cone[2]], { w: L.FINE, cut });
  s.line(lead, { w: L.FINE, cut });
  s.line(P([[20, -8], [20, 8]]), { w: 1.6, cut });
  s.line(bub, { closed: true, j: 0.4 });
  return s.svg();
};
