# How the result is decided

This is the rule sheet for `scoring.js`. You don't need to read code to follow it.
The rules are tested in `tests/` and checked against people with
`node tools/simulate.js`. If you change a rule, change the numbers in `RULES`
at the top of `scoring.js`, then rerun the tests and the simulation and update
this page.

(中文版在后半部分。)

Each statement gets one of three answers: Guilty, Never or Not sure. **Not sure
counts exactly like Never**: only Guilty answers reach `score()`, so Not sure
costs no purity, adds no points and is never quoted as evidence. (The result
screen only says how many there were.)

## 1. Every statement has a level and a weight

Inside each of the five sections (School, Adulting, Heart, Brain, Bond) the ten
statements are listed from mildest (level 1) to most extreme (level 10). The
level is simply the statement's position in its section in `content.js`.

| Levels | Kind | Weight |
|---|---|---|
| 1 to 4 | mild: nearly everyone has done these | 1 point |
| 5 to 7 | medium | 2 points |
| 8 to 10 | extreme | 3 points |

So a full section is worth 4 + 6 + 9 = **19 points**. Weighting is why
"asked AI what my own opinion was" says more about you than "asked AI to work
out a tip".

## 2. Depth and band per section

**Depth** = your points in that section out of 19, shown as 0 to 100
(rounded). Each section then gets a **band**:

| Band | Points (of 19) | Depth | What it means |
|---|---|---|---|
| none | 0 | 0 | nothing admitted here |
| low | 1 to 4 | 5 to 21 | at most the mild statements |
| mid | 5 to 10 | 26 to 53 | into the medium statements |
| high | 11 or more | 58 to 100 | only possible with at least one extreme statement |

The last line matters: levels 1 to 7 together are worth only 10 points, so a
section can only reach "high" if you admitted at least one extreme statement.

## 3. The type: the first rule that matches wins

1. **Merged** (PLUG-IN): you admitted **42 or more** of the 50 (purity 16 or
   lower), **or every one of the five sections is in the high band**. Either
   way no single section can describe you. (Someone who reached the heavy end
   of all five is not "a little of everything", so they are not Balanced.)
2. **Soulmate** (PLUS-1, hidden): you admitted **all three** statements marked
   `soulmate` (told a chatbot big news first, felt hurt when a new chat forgot
   you, said goodnight and meant it). Nothing else is needed: those three are
   the whole definition.
3. **Untouched** (ANALOG): you admitted **4 or fewer**, and **all of them mild**
   (levels 1 to 4). A single medium or extreme confession already points
   somewhere, so it is not "untouched".
4. **Balanced** (SAMPLER): no section leads. There are two ways in:
   - **an even spread**: at least 10 admitted, every section has at least one,
     and the deepest and shallowest sections are at most 4 points apart (22 on
     the depth scale); or
   - **a tie for the top**: three or more sections share the highest points
     exactly. Picking one of them would be arbitrary, so nobody gets a section
     type that way. Empty sections and small totals are fine here (say two
     mild answers in each of four sections).
5. **A section type**: otherwise your **leading section** decides it. The type is
   that section's **deep** type if the section is in the **high** band (11+
   points) **or you admitted at least two of its three extreme statements**
   (levels 8, 9, 10); else its **lite** type.

**Leading section** = the one with the most points. If exactly two are tied:
1. the one where you admitted the more extreme statement wins,
2. then the one with more statements admitted,
3. and only if the two are mirror images (same levels admitted), a fixed order
   that puts the more personal section first: Bond, Heart, Brain, Adulting,
   School.

