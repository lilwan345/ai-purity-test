# How a play is drawn and how the result is decided

This is the rule sheet for `scoring.js`. You don't need to read code to follow it.
The rules are tested in `tests/`, checked against people with
`node tools/simulate.js`, and checked for hidden favourites with
`node tools/fairness.js`. If you change a rule, change the numbers in `RULES`
at the top of `scoring.js`, rerun the tests, the simulation and the fairness
checks, and update this page.

(中文版在后半部分。)

Each statement gets one of three answers: Guilty, Never or Not sure. **Not sure
counts exactly like Never**: only Guilty answers reach `score()`, so Not sure
costs no purity, adds no points and is never quoted as evidence. (The result
screen only says how many there were.)

## 1. The bank: every statement has a band and a weight

The statements are a **bank**. Each one belongs to one of the five sections
(School, Adulting, Heart, Brain, Bond) and has one of three **bands**:

| Band | What it means | Weight |
|---|---|---|
| mild | about half of ordinary AI users have done it | 1 point |
| medium | a quarter to a third have | 2 points |
| extreme | the deep end of that section: one in eight to one in five | 3 points |

These targets are the same in every section. That matters: the judging treats
the five sections identically, so if one section's statements are easier to
admit, that section simply wins more plays (see section 10).

The bank holds **105 statements: 21 per section, exactly 7 of each band**.
That gives 15 groups (section x band, called *strata*), all the same size.
Ids are fixed strings (`s01`, `s02`, ...); they never change and are never
reused. The order of statements in `content.js` does not matter.

No statement carries a special flag any more. (The old version had three
"soulmate" statements that decided the hidden type. Forcing them into every
play would have shown them far more often than the rest, so they are gone.)

The original 50 kept their ids (bands from their old levels: 1-4 mild, 5-7
medium, 8-10 extreme; a few moved one band to even out a section or to keep
the bands honest, `s59` and `s60` swapped bands in November 2026 after a test
panel admitted `s59` 42% of the time and `s60` 13%, and `s10` was dropped); the new ones run from `s51` to
`s106`. Many old texts were rewritten broader after a real player said some
were too specific. `validateContent` fails if the strata ever become unequal.

## 2. The draw: which 30 statements a play shows

Every play shows **30 statements: in each section 2 mild, 2 medium and
2 extreme**. Inside each stratum the two are picked **uniformly at random,
without replacement**. Nothing is forced in and nothing is left out, so in a
full bank every statement has exactly the same chance, **2 in 7**, of being in
a play.

**Order:** the ten mild statements first, then the ten medium, then the ten
extreme, so every play escalates. Each group of ten is shuffled uniformly:
any statement is equally likely at any place in its group, and no section is
always asked first.

**Seed:** everything random in a play comes from a short seed, 6 characters of
`0-9a-z` (2.2 billion possible plays), made from `crypto.getRandomValues`.
The same seed with the same bank always gives the same 30 statements in the
same order. That is how a play survives a refresh and a language switch, and
how a share link (`?from=<type>&seed=<seed>&lang=`) lets a friend play the
same 30 statements, so the two results are comparable. A link without a seed,
or with an invalid one, gets a fresh seed; "Start over" makes a new one. The
page keeps its seed in sessionStorage and `history.state`, never in the
address bar unless it came from a link, so a copied address or a bookmark
does not hand out one fixed set.

How the randomness is made (for the curious): the seed is hashed (cyrb128)
into the 128-bit state of the sfc32 generator, which passes the standard
PractRand and BigCrush test batteries. Whole numbers below n come from
rejection sampling (never `random % n`), shuffles are Fisher-Yates, and the
seed's characters come from random bytes with the top four byte values thrown
away, so each character is exactly equally likely. Strata are sorted by id
number before drawing, so tidying `content.js` never changes a seed's draw.
Adding statements does change what an old seed draws, so a share link made
before the bank grows shows a different set afterwards.

## 3. Depth and band per section

In every play each section shows 6 statements worth 2x1 + 2x2 + 2x3 =
**12 points**. **Depth** = your points in that section out of 12, shown as 0
to 100 (rounded). Each section then gets a **depth band**:

| Depth band | Points (of 12) | Depth | What it means |
|---|---|---|---|
| none | 0 | 0 | nothing admitted here |
| low | 1 to 2 | 8 to 17 | the mild statements, or one medium |
| mid | 3 to 6 | 25 to 50 | into the medium statements |
| high | 7 or more | 58 to 100 | only possible with at least one extreme statement |

Both mild and both medium statements together are only 6 points, so "high"
always includes an extreme statement.

**Purity** = round(100 x (1 - admitted / 30)).

## 4. The type: the first rule that matches wins

1. **Merged** (PLUG-IN): you admitted **20 or more** of the 30 (two thirds,
   purity 33 or lower), **or every one of the five sections is in the high
   band** (possible with as few as 15 admitted). Either way no single section
   can describe you. At 20 one section can still be empty (6 + 6 + 6 + 2 + 0),
   so nothing about this type claims "every section".
2. **Hidden type** (PLUS-1, id `soulmate`): you admitted **all six Bond
   statements you were shown and at least one extreme Heart statement**. Every
   play shows six Bond statements and two extreme Heart ones, so every play can
   reach it, and no statement is special.
3. **Untouched** (ANALOG): you admitted **3 or fewer**, and **all of them
   mild** (purity 90 or higher). One medium or extreme confession already
   points somewhere.
4. **Balanced** (SAMPLER): no section leads. Two ways in:
   - **an even spread**: at least 6 admitted, every section has at least one,
     and the deepest and shallowest sections are at most 3 points apart; or
   - **a tie for the top**: three or more sections share the highest points
     exactly. Picking one of them would be arbitrary.
5. **A section type**: otherwise your **leading section** decides. It is that
   section's **deep** type if the section is in the **high** band (7+ of its
   12 points) **or you admitted both of its extreme statements**; else its
   **lite** type.

**Leading section** = the one with the most points. If exactly two are tied:
1. the one where you admitted the heavier statement wins,
2. then the one with more statements admitted,
3. and if they are still level (a mirror image), **a play-off decides**,
4. and only if the play-off ends level too, **the play's lot**.

**The play-off** (`playoffRounds` and `score(..., playoffAnswers)` in
`scoring.js`). After statement 30 the player gets up to three short rounds,
in the order medium, mild, extreme. Each round shows two statements, one from
each of the two tied sections, both of that band. Each is drawn uniformly
from the statements of that section and band that this play did **not**
show (5 of the 7), and which of the two comes first is a coin flip. The
generator is made from the play's drawn statements (so from its seed) under
its own label, so the same play always gets the same play-off, and the draw
of the 30, the lot and the remarks are untouched. After each round the
section whose play-off statements carry more admitted points wins and the
play-off ends. Level after all three: the lot decides and the result says
so. The play-off answers decide **only** which of the two sections leads.
Purity, points, depth, lite or deep, the match, the evidence and the section
rows all stay on the 30, so two friends on the same link stay comparable.
`tieBreak` is `'playoff'` when the play-off settled it.

The lot is a random order of the five sections made from the play itself (a
hash of its drawn statements, which come from its seed). So the same play
always gives the same result, but across players every section wins a lot
equally often. The old rule (a fixed order: Bond, Heart, Brain, Adulting,
School) quietly favoured Bond in every mirror tie. With six statements per
section, mirror ties are common: about **7.7% of all players** need the
play-off; it settles about two thirds of them, so about **2.7%** still end
with "the lot decided" (it was 7.7% before the play-off).

