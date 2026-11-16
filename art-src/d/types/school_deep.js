// CRAMBOT / The Cram Buddy: "Studies in a group of two. One of them is a chatbot."
// The moment: deep into the night, face down on the open book, eyes spinning.
// The desk lamp is the chatbot, and it is wide awake, leaning in, beaming,
// keeping the light on them. Ready for the next question.
module.exports = (L) => {
  const s = L.scene('#3E7B5B', { shirt: '#F2B33D', dark: true });
  const { pal } = s;

  const top = 168;
  const desk = L.poly([[8, top], [232, top], [232, top + 10], [8, top + 10]]);
  const front = L.poly([[18, top + 10], [222, top + 10], [222, 250], [18, 250]]);
  const book = [[66, top - 2], [100, top - 6], [134, top - 2], [134, top], [66, top]];
  const mug = L.rrect(152, top - 24, 18, 24, 4);
  // the lamp: base on the desk at the right, two arms, the shade leaning in
  const base = L.ellipse(204, top - 3, 18, 5, 0, 10);
  const j1 = [212, 104], j2 = [176, 64];
  const Sh = L.frame(j2[0] - 6, j2[1] + 6, 145, 1.35);          // shade frame, opening toward the person
  const shade = [[-8, -10], [8, -10], [24, 22], [-24, 22]].map(([u, v]) => Sh([u, v]));
  const glowA = Sh([-22, 24]), glowB = Sh([22, 24]);

  s.shadow(120, top + 2, 92, 3);
  // the light, a fan of cream dots down onto the book
  s.dots([glowA, glowB, [150, top - 4], [62, top - 4]], pal.paper, 3.2, 1.05);
  s.fill(book, pal.paper);
  s.fill(mug, pal.paper);
  s.under([[204, top - 4], j1, j2], 7);
  s.fill(base, pal.paper);
  L.aiBody(s, shade, { rim: 3, ink: false, shine: false });
  const sc = shade.reduce((a, q) => [a[0] + q[0] / 4, a[1] + q[1] / 4], [0, 0]);
  L.aiFace(s, (u, v) => [sc[0] + 2 + u * 0.6, sc[1] - 2 + v * 0.6], 'happy', 2.8);

  const me = L.person(s, {
    at: [54, 204], k: 1.14, lean: 30,
    head: { dx: 10, dy: 0, tilt: 16, look: 0.4 },
    face: { eyes: 'spiral', mouth: 'frown' },
    arms: [{ to: [36, top - 4], bend: -0.2 }, { to: [144, top - 5], bend: 0.15 }],
    legs: [],
    cover: [front.concat([]), desk]
  });
  // the desk goes over the person's lower half
  s.fill(desk, pal.paper);
  s.fill(front, pal.shadow);

  s.line(desk, { closed: true, j: 0.5 });
  s.line(book, { closed: true, w: L.FINE, cut: [me.head] });
  s.line([[100, top - 6], [100, top]], { w: L.FINE, cut: [me.head] });
  s.line(mug, { closed: true, w: L.FINE });
  s.line(L.ellipse(172, top - 14, 5, 6, 0, 8, -80, 80), { w: L.FINE });
  s.line([[204, top - 4], j1, j2], { cut: [shade] });
  s.line(base, { closed: true, w: L.FINE });
  s.line(shade, { closed: true, j: 0.4 });
  return s.svg();
};
