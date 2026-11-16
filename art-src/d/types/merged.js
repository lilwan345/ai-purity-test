// PLUG-IN / The Accessory: "It's the phone. You're the case."
// The moment: the phone has somewhere to be and strides off, chin up. You
// cling to its side, flung out flat behind it by the stride, cheek pressed to
// it, eyes closed, perfectly happy to be carried along.
module.exports = (L) => {
  const s = L.scene('#2F3E46');
  const { pal } = s;

  // ---- the phone: upright, leaning into its stride ----
  const Ph = L.frame(162, 86, 8);
  const body = L.rrect(-38, -62, 76, 124, 15).map(Ph);
  const side = L.rrect(-33, -58, 76, 124, 15).map(Ph);
  const screen = L.rrect(-31, -51, 62, 102, 8).map(Ph);
  const hipB = Ph([-15, 61]), hipF = Ph([15, 61]);
  const legB = [hipB, [hipB[0] - 10, hipB[1] + 26], [126, 204]];
  const legF = [hipF, [hipF[0] + 14, hipF[1] + 20], [200, 200]];
  const shoe = (q, a) => L.ellipse(q[0] + 3 * Math.cos(a * Math.PI / 180), q[1] + 2, 8, 4.6, a, 10);
  const shoes = [shoe(legB[2], 160), shoe(legF[2], 10)];

  s.shadow(164, 208, 50, 4.5);
  s.shadow(70, 212, 26, 3);
  [legB, legF].forEach((l) => s.under(l, 8));
  shoes.forEach((p) => s.fill(p, pal.shoe));
  s.fill(side, pal.ink);
  s.fill(body, pal.paper);
  s.fill(screen, pal.ai);
  s.dots([Ph([-31, -20]), Ph([-31, -43]), Ph([-23, -51]), Ph([4, -51])], pal.aiTint, 3, 1);
  // its face, printed in cream on the blue: eyes closed, chin up, pleased
  [-12, 12].forEach((x) => s.band([Ph([x - 6, -14]), Ph([x, -20]), Ph([x + 6, -14])], pal.paper, 3.6));
  s.band([Ph([-5, -2]), Ph([0, 1]), Ph([5, -2])], pal.paper, 3.2);
  // speed lines behind, printed in cream
  [[[14, 112], [40, 110]], [[10, 130], [30, 129]], [[18, 148], [34, 148]]].forEach((l) => s.band(l, pal.paper, 2.6));

  // ---- the person, flung out flat behind it ----
  const P = L.person(s, {
    at: [56, 150], k: 1.02, lean: 72,
    head: { dx: -27, dy: 6, tilt: -58, look: 0.35 },
    face: { eyes: 'bliss', mouth: 'smile', blush: true },
    // one arm round the back of the phone, one hand flat on its front
    arms: [{ to: Ph([-34, 36]), bend: 0.15, hand: null, behind: true, cut: [body] }, { to: Ph([-27, 50]), bend: -0.2 }],
    legs: [
      { to: [24, 176], bend: 0.18, shoe: 115, behind: true },
      { to: [38, 184], bend: 0.12, shoe: 100 }
    ]
  });

  // ---- pen plate of the phone ----
  const cut = [P.head, P.hands[1]];
  s.line(body, { closed: true, j: 0.7, cut });
  s.line(screen, { closed: true, w: L.FINE, j: 0.5, cut });
  s.line([Ph([-8, -57]), Ph([8, -57])], { w: L.FINE });
  [legB, legF].forEach((l) => s.line(l));
  shoes.forEach((p) => s.line(p, { closed: true, w: L.FINE }));
  return s.svg();
};