Deep or lite depends only on the leading section, not on your total. A full
School section and nothing else is CRAMBOT even though it is only 6 of 30.
Both extreme statements of a section are enough for deep by themselves. So a
lite type holds at most one extreme statement and at most 6 points of its
section.

## 5. Secondary type (a runner-up leaning)

- **Section types**: the second-ranked section is named when its points are
  **at least three quarters** of the leading section's. A tied runner-up
  always qualifies. It gets its own lite or deep. Otherwise none.
- **Hidden type**: the secondary is the type the answers point to when the
  hidden rule is skipped (a full Bond section usually makes that `bond_deep`).
- **Merged**: the secondary is the hidden type if its rule is met too,
  otherwise none.
- **Untouched** and **Balanced**: never a secondary.

## 6. Evidence (the answers the result screen quotes back)

Up to 3 statements you admitted, heaviest band first, labelled by band
(mild / medium / extreme; 轻度 / 中度 / 重度), never by a number:

- section types: the heaviest statements you admitted in the leading section;
- hidden type: the two extreme Bond statements, then the first extreme Heart
  one you admitted (what the rule is made of);
- merged and balanced: the heaviest statement of each section, then the top
  three of those, so the quotes come from different sections;
- untouched: whatever little you admitted (possibly nothing).

At equal weight the higher-ranked section goes first, then the one asked
earlier.

## 7. Match (0 to 100)

| Type | Match | In words |
|---|---|---|
| section types | lead points / (lead points + runner-up points) | "Heart beats your next section, School, 6 points to 5" = 55 |
| | capped at 60 when the lead section rests on one answer, 80 on two | "It rests on a single answer, though" |
| balanced | 100 minus the depth gap between the deepest and shallowest section you touched | 100 = every touched section weighs the same |
| merged | the average depth of your five sections | how far into everything you went |
| hidden type | always 100 | all-or-nothing |
| untouched | your purity | 100 = admitted nothing |

Simulated section-type results: match 50 to 54 at the 10th percentile, 60
(lite) or 64 (deep) at the median, 80 to 82 at the 90th. The cap touches
about 1% of players.

## 8. Checked against people and a crowd

### Personas

A persona cannot be a fixed list of ids any more, because every play shows
different statements. `tools/personas.js` writes each one as **how many of
the statements they were shown they admit, per section and band** (0, 1 or 2
each), and `admitByCounts` turns that into real ids for any draw. Each persona
is checked on 500 draws per run of the real bank, and
`tests/personas.test.js` pins the results (on the real bank and a synthetic
bank of the same shape). Counts are written mild/medium/extreme.

| Persona | Counts | Admitted | Type | Secondary | Match |
|---|---|---|---|---|---|
| Tried it twice | school 1/0/0, brain 1/0/0 | 2 | untouched | - | 93 |
| Three mild things | 1/0/0 in school, work, heart | 3 | untouched | - | 90 |
| One extreme confession | brain 0/0/1 | 1 | brain_lite | - | 60 (capped) |
| One medium confession | school 0/1/0 | 1 | school_lite | - | 60 (capped) |
| Study-only student | school 2/2/1, bond 1/0/0 | 6 | school_deep | - | 90 |
| Reading-summary skimmer | school 2/1/0, heart 1/0/0, bond 1/0/0 | 5 | school_lite | - | 80 |
| Emails and applications | work 2/2/0, brain 1/0/0 | 5 | work_lite | - | 86 |
| Adulting on autopilot | work 2/2/2, school 1/0/0, heart 1/0/0 | 8 | work_deep | - | 92 |
| Group-chat detective | heart 2/0/1, bond 1/0/0 | 4 | heart_lite | - | 83 |
| Love life outsourced | heart 2/2/2 | 6 | heart_deep | - | 100 |
| Asks it everything, politely distant | brain 2/2/0, work 2/0/0, school, heart, bond 1/0/0 | 9 | brain_lite | - | 75 |
| Brain on remote | brain 2/2/2, 1/0/0 in every other section | 10 | brain_deep | - | 92 |
| Both heavy Brain confessions, nothing else | brain 0/0/2 | 2 | brain_deep | - | 80 |
| The polite one | bond 2/1/0, school 1/0/0 | 4 | bond_lite | - | 80 |
| Attached to it | bond 2/2/1, heart 1/0/0 | 6 | bond_deep | - | 90 |
| Loyal, but tells it nothing | bond 2/2/2, heart 1/0/0 | 7 | bond_deep | - | 92 |
| The Plus One | bond 2/2/2, heart 0/0/1, school 1/0/0 | 8 | soulmate | bond_deep | 100 |
| Evenly moderate | 2/0/0 everywhere | 10 | balanced | - | 100 |
| Evenly heavy, one short of PLUG-IN | 2/2/0 in four, bond 2/1/0 | 19 | balanced | - | 83 |
| One mild thing in every section | 1/0/0 everywhere | 5 | balanced | - | 100 |
| Four sections, no feelings for it | 2/1/0 in all but bond | 12 | balanced | - | 100 |
| Everyday light user | 2/0/0 in four, bond 1/0/0 | 9 | balanced | - | 92 |
| Exam season with a crush | school 2/2/0, heart 1/2/0, work, bond 1/0/0 | 9 | school_lite | heart_lite | 55 |
| Equal points, heavier answer wins | school 1/1/1, heart 2/2/0 | 7 | school_lite | heart_lite | 50 |
| Equal points, more answers win | school 0/2/1, heart 2/1/1 | 7 | heart_deep | school_deep | 50 |
| Dead heat, mirror image | school 2/1/0, heart 2/1/0 | 6 | lot (after a level play-off): school_lite or heart_lite | the other | 50 |
| Level on points, different shape | school 1/2/1, heart 2/0/2 | 8 | school_deep (play-off, round 1) | heart_deep | 50 |
| Deep everywhere | 2/1/1 everywhere | 20 | merged | - | 58 |
| Does everything | 2/2/2 everywhere | 30 | merged | soulmate | 100 |
| Nearly everything, drew the line at love | all but heart's extremes and one bond extreme | 27 | merged | - | 85 |
| Two thirds, one section left alone | school, work, heart 2/2/2, brain 2/0/0 | 20 | merged | - | 63 |

Worth a closer look:
- **One extreme confession** is a lite type: not untouched (it is a real
  confession), but one statement cannot make anyone deep; match capped at 60.
- **Both heavy Brain confessions** is deep with 6 points (band "mid"),
  because both extreme statements are in.
- **Loyal, but tells it nothing**: a full Bond section without an extreme
  Heart statement is deep Bond, not the hidden type.
- **Dead heat, mirror image**: nothing in the answers separates School and
  Heart, and a persona answers a play-off statement Guilty when it admitted a
  statement of that section and band in the 30, so its play-off stays level
  and the lot decides; over 500 draws School won 48% to 52% of them.
- **Level on points, different shape**: 8 points and 4 statements in both,
  the heaviest band the same, so the 30 cannot separate them; the play-off's
  first round is medium, where this player admits School things and no Heart
  things, so School leads.
- **One medium confession** is a known quirk: three mild answers are ANALOG
  while one medium one is TLDR. Its match is capped at 60.