A two-way tie is never hidden: the other section always shows as the secondary
type, its row is tagged "Tied", and the match line says which tie-break decided
(for example "School and Heart are dead level at 13 points each. School goes
first because its heaviest answer is heavier."). In the simulation, 3.9% of all
players are decided by the fixed order, and 3.9% by the heavier top statement.

Deep or lite depends only on the leading section, **not on your total**. A full
School section and nothing else is CRAMBOT even though it is only 10 of 50. On
the other hand, 22 mostly mild statements spread around are not "deep"
anything. Two extreme statements in the leading section are enough for deep by
themselves: someone who admitted the two or three heaviest things in a section
is the "deep" person even if they admitted little else there. So a lite type
holds at most one extreme statement of its section.

## 4. Secondary type (a runner-up leaning)

- **Section types**: the second-ranked section is named as a secondary type
  when its points are **at least three quarters** of the leading section's.
  A tied runner-up always qualifies. It gets its own lite or deep, judged by its
  own band. Otherwise there is no secondary type.
- **Soulmate**: the secondary is the type the answers point to when the
  soulmate rule is skipped (for example `bond_lite`, `heart_deep` or
  `balanced`). The three hidden statements still count as ordinary answers
  there, so the screen says "Skip the hidden rule and your answers point to
  ...", not "without those three statements".
- **Merged**: the secondary is `soulmate` if you also admitted the soulmate trio,
  otherwise none.
- **Untouched** and **Balanced**: never a secondary. By definition nothing
  leans.

## 5. Evidence (the answers the result screen quotes back)

Up to 3 statement ids you admitted, most extreme first:

- section types: the most extreme statements you admitted in the leading section;
- soulmate: the three soulmate statements;
- merged and balanced: the most extreme statement of each section, then the top
  three of those, so the quotes come from different sections;
- untouched: whatever little you admitted (possibly nothing). With 4 admitted
  only 3 are quoted, and the screen says "You admitted 4, all mild. Three of
  them:" instead of "Everything you admitted:".

When two quotes have the same level, the one from the higher-ranked section goes
first.

## 6. Match (0 to 100)

| Type | Match | In words |
|---|---|---|
| section types | lead points / (lead points + runner-up points) | "Heart beats your next section, School, 9 points to 8" = 53 |
| | capped at 60 when the lead section rests on one answer, 80 on two | "It rests on a single answer, though, so the match stops at 60%" |
| balanced | 100 minus the depth gap between the deepest and shallowest section you touched | 100 = every touched section weighs the same |
| merged | the average depth of your five sections | how far into everything you went |
| soulmate | always 100 | the type is all-or-nothing: you met all three conditions |
| untouched | your purity | 100 = admitted nothing |

For a section type the match runs from **50** (a dead heat with the next
section) to **100** (no other section touched, with at least three answers).
Only the top two sections are compared, so someone who admits a lot everywhere
is not punished for it. (An earlier version used "lead points / all points",
which gave a typical player about 38% and gave one single answer 100%.)
Simulated section-type results have a median match of 60, 10th percentile 52,
90th percentile 76 to 80. The cap touches 0.2% of players.

## 7. Checked against people: the personas

`tools/personas.js` holds 26 named players written as exact answers;
`tests/personas.test.js` pins each result. Statement ids: School s01-s10,
Adulting s11-s20, Heart s21-s30, Brain s31-s40, Bond s41-s50 (in each, the last
digit is the level, with 0 meaning 10).

| Persona | Admitted | Type | Secondary | Match | Evidence |
|---|---|---|---|---|---|
| Tried it twice (one reading summary, one tip) | 2 | untouched | - | 96 | s32 s01 |
| One mild thing per corner | 4 | untouched | - | 92 | s41 s21 s11 |
| One extreme confession ("asked AI what my own opinion was") | 1 | brain_lite | - | 60 | s40 |
| Study-only student | 9 | school_deep | - | 93 | s08 s07 s06 |
| Reading-summary skimmer | 5 | school_lite | - | 80 | s05 s02 s01 |
| Emails and applications | 7 | work_lite | - | 90 | s18 s16 s14 |
| Adulting on autopilot | 12 | work_deep | - | 95 | s20 s19 s18 |
| Texting a crush | 5 | heart_lite | - | 88 | s28 s25 s23 |
| Love life outsourced | 9 | heart_deep | - | 100 | s29 s28 s27 |
| Asks it everything, politely distant | 14 | brain_lite | - | 73 | s36 s35 s34 |
| Brain on remote | 14 | brain_deep | - | 95 | s40 s39 s38 |
| The polite one | 5 | bond_lite | - | 83 | s45 s44 s42 |
| Attached to it (stops short of the soulmate trio) | 9 | bond_deep | - | 93 | s48 s47 s46 |
| The Plus One | 6 | soulmate | bond_lite | 100 | s50 s30 s49 |
| Evenly moderate (3 mildest of every section) | 15 | balanced | - | 100 | s43 s23 s33 |
| Evenly heavy (levels 1-7 everywhere) | 35 | balanced | - | 100 | s47 s27 s37 |
| Heavy in two, equally (same points, School goes to level 9) | 16 | school_deep | heart_deep | 50 | s09 s07 s06 |
| Exam season with a crush | 13 | school_lite | heart_lite | 57 | s06 s05 s04 |
| Four sections, no feelings for it (four-way tie, Bond empty) | 12 | balanced | - | 100 | s23 s33 s13 |
| Everyday light user (two mild in four sections, one thank-you) | 9 | balanced | - | 95 | s22 s32 s12 |
| Dead heat, mirror image (levels 1-5 in School and Heart) | 10 | heart_lite | school_lite | 50 | s25 s24 s23 |
| Three heavy Brain confessions (s31, s38, s39, s40) | 4 | brain_lite | - | 100 | s40 s39 s38 |
| One medium worry (only s05) | 1 | school_lite | - | 60 | s05 |
| Deep everywhere (levels 1-8 in every section) | 40 | merged | - | 68 | s48 s28 s38 |
| Does everything | 50 | merged | soulmate | 100 | s50 s30 s40 |
| Nearly everything, drew the line at love | 45 | merged | - | 84 | s40 s20 s10 |

A few of these are worth a closer look:
- **One extreme confession** gets a lite type: it is not "untouched" (you
  confessed something real), but one statement cannot make anyone "deep", and
  one answer caps the match at 60.
- **Four sections, no feelings for it** and **Everyday light user** are
  balanced because four sections tie exactly. Before, the fixed order handed
  them HAHA-OK, which nothing in their answers supported.
- **Dead heat, mirror image** is the one case the fixed order still decides.
  The screen says it was a dead heat, tags both sections and shows TLDR as the
  other leaning, and the match is 50.
- **Three heavy Brain confessions** is lite with only 10 points, although all
  three extreme Brain statements are in it. The copy for lite types is written
  for exactly this: "you've admitted only part of that section".
- **One medium worry** (ANALOG needs all mild) is a known quirk: four mild
  School answers are ANALOG while this single medium one is TLDR. Its match is
  capped at 60, so the comparison does not look absurd.

## 8. Checked against a crowd: 200,000 simulated players

The simulation model, in plain words: each player has a "reach" in every section,
roughly the level up to which they say Guilty, and the chance of admitting a
statement falls smoothly once its level passes that reach. People differ in
overall intensity: the base reach follows a bell curve centred on level 3.5,
spread 2.5. 25% of players have no favourite section, 45% have one and 30% have
two; a favourite gets 2 to 6 extra levels. Each section also varies a little on
its own.

Result with the final rules (`node tools/simulate.js`, seed 20261113): average
20 admitted (purity 60); 30% of results carry a secondary type.

| Type | Share | Median match | Type | Share | Median match |
|---|---|---|---|---|---|
| untouched | 5.6% | 96 | heart_lite | 7.3% | 60 |
| merged | 3.0% | 81 | heart_deep | 9.1% | 59 |
| balanced | 11.5% | 84 | brain_lite | 7.1% | 60 |
| soulmate (hidden) | 0.4% | 100 | brain_deep | 8.9% | 59 |
| school_lite | 6.8% | 62 | bond_lite | 7.5% | 60 |
| school_deep | 8.4% | 61 | bond_deep | 9.1% | 59 |
| work_lite | 6.9% | 62 | | | |
| work_deep | 8.5% | 59 | | | |

No type is above 20% and none is below 2%, except the hidden soulmate type, which
is meant to be rare: it needs three extreme statements from two sections.
School types sit a little lower than Bond types because the fixed tie order
puts School last; that only affects exact mirror-image ties.

**How sensitive is this?** The 10 section types and Balanced stay between 5% and
12% under every variant tried (lighter players, heavier players, more or less
variety). Untouched and Merged move with how heavy the crowd is, as they should:
lighter players (`--mean=2.5`) give Untouched 10.7% and Merged 1.2%, heavier
players (`--mean=4.5`) give Untouched 2.5% and Merged 6.5%. The model is a
reasonable guess, not survey data. Once real players exist, their answers would
be a better check.

## 9. What changed from v1, and why

| v1 | v2 | Why |
|---|---|---|
| Every statement counted 1 | mild 1, medium 2, extreme 3 | The extreme statements say far more about a person. |
| Leading section = most statements | = highest weighted depth; ties go to the more extreme statement | "Asked AI what I think" should outweigh three tip questions. |
| Deep if total ≥ 20 | Deep if the leading section is in the high band (11+ points) or two of its extreme statements were admitted | 20 mild statements spread around is not "deep"; a full School section alone is. |
| Untouched: total ≤ 3 | ≤ 4 and all mild | One extreme confession contradicts the Analog profile. |
| Balanced: counts within 1 | ≥ 10 admitted, every section touched, depths within 4 points | 1,1,1,1,0 is not "well-rounded"; it is barely anything. |
| Soulmate beat merged | Merged wins; soulmate shown as secondary | If you said Guilty to nearly everything, "Accessory" describes you best, and PLUS-1 still shows. |
| Merged: total ≥ 42 | ≥ 42 | 45 made Merged about 1% of players; 42 (purity 16 or lower) is still "nearly everything". |

And from v2 to v3 (this version), after two reviews of whether results make sense:

| v2 | v3 | Why |
|---|---|---|
| Match = lead points / all points | = lead / (lead + runner-up), capped at 60 / 80 for one / two answers | The old number was about 38% for a typical player, lowest for heavy players, and 100% for one answer. |
| Three or more sections tied: fixed order picks one | Balanced | Picking Heart out of a four-way tie is arbitrary, and the screen said "Heart weighs the most". |
| Even heavy players with all five sections deep could be Balanced | All five high = Merged | "A little of everything" was false for them. |
| Card bars = statement counts | Card bars = weight (depth in tenths) | Six mild School answers drew a longer bar than three extreme Heart ones on a HAHA-OK card. |

## 10. Notes for whoever writes the type copy

The profile has to stay true for **everyone** who can get the type:
- **Lite types** can come from a single statement anywhere in the section, even
  an extreme one (persona "One extreme confession"). Lite copy should describe
  the section, not claim specific mild statements ("you ask it about dinner").
- **Lite types** can also hold every extreme statement of their section (levels
  8-10 plus one mild = 10 points, one short of deep). Write about breadth
  ("only part of the section"), never "not the heavy ones yet".
- **Deep types** always include at least one extreme statement from that
  section and at least 11 of its 19 points, which can be as few as 4
  statements (for example levels 5, 8, 9, 10).
- **The lead can be a two-way tie.** Say "nothing outweighs X" or "X is your
  heaviest section", never "X outweighs everything else".
- **Untouched** players may have admitted up to 4 mild statements. Don't claim
  they "pick their own dinner" or "write their own emails" outright.
- **Balanced** players either spread 10 or more answers evenly over all five
  sections (from 2 mild per section up to levels 1 to 7 everywhere), or have
  three or more sections tied for the top, possibly with as few as 3 answers
  and some sections empty. Write about evenness, never about small amounts or
  "everywhere".
- **Soulmate** players may have admitted nothing except the three soulmate
  statements.
- **Merged** players admitted at least 42, or reached the heavy end of all five
  sections (as few as 20 admitted), and not necessarily the soulmate trio.

- **Signs** never restate a single quiz statement. The result screen quotes the
  player's own answers next to them, so a sign the player answered "Never" to
  reads as a mistake. Signs describe the habit behind the section instead.

The result screen can always point at `evidenceIds`, which are the player's own
answers, so the profile doesn't have to guess.

---

# 结果是怎么判出来的（中文）

这一页对应 `scoring.js` 的规则，不看代码也能看懂。规则在 `tests/` 里有测试，
用 `node tools/simulate.js` 拿“人”来检验。要改规则，就改 `scoring.js` 顶部
`RULES` 里的数字，再跑一遍测试和模拟，最后把这一页也更新掉。

每条有三个答案：干过、没干过、不确定。**不确定和没干过完全一样算**：只有“干过”
会交给 `score()`，所以选不确定不扣纯度、不算分，也不会被当成证物引用（结果页只
说一句一共有几条）。

## 1. 每条陈述都有等级和分量

五个部分（学业、正经事、感情、脑子、羁绊）各 10 条，从最轻（第 1 级）排到
最重（第 10 级）。等级就是这条在 `content.js` 里、在本部分里排第几。

| 等级 | 类别 | 分量 |
|---|---|---|
| 1–4 | 轻度：几乎人人都干过 | 1 分 |
| 5–7 | 中度 | 2 分 |
| 8–10 | 重度 | 3 分 |

一个部分满分 4 + 6 + 9 = **19 分**。加权的意思是：“问 AI 我自己怎么看”
比“让 AI 算小费”更能说明问题。

## 2. 每个部分的深度和档位

**深度** = 这一部分的得分 ÷ 19，换成 0–100（四舍五入）。再分成四**档**：

| 档位 | 得分（满分 19） | 深度 | 含义 |
|---|---|---|---|
| none | 0 | 0 | 这部分一条没认 |
| low | 1–4 | 5–21 | 最多只认了轻度的几条 |
| mid | 5–10 | 26–53 | 认到了中度 |
| high | 11 及以上 | 58–100 | 至少认了一条重度才可能到这一档 |

最后一行很关键：第 1 到第 7 级全认也只有 10 分，所以想进 high，至少得认一条重度的。

## 3. 类型：按顺序判，先满足哪条就是哪条

1. **人形外设**（PLUG-IN）：50 条里认了 **42 条及以上**（纯度 16 及以下），**或者五个部分全在 high 档**。
   两种情况都说明，单拿哪一块都概括不了你。（五块都认到重的那头的人，不能叫“哪儿都沾一点”，所以不算雨露均沾。）
2. **电子家属**（PLUS-1，隐藏款）：三条带 `soulmate` 标记的**全认了**：出了大事先告诉 AI、
   新对话不记得自己会受伤、跟 AI 说晚安是认真的。别的都不看，这三条就是全部条件。
3. **原装人类**（ANALOG）：认了 **4 条及以下**，而且**全是轻度**（1–4 级）。
   哪怕只认了一条中度或重度，也已经有方向了，不算原装。
4. **雨露均沾**（SAMPLER）：没有哪块领头。有两条路：
   - **分得匀**：认了至少 10 条，五个部分都有，最深和最浅的部分相差不超过 4 分（深度上 22）；
   - **并列第一**：三个及以上的部分分数完全一样，并列最高。从里面随便挑一个都不讲理，
     所以这种情况不给部分类型。这里允许有空着的部分，总数也可以很少（比如四个部分各认两条轻度）。
5. **部分类型**：以上都不是，就看**领头的部分**。领头部分在 **high** 档（11 分及以上），
   **或者认了这一部分三条重度（8–10 级）里的至少两条**，就是它的 **deep** 类型，否则是 **lite** 类型。

**领头部分** = 分数最高的那个。恰好两个打平时：
1. 认过更重那一条的部分胜出；
2. 还平，认的条数多的胜出；
3. 两块完全是镜像（认的等级一模一样），才按固定顺序：更私人的排前面，即羁绊、感情、脑子、正经事、学业。

两块打平从不藏着：另一块一定作为副类型显示，它那一行标「并列」，匹配度那句话会说清是怎么分出先后的
（比如“学业和感情打平，都是 13 分。学业排前面，因为它最重的那条更重。”）。模拟里，3.9% 的玩家
靠固定顺序决定，3.9% 靠“最重那条更重”决定。

deep 还是 lite **只看领头部分，不看总数**。学业 10 条全认、别的一条没认，照样是
CRAMBOT（虽然总共才 10 条）。反过来，22 条大多是轻度、东一条西一条，不会被叫成任何 deep。
lite 类型甚至可以包含这一部分全部三条重度（8、9、10 级再加一条轻度 = 10 分，差 1 分到 deep），
所以 lite 的文案讲的是“只认了一部分”，而不是“还没碰重的”。

## 4. 副类型（第二倾向）

- **部分类型**：排第二的部分，分数达到领头部分的**四分之三**，就作为副类型显示（打平的一定算），
  lite 还是 deep 按它自己的档位定；不到四分之三就没有副类型。
- **电子家属**：副类型是“不按隐藏规则算，你的答案指向什么”（比如 `bond_lite`、
  `heart_deep`、`balanced`）。那三条在这里仍然当普通答案计分，所以页面上写的是
  “不按隐藏规则算，你的答案指向……”，而不是“不算那三条”。
- **人形外设**：要是那三条 soulmate 也全认了，副类型就是电子家属，否则没有。
- **原装人类**和**雨露均沾**：没有副类型，按定义就没有偏向。

## 5. 证据（结果页引用的原话）

最多 3 条你认过的陈述，重的排前面：

- 部分类型：领头部分里你认过的最重的几条；
- 电子家属：那三条 soulmate；
- 人形外设、雨露均沾：每个部分取你认过的最重的一条，再从中挑最重的三条，保证来自不同部分；
- 原装人类：你认过的那几条，一条没认就是空的。认了 4 条时只列 3 条，页面会写
  “你认了 4 条，全是轻度的，挑三条看看”，而不是“你认的全部就这些”。

等级相同时，来自排名更靠前的部分的那条排前面。

## 6. 匹配度（0–100）

| 类型 | 匹配度 | 说人话 |
|---|---|---|
| 部分类型 | 领头部分得分 ÷（领头部分得分 + 第二名得分） | “感情以 9 比 8 分压过了排第二的学业” = 53 |
| | 领头部分只靠一条撑着最多 60，两条最多 80 | “不过只靠一条撑着，匹配度最多算 60%” |
| 雨露均沾 | 100 减去你碰过的部分里最深与最浅的深度差 | 100 = 碰过的每块一样重 |
| 人形外设 | 五个部分的平均深度 | 你在所有方面认得有多深 |
| 电子家属 | 固定 100 | 要么三条全中要么不是，没有中间态 |
| 原装人类 | 等于纯度 | 100 = 一条没认 |

部分类型的匹配度在 **50**（和第二名打平）到 **100**（别的部分都没碰，且至少三条）之间。
只比前两名，所以哪儿都认很多的人不会因此吃亏。（旧版用“领头得分 ÷ 全部得分”，
普通玩家只有 38% 左右，只认一条的反而 100%。）模拟里部分类型的匹配度中位数 60，
第 10 百分位 52，第 90 百分位 76–80；上限只影响 0.2% 的玩家。

## 7. 拿人来检验：人设表

`tools/personas.js` 里写了 26 个具体的人（每人认了哪几条都写死了），
`tests/personas.test.js` 把每个人的结果钉住。人设表见上面英文部分第 7 节，结论一致：

- 只用 AI 学习的，是 CRAMBOT；只拿来改邮件、写申请的，是 NOTED；
- 只拿来跟暗恋对象发消息的，是 HAHA-OK；连分手都去问 AI 的，是 CC-BOT；
- 给 AI 起外号、用别家 AI 会心虚的，是 MY-BOT；三条 soulmate 全中的，是 PLUS-1；
- 只试过两次的，是原装人类；每部分都认了差不多的量，是雨露均沾；全认了，是人形外设；
- 只认了一条重度（“问 AI 我自己怎么看”）的，是 IDK：认了真东西所以不算原装，
  但一条不足以叫 deep；
- 两个部分一样重的，主类型给认过更重那一条的部分，另一个作为副类型显示；
- 四个部分完全一样（不管羁绊空不空）的，是雨露均沾：从四个并列里挑一个都不讲理；
- 只有“完全镜像”的两块（学业和感情都认了 1–5 级）还靠固定顺序决定，页面会直说打平了，
  两块都标出来，副倾向显示另一个，匹配度 50；
- 只认了脑子最狠的三条加一条轻度的，是 IDK（lite）：只有 10 分，差 1 分到 deep，
  lite 的文案正是“只认了其中一部分”；
- 五个部分都认到 1–8 级（40 条）的，是人形外设，因为五块全在 high 档。

## 8. 拿一大群人来检验：20 万个模拟玩家

模型（大白话）：每个玩家在每个部分有一个“到哪一级为止会认”的界线，等级越过这条线，
认的概率就平滑地往下掉。每个人整体有多“重”不一样：界线大致呈钟形分布，中心在
3.5 级，离散程度 2.5。25% 的人没有偏爱的部分，45% 有一个，30% 有两个；偏爱的
部分界线再往上加 2–6 级。每个部分自己还有一点随机波动。

最终规则下的结果（种子 20261113）：平均认 20 条（纯度 60），30% 的结果带副类型。

| 类型 | 占比 | 匹配度中位数 | 类型 | 占比 | 匹配度中位数 |
|---|---|---|---|---|---|
| 原装人类 untouched | 5.6% | 96 | heart_lite | 7.3% | 60 |
| 人形外设 merged | 3.0% | 81 | heart_deep | 9.1% | 59 |
| 雨露均沾 balanced | 11.5% | 84 | brain_lite | 7.1% | 60 |
| 电子家属 soulmate（隐藏） | 0.4% | 100 | brain_deep | 8.9% | 59 |
| school_lite | 6.8% | 62 | bond_lite | 7.5% | 60 |
| school_deep | 8.4% | 61 | bond_deep | 9.1% | 59 |
| work_lite | 6.9% | 62 | | | |
| work_deep | 8.5% | 59 | | | |

没有哪个类型超过 20%，也没有低于 2% 的。唯一的例外是隐藏款电子家属，它本来就该稀有，
因为要在两个部分各认重度的条目，一共三条。学业类型比羁绊类型略少一点，是因为固定顺序把学业排在最后，
这只影响完全镜像的打平。

**换个模型会怎样？** 10 个部分类型加雨露均沾，在所有试过的变体里（人整体更轻、更重、
差异更大或更小）都稳定在 5%–12%。原装人类和人形外设会跟着人群的轻重变，这很正常：
人整体偏轻（`--mean=2.5`）时原装人类 10.7%、人形外设 1.2%；偏重（`--mean=4.5`）时
原装人类 2.5%、人形外设 6.5%。这个模型是合理的猜测，不是调查数据，等有了真实玩家的
答案，拿它再校一遍更靠谱。

## 9. 跟 v1 比改了什么、为什么

| v1 | v2 | 原因 |
|---|---|---|
| 每条都算 1 | 轻 1、中 2、重 3 | 重度的那几条更能说明一个人 |
| 领头部分 = 认的条数最多 | = 加权深度最高；打平时看谁认过更重的 | “问 AI 我怎么想”该比三次算小费分量重 |
| 总数 ≥ 20 就是 deep | 领头部分进 high 档（11 分以上），或者认了其中两条重度，才是 deep | 东一条西一条凑够 20 条不该叫 deep；只把学业全认了反而该是 |
| 原装：总数 ≤ 3 | ≤ 4 且全是轻度 | 认了一条重度还叫“出厂设置”，说不过去 |
| 均沾：各部分条数相差 ≤ 1 | ≥ 10 条、五部分都有、深度相差 ≤ 4 分 | 1,1,1,1,0 算不上雨露均沾，几乎什么都没认 |
| 电子家属优先于人形外设 | 人形外设优先，电子家属作为副类型 | 几乎全认的人，“人形外设”最贴切，PLUS-1 照样会显示 |
| 人形外设：≥ 45 | ≥ 42 | 45 只有约 1% 的人能到；42（纯度 16 及以下）仍然是“几乎全认” |

从 v2 到 v3（这一版），起因是两轮“结果讲不讲得通”的审查：

| v2 | v3 | 原因 |
|---|---|---|
| 匹配度 = 领头得分 ÷ 全部得分 | = 领头 ÷（领头 + 第二名），一条最多 60、两条最多 80 | 旧数字普通玩家只有 38% 左右，认得越多越低，只认一条反而 100% |
| 三块以上并列：固定顺序挑一个 | 雨露均沾 | 从四块并列里挑出感情是随便挑的，页面还说“感情最重” |
| 五块都很深的人也可能是雨露均沾 | 五块全在 high 档 = 人形外设 | “哪儿都沾一点”对他们不成立 |
| 卡片长条 = 认的条数 | 卡片长条 = 分量（深度的十分之几） | 6 条轻度学业会比 3 条重度感情画得更长，可卡片上写的是 HAHA-OK |

## 10. 写类型文案的人请注意

文案要对**所有**可能拿到这个类型的人都成立：
- **lite 类型**可能只靠一条拿到，而且这一条可能是重度的（见人设“一条重度坦白”）。
  文案要说这一部分整体，别断言对方干过哪条轻度的事（比如“晚饭都问 AI”）。
- **lite 类型**最多只认了这一部分的一条重度。认了两条重度就是 deep，哪怕别的几乎没认。
- **deep 类型**一定认过这一部分里至少一条重度：要么拿到 19 分里的至少 11 分，
  要么认了两条以上重度，最少可能只有 2 条（比如 9、10 级）。
- **领头部分可能是两块打平**。写“没有哪块比 X 重”或“X 是你最重的一块”，别写“X 压过了其他所有部分”。
- **原装人类**最多认过 4 条轻度，别把“自己决定晚饭”“自己写邮件”说死。
- **雨露均沾**要么是 10 条以上匀匀地分在五个部分（从每部分 2 条轻度到每部分 1–7 级全认），
  要么是三块以上并列第一，可能总共只有 3 条，还可能有部分空着。写“匀”，别写“少”或“哪儿都有”。
- **电子家属**可能除了那三条什么都没认。
- **人形外设**认了至少 42 条，或者五块都认到了重的那头（最少可能只有 20 条），不一定包括那三条 soulmate。

- **signs（三条迹象）**不要照搬任何一条题目。结果页会把玩家自己的原话放在旁边，
  一条玩家答了“没干过”的迹象会显得算错了。迹象写这一部分背后的习惯。

结果页随时可以拿 `evidenceIds` 引用玩家自己的原话，文案不需要去猜。
