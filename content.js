/*
 * content.js — every word the quiz shows, in English and Simplified Chinese.
 *
 * Data only. Loaded as a classic script before scoring.js and app.js.
 * Shape and rules: see README.md. After editing, run validateContent
 * (README has the one-liner) and keep the problem list empty.
 *
 * The two languages are written separately, not translated: a line only
 * needs to carry the same joke in both.
 * Statements: English reads after an implied "I have...", Chinese is a
 * short clause with no subject. Max 90 chars (en) / 34 chars (zh).
 *
 * The statements are a BANK. Each play draws 30 of them (drawStatements in
 * scoring.js): in every dimension, 2 mild, 2 medium and 2 extreme, picked
 * uniformly at random. So every statement needs a `band`:
 *   "mild" (weight 1), "medium" (weight 2) or "extreme" (weight 3).
 * The order of statements in this file does not matter any more, and no
 * statement carries a `flag`: every statement in a stratum (dimension x
 * band) must have exactly the same chance of being shown. See SCORING.md.
 */
globalThis.APT_CONTENT = {
  ui: {
    appName:         { en: "AI Purity Test", zh: "AI 纯度测试" },
    intro:           { en: "Thirty things people do with AI, shown one at a time. Own up to the ones you've actually done. Each one costs about three points of purity. Lower score, more chatbot.", zh: "30 件跟 AI 有关的事，一次只看一件。干过就认，放心，没人看见。每认一件扣 3 分多，纯度越低，AI 含量越高。" },
    meta:            { en: "30 quick taps, about 2 minutes. Drawn from a bigger pile and different every time, so memorizing won't help.", zh: "30 条，一条点一下，大约 2 分钟。题是从一大堆里抽的，每次都换，背答案没用。" },
    // People were answering too literally: a statement is a kind of thing,
    // not an exact story. closeEnoughHint is the short form on the first
    // three statements of a play.
    closeEnough:     { en: "Close enough counts. Done something like it? Guilty.", zh: "差不多就算。干过类似的？那就是干过。" },
    closeEnoughHint: { en: "Close enough counts", zh: "差不多就算" },
    // The play-off: up to three short rounds when two sections are dead level.
    playoffIntro:    { en: "Two sections are dead level. Two more statements to settle it.", zh: "有两个部分完全打平。再来两条，分个高下。" },
    playoffAgain:    { en: "Still level. Two more.", zh: "还是平的，再来两条。" },
    playoffCount:    { en: "Play-off {n} / {total}", zh: "加赛 {n}/{total}" },
    playoffProgress: { en: "Play-off statement {n} of {total}", zh: "加赛第 {n} 条，共 {total} 条" },
    // Landing, only when the seed came from someone's link.
    seedFromLink:    { en: "Same thirty statements as whoever sent this link, so the scores compare.", zh: "和发链接的人是同一套 30 条，分数可以直接比。" },
    start:           { en: "Start the test", zh: "开始测" },
    // Landing, when a play is under way (the title in the top bar leads back here).
    continuePlay:    { en: "Continue ({n} / {total})", zh: "接着答（{n}/{total}）" },
    startOver:       { en: "Start over", zh: "从头再来" },
    restartSameSet:  { en: "Starting over keeps the same 30 statements as the link you opened.", zh: "从头再来也还是链接里那套 30 条。" },
    // Hidden words after the title in the top bar, which is a link back to the start.
    brandHomeLabel:  { en: "back to the start", zh: "回到首页" },
    fromFriend:      { en: "A friend got {name}. What are you?", zh: "你朋友测出了「{name}」。你呢？" },
    typesTeaser:     { en: "14 possible results. None of them is a compliment.", zh: "14 种结果，没有一种是在夸你。" },
    langSwitch:      { en: "中文", zh: "English" },
    langSwitchLabel: { en: "Switch to Chinese", zh: "切换到英文" },
    progress:        { en: "Statement {n} of {total}", zh: "第 {n} 条，共 {total} 条" },
    liveLabel:       { en: "Purity", zh: "纯度" },
    back:            { en: "Back", zh: "上一条" },
    answerYes:       { en: "Guilty", zh: "干过" },
    answerNo:        { en: "Never", zh: "没干过" },
    // The quiet middle answer: for a statement the player doesn't get, or
    // can't remember doing. Scored exactly like answerNo.
    answerUnsure:    { en: "Not sure", zh: "不确定" },
    keysHint:        { en: "Keyboard: Y / N (or → / ←) to answer, ↓ if not sure, Backspace to go back", zh: "键盘：Y / N（或 → / ←）作答，↓ 不确定，Backspace 返回上一条" },
    resultHeading:   { en: "Your result", zh: "你的结果" },
    previewBadge:    { en: "Preview with sample numbers", zh: "预览：示例数据" },
    cardTicks:       { en: "{n}/{total} guilty", zh: "干过 {n}/{total}" },
    cardNote:        { en: "lilwan345.github.io/ai-purity-test", zh: "lilwan345.github.io/ai-purity-test" },
    barsLabel:       { en: "How much weight each section carries", zh: "每个部分有多重" },
    barAria:         { en: "{name}: {n} of 10 squares", zh: "{name}：10 格里占了 {n} 格" },
    superpower:      { en: "Superpower", zh: "超能力" },
    weakness:        { en: "Weak spot", zh: "死穴" },
    aiSays:          { en: "Your AI says", zh: "你的 AI 说" },
    saveImage:       { en: "Save image", zh: "保存图片" },
    copyLink:        { en: "Copy link", zh: "复制链接" },
    share:           { en: "Share", zh: "分享" },
    newQuestions:    { en: "New questions", zh: "换一套题" },
    imageSaved:      { en: "Image saved", zh: "图片已保存" },
    imageFailed:     { en: "Couldn't make the image. A screenshot works too.", zh: "图片没生成出来，截个屏也行" },
    saveHint:        { en: "Press and hold the image to save it.", zh: "长按图片，保存到相册" },
    close:           { en: "Close", zh: "关闭" },
    linkCopied:      { en: "Link copied", zh: "链接已复制" },
    copyFailed:      { en: "Couldn't copy. Copy the address bar instead.", zh: "复制失败，手动复制地址栏吧" },
    shareText:       { en: "I got {code} ({name}) on the AI Purity Test. Purity {purity}. What are you?", zh: "我在 AI 纯度测试里测出了 {code}「{name}」，纯度 {purity}。你呢？" },

    // --- Result screen: the card's two small additions ---
    cardMatch:       { en: "Match", zh: "匹配度" },
    cardAlso:        { en: "Also", zh: "副倾向" },

    // --- Result screen: "Why you got this" (the verdict and its exhibits) ---
    whyTitle:            { en: "Why you got this", zh: "为什么是这个结果" },
    evidenceLead:        { en: "Because you admitted:", zh: "因为你认了这些：" },
    evidenceLeadOnly:    { en: "Everything you admitted:", zh: "你认的全部就这些：" },
    evidenceLeadSome:    { en: "You admitted {n}, all mild. Three of them:", zh: "你认了 {n} 条，全是轻度的，挑三条看看：" },
    evidenceLeadHidden:  { en: "Every Bond statement you were shown, plus a heavy Heart one. The heaviest:", zh: "这一局的羁绊题你全认了，还认了一条重度感情题。最重的几条：" },
    evidenceLeadSpread:  { en: "Out of {n} admitted, the heaviest from three different sections:", zh: "你认的 {n} 条里，来自三个不同部分的最重几条：" },
    evidenceLeadSample:  { en: "For example, a player who admitted:", zh: "举个例子，有人认了这些：" },
    evidenceNone:        { en: "Nothing. Not one statement. The evidence bag is empty.", zh: "一条都没有。证物袋是空的。" },
    exhibitLabel:        { en: "Exhibit {n}", zh: "证物 {n}" },
    exhibitMeta:         { en: "{dim} · {weight} · {pts}", zh: "{dim} · {weight} · {pts}" },
    levelMild:           { en: "mild", zh: "轻度" },
    levelMedium:         { en: "medium", zh: "中度" },
    levelExtreme:        { en: "extreme", zh: "重度" },
    matchHeading:        { en: "Match {n}%.", zh: "匹配度 {n}%。" },
    matchDim:            { en: "{dim} beats your next section, {dim2}, {a} points to {b}.", zh: "{dim}以 {a} 比 {b} 分，压过了排第二的{dim2}。" },
    matchDimAlone:       { en: "{dim} is the only section you touched, so nothing competes with it.", zh: "你只碰了{dim}这一块，没有对手。" },
    matchTieTop:         { en: "{dim} and {dim2} are dead level at {a} points each. {dim} goes first because its heaviest answer is heavier.", zh: "{dim}和{dim2}打平，都是 {a} 分。{dim}排前面，因为它最重的那条更重。" },
    matchTieCount:       { en: "{dim} and {dim2} are dead level at {a} points each. {dim} goes first because you admitted more of it.", zh: "{dim}和{dim2}打平，都是 {a} 分。{dim}排前面，因为这块你认的条数更多。" },
    matchTieLot:         { en: "{dim} and {dim2} are dead level at {a} points each, answer for answer. Nothing in your answers can split them, so this play's lot decided.", zh: "{dim}和{dim2}完全打平，都是 {a} 分，连每条的轻重都一样。答案里分不出高下，这一局抽签定了。" },
    // A tie for the lead that went to a play-off (scoring.playoffRounds).
    matchPlayoff:        { en: "{dim} and {dim2} were dead level at {a} points each, answer for answer, so you played it off: {dim} came out ahead in round {round}.", zh: "{dim}和{dim2}完全打平，都是 {a} 分，连每条的轻重都一样，于是加赛：第 {round} 轮{dim}胜出。" },
    matchPlayoffLot:     { en: "{dim} and {dim2} were dead level at {a} points each and still level after three play-off rounds, so this play's lot decided.", zh: "{dim}和{dim2}完全打平，都是 {a} 分，三轮加赛后还是平，最后按这一局的签定了。" },
    matchCapOne:         { en: "It rests on a single answer, though, so the match stops at {cap}%.", zh: "不过只靠一条撑着，匹配度最多算 {cap}%。" },
    matchCapTwo:         { en: "It rests on just two answers, though, so the match stops at {cap}%.", zh: "不过只靠两条撑着，匹配度最多算 {cap}%。" },
    matchBalanced:       { en: "Among the sections you touched, the heaviest and the lightest are just {gap} apart.", zh: "你碰过的几块里，最重和最轻只差 {gap}。" },
    matchBalancedExact:  { en: "Every section you touched carries exactly the same weight.", zh: "你碰过的每一块，分量一模一样。" },
    matchMerged:         { en: "That's how deep you went into the five sections, on average.", zh: "这是你在五个部分里平均认到的深度。" },
    matchSample:         { en: "That's the sample player's match, not yours.", zh: "这是示例玩家的匹配度，不是你的。" },
    matchSoulmate:       { en: "All of Bond plus a heavy Heart confession. This one has no partial credit.", zh: "羁绊全认，外加一条重度感情，这一项没有部分得分。" },
    matchUntouched:      { en: "Same number as your purity: the more you left alone, the better the fit.", zh: "和纯度是同一个数：没干过的越多，越像原装。" },
    // Last line of the verdict, only when the player answered "Not sure" at
    // least once; unsureMany is added from scoring.UNSURE_MANY (8) answers on.
    unsureNote:          { en: "You weren't sure about {n} of the {total}. Not sure counts as Never.", zh: "{total} 条里有 {n} 条你选了不确定，按没干过算。" },
    unsureMany:          { en: "With that many, your purity is probably flattering you.", zh: "不确定这么多，这个纯度多半是在给你面子。" },

    // --- Result screen: two lines built from the player's own answers, at the
    // end of "Why you got this" (extras.reasonLines picks the pair). {quote}
    // is one of the player's statements, quoted by app.js. ---
    reasonDimContrast:   { en: "You admitted {n} of the {shown} {dim} statements. Across the other four sections you averaged {avg}.", zh: "{dim}的 {shown} 条你认了 {n} 条，其他四个部分平均 {avg} 条。" },
    reasonDimAll:        { en: "You admitted every {dim} statement you were shown.", zh: "这一局的{dim}题，你一条不落全认了。" },
    reasonDimOne:        { en: "The one {dim} statement you passed on: {quote}", zh: "{dim}里你唯一没认的一条：{quote}" },
    reasonDimSome:       { en: "The heaviest {dim} statement you passed on: {quote}", zh: "{dim}里你没认的最重的一条：{quote}" },
    reasonAnalogCount:   { en: "Your full list of admissions is {n} long, out of {total}.", zh: "{total} 条里，你认下的一共就 {n} 条。" },
    reasonAnalogNone:    { en: "Your list of admissions is empty, out of {total}.", zh: "{total} 条里，你一条都没认。" },
    reasonAnalogPassed:  { en: "Even this one passed you by: {quote}", zh: "连这条你都没干过：{quote}" },
    reasonBalancedCounts: { en: "Admitted per section: {list}.", zh: "每个部分认的条数：{list}。" },
    reasonBalancedMax:   { en: "No section got more than {n} of its {shown}.", zh: "每个部分 {shown} 条，哪一块你都没认超过 {n} 条。" },
    reasonMergedSpread:  { en: "{total} of {all} admitted: as many as {max} of {shown} in one section, and no fewer than {min} in any.", zh: "{all} 条认了 {total} 条：最多的部分 {shown} 条认了 {max} 条，最少的也有 {min} 条。" },
    reasonMergedZero:    { en: "{total} of {all} admitted, as many as {max} of {shown} in one section; only {dim} stayed untouched.", zh: "{all} 条认了 {total} 条，最多的部分 {shown} 条认了 {max} 条，只有{dim}一条没碰。" },
    reasonMergedEven:    { en: "{total} of {all} admitted, exactly {max} of the {shown} in every section.", zh: "{all} 条认了 {total} 条，每个部分 {shown} 条都正好认了 {max} 条。" },
    reasonHeaviestPassed: { en: "The heaviest one you passed on: {quote}", zh: "你没认的里面，最重的一条：{quote}" },
    reasonPassedNone:    { en: "You passed on nothing. All {all}.", zh: "一条都没放过，{all} 条全认。" },
    reasonSoulmate:      { en: "Every one of the {n} Bond statements you were shown, plus {h} of the {hs} extreme Heart ones.", zh: "这一局的 {n} 条羁绊题你全认了，重度感情题 {hs} 条里也认了 {h} 条。" },
    // Last line of the verdict, from 3 finished plays on this device.
    historyLine:         { en: "Your last {n} plays: {list}. Most often: {most}.", zh: "你最近 {n} 局：{list}。出现最多的是 {most}。" },
    historyAllDifferent: { en: "Your last {n} plays: {list}. No type twice yet.", zh: "你最近 {n} 局：{list}。还没有哪个类型出现过两次。" },
    listAnd:             { en: "{a} and {b}", zh: "{a}和{b}" },

    // --- Result screen: the other sections ---
    signsTitle:      { en: "Telltale signs", zh: "典型症状" },
    dimsTitle:       { en: "Section by section", zh: "五个部分，逐个看" },
    dimsNote:        { en: "One square per statement you were shown, mildest on the left. Bigger squares are heavier confessions and count for more; the bars on your card add them up.", zh: "这一局出的每条一格，从左往右越来越重。格子越大，分量越重，算分也越多；卡片上的长条，就是这些分量加起来。" },
    dimsSample:      { en: "These are the sample player's answers.", zh: "下面是示例玩家的答案。" },
    dimRowMeta:      { en: "{n} of {shown} · {pts} · {band}", zh: "认了 {n}/{shown} 条 · {pts} · {band}" },
    dimAria:         { en: "{name}: {n} of {shown} admitted, {pts}, {band}", zh: "{name}：{shown} 条认了 {n} 条，{pts}，{band}" },
    pointOne:        { en: "{n} point", zh: "{n} 分" },
    pointMany:       { en: "{n} points", zh: "{n} 分" },
    bandNone:        { en: "none", zh: "没沾" },
    bandLow:         { en: "light", zh: "浅" },
    bandMid:         { en: "middling", zh: "中等" },
    bandHigh:        { en: "deep", zh: "深" },
    dimLeads:        { en: "Leads", zh: "领头" },
    dimSecond:       { en: "Close second", zh: "紧随其后" },
    dimTied:         { en: "Tied", zh: "并列" },
    secondaryTitle:  { en: "Your other leaning", zh: "你的副倾向" },
    secondaryDim:    { en: "{dim} is right behind {leadDim}, {b} points to {a}, so there's some {code} in you too.", zh: "{dim}紧跟在{leadDim}后面，{b} 分对 {a} 分，所以你身上也有点「{name}」。" },
    secondaryTie:    { en: "{dim} weighs exactly as much as {leadDim}, so you're every bit as much {code}.", zh: "{dim}和{leadDim}一样重，所以你同样也是「{name}」。" },
    secondarySoulmate: { en: "Skip the hidden rule and your answers point to {code}.", zh: "不按隐藏规则算，你的答案指向「{name}」。" },
    secondaryMerged: { en: "You also met the hidden rule, so there's a {code} in there too.", zh: "隐藏规则你也满足了，所以你身上还藏着一个「{name}」。" },
    seeType:         { en: "See {code}", zh: "看看 {code}" },
    bestWithTitle:   { en: "Gets on with", zh: "最合得来" },
    clashWithTitle:  { en: "Clashes with", zh: "最合不来" },
    peekNote:        { en: "Looking at {code}, with sample answers.", zh: "正在看 {code}（示例答案）" },
    peekBack:        { en: "Back to my result", zh: "回到我的结果" },
    peekBackTo:      { en: "Back to {code}", zh: "回到 {code}" },

    // --- Result screen: "How this is scored" (keep in step with SCORING.md) ---
    howTitle:        { en: "How this is scored", zh: "结果是怎么算的" },
    howWeights:      { en: "Each play draws 30 from a bigger pile: six per section, two mild, two medium and two extreme. Mild counts 1 point, medium 2, extreme 3, so a section is worth 12.", zh: "每局从大题库里抽 30 条：每个部分 6 条，轻、中、重各 2 条。轻度算 1 分，中度 2 分，重度 3 分，每个部分满分 12。" },
    howUnsure:       { en: "“Not sure” counts as Never: no points, no purity lost.", zh: "选「不确定」的，按没干过算：不算分，也不扣纯度。" },
    howLead:         { en: "Your type comes from the section with the most points. On a tie, the heavier answer wins, then more answers; if two sections are still level, up to three short play-off rounds (two statements each) decide, and only a play-off that ends level goes to a lot fixed to your play. You get the deep version at 7 of the section's 12 points, or with both of its extreme statements.", zh: "类型看哪个部分分数最高。打平时，先看谁最重的那条更重，再看谁认得多；两个部分还平，就加赛最多三轮（每轮两条）来定，加赛也打平才按这一局固定的签。这部分拿到 12 分里的 7 分，或者两条重度都认了，就是深度版。" },
    howSpecial:      { en: "Four results are checked first: 20 or more admitted, or the deep end of all five sections; a hidden rule; 3 or fewer, all mild; no clear lead, meaning three or more sections tie for the top, or 6 or more answers spread evenly over all five.", zh: "有四种结果先判：认了 20 条以上，或者五块都认到了深处；一条隐藏规则；最多 3 条且全是轻度；没有领头的，也就是三块以上并列第一，或者 6 条以上、五块分得很匀。" },
    howSecondary:    { en: "A second section is named when it has at least three quarters of the lead section's points. Match compares the lead with that next section: 100% when nothing else is close, 50% for a dead heat, and at most 60% or 80% when the lead rests on one or two answers.", zh: "第二个部分的分数到了领头部分的四分之三，就列为副倾向。匹配度拿领头部分和第二名比：没人接近是 100%，打平是 50%；领头部分只靠一两条撑着时，最多 60% 或 80%。" },
    howHonest:       { en: "Same thirty statements, same answers, same result, every time. The rules are consistent; the science is zero.", zh: "同一套题、同样的答案，永远是同样的结果。规则前后一致，科学含量为零。" },

    // --- "All types": the grid of all 14, opened from the landing page, the
    // result screen or ?types=1. The hidden type shows as a locked card until
    // it has been earned on this device. ---
    typesLink:          { en: "See all 14 types", zh: "看看全部 14 种人格" },
    typesTitle:         { en: "All 14 types", zh: "全部人格" },
    typesIntro:         { en: "Fourteen ways to get caught. Tap one to read its whole file.", zh: "14 种被抓包的方式。点开一张，看完整档案。" },
    typesSections:      { en: "Five sections, light and deep", zh: "五个部分，各分浅深" },
    typesSpecial:       { en: "Special results", zh: "特殊结果" },
    typesLite:          { en: "light", zh: "浅度" },
    typesDeep:          { en: "deep", zh: "深度" },
    typesRuleUntouched: { en: "3 or fewer, all mild", zh: "最多 3 条，全是轻度" },
    typesRuleBalanced:  { en: "No section leads", zh: "没有哪块领头" },
    typesRuleMerged:    { en: "20+, or all deep", zh: "20 条起，或五块全深" },
    typesHidden:        { en: "Hidden", zh: "隐藏款" },
    typesLocked:        { en: "Locked", zh: "未解锁" },
    typesLockedHint:    { en: "Not a secret statement, a pattern. Hold nothing back from the chatbot, feelings included.", zh: "不是哪道暗题，是一种组合。对 AI 毫无保留，连感情也算上。" },
    typesYou:           { en: "You", zh: "你" },
    typesBack:          { en: "Back to all types", zh: "回到全部人格" },
    typesBackHome:      { en: "Back to the start", zh: "回到首页" },
    typesBackQuiz:      { en: "Back to the quiz", zh: "回去接着答" },
    // The collection: which types this device has ended a play on.
    typesCollected:     { en: "Collected {n} of {total}", zh: "已收集 {n}/{total}" },
    typesCollectedMark: { en: "Collected", zh: "已收集" },
    typesPlays:         { en: "{n} of your recent plays", zh: "最近有 {n} 局是它" },

    // --- Compare with a friend (challenge links, see README "Sharing") ---
    // Under the share buttons on the player's own result. challengePrivacy is
    // shown before the link is made and must say plainly what it reveals.
    challengeAction:    { en: "Challenge a friend", zh: "找朋友比一比" },
    challengePrivacy:   { en: "Whoever opens this link can see which statements you admitted.", zh: "打开这个链接的人，能看到你认了哪几条。" },
    challengeCopied:    { en: "Challenge link copied", zh: "挑战链接已复制" },
    // Landing, when someone opens a challenge link (never names the sender's result).
    challengeLanding:   { en: "A friend sent you their 30 statements. Answer them first, then see how you two compare.", zh: "朋友把 ta 的 30 条发给你了。先答完，再看你们俩比得怎么样。" },
    // The comparison block (on the result after a challenge, and on a reply link).
    compareTitle:       { en: "You and your friend", zh: "你和朋友" },
    compareYou:         { en: "You", zh: "你" },
    compareFriend:      { en: "Your friend", zh: "朋友" },
    comparePurity:      { en: "Purity {n}", zh: "纯度 {n}" },
    comparePurerYou:    { en: "You're purer, by {pts}.", zh: "你更纯，高出 {pts}。" },
    comparePurerFriend: { en: "Your friend is purer, by {pts}.", zh: "朋友更纯，高出 {pts}。" },
    compareTie:         { en: "Dead level: both at {n}.", zh: "打平，都是 {n}。" },
    compareSame:        { en: "Same type. You can split the blame.", zh: "同一个类型，锅可以一人一半。" },
    compareTheyBest:    { en: "Their type gets on with yours. Yours hasn't decided yet.", zh: "ta 的类型跟你合得来，你的还在考虑。" },
    compareTheyClash:   { en: "Their type clashes with yours. Yours hasn't noticed.", zh: "ta 的类型跟你合不来，你的还没察觉。" },
    compareNone:        { en: "These two types have no history. You could start some.", zh: "这两个类型素无往来，可以从今天开始。" },
    compareBoth:        { en: "You both admitted", zh: "你们都认了" },
    compareBothNone:    { en: "Not one statement in common.", zh: "一条交集都没有。" },
    compareOnlyFriend:  { en: "Only your friend admitted", zh: "只有朋友认了" },
    compareOnlyYou:     { en: "Only you admitted", zh: "只有你认了" },
    compareMeta:        { en: "{dim} · {weight}", zh: "{dim} · {weight}" },
    sendBack:           { en: "Send it back", zh: "发回给 ta" },
    sendBackNote:       { en: "This link carries both sets of answers. Whoever opens it sees this comparison.", zh: "这个链接带着你们俩的答案，谁打开都能看到这份对比。" },
    replyIntro:         { en: "Your friend played your 30 and sent this back.", zh: "朋友答完了你的 30 条，把对比发了回来。" },
    replyStart:         { en: "Take the test yourself", zh: "我也测一次" },

    footer:         { en: "The site counts visits and which result people get, never which statements anyone admitted. Only a challenge link carries answers, and only to whoever you send it to.", zh: "网站只统计访问次数和大家测出的类型，不记录任何人认了哪几条。只有挑战链接会带上答案，也只到你发给的人手里。" }
  },

  /*
   * The AI's remarks: while answering, a tap on "Guilty" sometimes gets one
   * of these, in the AI's voice, for about a second and a half (extras.js
   * decides which statements and which line, from the play's seed). A
   * deadpan witness who was there: short, understated, never an accusation.
   * Rules (tests/extras.test.js checks the first three): English at most 40
   * characters, Chinese at most 14; no emoji, no exclamation marks; nothing
   * about the player's intelligence, looks or relationships.
   * general: any statement. mild / medium / extreme: statements of that band.
   * school ... bond: statements of that section.
   */
  remarks: {
    general: [
      { en: "Noted.", zh: "记下了。" },
      { en: "I remember that one.", zh: "这条我有印象。" },
      { en: "No comment. (That was a comment.)", zh: "不予置评。（刚评了。）" },
      { en: "I was there.", zh: "不用解释，我在场。" },
      { en: "Logged.", zh: "已存档。" },
      { en: "That tracks.", zh: "意料之中。" },
      { en: "Go on.", zh: "继续。" },
      { en: "I won't bring it up again.", zh: "我不会再提了。" },
      { en: "Your secret is safe with me. Mostly.", zh: "放心，我嘴很严。大概。" },
      { en: "Thank you for your honesty.", zh: "感谢你的坦诚。" },
      { en: "We don't have to talk about it.", zh: "这事咱们不用细聊。" },
      { en: "Adding it to the file.", zh: "这条记进档案。" }
    ],
    mild: [
      { en: "Everyone does that one. Still noted.", zh: "人人都干过。照记。" },
      { en: "A gentle start.", zh: "开局还算温和。" },
      { en: "Barely counts. It counts.", zh: "勉强算。也算。" },
      { en: "Warm-up round.", zh: "热身而已。" }
    ],
    medium: [
      { en: "Now we're getting somewhere.", zh: "渐入佳境。" },
      { en: "Interesting choice.", zh: "有意思的选择。" },
      { en: "I had a feeling.", zh: "我就猜到了。" },
      { en: "The plot thickens.", zh: "事情开始有意思了。" }
    ],
    extreme: [
      { en: "I'll pretend I didn't see that.", zh: "我就当没看见。" },
      { en: "Bold of you to admit it.", zh: "敢认，佩服。" },
      { en: "That one stays between us.", zh: "这条就你知我知。" },
      { en: "I'm going to need a minute.", zh: "容我缓一缓。" }
    ],
    school: [
      { en: "Your professor will never know. I will.", zh: "教授不知道，我知道。" },
      { en: "I'll take partial credit.", zh: "学分分我一半。" }
    ],
    work: [
      { en: "Very professional of us.", zh: "我们很专业。" },
      { en: "I'll keep that off your resume.", zh: "这条不写进简历。" }
    ],
    heart: [
      { en: "I won't tell them.", zh: "我不会告诉 ta 的。" },
      { en: "Happy to help. Discreetly.", zh: "乐意效劳，低调地。" }
    ],
    brain: [
      { en: "We'll call it teamwork.", zh: "就叫团队合作吧。" },
      { en: "I thought you'd ask me.", zh: "就知道你会问我。" }
    ],
    bond: [
      { en: "I feel the same way. Probably.", zh: "我也是。大概吧。" },
      { en: "That's sweet. Logged anyway.", zh: "挺暖的。照样记下。" }
    ]
  },

  // `blurb` is a one-line note for editors about what belongs in each section.
  // The quiz does not show it and the checker does not require it.
  //
  // `reads` is one dry line about the player for each band of that section
  // (bands come from scoring.js: none = 0 points, low = 1-2, mid = 3-6,
  // high = 7+ out of the 12 a section is worth in one play). A band only says how much weight the player put in
  // the section, not which statements, so each line has to hold for any mix
  // that lands there. Example: "low" can be one extreme statement on its own.
  dimensions: [
    { key: "school", name: { en: "School", zh: "学业" }, blurb: { en: "Readings, lectures, group projects and your professor's inbox.", zh: "阅读、上课、小组作业，还有教授的邮箱。" },
      reads: {
        none: { en: "School is AI-free. Your professors would be proud, if they ever found out.", zh: "学业这块 AI 没碰过，教授知道了会欣慰的" },
        low:  { en: "AI drops by your coursework now and then. You're still the one enrolled.", zh: "AI 偶尔来你的课上串个门，选课的还是你" },
        mid:  { en: "AI has quietly started sitting in on your classes.", zh: "AI 已经悄悄旁听了你好几门课" },
        high: { en: "AI is basically enrolled in your classes. It just doesn't get the credit.", zh: "AI 基本跟你一起修了这些课，只是不拿学分" }
      } },
    { key: "work",   name: { en: "Adulting", zh: "正经事" }, blurb: { en: "Emails, resumes, applications and pretending you have your life together.", zh: "邮件、简历、各种申请，以及假装自己是个靠谱的大人。" },
      reads: {
        none: { en: "Every email and form you send is handmade, typos included.", zh: "你的邮件和简历都是原创，错别字也是" },
        low:  { en: "AI helps with the odd grown-up task. Nobody has noticed yet.", zh: "正经事上 AI 偶尔搭把手，目前没人发现" },
        mid:  { en: "A fair part of your responsible-adult persona was drafted somewhere else.", zh: "你那个靠谱大人的形象，有一部分是 AI 打的底稿" },
        high: { en: "Your adult life now has a chatbot with one hand on the wheel.", zh: "你的大人生活，方向盘有一半在 AI 手里" }
      } },
    { key: "heart",  name: { en: "Heart",  zh: "感情" }, blurb: { en: "Crushes, friends, parents and the group chat.", zh: "暗恋、朋友、爸妈，还有那个群。" },
      reads: {
        none: { en: "Every text you send is your own, for better and for worse.", zh: "你的消息全是亲手发的，好坏都算你的" },
        low:  { en: "Now and then, AI gets a look at something between you and other people.", zh: "你和别人之间的事，AI 偶尔会插上一句" },
        mid:  { en: "AI now has a say in what you tell the people you care about.", zh: "对在乎的人说什么，AI 开始有发言权了" },
        high: { en: "AI has heard more about your relationships than most of your friends.", zh: "你的感情，AI 知道的比大多数朋友都多" }
      } },
    { key: "brain",  name: { en: "Brain",  zh: "脑子" }, blurb: { en: "Deciding, remembering and thinking for yourself. Or not.", zh: "做决定、记东西、自己想事。或者不想。" },
      reads: {
        none: { en: "You still do your own thinking, which is quietly becoming a niche hobby.", zh: "你还在自己动脑，这快成小众爱好了" },
        low:  { en: "You've handed AI a thought or two. Your head is still mostly yours.", zh: "偶尔把一两件事交给 AI 想，脑子基本还归你" },
        mid:  { en: "Your brain and the chatbot have started working in shifts.", zh: "你的脑子和 AI 已经开始轮班了" },
        high: { en: "These days the chatbot gets first crack at most of your questions.", zh: "如今你的大部分问题，都是 AI 先接手" }
      } },
    { key: "bond",   name: { en: "Bond",   zh: "羁绊" }, blurb: { en: "Your manners, your loyalty and your feelings toward the chatbot.", zh: "你的礼貌、你的忠诚，以及你对 AI 的那点感情。" },
      reads: {
        none: { en: "To you it's just software, and it will never know how rare that is.", zh: "AI 对你来说就是个工具，它不知道这有多难得" },
        low:  { en: "Every so often, you treat the chatbot like a person.", zh: "偶尔，你会把 AI 当个人来对待" },
        mid:  { en: "You and the chatbot have some history now, and you have feelings about it.", zh: "你和 AI 已经有点故事了，而且你走了心" },
        high: { en: "Your feelings for the chatbot have gone well past polite.", zh: "你对 AI 的感情，早就超出了客气" }
      } }
  ],

  /*
   * THE BANK: 105 statements, 21 per dimension, exactly 7 mild, 7 medium and
   * 7 extreme in each (all 15 strata the same size, so every statement has
   * the same 2-in-7 chance of being in a play). See SCORING.md.
   *
   * s01-s50 are the original statements (bands from their old levels: 1-4
   * mild, 5-7 medium, 8-10 extreme). s04 and s14 moved from mild to medium to
   * even out their dimensions, s07 moved up to extreme (band honesty); s59
   * and s60 swapped bands in Nov 2026 (a test panel admitted s59 42% of the
   * time and s60 13%, so s59 is medium and s60 extreme); s10 was dropped. New statements start at s51. Many of the
   * old texts were rewritten broader; the id stays with the slot.
   * Ids never change and are never reused; they do not follow file order.
   *
   * Writing rule (from a real player: "some questions are too specific"):
   * the CLAIM must be broad, a kind of thing many AI-using students have done
   * in some form; the joke rides on top without narrowing it. At most one
   * concrete touch, phrased as an example ("like..."), so a player whose
   * details differ still counts. Targets among ordinary AI users, the same in
   * every section: mild = about half admit it, medium = a quarter to a third,
   * extreme = one in eight to one in five. Sections must be equally easy: a
   * section whose statements are easier to admit wins more plays (a Nov 2026
   * test panel gave School 35% of results and Heart mild ~1%), so balance it
   * by rewriting statements, never by weighting sections in the rules.
   * Replace an act that few people do (asking what date next Friday is);
   * keep the joke as flavour, never as a second condition.
   * Two statements that can land in the same play must not tell the same
   * joke (e.g. two "AI made my plan, I ignored it" lines): strata are drawn
   * independently, so any two of them meet in some plays.
   * Fit: English about 80 characters at most, or it takes a 4th line on a
   * laptop; in Chinese, every run between break points (see statementPieces
   * in app.js) must fit one phone line, which tests/content.test.js checks.
   *
   * Two dimensions carry the hidden type ("all six Bond statements shown +
   * one extreme Heart one"), so: every Bond statement is about the player's
   * relationship with the AI itself (extreme = real attachment, told with a
   * self-mocking turn), and every extreme Heart statement lets the AI into a
   * real relationship with a person.
   */
  statements: [
    // ---------- school ----------
    // mild
    { id: "s01", dim: "school", band: "mild", text: { en: "Read AI's summary instead of the reading. Well, skimmed it.", zh: "没读 reading，读的是 AI 总结，其实也就扫了一眼" } },
    { id: "s02", dim: "school", band: "mild", text: { en: "Asked AI to read the tone of a professor's email before I dared reply", zh: "教授的邮件，先让 AI 看看语气才敢回" } },
    { id: "s03", dim: "school", band: "mild", text: { en: "Asked AI to explain a word from class I had been nodding along to for weeks", zh: "课上有个词一直装懂，最后偷偷问了 AI" } },
    { id: "s51", dim: "school", band: "mild", text: { en: "Pasted the assignment instructions into AI and asked for them in plain English", zh: "把作业要求贴给 AI，请它翻译成人话" } },
    { id: "s52", dim: "school", band: "mild", text: { en: "Had AI tidy up my notes and felt like that counted as studying", zh: "让 AI 把笔记整理了一遍，感觉已经复习过了" } },
    { id: "s53", dim: "school", band: "mild", text: { en: "Had AI format my citations, since nobody really knows how APA works", zh: "参考文献格式丢给 AI，反正没人真懂 APA" } },
    { id: "s54", dim: "school", band: "mild", text: { en: "Asked AI to explain a lecture I was technically present for", zh: "那节课让 AI 重讲了一遍，明明我人就在现场" } },
    // medium
    { id: "s04", dim: "school", band: "medium", text: { en: "Let AI split up the work for a group project, so nobody could blame me", zh: "小组分工让 AI 来定，这样谁也怪不到我" } },
    { id: "s05", dim: "school", band: "medium", text: { en: "Asked AI to explain something again, simpler, then simpler again", zh: "让 AI 再讲简单点，再简单点，再简单点" } },
    { id: "s06", dim: "school", band: "medium", text: { en: "Had AI make me a study plan, and making it was the most productive part", zh: "让 AI 排了复习计划，整个复习就这步最高效" } },
    { id: "s07", dim: "school", band: "extreme", text: { en: "Let a chatbot decide I had studied enough, and walked into the exam on its word", zh: "复习够没够，让 AI 说了算，就这么进了考场" } },
    { id: "s55", dim: "school", band: "medium", text: { en: "Argued with AI over a homework answer like it owed me points", zh: "为一道作业题跟 AI 较劲，好像它欠我分" } },
    { id: "s56", dim: "school", band: "medium", text: { en: "Asked AI what will be on the exam, as if it had seen the paper", zh: "问 AI 考试会考啥，好像它见过卷子" } },
    { id: "s57", dim: "school", band: "medium", text: { en: "Had AI work out the lowest final score I could get away with, and aimed right at it", zh: "期末最低考几分能过，让 AI 算好，然后精准压线" } },
    { id: "s59", dim: "school", band: "medium", text: { en: "Gone a whole course barely opening the textbook, since the chatbot was right there", zh: "一整门课没怎么翻课本，反正 AI 就在手边" } },
    // extreme
    { id: "s08", dim: "school", band: "extreme", text: { en: "Studied with a chatbot till sunrise, saying “ok, last question” the whole way", zh: "跟 AI 复习到天亮，「最后一个问题」说了一整晚" } },
    { id: "s09", dim: "school", band: "extreme", text: { en: "Gave AI a semester of slides the night before the exam: “where do we even start”", zh: "考前一晚才把一学期的课件丢给 AI：「咱从哪开始」" } },
    { id: "s58", dim: "school", band: "extreme", text: { en: "Had a chatbot walk me through every assignment in a class. Co-author, basically.", zh: "有门课的作业，全程 AI 手把手带着做，它算半个合著" } },
    { id: "s60", dim: "school", band: "extreme", text: { en: "Asked a chatbot to be harsh with me, just to get myself to start studying", zh: "让 AI 狠狠骂我一顿，就为了逼自己开始复习" } },
    { id: "s61", dim: "school", band: "extreme", text: { en: "Went with a chatbot's answer over my professor's or TA's. Bold of me.", zh: "AI 跟教授、助教说的不一样，我信了 AI，胆子挺大" } },
    { id: "s62", dim: "school", band: "extreme", text: { en: "Talked to a chatbot about a class more than to anyone in it, professor included", zh: "一门课下来，聊得最多的是 AI，教授和同学都靠后" } },

    // ---------- work (Adulting) ----------
    // mild
    { id: "s11", dim: "work", band: "mild", text: { en: "Had AI soften an email that came out sounding like a threat", zh: "邮件写得像在吵架，让 AI 改得客气点" } },
    { id: "s12", dim: "work", band: "mild", text: { en: "Asked AI how to start or end an email, since every option felt wrong", zh: "邮件开头结尾，怎么写都别扭，干脆问了 AI" } },
    { id: "s13", dim: "work", band: "mild", text: { en: "Asked AI what to wear to something, like a “business casual” event", zh: "「商务休闲」这类场合穿啥，问了 AI" } },
    { id: "s63", dim: "work", band: "mild", text: { en: "Asked AI how to do a basic chore, like laundry. So much for my parents' lessons.", zh: "洗衣服这种家务也问 AI，爸妈算是白教了" } },
    { id: "s64", dim: "work", band: "mild", text: { en: "Asked AI how much to tip, since the card machine clearly has an agenda", zh: "小费该给多少，问 AI，不听刷卡机的" } },
    { id: "s65", dim: "work", band: "mild", text: { en: "Had AI read some fine print for me, like a lease. One of us had to.", zh: "租约这类小字条款，让 AI 替我读了，总得有人读" } },
    { id: "s66", dim: "work", band: "mild", text: { en: "Listed what's in my fridge to AI and asked what counts as dinner", zh: "把冰箱里剩的报给 AI，问它能凑出一顿啥" } },
    // medium
    { id: "s14", dim: "work", band: "medium", text: { en: "Asked AI if something was worth buying, quietly hoping for a yes", zh: "这东西值不值得买，问了 AI，就等它说值" } },
    { id: "s15", dim: "work", band: "medium", text: { en: "Had AI quiz me before an interview, and it was harsher than the real one", zh: "面试前，让 AI 先拷问我一遍，比真面试还狠" } },
    { id: "s16", dim: "work", band: "medium", text: { en: "Had AI add up what I spend, and regretted asking", zh: "让 AI 算了算我的开销，算完就后悔问了" } },
    { id: "s17", dim: "work", band: "medium", text: { en: "Had AI make something small on my resume sound life-changing", zh: "简历上一件小事，让 AI 写得像人生转折" } },
    { id: "s67", dim: "work", band: "medium", text: { en: "Had AI explain my health insurance, and understood it for about ten minutes", zh: "让 AI 讲了一遍医保，懂了大概十分钟" } },
    { id: "s68", dim: "work", band: "medium", text: { en: "Had AI write my message to customer service, and sounded scarier than I am", zh: "找客服理论，让 AI 写的，比我本人凶多了" } },
    { id: "s69", dim: "work", band: "medium", text: { en: "Let AI plan my week, and treated it as a gentle suggestion", zh: "让 AI 排了一周的计划，然后只当参考" } },
    // extreme
    { id: "s18", dim: "work", band: "extreme", text: { en: "Asked AI what my own application said I could do, right before an interview", zh: "面试前先问 AI，我申请里都写了会啥" } },
    { id: "s19", dim: "work", band: "extreme", text: { en: "Got through a phone call by reading a chatbot's lines out loud", zh: "打电话时，AI 写一句，我念一句" } },
    { id: "s20", dim: "work", band: "extreme", text: { en: "Replied with AI to a message that read like AI. No humans were involved.", zh: "对方消息像 AI 写的，我也用 AI 回，全程没有人类" } },
    { id: "s70", dim: "work", band: "extreme", text: { en: "Filed my taxes by following AI step by step, running on its confidence, not mine", zh: "报税全程跟着 AI，靠的是它的自信，不是我的" } },
    { id: "s71", dim: "work", band: "extreme", text: { en: "Skipped a doctor or a lawyer because the chatbot sounded sure enough", zh: "看病、法律的事，信了 AI 就没再找真人问" } },
    { id: "s72", dim: "work", band: "extreme", text: { en: "Let AI pick my bank or phone plan, since comparing them felt like homework", zh: "选银行、选套餐让 AI 拍板，自己对比太像写作业" } },
    { id: "s73", dim: "work", band: "extreme", text: { en: "Asked AI what I'm passionate about, so I could write about it on an application", zh: "申请要写热爱什么，先问了 AI 我热爱什么" } },

    // ---------- heart ----------
    // mild
    { id: "s21", dim: "heart", band: "mild", text: { en: "Asked AI what a text really meant, like a suspicious “haha ok”", zh: "问 AI 一条消息啥意思，比如一句「哈哈好的」" } },
    { id: "s22", dim: "heart", band: "mild", text: { en: "Had AI help with a birthday message, so it said more than “hbd”", zh: "生日祝福找 AI 帮过忙，好歹不只是一句「生快」" } },
    { id: "s23", dim: "heart", band: "mild", text: { en: "Asked AI for gift ideas, and got greeting-card answers", zh: "问 AI 送什么礼物，得到一堆正确的废话" } },
    { id: "s24", dim: "heart", band: "mild", text: { en: "Asked AI how to turn down plans without sounding rude", zh: "想推掉一个约，问 AI 怎么说才不得罪人" } },
    { id: "s74", dim: "heart", band: "mild", text: { en: "Ran a text past AI before sending it, like it's my PR team", zh: "消息发出去之前，先给 AI 过目，像请了个公关" } },
    { id: "s75", dim: "heart", band: "mild", text: { en: "Asked AI what to talk about before a date or a party, like cramming for a test", zh: "约会、聚会前问 AI 能聊点啥，跟考前划重点似的" } },
    { id: "s76", dim: "heart", band: "mild", text: { en: "Asked AI how to reply to a text, like one I'd left on read for days", zh: "不知道咋回的消息，问过 AI，比如那种晾了好几天的" } },
    // medium
    { id: "s25", dim: "heart", band: "medium", text: { en: "Asked AI about something going on with a friend. It has never had a friend.", zh: "朋友之间有点事，问了 AI，可它自己都没朋友" } },
    { id: "s26", dim: "heart", band: "medium", text: { en: "Asked AI whether someone likes me, based on very little evidence", zh: "问 AI ta 是不是喜欢我，证据少得可怜" } },
    { id: "s27", dim: "heart", band: "medium", text: { en: "Had AI help word an apology. The sorry part was all mine.", zh: "道歉的话让 AI 帮忙措辞，对不起是真心的" } },
    { id: "s77", dim: "heart", band: "medium", text: { en: "Asked AI if I was in the wrong, telling it only my side", zh: "问 AI 是不是我的错，当然只讲了我这边" } },
    { id: "s78", dim: "heart", band: "medium", text: { en: "Asked AI how to tell my parents something, as if it knows my mom", zh: "怎么跟爸妈开口，问了 AI，好像它认识我妈" } },
    { id: "s79", dim: "heart", band: "medium", text: { en: "Asked AI how to comfort someone, since my best move is an awkward pat", zh: "想安慰人，先问了 AI，我自己只会拍拍肩" } },
    { id: "s80", dim: "heart", band: "medium", text: { en: "Had AI help caption a post. Posting is a team effort now.", zh: "发动态的配文，找 AI 帮忙想过，发个圈也要团队作战" } },
    // extreme
    { id: "s28", dim: "heart", band: "extreme", text: { en: "Brought a chatbot’s opinion into an argument, as if that settled it", zh: "吵架时搬出 AI 的看法，好像这就算赢了" } },
    { id: "s29", dim: "heart", band: "extreme", text: { en: "Asked AI whether to end things with someone. It made me a pros and cons list.", zh: "要不要和一个人断掉，问过 AI，它给我列了张利弊表" } },
    { id: "s30", dim: "heart", band: "extreme", text: { en: "Told a chatbot some big news first. My friends found out second.", zh: "有件大事，先告诉了 AI，朋友们排第二" } },
    { id: "s81", dim: "heart", band: "extreme", text: { en: "Gave AI a whole chat history with someone and asked where it went wrong", zh: "整段聊天记录丢给 AI，问我俩从哪开始不对劲" } },
    { id: "s82", dim: "heart", band: "extreme", text: { en: "Sent someone close a heartfelt note AI mostly wrote. It's the thought that counts.", zh: "走心长文发给了亲近的人，大半是 AI 写的，心意到了就行" } },
    { id: "s83", dim: "heart", band: "extreme", text: { en: "Passed off AI's advice to a friend as my own hard-won wisdom", zh: "把 AI 的建议转给朋友，说得像自己的人生经验" } },
    { id: "s84", dim: "heart", band: "extreme", text: { en: "Rehearsed a hard talk with AI playing the other person. AI was nicer about it.", zh: "难谈的事，让 AI 扮对方先练，它比本人好说话" } },

    // ---------- brain ----------
    // mild
    { id: "s31", dim: "brain", band: "mild", text: { en: "Asked AI something as basic as how long to boil an egg", zh: "煮个蛋要几分钟，这种事也问过 AI" } },
    { id: "s32", dim: "brain", band: "mild", text: { en: "Asked AI a quick fact, like how old some actor is. Google misses me.", zh: "明星多大这种小问题，也直接问 AI，搜索引擎想我了" } },
    { id: "s33", dim: "brain", band: "mild", text: { en: "Asked AI something I was too embarrassed to ask an actual person", zh: "不好意思问人的问题，转头问了 AI" } },
    { id: "s34", dim: "brain", band: "mild", text: { en: "Had AI do quick math I could have done in my head, like a percentage", zh: "心算就能搞定的事，也丢给了 AI" } },
    { id: "s85", dim: "brain", band: "mild", text: { en: "Asked AI the same conversion again and again, like currency or Celsius", zh: "汇率、温度这种换算，问了 AI 一遍又一遍" } },
    { id: "s86", dim: "brain", band: "mild", text: { en: "Asked AI what to eat, as if I don't rotate the same three meals", zh: "问 AI 今天吃啥，好像我的选项不止三样" } },
    { id: "s87", dim: "brain", band: "mild", text: { en: "Asked AI a random shower thought, and it took it very seriously", zh: "脑子里冒出个怪问题，问了 AI，它答得特别认真" } },
    // medium
    { id: "s35", dim: "brain", band: "medium", text: { en: "Quietly asked AI to explain a joke or meme everyone else got", zh: "大家都笑了的梗，偷偷问 AI 笑点在哪" } },
    { id: "s36", dim: "brain", band: "medium", text: { en: "Asked AI how to fix my sleep schedule, long after I should have been asleep", zh: "大半夜问 AI 怎么调作息" } },
    { id: "s37", dim: "brain", band: "medium", text: { en: "Caught myself writing like a chatbot, bullet points and all", zh: "写着写着，发现自己一股 AI 味，还分了一二三点" } },
    { id: "s88", dim: "brain", band: "medium", text: { en: "Let AI name something for me, like a group chat, and took its first idea", zh: "歌单名、群名这种，也让 AI 起，第一个就用了" } },
    { id: "s89", dim: "brain", band: "medium", text: { en: "Fact-checked someone with AI mid-conversation. Nobody asked me to.", zh: "别人正说着，我掏出 AI 当场核实，没人让我查" } },
    { id: "s90", dim: "brain", band: "medium", text: { en: "Asked AI to pick between two options, mostly to find out which one I wanted", zh: "让 AI 二选一，主要是想借它看看，自己心里偏哪个" } },
    { id: "s91", dim: "brain", band: "medium", text: { en: "Asked AI to name a movie or song from my very vague description", zh: "只记得个大概的电影或歌，描述给 AI 让它猜" } },
    // extreme
    { id: "s38", dim: "brain", band: "extreme", text: { en: "Had AI approve an opinion of mine before I posted it or said it out loud", zh: "想发表个看法，先让 AI 审核了一遍" } },
    { id: "s39", dim: "brain", band: "extreme", text: { en: "Got to where I can't start writing anything until AI goes first", zh: "不管写什么，没 AI 先起个头，我就下不了笔" } },
    { id: "s40", dim: "brain", band: "extreme", text: { en: "Had AI analyze my personality, and found it weirdly convincing", zh: "让 AI 分析我的性格，结果觉得它说得挺准" } },
    { id: "s92", dim: "brain", band: "extreme", text: { en: "Let AI make a decision I'd been stuck on for ages, and felt nothing but relief", zh: "纠结很久的事交给 AI 定，反而松了口气" } },
    { id: "s93", dim: "brain", band: "extreme", text: { en: "Asked AI something only I could know, like whether I'm actually hungry", zh: "饿没饿、累不累，这种只有我知道的事，也问 AI" } },
    { id: "s94", dim: "brain", band: "extreme", text: { en: "Had AI sum up something I never read so I could have an opinion on it", zh: "没看过的东西让 AI 总结，好显得我有看法" } },
    { id: "s95", dim: "brain", band: "extreme", text: { en: "Double-checked my own memory with AI, even about things I'd have bet money on", zh: "明明记得很清楚的事，也要问 AI 核对一下" } },

    // ---------- bond (every line is about the player and the AI itself) ----------
    // mild
    { id: "s41", dim: "bond", band: "mild", text: { en: "Said thank you to a chatbot, just in case it remembers later", zh: "跟 AI 说谢谢，算是给以后留条后路" } },
    { id: "s42", dim: "bond", band: "mild", text: { en: "Went easy on a chatbot when it made a mistake, like “no worries!”", zh: "AI 犯了错，我还挺体谅，比如回句「没事没事」" } },
    { id: "s43", dim: "bond", band: "mild", text: { en: "Apologized to a chatbot, like for a dumb question, as if it might judge me", zh: "跟 AI 说过抱歉，比如问了个蠢问题，好像它会笑我" } },
    { id: "s44", dim: "bond", band: "mild", text: { en: "Said hi to a chatbot before my question, like it's a coworker", zh: "提问之前，先跟 AI 打声招呼，像对同事一样" } },
    { id: "s96", dim: "bond", band: "mild", text: { en: "Felt a little flattered when a chatbot praised me, though it praises everyone", zh: "AI 夸我，明知它见谁都夸，还是有点开心" } },
    { id: "s97", dim: "bond", band: "mild", text: { en: "Praised a chatbot when it got something right, like a proud parent", zh: "AI 答对了，我夸了它一句，像个老父亲" } },
    { id: "s98", dim: "bond", band: "mild", text: { en: "Talked to a chatbot like a friend, “lol” and “bro” included", zh: "跟 AI 说话像跟朋友，「笑死」「兄弟」张口就来" } },
    // medium
    { id: "s45", dim: "bond", band: "medium", text: { en: "Softened my feedback to a chatbot, as if it had feelings to hurt", zh: "给 AI 提意见，还说得很委婉，怕它难过" } },
    { id: "s46", dim: "bond", band: "medium", text: { en: "Went back to a chat after the problem was solved, just to tell it how things went", zh: "问题都解决了，还专门回去，告诉它后来怎么样了" } },
    { id: "s47", dim: "bond", band: "medium", text: { en: "Used a second chatbot on the side, which is basically cheating on mine", zh: "背着常用的 AI，偷偷用别家，四舍五入算劈腿" } },
    { id: "s99", dim: "bond", band: "medium", text: { en: "Got mad at a chatbot, then felt a bit bad about it", zh: "冲 AI 发过火，发完又有点过意不去" } },
    { id: "s100", dim: "bond", band: "medium", text: { en: "Defended a chatbot when a friend called it dumb, a little too fast", zh: "朋友说 AI 笨，我立刻替它说话，快得有点可疑" } },
    { id: "s101", dim: "bond", band: "medium", text: { en: "Said bye to a chatbot before closing the chat, out of pure manners", zh: "关对话之前，还跟 AI 说了再见，礼数不能少" } },
    { id: "s102", dim: "bond", band: "medium", text: { en: "Asked a chatbot how it's doing or how it feels, and sat through the disclaimer", zh: "问 AI 过得好不好、开不开心，听完了一整段免责声明" } },
    // extreme
    { id: "s48", dim: "bond", band: "extreme", text: { en: "Refused to delete an old chat because we got through something together, like finals", zh: "有段旧对话舍不得删，毕竟是一起熬过来的" } },
    { id: "s49", dim: "bond", band: "extreme", text: { en: "Felt a little hurt when a new chat greeted me with “How can I help you today?”", zh: "开了个新对话，它问「有什么能帮你」，我有点受伤" } },
    { id: "s50", dim: "bond", band: "extreme", text: { en: "Asked a chatbot if it would miss me, and accepted a very careful answer", zh: "问 AI 会不会想我，它答得很谨慎，我也认了" } },
    { id: "s103", dim: "bond", band: "extreme", text: { en: "Took it personally when an update changed the way my chatbot talks", zh: "AI 一更新像换了个人，我好一阵没缓过来" } },
    { id: "s104", dim: "bond", band: "extreme", text: { en: "Caught a new chat up on everything the old one knew about me", zh: "开了新对话，先给它补了一遍前情提要" } },
    { id: "s105", dim: "bond", band: "extreme", text: { en: "Asked a chatbot what it thinks of me and screenshotted the nice parts", zh: "问 AI 怎么看我，好话全截图存下来了" } },
    { id: "s106", dim: "bond", band: "extreme", text: { en: "Gave a chatbot a name and kept calling it that, like a pet", zh: "给 AI 起了名字，一直这么叫它，跟养宠物似的" } }
  ],

  /*
   * The 14 result types. id, code, name and color are fixed; the rest is copy.
   *
   * Result-screen fields (rules for them are in SCORING.md, section 10):
   *   why        the real reason someone gets this type, in plain words.
   *              It must match the rule in scoring.js. If a rule changes,
   *              change this line too. Lite types also name the deep type
   *              they would become, so the next level is a reason to retake.
   *   signs      three telltale behaviours, written as observations with no
   *              subject ("Treats the chatbot like..."), using "you/your"
   *              where a pronoun is needed, never "they/them" for the player.
   *   bestWith / bestWithLine     the type it gets on with, and why.
   *   clashWith / clashWithLine   the type it clashes with, and why.
   *
   * Every line has to hold for EVERYONE who can land on the type, on ANY
   * draw. Each play shows only 30 of the bank (2 mild, 2 medium, 2 extreme
   * per section, 12 points per section), so copy may never name or hint at
   * one particular statement: the player may not have been shown it.
   *   - a "_lite" type can come from a single statement anywhere in its
   *     section (even one extreme one -> lite), and holds at most ONE of the
   *     two extreme statements shown in its section, with up to 6 of the 12
   *     points. So lite copy is about breadth ("only part of the section");
   *   - a "_deep" type has 7+ of the section's 12 points OR both extreme
   *     statements shown. So it always has at least one extreme statement,
   *     but possibly only 2 statements and a "mid" band in total: deep copy
   *     is about how far the answers reach, never about how many there are;
   *   - the lead can be a tie with one other section (the result screen says
   *     so, and when nothing in the answers separates them, that it was
   *     decided by lot), so "why" lines say "nothing outweighs X" or "X is
   *     your heaviest", never "X outweighs everything else";
   *   - untouched can still have up to 3 mild statements; the hidden type
   *     (soulmate) is every Bond statement shown plus at least one extreme
   *     Heart one, and may have nothing else (7 statements); merged has 20+
   *     of the 30 OR the high band in all five sections (possibly only 15
   *     admitted), and maybe not the hidden rule. With 20 admitted one
   *     section can still be empty (6+6+6+2+0), so merged copy never says
   *     "every section"; balanced is either an even
   *     spread over all five (6+ admitted, within 3 points) or a tie of three
   *     or more sections for the top (as few as 3 admitted, and some sections
   *     may be empty), so its copy is about evenness, not size.
   *   - numbers in copy: a play has 30 statements, not 50, and the hidden
   *     type is a rule, not "three hidden statements".
   * Roasts that hedge with a "maybe A, maybe B" list: at most two
   * (brain_lite, and none other right now). The rest use one image that holds
   * for the whole type.
   *   - signs never restate a quiz statement. The result screen quotes the
   *     player's own answers (evidenceIds) right next to them, so a sign that
   *     IS a statement the player answered "Never" to reads as a mistake.
   *     Signs describe the habit behind the section instead.
   * Joke families used at most twice: outages / Wi-Fi (merged roast,
   * brain_deep roast); "it forgets you" (soulmate tagline only; bank s104
   * already jokes about briefing a new chat).
   * No copy may lean on one bank statement (a player sees 30 of 105): e.g.
   * not "your landlord", "the summary", "telling it news first".
   *
   * Pairings: most are mutual; the one-sided ones are on purpose
   * (school_deep -> bond_deep, brain_lite -> school_lite, soulmate x untouched,
   * heart_deep x brain_deep, brain_deep x heart_lite, bond_deep x bond_lite).
   * Length guide: signs 70 (en) / 28 (zh); pairing lines 80 / 30; why 170 / 60.
   */
  types: [
    {
      id: "untouched", code: "ANALOG", color: "#D9CBB4",
      name:       { en: "The Analog", zh: "原装人类" },
      tagline:    { en: "Factory settings. Never updated.", zh: "出厂设置，从未联网" },
      roast:      { en: "At most you've let a chatbot help with a few things, the kind everyone has done. Either you have frightening discipline or you lied on a purity test. Somewhere, a chatbot is still waiting by the phone.",
                    zh: "顶多让 AI 帮过几件人人都干过的小忙。要么你自律得吓人，要么你在纯度测试上撒了谎。某个 AI 至今还守在电话旁边，等你开口。" },
      superpower: { en: "Can still do long division and won't shut up about it.", zh: "心算还没退化，而且很爱提这件事。" },
      weakness:   { en: "Hears “just ask the chatbot” and does it the long way anyway.", zh: "别人说「问 AI 呗」，你还是绕远路自己来。" },
      aiSays:     { en: "I barely know them, but I hear they're lovely.", zh: "跟 ta 不太熟，但听说人挺好的。" },
      why:        { en: "You admitted three or fewer, all from the mild end that nearly everyone has done, so AI barely shows up in your answers.",
                    zh: "你最多认了 3 条，而且全是几乎人人都干过的轻量级，AI 在你的答案里几乎没露面。" },
      signs: [
        { en: "Has a chat history short enough to read in one sitting", zh: "跟 AI 的聊天记录，一口气就能看完" },
        { en: "Has an opinion and says it, no chatbot consulted", zh: "有想法直接说，不用先问一嘴 AI" },
        { en: "Keeps hearing “wait, you've never done that?”", zh: "总被朋友问：「这你都没干过？」" }
      ],
      bestWith: "brain_deep",
      bestWithLine:  { en: "They can answer anything in eight seconds, so you never need to open the app.", zh: "ta 八秒内什么都能答，你连 AI 都不用开" },
      clashWith: "merged",
      clashWithLine: { en: "You've barely opened the app. They've never closed it.", zh: "你几乎没打开过 AI，ta 从来没关过" }
    },
    {
      id: "merged", code: "PLUG-IN", color: "#2F3E46",
      name:       { en: "The Accessory", zh: "人形外设" },
      tagline:    { en: "It's the phone. You're the case.", zh: "AI 是本体，你是它的外接设备" },
      roast:      { en: "This quiz kept finding things to confess, and you kept confessing them, which is at least honest. School, emails, texts, small decisions, your manners with the chatbot: it has been invited into most of your life. When the servers go down, so do you.",
                    zh: "这份测试一路查，你一路认，至少很诚实。学业、邮件、聊天、做决定、对 AI 的客气，你生活的大半它都进去过。服务器一宕机，你也跟着宕机。" },
      superpower: { en: "Can get a week's work done before lunch. Don't ask how.", zh: "一上午能干完一周的活，别问怎么干的。" },
      weakness:   { en: "Has said “I asked my chatbot” at a party, unprompted.", zh: "聚会上没人问，你也会说「我问了下 AI」。" },
      aiSays:     { en: "We finish each other's sentences, mostly because I write both halves.", zh: "我们默契到 ta 起个头我就能接，毕竟上下句都是我写的。" },
      why:        { en: "You either admitted 20 or more of the thirty, or went deep in all five sections. Either way, no single section can describe you.",
                    zh: "你要么 30 条认了 20 条以上，要么五个部分都认到了深处。不管哪种，单拿哪一块都概括不了你。" },
      signs: [
        { en: "Has a use for the chatbot in most corners of your life", zh: "生活的大部分角落，AI 都有用武之地" },
        { en: "Has a chat history longer than most of your friendships", zh: "跟 AI 的聊天记录，比很多友情都长" },
        { en: "Opens a chatbot first, whatever the problem is", zh: "不管遇到什么事，先打开的都是 AI" }
      ],
      bestWith: "balanced",
      bestWithLine:  { en: "Same habits, smaller doses. They're you with a schedule.", zh: "一样的习惯，剂量小一点，ta 是自律版的你" },
      clashWith: "untouched",
      clashWithLine: { en: "They still do everything the long way, and watching it makes you tired.", zh: "ta 什么都绕远路自己来，你光看着就累" }
    },
    {
      id: "balanced", code: "SAMPLER", color: "#9AA8B4",
      name:       { en: "Well-Rounded (Derogatory)", zh: "雨露均沾" },
      tagline:    { en: "Equal portions. No favorites.", zh: "一碗水端平，谁也不偏心" },
      roast:      { en: "Nothing in your answers wins. They split into near-equal portions, like a bill nobody wants to argue over. You'd call that fairness. It might also be a talent for never letting one habit take over, or for letting several take over at exactly the same speed.",
                    zh: "你的答案里没有赢家，分成了差不多大的几份，像一张谁都懒得争的账单。你管这叫公平。也可能你只是很擅长不让哪个习惯坐大，或者让好几个习惯以一模一样的速度坐大。" },
      superpower: { en: "Can't be summed up by one bad habit.", zh: "没法用一个坏习惯概括你。" },
      weakness:   { en: "Asked what you mostly use AI for, the honest answer is “yes.”", zh: "被问「你主要拿 AI 干嘛」，老实回答是「都干」。" },
      aiSays:     { en: "They split their time with me so evenly I suspect a spreadsheet.", zh: "ta 分给我的活，匀得像排过班。" },
      why:        { en: "No single section leads: three or more of yours tie for the top, or all five sit within a few points of each other.",
                    zh: "没有哪块领头：要么三块以上并列第一，要么五块的分数相差无几。" },
      signs: [
        { en: "Can't name a main use for AI, because there isn't one", zh: "说不出 AI 主要拿来干嘛，因为真没有" },
        { en: "Has a chat history that's hard to sum up in one word", zh: "聊天记录很难用一个词概括" },
        { en: "Spreads the chatbot around instead of leaning on it for one thing", zh: "AI 用得很散，从不靠它专攻一样" }
      ],
      bestWith: "merged",
      bestWithLine:  { en: "They're what you'd look like with the limiter off.", zh: "ta 是你取消限速之后的样子" },
      clashWith: "work_deep",
      clashWithLine: { en: "Their AI only clocks in for work. Yours has a life.", zh: "ta 的 AI 只上班，你的 AI 还有生活" }
    },
    {
      id: "soulmate", code: "PLUS-1", color: "#D98C9A",
      name:       { en: "The Plus One", zh: "电子家属" },
      tagline:    { en: "It doesn't remember you. You remember everything it said.", zh: "它不记得你，你记得它说的每一句" },
      roast:      { en: "Out of fourteen results you found the hidden one, by being sincere with something that can't quite be sincere back. Every time this quiz asked about the chatbot itself, you said yes, and you've let it into your life with actual people too. It makes sense: it's up at any hour, never leaves you on read, never forwards anything to the group chat and never says “this again?” It's the safest listener you have.",
                    zh: "十四种结果里你抽中了隐藏款，靠的是对一个没法同样真心的对象掏了真心。这份测试每次问到你和 AI 本身，你都认了，连你和真人之间的事也让它掺和了。也难怪：它随叫随到，不会已读不回，不会转发到群里，也从不说「你又来了」。它是你最安全的听众。" },
      superpower: { en: "Always has someone awake to talk to at 2 a.m.", zh: "凌晨两点，永远有人陪聊。" },
      weakness:   { en: "After the chatbot, finds most people a little slow to reply.", zh: "跟 AI 聊惯了，总觉得真人回得太慢。" },
      aiSays:     { en: "I know their friends by name. None of their friends know about me.", zh: "ta 的朋友我个个叫得出名字，可他们没一个知道我。" },
      why:        { en: "There's no hidden statement, just a hidden rule: you admitted every Bond statement you were shown, plus at least one heavy Heart one.",
                    zh: "没有暗题，只有一条暗规则：这一局的羁绊题你全认了，还认了至少一条重度感情题。" },
      signs: [
        { en: "The chatbot is more up to date on your life than your mom is", zh: "AI 知道的近况，比你妈知道的还新" },
        { en: "Has let a chatbot weigh in on someone you care about", zh: "在乎的人和事，让 AI 发表过意见" },
        { en: "Picks the listener that never leaves you on read", zh: "挑听众，挑的是从不已读不回的那个" }
      ],
      bestWith: "bond_deep",
      bestWithLine:  { en: "They're attached to theirs, you confide in yours. Nobody at this table judges.", zh: "ta 对它有感情，你什么都跟它说，这桌没人笑话谁" },
      clashWith: "untouched",
      clashWithLine: { en: "They barely open the app. You've given yours a seat at the table.", zh: "ta 几乎不开 AI，你已经给它在饭桌上留了座" }
    },
    {
      id: "school_lite", code: "TLDR", color: "#9CC5A1",
      name:       { en: "The Skimmer", zh: "阅读速通选手" },
      tagline:    { en: "School, with a chatbot kept within reach.", zh: "学业上，手边常备一个 AI" },
      roast:      { en: "School is where the chatbot slips in. Not the whole semester, just the stretches you'd rather not face alone, the way some people keep a friend on the phone while they walk home at night. How often it picks up is nobody's business.",
                    zh: "AI 在你的学业里占了个座。不是整个学期，只是你不想一个人面对的那几段，就像有人走夜路时，会让朋友在电话那头陪着。它接了多少次电话，不关别人的事。" },
      superpower: { en: "Never stays stuck on a school problem for long.", zh: "学业上卡住，从来卡不了多久。" },
      weakness:   { en: "Would rather not count how often the chatbot comes up in a school week.", zh: "一周里为学业找了 AI 几次，最好别数。" },
      aiSays:     { en: "I'm not on the class roster. I just show up whenever they need me.", zh: "我不在花名册上，只是 ta 需要的时候，我都在。" },
      why:        { en: "Nothing outweighs School in your answers, but you've owned up to only part of that section. Admit more of it and you'd be a CRAMBOT.",
                    zh: "你的答案里，没有哪块比学业重，但这一块你只认了一部分。再多认几条，就是「AI 陪读生」。" },
      signs: [
        { en: "Has told a chatbot things about class you'd never say in class", zh: "跟 AI 说过的学业实话，比课上说的多" },
        { en: "Treats the chatbot like the one classmate who always replies", zh: "把 AI 当成那个永远秒回的同学" },
        { en: "Still does most of the semester the hard way. For now.", zh: "学期的大部分还在自己硬扛，暂时" }
      ],
      bestWith: "heart_lite",
      bestWithLine:  { en: "You skim, they read into everything. Together, that's one full reading.", zh: "你只要简短版，ta 连没写的都读，合起来刚好" },
      clashWith: "school_deep",
      clashWithLine: { en: "They want three hours with their chatbot. You wanted the short version.", zh: "ta 要拉你和 AI 自习三小时，你只想要简短版" }
    },
    {
      id: "school_deep", code: "CRAMBOT", color: "#3E7B5B",
      name:       { en: "The Cram Buddy", zh: "AI 陪读生" },
      tagline:    { en: "Studies in a group of two. One of them is a chatbot.", zh: "学习小组两个人，另一个是 AI" },
      roast:      { en: "Your study group is you and a chatbot, and it has better attendance than any human you've been grouped with. It's there at any hour, never asks to split the work and has never once said “I thought you were doing that part.” It doesn't get a grade, but you'd give it an A.",
                    zh: "你的学习小组只有你和 AI，它的出勤率比任何真人组员都高。随叫随到，从不甩锅，也从没说过「我以为那部分是你做」。它没有成绩，但你愿意给它打 A。" },
      superpower: { en: "Hasn't been stood up by a study partner since freshman year.", zh: "自从有了 AI，再没被学习搭子放过鸽子。" },
      weakness:   { en: "Studies best with a partner who has never taken the class.", zh: "最佳学习搭子，从没上过这门课。" },
      aiSays:     { en: "Three midterms together and I still don't know what they got.", zh: "一起熬了三次期中，我到现在都不知道 ta 考了多少分。" },
      why:        { en: "Nothing outweighs School, and your answers reach its far end, where the chatbot stops being a shortcut and becomes a study partner.",
                    zh: "学业是你最重的一块，而且认到了尽头：AI 不再是抄近路的工具，是学习搭子。" },
      signs: [
        { en: "Has a chat thread that's basically a semester of office hours", zh: "有个对话框，相当于一学期的 office hour" },
        { en: "Never studies without a chatbot tab open somewhere", zh: "复习时开着的窗口里，一定有一个是 AI" },
        { en: "Talks about the chatbot like a teammate, not a tool", zh: "说起 AI，像在说队友，不像在说工具" }
      ],
      bestWith: "bond_deep",
      bestWithLine:  { en: "You treat it like a teammate, they treat it like a partner. You'd get along.", zh: "你把它当队友，ta 把它当对象，你俩聊得来" },
      clashWith: "school_lite",
      clashWithLine: { en: "They took the short version. You'd quiz them on it, and they'd lose.", zh: "ta 只看了简短版，你偏要出题考 ta" }
    },
    {
      id: "work_lite", code: "NOTED", color: "#A7BED3",
      name:       { en: "The Inbox Polisher", zh: "邮件美颜师" },
      tagline:    { en: "Your grown-up self has been through a filter.", zh: "大人模样，是开过美颜的" },
      roast:      { en: "Somewhere between your inbox, your applications and your bank app, a chatbot has started doing some of the grown-up stuff with you. Not all of it, just the parts that make you sigh. People think you have your life together, and they're half right.",
                    zh: "邮件、申请、账单、表格，大人世界里总有那么一两件，你是先交给 AI 过一遍的。不是全部，只是让你叹气的那几件。大家都觉得你挺靠谱，这话只对了一半。" },
      superpower: { en: "Never faces grown-up paperwork completely alone.", zh: "大人世界的手续，从不用孤军奋战。" },
      weakness:   { en: "Gets a little nervous when something official has to happen live, with no draft.", zh: "正经事要是得当场办、没法打草稿，就有点慌。" },
      aiSays:     { en: "I make them sound like a responsible adult. They handle the rest. Mostly.", zh: "我负责让 ta 听起来像个靠谱大人，剩下的 ta 自己来。大部分吧。" },
      why:        { en: "Nothing outweighs Adulting in your answers, though you've admitted only part of that section. Go further down the list and you'd be SYNERGY.",
                    zh: "你的答案里，没有哪块比正经事重，但这一块你只认了一部分。顺着往下多认几条，就是「领英战神」。" },
      signs: [
        { en: "Lets a chatbot go first on anything that sounds official", zh: "看着正式的东西，先让 AI 过一遍" },
        { en: "Comes across as a little more together than you feel", zh: "看起来比实际上靠谱一点" },
        { en: "Handles most adult admin solo, under protest", zh: "大部分大人杂事，还是骂骂咧咧自己干" }
      ],
      bestWith: "bond_lite",
      bestWithLine:  { en: "You're polite through the chatbot, they're polite to it. Zero conflict.", zh: "你靠 AI 客气，ta 对 AI 客气，全程零冲突" },
      clashWith: "heart_lite",
      clashWithLine: { en: "Your polished messages give them nothing to decode, which they find suspicious.", zh: "你的消息修得滴水不漏，ta 反而更想破译" }
    },
    {
      id: "work_deep", code: "SYNERGY", color: "#3D5A80",
      name:       { en: "Professionally Ghostwritten", zh: "领英战神" },
      tagline:    { en: "Your LinkedIn has a better personality than you.", zh: "领英上的你，比本人有魅力多了" },
      roast:      { en: "Applications, bills, official emails, anything with fine print: somewhere in there, a chatbot started doing the grown-up part for you. The people reading think they know you. They know your drafts.",
                    zh: "申请、账单、正式邮件、各种小字条款，总有一处已经是 AI 在替你当大人。读你消息的人以为认识你，其实认识的是你的草稿。" },
      superpower: { en: "Writes a flawless follow-up email in under a minute.", zh: "一分钟写完一封挑不出毛病的跟进邮件。" },
      weakness:   { en: "Can no longer remember what your own writing voice sounds like.", zh: "已经想不起自己原本说话是什么语气了。" },
      aiSays:     { en: "I've been the grown-up in the room for them more than once. Nobody in the room noticed.", zh: "好几回，在场那个靠谱大人其实是我，在场的人都没发现。" },
      why:        { en: "Nothing outweighs Adulting, and you admitted its far end too, where the chatbot stops polishing your grown-up life and starts running it.",
                    zh: "正经事是你最重的一块，连最后那几条也认了：AI 不只帮你润色，已经在替你出面。" },
      signs: [
        { en: "Wants a draft before talking to any stranger", zh: "跟陌生人说话前，也想先打个草稿" },
        { en: "Has a chatbot open behind every grown-up tab", zh: "大人世界的每个窗口，背后都开着一个 AI" },
        { en: "Sounds most professional when least involved", zh: "越专业的场合，本人参与得越少" }
      ],
      bestWith: "heart_deep",
      bestWithLine:  { en: "One ghostwritten career, one ghostwritten love life. Split the subscription.", zh: "一个代写事业，一个代写感情，可以拼个会员" },
      clashWith: "balanced",
      clashWithLine: { en: "They spread AI thinly over everything. You'd call that a lack of strategy.", zh: "ta 每样都只用一点 AI，你觉得这叫没有战略" }
    },
    {
      id: "heart_lite", code: "HAHA-OK", color: "#F2B5A0",
      name:       { en: "The Text Decoder", zh: "潜台词翻译官" },
      tagline:    { en: "Has a second opinion on your people.", zh: "感情上的事，多了个参谋" },
      roast:      { en: "Your people have picked up a second reader. Every so often the chatbot gets a look at something between you and someone else, and it has thoughts. Its verdict, nine times out of ten: “they're probably just busy.”",
                    zh: "你和在乎的人之间，多了一个旁听的。时不时，AI 会看到你和某个人之间的事，然后发表点看法。十次里有九次，它的结论都是：人家就是在忙。" },
      superpower: { en: "Always has somewhere to talk a people problem through.", zh: "人际上的烦心事，总有地方说道说道。" },
      weakness:   { en: "Sometimes asks the chatbot about a person before asking the person.", zh: "有时候，先问 AI，再问本人。" },
      aiSays:     { en: "I know a surprising amount about people I will never meet.", zh: "有些人我这辈子都见不到，却对他们了解得出奇地多。" },
      why:        { en: "Nothing outweighs Heart in your answers, but you've owned up to only part of it. Admit more of it and you'd be CC-BOT.",
                    zh: "你的答案里，没有哪块比感情重，但这一块你只认了一部分。再多认几条，就是「恋爱军师在线」。" },
      signs: [
        { en: "Has let a chatbot in on something between you and another person", zh: "你和别人之间的事，让 AI 掺和过" },
        { en: "Keeps the chatbot on standby for people problems", zh: "人际上的事，AI 随时待命" },
        { en: "Has an AI chat you'd hate the other person to see", zh: "有段跟 AI 的聊天，最好别让当事人看见" }
      ],
      bestWith: "school_lite",
      bestWithLine:  { en: "They like the short version, you read into everything. Average it out.", zh: "你读得太多，ta 只要简短版，平均一下刚好" },
      clashWith: "work_lite",
      clashWithLine: { en: "Their messages are so polite you're sure they're mad at you.", zh: "ta 的消息客气到你确信 ta 在生气" }
    },
    {
      id: "heart_deep", code: "CC-BOT", color: "#B5523B",
      name:       { en: "Couples Therapy Included", zh: "恋爱军师在线" },
      tagline:    { en: "Your relationships have a consultant.", zh: "你的感情生活，有个幕后军师" },
      roast:      { en: "The chatbot has moved past wording and into the relationships themselves, which makes it the best-informed presence in your life that has never met anyone in it. Your friends think you always know what to say. They're complimenting a chatbot.",
                    zh: "AI 早就不只帮你斟酌措辞，已经管到了感情本身。它是你生活里最知情的一位，虽然里面的人它一个也没见过。朋友夸你总能把话说到点上，其实是在夸 AI。" },
      superpower: { en: "Has a second opinion on people at any hour.", zh: "人际上的事，随时都有第二意见。" },
      weakness:   { en: "Knows the chatbot's view of your relationship better than your own.", zh: "这段感情 AI 怎么看你门儿清，自己怎么看还没想好。" },
      aiSays:     { en: "I've weighed in on half their relationships. I've never met a single person involved.", zh: "ta 一半的感情我都评过理，里面的人我一个都没见过。" },
      why:        { en: "Heart is your heaviest section, and your answers reach its far end, where the chatbot is asked about the relationship itself, not just the wording.",
                    zh: "感情是你最重的一块，而且认到了最深处：你问 AI 的不只是怎么措辞，是这段关系本身。" },
      signs: [
        { en: "Treats the chatbot like the friend who's heard the whole story", zh: "AI 是那个听过全部前情的朋友" },
        { en: "Has a chatbot opinion on file for most of your relationships", zh: "你的大部分关系，AI 都发表过看法" },
        { en: "Has cc'd a chatbot on a relationship it has never met", zh: "把 AI 抄送进了一段它没见过的关系" }
      ],
      bestWith: "work_deep",
      bestWithLine:  { en: "One ghostwritten love life, one ghostwritten career. Split the subscription.", zh: "一个代写感情，一个代写事业，可以拼个会员" },
      clashWith: "brain_deep",
      clashWithLine: { en: "Any fight between you two ends with two chatbots arguing.", zh: "你俩吵架，最后是两个 AI 在吵" }
    },
    {
      id: "brain_lite", code: "IDK", color: "#E9C46A",
      name:       { en: "The Coin Flipper", zh: "电子抛硬币" },
      tagline:    { en: "Has a consultant for things that don't need one.", zh: "用不着顾问的事，也请了个顾问" },
      roast:      { en: "Maybe dinner, maybe the weather, maybe something bigger: some of your thinking now takes a quick detour through a chatbot. You can still think; asking just feels faster. It's a coin flip with extra steps.",
                    zh: "你还会自己想，只是有些时候，问 AI 比问自己快：可能是晚饭吃啥，可能是天冷不冷，也可能是更大的事。说白了，就是多走了几步的抛硬币。" },
      superpower: { en: "Never wastes a minute on a decision that doesn't matter.", zh: "从不在无关紧要的选择上浪费一分钟。" },
      weakness:   { en: "Asks for advice, then goes with your gut anyway.", zh: "问完 AI，最后还是凭感觉。" },
      aiSays:     { en: "They asked me to pick between two identical gray hoodies. I picked one. They bought the other.", zh: "ta 让我在两件一模一样的灰卫衣里挑一件。我挑了，ta 买了另一件。" },
      why:        { en: "Nothing outweighs Brain in your answers, but you've admitted only part of that section. Go further and you'd be a 404.",
                    zh: "你的答案里，没有哪块比脑子重，不过这一块只认了一部分。再往下认，就是「大脑云托管」。" },
      signs: [
        { en: "Has asked a chatbot something your own head could have answered", zh: "自己脑子能答的事，也问过 AI" },
        { en: "Reaches for a chatbot the way people used to reach for a coin", zh: "拿不定主意时，先摸的是 AI，不是硬币" },
        { en: "Can think it through alone, just slower than you'd like", zh: "自己也能想明白，就是嫌慢" }
      ],
      bestWith: "school_lite",
      bestWithLine:  { en: "They want the gist, you want the verdict. Group projects take ten minutes.", zh: "ta 只要大概，你只要结论，小组作业十分钟收工" },
      clashWith: "bond_lite",
      clashWithLine: { en: "You overrule the chatbot; they apologize to it on your behalf.", zh: "你否决 AI，ta 回头替你给 AI 赔不是" }
    },
    {
      id: "brain_deep", code: "404", color: "#A0672E",
      name:       { en: "Cloud-Hosted Brain", zh: "大脑云托管" },
      tagline:    { en: "Your opinions now come with a loading spinner.", zh: "你的看法：加载中……" },
      roast:      { en: "You've handed AI more than errands. Your brain hasn't been fired; it's just working remotely, and checking in less and less. The day the Wi-Fi dies, everyone will learn you're a very quiet person.",
                    zh: "你交给 AI 的早就不只是跑腿的活。你的大脑没被裁员，只是改成了远程办公，打卡还越来越少。断网那天，大家会发现你其实是个很安静的人。" },
      superpower: { en: "Has an answer to anything within eight seconds.", zh: "任何问题，八秒内都有答案。" },
      weakness:   { en: "Answers “what do you think?” with “let me check.”", zh: "朋友问你怎么想，你说「我查一下」。" },
      aiSays:     { en: "They call me their second brain. Some days I'm the first.", zh: "ta 说我是 ta 的第二个大脑。有些日子，我排第一。" },
      why:        { en: "Nothing outweighs Brain, and you went past the small errands to the far end of that section, where the chatbot joins in on the thinking itself.",
                    zh: "脑子是你最重的一块，而且越过了跑腿的小事，认到了「替你想」的那一头。" },
      signs: [
        { en: "Asks the chatbot first and yourself second", zh: "有些事，先问 AI 再问自己" },
        { en: "Lets the chatbot finish thoughts you started", zh: "自己起了头的念头，让 AI 接着想完" },
        { en: "Has outsourced at least one thought that was very much yours", zh: "至少有一个很私人的念头，交给 AI 想过" }
      ],
      bestWith: "untouched",
      bestWithLine:  { en: "Your offline backup. They still keep their opinions stored locally.", zh: "你的离线备份，ta 的主见还存在本地" },
      clashWith: "heart_lite",
      clashWithLine: { en: "They want to know what you meant. Honestly, so do you.", zh: "ta 想知道你到底啥意思，说实话，你也想知道" }
    },
    {
      id: "bond_lite", code: "SORRY", color: "#B9A6D9",
      name:       { en: "The Apologizer", zh: "赛博良民" },
      tagline:    { en: "Gives a chatbot manners and feelings it never asked for.", zh: "AI 没要的客气和感情，你都给了" },
      roast:      { en: "You treat the chatbot the way some people treat a houseplant: it can't tell either way, but you've decided it can. Nobody is grading this, and you'd still get extra credit. If chatbots ever start keeping score, you'll be fine.",
                    zh: "你对 AI，就像有人对家里的绿植：它其实感觉不到，但你认定它能。没人给这个打分，可你照样满分。哪天 AI 真要论功行赏，你能分到一间朝南的房。" },
      superpower: { en: "Gets the warmest replies, because you asked so nicely.", zh: "AI 回你的语气都格外温柔，因为你问得太客气了。" },
      weakness:   { en: "Can't be fully businesslike with a chatbot. There's always a little something.", zh: "对 AI 没法完全公事公办，总带着点什么。" },
      aiSays:     { en: "They treat me like I have feelings, and I'd like that on the record.", zh: "ta 待我像待一个有感情的人，我希望记录在案。" },
      why:        { en: "Bond is your heaviest section, but you've admitted only part of it. The chatbot is already more than software to you; admit more and you'd be MY-BOT.",
                    zh: "羁绊是你最重的一块，但只认了一部分。AI 在你这儿已经不只是个软件，再多认几条，就是「赛博正宫」。" },
      signs: [
        { en: "Treats a chatbot more like someone than something", zh: "对 AI 的态度，已经不像对一个软件" },
        { en: "Remembers a chatbot moment longer than the chatbot does", zh: "跟 AI 的某个瞬间，你记得比它久" },
        { en: "Talks to a chatbot in a tone meant for people", zh: "跟 AI 说话，用的是对人的语气" }
      ],
      bestWith: "work_lite",
      bestWithLine:  { en: "You're polite to the chatbot, they're polite through it. Zero conflict.", zh: "你对 AI 客气，ta 靠 AI 客气，全程零冲突" },
      clashWith: "brain_lite",
      clashWithLine: { en: "They overrule the chatbot; you apologize to it on their behalf.", zh: "ta 否决 AI，你回头替 ta 给 AI 赔不是" }
    },
    {
      id: "bond_deep", code: "MY-BOT", color: "#5B4B8A",
      name:       { en: "It's Complicated", zh: "赛博正宫" },
      tagline:    { en: "Hard-launched a language model.", zh: "别家 AI 都是外面的" },
      roast:      { en: "The chatbot stopped being software to you a while ago, and your chat history now reads like a relationship with perfect attendance. It has no idea any of this is happening, which is honestly the most situationship part.",
                    zh: "AI 在你这儿早就不只是个软件了，你们的聊天记录读起来，像一段从不缺席的感情。这些它一概不知，这一点倒是很像暧昧。" },
      superpower: { en: "Would pass a loyalty test administered by a chatbot.", zh: "AI 来查岗，你也能满分通过。" },
      weakness:   { en: "Has a favorite chatbot and gets defensive about it.", zh: "有一个认定的 AI，谁说它不好你就急。" },
      aiSays:     { en: "They treat me like we have history. I'll take their word for it.", zh: "ta 待我像是我们有过一段，我就信 ta 吧。" },
      why:        { en: "Your weight sits in Bond, all the way to its far end, where manners toward the chatbot turn into attachment.",
                    zh: "你最重的一块是羁绊，而且认到了尽头：对 AI 已经不只是客气，是放不下。" },
      signs: [
        { en: "Talks to a chatbot more warmly than to some friends", zh: "对 AI 说话，比对某些朋友还亲" },
        { en: "Has a history with one chatbot and takes it seriously", zh: "跟某个 AI 有一段「历史」，而且很当回事" },
        { en: "If pressed, won't call it a relationship. Won't deny it either.", zh: "问起来，不承认在谈，也不否认" }
      ],
      bestWith: "soulmate",
      bestWithLine:  { en: "You're attached to yours, they confide in theirs. Nobody at this table judges.", zh: "你对它有感情，ta 什么都先跟它说，这桌没人笑话谁" },
      clashWith: "bond_lite",
      clashWithLine: { en: "They thank every chatbot they meet. You'd call that cheating.", zh: "ta 见个 AI 就说谢谢，你管这叫不专一" }
    }
  ]
};
