// SAMPLER / Well-Rounded (Derogatory): "Equal portions. No favorites."
// The moment: on a tightrope, on one foot, holding a balance pole with a
// chatbot hanging from each end, exactly the same size. Tongue out. Not
// letting either side win.
module.exports = (L) => {
  const s = L.scene('#9AA8B4', { shirt: '#EF8BA8' });
  const { pal } = s;

  const rope = [[-10, 200], [60, 206], [104, 213], [170, 207], [250, 196]];
  const A = [24, 136], Bp = [218, 124];                 // pole ends: a slight tilt, still level enough
  const on = (t) => L.lerp(A, Bp, t);
  const bubL = L.bubble(A[0] + 2, A[1] + 38, 40, 30, { tail: 0, r: 12, tailLen: 0 });
  const bubR = L.bubble(Bp[0] - 2, Bp[1] + 38, 40, 30, { tail: 0, r: 12, tailLen: 0 });

  s.shadow(104, 232, 26, 3);
  [bubL, bubR].forEach((b, i) => {
    L.aiBody(s, b, { rim: 3.5, ink: false });
    const c = i ? [Bp[0] - 2, Bp[1] + 38] : [A[0] + 2, A[1] + 38];
    L.aiFace(s, (u, v) => [c[0] + u * 0.8, c[1] - 1 + v * 0.8], 'blank', 3);
  });

  const me = L.person(s, {
    at: [100, 184], k: 1.16, lean: 5,
    head: { tilt: 4, look: 0 },
    face: { eyes: 'dot', gaze: [0, 1], brows: 'flat', mouth: 'tongue' },
    arms: [{ to: on(0.34), bend: 0.25 }, { to: on(0.54), bend: -0.25 }],
    legs: [{ to: [104, 211], bend: 0.04, shoe: 5 }, { knee: [134, 190], to: [122, 174], shoe: 200 }]
  });

  // pen: rope, pole, strings, chatbots
  s.line(rope, { w: 2, cut: [me.body] });
  s.line([A, Bp], { w: 3.4, cut: me.hands });
  s.line([A, [A[0] + 2, A[1] + 23]], { w: 1.8 });
  s.line([Bp, [Bp[0] - 2, Bp[1] + 23]], { w: 1.8 });
  s.line(bubL, { closed: true, j: 0.4 });
  s.line(bubR, { closed: true, j: 0.4 });
  return s.svg();
};