- **Evenly heavy, one short of PLUG-IN** and **Two thirds, one section left
  alone** pin the merged bar from both sides: 19 admitted is not merged, 20 is,
  even with a whole section empty.

### 200,000 simulated players

Each simulated player gets their own random draw of 30 and answers it under a
simple model: in every section they have a "reach" (how far into that section
they go), and the chance of admitting a statement falls smoothly once it
passes that reach. Base reach follows a bell curve; 25% of players have no
favourite section, 45% one and 30% two, chosen uniformly, so the five sections
are treated identically. (Details at the top of `tools/sim-helpers.js`.)

Result with the final rules (`node tools/simulate.js`, seed 20261113):
average 11.2 admitted of 30 (purity 63); 20% of results carry a secondary.

| Type | Real bank (105) | Median match |
|---|---|---|
| untouched | 10.0% | 93 |
| merged | 11.7% | 65 |
| balanced | 12.1% | 75 |
| soulmate (hidden) | 0.3% | 100 |
| school_lite / school_deep | 6.5% / 6.6% | 60 / 64 |
| work_lite / work_deep | 6.6% / 6.6% | 60 / 64 |
| heart_lite / heart_deep | 6.5% / 6.6% | 60 / 64 |
| brain_lite / brain_deep | 6.7% / 6.7% | 60 / 64 |
| bond_lite / bond_deep | 6.6% / 6.4% | 60 / 64 |

With the balanced spread at 2 points instead of 3 the same run gave balanced
6.6%, lite types about 7.6% and deep types about 6.7%. The wider spread moves
players whose five sections sit within 3 points of each other from a section
type into balanced, a little more from the lite types than from the deep ones.

With the merged bar at 25 the same run gave merged 2.7%, the hidden type 1.1%
and every deep type about 8.4%. Lowering the bar to 20 moves the heaviest
simulated players into merged, mostly from the deep types, and some players
who met the hidden rule now land on merged with the hidden type as their
secondary (merged is checked first). In the simulation the hidden type is
therefore rarer (0.3%). In the 24-person test panel (section 10) it did not
move (1.2% at both bars), because the people who met the hidden rule there
admitted well under 20 per play.

About 7.7% of all players reach their section type through an exact tie that
nothing in their 30 answers separates (with six statements per section,
mirror-image answers are common). They now play it off: round 1 settles
34.8% of these ties, round 2 14.7%, round 3 15.1%, and 35.4% stay level, so
the lot decides for **2.7% of all players instead of 7.7%**. A tied player
answers 4.3 extra statements on average. In the model, where each player has
a true "reach" per section, the section the player really leans to more wins
the tie **66.8%** of the time with the play-off, against 50.3% by lot alone.
The type shares barely move (each section type changes by at most 0.1
point), because the play-off only chooses between two sections that were
level. On the 24-person panel (section 10, 3,000 draws each) the lot drops
from 4.4% to 1.0% of plays, and the result names the section a respondent
gave as their leaning in 72.9% of plays against 72.1% before.

No type is above 20% and none below 2%, except the hidden type, which is
meant to be rare. `bond_deep` sits slightly lower than the other deep types
because the hidden rule takes its players mostly from there; that is the
hidden type's design, not a bias (section 10 shows that with the hidden rule
switched off all five deep types are equal).

**How sensitive is this?** Lighter players (`--mean=2.5`) give Untouched 17%
and Merged 6%; heavier players (`--mean=4.5`) give Untouched 5% and Merged
21%, just over the 20% line. The ten section types stay between 5% and 8% and
Balanced between 11% and 12% in both. The model is a reasonable guess, not
survey data: in the re-run test panel (section 10), where the heaviest of 24
people admitted 80 of 105, merged came to 7% of plays.

## 9. The bank's shape

The bank is full: all 15 strata hold 7 statements, so every statement is
shown in 2 of 7 plays. The draw itself works with strata of any size of at
least 2 (each statement then gets 2 in the size of its own stratum), which
the tests use with smaller made-up banks; for the real bank, unequal strata
make `validateContent` fail. Adding or removing a statement changes what old
seeds draw; rewriting one's text does not.

## 10. Fairness: what is guaranteed and how it is tested

The owner's rule: *no statistical error in the drawing and judging, for
example always giving one kind of question.* `node tools/fairness.js` runs
every check below over **200,000 seeds** on the real bank, twice: once with
seeds from a fixed generator (repeatable) and once with seeds from
`scoring.makeSeed()`, the page's own `crypto.getRandomValues` source (a fresh
sample every run). Since the draw depends only on the seed and the stratum
sizes, a second seed source is real extra evidence where a second bank of the
same shape would not be. It prints the observed and expected numbers and a
chi-square (or z) statistic for each check, and exits with an error if any
fails (p below 0.001, Bonferroni-corrected where a check combines several
tests). `tests/fairness.test.js` runs the same checks on 20,000 seeds on every
`node --test tests/`. Latest full run, real bank, fixed seeds:

| Check | Observed vs expected | Statistic | p |
|---|---|---|---|
| (a) every statement drawn equally often | 28.27% to 28.86% vs 28.57% (2/7) | chi2 105.7, 90 df | 0.12 |
| (b) every pair inside a stratum drawn together equally often | 9,272 to 9,764 vs 9,524 per pair | chi2 286.1, 300 df | 0.71 |
| (c) picks in different strata independent | 105 tables, every pair of strata | chi2 42,052, 42,000 df | 0.43 |
| (d) every statement equally likely at each of the 10 places; no section always first | each section first in 19.9% to 20.2% of plays vs 20% | 33 tests, smallest p 0.0096 | 0.32 after correction |
| (e) seeds one character apart give unrelated draws | 8.577 shared statements vs 8.571 for unrelated draws; generator bits flip 50.00% | chi2 29.3, 30 df | 0.63 after correction |
| (f) the judging has no favourite section | lite 6.52% to 6.65% each; deep 6.58% to 6.72% each; lot wins 19.5% to 20.5% each | chi2 3.34, 4.46 and 4.96, 4 df | 0.50, 0.35 and 0.29 |
| (g) the play-off has no favourite and leaves the draw alone | each statement is the play-off pick of its stratum 13.90% to 14.67% of the time vs 14.29%; the first section's statement comes first in 50.01% of rounds; the first section of each pair wins 48.8% to 50.9% of its play-offs; wins by section 19.7% to 20.7%; the draw of the 30 byte for byte the same (digest of 20,000 draws) | chi2 96.4 on 90 df; 0.02 on 1; 1.82 on 10; 2.99 on 4 | 0.30, 0.88, 0.998, 0.56 |

The crypto-seed run passes all seven as well ((g): picks chi2 113.4 on 90 df, p 0.048, 0.19 after correction; pairs chi2 3.89 on 10 df, p 0.95; draw digest identical): (a) 28.39% to 28.83%, chi2 67.0 on
90 df, p 0.97; (b) chi2 268.7 on 300 df, p 0.90; (c) chi2 42,134 on 42,000 df,
p 0.32; (d) smallest p 0.0017, 0.057 after correction; (e) 0.37 after
correction; (f) lite chi2 2.65 (p 0.62), deep chi2 5.25 (p 0.26), lot wins
chi2 2.57 (p 0.63). (Rows (a) to (e) depend only on the draw, so they did not
change when the merged bar or the balanced spread moved; (f) did, because
fewer players now reach a section type.)

