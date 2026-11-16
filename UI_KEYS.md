# UI keys

Every key below must exist in `APT_CONTENT.ui` in content.js, each as `{ en, zh }`.
The current wording lives only in content.js (it is not copied here, so it cannot drift).
Words in `{braces}` are filled in by app.js and must be kept (they may move within the sentence):
`fromFriend` {name}; `progress` {n} {total}; `continuePlay` {n} {total}; `cardTicks` {n} {total};
`barAria` {name} {n}; `shareText` {code} {name} {purity};
`evidenceLeadSpread` / `evidenceLeadSome` {n}; `exhibitLabel` {n}; `exhibitMeta` {dim} {weight} {pts};
`matchHeading` {n}; `matchDim` / `matchTieTop` / `matchTieCount` / `matchTieLot` {dim} {dim2} {a} (and {b} in `matchDim`);
`matchDimAlone` {dim}; `matchCapOne` / `matchCapTwo` {cap}; `matchBalanced` {gap} (already "3 points"); `unsureNote` {n} {total};
`dimRowMeta` {n} {shown} {pts} {band}; `dimAria` {name} {n} {shown} {pts} {band}; `pointOne` / `pointMany` {n};
`secondaryDim` {dim} {leadDim} {a} {b} {code} {name}; `secondaryTie` {dim} {leadDim} {code} {name};
`secondarySoulmate` / `secondaryMerged` {code} {name};
`seeType` {code}; `peekNote` {code}; `peekBackTo` {code};
`typesCollected` {n} {total}; `comparePurity` {n}; `comparePurerYou` / `comparePurerFriend` {pts} (already "12 points");
`compareTie` {n}; `compareMeta` {dim} {weight};
`playoffCount` / `playoffProgress` {n} {total}; `matchPlayoff` {dim} {dim2} {a} {round}; `matchPlayoffLot` {dim} {dim2} {a};
the `reason…` lines: see their rows ({quote} is one of the player's statements, quoted by app.js); `historyLine` {n} {list} {most}; `historyAllDifferent` {n} {list};
`listAnd` {a} {b}; `typesPlays` {n}.
In the `secondary…` lines each language may use {code}, {name} or both: the English
type names read badly mid-sentence ("part The Text Decoder"), so English uses the code.
`validateContent` in scoring.js reports any key that is missing.
The characters (art.js) are pictures without words: they add no keys, and
every one of them is decorative (empty alt text).

| Key | Where it appears |
|---|---|
| `appName` | Top bar (a link back to the landing page, hidden on the landing itself), landing headline, card, page title |
| `intro` | Landing, under the headline |
| `meta` | Landing, small line under intro: 30 taps, and that the 30 are drawn from a bigger pile and change every time. Don't promise only two answers: every statement also offers `answerUnsure` |
| `closeEnough` | Landing, the one house rule under `meta` (with an ink tick on the left): if you've done something like it, it counts |
| `seedFromLink` | Landing, one quiet line when the seed came from a link: these are the sender's 30 statements, so the scores compare. Second line of the `fromFriend` banner, or on its own above the title when the link had a seed but no type |
| `start` | Landing button (when nothing is answered yet) |
| `continuePlay` | Landing, primary button when a play is under way ({n} = the statement they were on, {total} = 30) |
| `startOver` | Landing, secondary button next to `continuePlay` (or next to `peekBack` when every statement is answered): clears the answers, back to statement 1 |
| `restartSameSet` | Landing, quiet line under those two buttons, only when the play came from someone's link: starting over keeps that link's 30 |
| `brandHomeLabel` | Top bar: hidden words after the product name, which is a link back to the landing page ("AI Purity Test, back to the start") |
| `fromFriend` | Landing banner when opened from a shared link ({name} = type name) |
| `typesTeaser` | Landing, caption under the sticker cluster (three character stickers above six code stickers) |
| `langSwitch` | Language button label (name of the OTHER language) |
| `langSwitchLabel` | Language button: hidden hint read after the visible word ("中文 – Switch to Chinese") |
| `progress` | Question screen, read out by screen readers before each statement ({n}, {total}). The visible "12 / 30" is plain numbers and needs no text. |
| `playoffIntro` | On the card of the first play-off round's two statements (after statement 30, when two sections are dead level): one plain line |
| `playoffAgain` | Same place, rounds 2 and 3 (the round before ended level) |
| `playoffCount` | Question screen header during a play-off, in place of "30 / 30" ({n} = 1 or 2 within the round, {total} = 2) |
| `playoffProgress` | Read out by screen readers before each play-off statement |
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
| `cardNote` | Card bottom line (also in the PNG): the site address alone, the same in both languages |
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
| `footer` | Footer on the landing and result screens (hidden while answering). Must stay true: the site counts visits and results, never which statements anyone admitted; only a challenge link carries answers (README "Statistics") |
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
| `matchPlayoff` | Section type whose tie went to a play-off and was settled: names both sections and the round ({dim} = the winner) |
| `matchPlayoffLot` | Section type whose play-off ended level after three rounds, so the lot decided. Must say so plainly |
| `matchCapOne` / `matchCapTwo` | Added after the above when one or two answers capped the match ({cap}) |
| `matchBalanced` / `matchBalancedExact` | Balanced: the gap between the heaviest and lightest touched section, or "exactly the same" |
| `matchMerged` / `matchSoulmate` / `matchUntouched` | What the match number means for those types |
| `matchSample` | In place of the above on a preview or peek |
| `unsureNote` | Last line of the verdict, only when the player answered "Not sure" at least once ({n} = how many, can be 1, so no plural pronoun; {total} = statements in the play). Never on the card, a preview or a peek |
| `unsureMany` | Added after `unsureNote` from 8 "Not sure" answers on (`UNSURE_MANY` in scoring.js): the purity is probably flattering |
| `reasonDimContrast` | Section types, first of the two personal lines: {n} of {shown} admitted in the lead section {dim}, and the average {avg} over the other four |
| `reasonDimOne` / `reasonDimSome` | Section types, second line: the one statement passed on in the lead section {dim}; the heaviest of several passed on ({quote}) |
| `reasonDimNext` / `reasonDimElsewhere` | Section types, second line when the whole lead section was admitted (the first line already says so): the heaviest statement passed on in the next section down ({dim}, {quote}), or further down when that one was admitted in full too. With nothing passed on anywhere, there is no second line |
| `reasonAnalogCount` / `reasonAnalogNone` / `reasonAnalogPassed` | ANALOG: how short the list is ({n} of {total}, or empty), then a mild statement they passed on ({quote}) |
| `reasonBalancedCounts` | SAMPLER, first line: points per section ({list}); SAMPLER is decided by points, so it shows points |
| `reasonBalancedLead` / `reasonBalancedLevel` | SAMPLER, second line: how far the top section is ahead of the next ({pts}, at most 1 point by the rules), or how many share the top ({n}). Never claim more evenness than the numbers show |
| `reasonMergedSpread` / `reasonMergedZero` / `reasonMergedEven` | PLUG-IN: {total} of {all}, the most {max} of {shown} in one section, the fewest {min} (or the one untouched section {dim}, or the same {max} in every section) |
| `reasonHeaviestPassed` / `reasonPassedNone` | PLUG-IN and the hidden type, second line: the heaviest statement passed on ({quote}), or none at all ({all}) |
| `reasonSoulmate` | Hidden type, first line: all {n} Bond statements, {h} of {hs} extreme Heart |
| `historyLine` | Last line of the verdict from 3 finished plays on this device: the last {n} (at most 5) with counts ({list}, type codes) and the most frequent ({most}) |
| `historyAllDifferent` | Same place, when each of the last plays was a different type ({n}, {list} of codes) |
| `listAnd` | Joins two codes in `historyLine` when two types tie for most often |
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
| `peekBack` | Button that returns to the player's own result; also the landing's primary button when every statement of the play is answered |
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
| `typesCollected` | Under the grid's intro, once at least one type is collected on this device ({n} of {total} = 14) |
| `typesPlays` | Screen-reader text on a collected card whose stamp shows a number: how many of the recent finished plays ended on it |
| `typesCollectedMark` | Screen-reader word on a collected card (the stamp itself is decorative) |

| **Compare with a friend** (challenge and reply links; README "Compare with a friend") | |
|---|---|
| `challengeAction` | Button under the share buttons on the player's own result: copies the challenge link |
| `challengePrivacy` | The one plain line right under that button, shown before anything is copied: whoever opens the link can see which statements you admitted. Keep it plain and true |
| `challengeCopied` | Toast after copying the challenge link |
| `challengeLanding` | Landing, in place of `seedFromLink` / `fromFriend` when the link is a challenge. Must not name the sender's type or answers |
| `compareTitle` | Heading of the comparison block (kicker on the result; big heading on a reply link; also the page title there) |
| `compareYou` / `compareFriend` | Labels over the two small cards |
| `comparePurity` | Under each small card ({n} = purity) |
| `comparePurerYou` / `comparePurerFriend` / `compareTie` | Who is purer and by how much ({pts}); or a tie ({n}) |
| `compareSame` / `compareTheyBest` / `compareTheyClash` / `compareNone` | How the two types get along when "your" type's own `bestWithLine` / `clashWithLine` does not apply: same type; only their type gets on / clashes with yours; no pairing at all |
| `compareBoth` / `compareOnlyFriend` / `compareOnlyYou` | Headings of the three statement lists (up to 3 / 2 / 2, heaviest first) |
| `compareBothNone` | In place of the first list when nothing was admitted by both |
| `compareMeta` | Small line over each listed statement: section and band word |
| `sendBack` | Button on the comparison after a challenge: copies the reply link |
| `sendBackNote` | Line under it: the link carries both sets of answers and anyone who opens it sees the comparison |
| `replyIntro` | Reply link, quiet line above the heading |
| `replyStart` | Reply link, button at the bottom: a fresh play of one's own |

**The AI's remarks** are not `ui` keys: they live in `content.remarks`, lists of `{ en, zh }` lines under
`general`, `mild` / `medium` / `extreme` (statement bands) and `school` / `work` / `heart` / `brain` / `bond`
(sections). Each list needs at least one line; English at most 40 characters, Chinese at most 14, no emoji, no
exclamation marks (`validateRemarks` in extras.js, also run on page load and by the tests). Voice: a deadpan
witness who was there; never an accusation, nothing about the player's intelligence, looks or relationships.
They show in a small bubble above the Guilty button, hidden from screen readers.

Length notes for the card: the type name gets up to 2 lines and the tagline up to 2 lines (beside the character: name up to 3 lines and tagline up to 4, because both wrap in the column beside the picture, about 40% of the card's width); both shrink to fit if longer. In Chinese, put a "，" where a two-line tagline should break: the card breaks there first. `cardNote` is one line and shrinks to fit. Dimension names appear as bar labels on the card, so short names (one word / two characters) look best.
