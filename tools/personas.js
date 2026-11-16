/*
 * tools/personas.js — named test players.
 *
 * Every play shows a different 30 statements, so a persona cannot be a fixed
 * list of ids any more. Instead each persona says how many of the statements
 * they were SHOWN they admit, per dimension and band:
 *
 *   counts: { school: [mild, medium, extreme], ... }   each 0, 1 or 2
 *
 * (every play shows 2 mild, 2 medium and 2 extreme per dimension; a missing
 * dimension means nothing admitted there). scoring.admitByCounts turns that
 * into real ids for any draw. The scoring only looks at dimensions and bands,
 * so a persona gets the same type on every draw, except where an exact tie
 * is decided by lot: then `expect.lot` lists the types it can land on, and
 * the tests check that each of them really comes up.
 *
 * The play-off (scoring.playoffRounds): a persona admits a play-off statement
 * when it admitted at least one of the two statements of that section and
 * band that the play showed (playoffByCounts). So a mirror-image tie stays
 * level through all three rounds and still goes to the lot, while a tie of
 * two different shapes is settled by the play-off (`expect.playoff` = the
 * round that settles it).
 *
 * tools/simulate.js prints what each one gets; tests/personas.test.js pins
 * the results over many seeds, on the real bank and on a full-size one.
 * `why` is the human judgement of why that is the right answer.
 */
'use strict';

// Helper: the same counts in every dimension.
function everywhere(counts) {
  return { school: counts, work: counts, heart: counts, brain: counts, bond: counts };
}

