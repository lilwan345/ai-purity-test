/*
 * tools/personas.js — named test players with explicit answers.
 *
 * Each persona is a person you could meet, written as the exact statements
 * they would answer "Guilty". tools/simulate.js prints what each one gets,
 * so a human can judge whether the result is fair, and tests/personas.test.js
 * pins those results so a rule change cannot silently move them.
 *
 * Statement ids by dimension (level = position inside the dimension):
 *   school s01-s10   work s11-s20   heart s21-s30   brain s31-s40   bond s41-s50
 *   Levels 1-4 are mild (1 point), 5-7 medium (2 points), 8-10 extreme (3 points).
 *   s30, s49 and s50 carry the soulmate flag (big news first, hurt by a new
 *   chat's greeting, asked if it would miss me).
 *
 * `expect` is what the current rules give; `why` is the human judgement of
 * why that is the right answer for this person.
 */

// Helper: ids sNN for a list of numbers.
function ids(numbers) {
  return numbers.map(function (n) { return 's' + String(n).padStart(2, '0'); });
}
// Helper: an inclusive range of numbers.
function range(from, to) {
  var out = [];
  for (var n = from; n <= to; n++) out.push(n);
  return out;
}

var PERSONAS = [
  {
    name: 'Tried it twice',
    who: 'Read one AI summary instead of the reading, asked what date next Friday is.',
    ids: ids([1, 32]),
    expect: { typeId: 'untouched', secondaryTypeId: null },
    why: 'Two mild things out of fifty is almost nothing.'
  },
  {
    name: 'One mild thing per corner',
    who: 'The first, mildest statement of four sections, nothing more.',
    ids: ids([1, 11, 21, 41]),
    expect: { typeId: 'untouched', secondaryTypeId: null },
    why: 'Four mild statements is still the factory setting.'
  },
  {
    name: 'One extreme confession',
    who: 'Admitted only "asked AI if I\'m an introvert and trusted it".',
    ids: ids([40]),
    expect: { typeId: 'brain_lite', secondaryTypeId: null },
    why: 'One extreme confession is not "untouched", but one statement is not deep either.'
  },
  {
    name: 'Study-only student',
    who: 'Uses AI for coursework up to studying with it until 3 a.m.; thanks it once.',
    ids: ids(range(1, 8).concat([41])),
    expect: { typeId: 'school_deep', secondaryTypeId: null },
    why: 'Eight school statements including an extreme one; nothing else close.'
  },
  {
    name: 'Reading-summary skimmer',
    who: 'An AI summary instead of the reading, the professor-email check, the YouTube rescue, one text and one thank-you.',
    ids: ids([1, 2, 5, 21, 41]),
    expect: { typeId: 'school_lite', secondaryTypeId: null },
    why: 'School leads clearly, but only with mild-to-medium statements.'
  },
  {
    name: 'Emails and applications',
    who: 'Polishes emails, asks about sign-offs, dress codes and a $4.99 charge, adds up takeout, forgets their own cover letter; one calendar question.',
    ids: ids([11, 12, 13, 14, 16, 18, 32]),
    expect: { typeId: 'work_lite', secondaryTypeId: null },
    why: 'All the weight is in Adulting, but the deep end (levels 8-10) is barely touched.'
  },
  {
    name: 'Adulting on autopilot',
    who: 'Has done every Adulting statement, including letting two chatbots settle things with the landlord.',
    ids: ids(range(11, 20).concat([1, 21])),
    expect: { typeId: 'work_deep', secondaryTypeId: null },
    why: 'A full Adulting section with every extreme statement.'
  },
  {
    name: 'Group-chat detective',
    who: 'Decodes "haha ok", asks for a gift idea, asks who in the group chat means them, settles a fight with a screenshot.',
    ids: ids([21, 23, 25, 28, 41]),
    expect: { typeId: 'heart_lite', secondaryTypeId: null },
    why: 'Heart leads, but one extreme statement plus mild ones is not deep.'
  },
  {
    name: 'Love life outsourced',
    who: 'Everything in Heart up to regenerating a breakup answer.',
    ids: ids(range(21, 29)),
    expect: { typeId: 'heart_deep', secondaryTypeId: null },
    why: 'Nine of ten Heart statements, three of them extreme.'
  },
  {
    name: 'Asks it everything, politely distant',
    who: 'Small decisions, a little school, work and texting; says thanks; no attachment.',
    ids: ids([1, 2, 11, 12, 13, 21, 22, 31, 32, 33, 34, 35, 36, 41]),
    expect: { typeId: 'brain_lite', secondaryTypeId: null },
    why: 'Brain carries the most weight; nothing extreme anywhere, so lite.'
  },
  {
    name: 'Brain on remote',
    who: 'Every Brain statement, plus a little everyday use elsewhere.',
    ids: ids(range(31, 40).concat([1, 11, 21, 41])),
    expect: { typeId: 'brain_deep', secondaryTypeId: null },
    why: 'A full Brain section towers over one mild statement per other section.'
  },
  {
    name: 'The polite one',
    who: 'Thanks it, apologizes before a dumb question, tells it "no rush", softens notes to spare its feelings; one reading summary.',
    ids: ids([1, 41, 42, 44, 45]),
    expect: { typeId: 'bond_lite', secondaryTypeId: null },
    why: 'Manners towards the chatbot, without the extreme attachment statements.'
  },
  {
    name: 'Attached to it',
    who: 'Reports back to it after a problem is solved, feels like cheating on it, keeps the finals chat.',
    ids: ids(range(41, 48).concat([21])),
    expect: { typeId: 'bond_deep', secondaryTypeId: null },
    why: 'Eight Bond statements including an extreme one; stops just short of the soulmate trio.'
  },
  {
    name: 'The Plus One',
    who: 'Told it big news first, hurt by a new chat\'s "How can I help you today?", asked if it would miss them; a bit of politeness.',
    ids: ids([30, 49, 50, 41, 43, 21]),
    expect: { typeId: 'soulmate', secondaryTypeId: 'bond_deep' },
    why: 'All three soulmate statements. Two of them are extreme Bond statements, so the leaning underneath is the deep Bond type.'
  },
  {
    name: 'Evenly moderate',
    who: 'The three mildest statements of every section.',
    ids: ids([1, 2, 3, 11, 12, 13, 21, 22, 23, 31, 32, 33, 41, 42, 43]),
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: 'A real amount (15), the same depth in all five sections.'
  },
  {
    name: 'Evenly heavy, short of everything',
    who: 'Levels 1-7 in every section: a lot, but none of the extreme statements.',
    ids: ids([].concat(range(1, 7), range(11, 17), range(21, 27), range(31, 37), range(41, 47))),
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: '35 admitted, perfectly even, nothing near "everything".'
  },
  {
    name: 'Heavy in two, equally',
    who: 'School up to level 9 (skipping 8) and Heart up to level 8: same points.',
    ids: ids([1, 2, 3, 4, 5, 6, 7, 9, 21, 22, 23, 24, 25, 26, 27, 28]),
    expect: { typeId: 'school_deep', secondaryTypeId: 'heart_deep' },
    why: 'A tie on depth goes to the section with the more extreme statement (school, level 9); Heart is shown as the close second.'
  },
  {
    name: 'Exam season with a crush',
    who: 'School to level 6, Heart to level 5, light elsewhere.',
    ids: ids([1, 2, 3, 4, 5, 6, 21, 22, 23, 24, 25, 11, 41]),
    expect: { typeId: 'school_lite', secondaryTypeId: 'heart_lite' },
    why: 'School leads, Heart is within three quarters of it, so both are named.'
  },
  {
    name: 'Four sections, no feelings for it',
    who: 'The three mildest statements of every section except Bond.',
    ids: ids([1, 2, 3, 11, 12, 13, 21, 22, 23, 31, 32, 33]),
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: 'Four sections tie exactly for the top, so no single section can claim this player. Bond being empty does not matter.'
  },
  {
    name: 'Everyday light user',
    who: 'Two mild things in each of four sections and one thank-you.',
    ids: ids([1, 2, 11, 12, 21, 22, 31, 32, 41]),
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: 'A four-way tie at the top. Picking Heart (or any one section) out of that would be arbitrary.'
  },
  {
    name: 'Dead heat, mirror image',
    who: 'Levels 1-5 in School and exactly the same in Heart, nothing else.',
    ids: ids([1, 2, 3, 4, 5, 21, 22, 23, 24, 25]),
    expect: { typeId: 'heart_lite', secondaryTypeId: 'school_lite' },
    why: 'Nothing can separate the two, so the fixed order (more personal section first) picks Heart; School shows as the other leaning, and the screen says it was a tie.'
  },
  {
    name: 'Three heavy Brain confessions',
    who: 'The egg, having AI approve an opinion, the movie verdict and the introvert question.',
    ids: ids([31, 38, 39, 40]),
    expect: { typeId: 'brain_deep', secondaryTypeId: null },
    why: 'Only 10 points, but three extreme Brain statements. Two or more extreme statements in a section make it the deep type.'
  },
  {
    name: 'One medium confession',
    who: 'Only sat through four AI explanations, then got it from YouTube.',
    ids: ids([5]),
    expect: { typeId: 'school_lite', secondaryTypeId: null },
    why: 'One medium statement already points somewhere, but one answer caps the match at 60.'
  },
  {
    name: 'Deep everywhere',
    who: 'Levels 1-8 in every section: 40 admitted, the heavy end of all five reached.',
    ids: ids([].concat(range(1, 8), range(11, 18), range(21, 28), range(31, 38), range(41, 48))),
    expect: { typeId: 'merged', secondaryTypeId: null },
    why: 'Every section in the high band. "A little of everything" would be false; "no section can describe you" is true.'
  },
  {
    name: 'Does everything',
    who: 'Guilty to all 50.',
    ids: ids(range(1, 50)),
    expect: { typeId: 'merged', secondaryTypeId: 'soulmate' },
    why: 'Nearly everything admitted; the soulmate trio is in there, so it shows as secondary.'
  },
  {
    name: 'Nearly everything, drew the line at love',
    who: 'All of School, Adulting, Brain and Bond except the soulmate trio; Heart up to level 7.',
    ids: ids([].concat(range(1, 20), range(21, 27), range(31, 48))),
    expect: { typeId: 'merged', secondaryTypeId: null },
    why: '45 of 50 is nearly everything; without the soulmate trio there is no secondary.'
  }
];

module.exports = { PERSONAS: PERSONAS, ids: ids, range: range };