(f) uses simulated players who treat the five sections identically, and
switches the hidden rule off for the lite/deep comparison, because that one
rule is about Bond and Heart on purpose; its own share (0.3%) is printed beside
it. Every two-section mirror tie is also forced directly: each section wins
50% of its ties within sampling error, and all 120 lot orders come up equally.

**The checks can catch real mistakes.** The script also runs six
deliberately broken versions (the sixth: a play-off that always shows the
first unseen statement instead of drawing) and requires each to fail: `random % n` on a
byte, one statement forced into every play (the old flag idea), a shuffle by
sorting with a random comparator, band groups left in section order (School
always first), and the old fixed tie order. All five are caught with p below
1e-70.

**What cannot be guaranteed without real data.** The code guarantees that
every statement in a stratum is *shown* equally often and that the judging
treats the sections identically. It cannot guarantee that two statements in
the same band are *equally easy to admit*, or that the five sections are
equally easy overall. If one section's statements are written broader than
another's, that section will win more often with real players, and only real
answer rates can show it. The simulation assumes the sections are equal; it
proves the code adds no bias, not that the content has none. Once real plays
exist, the admit rate per statement is the check to run: within a band the
rates should be close, and across sections the five type shares should be
close.

**The first content check (November 2026).** Before launch data existed, 24
invented respondents (12 US undergraduates answering in English, 12 Chinese
international students answering in Chinese, from near-zero AI use to
constant use) were played by a language model and answered all 105
statements; each was then scored on 3,000 draws. That is a rough stand-in for
people, good for spotting lopsided statements, not survey data. It found the
content bias this section warns about: mean admit rate for mild / medium /
extreme was School 46 / 33 / 22%, Adulting 36 / 30 / 13%, Heart 26 / 13 / 10%,
Brain 24 / 20 / 12% and Bond 24 / 15 / 14%, so School types took 35% of all
panel plays (TLDR 20%, CRAMBOT 15%) while HAHA-OK, SORRY and SAMPLER got about
1% each and PLUG-IN 0.2%. People who said they lean one way got that section
in 73% of their plays, so the judging itself works. The fix was in the
content and one rule, not in section weights: the merged bar went from 25 to
20 (measured on the panel: merged 0.2% to 3.6%, the hidden type unchanged at
1.2%), `s59` and `s60` swapped bands (measured: CRAMBOT 12.6% to 9.9%), and 45
statements were rewritten so that the act admitted is common (asking AI how
to reply to a text, saying hi to a chatbot) and the joke rides on top instead
of adding a second condition.

**The re-run (November 2026).** The same 24 respondents then answered every
rewritten statement again (a separate agent from the one that wrote them,
judging each person and line on its own, without aiming at a rate; `s59` and
`s60` kept their answers because only their band changed). Mean admit rate
for mild / medium / extreme became School 46 / 38 / 17%, Adulting 36 / 30 /
13%, Heart 31 / 19 / 13%, Brain 33 / 24 / 17% and Bond 32 / 22 / 15%. One
rewrite came back far too broad: `s32` ("asked AI something I'd have Googled")
was admitted by 20 of 24, a survey question rather than a confession, so it
became "a quick fact, like how old some actor is" (9 of 24). Share of all
panel plays (24 people x 3,000 draws), before the rewrites → after:

| Type | Before | After |
|---|---|---|
| ANALOG | 20% | 19.2% |
| PLUG-IN | 0% | 7.2% |
| SAMPLER | 1% | 2.2% |
| PLUS-1 (hidden) | 1% | 3.3% |
| TLDR / CRAMBOT | 20% / 15% | 18.6% / 7.0% |
| NOTED / SYNERGY | 8% / 10% | 7.5% / 8.4% |
| HAHA-OK / CC-BOT | 1% / 7% | 1.1% / 8.0% |
| IDK / 404 | 3% / 4% | 4.4% / 5.1% |
| SORRY / MY-BOT | 1% / 7% | 2.7% / 5.3% |

School's two types fell from 35% to 26%. PLUG-IN comes only from the four
heaviest respondents (80, 71, 59 and 52 of 105 admitted: 98%, 66%, 7% and 1%
of their plays). SAMPLER was still 1.2% after the rewrites, because almost no
real profile has all five sections within 2 points; the even-spread limit
went from 2 points to 3, which gives 2.2% on the panel and 12.1% in the
simulation. Two things are still short. **HAHA-OK is 1.1%**, almost all of it
from one respondent: the panel's two Heart-leaning people both use AI for
relationships heavily and land on CC-BOT, and nobody in it is a light user
whose Heart answers lead, so the panel cannot show whether that type is
reachable (in the simulation it is 6.5%). And people who stated a leaning
got that section in **66%** of their plays (73% before; 70% if PLUS-1 counts
as Bond for the two Bond-leaning people), because their other sections are
now easier to admit: a School-leaning student who is also polite to the bot
now gets SORRY in 42% of plays. Statements still out of line with their band
are mostly mild ones at 17% to 29% (`s22`, `s75`, `s34`, `s43`), medium `s04`,
`s91` and `s101` at 8% to 13%, and School medium as a whole at 38%. A real
launch sample is the next check; this panel is a language model playing 24
invented people.

## 11. What changed, and why

| Before (v3) | Now (v4) | Why |
|---|---|---|
| The same 50 statements in the same order for everyone | 30 per play, drawn from a bank of 105 | 50 was tiring; a bigger bank keeps replays fresh |
| Level 1-10 by position in the file | A band per statement: mild / medium / extreme | Positions mean nothing when every play draws a different set |
| Three flagged statements decide the hidden type | All six Bond statements shown + one extreme Heart | Forcing flagged statements into every play would make them far more common |
| Fixed tie order (Bond first) | Lot from the play's seed | The fixed order favoured Bond in every mirror tie |
| A mirror tie goes straight to the lot (7.7% of players) | Up to three play-off rounds first; the lot only when they end level (2.7%) (v4.2, November 2026) | Every result should have a reason in the player's own answers; in the model the play-off picks the section the player really leans to 67% of the time instead of 50% |
| 19 points per section, merged at 42, untouched at 4, balanced from 10 | 12 points, merged at 25, untouched at 3, balanced from 6, spread 2 points | Re-tuned for 6 statements per section; shares stay between 2% and 20% |
| Merged at 25 (v4) | Merged at 20 (v4.1, November 2026) | In a 24-person test panel the heaviest user (73 of 105 admitted) reached 25 in 5% of plays and merged was 0.2% of all plays; at 20 that person gets it in 78% and merged is 4% |
| Heart, Brain and Bond statements much harder to admit than School (panel admit rate for mild: School 46%, Heart 26%, Brain 24%, Bond 24%) | 45 statements in Work, Heart, Brain, Bond and School rewritten around commoner acts; `s59` and `s60` swapped bands | School took 35% of panel results and Heart mild 1.5%. Balanced by rewriting, never by weighting sections in the rules |
| `s32`: "asked AI something I'd have Googled a year ago" | "a quick fact, like how old some actor is" | Re-run panel: 20 of 24 admitted it, too broad to say anything; now 9 of 24 |
| Balanced spread: within 2 points | Within 3 points | Re-run panel: SAMPLER 1.2% of plays at 2 points, 2.2% at 3; simulation 6.6% → 12.1% |

