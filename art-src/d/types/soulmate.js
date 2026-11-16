// PLUS-1 / The Plus One: "It doesn't remember you. You remember everything it said."
// The moment: lying on the floor on their stomach, chin in hands, feet kicking
// in the air, heart eyes for the laptop. The laptop looks back with a polite
// blank face: it has no idea who this is.
module.exports = (L) => {
  const s = L.scene('#D98C9A', { shirt: '#86CFC1' });
  const { pal } = s;

  // the laptop, three-quarter view, on the floor at the left
  const screen = L.rrect(20, 136, 66, 58, 7);
  const base = [[14, 197], [92, 197], [100, 207], [8, 207]];

  s.shadow(58, 216, 50, 3.6);
  s.shadow(170, 220, 56, 4);
  s.fill(base, pal.paper);
  s.dots([[11, 203], [97, 203], [100, 207], [8, 207]], pal.shadow, 2.6, 0.9);
  L.aiBody(s, screen, { rim: 5, ink: false });
  L.aiFace(s, (u, v) => [53 + u * 0.95, 162 + v * 0.95], 'blank', 3.2);
  // two little hearts drifting toward it, printed in cream
  const heart = (x, y, k) => [[0, 5], [-5, 0], [-4.5, -3.8], [-1.5, -4.2], [0, -2], [1.5, -4.2], [4.5, -3.8], [5, 0]].map(([u, v]) => [x + u * k, y + v * k]);
  s.fill(heart(106, 110, 1.7), pal.paper);
  s.fill(heart(86, 84, 1.15), pal.paper);

  const me = L.person(s, {
    at: [196, 200], k: 1.0, lean: -90,
    head: { dx: 36, dy: 0, tilt: 90, look: -0.7 },
    face: { eyes: 'heart', mouth: 'grin', blush: true },
    arms: [{ elbow: [118, 214], to: [123, 190] }, { elbow: [142, 214], to: [137, 192] }],
    legs: [{ knee: [214, 213], to: [208, 176], shoe: -110 }, { knee: [224, 211], to: [226, 172], shoe: -60 }]
  });

  s.line(screen, { closed: true, j: 0.4 });
  s.line(base, { closed: true, j: 0.4 });
  
  return s.svg();
};
