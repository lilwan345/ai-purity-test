// CC-BOT / Couples Therapy Included: "Your relationships have a consultant."
// The moment: holding their own heart up in both hands for inspection, chin
// set, eager to hear the verdict. The consultant is a chatbot in round
// glasses, which has never met anyone involved.
module.exports = (L) => {
  const s = L.scene('#B5523B', { shirt: '#F2B33D' });
  const { pal } = s;

  const bc = [70, 68];
  const bub = L.bubble(bc[0], bc[1], 82, 62, { tail: 0.28, r: 20, tailLen: 16 });
  const heart = [[0, 18], [-17, 2], [-18, -8], [-12, -15], [-4, -14], [0, -8], [4, -14], [12, -15], [18, -8], [17, 2]].map(([u, v]) => [112 + u * 1.2, 160 + v * 1.2]);
  const crack = [[112, 151], [108, 158], [115, 163], [110, 172]];

  s.shadow(170, 226, 40, 4.5);
  L.aiBody(s, bub, { rim: 4.5, ink: false });
  L.aiFace(s, (u, v) => [bc[0] + u * 1.1, bc[1] - 2 + v * 1.1], 'blank', 3.4);
  s.fill(heart, '#E5677F');
  s.dots(heart.slice(5, 9).concat([[112, 151]]), pal.paper, 2.6, 0.8);

  const me = L.person(s, {
    at: [178, 202], k: 1.1, lean: -16,
    head: { tilt: 12, look: -0.7 },
    face: { eyes: 'dot', gaze: [-1, -0.7], brows: 'raised', mouth: 'smile', blush: true },
    arms: [{ to: [94, 164], bend: 0.12 }, { to: [130, 166], bend: -0.2 }],
    legs: [{ to: [160, 224], bend: -0.06, shoe: 160 }, { to: [196, 222], bend: 0.08, shoe: 30 }],
    cover: [heart]
  });

  s.line(heart, { closed: true, j: 0.4 });
  s.line(crack, { w: 1.8 });
  s.line(bub, { closed: true, j: 0.5 });
  // the consultant's round glasses
  [-12, 12].forEach((u) => s.line(L.ellipse(bc[0] + u * 1.1, bc[1] - 2, 9, 8, 0, 12), { closed: true, w: L.FINE }));
  s.line([[bc[0] - 3, bc[1] - 3], [bc[0] + 3, bc[1] - 3]], { w: L.FINE });
  return s.svg();
};