Earlier changes (v1 to v3) introduced the weights, deep by high band or two
extremes, balanced for three-way ties, and the lead / (lead + runner-up)
match; they are unchanged in spirit.

## 12. Notes for whoever writes the type copy

The profile has to stay true for **everyone** who can get the type, **on any
draw**. A player sees only 30 of the 105 statements, so copy may never refer
to one specific statement (they may not have been shown it). Describe the
habit behind the section instead. The result screen quotes the player's own
answers (`evidenceIds`), so the copy does not have to guess.

- **Lite types** can come from a single statement anywhere in the section,
  even an extreme one. They hold at most one extreme statement and at most 6
  of the 12 points. Write about part of the section, not specific mild habits.
- **Deep types** always include an extreme statement: either 7+ of 12 points,
  or both extreme statements (as few as 2 answers, band only "mid"). Write
  about how far the answers reach, never about volume.
- **The lead can be a tie**, settled by a play-off or, rarely, by lot. Say "X is your heaviest
  section", never "X outweighs everything else".
- **Untouched** players may have admitted up to 3 mild statements.
- **Balanced** players either spread 6 or more answers evenly over all five
  sections, or have three or more sections tied for the top (possibly with
  only 3 answers and some sections empty). Write about evenness.
- **Hidden type** players admitted every Bond statement they saw and at least
  one extreme Heart one; they may have admitted nothing else (7 answers).
- **Merged** players admitted at least 20, or reached the high band in all
  five sections (as few as 15 answers), and not necessarily the hidden rule.
  With 20 admitted one section can be empty, so never say "every section".
- **Signs** never restate a single quiz statement.

---

# 抽题和判结果的规则（中文）

这一页对应 `scoring.js` 的规则，不看代码也能看懂。规则在 `tests/` 里有测试，
用 `node tools/simulate.js` 拿“人”来检验，用 `node tools/fairness.js` 检查有没有
暗中偏向。要改规则，就改 `scoring.js` 顶部 `RULES` 里的数字，把测试、模拟和公平性
检查都跑一遍，再更新这一页。

每条有三个答案：干过、没干过、不确定。**不确定和没干过完全一样算**：只有“干过”
会交给 `score()`，所以选不确定不扣纯度、不算分，也不会被当成证物引用。

## 1. 题库：每条都有档次和分量

陈述放在一个**题库**里。每条属于五个部分之一（学业、正经事、感情、脑子、羁绊），
并且有一个**档次**：

| 档次 | 含义 | 分量 |
|---|---|---|
| 轻度 mild | 普通 AI 用户里大约一半干过 | 1 分 |
| 中度 medium | 四分之一到三分之一的人干过 | 2 分 |
| 重度 extreme | 这一部分最深的那头，八分之一到五分之一 | 3 分 |

这几个目标五个部分都一样。这一点很要紧：判定对五个部分一视同仁，所以哪个部分的题更容易认，
哪个部分就会更常赢（见第 10 节）。

题库是 **105 条：每部分 21 条，每个档次正好 7 条**，一共 15 组（部分 × 档次，
叫“层”），每层一样大。id 是固定字符串（`s01`、`s02`……），永远不改、不复用；
`content.js` 里的先后顺序无所谓。

不再有带特殊标记的题。（旧版有三条 soulmate 题决定隐藏款，要是每局都硬塞进去，
它们出现的次数会远多于别的题，所以取消了。）

原来的 50 条保留了 id（档次按旧等级换算：1–4 级轻度、5–7 中度、8–10 重度；有几条为了
凑齐数量或档次名副其实挪了一档；2026 年 11 月测试小组认 `s59` 的有 42%、认 `s60` 的只有 13%，
于是两条对调了档次；`s10` 删掉了），新题从 `s51` 编到 `s106`。有真实玩家说
有些题太具体，所以很多旧题改写得更宽泛。层大小一旦不一样，`validateContent` 就报错。

## 2. 抽题：一局出哪 30 条

每局 **30 条：每个部分 2 条轻度、2 条中度、2 条重度**。每层里的两条是
**均匀随机、不放回**地抽出来的。没有必须出的题，也没有被排除的题，所以
每条题出现在一局里的概率都是 **7 分之 2**。

**顺序**：先 10 条轻度，再 10 条中度，最后 10 条重度，每局都越来越狠。每组 10 条内部
均匀打乱：任何一条在组内任何位置的概率都一样，也没有哪个部分总是先问。

**种子**：一局里所有随机都来自一个短种子，6 个 `0-9a-z` 字符（22 亿种），用
`crypto.getRandomValues` 生成。同一个种子加同一个题库，永远是同样的 30 条、同样的顺序。
所以刷新、切换语言都不会换题；分享链接（`?from=<类型>&seed=<种子>&lang=`）能让朋友做
同样的 30 条，两人的结果可以直接比。链接里没有种子或种子不合法，就换一个新种子；
“重新开始”也会换新种子。

随机数怎么来的（想了解的话）：种子经过 cyrb128 哈希，变成 sfc32 生成器的 128 位初始状态，
这个生成器能通过 PractRand 和 BigCrush 这两套标准随机性测试。取 0 到 n−1 的整数用拒绝采样
（绝不用 `random % n`），洗牌用 Fisher-Yates；生成种子时丢掉最大的 4 个字节值，保证每个字符
概率完全相同。抽题前每层按 id 数字排序，所以整理 `content.js` 不会改变某个种子抽到的题。
但是往题库里加题会改变旧种子抽到的题：题库扩充之前发出去的分享链接，之后打开会是另一组题。

## 3. 每个部分的深度和深度档

每局每个部分出 6 条，满分 2×1 + 2×2 + 2×3 = **12 分**。**深度** = 这一部分得分 ÷ 12，
换成 0–100（四舍五入）。再分成四个**深度档**：

| 深度档 | 得分（满分 12） | 深度 | 含义 |
|---|---|---|---|
| none | 0 | 0 | 这部分一条没认 |
| low | 1–2 | 8–17 | 轻度的几条，或者一条中度 |
| mid | 3–6 | 25–50 | 认到了中度 |
| high | 7 及以上 | 58–100 | 至少认了一条重度才可能 |

两条轻度加两条中度全认也只有 6 分，所以 high 一定包含重度题。

**纯度** = round(100 ×（1 − 认的条数 ÷ 30）)。

## 4. 类型：按顺序判，先满足哪条就是哪条

1. **人形外设**（PLUG-IN）：30 条里认了 **20 条及以上**（三分之二，纯度 33 及以下），
   **或者五个部分全在 high 档**（最少 15 条就可能）。两种情况都说明单拿哪一块都概括不了你。
   认 20 条时还可能有一块完全空着（6 + 6 + 6 + 2 + 0），所以这个类型的文案不能说“每一块”。
2. **隐藏款**（PLUS-1，id 是 `soulmate`）：**这一局出现的 6 条羁绊题全认了，
   再加至少一条感情的重度题**。每局都有 6 条羁绊题和 2 条感情重度题，所以每局都有机会，
   也没有哪条题是特殊的。
3. **原装人类**（ANALOG）：认了 **3 条及以下**，而且**全是轻度**（纯度 90 及以上）。
4. **雨露均沾**（SAMPLER）：没有哪块领头。两条路：
   - **分得匀**：至少认了 6 条，五个部分都有，最深和最浅的部分相差不超过 3 分；
   - **并列第一**：三个及以上部分分数完全一样、并列最高。
