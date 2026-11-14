# AI Purity Test

A one-page quiz. It shows 50 things people do with AI, one at a time, and you
answer each with "Guilty" or "Never" (or a small "Not sure", which counts as
"Never"). You get a purity score from 0 to 100 plus
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
| `?from=bond_deep` | Landing page says "A friend got ...". "Copy link" on a result makes this URL. |
| `?types=1` | Opens "All 14 types", the grid of every type (see below). |

## Files

| File | What it is |
|---|---|
| `index.html` | Page shell. Loads `content.js`, then `scoring.js`, then `app.js`. |
| `content.js` | All words: interface text, the 5 dimensions, the 50 statements, the 14 types. Data only. |
| `content.sample.js` | Placeholder content with the same shape, for reference and testing. Not loaded by the page. |
| `scoring.js` | Pure functions: scoring, the question order, and a content checker. Also runs under Node for tests. |
| `app.js` | The UI: screens, answering, the result screen and card, the PNG export and sharing. Also holds `SAMPLE_ANSWERS`, the sample player for each type. |
| `styles.css` | All styling. Colours and fonts are tokens at the top. Also holds the embedded display font (see below). |
| `fonts/Anton-OFL.txt` | Licence for the embedded fallback display font. |
| `tests/` | Scoring and question-order tests, persona expectations, checks on the real `content.js` (valid, every UI key present and used, all 14 types reachable), the stored answers (`answers.test.js`: saved state is cleaned, "Not sure" never reaches scoring), and the "all types" grid (`gallery.test.js`: card order, the hidden type's unlock flag, its text). Run `node --test tests/` |
| `SCORING.md` | How the result is decided, in plain English and Chinese, with the persona table and simulated type shares. |
| `tools/personas.js` | 26 named test players written as exact answers (used by the simulation and the tests). |
| `tools/simulate.js` | Prints each persona's result, the type shares and match spread over 200,000 simulated players, and how often a tie decided the lead. `node tools/simulate.js` |
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
- **Order**: statements are asked in 10 rounds. Round 1 is the first (mildest)
  statement of each of the 5 dimensions, round 2 the second of each, and so on,
  so topics mix and the quiz gets spicier as it goes. This is `questionOrder` in
  `scoring.js`. So in `content.js`, list each dimension's statements mildest first.
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
- The running purity sits small in the header. Answers (`yes`, `no` or
  `unsure` per statement) and position are kept in `sessionStorage` (key
  `apt-state-v2`), so a refresh or a language switch carries on where you
  were. A save from before "Not sure" existed only holds `yes` / `no` and
  loads as it is; anything else unknown is dropped (`cleanAnswers` in
  `scoring.js`). After statement 50 the result appears; "Start
  over" clears everything.
- Screen readers: each new statement gets focus, so it is read once, starting
  with "Statement 12 of 50, Heart: ...". The answers are a group named by the
  statement, and the picked one is marked pressed (and shows a tick).
- With "reduce motion" switched on, nothing slides; the tick shows briefly and
  the next statement appears.

## How scoring works

- `total` = number of statements answered "Guilty"; `purity = 100 - 2 * total`.
  "Not sure" counts exactly like "Never": the app passes only the "Guilty" ids
  to `score()` (`admittedIds`), so it costs no purity and is never evidence.
- Each of the 5 dimensions (school, work, heart, brain, bond) gets a count from 0
  to 10. "work" is shown as "Adulting" / 正经事: grown-up paperwork, not a job.
- Statements are weighted by level inside their dimension (mild 1, medium 2,
  extreme 3 points), which gives each dimension a depth from 0 to 100 and a band.
- The type is the first rule that matches: **merged** (42 or more admitted, or
  every dimension in the high band), **soulmate** (all three flagged
  statements), **untouched** (4 or fewer, all mild), **balanced** (no section
  leads: three or more tie for the top, or 10+ spread evenly over all five),
  otherwise the deepest dimension's `_deep` type when that dimension is in the
  high band (11+ of its 19 points) or holds two or more of its three extreme
  statements, else its `_lite` type. A two-way tie for the lead is settled by
  the heavier top statement, then by count, then by a fixed order (more
  personal section first), and the other section always shows as secondary.
- The result also carries a secondary type, up to 3 evidence statements and a
  match number. For section types, match = lead points / (lead + runner-up
  points): 50 is a dead heat, 100 means nothing else is close; one or two
  answers cap it at 60 or 80. `score()` also returns `runnerUpDim`,
  `tiedDims`, `tieBreak` and `matchCap`, so the screen can explain itself
  without redoing the rules. **`SCORING.md`** has the full rules in plain
  English and Chinese, the persona table and the simulated type shares.
- `node tools/simulate.js` prints what 26 named personas get and the type shares
  over 200,000 simulated players.

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
   (`evidenceIds`), most extreme first, each with its section, level and
   weight. The last line gives the match in the player's own numbers ("Heart
   beats your next section, School, 9 points to 8"), says so when it was a
   tie and how the tie was broken, and when the one- or two-answer cap applied.
   With nothing admitted (the Analog), it says the evidence bag is empty.
   If the player answered "Not sure" at all, one quiet line under the match
   says how many and that they counted as Never; from 8 on it adds that the
   purity is probably flattering. The card never mentions it.
3. The roast. 4. Three telltale signs. 5. Superpower, weak spot, "Your AI says".
6. **Section by section**: each section's ten statements as squares that grow
   with their weight (small = mild, big = extreme; filled = admitted), its
   count, points and band, and the one-line `reads` for that band. The lead
   section is tagged "Leads"; a tied section "Tied"; the close second "Close
   second".
7. **Your other leaning** (only with a secondary type): one line with the real
   points ("School is right behind Heart, 8 points to 9"), and a "See CODE" link.
8. **Gets on with / Clashes with**: two cards; tapping one shows that type.
9. Start over and "See all 14 types", then a closed "How this is scored" panel with six plain sentences.
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
  Start over; and `?types=1` in the address. While it shows, the address
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
  merged sample player leaves out one of its three statements. It unlocks
  when the player gets it as their result, or as the "Also" type of the
  merged result (which means the same three answers). Then one flag goes into `localStorage`
  (`apt-hidden-unlocked-v1` = `1`; helpers `hiddenUnlocked` /
  `rememberHiddenUnlocked` in `scoring.js`) and the card stays open, even after
  Start over. It holds no answers, so the footer's "your answers never leave
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

**Sample players.** `?preview=` and the peek use `SAMPLE_ANSWERS` in `app.js`:
one believable set of answers per type that really scores as that type, so the
preview shows real evidence and a real match. If a rule change moves one, the
console warns; pick new answers for it.

## Editing the content

Everything a person reads lives in `content.js`. Change text there and refresh.

- Every piece of text is a pair: `{ en: '...', zh: '...' }`.
- Keep exactly 50 statements, 10 per dimension, grouped in dimension order, with
  ids `s01` to `s50`, mildest first inside each dimension (that sets the order
  the quiz asks them in). Exactly 3 statements carry `flag: 'soulmate'`.
- A dimension's optional `blurb` is a note for editors about what belongs in
  that section. Nothing on screen shows it.
- Keep all 14 type ids. `code` is 3 to 7 characters of A-Z, 0-9 or `-`.
  `color` is a 6-digit hex; the app picks dark or white text for it automatically.
- Limits: statements 90 characters (English) / 34 (Chinese); taglines 60 / 24.
  At these lengths a statement takes at most 4 lines (English) or 3 (Chinese)
  on a 360 px phone, and 3 lines on a laptop.
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
- **Copy link** copies the page URL with `?from=<type>&lang=<lang>`.
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
