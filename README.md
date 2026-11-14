# AI Purity Test

A one-page quiz. Each play draws 30 things people do with AI from a bank
of 105, shows them one at a time, mildest first, and you answer each
with "Guilty" or "Never" (or a small "Not sure", which counts as "Never").
You get a purity score from 0 to 100 plus
one of 14 comic "types" on a card you can save as a picture. English and Simplified Chinese. It is for fun and has zero science
in it. Nothing gets stored on a server or sent anywhere.

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

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell. Loads `content.js`, then `scoring.js`, then `app.js`. |
| `content.js` | All words: interface text, the 5 dimensions, the statement bank (each with a band), the 14 types. Data only. |
| `content.sample.js` | Old placeholder content from before the bank (no bands, old flags). Not loaded by anything; do not copy its shape. |
| `scoring.js` | Pure functions: the seed and the draw, scoring, and a content checker. Also runs under Node for tests. |
| `app.js` | The UI: screens, answering, the result screen and card, the PNG export and sharing. Also holds the sample player for each type. |
| `styles.css` | All styling. Colours and fonts are tokens at the top. Also holds the embedded display font (see below). |
| `fonts/Anton-OFL.txt` | Licence for the embedded fallback display font. |
| `tests/` | Scoring tests on drawn sets, the draw (`draw.test.js`: 2,000 seeds per bank, always 30, six per section, two per band, escalating, repeatable), a fast copy of the fairness checks (`fairness.test.js`, 20,000 seeds), persona expectations, checks on the real `content.js` (valid, every UI key present and used, all 14 types reachable on real draws, no interface text still saying 50 or quoting old rule numbers), the stored answers and which play a page load resumes (`answers.test.js`), and the "all types" grid and the sample players (`gallery.test.js`). Run `node --test tests/` |
| `SCORING.md` | How a play is drawn and how the result is decided, in plain English and Chinese, with the persona table, simulated type shares and the fairness results. |
| `tools/personas.js` | 29 named test players written as band counts per section ("admits 2 mild and 1 medium School statement"), so they fit any draw. |
| `tools/simulate.js` | Prints each persona's result over 500 draws, the type shares and match spread over 200,000 simulated players (each on their own draw), and how often a tie decided the lead. `node tools/simulate.js` |
| `tools/fairness.js` | Proves the draw and the judging have no favourite: six chi-square checks over 200,000 seeds on the real bank, run twice with two independent seed sources (a fixed, repeatable stream and the page's own `makeSeed()`), plus five deliberately broken versions that must be caught. Exits non-zero on failure. `node tools/fairness.js` (about 90 s) |
| `tools/sim-helpers.js`, `tools/stats.js` | Shared pieces for the tools and tests: a synthetic bank of the same shape (for tests and controls), a seed stream, the simulated player model; chi-square and normal p-values. |
| `UI_KEYS.md` | Every interface text key the app reads, with where it shows up. |
| `content/draft.json` | An old content draft with a different shape. Nothing loads it. |

## How the quiz flows

- One statement per screen, with two big buttons at the bottom: **Never** (left)
  and **Guilty** (right), and between them a smaller, quieter **Not sure** for
  a statement the player doesn't get or can't remember. Tapping one fills it
  (the big ones with a tick), the card slides away and the next statement
  glides in. The three buttons keep the same size and place on every
  statement, from 360 px phones up. The footer is hidden on these screens,
  so the page is exactly one window tall.
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
- The type is the first rule that matches: **merged** (25 or more admitted,
  or every section in the high band), the hidden type **soulmate** (every Bond
  statement shown plus at least one extreme Heart statement), **untouched**
  (3 or fewer, all mild), **balanced** (three or more sections tie for the
  top, or 6+ spread within 2 points over all five), otherwise the deepest
  section's `_deep` type when it is in the high band or both its extreme
  statements were admitted, else its `_lite` type. A two-way tie for the lead
  goes to the heavier admitted statement, then more statements, then **the
  play's lot** (a coin flip made from the play's seed: the same play always
  gives the same result, but no section is favoured across players).
- The result also carries a secondary type, up to 3 evidence statements and a
  match number (section types: lead / (lead + runner-up), 50 = dead heat,
  capped at 60 / 80 for one / two answers). `score()` also returns
  `runnerUpDim`, `tiedDims`, `tieBreak` (`'top'`, `'count'` or `'lot'`),
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
  by lot goes to each section equally often.