5. **部分类型**：以上都不是，就看**领头的部分**。领头部分在 **high** 档（12 分里 7 分以上），
   **或者这一部分的两条重度题都认了**，就是它的 **deep** 类型，否则是 **lite** 类型。

**领头部分** = 分数最高的那个。恰好两个打平时：
1. 认过更重那一条的部分胜出；
2. 还平，认的条数多的胜出；
3. 还是完全一样（镜像），**加赛决定**；
4. 加赛也打平，才**由这一局的抽签决定**。

**加赛**（`scoring.js` 里的 `playoffRounds` 和 `score(..., playoffAnswers)`）：第 30 条之后，
最多再来三轮，顺序是中度、轻度、重度。每轮两条，两个打平的部分各一条、同一档次，各自从
这一局**没出过**的同部分同档次题里（7 条里剩下的 5 条）均匀抽一条，谁先出也是抛硬币。
用的随机数由这一局抽到的题（也就是种子）加上单独的标签生成，所以同一局永远是同一场加赛，
而 30 条的抽题、抽签和 AI 插话都不受影响。每轮结束后，加赛里认下的分数更多的部分胜出，
加赛结束；三轮都平，就抽签，结果页会直说。加赛的答案**只**决定两个打平的部分谁领头：纯度、
分数、深度、lite 还是 deep、匹配度、证据和逐部分那几行都还是按那 30 条算，所以同一个链接上的
两个朋友照样可以比。加赛定下来的，`tieBreak` 是 `'playoff'`。

抽签是用这一局本身（它抽到的题，也就是它的种子）算出的五个部分的随机顺序。所以同一局
永远是同一个结果，但放到所有玩家身上，每个部分赢签的次数一样多。旧规则用固定顺序
（羁绊、感情、脑子、正经事、学业），每次镜像打平都偷偷偏向羁绊。每部分只有 6 条，镜像打平
并不少见：大约 **7.7% 的玩家**需要加赛，加赛能分出大约三分之二，所以最后只有大约
**2.7%** 的人看到“抽签定了”（加赛之前是 7.7%）。

deep 还是 lite 只看领头部分，不看总数。学业 6 条全认、别的一条没认，照样是 CRAMBOT。
两条重度都认了就够 deep。所以 lite 类型最多只有这一部分的一条重度、最多 6 分。

## 5. 副类型（第二倾向）

- **部分类型**：排第二的部分，分数达到领头部分的**四分之三**就显示（打平的一定算），
  lite 还是 deep 按它自己算；否则没有。
- **隐藏款**：副类型是“不按隐藏规则算，你的答案指向什么”（羁绊全认通常就是 `bond_deep`）。
- **人形外设**：隐藏款的规则也满足时，副类型是隐藏款，否则没有。
- **原装人类**和**雨露均沾**：没有副类型。

## 6. 证据（结果页引用的原话）

最多 3 条你认过的陈述，重的排前面，标的是档次（轻度 / 中度 / 重度），不是数字：

- 部分类型：领头部分里你认过的最重的几条；
- 隐藏款：两条羁绊重度题，再加你认过的第一条感情重度题（规则就是这几条组成的）；
- 人形外设、雨露均沾：每部分取最重的一条，再挑最重的三条，保证来自不同部分；
- 原装人类：你认过的那几条，可能一条都没有。

分量相同时，排名靠前的部分先，再按出题先后。

## 7. 匹配度（0–100）

| 类型 | 匹配度 | 说人话 |
|---|---|---|
| 部分类型 | 领头得分 ÷（领头得分 + 第二名得分） | “感情以 6 比 5 分压过排第二的学业” = 55 |
| | 领头部分只靠一条撑着最多 60，两条最多 80 | “不过只靠一条撑着” |
| 雨露均沾 | 100 减去碰过的部分里最深与最浅的深度差 | 100 = 碰过的每块一样重 |
| 人形外设 | 五个部分的平均深度 | 你在所有方面认得多深 |
| 隐藏款 | 固定 100 | 要么满足要么不满足 |
| 原装人类 | 等于纯度 | 100 = 一条没认 |

模拟里部分类型的匹配度：第 10 百分位 50–54，中位数 60（lite）或 64（deep），第 90 百分位 80–82；上限影响约 1% 的玩家。

## 8. 拿人和一大群人来检验

**人设**：每局题都不一样，所以人设不能再写死 id。`tools/personas.js` 里每个人写的是
“在出现的题里，每个部分每个档次认几条”（0、1 或 2），由 `admitByCounts` 换成任意一局里的
真实 id。每个人设每次在真实题库上跑 500 局，`tests/personas.test.js` 把结果钉住。
完整表格见英文第 8 节，结论：

- 只用 AI 学习的是 CRAMBOT；只拿来改邮件、写申请、没碰重度的是 NOTED；
- 感情 6 条全认的是 CC-BOT；羁绊全认但没有感情重度的，是 MY-BOT（deep），不是隐藏款；
- 羁绊全认再加一条感情重度，是隐藏款 PLUS-1，副倾向是 MY-BOT；
- 只认了一条重度或一条中度的，是对应部分的 lite，匹配度最多 60；
- 只认了脑子两条重度的，是 404（deep），只有 6 分、档位“mid”，因为两条重度都认了；
- 每部分认得一样多的，或三块以上并列第一的，是雨露均沾；
- 学业和感情完全镜像的，加赛也一直打平（人设在 30 条里认过某部分某档次的题，加赛里同部分同档次的就认），只能抽签，500 局里学业赢了 48%–52%；
- 学业 1/2/1、感情 2/0/2 的，分数、条数、最重的档次都一样，30 条分不开；加赛第一轮是中度，这个人认学业的、不认感情的，所以学业领头（school_deep，副倾向 heart_deep）；
- 每部分 2 轻 1 中 1 重（20 条）的，五块全在 high 档，是人形外设；
- 学业、正经事、感情全认，再加两条脑子轻度（20 条，羁绊一条没认）的，也是人形外设；
  轻度中度全认、只差一条（19 条）的，五块很匀，是雨露均沾。门槛两边都钉住了。

**20 万个模拟玩家**：每个模拟玩家有自己的一局 30 条题，按一个简单模型作答：每个部分有一个
“认到多深”的界线，题越过界线，认的概率就平滑下降。整体轻重呈钟形分布；25% 的人没有偏爱
的部分，45% 有一个，30% 有两个，偏爱哪块是均匀随机的，所以五个部分被一视同仁。

