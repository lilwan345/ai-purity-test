# UI keys

Every key below must exist in `APT_CONTENT.ui` in content.js, each as `{ en, zh }`.
The current wording lives only in content.js (it is not copied here, so it cannot drift).
Words in `{braces}` are filled in by app.js and must be kept (they may move within the sentence):
`fromFriend` {name}; `progress` {n} {total}; `cardTicks` {n} {total};
`barAria` {name} {n}; `shareText` {code} {name} {purity};
`evidenceLeadSpread` / `evidenceLeadSome` {n}; `exhibitLabel` {n}; `exhibitMeta` {dim} {weight} {pts};
`matchHeading` {n}; `matchDim` / `matchTieTop` / `matchTieCount` / `matchTieLot` {dim} {dim2} {a} (and {b} in `matchDim`);
`matchDimAlone` {dim}; `matchCapOne` / `matchCapTwo` {cap}; `matchBalanced` {gap} (already "3 points"); `unsureNote` {n} {total};
`dimRowMeta` {n} {shown} {pts} {band}; `dimAria` {name} {n} {shown} {pts} {band}; `pointOne` / `pointMany` {n};
`secondaryDim` {dim} {leadDim} {a} {b} {code} {name}; `secondaryTie` {dim} {leadDim} {code} {name};
`secondarySoulmate` / `secondaryMerged` {code} {name};
`seeType` {code}; `peekNote` {code}; `peekBackTo` {code}.
In the `secondary…` lines each language may use {code}, {name} or both: the English
type names read badly mid-sentence ("part The Text Decoder"), so English uses the code.
`validateContent` in scoring.js reports any key that is missing.
The characters (art.js) are pictures without words: they add no keys, and
every one of them is decorative (empty alt text).

