// HAHA-OK / The Text Decoder: "Has a second opinion on your people."
// The moment: leaning back from a text that is just a full stop, phone held
// out at arm's length, hand on chin, one eyebrow up. The chatbot, a cursor,
// leans in over the screen to give its reading.
module.exports = (L) => {
  const s = L.scene('#F2B5A0', { shirt: '#86CFC1' });
  const { pal } = s;

  // the phone (theirs, not the chatbot): cream, a pink message with one dot
  const Pf = L.frame(176, 132, 14);
  const phone = L.rrect(-17, -30, 34, 60, 7).map(Pf);
  const scr = L.rrect(-12, -23, 24, 44, 3).map(Pf);
  const msg = L.rrect(-9, -12, 16, 11, 4).map(Pf);
  const dotq = Pf([-1, -6.5]);
  // the chatbot: a cursor, tipped toward the screen
  const Cf = L.frame(196, 30, 18, 1.55);
  const cursor = [[0, 0], [0, 40], [10, 31], [17, 46], [25, 42], [18, 28], [30, 27]].map(Cf);

  s.shadow(96, 222, 38, 4.5);
  s.fill(phone, pal.paper);
  s.fill(scr, '#FFF8EE');
  s.fill(msg, pal.blush);
  L.aiBody(s, cursor, { rim: 4, ink: false, shine: false });
  L.aiFace(s, (u, v) => Cf([12 + u * 0.32, 26 + v * 0.32]), 'wide', 1.9);

  const me = L.person(s, {
    at: [92, 198], k: 1.05, lean: -14,
    head: { dx: -3, tilt: 2, look: 0.7 },
    face: { eyes: 'dot', gaze: [1, -0.2], brows: 'skeptic', mouth: 'frown' },
    arms: [{ to: [100, 140], bend: -0.42 }, { to: Pf([-15, 10]), bend: 0.08 }],
    legs: [{ to: [70, 222], bend: 0.06, shoe: 190 }, { to: [112, 222], bend: -0.1, shoe: 10 }]
  });

  s.line(phone, { closed: true, j: 0.4, cut: [me.hands[1]] });
  s.line(scr, { closed: true, w: 1.6 });
  s.line(msg, { closed: true, w: 1.6 });
  s.dot(dotq[0], dotq[1], 3.6);
  s.line(cursor, { closed: true, j: 0.3 });
  // the cursor's "reading" line to the message
  return s.svg();
};