最终规则下（种子 20261113）：平均认 11.2 条（纯度 63），20% 的结果带副类型。
各类型占比见英文第 8 节的表：原装人类 10.0%，人形外设 11.7%，雨露均沾 12.1%，隐藏款 0.3%，
10 个部分类型都在 6.4%–6.7% 之间。“分得匀”的界线还是 2 分时，同一次模拟里雨露均沾 6.6%，
lite 约 7.6%、deep 约 6.7%；放宽到 3 分后，五块相差 3 分以内的人从部分类型挪到了雨露均沾。除了本该稀有的隐藏款，没有类型超过 20% 或低于 2%。
门槛还是 25 条时，同一次模拟里人形外设 2.7%、隐藏款 1.1%、各 deep 类型约 8.4%。降到 20 条后，
最重的那批模拟玩家归到了人形外设，主要来自 deep 类型；有些满足隐藏规则的人也先被判成人形外设
（它先判），隐藏款变成副类型，所以模拟里隐藏款更少了（0.3%）。在 24 人测试小组里（第 10 节）
隐藏款没变（两个门槛下都是 1.2%），因为那里满足隐藏规则的人每局认的远不到 20 条。
`bond_deep` 略低于其他 deep 类型，是因为隐藏款主要从这里分走玩家，这是隐藏款的设计，
不是偏向（第 10 节：关掉隐藏规则后五个 deep 类型完全持平）。人群整体偏轻（`--mean=2.5`）时
原装人类 17%、人形外设 6%；偏重（`--mean=4.5`）时原装人类 5%、人形外设 21%，刚过 20% 的线。
两种情况下 10 个部分类型都在 5%–8%，雨露均沾在 11%–12%。模型只是合理的猜测：重测后的
测试小组里（第 10 节）最重的人 105 条认了 80 条，人形外设占全部局数的 7%。

## 9. 题库的形状

题库已满：15 层每层 7 条，所以每条题每 7 局出现 2 次。抽题本身对任意大小（至少 2 条）的层
都成立（每条的机会是 2 除以所在层的条数），测试里用的小题库就是这样；真实题库的层一旦大小
不一样，`validateContent` 就报错。加题或删题会改变旧种子抽到的题，只改题目文字不会。

## 10. 公平性：保证了什么、怎么测的

主人的要求：**抽题和判定不能有统计上的偏差，比如老是出某一类题。**
`node tools/fairness.js` 用 **20 万个种子**在真实题库上把下面每一项检查跑两遍：一遍用固定
生成器的种子（可重复），一遍用页面自己的 `scoring.makeSeed()`（`crypto.getRandomValues`，
每次都是新样本）。抽题只取决于种子和每层的条数，所以换一种种子来源才是真正的第二份证据，
换一个同样形状的题库不是。它打印观测值、期望值和卡方（或 z）统计量，任何一项不通过
（p < 0.001，多项合并时做 Bonferroni 校正）就以错误码退出。`tests/fairness.test.js` 每次
`node --test tests/` 都用 2 万个种子跑一遍同样的检查。最近一次完整结果（真实题库、固定种子）：

| 检查 | 观测 vs 期望 | 统计量 | p |
|---|---|---|---|
| (a) 每条被抽中的频率一样 | 28.27%–28.86% vs 28.57%（2/7） | 卡方 105.7，自由度 90 | 0.12 |
| (b) 同一层里任意两条同时出现的次数一样 | 每对 9,272–9,764 vs 9,524 | 卡方 286.1，自由度 300 | 0.71 |
| (c) 不同层的抽取互相独立 | 每两层一张表，共 105 张 | 卡方 42,052，自由度 42,000 | 0.43 |
| (d) 组内每条在 10 个位置上概率一样；没有哪个部分总是第一个 | 各部分排第一 19.9%–20.2% vs 20% | 33 项检验，最小 p 0.0096 | 校正后 0.32 |
| (e) 只差一个字符的种子抽出的题互不相关 | 平均共有 8.577 条 vs 不相关时 8.571；生成器各位翻转 50.00% | 卡方 29.3，自由度 30 | 校正后 0.63 |
| (f) 判定不偏向任何部分 | 各 lite 6.52%–6.65%；各 deep 6.58%–6.72%；抽签各赢 19.5%–20.5% | 卡方 3.34、4.46、4.96，自由度 4 | 0.50、0.35、0.29 |
| (g) 加赛不偏向任何部分，也不改动抽题 | 每条被加赛抽中的比例 13.90%–14.67% vs 14.29%；第一个部分的题先出 50.01%；每一对里第一个部分赢 48.8%–50.9%；各部分赢 19.7%–20.7%；30 条的抽题一字不差（20,000 局的摘要） | 卡方 96.4（90）；0.02（1）；1.82（10）；2.99（4） | 0.30、0.88、0.998、0.56 |

用 crypto 种子的那一遍七项也全过（(g)：抽中比例卡方 113.4，自由度 90，p 0.048，校正后 0.19；每一对卡方 3.89，自由度 10，p 0.95；抽题摘要一致）：(a) 28.39%–28.83%，卡方 67.0，自由度 90，p 0.97；
(b) p 0.90；(c) p 0.32；(d) 校正后 0.057；(e) 校正后 0.37；(f) lite p 0.62、deep p 0.26、
抽签 p 0.63。（(a) 到 (e) 只取决于抽题，人形外设门槛和“分得匀”的界线改了也不变；(f) 变了，
因为走到部分类型的玩家少了。）

大约 7.7% 的玩家是靠一次完全打平拿到部分类型的，30 条答案里分不出高下（每部分 6 条，镜像答案
很常见）。现在先加赛：第 1 轮分出 34.8%，第 2 轮 14.7%，第 3 轮 15.1%，还有 35.4% 一直打平，
所以靠抽签的从**全部玩家的 7.7% 降到 2.7%**。打平的人平均多答 4.3 条。在模拟里每个人每个部分
都有一个真实的“深度”，加赛后，真正更偏向的那个部分赢下打平的比例是 **66.8%**，只靠抽签是 50.3%。
各类型的占比几乎不变（每个部分类型最多差 0.1 个百分点），因为加赛只是在两个本来打平的部分里选一个。
在 24 人小组上（第 10 节，每人 3,000 局），抽签从 4.4% 的局降到 1.0%，结果点名受访者自己说的
偏向部分的比例从 72.1% 到 72.9%。

(f) 用的是对五个部分一视同仁的模拟玩家，比较 lite/deep 时关掉了隐藏规则，因为那条规则
本来就是针对羁绊和感情的；隐藏款自己的占比（0.3%）单独列出。另外还直接构造了每一对部分的
镜像打平：每个部分赢一半，120 种抽签顺序出现得一样多。

**这些检查真能抓到错误。** 脚本还会跑六个故意写坏的版本（第六个：加赛不抽，永远出第一条没出过的题），要求每个都被抓到：对字节用
`random % n`、每局硬塞一条题（就是旧的标记方案）、用随机比较函数排序来洗牌、每组按部分顺序
不打乱（学业总是第一个）、旧的固定打平顺序。五个全部被抓到，p 都小于 1e-70。

**没有真实数据就保证不了的。** 代码保证同一层里每条**出现**的次数一样，判定对五个部分一视同仁。
它保证不了同一档次的两条**一样容易被认**，也保证不了五个部分整体一样容易。要是某个部分的题
写得更宽泛，真实玩家里这个部分就会更常赢，只有真实的认领率能看出来。模拟假设五个部分一样，
它证明的是代码没有加偏向，不是内容没有偏向。等有了真实玩家，该跑的检查是每条题的认领率：
同一档次里应该接近，五个部分的类型占比也应该接近。

