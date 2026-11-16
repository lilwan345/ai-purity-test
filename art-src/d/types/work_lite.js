// NOTED / The Inbox Polisher: "Your grown-up self has been through a filter."
// The moment: on tiptoe, tipping a crumpled, scribbled draft into a big
// chatbot funnel, teeth clenched in an "eek". Out of the bottom drops a crisp,
// perfect envelope with a little sparkle.
module.exports = (L) => {
  const s = L.scene('#A7BED3', { shirt: '#EF8BA8' });
  const { pal } = s;

  // the funnel (the chatbot): a rim, a cone, a spout
  const cx = 82, ry0 = 98, rx = 44;
  const rimBack = L.ellipse(cx, ry0, rx, 11, 0, 9, 180, 360);
  const cone = [[cx - rx, ry0], ...L.ellipse(cx, ry0, rx, 11, 0, 9, 180, 0).slice(1, -1), [cx + rx, ry0], [cx + 9, 150], [cx + 8, 166], [cx - 8, 166], [cx - 9, 150]];
  const mouth = L.ellipse(cx, ry0, rx - 5, 8, 0, 14);
  // the envelope that comes out
  const env = L.poly([[cx - 26, 178], [cx + 26, 176], [cx + 27, 210], [cx - 25, 212]]);
  const star = (x, y, r) => [[0, -r], [r * 0.25, -r * 0.25], [r, 0], [r * 0.25, r * 0.25], [0, r], [-r * 0.25, r * 0.25], [-r, 0], [-r * 0.25, -r * 0.25]].map(([u, v]) => [x + u, y + v]);
  // the crumpled draft in the person's hands
  const draft = L.jit([[128, 72], [150, 66], [160, 84], [152, 100], [134, 104], [120, 90]], 4);

  s.shadow(cx, 218, 38, 3.6);
  s.shadow(176, 220, 30, 4);
  L.aiBody(s, cone, { rim: 4, ink: false });
  s.fill(mouth, pal.ink);
  L.aiFace(s, (u, v) => [cx + u * 0.85, 124 + v * 0.85], 'calm', 3);
  s.fill(env, pal.paper);
  s.fill(star(cx + 40, 172, 8), pal.paper);
  s.fill(star(cx - 38, 190, 5), pal.paper);
  s.fill(draft, pal.paper);

  const me = L.person(s, {
    at: [178, 196], k: 1.02, lean: -16,
    head: { tilt: 8, look: -0.7 },
    face: { eyes: 'dot', gaze: [-1, 0.2], brows: 'raised', mouth: 'grit' },
    arms: [{ to: [128, 94], bend: -0.12 }, { to: [154, 92], bend: 0.2 }],
    legs: [{ to: [166, 220], bend: 0.05, shoe: -30 }, { to: [192, 218], bend: -0.08, shoe: -20 }],
    cover: [draft]
  });

  s.line(cone, { closed: true, j: 0.5 });
  s.line(mouth, { closed: true, w: L.FINE });
  s.line(draft, { closed: true, w: L.FINE });
  // scribbles on the draft, and the neat flap on the envelope
  s.line([[130, 82], [138, 78], [144, 86], [150, 79]], { w: 1.6 });
  s.line([[128, 92], [136, 95], [142, 89], [148, 95]], { w: 1.6 });
  s.line(env, { closed: true, j: 0.3 });
  s.line([[cx - 25, 179], [cx, 197], [cx + 26, 177]], { w: L.FINE });
  s.line([[124, 76], [133, 72]], { w: 1.4 });
  s.line([[152, 88], [146, 96]], { w: 1.4 });
  return s.svg();
};