| Key | Where it appears |
|---|---|
| `appName` | Top bar, landing headline, card, page title |
| `intro` | Landing, under the headline |
| `meta` | Landing, small line under intro: 30 taps, and that the 30 are drawn from a bigger pile and change every time. Don't promise only two answers: every statement also offers `answerUnsure` |
| `closeEnough` | Landing, the one house rule under `meta` (with an ink tick on the left): if you've done something like it, it counts |
| `seedFromLink` | Landing, one quiet line when the seed came from a link: these are the sender's 30 statements, so the scores compare. Second line of the `fromFriend` banner, or on its own above the title when the link had a seed but no type |
| `start` | Landing button |
| `fromFriend` | Landing banner when opened from a shared link ({name} = type name) |
| `typesTeaser` | Landing, caption under the sticker cluster (three character stickers above six code stickers) |
| `langSwitch` | Language button label (name of the OTHER language) |
| `langSwitchLabel` | Language button: hidden hint read after the visible word ("中文 – Switch to Chinese") |
| `progress` | Question screen, read out by screen readers before each statement ({n}, {total}). The visible "12 / 30" is plain numbers and needs no text. |
| `closeEnoughHint` | Question screen, statements 1-3 of a play only: short form of `closeEnough` at the right end of the section label. It shares that line, so keep it ≤ 22 characters / 8 Chinese characters (a test checks) |
| `liveLabel` | Question screen, small label before the running purity; also the small label above the score on the card (capitalised in English) |
| `back` | Back button on the question screen (icon only; this is its accessible name) |
| `answerYes` | Answer button: I have done this. Keep it short, it shares a phone-width row with `answerNo` |
| `answerNo` | Answer button: never |
| `answerUnsure` | The small, quiet answer between the two: the player doesn't get the statement or can't remember. Scored like `answerNo`. Keep it to a word or two (≤ 10 chars / 4 characters), it sits between two big buttons on a 360 px phone |
| `keysHint` | Line under the answer buttons, only on devices with a mouse/keyboard. Names Y / N / → / ← / ↓ / Backspace; keep them in step with app.js |
| `resultHeading` | Result screen, screen-reader label |
| `previewBadge` | Badge shown only with ?preview= |
| `cardTicks` | Card top-right ({n} admitted of {total} shown) |
| `cardNote` | Card bottom line (also in the PNG) |
| `barsLabel` | Card bars, screen-reader label (the bars show weight, not counts) |
| `barAria` | Each bar, screen-reader text ({name}, {n} = filled squares out of 10) |
| `superpower` | Result, label |
| `weakness` | Result, label |
| `aiSays` | Result, label above the chat bubble |
| `saveImage` | Result button, right under the card |
| `copyLink` | Result button, under Save image |
| `share` | Result button, under Save image (only where the browser can share) |
| `newQuestions` | Result link-button at the bottom of the page: a new seed (a new set of 30), straight to statement 1 |
| `imageSaved` | Toast after saving |
| `imageFailed` | Toast if the card image could not be made |
| `saveHint` | Under the full-screen image on phones and in-app browsers |
| `close` | Button that closes the full-screen image |
| `linkCopied` | Toast after copying |
| `copyFailed` | Toast if copying fails |
| `shareText` | Text sent with Share ({code}, {name}, {purity}) |
| `footer` | Footer on the landing and result screens (hidden while answering) |
| **Result card additions** | (also drawn in the saved PNG) |
| `cardMatch` | Card, small label above the match number, right of the score (capitalised in English) |
| `cardAlso` | Card, small label left of the secondary type's chip (capitalised in English) |
| **Why you got this** | |
| `whyTitle` | Heading of the verdict block, right under the card |
| `evidenceLead` | Before the exhibits, for section types |
| `evidenceLeadHidden` | Before the exhibits, for the soulmate type (its rule: every Bond statement shown plus an extreme Heart one) |
| `evidenceLeadOnly` | Before the exhibits, for the untouched type when they are everything admitted |
| `evidenceLeadSome` | Same, if more were admitted than the 3 exhibits shown ({n}); cannot happen with today's rules (untouched = at most 3) |
| `evidenceLeadSpread` | Before the exhibits, for merged and balanced ({n} = statements admitted) |
| `evidenceLeadSample` | Before the exhibits on a preview or a peek (sample answers, not the player's) |
| `evidenceNone` | In place of the exhibits when nothing was admitted |
| `exhibitLabel` | Hidden label read before each exhibit ({n} = A, B, C) |
| `exhibitMeta` | Small line over each exhibit: section, band word, points ("School · extreme · 3 points"). Never a level number |
| `levelMild` / `levelMedium` / `levelExtreme` | The statement's band word in `exhibitMeta`: mild / medium / extreme, 轻度 / 中度 / 重度 (the key names are historical) |
| `matchHeading` | Bold start of the last line of the verdict ("Match 62%.") |
| `matchDim` | Section type: the lead beats the runner-up ({a} points to {b}) |
| `matchDimAlone` | Section type, no other section touched |
| `matchTieTop` / `matchTieCount` / `matchTieLot` | Section type tied with one other: which tie-break decided. `matchTieLot` says plainly that nothing in the answers separated them and it was decided by lot (`tieBreak: 'lot'`) |
| `matchCapOne` / `matchCapTwo` | Added after the above when one or two answers capped the match ({cap}) |
| `matchBalanced` / `matchBalancedExact` | Balanced: the gap between the heaviest and lightest touched section, or "exactly the same" |
| `matchMerged` / `matchSoulmate` / `matchUntouched` | What the match number means for those types |
| `matchSample` | In place of the above on a preview or peek |
| `unsureNote` | Last line of the verdict, only when the player answered "Not sure" at least once ({n} = how many, can be 1, so no plural pronoun; {total} = statements in the play). Never on the card, a preview or a peek |
| `unsureMany` | Added after `unsureNote` from 8 "Not sure" answers on (`UNSURE_MANY` in scoring.js): the purity is probably flattering |
| **Other result sections** | |
| `signsTitle` | Heading over the three telltale signs |
| `dimsTitle` | Heading over the section-by-section list |
| `dimsNote` | One-line legend under it (squares grow with weight; the card's bars add them up) |
| `dimsSample` | Extra line on a preview or peek: these are sample answers |
| `dimRowMeta` | Right side of each section row ({n} of {shown} = 6, {pts}, band word) |
| `dimAria` | Screen-reader text for each row's squares |
| `pointOne` / `pointMany` | "1 point" / "8 points", used for {pts} and {gap} |
| `bandNone` / `bandLow` / `bandMid` / `bandHigh` | Band words used in `dimRowMeta` and `dimAria` |
| `dimLeads` / `dimSecond` / `dimTied` | Tags on the lead section, the close second, and any section tied for the top (section types, and balanced from a 3+ way tie) |
| `secondaryTitle` | Heading over the other-leaning block (only when there is a secondary type) |
| `secondaryDim` / `secondaryTie` / `secondarySoulmate` / `secondaryMerged` | The other-leaning line, by kind of main type (`secondaryTie` when the two sections have equal points) |
| `seeType` | Link-button under that line that opens the secondary type |
| `bestWithTitle` / `clashWithTitle` | Small heading on each of the two pairing cards |
| `peekNote` | Dark bar on top while looking at another type |
| `peekBack` | Button that returns to the player's own result |
| `peekBackTo` | Same, on a `?preview=` page, where there is no own result ({code} = the previewed type) |
| **How this is scored** (keep in step with SCORING.md) | |
| `howTitle` | The disclosure's summary line |
| `howWeights` / `howUnsure` / `howLead` / `howSpecial` / `howSecondary` / `howHonest` | Its six sentences, in this order (`howUnsure`: "Not sure" counts as Never) |

| **All types** (the grid of the 14 cards; `?types=1`) | |
| `typesLink` | Link that opens the grid: landing (under the sticker caption), result (above the pairing cards, and next to New questions). Says 14; tests check the number matches |
| `typesTitle` | The grid's heading (focus lands here) |
| `typesIntro` | One line under the heading |
| `typesSections` / `typesSpecial` | Small headings over the ten section types and the four special ones |
| `typesLite` / `typesDeep` | Depth word in a section card's top line ("School · light") |
| `typesRuleUntouched` / `typesRuleBalanced` / `typesRuleMerged` | Top line of those three special cards: how the result is reached, in a few words (≤ 24 chars / 11 characters) |
| `typesHidden` | Top line of the hidden type's card, locked or not |
| `typesLocked` | Screen-reader word on the locked card |
| `typesLockedHint` | The locked card's one dry hint about the hidden rule (a pattern, not one statement). Must not quote any statement (a test checks) |
| `typesYou` | Tag on the player's own card (one short word) |
| `typesBack` | Back button on a type opened from the grid |
| `typesBackHome` / `typesBackQuiz` | The grid's back button when the screen underneath is the landing page / a question (on a result it reuses `peekBack`, on a preview `peekBackTo`) |

Length notes for the card: the type name gets up to 2 lines and the tagline up to 2 lines (beside the character: name up to 3 lines and tagline up to 4, because both wrap in the column beside the picture, about 40% of the card's width); both shrink to fit if longer. In Chinese, put a "，" where a two-line tagline should break: the card breaks there first. `cardNote` is one line and shrinks to fit. Dimension names appear as bar labels on the card, so short names (one word / two characters) look best.