**第一次内容检查（2026 年 11 月）。** 还没有上线数据时，用语言模型扮演了 24 个虚构受访者
（12 个用英文作答的美国本科生、12 个用中文作答的中国留学生，从几乎不用 AI 到天天用），让他们把
105 条全答一遍，再每人跑 3,000 局。这只是真人的粗略替身，适合找出偏得厉害的题，不是调查数据。
它查出了这一节提醒过的内容偏差：轻 / 中 / 重的平均认领率，学业 46 / 33 / 22%，正经事 36 / 30 / 13%，
感情 26 / 13 / 10%，脑子 24 / 20 / 12%，羁绊 24 / 15 / 14%。结果学业类型占了全部局数的 35%
（TLDR 20%、CRAMBOT 15%），HAHA-OK、SORRY、SAMPLER 各只有 1% 左右，PLUG-IN 0.2%。自报偏向
某块的人，有 73% 的局拿到了那一块，说明判定本身没问题。修的是内容和一条规则，不是给部分加权：
人形外设门槛从 25 降到 20（在小组上实测：人形外设 0.2% → 3.6%，隐藏款不变，1.2%）；`s59` 和 `s60`
对调档次（实测：CRAMBOT 12.6% → 9.9%）；改写了 45 条，让认的那件事本身常见（问 AI 消息怎么回、
跟 AI 打招呼），笑点只是附在上面，不再多加一个条件。

**重测（2026 年 11 月）。** 之后让同样 24 个人把改写过的题重新答了一遍（由另一个 agent 来答，
不是写题的那个；一人一条地判断，不朝某个比例凑；`s59`、`s60` 只换了档次，答案沿用）。
轻 / 中 / 重的平均认领率变成：学业 46 / 38 / 17%，正经事 36 / 30 / 13%，感情 31 / 19 / 13%，
脑子 33 / 24 / 17%，羁绊 32 / 22 / 15%。有一条改得太宽：`s32`（“以前会去搜的，现在问 AI”）
24 人里 20 人认，等于问卷题而不是坦白，于是改成“明星多大这种小问题”（24 人里 9 人认）。
全部局数（24 人 × 3,000 局）里的占比，改写前 → 改写后：ANALOG 20% → 19.2%，PLUG-IN 0% → 7.2%，
SAMPLER 1% → 2.2%，PLUS-1 1% → 3.3%，TLDR / CRAMBOT 20% / 15% → 18.6% / 7.0%，
NOTED / SYNERGY 8% / 10% → 7.5% / 8.4%，HAHA-OK / CC-BOT 1% / 7% → 1.1% / 8.0%，
IDK / 404 3% / 4% → 4.4% / 5.1%，SORRY / MY-BOT 1% / 7% → 2.7% / 5.3%。

学业两个类型合计从 35% 降到 26%。PLUG-IN 只来自最重的四个人（105 条里认了 80、71、59、52 条，
分别有 98%、66%、7%、1% 的局拿到）。改写后 SAMPLER 还是 1.2%，因为几乎没有人五块都在 2 分以内；
“分得匀”的界线从 2 分放宽到 3 分后，小组上 2.2%，模拟里 12.1%。还有两处没达标。**HAHA-OK 只有
1.1%**，几乎全来自一个人：小组里偏感情的两个人都在感情上用得很重，落在 CC-BOT；小组里没有
“用得少、但感情题领头”的人，所以这个小组证明不了这个类型能不能走到（模拟里是 6.5%）。
自报偏向的人拿到那一块的比例是 **66%**（之前 73%；如果把 PLUS-1 算作两个偏羁绊的人的羁绊结果，
是 70%），因为他们别的部分现在也更容易认了：一个偏学业、对 AI 又很客气的学生，现在 42% 的局
拿到 SORRY。和档次对不上的题主要是认领率 17%–29% 的轻度题（`s22`、`s75`、`s34`、`s43`），
中度的 `s04`、`s91`、`s101`（8%–13%），以及整体 38% 的学业中度。下一步要看真实上线数据；
这个小组只是语言模型扮演的 24 个虚构的人。

## 11. 改了什么、为什么

| 之前（v3） | 现在（v4） | 原因 |
|---|---|---|
| 所有人同样的 50 条、同样的顺序 | 每局从 105 条题库里抽 30 条 | 50 条太累；题库大了，重玩也新鲜 |
| 按文件里的位置定 1–10 级 | 每条有档次：轻度 / 中度 / 重度 | 每局抽的题不同，位置没有意义 |
| 三条带标记的题决定隐藏款 | 出现的 6 条羁绊全认 + 一条感情重度 | 硬塞带标记的题会让它们出现得多得多 |
| 打平按固定顺序（羁绊优先） | 用这一局的种子抽签 | 固定顺序在每次镜像打平时都偏向羁绊 |
| 镜像打平直接抽签（7.7% 的玩家） | 先加赛最多三轮，三轮都平才抽签（2.7%）（v4.2，2026 年 11 月） | 每个结果都应该能从玩家自己的答案里找到理由；模拟里加赛有 67% 的时候选中玩家真正更偏的部分，抽签只有 50% |
| 每部分 19 分，人形外设 42 条，原装 4 条，均沾从 10 条起 | 12 分，人形外设 25 条，原装 3 条，均沾从 6 条起、相差 2 分以内 | 按每部分 6 条重新调过，各类型占比都在 2%–20% |
| 人形外设 25 条（v4） | 人形外设 20 条（v4.1，2026 年 11 月） | 24 人测试小组里最重的人（105 条认 73 条）只有 5% 的局能到 25 条，人形外设只占全部局数的 0.2%；门槛 20 时这个人 78% 的局拿到，整体 4% |
| 感情、脑子、羁绊的题比学业难认得多（小组轻度认领率：学业 46%，感情 26%，脑子 24%，羁绊 24%） | 正经事、感情、脑子、羁绊和学业共改写 45 条，围绕更常见的事；`s59`、`s60` 对调档次 | 小组结果里学业占 35%，感情轻度只有 1.5%。靠改题来平衡，绝不在规则里给部分加权 |
| `s32`：“以前会去搜的问题，现在直接问 AI” | “明星多大这种小问题，也直接问 AI” | 重测时 24 人里 20 人认，太宽，说明不了什么；现在 9 人 |
| “分得匀”：相差 2 分以内 | 相差 3 分以内 | 重测小组里 2 分时 SAMPLER 只占 1.2%，3 分时 2.2%；模拟 6.6% → 12.1% |

## 12. 写类型文案的人请注意

文案要对**所有**可能拿到这个类型的人、在**任何一局**里都成立。玩家只看到 105 条里的 30 条，
所以文案绝不能提某一条具体的题（他可能根本没见过）。写这一部分背后的习惯。结果页会引用
玩家自己的原话（`evidenceIds`），文案不需要去猜。

- **lite 类型**可能只靠一条拿到，甚至是一条重度。最多一条重度、最多 6 分。写“只认了一部分”。
- **deep 类型**一定有重度题：要么 7 分以上，要么两条重度都认了（最少 2 条，档位只是 mid）。
  写“认到了多深”，别写“认得多”。
- **领头部分可能是打平的**，由加赛、偶尔由抽签定的。写“X 是你最重的一块”，别写“X 压过了所有部分”。
- **原装人类**最多认过 3 条轻度。
- **雨露均沾**要么 6 条以上匀匀分在五个部分，要么三块以上并列第一（可能只有 3 条，还有空着的部分）。写“匀”。
- **隐藏款**认了见到的每条羁绊题和至少一条感情重度题，可能别的什么都没认（共 7 条）。
- **人形外设**认了至少 20 条，或者五块都进了 high 档（最少 15 条），不一定满足隐藏规则。
  认 20 条时可能有一块空着，所以别写“每一块”。
- **signs（三条迹象）**不要照搬任何一条题目。