var PERSONAS = [
  {
    name: 'Tried it twice',
    who: 'One mild School statement and one mild Brain statement.',
    counts: { school: [1, 0, 0], brain: [1, 0, 0] },
    expect: { typeId: 'untouched', secondaryTypeId: null },
    why: 'Two mild things out of thirty is almost nothing.'
  },
  {
    name: 'Three mild things',
    who: 'One mild statement in School, Adulting and Heart.',
    counts: { school: [1, 0, 0], work: [1, 0, 0], heart: [1, 0, 0] },
    expect: { typeId: 'untouched', secondaryTypeId: null },
    why: 'Three mild statements is still the factory setting (a three-way tie, but untouched is checked first).'
  },
  {
    name: 'One extreme confession',
    who: 'Admitted only one extreme Brain statement.',
    counts: { brain: [0, 0, 1] },
    expect: { typeId: 'brain_lite', secondaryTypeId: null },
    why: 'One extreme confession is not "untouched", but one statement is not deep either; the match is capped at 60.'
  },
  {
    name: 'One medium confession',
    who: 'Admitted only one medium School statement.',
    counts: { school: [0, 1, 0] },
    expect: { typeId: 'school_lite', secondaryTypeId: null },
    why: 'One medium statement already points somewhere; one answer caps the match at 60.'
  },
  {
    name: 'Study-only student',
    who: 'Both mild and both medium School statements and one extreme; one mild Bond.',
    counts: { school: [2, 2, 1], bond: [1, 0, 0] },
    expect: { typeId: 'school_deep', secondaryTypeId: null },
    why: '9 of 12 School points, including an extreme one; nothing else close.'
  },
  {
    name: 'Reading-summary skimmer',
    who: 'Both mild School statements and one medium; one mild Heart and one mild Bond.',
    counts: { school: [2, 1, 0], heart: [1, 0, 0], bond: [1, 0, 0] },
    expect: { typeId: 'school_lite', secondaryTypeId: null },
    why: 'School leads clearly, but only with mild-to-medium statements.'
  },
  {
    name: 'Emails and applications',
    who: 'All mild and medium Adulting statements, no extreme; one mild Brain.',
    counts: { work: [2, 2, 0], brain: [1, 0, 0] },
    expect: { typeId: 'work_lite', secondaryTypeId: null },
    why: 'All the weight is in Adulting, but the deep end is not touched.'
  },
  {
    name: 'Adulting on autopilot',
    who: 'Every Adulting statement shown; one mild School, one mild Heart.',
    counts: { work: [2, 2, 2], school: [1, 0, 0], heart: [1, 0, 0] },
    expect: { typeId: 'work_deep', secondaryTypeId: null },
    why: 'A full Adulting section including both extreme statements.'
  },
  {
    name: 'Group-chat detective',
    who: 'Both mild Heart statements and one extreme; one mild Bond.',
    counts: { heart: [2, 0, 1], bond: [1, 0, 0] },
    expect: { typeId: 'heart_lite', secondaryTypeId: null },
    why: 'Heart leads, but one extreme statement plus mild ones (5 points) is not deep.'
  },
  {
    name: 'Love life outsourced',
    who: 'Every Heart statement shown, nothing else.',
    counts: { heart: [2, 2, 2] },
    expect: { typeId: 'heart_deep', secondaryTypeId: null },
    why: 'All six Heart statements, both extreme ones among them.'
  },
  {
    name: 'Asks it everything, politely distant',
    who: 'Mild and medium Brain statements; a little School, Adulting and Heart; one thank-you.',
    counts: { brain: [2, 2, 0], school: [1, 0, 0], work: [2, 0, 0], heart: [1, 0, 0], bond: [1, 0, 0] },
    expect: { typeId: 'brain_lite', secondaryTypeId: null },
    why: 'Brain carries the most weight (6 points against 2 at most); nothing extreme anywhere, so lite.'
  },
  {
    name: 'Brain on remote',
    who: 'Every Brain statement shown, plus one mild statement in each other section.',
    counts: { brain: [2, 2, 2], school: [1, 0, 0], work: [1, 0, 0], heart: [1, 0, 0], bond: [1, 0, 0] },
    expect: { typeId: 'brain_deep', secondaryTypeId: null },
    why: 'A full Brain section towers over one mild statement per other section.'
  },
  {
    name: 'Both heavy Brain confessions, nothing else',
    who: 'Only the two extreme Brain statements.',
    counts: { brain: [0, 0, 2] },
    expect: { typeId: 'brain_deep', secondaryTypeId: null },
    why: 'Only 6 points (band "mid"), but both extreme statements. Admitting both makes the section deep.'
  },
  {
    name: 'The polite one',
    who: 'Both mild Bond statements and one medium; one mild School.',
    counts: { bond: [2, 1, 0], school: [1, 0, 0] },
    expect: { typeId: 'bond_lite', secondaryTypeId: null },
    why: 'Manners towards the chatbot, without the extreme attachment statements.'
  },
  {
    name: 'Attached to it',
    who: 'Five of the six Bond statements (one extreme); one mild Heart.',
    counts: { bond: [2, 2, 1], heart: [1, 0, 0] },
    expect: { typeId: 'bond_deep', secondaryTypeId: null },
    why: '9 of 12 Bond points including an extreme one; one Bond statement short of the hidden rule.'
  },
  {
    name: 'Loyal, but tells it nothing',
    who: 'All six Bond statements, one mild Heart, no extreme Heart.',
    counts: { bond: [2, 2, 2], heart: [1, 0, 0] },
    expect: { typeId: 'bond_deep', secondaryTypeId: null },
    why: 'A full Bond section is deep, but the hidden type also needs an extreme Heart statement.'
  },
  {
    name: 'The Plus One',
    who: 'All six Bond statements, one extreme Heart statement, one mild School.',
    counts: { bond: [2, 2, 2], heart: [0, 0, 1], school: [1, 0, 0] },
    expect: { typeId: 'soulmate', secondaryTypeId: 'bond_deep' },
    why: 'The hidden rule: every Bond statement shown plus an extreme Heart one. Underneath, a full Bond section is the deep Bond type.'
  },
  {
    name: 'Evenly moderate',
    who: 'Both mild statements of every section.',
    counts: everywhere([2, 0, 0]),
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: 'Ten admitted, the same depth in all five sections.'
  },
  {
    name: 'Evenly heavy, one short of PLUG-IN',
    who: 'Every mild and medium statement shown except one medium Bond, no extreme ones: 19 admitted.',
    counts: { school: [2, 2, 0], work: [2, 2, 0], heart: [2, 2, 0], brain: [2, 2, 0], bond: [2, 1, 0] },
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: '19 admitted is one short of the merged bar (20), and all five sections are within 2 points, so it is an even spread.'
  },
  {
    name: 'One mild thing in every section',
    who: 'Exactly one mild statement in each of the five sections.',
    counts: everywhere([1, 0, 0]),
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: 'Five admitted is past the Analog\'s three, and all five sections tie exactly, so no section can claim this player.'
  },
  {
    name: 'Four sections, no feelings for it',
    who: 'Both mild and one medium statement in every section except Bond.',
    counts: { school: [2, 1, 0], work: [2, 1, 0], heart: [2, 1, 0], brain: [2, 1, 0] },
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: 'Four sections tie exactly for the top; Bond being empty does not matter.'
  },
  {
    name: 'Everyday light user',
    who: 'Both mild statements in four sections and one mild Bond.',
    counts: { school: [2, 0, 0], work: [2, 0, 0], heart: [2, 0, 0], brain: [2, 0, 0], bond: [1, 0, 0] },
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: 'A four-way tie at the top; picking any one of them would be arbitrary.'
  },
  {
    name: 'Even spread, one point ahead',
    who: 'Both mild School statements and one mild statement in every other section: 2 / 1 / 1 / 1 / 1 points.',
    counts: { school: [2, 0, 0], work: [1, 0, 0], heart: [1, 0, 0], brain: [1, 0, 0], bond: [1, 0, 0] },
    expect: { typeId: 'balanced', secondaryTypeId: null },
    why: 'On the edge of SAMPLER: six admitted over all five sections, top to bottom 1 point, and School only 1 point ahead. One mild statement is not a lead.'
  },
  {
    name: 'Even spread, two points ahead',
    who: 'One mild and one medium School statement and one mild statement in every other section: 3 / 1 / 1 / 1 / 1 points.',
    counts: { school: [1, 1, 0], work: [1, 0, 0], heart: [1, 0, 0], brain: [1, 0, 0], bond: [1, 0, 0] },
    expect: { typeId: 'school_lite', secondaryTypeId: null },
    why: 'Just past the edge: School is 2 points ahead of every other section, which is a lead, so "no section leads" would be false. Before November 2026 this was SAMPLER.'
  },
  {
    name: 'Exam season with a crush',
    who: 'School: both mild and both medium. Heart: one mild and both medium. One mild Adulting and Bond.',
    counts: { school: [2, 2, 0], heart: [1, 2, 0], work: [1, 0, 0], bond: [1, 0, 0] },
    expect: { typeId: 'school_lite', secondaryTypeId: 'heart_lite' },
    why: 'School leads 6 to 5; Heart is within three quarters of it, so both are named.'
  },
  {
    name: 'Equal points, heavier answer wins',
    who: 'School: one of each band (6 points, top extreme). Heart: both mild and both medium (6 points, top medium).',
    counts: { school: [1, 1, 1], heart: [2, 2, 0] },
    expect: { typeId: 'school_lite', secondaryTypeId: 'heart_lite' },
    why: 'Same points; School holds the heavier statement, so it leads and Heart is the tied second.'
  },
  {
    name: 'Equal points, more answers win',
    who: 'School: both medium and one extreme (7 points, 3 statements). Heart: both mild, one medium, one extreme (7 points, 4 statements).',
    counts: { school: [0, 2, 1], heart: [2, 1, 1] },
    expect: { typeId: 'heart_deep', secondaryTypeId: 'school_deep' },
    why: 'Same points and the same heaviest band; Heart has more statements, so it leads. Both are in the high band.'
  },
  {
    name: 'Dead heat, mirror image',
    who: 'Both mild and one medium in School, exactly the same in Heart, nothing else.',
    counts: { school: [2, 1, 0], heart: [2, 1, 0] },
    expect: { lot: ['school_lite', 'heart_lite'] },
    why: 'Nothing in the answers can separate them, and this player answers the play-off the same way for both, so all three rounds end level and this play\'s lot decides; the other shows as the tied second, and over many plays each wins half the time.'
  },
  {
    name: 'Level on points, different shape',
    who: 'School: one mild, both medium, one extreme. Heart: both mild, no medium, both extreme. 8 points and 4 statements each, the heaviest extreme in both.',
    counts: { school: [1, 2, 1], heart: [2, 0, 2] },
    expect: { typeId: 'school_deep', secondaryTypeId: 'heart_deep', playoff: 1 },
    why: 'Nothing in the 30 separates them, so they play off. Round one is medium, where this player admits School things and no Heart things: School leads, Heart is the tied second.'
  },
  {
    name: 'Deep everywhere',
    who: 'Both mild, one medium and one extreme in every section: 20 admitted.',
    counts: everywhere([2, 1, 1]),
    expect: { typeId: 'merged', secondaryTypeId: null },
    why: 'Every section in the high band (and 20 admitted, so it would be merged by count too). "A little of everything" would be false; "no section can describe you" is true.'
  },
  {
    name: 'Does everything',
    who: 'Guilty to all 30.',
    counts: everywhere([2, 2, 2]),
    expect: { typeId: 'merged', secondaryTypeId: 'soulmate' },
    why: 'Everything admitted; the hidden rule is met too, so it shows as secondary.'
  },
  {
    name: 'Nearly everything, drew the line at love',
    who: 'Everything except the extreme Heart statements and one extreme Bond statement: 27 admitted.',
    counts: { school: [2, 2, 2], work: [2, 2, 2], heart: [2, 2, 0], brain: [2, 2, 2], bond: [2, 2, 1] },
    expect: { typeId: 'merged', secondaryTypeId: null },
    why: '27 of 30 is nearly everything; the hidden rule is not met, so there is no secondary.'
  },
  {
    name: 'Two thirds, one section left alone',
    who: 'All of School, Adulting and Heart, both mild Brain statements, nothing in Bond: 20 admitted.',
    counts: { school: [2, 2, 2], work: [2, 2, 2], heart: [2, 2, 2], brain: [2, 0, 0] },
    expect: { typeId: 'merged', secondaryTypeId: null },
    why: '20 of 30 meets the merged bar even with Bond empty: three full sections plus more means no single section describes this player.'
  }
];

// playoffByCounts(content, rounds, counts) -> { id: 'yes' | 'no' } for the
// play-off statements: yes when the persona admits at least one statement of
// that section and band in the 30.
function playoffByCounts(content, rounds, counts) {
  var byId = {};
  content.statements.forEach(function (s) { byId[s.id] = s; });
  var bands = ['mild', 'medium', 'extreme'];
  var out = {};
  (rounds || []).forEach(function (round) {
    round.ids.forEach(function (id) {
      var s = byId[id];
      var c = counts[s.dim];
      out[id] = c && c[bands.indexOf(s.band)] >= 1 ? 'yes' : 'no';
    });
  });
  return out;
}

module.exports = { PERSONAS: PERSONAS, everywhere: everywhere, playoffByCounts: playoffByCounts };
