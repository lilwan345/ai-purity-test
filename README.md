# AI Purity Test

A one-page quiz. Each play draws 30 things people do with AI from a bank
of 105, shows them one at a time, mildest first, and you answer each
with "Guilty" or "Never" (or a small "Not sure", which counts as "Never").
You get a purity score from 0 to 100 plus
one of 14 comic "types", each with its own hand-drawn character, on a card you can save as a picture. English and Simplified Chinese. It is for fun and has zero science
in it. Answers stay in the browser; the only thing sent anywhere is a
visit count (see "Statistics").

## Run it locally

There is no build step and nothing to install.

- Open `index.html` in a browser (double-click works), or
- serve the folder: `python3 -m http.server 8000`, then go to http://localhost:8000

Useful URL parameters:

| Parameter | What it does |
|---|---|
| `?lang=en` / `?lang=zh` | Force a language. Default: Chinese if the browser language starts with `zh`, otherwise English. |
| `?preview=bond_deep` | Jump straight to a type's full result, played by a sample player (for QA and screenshots). |
| `?from=bond_deep&seed=k3x9q0` | Landing page says "A friend got ..." and, when a valid seed is present, that you will get the same 30 statements as them. "Copy link" on a result makes this URL. A missing or invalid seed gets a fresh one. |
| `?types=1` | Opens "All 14 types", the grid of every type (see below). |
| `?seed=k3x9q0&vs=0a1b2c3d` | A **challenge link** ("Challenge a friend" on a result). The friend plays the same 30, then their result opens with a comparison. `vs` is the sender's answers (see "Compare with a friend"). |
| `?seed=k3x9q0&vs=...&re=...` | A **reply link** ("Send it back" on that comparison): shows the comparison straight away, to anyone, without playing. |

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell. Loads `content.js`, then `scoring.js`, then `extras.js`, then `art.js`, then `app.js`, each with the same `?v=` version (see "Publishing"). |
| `content.js` | All words: interface text, the AI's remarks (`remarks`), the 5 dimensions, the statement bank (each with a band), the 14 types. Data only. |
| `content.sample.js` | Old placeholder content from before the bank (no bands, old flags). Not loaded by anything; do not copy its shape. |
| `scoring.js` | Pure functions: the seed and the draw, scoring, and a content checker. Also runs under Node for tests. |
| `extras.js` | Pure functions for what is not scoring: the answer codes in challenge links and the comparison (`encodeAnswers`, `decodeAnswers`, `readCompareLink`, `comparePlays`), the AI's remarks (`remarkSchedule`, `remarkFor`, `validateRemarks`) and the collection (`collectedTypes`, `rememberCollected`). Uses `scoring.js`, never changes a draw or a result. Also runs under Node for tests. |
| `tools/bump-version.js` | Gives every file `index.html` loads a new, shared `?v=` version. `node tools/bump-version.js` (today's date plus the next letter) or `node tools/bump-version.js 20261116a`. |
| `app.js` | The UI: screens, answering, the result screen and card, the PNG export and sharing. Also holds the sample player for each type. |
| `art.js` | The 14 characters, one SVG string per type id (`globalThis.APT_ART`). **Generated** by `tools/pack-art.js`; do not edit by hand. Optional: without it, or for a type it lacks, the app shows no character and the card uses its plain layout. |
| `tools/pack-art.js` | Checks the drawings in `art-src/c/out/<type id>.svg` and packs them into `art.js`. `node tools/pack-art.js` (see "The characters" below). |
| `art-src/` | The drawings and the generator that drew them (owned by the art side; the app never reads it). |
| `styles.css` | All styling. Colours and fonts are tokens at the top. Also holds the embedded display font (see below). |
| `fonts/Anton-OFL.txt` | Licence for the embedded fallback display font. |
| `tests/` | Scoring tests on drawn sets, the draw (`draw.test.js`: 2,000 seeds per bank, always 30, six per section, two per band, escalating, repeatable), a fast copy of the fairness checks (`fairness.test.js`, 20,000 seeds), persona expectations, checks on the real `content.js` (valid, every UI key present and used, all 14 types reachable on real draws, no interface text still saying 50 or quoting old rule numbers), the stored answers and which play a page load resumes (`answers.test.js`), the "all types" grid and the sample players (`gallery.test.js`), and the characters (`art.test.js`: pack-art's checks, every id packed once all files exist, 12 KB cap, no script or outside reference, `art.js` up to date with `art-src/c/out/`, and the app coping with missing or broken art), `playoff.test.js` (the play-off rounds, settling in round 1 or 3 or going to the lot with nothing else moving, play-off answers in challenge codes, the reason lines for every persona, the play history), `reveal.test.js` (the reveal's timeline and play-once rules), `stats.test.js` (what statistics may be sent), and `extras.test.js` (answer codes round trip and reject bad input, comparisons of fixed plays, the remark schedule's limits, determinism and independence from the draw, the collection with missing or blocked storage, the card footer, and the shared `?v=` version in `index.html`). Run `node --test tests/` |
| `SCORING.md` | How a play is drawn and how the result is decided, in plain English and Chinese, with the persona table, simulated type shares and the fairness results. |
| `tools/personas.js` | 33 named test players written as band counts per section ("admits 2 mild and 1 medium School statement"), so they fit any draw, and how a persona answers a play-off (`playoffByCounts`). |
| `tools/simulate.js` | Prints each persona's result over 500 draws, the type shares (with and before the play-off) and match spread over 200,000 simulated players (each on their own draw), how often a tie decided the lead, how the play-off settles ties and how often it picks the section the player really leans to. `node tools/simulate.js` |
| `tools/fairness.js` | Proves the draw and the judging have no favourite: seven chi-square checks (the seventh is the play-off) over 200,000 seeds on the real bank, run twice with two independent seed sources (a fixed, repeatable stream and the page's own `makeSeed()`), plus six deliberately broken versions that must be caught. Exits non-zero on failure. `node tools/fairness.js` (about 90 s) |
| `tools/sim-helpers.js`, `tools/stats.js` | Shared pieces for the tools and tests: a synthetic bank of the same shape (for tests and controls), a seed stream, the simulated player model; chi-square and normal p-values. |
| `UI_KEYS.md` | Every interface text key the app reads, with where it shows up. |
| `content/draft.json` | An old content draft with a different shape. Nothing loads it. |

## The landing page

The first screen: a badge ("5 sections · 105 statements · 14 types"), the
title, a lead line ("Other tests ask who you are. This one asks what you
did."), the intro, the start button, the real count of finished tests when
there is one (see "Statistics") and a quiet cue to scroll. With a play under
way or someone's link open, the first screen stays as it was (no badge, lead,
count or cue). Below it, nine white cards in this order: most common results
(only with real numbers), what this is (the five sections), why take it, who
it is for, how the result is worked out (four steps, then three numbers the
tests tie to the repo: 2/7, 200,000 seeds and 7 checks plus 6 broken
versions in tools/fairness.js), the 14 types as chips, why the codes have
these names, a comparison with a serious personality test (stacked rows on a
phone), and questions. All words are `content.landing`. The type colours and
the characters are the only decoration.

## How the quiz flows

- One statement per screen, with two big buttons at the bottom: **Never** (left)
  and **Guilty** (right), and between them a smaller, quieter **Not sure** for
  a statement the player doesn't get or can't remember. An answer is
  recorded and the next statement is on screen in the same frame, so input
  is never held up (30 keys in 3 seconds all count, in order); the motion
  plays over it in about 300 ms (`MOTION` and `stepTo` in `app.js`, the
  keyframes in `styles.css`, `tests/motion.test.js`): the used button gives
  a short press, the answered card is flicked away the way of the answer
  (Guilty right, Never left, Not sure a little down) while the next card
  rises from behind it, the purity number rolls to its new value and the
  progress bar eases to its new length. Back reverses it: the previous card
  comes back from the side it left. Only transform and opacity move; with
  reduced motion the statement just changes. Two taps on the buttons within
  120 ms count as one (a double tap), keys are never limited. The three buttons keep the same size and place on every
  statement, from 360 px phones up. The footer is hidden on these screens,
  so the page is exactly one window tall.
- **The purity figure.** A small marker person stands on the statement
  card's top edge at the right, under the purity number, drawn by the same
  generator as the 14 characters (`purityFigure()` in `art-src/c/build.js`,
  packed into `art.js` as `APT_FIGURE`). As purity falls its parts become
  machine parts, one per stage of `extras.FIGURE_STAGES` (antenna at 97, an
  eye at 90, the right arm at 80, the other eye at 70, the mouth at 60, the
  head at 50, the body at 40, the left arm at 33, wheels at 17, the eye
  lights full at 3; the one table to retune). Crossing a stage, a thin blue
  scan line sweeps down the figure and the part is new once the line has
  passed, then a small settle (300 + 150 ms); a drop without a new stage
  gives a small wobble (180 ms); Never and Not sure do nothing. Back,
  refresh and the first draw show the right state at once; reduced motion
  swaps parts without moving. It is still at rest, never blocks input, and
  is hidden from screen readers (`tests/figure.test.js`).
- **Large windows.** From 900 px wide the question screen grows with the
  window like the landing page: every size on it (the card, the statement,
  the section label, back, progress and purity, the three answers with their
  key badges, the keyboard line, the play-off line and the AI's reply bubble)
  is a multiple of `--u`, which is exactly 1 px at 1280 x 800 and grows with
  the window up to 1.5 px (about 1.13 at 1440 x 900, 1.34 at 1408 x 1300,
  1.43 at 1920 x 1080, 1.5 at 2560 x 1440). The column is a little wider than
  the scaled card, so a statement never needs more lines than at 1280 x 800.
  The whole group sits a little above the vertical centre (free space above
  and below 1 : 1.4). Under 900 px nothing changes
  (`tests/question-scale.test.js`).
- **Which statements, in what order**: each play draws 30 from the bank with
  `drawStatements(content, seed)` in `scoring.js`: in every section 2 mild,
  2 medium and 2 extreme, picked uniformly at random. The ten mild ones come
  first, then the ten medium, then the ten extreme, each group shuffled, so
  topics mix and the quiz gets spicier as it goes. The seed (6 characters,
  from `makeSeed()`) is saved with the answers (sessionStorage) and in
  `history.state`, so a refresh or a language switch keeps the same 30, even
  where sessionStorage is blocked; "New questions" on the result makes a new
  seed. The seed is **not** written into the address bar for a play the page
  picked itself: a copied address, a bookmark or the browser's own share
  button would otherwise hand out one fixed set and say it came from a
  friend. Only "Copy link" / "Share" put `&seed=` in a URL, and a `?seed=`
  that arrived in a link stays in the address while that play lasts. Which
  seed a page load uses is `resumePlay` in `scoring.js`: a valid `?seed=`
  that differs from the saved play wins (someone's link, played fresh), else
  the saved play carries on, else a new seed. See `SCORING.md`.
- **Close enough counts.** Players were answering too literally, so the
  landing page says once that something like it counts, and the first three
  statements of a play repeat it quietly at the right end of the section label
  (it shares that line, so nothing moves when it goes away).
- **Leaving halfway.** The product name in the top bar (on the questions,
  the result, the grid, a peek, a preview or a reply link) is a real link
  back to the landing page, named "AI Purity Test, back to the start" for
  screen readers. There is no confirm dialog because nothing is lost: with a
  play under way, the landing shows **Continue (8 / 30)** (the statement they
  were on) and **Start over** in place of the start button; with every
  statement answered, **Back to my result** and **Start over**
  (`landingChoice` in `extras.js`). Start over clears the answers and begins
  at statement 1 as a new play: the AI's remarks can come again (for a kept
  set, the same ones, since they come from the seed), the reveal plays when it
  finishes, and only finishing adds to the collection. Which 30
  (`restartKeepsSet`): a play that came from someone's link, a plain seed
  link or a challenge link, keeps that link's 30, or the comparison with the
  sender would quietly stop matching, and a line under the buttons says so;
  any other play gets a fresh set, like "New questions".
- **The play-off screens.** When a play-off is needed, statement 30 is
  followed by its statements, counted "Play-off 1 / 2" in place of "30 / 30",
  with one plain line on the card: "Two sections are dead level. Two more
  statements to settle it." (later rounds: "Still level. Two more."). Same
  three answers; Back works; a refresh comes back to the same place (the
  play-off answers are saved with the play, under `playoff`); no remarks
  during it. The statistics event `tiebreak` is sent once when it starts.
  Going home in the middle offers "Continue (30 / 30)" into it.
- **Back** (the arrow top left) returns to the previous statement and shows the
  answer you gave (including "Not sure"); tap any button to keep or change it. Back on statement 1
  returns to the landing page.
- **Keyboard**: Y or → answers Guilty, N or ← answers Never, ↓ answers Not sure
  (the arrow between ← and →, like the button; Space would also click a
  focused button, and U sits next to Y), Backspace goes back. When the
  window is too short for the whole statement, ↓ scrolls first and answers
  only once the bottom is in view.
  Keys held with Shift, Ctrl, Alt or Cmd are ignored. The buttons are real
  buttons, so Tab + Enter works too.
- The running purity sits small in the header (scored on the drawn 30).
  The seed, the answers (`yes`, `no` or `unsure` per statement) and the
  position are kept in `sessionStorage` (key `apt-state-v3`), so a refresh or
  a language switch carries on where you were. Answers to statements outside
  the play, unknown values and impossible positions are dropped (`resumePlay`
  and `cleanAnswers` in `scoring.js`). A save from the 50-statement version
  (`apt-state-v2`, no seed) cannot be mapped onto a drawn set, so it is never
  read and its key is removed. After statement 30 the result appears;
  "New questions" clears the answers, draws a new set and starts at statement 1.
- Screen readers: each new statement gets focus, so it is read once, starting
  with "Statement 12 of 30, Heart: ...". The answers are a group named by the
  statement, and the picked one is marked pressed (and shows a tick).
- With "reduce motion" switched on, nothing slides; the tick shows briefly and
  the next statement appears.
- **The AI interrupts.** Now and then a tap on **Guilty** gets a one-line
  remark in the AI's voice, written for that exact statement
  (`content.remarks.statements`, one line per statement id in both
  languages, such as s01 「我写了八百字，你看了标题。」 / "I wrote 800 words. You
  read the title."). It is a reply to the statement just admitted, so that
  statement stays on the card while it shows: the Guilty button stays
  pressed, the answers are locked, and the ink bubble with an "AI" tag sits
  under the card's lower right (beside the card on wide windows). The play
  then moves on by itself after 1.6 s plus 55 ms per character (a Chinese
  character counts 2), at most 2.8 s (`remarkDuration`), or at once on any
  tap, click or key; that tap or key only skips, it never answers the next
  statement (it is caught before any button sees it). The answer is saved
  when it is given, so a refresh during the hold lands on the next statement;
  Back during the hold stays on the answered statement so it can be changed.
  With no remark due, the next statement comes at once as always. Rules
  (`remarkFor` in `extras.js`): only on Guilty, never on Never or Not sure;
  never on the first 3 statements or the last one (the reveal starts right
  after it), never in a play-off; never on two statements in a row; at most 6
  per play; going back and answering again does not repeat one. Which
  statements may get one is `remarkSchedule`: 12 places per play, none next to
  each other, every such set equally likely, made from the seed with its own
  generator (`apt-remarks-v1|seed`), so a shared link gives the same remarks
  for the same answers and the draw's generator is never touched. A statement
  without its own line falls back to the general, band and section lines
  (`content.remarks.general` and the rest), never twice in one play. Limits:
  per-statement lines 56 characters (English) / 20 (Chinese), the fallback
  lines 40 / 14; no emoji or exclamation marks. The bubble is `aria-hidden`,
  so screen readers keep reading the statement.
- **The back button** on the question screen is labelled ("← Back" /
  "← 上一题"). It is not there on the first statement (it keeps its place, so
  the progress bar never moves); Backspace works as before.
- **The reveal.** After the last answer the result is staged, about 4.5 s
  in all (`REVEAL` in `app.js` holds every number; `tests/reveal.test.js`
  checks the order and the limits):
  1. *Stage* (0.2 s): the page empties and the card is lifted into view,
     centred and up to 1.3 times its size, like something held up.
  2. *Pen* (0.65-2.45 s): a small marker travels along each ink line as it
     appears (`getPointAtLength`), slightly tilted, lifting and moving between
     lines; longest lines first, time in proportion to length. The white
     scribble and the accent colour follow as quick strokes. On the six dark
     cards the white scribble goes first, or the navy line would hardly show.
  3. *Impact* (2.9-3.3 s): the code falls from up to 2.5 times its size (less
     when a long code would leave the window, never under 1.3) with a hard,
     slightly overshooting stop; the card takes a 2.6 degree knock that springs
     back, a ring of ink specks is thrown off the letters, and phones with a
     vibration motor give one 18 ms buzz.
  4. *Numbers* (3.3-3.9 s): purity counts down from 100, the match counts up,
     the section squares fill row by row.
  5. *Settle* (3.9-4.3 s): the card moves into its real place and size; then
     the first four blocks of the page arrive 80 ms apart, in reading order
     (on a laptop the right column together with the buttons under the card;
     on a phone the blocks under it). Anything further down is simply there.
  A tap or any key skips to the end at once, and taps cannot hit the
  still-invisible buttons. With "reduce motion" there is none. It plays only
  at the end of a play, never on a refresh, a language switch, `?preview=` or
  when coming back from the grid. The drawing is the character's SVG from
  `art.js` put inline over the card's `<img>`; the pen and the specks are
  extra elements; the counting numbers change their text for a moment. All of
  it is removed or put back at the end and every motion is a cancelled Web
  Animation, so the settled card (and the PNG) is exactly what a refresh
  shows.
- **The landing on large windows.** From 900 px the landing is two columns.
  Its type, buttons and stickers are sized in a "landing pixel" (`--u` in
  `styles.css`): exactly 1 px at 1280 x 800 and larger on bigger windows (the
  average of the width and height ratios, never more than the width allows,
  at most 1.75 px), and the block gets wider with it. It sits a little above
  the vertical centre. Below 900 px nothing changes.

## How scoring works

- `total` = statements answered "Guilty" out of the 30 drawn;
  `purity = round(100 * (1 - total / 30))`. "Not sure" counts exactly like
  "Never": the app passes only the "Guilty" ids to `score()` (`admittedIds`),
  so it costs no purity and is never evidence.
- Each statement has a band: mild (1 point), medium (2) or extreme (3). Every
  play shows 2 of each per section, so each section is worth 12 points. That
  gives each section a depth from 0 to 100 and a depth band (none / low 1-2
  points / mid 3-6 / high 7+). "work" is shown as "Adulting" / 正经事:
  grown-up paperwork, not a job.
- The type is the first rule that matches: **merged** (20 or more admitted,
  or every section in the high band), the hidden type **soulmate** (every Bond
  statement shown plus at least one extreme Heart statement), **untouched**
  (3 or fewer, all mild), **balanced** (three or more sections tie for the
  top, or 6+ spread within 3 points over all five with the top at most 1
  point ahead of the second, `balancedMaxLead`), otherwise the deepest
  section's `_deep` type when it is in the high band or both its extreme
  statements were admitted, else its `_lite` type. A two-way tie for the lead
  goes to the heavier admitted statement, then more statements, then **a
  play-off** (below), and only when the play-off ends level, **the play's
  lot** (a coin flip made from the play's seed: the same play always gives
  the same result, but no section is favoured across players).
- **The play-off** (`playoffRounds`, and `score(admitted, content, drawn,
  rules, playoffAnswers)`). When two sections are still exactly level, the
  player answers up to three short rounds after statement 30, medium, then
  mild, then extreme: each round one statement from each tied section, of
  that band, drawn uniformly from the statements of that section and band the
  play did not show; which comes first is a coin flip; all of it from the
  play's own generator (label `apt-playoff-v1`), so the same play always gets
  the same play-off and the draw of the 30 is unchanged. After each round the
  section with more admitted play-off points wins; level after three, the lot.
  Its answers decide only which of the two leads: purity, points, depth,
  lite or deep, the match, the evidence and the section rows stay on the 30.
  `tieBreak` is then `'playoff'`, and `result.playoff` holds the rounds, how
  many were played, the points and the round that decided. About 7.7% of
  players need one; the lot now decides for 2.7% instead of 7.7%
  (`SCORING.md`, section 4 and 8).
- The result also carries a secondary type, up to 3 evidence statements and a
  match number (section types: lead / (lead + runner-up), 50 = dead heat,
  capped at 60 / 80 for one / two answers). `score()` also returns
  `runnerUpDim`, `tiedDims`, `tieBreak` (`'top'`, `'count'`, `'playoff'` or `'lot'`), `playoff`,
  `matchCap`, `hiddenRule`, `shown`, `maxPoints` and `drawnCount`, so the
  screen can explain itself without redoing the rules. **`SCORING.md`** has
  the full rules in plain English and Chinese.

The functions the app calls:

```
makeSeed()                               -> "k3x9q0"  (a fresh seed)
normalizeSeed(value)                     -> the seed, or null if invalid (then make a new one)
drawStatements(content, seed)            -> the 30 statement ids, in asking order
score(admittedIds, content, drawnIds)    -> the result
cleanAnswers(saved, content, drawnIds)   -> saved answers, limited to this play
resumePlay(saved, linkSeed, content)     -> the play a page load shows: { seed, drawn, answers, screen, index, seedFromLink }
admitByCounts(content, drawnIds, counts) -> ids for a sample player written as band counts
```

## Fairness

The owner's rule is that the drawing and the judging must have no built-in
favourite. What is guaranteed, and tested by `node tools/fairness.js` over
200,000 seeds (and by a 20,000-seed copy in the tests):

- every statement in a stratum (section x band) is shown equally often, 2 in 7
  once the bank is full; every pair in a stratum comes up together equally
  often; picks in different strata are independent;
- inside each band group every statement is equally likely at every place,
  and every section is equally likely to be asked first;
- seeds one character apart give unrelated draws;
- with simulated players who treat the five sections identically, the five
  lite types and the five deep types come up equally often, and a tie decided
  by lot goes to each section equally often;
- the play-off shows each unseen statement of a stratum equally often, the
  order inside a round is a fair coin, each tied section wins about half its
  play-offs (pair by pair), and the draw of the 30 is byte for byte what it
  was before the play-off existed (check (g)).

What it cannot guarantee without real players: that two statements in the
same band are equally easy to admit, or that the five sections are equally
easy overall. That depends on how the statements are written. Once real plays
exist, the admit rate per statement is the thing to check. A first check with
24 language-model-played respondents (SCORING.md, section 10) found School far
easier to admit than the other sections; 45 statements were rewritten after
it, and a re-run on the new texts brought Heart, Brain and Bond closer to
School but not level with it. It also led to the SAMPLER spread going from 2
points to 3. Section 10 has the numbers, including what is still short
(HAHA-OK is about 1% of panel plays).

The bank is full: 105 statements, 7 in each of the 15 strata, so every
statement is shown in 2 of 7 plays. `validateContent` fails if the strata
ever become unequal again.

## The result screen

The result has to make sense, so it shows its reasons. Everything on it comes
from one `scoring.score()` call on the player's answers, so the screen and the
rules cannot disagree. Top to bottom (one column on a phone; on a laptop the
card stays pinned on the left):

1. **The card**: code, the type's character beside the name and tagline,
   purity, five bars, plus a small **match** number and, when there is a secondary type, an "Also" chip with
   its code. The saved PNG shows both too. The bars show **weight**, not
   counts (each fills depth / 10 squares), so the longest bar is always the
   section that decided the type. **Save image, Copy link and Share sit right
   under the card** (on a laptop they stay pinned with it).
2. **Why you got this**: the type's `why` line (the rule in plain words),
   then "Because you admitted:" and up to three of the player's own answers
   (`evidenceIds`), most extreme first, each with its section, band
   (mild / medium / extreme) and points ("School · extreme · 3 points"). The last line gives the match in the player's own numbers ("Heart
   beats your next section, School, 9 points to 8"), says so when it was a
   tie and how the tie was broken (a mirror tie names the two level sections
   and the play-off round that settled it, or says plainly that the play-off
   ended level and the lot decided), and when the one- or two-answer cap applied.
   With nothing admitted (the Analog), it says the evidence bag is empty.
   If the player answered "Not sure" at all, one quiet line under the match
   says how many and that they counted as Never; from 8 on it adds that the
   purity is probably flattering. The card never mentions it.
   **How this result was reached** (right after it, not for a preview or a
   peek, never in a comparison or reply view): score()'s own run on this
   play, one row per check in the order score() makes them: 20 or more or
   deep in all five; the hidden combination (never spelled out); 3 or fewer,
   all mild; an even spread with no lead (with the real reason it fails:
   too few, a section untouched, the spread, or the lead); which section is
   heaviest (and how a tie was settled: heavier statement, more statements,
   the play-off round, or the lot); how deep. The deciding row is in the
   type's colour, the rows after it are greyed with "No need to go further".
   A header gives the play number (the seed, already in share links), and the
   small print quotes the draw's chance, 2 in 7, and the observed range in
   tools/fairness.js. The rows come from `extras.judgingTrace(result)`, which
   reads the result and `scoring.RULES` and never decides a type itself;
   `tests/judging.test.js` checks it against score() for every persona on
   200 draws and 20,000 simulated players, and reruns check (a) of
   tools/fairness.js to keep the quoted range true.
   Then two lines built from the player's own 30 answers
   (`extras.reasonLines`): a contrast in plain numbers ("You admitted 5 of
   the 6 Heart statements. Across the other four sections you averaged 2.")
   and a counter-proof, a statement they did not admit that marks the edge of
   the result, quoted ("The one Heart statement you passed on: ..."), or,
   when they admitted everything shown there, the heaviest statement they
   passed on in their next section down (one line only if they passed on
   nothing at all). ANALOG, SAMPLER, PLUG-IN and the
   hidden type get their own pair (how short the list is and the mildest
   thing they passed on; the points per section and how far the top is
   ahead, at most 1 point, or how many share the top; the spread
   and the heaviest thing passed on; all of Bond and the Heart extremes).
   From three finished plays on this device, a last quiet line: "Your last 5
   plays: CC-BOT 3, HAHA-OK 1, 404 1. Most often: CC-BOT." (see "All 14 types"
   for the history).
3. The roast. 4. Three telltale signs. 5. Superpower, weak spot, "Your AI says".
6. **Section by section**: each section's six drawn statements as squares that grow
   with their weight (small = mild, big = extreme; filled = admitted), its
   count, points and band, and the one-line `reads` for that band. The lead
   section is tagged "Leads"; a tied section "Tied"; the close second "Close
   second".
7. **Your other leaning** (only with a secondary type): one line with the real
   points ("School is right behind Heart, 8 points to 9"), and a "See CODE" link.
8. **Gets on with / Clashes with**: two cards, each with the other type's
   character small on a square of its colour; tapping one shows that type.
9. "New questions" (a new seed, straight to statement 1) and "See all 14 types", then a closed "How this is scored" panel with six plain sentences.
   (A second "See all 14 types" link sits just above the pairing cards.)

**Looking at another type.** Tapping a paired or secondary type shows that
type's full result, played by its sample player, under a dark bar with "Back
to my result". It adds one browser-history entry, so the phone's back gesture
also returns, to the same scroll position. Save and share are hidden there, so
nobody shares a type they did not get; the match line says it is the sample
player's, and the section reads (which talk to "you") are hidden. A refresh
returns to the player's own result.

## All 14 types

"See all 14 types" (全部人格) shows every type as a small copy of the result
card: its colour, a top line (section and depth, such as "School · light",
or for the four special types how they are reached), the type's character
(right-aligned under the top line), the code as large as the card allows
(fitted with the same `fitText` as the big card), the name and the tagline.

- **Where it opens**: a link under the sticker caption on the landing page;
  on the result, a link just above the two pairing cards and another next to
  New questions; and `?types=1` in the address. While it shows, the address
  carries `?types=1`, so a refresh reopens it.
- **Layout**: on a phone two columns, one section per row (light left, deep
  right), then the four special types; four columns from 640 px; from 900 px
  five columns, each section a column with light on top and deep underneath.
  Order is `galleryOrder()` in `scoring.js`.
- **Tapping a card** opens that type as a peek (sample player, dark bar, no
  save or share) with "Back to all types". The player's own card, when there
  is a result underneath, is marked "You" and goes straight back to their real
  result instead.
- **The collection.** Every type the player has ended a play on is
  remembered on this device (`localStorage`, key `apt-collected-v1`, the type
  ids joined by commas; helpers `collectedTypes` / `rememberCollected` in
  `extras.js`, which swallow storage errors like the unlock flag does). The
  grid then says "Collected 3 of 14" under its intro and puts a small ink
  stamp with a tick on each collected card (screen readers hear
  "Collected"). Nothing is greyed out or hidden, since the grid is also how
  people browse the types, and the line only shows from the first collected
  type on. Only a finished play counts: `?preview=`, peeks and comparison
  links never do. With storage blocked, the type of the result underneath
  is still marked.
- **Play history.** The type of each finished play is also kept, the last
  20 (`localStorage`, key `apt-history-v1`, the type ids joined by commas;
  `playHistory` / `rememberPlay` / `historySummary` in `extras.js`, same
  storage safety). Only finishing a play adds one (never a preview, a peek or
  a reply link). On the grid a collected card's stamp shows how many of those
  plays ended on it instead of the tick, and from three plays on the result
  says which types the last five were and which came up most often, because
  one play shows only 6 statements per section and a new draw can land
  elsewhere.
- **The hidden type** shows as a locked card (dashed outline, "???", one hint
  line, no code, name or character) until the player has actually got it on this device.
  The same lock covers MY-BOT's "Gets on with" card (which points at it, and
  shows no character while locked) and
  any attempt to peek at it; it is never one of the landing stickers (codes or characters), and the
  merged sample player stops one extreme Bond statement short of its rule. It
  unlocks when the player gets it as their result, or as the "Also" type of
  the merged result (which means the same rule was met). Then one flag goes into `localStorage`
  (`apt-hidden-unlocked-v1` = `1`; helpers `hiddenUnlocked` /
  `rememberHiddenUnlocked` in `scoring.js`) and the card stays open, even after
  New questions. It holds no answers, so the footer's promise that nobody
  records which statements anyone admitted stays true. Previews and peeks never unlock it;
  `?preview=soulmate` still shows the type for QA. To lock it again, clear the
  site's data.
- **Back**: the grid and a peek are layers on top of the current screen. Each
  step up adds one browser-history entry (`history.state` records
  `aptDepth`, `aptGallery`, `aptPeek`), so the phone's back gesture and the
  in-page buttons step down one layer at a time, to the same scroll position
  and the button that was tapped. When the grid was opened straight from
  `?types=1`, there is nothing behind it, so its back button goes to the
  landing page (or the saved result) in place instead of leaving the site.
- Keyboard: every card is a button (Tab, Enter); focus goes to the grid's
  heading on the way in and back to the opening card or link on the way out.
  The answer keys are switched off while the grid sits over a question.

**Sample players.** `?preview=` and the peek use a sample player per type
that really scores as that type, so the preview shows real evidence and a
real match. Because every play draws different statements, a sample player is
written as band counts per section (like the personas in `tools/personas.js`)
and turned into ids for a draw with `admitByCounts(content, drawnIds, counts)`.
They live in `SAMPLE_COUNTS` in `app.js` and play on the current play's draw;
`tests/gallery.test.js` reads that object and checks that every sample scores
as its own type on 300 draws, never by lot, and that the merged sample never
meets the hidden rule. If a rule change moves one, the console warns too;
pick new counts for it.

## Editing the content

Everything a person reads lives in `content.js`. Change text there and refresh.

- Every piece of text is a pair: `{ en: '...', zh: '...' }`.
- Statements form a bank. Each one has an `id`, a `dim` and a `band`
  (`'mild'`, `'medium'` or `'extreme'`), plus its `text`. No `flag` and no
  `level`: every statement in a stratum must have the same chance of being
  shown. The bank holds 21 per section, exactly 7 per band (105 in all):
  the original 50 kept their ids (`s01`-`s50`, minus `s10`, which was
  dropped), the rest run from `s51` to `s106`. Ids never change and are
  never reused; their order in the file does not matter.
- Every stratum needs at least 2 statements (or no play can be drawn).
  Unequal strata are an error (a warning only for a bank under 105, which
  the tests use). Adding or removing statements changes what old seeds draw,
  so share links from before show a different set; rewriting a statement's
  text does not.
- Write statements broad (a real player: "some questions are too specific").
  The claim must be a kind of thing many AI-using students have done; keep
  at most one concrete touch, phrased as an example. The joke rides on top as
  flavour and is never a second condition the player also has to meet. Two
  statements that can meet in one play must not tell the same joke.
- Every section has the same targets among ordinary AI users: mild about
  half admit it, medium a quarter to a third, extreme one in eight to one in
  five. A section that is easier to admit wins more plays, so balance the
  sections by rewriting statements, never by weighting them in the rules
  (SCORING.md, section 10, has the November 2026 panel check that found
  School far easier than Heart, Brain and Bond).
- A statement may never be the only way to reach a type, and type copy may
  never refer to one specific statement: a player sees only 30 of the bank.
- A dimension's optional `blurb` is a note for editors about what belongs in
  that section. Nothing on screen shows it.
- Keep all 14 type ids. `code` is 3 to 7 characters of A-Z, 0-9 or `-`.
  `color` is a 6-digit hex; the app picks dark or white text for it automatically.
- Limits: statements 90 characters (English) / 34 (Chinese); taglines 60 / 24.
  In practice keep English to about 80 characters: the card is sized for at
  most 4 lines (English) or 3 (Chinese) on a 360 px phone, and 3 lines on a
  laptop, and `tests/content.test.js` estimates the line count of every
  statement (a check in a real browser is still the final word).
- Line breaks in the big statement text are handled in `app.js`
  (`statementPieces`), so write plain text: hyphens and "&" never start or
  split a line in English. Chinese lines break only after ，、：；。！？, around
  「quotes」 and after 的 着 把 给 和, never between "让" and "AI". Keep each
  Chinese clause (the part between commas) to about 11 characters, so it fits
  on one phone line; a longer clause gets broken mid-word.
- Interface strings can contain `{placeholders}` such as `{n}` or `{name}`;
  keep them. `UI_KEYS.md` lists every key.

To check your edits, open the page and look at the browser console: the app
lists any problems it finds. Or run the checker directly:

```
node -e "require('./content.js'); console.log(require('./scoring.js').validateContent(globalThis.APT_CONTENT))"
```

An empty list `[]` means the content is valid.

## Sharing

- **Save image** draws the result card onto a 1080 x 1440 canvas, character
  included (see "The characters" for how the picture gets onto the canvas).
  - On a laptop it downloads the PNG and says "Image saved".
  - On phones and inside in-app browsers (Xiaohongshu, WeChat, Instagram and
    so on, which ignore download links) it opens the picture full screen with
    a "press and hold to save" hint. A long-press saves it to the photos.
  - If the image cannot be made, a toast says so instead of claiming success.
- **Copy link** copies the page URL with `?from=<type>&seed=<seed>&lang=<lang>`,
  so a friend who opens it plays the same 30 statements.
- The card's bottom line is the address alone, `guiltyofai.vercel.app`,
  on screen and in the PNG.

## Compare with a friend

- **Challenge a friend** (under the share buttons on your own result) copies
  `?seed=<seed>&vs=<code>&lang=<lang>`. Right under the button, before
  anything is copied, one line says: "Whoever opens this link can see which
  statements you admitted." (「打开这个链接的人，能看到你认了哪几条。」)
- **What a challenge link reveals**: which of your 30 statements you
  answered Guilty ("Not sure" and "Never" are both "not guilty"), and through
  that your type and purity. Nothing else: no names, nothing stored anywhere.
  The page does not show it to the friend before they finish, but the code
  is in the address, so anyone who decodes it by hand could see it.
- `vs` is 8 characters of 0-9 and a-z: 6 hold the 30 answer bits (bit i =
  the i-th statement in asking order), 2 are a check made from the seed, the
  drawn ids and the answers. After a play-off it is 10: two more characters
  between them hold how many play-off rounds were played and which of their
  statements were answered Guilty, so a friend's browser settles the tie the
  same way (codes from before stay valid; a play-off part on a play that has
  no tie for the lot is refused). The comparison lists still use only the 30. A wrong length, other characters, a code pasted
  onto another seed, or a link from before the statement bank changed fail
  the check, and the page carries on as for an ordinary link (the broken
  parameter is removed from the address). The check stops accidents, not
  people: a hand-made code is possible, but every type and number is
  recomputed from the bits with `scoring.score()`, so they can only ever be
  what those answers would score.
- **The friend** sees a landing line saying a friend sent their 30 (no type,
  no answers), plays the same 30, and their result opens with a comparison
  block above "Why you got this": both cards small and side by side ("You"
  and "Your friend"), each purity, who is purer and by how much, one line on
  how the two types get along (your type's own `bestWithLine` /
  `clashWithLine` when it names theirs; otherwise a short neutral line, such
  as "Same type. You can split the blame."), up to three statements both
  admitted (heaviest first), up to two only the friend admitted and up to two
  only you admitted.
- **Send it back** on that block copies `?seed=...&vs=...&re=<their code>`,
  with a line saying it carries both sets of answers. Opening it shows the
  comparison straight away, from the address alone, to anyone; "you" there is
  the person who sent the challenge. It never touches that tab's own play,
  the collection or the hidden-type lock. "Take the test yourself" starts a
  fresh play.
- A result reached this way still counts for the collection for the person
  who played it; the friend's card in the comparison never does. If the
  friend's result is the hidden type, the comparison shows it (it is their
  real result), but the grid stays locked until you earn it.

## Statistics

The owner counts visits and results with GoatCounter (account
`leowan34`). The helper is `track(name, once)` in `app.js`, which hands a name
to `sendStat` in `extras.js`; `statUrl` there builds the request, so what can
be sent is decided in one place.

- **Only on the real site**: `https://guiltyofai.vercel.app`. Nothing is sent
  from `file://`, `localhost` or any other host (`statsAllowed`).
- **What is sent**: a GET to `https://leowan34.goatcounter.com/count` with
  `p` (the name), `t` (the same name, or "AI Purity Test" for the page view),
  `e=true` for events, `s` (the screen width) and `rnd` (a cache buster). The
  page view of the landing also carries `r`, the origin of a referrer on
  another site (such as `https://www.xiaohongshu.com`), never its path. The
  request goes out with no cookies and no Referer header (`referrerPolicy:
  'no-referrer'`), and if it is blocked, slow or offline nothing on the page
  notices.
- **Names** (each at most once per play or per page load):
  - `/`: a page view, once per page load, when the landing page shows;
  - `lang:en` / `lang:zh`: the landing's language, once per page load and language;
  - `start`: the first answer of a play;
  - `finish` and `result:<type id>`: the result reached by finishing a play
    (never a preview, a peek, the grid or a reply link);
  - `tiebreak`: a play-off was shown (once per play);
  - `save-image`, `copy-link`, `challenge-made`: once per play;
  - `challenge-opened`: the landing opened from a challenge link (per page load);
  - `compare-shown`: the comparison on a challenged player's result (per play);
  - `reply-opened`: a reply link opened (per page load);
  - `new-questions`, `start-over`: each tap.
- **Never sent**: the address's query (`?seed=`, `?vs=`, `?re=` and `?from=`
  hold the play and answer codes), statement ids, answers, the purity, the
  seed, or a referrer from this site.
- **Why not GoatCounter's own `count.js`**: it always adds `location.search`
  to every hit (and the full referrer by default), which would send the seed
  and answer codes. So the page builds GoatCounter's documented `/count`
  request itself and loads no third-party script at all.
- **Reading the totals back.** The landing page also reads GoatCounter's
  public totals, from `https://leowan34.goatcounter.com/counter/<path>.json`
  (`{"count": "1,234"}`; GoatCounter caches them for up to four hours): the
  `finish` count for the line "1,234 tests finished" in the first screen (only
  from 100 on), and the fourteen `result:<type id>` counts for "Most common
  results" (only once they add up to 200; shares are each type's count over
  that sum, one decimal; a type with no count is 0; ties keep the fixed type
  order; the hidden type shows its code only to someone who has unlocked it,
  otherwise "???"). Below the thresholds, or on any failure (a 403 while the
  counter is switched off, a 404, a timeout of 4 s, an odd value) nothing is
  shown at all, never a placeholder or an invented number. The count line is
  read after the first paint, the ranking when its place comes near the
  screen; all requests go in parallel, with no cookies and no Referer, only
  from the real site; the parsed numbers are kept on the device for an hour
  (`apt-public-counts-v1`). The fetching and the thresholds are pure
  functions in `extras.js` (part 6), tested in `tests/counts.test.js`.
- `tests/stats.test.js` checks the list, the fields, the host guard and that
  every call in `app.js` uses a listed name.

## Link preview

`index.html` carries Open Graph and Twitter card tags (English: static HTML
has one language) and a canonical link, all with absolute URLs to
https://guiltyofai.vercel.app/. The picture, `og.png`
(1200 x 630), is drawn by `tools/og.html` from content.js and art.js; make it
again after changing the title, the lead line or the characters:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --hide-scrollbars --window-size=1200,630 --screenshot=og.png tools/og.html
```

## Publishing

GitHub Pages lets browsers keep `styles.css` and the scripts for 10 minutes,
so after a push people can still get the old files. Every local file in
`index.html` therefore carries the same `?v=` version. **Bump it before each
push**: `node tools/bump-version.js` (today's date plus the next letter,
such as `20261115b`) or `node tools/bump-version.js <value>`. A test checks
that all of them carry the same, non-empty version.
- **Share** appears only where the browser has the Web Share API. The card
  PNG is prepared as soon as the result shows, so the share sheet opens right
  inside the tap (Safari refuses it otherwise). It shares the image plus the
  link, or just the link where files cannot be shared.

## Fonts

The page uses system fonts and loads no fonts from the network. Codes and scores use
Avenir Next Condensed, which only Apple devices have. Everywhere else they fall
back to "APT Display": Anton (SIL Open Font License, `fonts/Anton-OFL.txt`),
cut down to plain ASCII (about 5 KB) and embedded in `styles.css` as base64.
Chinese always uses the system's Chinese font.

## How the saved image matches the screen

The result card is laid out in "card units" (1 unit = 1% of the card's width)
from one object, `CARD`, in `app.js`. The on-screen card uses those numbers as
CSS `cqw` units; the "Save image" button draws the same numbers onto a
1080 x 1440 canvas. Text sizes and line breaks are worked out once and reused by
both, so the PNG matches what is on screen. (One exception: on very narrow
phones the small card text has an 11px floor on screen only.)

Card layout, top to bottom: product name and "Guilty" count; the type code, as
large as the space allows; then a row with the type name and tagline on the
left and the type's **character** on the right (a square of `CARD.artMax` =
47 units, nearly half the card's width; the name and tagline wrap in the
narrower column beside it, the name in up to three lines and the tagline in up
to four, and sit in the middle of the row); a fixed gap; the purity score, with
a small right-hand column beside it (the match number, then the secondary chip
when there is one; it fits beside the score, so it adds no height); five bars
that run the full width, filled by weight; the note. Any spare height goes
above the code, so every card has the same distance between the character row
and the score.

The character sits beside the words rather than above or below them because
the card has no spare height: the score, the bars and the note take about 47
of its 133 units, and stacking a picture on top of the code would leave both
small. Beside the name and tagline it costs no width from the code, the score
or the bars. To make room for a 47-unit figure without shrinking the code, the
top and bottom padding (`padY`), the bar rows and the gaps around the score are
a little tighter than the sides. Every drawing keeps a little empty margin
inside its square, so the square hangs 2 units into the right padding
(`artOverX`) and 2.5 units into the gap above the score (`artOverY`), and rises
into the empty bottom of the code's line box (codes have no descenders): by as
much as the font leaves free under the glyphs, keeping 1.2 units clear, at most
3 (`artRaiseFor`, worked out from the font's own metrics, so it holds for
Avenir Next Condensed and the "APT Display" fallback alike). A name or tagline
with one word too wide for the column at its smallest size would make the
square smaller (`artMin` 40); none of today's do. A type without a character
(art.js missing or lacking it) gets the plain layout: name and tagline across
the full width, the code taking the height instead.

In Chinese, a two- or three-line name or tagline breaks after clause
punctuation if it can, otherwise after a phrase-ending word (`的` and the
others in `ZH_BREAK_AFTER`), and only then wherever the lines come out most
even (`balanceLines`). Beside the character, a tagline that cannot break at
its "，" in two lines takes three ("它不记得你，/ 你记得它说的 / 每一句").

## The characters

One hand-drawn SVG per type: viewBox 0 0 240 240, no fonts or filters, a navy
marker line with a white scribble fill, drawn to sit on the type's own card
colour.

- **Making art.js.** The drawings live in `art-src/c/out/<type id>.svg`.
  `node tools/pack-art.js` checks each one (one `<svg>` root with that
  viewBox and the SVG namespace, at most 12 KB, no `<script>`, event
  handlers, `<foreignObject>`, `<image>`, text or filters, no link or `url()`
  to anything outside the file), adds `width="240" height="240"` to a root
  without them, and writes `art.js` in type order. It prints the types it
  found and any that are missing; a missing type is just left out. A drawing
  that fails a check stops the run and `art.js` is not written. Four early
  drawings under their old names next to `art-src/c/build.js` (`analog`,
  `ccbot`, `404`, `mybot`) stand in when `out/` lacks those types. Rerun it
  after every change to the drawings; `tests/art.test.js` fails while
  `art.js` is behind `art-src/c/out/`.
- **On screen** each character is an `<img>` from a `data:` URI (never inline
  markup), with `alt=""` and `aria-hidden="true"`, so it adds nothing for
  screen readers or the keyboard. It shows on the result card, on each grid
  card, small on the two pairing cards, and as three character stickers above
  the code stickers on the landing page (`TEASER_ART` in `app.js`; never the
  hidden type). The only exception to "never inline" is the result reveal,
  which puts the card's SVG inline for a few seconds to draw its lines and then
  removes it. Apart from that, the only motion is the stickers' existing
  entrance; "reduce motion" switches off both.
- **In the PNG.** A canvas can only draw an image that has finished loading,
  and a tap cannot wait. So right after the first render the app loads every
  character (`preloadArt`): an `Image` per type, from the same data URI but
  with the SVG's width and height raised to 480 so every browser rasterises
  it sharply at PNG size; it waits for `onload`, then `decode()`, and does
  one throwaway draw onto a tiny canvas (Safari can paint a freshly loaded
  SVG image blank the first time it is drawn). If `decode()` rejects or never
  settles, which some WebKit versions do for SVG, it counts as ready after
  500 ms. "Save image" draws straight away when the picture is ready (always,
  in practice); otherwise it waits for it, at most 4 s, so it never saves a
  card without its character because of timing. The share file waits the same
  way. If a browser refused to export a canvas with the picture on it (a
  "tainted" canvas; current browsers allow a self-contained data: SVG, some
  old Safari versions did not), the app exports the card without the
  character rather than failing.
