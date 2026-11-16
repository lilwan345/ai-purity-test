// 404 / Cloud-Hosted Brain: "Your opinions now come with a loading spinner."
// The moment: someone asked what they think. A finger goes up to make the
// point, the mouth opens, the eyes go empty, and above their head a big
// chatbot loading spinner turns. Nothing comes.
module.exports = (L) => {
  const s = L.scene('#A0672E', { shirt: '#86CFC1', dark: true });
  const { pal } = s;

  const c = [150, 62], R = 36;
  const disc = L.ellipse(c[0], c[1], R, R, 0, 18);

  s.shadow(98, 222, 40, 4.5);
  s.fill(disc, pal.paper);
  s.fill(L.ellipse(c[0], c[1], R - 5, R - 5, 0, 18), pal.ai);
  // the spinner: a ring of cream dots, big to small
  for (let i = 0; i < 8; i++) {
    const a = (-90 + i * 45) * Math.PI / 180;
    s.spot(c[0] + 19 * Math.cos(a), c[1] + 19 * Math.sin(a), 5.6 - i * 0.55, pal.paper);
  }

  const me = L.person(s, {
    at: [96, 200], k: 1.1, lean: -4,
    head: { tilt: 4, look: 0.25 },
    face: { eyes: 'blank', mouth: 'open' },
    arms: [{ to: [68, 176], bend: 0.12 }, { to: [134, 116], bend: -0.3 }],
    legs: [{ to: [82, 224], bend: 0.04, shoe: 185 }, { to: [112, 224], bend: -0.04, shoe: -5 }]
  });

  s.line([[135, 111], [136, 101]], { w: 3.2 });                    // the raised finger
  s.line(disc, { closed: true, j: 0.4 });
  // a trail of thought from the head up to the spinner
  [[112, 98], [118, 92], [124, 87]].forEach(([x, y], i) => s.dot(x, y, 3 + i * 0.8));
  return s.svg();
};
