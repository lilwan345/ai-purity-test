// SORRY / The Apologizer: "Gives a chatbot manners and feelings it never asked for."
// The moment: a full, deep bow, eyes squeezed shut, mouth wobbling, a bead of
// sweat, in front of a little smart speaker that has been set on a cushion
// and served a cup of tea. The speaker looks back, blank.
module.exports = (L) => {
  const s = L.scene('#B9A6D9', { shirt: '#F2B33D' });
  const { pal } = s;

  // the speaker on its cushion, on the left
  const sx = 54;
  const cushion = [[sx - 30, 210], [sx - 26, 198], [sx + 26, 198], [sx + 30, 210], [sx + 26, 218], [sx - 26, 218]];
  const spk = L.poly([[sx - 20, 132], [sx + 20, 132], [sx + 21, 196], [sx - 21, 196]]);
  const top = L.ellipse(sx, 132, 20, 6, 0, 12);
  const cup = L.poly([[84, 206], [98, 206], [96, 218], [86, 218]], 5);

  s.shadow(54, 222, 38, 3.6);
  s.shadow(172, 226, 42, 4);
  s.fill(cushion, pal.shirt);
  s.dots(cushion.slice(3).concat([[sx, 214]]), pal.shirtShade, 2.6, 0.9);
  L.aiBody(s, spk, { rim: 4, ink: false });
  s.fill(top, pal.paper);
  L.aiFace(s, (u, v) => [sx + u * 0.85, 158 + v * 0.85], 'blank', 3);
  s.fill(cup, pal.paper);
  s.band([[90, 200], [92, 194], [90, 188]], pal.paper, 2);         // steam

  const me = L.person(s, {
    at: [190, 192], k: 1.12, lean: -74,
    head: { dx: 4, dy: 6, tilt: 44, look: -0.6 },
    face: { eyes: 'squeeze', brows: 'up', mouth: 'wobble', sweat: true },
    arms: [{ to: [140, 206], bend: 0.1 }, { to: [150, 210], bend: -0.08 }],
    legs: [{ to: [182, 224], bend: -0.02, shoe: 185 }, { to: [198, 224], bend: 0.02, shoe: 175 }]
  });

  s.line(cushion, { closed: true, j: 0.4 });
  s.line(spk, { closed: true, j: 0.4 });
  s.line(top, { closed: true, w: L.FINE });
  [-8, 0, 8].forEach((u) => s.line([[sx + u - 3, 186], [sx + u + 3, 186]], { w: 1.8 }));  // grille
  s.line(cup, { closed: true, w: L.FINE });
  s.line(L.ellipse(99, 211, 3, 3.5, 0, 6, -90, 90), { w: 1.6 });
  return s.svg();
};
