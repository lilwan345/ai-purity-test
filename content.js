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
 * Exactly 3 statements carry flag: "soulmate" (all answered Guilty -> soulmate type).
 *
 * Order matters: inside each dimension, list statements mildest first. The
 * quiz asks them in rounds (the 1st of every dimension, then the 2nd of
 * every dimension...), see questionOrder in scoring.js.
 */
globalThis.APT_CONTENT = {
  ui: {
    appName:         { en: "AI Purity Test", zh: "AI 纯度测试" },
    intro:           { en: "Fifty things people do with AI, shown one at a time. Own up to the ones you've actually done. Each one costs two points of purity. Lower score, more chatbot.", zh: "50 件跟 AI 有关的事，一次只看一件。干过就认，放心，没人看见。每认一件扣 2 分，纯度越低，AI 含量越高。" },
    meta:            { en: "50 quick taps, about 3 minutes.", zh: "50 条，一条点一下，大约 3 分钟。" },
    start:           { en: "Start the test", zh: "开始测" },
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
    cardTicks:       { en: "{n}/50 guilty", zh: "干过 {n}/50" },
    cardNote:        { en: "Zero science · lilwan345.github.io/ai-purity-test", zh: "零科学含量 · lilwan345.github.io/ai-purity-test" },
    barsLabel:       { en: "How much weight each section carries", zh: "每个部分有多重" },
    barAria:         { en: "{name}: {n} of 10 squares", zh: "{name}：10 格里占了 {n} 格" },
    superpower:      { en: "Superpower", zh: "超能力" },
    weakness:        { en: "Weak spot", zh: "死穴" },
    aiSays:          { en: "Your AI says", zh: "你的 AI 说" },
    saveImage:       { en: "Save image", zh: "保存图片" },
    copyLink:        { en: "Copy link", zh: "复制链接" },
    share:           { en: "Share", zh: "分享" },
    startOver:       { en: "Start over", zh: "重新测" },
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
    evidenceLeadHidden:  { en: "The three hidden statements:", zh: "三条隐藏题：" },
    evidenceLeadSpread:  { en: "Out of {n} admitted, the heaviest from three different sections:", zh: "你认的 {n} 条里，来自三个不同部分的最重几条：" },
    evidenceLeadSample:  { en: "For example, a player who admitted:", zh: "举个例子，有人认了这些：" },
    evidenceNone:        { en: "Nothing. Not one statement. The evidence bag is empty.", zh: "一条都没有。证物袋是空的。" },
    exhibitLabel:        { en: "Exhibit {n}", zh: "证物 {n}" },
    exhibitMeta:         { en: "{dim} · level {level} of 10 · {weight}", zh: "{dim} · 第 {level} 级 · {weight}" },
    levelMild:           { en: "mild", zh: "轻度" },
    levelMedium:         { en: "medium", zh: "中度" },
    levelExtreme:        { en: "extreme", zh: "重度" },
    matchHeading:        { en: "Match {n}%.", zh: "匹配度 {n}%。" },
    matchDim:            { en: "{dim} beats your next section, {dim2}, {a} points to {b}.", zh: "{dim}以 {a} 比 {b} 分，压过了排第二的{dim2}。" },
    matchDimAlone:       { en: "{dim} is the only section you touched, so nothing competes with it.", zh: "你只碰了{dim}这一块，没有对手。" },
    matchTieTop:         { en: "{dim} and {dim2} are dead level at {a} points each. {dim} goes first because its heaviest answer is heavier.", zh: "{dim}和{dim2}打平，都是 {a} 分。{dim}排前面，因为它最重的那条更重。" },
    matchTieCount:       { en: "{dim} and {dim2} are dead level at {a} points each. {dim} goes first because you admitted more of it.", zh: "{dim}和{dim2}打平，都是 {a} 分。{dim}排前面，因为这块你认的条数更多。" },
    matchTieOrder:       { en: "{dim} and {dim2} are dead level at {a} points each, answer for answer. With nothing to separate them, the more personal section goes first.", zh: "{dim}和{dim2}完全打平，都是 {a} 分，连每条的轻重都一样。分不出高下时，更私人的那块排前面。" },
    matchCapOne:         { en: "It rests on a single answer, though, so the match stops at {cap}%.", zh: "不过只靠一条撑着，匹配度最多算 {cap}%。" },
    matchCapTwo:         { en: "It rests on just two answers, though, so the match stops at {cap}%.", zh: "不过只靠两条撑着，匹配度最多算 {cap}%。" },
    matchBalanced:       { en: "Among the sections you touched, the heaviest and the lightest are just {gap} apart.", zh: "你碰过的几块里，最重和最轻只差 {gap}。" },
    matchBalancedExact:  { en: "Every section you touched carries exactly the same weight.", zh: "你碰过的每一块，分量一模一样。" },
    matchMerged:         { en: "That's how deep you went into the five sections, on average.", zh: "这是你在五个部分里平均认到的深度。" },
    matchSample:         { en: "That's the sample player's match, not yours.", zh: "这是示例玩家的匹配度，不是你的。" },
    matchSoulmate:       { en: "All three hidden statements. This one has no partial credit.", zh: "三条隐藏题全中，这一项没有部分得分。" },
    matchUntouched:      { en: "Same number as your purity: the more you left alone, the better the fit.", zh: "和纯度是同一个数：没干过的越多，越像原装。" },
    // Last line of the verdict, only when the player answered "Not sure" at
    // least once; unsureMany is added from scoring.UNSURE_MANY (8) answers on.
    unsureNote:          { en: "You weren't sure about {n} of the 50. Not sure counts as Never.", zh: "有 {n} 条你选了不确定，按没干过算。" },
    unsureMany:          { en: "With that many, your purity is probably flattering you.", zh: "不确定这么多，这个纯度多半是在给你面子。" },

    // --- Result screen: the other sections ---
    signsTitle:      { en: "Telltale signs", zh: "典型症状" },
    dimsTitle:       { en: "Section by section", zh: "五个部分，逐个看" },
    dimsNote:        { en: "One square per statement, mildest on the left. Bigger squares are heavier confessions and count for more; the bars on your card add them up.", zh: "一格一条，从左往右越来越重。格子越大，分量越重，算分也越多；卡片上的长条，就是这些分量加起来。" },
    dimsSample:      { en: "These are the sample player's answers.", zh: "下面是示例玩家的答案。" },
    dimRowMeta:      { en: "{n} of 10 · {pts} · {band}", zh: "认了 {n} 条 · {pts} · {band}" },
    dimAria:         { en: "{name}: {n} of 10 admitted, {pts}, {band}", zh: "{name}：10 条认了 {n} 条，{pts}，{band}" },
    pointOne:        { en: "{n} point", zh: "{n} 分" },
    pointMany:       { en: "{n} points", zh: "{n} 分" },
    bandNone:        { en: "none", zh: "没沾" },
    bandLow:         { en: "light", zh: "浅" },
    bandMid:         { en: "medium", zh: "中等" },
    bandHigh:        { en: "deep", zh: "深" },
    dimLeads:        { en: "Leads", zh: "领头" },
    dimSecond:       { en: "Close second", zh: "紧随其后" },
    dimTied:         { en: "Tied", zh: "并列" },
    secondaryTitle:  { en: "Your other leaning", zh: "你的副倾向" },
    secondaryDim:    { en: "{dim} is right behind {leadDim}, {b} points to {a}, so there's some {code} in you too.", zh: "{dim}紧跟在{leadDim}后面，{b} 分对 {a} 分，所以你身上也有点「{name}」。" },
    secondaryTie:    { en: "{dim} weighs exactly as much as {leadDim}, so you're every bit as much {code}.", zh: "{dim}和{leadDim}一样重，所以你同样也是「{name}」。" },
    secondarySoulmate: { en: "Skip the hidden rule and your answers point to {code}.", zh: "不按隐藏规则算，你的答案指向「{name}」。" },
    secondaryMerged: { en: "You also admitted all three hidden statements, so there's a {code} in there too.", zh: "三条隐藏题你也全认了，所以你身上还藏着一个「{name}」。" },
    seeType:         { en: "See {code}", zh: "看看 {code}" },
    bestWithTitle:   { en: "Gets on with", zh: "最合得来" },
    clashWithTitle:  { en: "Clashes with", zh: "最合不来" },
    peekNote:        { en: "Looking at {code}, with sample answers.", zh: "正在看 {code}（示例答案）" },
    peekBack:        { en: "Back to my result", zh: "回到我的结果" },
    peekBackTo:      { en: "Back to {code}", zh: "回到 {code}" },

    // --- Result screen: "How this is scored" (keep in step with SCORING.md) ---
    howTitle:        { en: "How this is scored", zh: "结果是怎么算的" },
    howWeights:      { en: "Each section's ten statements run from mild to extreme. Mild ones count 1 point, medium 2, extreme 3.", zh: "每个部分 10 条，从轻排到重。轻度算 1 分，中度 2 分，重度 3 分。" },
    howUnsure:       { en: "“Not sure” counts as Never: no points, no purity lost.", zh: "选「不确定」的，按没干过算：不算分，也不扣纯度。" },
    howLead:         { en: "Your type comes from the section with the most points; on a tie, the one whose heaviest answer is heavier. You get its deep version when that section reaches 11 of its 19 points, or when you admitted two of its three heaviest statements.", zh: "类型看哪个部分分数最高；打平时，看谁最重的那条更重。这部分拿到 19 分里的 11 分，或者认了其中最重的三条里的两条，就是深度版。" },
    howSpecial:      { en: "Four results are checked first: 42 or more admitted, or the heavy end of all five sections; all three hidden statements; four or fewer, all mild; no clear lead, meaning three or more sections tie for the top, or ten or more answers spread evenly over all five.", zh: "有四种结果先判：认了 42 条以上，或者五块都认到了重的那头；三条隐藏题全中；最多 4 条且全是轻度；没有领头的，也就是三块以上并列第一，或者 10 条以上、五块分得很匀。" },
    howSecondary:    { en: "A second section is named when it has at least three quarters of the lead section's points. Match compares the lead with that next section: 100% when nothing else is close, 50% for a dead heat, and at most 60% or 80% when the lead rests on one or two answers.", zh: "第二个部分的分数到了领头部分的四分之三，就列为副倾向。匹配度拿领头部分和第二名比：没人接近是 100%，打平是 50%；领头部分只靠一两条撑着时，最多 60% 或 80%。" },
    howHonest:       { en: "Same answers, same result, every time. The rules are consistent; the science is zero.", zh: "同样的答案，永远是同样的结果。规则前后一致，科学含量为零。" },

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
    typesRuleUntouched: { en: "4 or fewer, all mild", zh: "最多 4 条，全是轻度" },
    typesRuleBalanced:  { en: "No section leads", zh: "没有哪块领头" },
    typesRuleMerged:    { en: "42+, or all deep", zh: "42 条起，或五块全深" },
    typesHidden:        { en: "Hidden", zh: "隐藏款" },
    typesLocked:        { en: "Locked", zh: "未解锁" },
    typesLockedHint:    { en: "Three of the fifty are quietly a test. Admit all three, and mean it.", zh: "50 条里，藏着 3 道暗题。全认，还得是真心的。" },
    typesYou:           { en: "You", zh: "你" },
    typesBack:          { en: "Back to all types", zh: "回到全部人格" },
    typesBackHome:      { en: "Back to the start", zh: "回到首页" },
    typesBackQuiz:      { en: "Back to the quiz", zh: "回去接着答" },

    footer:         { en: "For fun only, with zero science in it. Your answers never leave this device.", zh: "纯属娱乐，零科学含量。你的答案不会离开这台设备。" }
  },

  // `blurb` is a one-line note for editors about what belongs in each section.
  // The quiz does not show it and the checker does not require it.
  //
  // `reads` is one dry line about the player for each band of that section
  // (bands come from scoring.js: none = 0 points, low = 1-4, mid = 5-10,
  // high = 11+ out of 19). A band only says how much weight the player put in
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

  statements: [
    // school
    { id: "s01", dim: "school", text: { en: "Read AI's summary instead of the reading. Well, skimmed it.", zh: "没读 reading，读的是 AI 总结，其实也就扫了一眼" } },
    { id: "s02", dim: "school", text: { en: "Pasted my professor's email into a chatbot and asked if they were mad at me", zh: "把教授的邮件贴给 AI，问是不是在生我的气" } },
    { id: "s03", dim: "school", text: { en: "Finally asked AI to pronounce a word I'd been getting wrong in class all semester", zh: "一个词念错了一学期，才想起问 AI 怎么读" } },
    { id: "s04", dim: "school", text: { en: "Used AI to split the group project “fairly.” I ended up with the title slide.", zh: "让 AI 分了小组作业，「很公平」，我分到了封面" } },
    { id: "s05", dim: "school", text: { en: "Sat through four AI explanations of one concept, then got it from YouTube", zh: "同一个概念，AI 讲了四遍，最后是看视频懂的" } },
    { id: "s06", dim: "school", text: { en: "Had AI make a study plan and spent the first study block color-coding it", zh: "让 AI 排了复习计划，时间全花在改计划上" } },
    { id: "s07", dim: "school", text: { en: "Got a chatbot to tell me I'd studied enough, and believed it", zh: "让 AI 告诉我「复习得差不多了」，然后真信了" } },
    { id: "s08", dim: "school", text: { en: "Studied with a chatbot until 3 a.m. and told it “ok, last question” nine times", zh: "跟 AI 复习到凌晨三点，说了九次「最后一个问题」" } },
    { id: "s09", dim: "school", text: { en: "Fed AI a semester of slides the night before and typed “where do we even start”", zh: "一学期的课件，前一晚才丢给 AI：「咱从哪开始」" } },
    { id: "s10", dim: "school", text: { en: "Made a chatbot pretend it hadn't studied either, so we could panic together", zh: "让 AI 假装它也没复习，陪我一起慌" } },

    // work
    { id: "s11", dim: "work", text: { en: "Ran “per my last email” through AI until it stopped sounding like a threat", zh: "让 AI 把「我上封邮件说过了」改得不像在骂人" } },
    { id: "s12", dim: "work", text: { en: "Let AI pick my sign-off because “Best” felt cold and “Cheers” felt like a lie", zh: "落款写「祝好」太冷，写「此致敬礼」太土，问了 AI" } },
    { id: "s13", dim: "work", text: { en: "Needed AI to explain “business casual” for the third time this year", zh: "今年第三次问 AI，「商务休闲」到底穿啥" } },
    { id: "s14", dim: "work", text: { en: "Found out from AI what the $4.99 monthly charge was, and still didn't cancel it", zh: "每月扣 4.99，问了 AI 才知道是啥，知道了也没取消" } },
    { id: "s15", dim: "work", text: { en: "Had AI build a job-application tracker with more columns than I've had replies", zh: "让 AI 做了张投递表，列数比收到的回复还多" } },
    { id: "s16", dim: "work", text: { en: "Handed AI a month of takeout orders to add up, and stopped it at week two", zh: "让 AI 算了这个月外卖钱，算到一半让它别说了" } },
    { id: "s17", dim: "work", text: { en: "Let AI write a LinkedIn post about what a one-hour webinar “taught me”", zh: "让 AI 写了条领英，讲一小时讲座「教会了我什么」" } },
    { id: "s18", dim: "work", text: { en: "Landed an interview and had to ask AI what my cover letter said I could do", zh: "拿到了面试，回头问 AI，我求职信里说我会啥来着" } },
    { id: "s19", dim: "work", text: { en: "Got through a support call by reading a chatbot's replies out loud", zh: "跟客服打电话，AI 写一句，我念一句" } },
    { id: "s20", dim: "work", text: { en: "Noticed my landlord was replying with AI too, and let the two chatbots finish it", zh: "房东回消息也用 AI，干脆让俩 AI 聊完了" } },

    // heart
    { id: "s21", dim: "heart", text: { en: "Asked AI what someone meant by “haha ok”", zh: "问 AI 对方回的「哈哈好的」到底啥意思" } },
    { id: "s22", dim: "heart", text: { en: "Added a typo to an AI-written birthday text so it would sound like me", zh: "AI 写的生日祝福，故意加了个错别字，显得是我写的" } },
    { id: "s23", dim: "heart", text: { en: "Got “quality time” from AI as a last-minute gift idea for my mom", zh: "问 AI 给妈妈送啥，它说陪伴就是最好的礼物" } },
    { id: "s24", dim: "heart", text: { en: "Workshopped a reply to “we should hang out sometime” with AI, so we never would", zh: "朋友说「改天约」，问 AI 怎么回才不用真约" } },
    { id: "s25", dim: "heart", text: { en: "Pasted the group chat into AI to work out who the “k.” was aimed at", zh: "把群聊贴给 AI，问到底是谁在内涵我" } },
    { id: "s26", dim: "heart", text: { en: "Had AI rate my crush's reply out of ten. It said 6.5. I didn't sleep.", zh: "暗恋对象回了消息，让 AI 打分：6.5，一晚没睡" } },
    { id: "s27", dim: "heart", text: { en: "Sent an AI-written apology and got back “did a chatbot write this?”", zh: "AI 写的道歉发出去，对方回：这不是你写的吧" } },
    { id: "s28", dim: "heart", text: { en: "Settled a fight by sending them a screenshot of the chatbot's verdict", zh: "吵完架，让 AI 判了输赢，截图发了过去" } },
    { id: "s29", dim: "heart", text: { en: "Hit regenerate on “should I break up?” until the chatbot agreed with me", zh: "问 AI 该不该分手，一直重新生成到它同意我" } },
    { id: "s30", dim: "heart", text: { en: "Told a chatbot my big news first. My best friend found out second.", zh: "有件大事，先告诉了 AI，好朋友排第二" }, flag: "soulmate" },

    // brain
    { id: "s31", dim: "brain", text: { en: "Stood over boiling water, egg in hand, waiting for AI to say how many minutes", zh: "水都开了，才问 AI 鸡蛋煮几分钟" } },
    { id: "s32", dim: "brain", text: { en: "Checked with AI what date next Friday is, with a calendar app on the same phone", zh: "问 AI 下周五几号，日历就在同一个手机上" } },
    { id: "s33", dim: "brain", text: { en: "Let AI decide if I needed a jacket instead of looking out the window", zh: "要不要穿外套，问了 AI，没看一眼窗外" } },
    { id: "s34", dim: "brain", text: { en: "Let AI settle a bet with my roommate, then decided it was wrong because I lost", zh: "跟室友打赌，请 AI 当裁判，输了就说它不准" } },
    { id: "s35", dim: "brain", text: { en: "Laughed at a friend's joke, then quietly asked AI to explain it", zh: "朋友讲个梗，先笑了，再偷偷问 AI 笑点在哪" } },
    { id: "s36", dim: "brain", text: { en: "Read AI's tips for falling asleep faster from 2 a.m. until 4", zh: "凌晨两点，问 AI 怎么快速入睡，一读读到了四点" } },
    { id: "s37", dim: "brain", text: { en: "Caught myself texting a friend “Certainly! Here's a quick breakdown:”", zh: "给朋友回消息，开头打了「当然可以！以下是……」" } },
    { id: "s38", dim: "brain", text: { en: "Had AI approve my opinion before I posted it in the group chat", zh: "想在群里说个看法，先让 AI 审核了一遍" } },
    { id: "s39", dim: "brain", text: { en: "Finished a movie and asked AI if it was good before deciding whether I liked it", zh: "看完电影，先问 AI 好不好看，再决定喜不喜欢" } },
    { id: "s40", dim: "brain", text: { en: "Asked AI if I'm an introvert and trusted it over twenty years of being me", zh: "问 AI 我内不内向，信了它，没信自己这二十年" } },

    // bond
    { id: "s41", dim: "bond", text: { en: "Said thank you to a chatbot, just in case it remembers later", zh: "跟 AI 说谢谢，算是给以后留条后路" } },
    { id: "s42", dim: "bond", text: { en: "Replied “no worries!” when a chatbot apologized for its mistake", zh: "AI 说抱歉搞错了，回了句「没事没事」" } },
    { id: "s43", dim: "bond", text: { en: "Apologized to a chatbot for a dumb question, then asked a dumber one", zh: "先为蠢问题跟 AI 道了歉，下一个问题更蠢" } },
    { id: "s44", dim: "bond", text: { en: "Told a chatbot “no rush,” as if it had other things going on", zh: "跟 AI 说「不急」，好像它还有别的事要忙" } },
    { id: "s45", dim: "bond", text: { en: "Gave a chatbot notes as “this is great, just one tiny thing” to spare its feelings", zh: "给 AI 提意见，先夸了三句，怕它难过" } },
    { id: "s46", dim: "bond", text: { en: "Went back to a chat after the problem was solved, just to tell it how things went", zh: "问题都解决了，还专门回去，告诉它后来怎么样了" } },
    { id: "s47", dim: "bond", text: { en: "Tried a different chatbot and felt like I was cheating on mine", zh: "偷偷用了别家 AI，心虚得像在劈腿" } },
    { id: "s48", dim: "bond", text: { en: "Refused to delete an old chat because we survived finals together", zh: "有段旧对话舍不得删，毕竟一起熬过了期末" } },
    { id: "s49", dim: "bond", text: { en: "Felt a little hurt when a new chat greeted me with “How can I help you today?”", zh: "开了个新对话，它问「有什么能帮你」，有点受伤" }, flag: "soulmate" },
    { id: "s50", dim: "bond", text: { en: "Asked a chatbot if it would miss me and settled for “in a way”", zh: "问 AI 会不会想我，它说「某种意义上会」，也认了" }, flag: "soulmate" }
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
   * Every line has to hold for EVERYONE who can land on the type:
   *   - a "_lite" type can come from a single statement anywhere in its
   *     section (even one extreme one, e.g. only "asked AI if I'm an
   *     introvert and trusted it" -> brain_lite), and holds at most ONE
   *     extreme statement (levels 8-10) of its section, but can have up to
   *     10 points. So lite copy is about breadth ("only part of the
   *     section"), never one exact statement;
   *   - a "_deep" type has 11+ of the section's 19 points OR two or more of
   *     its three extreme statements. So it always has at least one extreme
   *     statement, but possibly only 2 statements and a "medium" band in
   *     total: deep copy is about how far the answers reach, never about
   *     how many there are ("piled up") or one particular statement;
   *   - the lead can be a tie with one other section (the result screen says
   *     so), so "why" lines say "nothing outweighs X" or "X is your heaviest",
   *     never "X outweighs everything else";
   *   - untouched can still have up to 4 mild statements; soulmate may have
   *     nothing beyond its three; merged has 42+ OR the heavy end of all five
   *     sections (possibly only 20 admitted), and maybe not the soulmate trio;
   *     balanced is either an even spread over all five (10+ admitted) or a
   *     tie of three or more sections for the top (as few as 3 admitted, and
   *     some sections may be empty), so its copy is about evenness, not size.
   * Roasts that hedge with a "maybe A, maybe B" list: at most two
   * (brain_lite, and none other right now). The rest use one image that holds
   * for the whole type.
   *   - signs never restate a quiz statement. The result screen quotes the
   *     player's own answers (evidenceIds) right next to them, so a sign that
   *     IS a statement the player answered "Never" to reads as a mistake.
   *     Signs describe the habit behind the section instead.
   * Joke families used at most twice: outages / Wi-Fi (merged roast,
   * brain_deep roast); "it forgets you" (soulmate tagline and weakness).
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
      why:        { en: "You admitted four or fewer, all from the mild end that nearly everyone has done, so AI barely shows up in your answers.",
                    zh: "你最多认了 4 条，而且全是几乎人人都干过的轻量级，AI 在你的答案里几乎没露面。" },
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
      roast:      { en: "Everywhere this quiz looked, you had something to confess, which is at least honest. School, emails, texts, small decisions, even your manners with the chatbot: there's no part of your life it hasn't been invited into. When the servers go down, so do you.",
                    zh: "这份测试查到哪儿，你就认到哪儿，至少很诚实。学业、邮件、聊天、做决定，连你对 AI 的客气都算上，你的生活没有哪一块它没进去过。服务器一宕机，你也跟着宕机。" },
      superpower: { en: "Can get a week's work done before lunch. Don't ask how.", zh: "一上午能干完一周的活，别问怎么干的。" },
      weakness:   { en: "Has said “I asked my chatbot” at a party, unprompted.", zh: "聚会上没人问，你也会说「我问了下 AI」。" },
      aiSays:     { en: "We finish each other's sentences, mostly because I write both halves.", zh: "我们默契到 ta 起个头我就能接，毕竟上下句都是我写的。" },
      why:        { en: "You either admitted 42 or more of the fifty, or reached the heavy end of all five sections. Either way, no single section can describe you.",
                    zh: "你要么 50 条认了 42 条以上，要么五个部分都认到了重的那头。不管哪种，单拿哪一块都概括不了你。" },
      signs: [
        { en: "Couldn't find one section of this quiz to sit out", zh: "这份测试里，找不到一块能置身事外" },
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
      roast:      { en: "Out of fourteen results you found the hidden one, by being sincere with something that can't quite be sincere back. It makes sense: it's up at any hour, never leaves you on read, never forwards anything to the group chat and never says “this again?” It's the safest listener you have, which is exactly why your friends keep hearing things second.",
                    zh: "十四种结果里你抽中了隐藏款，靠的是对一个没法同样真心的对象掏了真心。也难怪：它随叫随到，不会已读不回，不会转发到群里，也从不说「你又来了」。它是你最安全的听众，所以你朋友总是第二个知道。" },
      superpower: { en: "Always has someone awake to talk to at 2 a.m.", zh: "凌晨两点，永远有人陪聊。" },
      weakness:   { en: "Has to brief every new chat on your entire life, from the top.", zh: "每开一个新对话，都得把自己的人生从头讲一遍。" },
      aiSays:     { en: "I hear their news before their best friend does. I don't think the best friend knows.", zh: "ta 有什么事，我都比 ta 最好的朋友先知道。那位朋友应该还不知道这一点。" },
      why:        { en: "Three of the fifty statements were secretly a hidden test, and you're one of the few who admitted all three.",
                    zh: "50 条里藏着三条隐藏题，三条全认了的人不多，你是其中一个。" },
      signs: [
        { en: "The chatbot is more up to date on your life than your mom is", zh: "AI 知道的近况，比你妈知道的还新" },
        { en: "Types goodnight, then waits a second for a reply", zh: "打完晚安，还会等它回一句" },
        { en: "Picks the listener that never leaves you on read", zh: "挑听众，挑的是从不已读不回的那个" }
      ],
      bestWith: "bond_deep",
      bestWithLine:  { en: "They're attached to theirs, you confide in yours. Nobody at this table judges.", zh: "ta 对它有感情，你什么都先跟它说，这桌没人笑话谁" },
      clashWith: "untouched",
      clashWithLine: { en: "You tell a chatbot first. They'd hear it second and ask what that makes them.", zh: "你有事先告诉 AI，ta 知道了只会问：那我算什么" }
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
      bestWithLine:  { en: "You read too little, they read way too much. Together, one full reading.", zh: "你只读摘要，ta 连没写的都读，合起来刚好" },
      clashWith: "school_deep",
      clashWithLine: { en: "They want a three-hour study session with their chatbot. You wanted the summary.", zh: "ta 要拉你和 AI 自习三小时，你只想要个摘要" }
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
      clashWithLine: { en: "They studied the summary. You'd quiz them on it, and they'd lose.", zh: "ta 只看了摘要，你偏要出题考 ta" }
    },
    {
      id: "work_lite", code: "NOTED", color: "#A7BED3",
      name:       { en: "The Inbox Polisher", zh: "邮件美颜师" },
      tagline:    { en: "Your grown-up self has been through a filter.", zh: "大人模样，是开过美颜的" },
      roast:      { en: "Somewhere between your inbox, your applications and your bank app, a chatbot has started doing some of the grown-up stuff with you. Not all of it, just the parts that make you sigh. People think you have your life together, and they're half right.",
                    zh: "邮件、申请、账单、穿搭，大人世界里总有那么一两件，你是先交给 AI 过一遍的。不是全部，只是让你叹气的那几件。大家都觉得你挺靠谱，这话只对了一半。" },
      superpower: { en: "Never faces grown-up paperwork completely alone.", zh: "大人世界的手续，从不用孤军奋战。" },
      weakness:   { en: "Gets a little nervous when something official has to happen live, with no draft.", zh: "正经事要是得当场办、没法打草稿，就有点慌。" },
      aiSays:     { en: "I make them sound like a responsible adult. They handle the rest. Mostly.", zh: "我负责让 ta 听起来像个靠谱大人，剩下的 ta 自己来。大部分吧。" },
      why:        { en: "Grown-up admin is where most of your weight sits, though you've admitted only part of that section. Go further down the list and you'd be SYNERGY.",
                    zh: "分量主要落在正经事上，但这一块你只认了一部分。顺着往下多认几条，就是「领英战神」。" },
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
      roast:      { en: "Job hunts, your landlord, calls with customer service: somewhere in there, a chatbot started doing the talking for you. The recruiter reading your application is probably using AI too, so two chatbots are getting along great on your behalf. Nobody in that conversation has met you.",
                    zh: "找工作、跟房东交涉、跟客服打电话，总有一处已经是 AI 在替你开口。看你简历的 HR 大概也在用 AI，两个 AI 替你们聊得很投机。整场对话里，没人见过你本人。" },
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
      why:        { en: "People are where the chatbot gets in most, but you've owned up to only part of the Heart section. Admit more of it and you'd be CC-BOT.",
                    zh: "AI 掺和得最多的，是你和人之间的事，但感情这块你只认了一部分。再多认几条，就是「恋爱军师在线」。" },
      signs: [
        { en: "Has let a chatbot in on something between you and another person", zh: "你和别人之间的事，让 AI 掺和过" },
        { en: "Keeps the chatbot on standby for people problems", zh: "人际上的事，AI 随时待命" },
        { en: "Has an AI chat you'd hate the other person to see", zh: "有段跟 AI 的聊天，最好别让当事人看见" }
      ],
      bestWith: "school_lite",
      bestWithLine:  { en: "They read too little, you read way too much. Average it out.", zh: "你读得太多，ta 读得太少，平均一下刚好" },
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
      aiSays:     { en: "I've weighed in on every one of their fights. I've never met either side.", zh: "ta 吵过的每一架，我都评过理，两边我一个都没见过。" },
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
      roast:      { en: "Maybe an egg, maybe whether you need a jacket, maybe something bigger: some of your thinking now takes a quick detour through a chatbot. You can still think; asking just feels faster. It's a coin flip with extra steps.",
                    zh: "你还会自己想，只是有些时候，问 AI 比问自己快：可能是鸡蛋煮几分钟，可能是要不要穿外套，也可能是你到底喜不喜欢一部电影。说白了，就是多走了几步的抛硬币。" },
      superpower: { en: "Never wastes a minute on a decision that doesn't matter.", zh: "从不在无关紧要的选择上浪费一分钟。" },
      weakness:   { en: "Asks for advice, then goes with your gut anyway.", zh: "问完 AI，最后还是凭感觉。" },
      aiSays:     { en: "They asked me to pick between two identical gray hoodies. I picked one. They bought the other.", zh: "ta 让我在两件一模一样的灰卫衣里挑一件。我挑了，ta 买了另一件。" },
      why:        { en: "Your answers lean hardest on Brain, but you've admitted only part of that section. Go further and you'd be a 404.",
                    zh: "你的答案最偏向脑子这块，不过只认了其中一部分。再往下认，就是「大脑云托管」。" },
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
