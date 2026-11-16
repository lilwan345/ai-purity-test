// TLDR / The Skimmer: "School, with a chatbot kept within reach."
// The moment: walking to class with a backpack, whistling, a chatbot tied to
// the backpack strap like a balloon, floating along just within reach.
module.exports = (L) => {
  const s = L.scene('#9CC5A1', { shirt: '#E8735E' });
  const { pal } = s;

  const balloon = L.bubble(70, 62, 72, 54, { tail: 0.18, r: 20, tailLen: 14 });
  const tailTip = [70 + 0.18 * 72 + 2.5, 62 + 27 + 14];
  let pack;

  s.shadow(150, 220, 38, 4.5);
  L.aiBody(s, balloon, { rim: 4.5, ink: false });
  L.aiFace(s, (u, v) => [70 + u * 1.05, 58 + v * 1.05], 'calm', 3.4);

  const me = L.person(s, {
    at: [152, 188], k: 1.0, lean: 7,
    head: { tilt: -6, look: 0.6 },
    face: { eyes: 'happy', mouth: 'o' },
    before: (B) => { pack = [[-12, -42], [-30, -40], [-35, -14], [-16, -8]].map(B); s.fill(pack, pal.paper); s.dots(pack.slice(1, 3).concat([B([-20, -12])]), pal.shadow, 2.6, 0.9); },
    arms: [{ to: [124, 152], bend: 0.2 }, { to: [182, 176], bend: -0.15 }],
    legs: [{ to: [128, 216], bend: -0.12, shoe: -15 }, { to: [178, 216], bend: 0.1, shoe: 8 }]
  });

  s.line(pack, { closed: true, cut: [me.body], j: 0.5 });
  s.line(balloon, { closed: true, j: 0.5 });
  // the string: from the balloon, loose, down to the hand
  s.line([tailTip, [96, 120], [112, 132], [121, 148]], { w: 1.8 });
  return s.svg();
};
