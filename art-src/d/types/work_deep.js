// SYNERGY / Professionally Ghostwritten: "Your LinkedIn has a better personality than you."
// The moment: beside a huge framed portrait of themselves, as written by the
// chatbot: tie, sparkles, the grin of a go-getter. The real one stands next
// to it with a mug, slouched, completely flat.
module.exports = (L) => {
  const s = L.scene('#3D5A80', { shirt: '#E8735E', dark: true });
  const { pal } = s;

  // the portrait: cream frame, blue panel (the chatbot made it)
  const fx0 = 18, fy0 = 18, fx1 = 140, fy1 = 156;
  const frame = L.rrect(fx0, fy0, fx1 - fx0, fy1 - fy0, 6);
  const panel = L.rrect(fx0 + 8, fy0 + 8, fx1 - fx0 - 16, fy1 - fy0 - 16, 3);
  const bottom = L.poly([[fx0, fy1 - 8], [fx1, fy1 - 8], [fx1, fy1], [fx0, fy1]]);
  const star = (x, y, r) => [[0, -r], [r * 0.25, -r * 0.25], [r, 0], [r * 0.25, r * 0.25], [0, r], [-r * 0.25, r * 0.25], [-r, 0], [-r * 0.25, -r * 0.25]].map(([u, v]) => [x + u, y + v]);

  s.shadow(186, 222, 32, 4);
  s.fill(frame, pal.paper);
  s.fill(panel, pal.ai);
  s.dots(panel.slice(0, 4).concat([[fx0 + 40, fy0 + 60]]), pal.aiTint, 3, 1);
  // the portrait version: big grin, tie, a thumbs up
  const hero = L.person(s, {
    at: [80, fy1 + 2], k: 0.95, lean: 0,
    head: { look: 0.15 },
    face: { eyes: 'happy', brows: 'raised', mouth: 'grin', blush: true },
    arms: [null, { to: [116, 112], bend: -0.25 }],
    cover: [bottom]
  });
  const tie = [[80, fy1 - 42], [84, fy1 - 36], [82, fy1 - 18], [80, fy1 - 14], [78, fy1 - 18], [76, fy1 - 36]];
  s.fill(tie, pal.paper);
  s.fill(bottom, pal.paper);
  s.fill(star(124, 40, 7), pal.paper);
  s.fill(star(36, 128, 5), pal.paper);
  s.line(tie, { closed: true, w: L.FINE });
  s.line([[117, 108], [119, 99]], { w: 3 });                  // thumb up
  s.line(frame, { closed: true, j: 0.5 });
  s.line(panel, { closed: true, w: L.FINE, cut: [hero.head] });

  // the real one, with a mug
  const mug = L.rrect(166, 154, 15, 18, 3);
  const me = L.person(s, {
    at: [190, 204], k: 0.98, lean: -6,
    head: { dy: 4, tilt: 10, look: -0.5 },
    face: { eyes: 'lidded', brows: 'flat', mouth: 'flat' },
    arms: [{ to: [172, 166], bend: 0.35 }, { to: [208, 196], bend: -0.08 }],
    legs: [{ to: [180, 228], bend: 0.04, shoe: 180 }, { to: [200, 228], bend: -0.04, shoe: 0 }],
    cover: [mug]
  });
  s.fill(mug, pal.paper);
  s.line(mug, { closed: true, w: L.FINE });
  s.line(L.ellipse(166, 163, 4, 5, 0, 8, 100, 260), { w: L.FINE });
  return s.svg();
};
