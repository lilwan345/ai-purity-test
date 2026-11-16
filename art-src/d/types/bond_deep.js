// MY-BOT / It's Complicated: "Hard-launched a language model."
// The moment: the couple selfie. Phone held high, an arm round the chatbot,
// cheek to cheek, the biggest grin of their life. The chatbot gives the
// camera the same blank, polite face it gives everyone.
module.exports = (L) => {
  const s = L.scene('#5B4B8A', { shirt: '#EF8BA8', dark: true });
  const { pal } = s;

  const bc = [164, 116];
  const bub = L.bubble(bc[0], bc[1], 78, 60, { tail: 0.25, r: 22, tailLen: 15, deg: 6 });
  const Pf = L.frame(46, 50, -20);
  const phone = L.rrect(-14, -24, 28, 48, 6).map(Pf);
  const star = (x, y, r) => [[0, -r], [r * 0.25, -r * 0.25], [r, 0], [r * 0.25, r * 0.25], [0, r], [-r * 0.25, r * 0.25], [-r, 0], [-r * 0.25, -r * 0.25]].map(([u, v]) => [x + u, y + v]);
  const heart = (x, y, k) => [[0, 5], [-5, 0], [-4.5, -3.8], [-1.5, -4.2], [0, -2], [1.5, -4.2], [4.5, -3.8], [5, 0]].map(([u, v]) => [x + u * k, y + v * k]);

  s.shadow(110, 222, 52, 4.5);
  L.aiBody(s, bub, { rim: 4.5, ink: false });
  L.aiFace(s, (u, v) => [bc[0] + 4 + u * 1.05, bc[1] - 4 + v * 1.05], 'blank', 3.4);
  s.fill(phone, pal.paper);
  s.fill(star(92, 30, 7), pal.paper);
  s.fill(star(214, 60, 5), pal.paper);
  s.fill(heart(208, 178, 1.4), pal.blush);

  const me = L.person(s, {
    at: [96, 204], k: 1.08, lean: 12,
    head: { dx: 8, tilt: 6, look: 0.35 },
    face: { eyes: 'happy', brows: 'raised', mouth: 'grin', blush: true },
    arms: [{ to: Pf([0, 18]), bend: 0.12 }, { to: [190, 132], bend: 0.18, behind: true, cut: [] }],
    legs: [{ to: [80, 228], bend: 0.04, shoe: 190 }, { to: [118, 226], bend: -0.12, shoe: 15 }],
    cover: [phone]
  });

  s.line(bub, { closed: true, j: 0.5, cut: [me.head] });
  s.line(phone, { closed: true, j: 0.4 });
  s.line(L.ellipse(...Pf([0, -14]), 3, 3, 0, 6), { closed: true, w: 1.6 });
  s.line(heart(208, 178, 1.4), { closed: true, w: L.FINE });
  return s.svg();
};