What it cannot guarantee without real players: that two statements in the
same band are equally easy to admit, or that the five sections are equally
easy overall. That depends on how the statements are written. Once real plays
exist, the admit rate per statement is the thing to check.

The bank is full: 105 statements, 7 in each of the 15 strata, so every
statement is shown in 2 of 7 plays. `validateContent` fails if the strata
ever become unequal again.

## The result screen

The result has to make sense, so it shows its reasons. Everything on it comes
from one `scoring.score()` call on the player's answers, so the screen and the
rules cannot disagree. Top to bottom (one column on a phone; on a laptop the
card stays pinned on the left):

1. **The card**: code, name, tagline, purity, five bars, plus a small
   **match** number and, when there is a secondary type, an "Also" chip with
   its code. The saved PNG shows both too. The bars show **weight**, not
   counts (each fills depth / 10 squares), so the longest bar is always the
   section that decided the type. **Save image, Copy link and Share sit right
   under the card** (on a laptop they stay pinned with it).
2. **Why you got this**: the type's `why` line (the rule in plain words),
   then "Because you admitted:" and up to three of the player's own answers
   (`evidenceIds`), most extreme first, each with its section, band
   (mild / medium / extreme) and points ("School · extreme · 3 points"). The last line gives the match in the player's own numbers ("Heart
   beats your next section, School, 9 points to 8"), says so when it was a
   tie and how the tie was broken (a mirror tie says plainly that it was
   decided by lot), and when the one- or two-answer cap applied.
   With nothing admitted (the Analog), it says the evidence bag is empty.
   If the player answered "Not sure" at all, one quiet line under the match
   says how many and that they counted as Never; from 8 on it adds that the
   purity is probably flattering. The card never mentions it.
3. The roast. 4. Three telltale signs. 5. Superpower, weak spot, "Your AI says".
6. **Section by section**: each section's six drawn statements as squares that grow
   with their weight (small = mild, big = extreme; filled = admitted), its
   count, points and band, and the one-line `reads` for that band. The lead
   section is tagged "Leads"; a tied section "Tied"; the close second "Close
   second".
7. **Your other leaning** (only with a secondary type): one line with the real
   points ("School is right behind Heart, 8 points to 9"), and a "See CODE" link.
8. **Gets on with / Clashes with**: two cards; tapping one shows that type.
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
or for the four special types how they are reached), the code as large as the
card allows (fitted with the same `fitText` as the big card), the name and
the tagline.

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
- **The hidden type** shows as a locked card (dashed outline, "???", one hint
  line, no code or name) until the player has actually got it on this device.
  The same lock covers MY-BOT's "Gets on with" card (which points at it) and
  any attempt to peek at it; it is never one of the landing stickers, and the
  merged sample player stops one extreme Bond statement short of its rule. It
  unlocks when the player gets it as their result, or as the "Also" type of
  the merged result (which means the same rule was met). Then one flag goes into `localStorage`
  (`apt-hidden-unlocked-v1` = `1`; helpers `hiddenUnlocked` /
  `rememberHiddenUnlocked` in `scoring.js`) and the card stays open, even after
  New questions. It holds no answers, so the footer's "your answers never leave
  this device" stays true. Previews and peeks never unlock it;
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
  at most one concrete touch, phrased as an example. Two statements that can
  meet in one play must not tell the same joke.
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

- **Save image** draws the result card onto a 1080 x 1440 canvas.
  - On a laptop it downloads the PNG and says "Image saved".
  - On phones and inside in-app browsers (Xiaohongshu, WeChat, Instagram and
    so on, which ignore download links) it opens the picture full screen with
    a "press and hold to save" hint. A long-press saves it to the photos.
  - If the image cannot be made, a toast says so instead of claiming success.
- **Copy link** copies the page URL with `?from=<type>&seed=<seed>&lang=<lang>`,
  so a friend who opens it plays the same 30 statements.
- **Share** appears only where the browser has the Web Share API. The card
  PNG is prepared as soon as the result shows, so the share sheet opens right
  inside the tap (Safari refuses it otherwise). It shares the image plus the
  link, or just the link where files cannot be shared.

## Fonts

The page uses system fonts and makes no network requests. Codes and scores use
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
large as the space allows; the type name and tagline (two lines at most,
balanced so no word sits alone); a fixed gap; the purity score, with a small
right-hand column beside it (the match number, then the secondary chip when
there is one; it fits beside the score, so it adds no height); five bars that
run the full width, filled by weight; the note. Any spare height goes above the code, so every
card has the same distance between the tagline and the score.
