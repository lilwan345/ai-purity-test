/*
 * app.js — the UI. Reads globalThis.APT_CONTENT (content.js) and
 * globalThis.APT_SCORING (scoring.js). No framework: each screen is rebuilt
 * from `state` by a render function.
 *
 * Screens: landing -> question 1..50 (one statement per screen) -> result
 * On top of any screen: "all types" (the grid of the 14 cards), and a peek
 * at one type's full result (see "Moving between layers" below).
 * URL params: ?lang=en|zh  ?preview=<typeId>  ?from=<typeId>  ?types=1
 */
(function () {
  'use strict';

  const content = globalThis.APT_CONTENT;
  const scoring = globalThis.APT_SCORING;
  const app = document.getElementById('app');

  // ---------------------------------------------------------------------
  // Startup checks
  // ---------------------------------------------------------------------
  if (!content || !scoring) {
    app.innerHTML = '<p class="load-error">The quiz content did not load. Check that content.js sits next to index.html.<br>' +
      '题目没加载出来，请确认 content.js 和 index.html 在同一个文件夹。</p>';
    return;
  }
  try {
    const problems = scoring.validateContent(content);
    if (problems.length) {
      // Not fatal: the editor sees this in the browser console while working.
      console.warn('[AI Purity Test] content.js has ' + problems.length + ' problem(s):\n- ' + problems.join('\n- '));
    }
  } catch (e) {
    console.warn('[AI Purity Test] could not check content.js:', e);
  }

  const INK = '#1C2541';
  const WHITE = '#FFFFFF';
  // v2: answers are { statementId: 'yes' | 'no' | 'unsure' } plus a position.
  // 'unsure' arrived later under the same key: an older v2 save only holds
  // 'yes' / 'no', which still load as they are. A v1 save (ticks per
  // section) lives under another key and is simply ignored.
  const STORE_KEY = 'apt-state-v2';
  const params = new URLSearchParams(location.search);
  const typesById = {};
  content.types.forEach((t) => { if (t && t.id) typesById[t.id] = t; });
  const dimsByKey = {};
  content.dimensions.forEach((d) => { if (d && d.key) dimsByKey[d.key] = d; });

  // Each statement's level inside its dimension (1 = mildest, 10 = most
  // extreme). scoring.js derives levels the same way: from the order in content.js.
  const statementsById = {};
  const LEVELS = {};
  const levelCounter = {};
  content.statements.forEach((s) => {
    if (!s || !s.id) return;
    statementsById[s.id] = s;
    levelCounter[s.dim] = (levelCounter[s.dim] || 0) + 1;
    LEVELS[s.id] = levelCounter[s.dim];
  });

  // The 50 statements in the order they are asked (mixed rounds, see scoring.js).
  const ORDER = scoring.questionOrder(content);

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  const state = {
    lang: pickLanguage(),
    screen: 'landing',   // 'landing' | 'question' | 'result'
    index: 0,            // position in ORDER while on the question screen
    // Every answer given so far: { s01: 'yes', s11: 'no', s23: 'unsure' }.
    // "no" and "unsure" are kept too, so going back can show what was picked;
    // only "yes" ever reaches scoring (see yesIds).
    answers: {},
    preview: typesById[params.get('preview')] ? params.get('preview') : null,
    from: typesById[params.get('from')] ? params.get('from') : null,
    // Set while the person taps a paired or secondary type on the result
    // screen to look at it. Not saved: a refresh goes back to their own result.
    peek: null,
    // True while the "all types" grid shows. Not saved either; the address
    // bar carries ?types=1 instead, so a refresh reopens the grid.
    gallery: params.get('types') === '1'
  };

  // The ids answered "yes": this is what scoring.score counts. "Not sure"
  // is left out, so it counts exactly like "Never".
  function yesIds() {
    return scoring.admittedIds(state.answers);
  }
  function answeredCount() {
    return Object.keys(state.answers).length;
  }

  function pickLanguage() {
    const forced = params.get('lang');
    if (forced === 'en' || forced === 'zh') return forced;
    const browser = (navigator.language || 'en').toLowerCase();
    return browser.startsWith('zh') ? 'zh' : 'en';
  }

  // sessionStorage keeps answers and position through a refresh. It can throw
  // (private mode, blocked storage), so every access is wrapped and the app
  // works without it.
  function saveState() {
    if (state.preview) return; // previews never overwrite a real run
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({
        answers: state.answers,
        screen: state.screen,
        index: state.index
      }));
    } catch (e) { /* storage unavailable: fine */ }
  }

  function restoreState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE_KEY));
      if (!saved) return;
      // Keep only answers that still match a statement and say yes, no or unsure.
      state.answers = scoring.cleanAnswers(saved.answers, content);
      if (['landing', 'question', 'result'].includes(saved.screen)) state.screen = saved.screen;
      if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < ORDER.length) state.index = saved.index;
    } catch (e) { /* nothing saved or storage blocked */ }
  }

  // localStorage holds exactly one thing: whether the hidden type has been
  // earned on this device (scoring.hiddenUnlocked / rememberHiddenUnlocked).
  // Even reaching window.localStorage can throw when storage is blocked.
  function deviceStorage() {
    try { return window.localStorage; } catch (e) { return null; }
  }

  // ---------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------

  // t('key', {n: 3}) -> the ui string in the current language, with {n} filled in.
  function t(key, vars) {
    const entry = content.ui[key];
    let text = entry ? (entry[state.lang] || entry.en || '') : key;
    if (vars) {
      Object.keys(vars).forEach((name) => { text = text.split('{' + name + '}').join(String(vars[name])); });
    }
    return text;
  }

  // Picks the current language from an {en, zh} pair.
  function L(pair) {
    return pair ? (pair[state.lang] || pair.en || '') : '';
  }

  // el('p', {class: 'x', text: 'hi'}, [children]) — builds DOM without innerHTML.
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.keys(attrs || {}).forEach((key) => {
      const value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'style') node.style.cssText = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  // WCAG contrast: pick dark ink or white text, whichever reads better on `hex`.
  function luminance(hex) {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }
  function contrast(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  function textColorOn(bg) {
    return contrast(bg, INK) >= contrast(bg, WHITE) ? INK : WHITE;
  }

  let toastTimer = null;
  function toast(message) {
    const node = document.getElementById('toast');
    node.textContent = message;
    node.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('is-on'), 2600);
  }

  // The current address with some parameters changed (null removes one).
  function urlWith(changes) {
    const next = new URLSearchParams(location.search);
    Object.keys(changes).forEach((key) => {
      if (changes[key] === null) next.delete(key);
      else next.set(key, changes[key]);
    });
    const query = next.toString();
    return location.pathname + (query ? '?' + query : '') + location.hash;
  }

  // Rewrites the address bar without reloading (keeps links and refreshes honest).
  function setUrlParams(changes) {
    try {
      // Keep history.state: it records which layers an entry shows (see
      // "Moving between layers"), and the language toggle must not erase that.
      history.replaceState(history.state, '', urlWith(changes));
    } catch (e) { /* some file:// setups refuse; not important */ }
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  function render(options) {
    const opts = options || {};
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hans' : 'en';
    document.title = t('appName');
    document.getElementById('brand').textContent = t('appName');
    document.getElementById('footerNote').textContent = t('footer');

    // The toggle shows the other language's name in that language. Its
    // accessible name starts with that visible word, then a hidden hint in
    // the current language ("中文 – Switch to Chinese").
    const toggle = document.getElementById('langToggle');
    toggle.replaceChildren(
      el('span', { lang: state.lang === 'zh' ? 'en' : 'zh-Hans', text: t('langSwitch') }),
      el('span', { class: 'visually-hidden', text: ' – ' + t('langSwitchLabel') })
    );

    // A peek or the grid sits on top of whatever screen is underneath.
    const layer = currentLayer();
    let screen;
    if (layer === 'peek') screen = renderResult();
    else if (layer === 'gallery') screen = renderGallery();
    else if (state.screen === 'question') screen = renderQuestion(opts.enter);
    else if (state.screen === 'result') screen = renderResult();
    else screen = renderLanding();

    const onQuestion = layer === 'base' && state.screen === 'question';
    app.classList.toggle('is-wide', !onQuestion);
    document.body.classList.toggle('layout-wide', !onQuestion);
    document.body.classList.toggle('on-question', onQuestion);
    // The landing page already shows the name huge, so the small one hides there.
    document.body.classList.toggle('on-landing', layer === 'base' && state.screen === 'landing');
    app.replaceChildren(screen);

    if (opts.moveFocus) {
      window.scrollTo(0, 0);
      // Send keyboard/screen-reader users to the new heading. On a question
      // that heading is the statement, so a screen reader reads it once.
      const heading = app.querySelector('[data-focus]');
      if (heading) heading.focus({ preventScroll: true });
    }
    saveState();
  }

  function go(screen) {
    state.screen = screen;
    render({ moveFocus: true });
  }

  // ---------- Landing ----------
  // Which type codes appear as stickers on the landing page, and their tilt.
  // Six stickers fill two even rows on a phone and two on a laptop.
  // Never the hidden type (soulmate): the grid one tap away shows it locked,
  // so a sticker with its code and colour would give the secret away.
  const TEASER_TYPES = ['bond_deep', 'work_deep', 'brain_lite', 'heart_lite', 'school_lite', 'heart_deep'];
  const TEASER_TILTS = [-6, 4, -2, 7, -4, 3];

  function sticker(type, extraClass, tilt, delay) {
    return el('span', {
      class: 'sticker' + (extraClass ? ' ' + extraClass : ''),
      style: '--sticker-bg:' + type.color + ';--sticker-fg:' + textColorOn(type.color) +
        ';--tilt:' + (tilt || 0) + 'deg;--delay:' + (delay || 0) + 'ms'
    }, [type.code]);
  }

  // "A friend got {name}. What are you?" with the name kept on one line.
  function fromFriendText(friend) {
    const parts = t('fromFriend').split('{name}');
    const children = [parts[0]];
    for (let i = 1; i < parts.length; i++) {
      children.push(el('span', { class: 'nowrap', text: L(friend.name) }), parts[i]);
    }
    return el('span', { class: 'from-friend-text' }, children);
  }

  function renderLanding() {
    const friend = state.from ? typesById[state.from] : null;

    const copy = el('div', { class: 'landing-copy' }, [
      friend && el('p', { class: 'from-friend' }, [
        sticker(friend, 'sticker-small', -4),
        fromFriendText(friend)
      ]),
      el('h1', { class: 'landing-title', tabindex: '-1', 'data-focus': true, text: t('appName') }),
      el('p', { class: 'lede', text: t('intro') }),
      el('p', { class: 'meta', text: t('meta') }),
      el('button', {
        class: 'btn btn-primary btn-big',
        type: 'button',
        onclick: () => { state.index = 0; go('question'); }
      }, [t('start')])
    ]);

    const stickers = TEASER_TYPES.filter((id) => typesById[id]).map((id, i) =>
      el('li', {}, [sticker(typesById[id], '', TEASER_TILTS[i % TEASER_TILTS.length], 120 + i * 70)]));

    const sheet = el('figure', { class: 'sticker-sheet' }, [
      el('ul', { 'aria-hidden': 'true' }, stickers),
      el('figcaption', {}, [
        el('span', { class: 'teaser-text', text: t('typesTeaser') }),
        typesLink('types-landing')
      ])
    ]);

    return el('section', { class: 'screen landing' }, [copy, sheet]);
  }

  // ---------- Question screens (one statement at a time) ----------
  const TICK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.2 4.2L19 7"/></svg>';
  const BACK_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">' +
    '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Timing of one answer: the picked button shows its tick for CONFIRM_MS,
  // then the card slides out for LEAVE_MS and the next one springs in (CSS).
  // With reduced motion there is no sliding, just a short pause on the tick.
  const CONFIRM_MS = 230;
  const LEAVE_MS = 140;
  const REDUCED_CONFIRM_MS = 160;

  // True while an answer is being confirmed, so a double tap (or a held key)
  // cannot answer the next statement before the person has seen it.
  let busy = false;

  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  // enter: 'next' | 'prev' | undefined — which side the card slides in from.
  function renderQuestion(enter) {
    const statement = ORDER[state.index];
    const dim = dimsByKey[statement.dim];
    const n = state.index + 1;
    const total = ORDER.length;
    const given = state.answers[statement.id]; // 'yes' | 'no' | 'unsure' | undefined

    const backBtn = el('button', {
      class: 'btn btn-ghost btn-icon q-back',
      type: 'button',
      'aria-label': t('back'),
      title: t('back'),
      onclick: goBack
    });
    backBtn.innerHTML = BACK_SVG; // static markup, not content

    // The bar shows how many statements lie behind you. When arriving from
    // a neighbour, it animates from that neighbour's width (--from).
    const pct = (i) => (i / total * 100).toFixed(2) + '%';
    const from = enter === 'next' ? state.index - 1 : (enter === 'prev' ? state.index + 1 : null);
    const fill = el('span', {
      class: from === null ? '' : 'is-moving',
      style: 'width:' + pct(state.index) + (from === null ? '' : ';--from:' + pct(from))
    });

    // Progress and purity are for the eyes; the statement heading below
    // carries "Statement 12 of 50" for screen readers instead.
    const head = el('div', { class: 'q-head' }, [
      backBtn,
      el('div', { class: 'q-progress', 'aria-hidden': 'true' }, [
        el('div', { class: 'q-bar' }, [fill]),
        el('span', { class: 'q-count', text: n + ' / ' + total })
      ]),
      el('p', { class: 'q-purity' }, [
        el('span', { class: 'q-purity-label', text: t('liveLabel') }),
        el('span', { class: 'q-purity-num', id: 'liveNum', text: String(currentScore().purity) })
      ])
    ]);

    const card = el('div', { class: 'q-card' + (enter ? ' enter-' + enter : '') }, [
      el('p', { class: 'q-dim', 'aria-hidden': 'true', text: L(dim.name) }),
      el('h1', { class: 'q-text', tabindex: '-1', 'data-focus': true }, [
        el('span', { class: 'visually-hidden', text: t('progress', { n: n, total: total }) + ', ' + L(dim.name) + ': ' }),
        el('span', { id: 'qStatement' }, statementPieces(L(statement.text)))
      ])
    ]);

    // "Never" sits on the left, "Guilty" on the right and the small "Not
    // sure" between them, so the arrow keys map onto them by position
    // (← ↓ →). The group is named by the statement.
    const answers = el('div', { class: 'q-answers', role: 'group', 'aria-labelledby': 'qStatement' }, [
      answerButton('no', given),
      answerButton('unsure', given),
      answerButton('yes', given)
    ]);

    // A fresh question screen fades in as a whole; moving between questions
    // only animates the card, so the header stays still.
    return el('section', { class: 'quiz' + (enter ? '' : ' screen') }, [
      head,
      el('div', { class: 'q-stage' }, [card]),
      el('div', { class: 'q-bottom' }, [
        answers,
        el('p', { class: 'q-keys', text: t('keysHint') })
      ])
    ]);
  }

  // Small typesetting fixes for the big statement text, so editors can write
  // plain text in content.js. Returns the children for the statement span.
  //  - English: a hyphen between letters becomes a non-breaking hyphen, so
  //    "pros-and-cons" never splits as "pros- / and-cons"; and "&" stays on
  //    the line of the word before it, so no line starts with "&".
  //  - Chinese: styles.css turns off breaking between Chinese characters
  //    (word-break: keep-all), and this adds a <wbr> (a "you may break here")
  //    after clause punctuation, around 「quotes」 and after a few small words
  //    that usually end a phrase. So lines break at "，" or after "的", not
  //    in the middle of a word ("毕 / 竟"). Nothing breaks inside a quote.
  //    Spaces become no-break spaces, so a Latin word stays with its
  //    neighbours ("让 AI 改" never splits as "让 / AI 改"). If no break point
  //    fits, the browser still breaks anywhere (overflow-wrap: anywhere), so
  //    nothing overflows; keep each clause short enough for one phone line
  //    (about 11 characters) and that never happens.
  const ZH_BREAK_AFTER = /[，、：；。！？」…的着把给和]/;

  function statementPieces(text) {
    if (state.lang !== 'zh') {
      return [text.replace(/(\w)-(\w)/g, '$1‑$2').replace(/ &/g, ' &')];
    }
    const chars = Array.from(text.replace(/ /g, ' '));
    const pieces = [];
    let run = '';
    let inQuote = false;
    const flush = () => { pieces.push(run, el('wbr')); run = ''; };
    chars.forEach((ch, i) => {
      if (ch === '「') {
        if (run) flush();
        inQuote = true;
      }
      if (ch === '」') inQuote = false;
      run += ch;
      const next = chars[i + 1];
      // Never break right before closing punctuation ("……」" stays together),
      // before a space (the next line would start with a gap), or before a
      // single character that ends its clause ("分钟的 / 课，" would look lost).
      const afterNext = chars[i + 2] || '';
      if (next && !inQuote && ZH_BREAK_AFTER.test(ch) && !NO_LINE_START.test(next) &&
          !/\s/.test(next) && !NO_LINE_START.test(afterNext)) flush();
    });
    if (run) pieces.push(run);
    return pieces;
  }

  // One answer button. aria-pressed shows (and announces) the answer
  // already given when someone comes back to a statement; the tick icon
  // shows it without relying on colour.
  // "unsure" is the small, quiet one in the middle (styles.css .btn-unsure).
  // (The t('...') calls are written out in full: tests/content.test.js finds
  // the ui keys app.js uses by searching for them.)
  function answerText(value) {
    if (value === 'yes') return t('answerYes');
    if (value === 'no') return t('answerNo');
    return t('answerUnsure');
  }
  const ANSWER_KEY = { yes: 'Y', no: 'N', unsure: '↓' };

  function answerButton(value, given) {
    const tick = el('span', { class: 'answer-tick', 'aria-hidden': 'true' });
    tick.innerHTML = TICK_SVG; // static markup, not content
    // The tick hangs inside the label, so the label can stay centred.
    return el('button', {
      class: 'btn-answer' + (value === 'unsure' ? ' btn-unsure' : ''),
      type: 'button',
      'data-answer': value,
      'aria-pressed': given === value ? 'true' : 'false',
      onclick: () => answer(value)
    }, [
      el('span', { class: 'answer-label' }, [tick, answerText(value)]),
      el('kbd', { class: 'answer-key', 'aria-hidden': 'true', text: ANSWER_KEY[value] })
    ]);
  }

  function answer(value) {
    if (busy || state.screen !== 'question') return;
    const statement = ORDER[state.index];
    state.answers[statement.id] = value;
    saveState();
    busy = true;

    // 1. Confirmation: the picked button fills in and draws its tick, and the
    //    purity number drops (on "yes") with a little bump.
    app.querySelectorAll('.btn-answer').forEach((btn) => {
      const picked = btn.getAttribute('data-answer') === value;
      btn.setAttribute('aria-pressed', picked ? 'true' : 'false');
      btn.classList.toggle('is-confirming', picked);
    });
    updateLive(value === 'yes');

    // 2. The card slides out, 3. the next statement (or the result) comes in.
    const reduce = reducedMotion();
    setTimeout(() => {
      const card = app.querySelector('.q-card');
      if (card && !reduce) {
        // Drop the entrance animation first: while an animation is attached
        // it wins over the leaving transition (see styles.css).
        card.classList.remove('enter-next', 'enter-prev');
        card.classList.add('is-leaving');
      }
      setTimeout(() => {
        busy = false;
        if (state.screen !== 'question') return; // e.g. a preview link took over
        if (state.index >= ORDER.length - 1) {
          go('result');
        } else {
          state.index += 1;
          render({ moveFocus: true, enter: 'next' });
        }
      }, reduce ? 0 : LEAVE_MS);
    }, reduce ? REDUCED_CONFIRM_MS : CONFIRM_MS);
  }

  // Back one statement (its answer stays and is shown); from the first one,
  // back to the landing page.
  function goBack() {
    if (busy || state.screen !== 'question') return;
    if (state.index === 0) {
      go('landing');
      return;
    }
    state.index -= 1;
    render({ moveFocus: true, enter: 'prev' });
  }

  // Keyboard: Y / N answer, as do the arrows (← = Never, → = Guilty, matching
  // where the buttons sit). ↓ = Not sure: it is the key between ← and → on
  // every keyboard, like the button between the two. Space was not used: on
  // a focused button it already clicks that button, so it would answer
  // twice; U was not used: it sits right next to Y.
  // Backspace goes back. Enter / Space on a focused button work as usual,
  // because they are real buttons.
  // Any held modifier (Shift, Alt, Ctrl, Cmd) means the key is meant for
  // something else, e.g. Shift+arrow selects text, so it never answers.
  // Uppercase "Y" / "N" are still accepted: Caps Lock gives those without
  // setting shiftKey.
  document.addEventListener('keydown', (event) => {
    // Only on a question, and not while "all types" sits on top of it.
    if (state.screen !== 'question' || currentLayer() !== 'base') return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
    if (document.querySelector('.overlay')) return;
    const key = event.key;
    if (key === 'y' || key === 'Y' || key === 'ArrowRight') {
      event.preventDefault();
      if (!event.repeat) answer('yes');
    } else if (key === 'n' || key === 'N' || key === 'ArrowLeft') {
      event.preventDefault();
      if (!event.repeat) answer('no');
    } else if (key === 'ArrowDown') {
      // ↓ is also the browser's scroll key. On a short or zoomed window the
      // question can be taller than the screen, so while there is still page
      // below, let ↓ scroll as usual; it answers only once the bottom is in
      // view. (A held ↓ that reaches the bottom still answers nothing: repeat.)
      const below = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      if (below > 1) return;
      event.preventDefault();
      if (!event.repeat) answer('unsure');
    } else if (key === 'Backspace') {
      event.preventDefault();
      goBack();
    }
  });

  function currentScore() {
    return scoring.score(yesIds(), content);
  }

  // Updates the running purity number in place after an answer.
  function updateLive(bump) {
    const num = document.getElementById('liveNum');
    if (!num) return;
    num.textContent = String(currentScore().purity);
    if (bump) {
      num.classList.remove('bump');
      void num.offsetWidth; // restart the CSS animation
      num.classList.add('bump');
    }
  }

  // ---------- Result ----------

  /*
   * Sample players, used by ?preview=<typeId> and when someone taps another
   * type on the result screen to look at it. Each is a believable set of
   * "Guilty" answers (statement numbers: school 1-10, adulting 11-20,
   * heart 21-30, brain 31-40, bond 41-50) that scoring.js really scores as
   * that type. So a preview shows real evidence, a real match and, for
   * school_lite, soulmate and merged, a real secondary type, instead of
   * numbers made up to look right. If a rule change ever moves one of them,
   * the console says so (see renderResult).
   */
  function numbersFrom(a, b) {
    const out = [];
    for (let n = a; n <= b; n++) out.push(n);
    return out;
  }
  const SAMPLE_ANSWERS = {
    untouched:   [1, 32],
    // Leaves out s30 on purpose: with all three hidden statements the sample
    // would show the locked hidden type as its "Also" chip.
    merged:      [].concat(numbersFrom(1, 9), numbersFrom(11, 19), numbersFrom(21, 28), numbersFrom(31, 38), numbersFrom(41, 50)),
    balanced:    [1, 2, 3, 5, 11, 12, 13, 15, 21, 22, 23, 24, 31, 32, 33, 35, 41, 42, 43, 44],
    soulmate:    [30, 49, 50, 41, 43, 21],
    school_lite: [1, 2, 3, 4, 5, 6, 11, 21, 22, 23, 24, 25, 41],
    school_deep: [1, 2, 3, 4, 5, 6, 7, 8, 21, 22, 32, 41],
    work_lite:   [11, 12, 13, 14, 16, 18, 1, 32],
    work_deep:   [].concat(numbersFrom(11, 20), [1, 21, 33]),
    heart_lite:  [21, 23, 25, 28, 41, 1],
    heart_deep:  [].concat(numbersFrom(21, 29), [11, 12, 41, 31]),
    brain_lite:  [31, 32, 33, 34, 35, 36, 1, 21, 41],
    brain_deep:  [].concat(numbersFrom(31, 38), [40, 1, 11, 41, 42]),
    bond_lite:   [41, 42, 44, 45, 1, 32],
    bond_deep:   [].concat(numbersFrom(41, 48), [21, 1, 2, 31])
  };
  function sampleIds(typeId) {
    return (SAMPLE_ANSWERS[typeId] || []).map((n) => 's' + String(n).padStart(2, '0'));
  }

  // "school_lite" -> "school"; null for the four special types.
  function dimOfType(typeId) {
    return typeId && typeId.indexOf('_') > 0 ? typeId.split('_')[0] : null;
  }

  // Word for a statement's weight class, from its level (thresholds from scoring.js).
  function weightWord(level) {
    if (level >= scoring.RULES.extremeFrom) return t('levelExtreme');
    if (level >= scoring.RULES.mediumFrom) return t('levelMedium');
    return t('levelMild');
  }
  function weightClass(level) {
    if (level >= scoring.RULES.extremeFrom) return 'w3';
    if (level >= scoring.RULES.mediumFrom) return 'w2';
    return 'w1';
  }

  function bandWord(band) {
    if (band === 'high') return t('bandHigh');
    if (band === 'mid') return t('bandMid');
    if (band === 'low') return t('bandLow');
    return t('bandNone');
  }

  // ---------- Moving between layers: the screen, all types, a peek ----------
  /*
   * Up to three layers sit on top of each other:
   *   base:    the current screen (landing, a question or the result)
   *   gallery: "all types", the grid of the 14 cards (state.gallery)
   *   peek:    one type's full result, played by its sample player
   *            (state.peek), opened from the result screen or from the grid
   * Each step up adds one browser-history entry, so the phone's back gesture
   * and the in-page back buttons both step down again, to the same scroll
   * position and the same button that was tapped. Peeking from one type to
   * another (a pairing card inside a peek) replaces the entry instead, so
   * one back always leaves the peek.
   *
   * history.state = { aptDepth, aptGallery, aptPeek } for each entry.
   * aptDepth counts the entries this page pushed below it. At depth 0 there
   * is nothing of ours to go back to (the grid was opened straight from
   * ?types=1), so the in-page back closes the layer in place instead of
   * leaving the site.
   */
  const LAYER_RANK = { base: 0, gallery: 1, peek: 2 };
  // Where each lower layer was left: { y: scroll position, nav: the
  // data-nav key of the button that opened the next layer }.
  const layerMemory = {};
  // True between an in-page back and the popstate it causes (see below).
  let steppingBack = false;

  function currentLayer() {
    if (state.peek) return 'peek';
    if (state.gallery) return 'gallery';
    return 'base';
  }

  function historyDepth() {
    const entry = history.state;
    return entry && Number.isInteger(entry.aptDepth) ? entry.aptDepth : 0;
  }

  function historyEntry(depth) {
    return { aptDepth: depth, aptGallery: state.gallery, aptPeek: state.peek };
  }

  // While the grid (or a type opened from it) shows, the address carries
  // ?types=1, so a refresh or a copied address reopens the grid.
  function layerUrl() {
    return urlWith({ types: state.gallery ? '1' : null });
  }

  function navKeyOf(node) {
    const owner = node && node.closest ? node.closest('[data-nav]') : null;
    return owner ? owner.getAttribute('data-nav') : null;
  }

  // Shows the given layers. Going up, the layer left behind is remembered
  // and the new one starts at the top with focus on its heading (render
  // does that). Going down, the remembered scroll position comes back and
  // focus returns to the button that opened the layer above.
  function showLayers(gallery, peek) {
    const before = currentLayer();
    const leaving = { y: window.scrollY, nav: navKeyOf(document.activeElement) };
    state.gallery = gallery;
    state.peek = peek;
    const after = currentLayer();
    if (LAYER_RANK[after] > LAYER_RANK[before]) layerMemory[before] = leaving;
    render({ moveFocus: true });
    if (LAYER_RANK[after] < LAYER_RANK[before]) {
      const saved = layerMemory[after];
      if (!saved) return;
      window.scrollTo(0, saved.y);
      const opener = saved.nav && app.querySelector('[data-nav="' + saved.nav + '"]');
      if (opener) opener.focus({ preventScroll: true });
    }
  }

  // One layer up, with its own history entry. The entry is pushed BEFORE
  // the new layer renders: pushing stores the current scroll position in
  // the entry being left, and the browser puts that position back when the
  // person comes back to it. Pushed after the render, it would store the top.
  function pushLayers(gallery, peek) {
    const entry = { aptDepth: historyDepth() + 1, aptGallery: gallery, aptPeek: peek };
    try {
      history.pushState(entry, '', urlWith({ types: gallery ? '1' : null }));
    } catch (e) { /* file:// may refuse; in-page back still works */ }
    showLayers(gallery, peek);
  }

  // One layer down: the in-page back buttons.
  function closeLayer() {
    if (historyDepth() > 0) {
      steppingBack = true;
      history.back(); // the popstate handler below does the rest
      return;
    }
    // Opened straight from ?types=1: nothing of ours behind it, so step
    // down in place and rewrite this entry.
    showLayers(state.peek ? state.gallery : false, null);
    try { history.replaceState(historyEntry(0), '', layerUrl()); } catch (e) { /* not important */ }
  }

  function openGallery() {
    if (currentLayer() === 'gallery') return;
    pushLayers(true, null);
  }

  // The type the result screen shows when nobody is peeking.
  function baseTypeId() {
    return state.preview || currentScore().typeId;
  }

  // The player's own type, when the screen underneath is their real result
  // (not a ?preview= sample). The grid marks it "you".
  function ownTypeId() {
    return state.screen === 'result' && !state.preview ? currentScore().typeId : null;
  }

  // May the hidden type show its code and name? Yes once earned on this
  // device, or right now if the player's own result underneath earned it
  // (so blocked storage cannot hide it). Used by the grid and the pairing
  // cards, so neither can be a way around the lock.
  function hiddenOpenNow() {
    return scoring.hiddenUnlocked(deviceStorage()) ||
      (ownTypeId() !== null && scoring.earnedHidden(currentScore()));
  }

  function peekAt(typeId) {
    if (!typesById[typeId]) return;
    // The hidden type cannot be opened before it is earned, whatever links to
    // it. (?preview=soulmate, for QA, does not go through here.)
    if (typeId === 'soulmate' && !hiddenOpenNow()) return;
    // Peeking from the result screen at the type underneath: just go back to it.
    if (state.peek && !state.gallery && state.screen === 'result' && typeId === baseTypeId()) { closeLayer(); return; }
    if (!state.peek) { pushLayers(state.gallery, typeId); return; }
    state.peek = typeId;
    render({ moveFocus: true });
    try { history.replaceState(historyEntry(historyDepth()), '', layerUrl()); } catch (e) { /* not important */ }
  }

  window.addEventListener('popstate', (event) => {
    const entry = event.state || {};
    const gallery = Boolean(entry.aptGallery);
    const peek = typesById[entry.aptPeek] ? entry.aptPeek : null;
    if (gallery === state.gallery && peek === state.peek) {
      // An in-page back landed on an entry that shows the same thing (this
      // happens after a refresh, which drops a peek but keeps its entry):
      // keep going, so the button never seems to do nothing.
      if (steppingBack && historyDepth() > 0) { history.back(); return; }
      steppingBack = false;
      return;
    }
    steppingBack = false;
    showLayers(gallery, peek);
    // The entry's address may still carry an older ?lang= if the language
    // was switched further up.
    setUrlParams({ lang: state.lang });
  });

  // Label of a button that returns to the screen underneath everything.
  function baseBackLabel() {
    if (state.screen === 'result') {
      return state.preview ? t('peekBackTo', { code: typesById[state.preview].code }) : t('peekBack');
    }
    if (state.screen === 'question') return t('typesBackQuiz');
    return t('typesBackHome');
  }

  // A link that opens the grid. A real link (?types=1), so it can also be
  // opened in a new tab; a plain click opens the grid in place.
  function typesLink(navKey) {
    return el('a', {
      class: 'types-link',
      href: urlWith({ types: '1', lang: state.lang }),
      'data-nav': navKey,
      onclick: (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        openGallery();
      }
    }, [t('typesLink'), el('span', { class: 'types-link-arrow', 'aria-hidden': 'true', text: '→' })]);
  }

  /*
   * The result screen, top to bottom (one column on a phone; on a laptop the
   * card and its buttons stay pinned on the left and everything else runs
   * down the right):
   *   1. the card (with match and the secondary chip), then save, copy, share
   *      right under it: saving the card is the main thing people do here
   *   2. why you got this: the rule in one line, then the player's own answers
   *   3. the roast   4. telltale signs   5. superpower, weak spot, "your AI says"
   *   6. section by section   7. the other leaning   8. gets on with / clashes with
   *   9. start over, and "how this is scored"
   * Everything comes from one scoring.score() call, so what the screen says
   * and what the rules decided can never disagree.
   */
  function renderResult() {
    // A sample player stands in for ?preview= and while peeking at another type.
    const sampleType = state.peek || state.preview;
    const ticked = sampleType ? sampleIds(sampleType) : yesIds();
    const result = scoring.score(ticked, content);
    if (sampleType && result.typeId !== sampleType) {
      console.warn('[AI Purity Test] the sample answers for "' + sampleType + '" now score as "' +
        result.typeId + '". Update SAMPLE_ANSWERS in app.js.');
    }
    const typeId = sampleType || result.typeId;
    const type = typesById[typeId];
    const model = buildCardModel(type, result);
    const isSample = Boolean(sampleType);
    // A real result that met the hidden type unlocks its card in the grid,
    // on this device, for good. Previews and peeks never do.
    if (!isSample && scoring.earnedHidden(result)) scoring.rememberHiddenUnlocked(deviceStorage());

    document.title = type.code + ' ' + L(type.name) + ' | ' + t('appName');

    const typeVars = '--type-bg:' + type.color + ';--type-fg:' + textColorOn(type.color);

    // While peeking, the actions would save or share a type the person did
    // not get, so they are left out (the way back sits at the bottom instead).
    const left = el('div', { class: 'result-left' }, [
      state.preview && !state.peek && el('p', { class: 'preview-badge', text: t('previewBadge') }),
      el('div', { class: 'card-wrap' }, [buildCardDom(model)]),
      !state.peek && renderActions(model)
    ]);

    const body = el('div', { class: 'result-body', style: typeVars }, [
      renderVerdict(type, result, isSample),
      el('p', { class: 'roast', text: L(type.roast) }),
      renderSigns(type),
      el('dl', { class: 'traits' }, [
        el('div', {}, [el('dt', { text: t('superpower') }), el('dd', { text: L(type.superpower) })]),
        el('div', {}, [el('dt', { text: t('weakness') }), el('dd', { text: L(type.weakness) })])
      ]),
      el('figure', { class: 'ai-says' }, [
        el('figcaption', { text: t('aiSays') }),
        el('blockquote', { class: 'bubble', text: L(type.aiSays) })
      ]),
      renderDimensions(type, result, new Set(ticked), isSample),
      renderSecondary(type, result),
      renderPairs(type),
      state.peek
        ? renderPeekBack('peek-back-bottom')
        : el('div', { class: 'result-end' }, [
          el('button', { class: 'btn-text', type: 'button', onclick: startOver }, [t('startOver')]),
          typesLink('types-end')
        ]),
      renderHowScored()
    ]);

    return el('section', { class: 'screen result', 'aria-label': t('resultHeading') }, [
      state.peek && renderPeekBar(),
      left,
      body
    ]);
  }

  // A small all-caps heading over each part of the result.
  function kicker(text) {
    return el('h2', { class: 'kicker', text: text });
  }

  // 2. "Why you got this": the verdict (the type's `why`), the exhibits (the
  // player's own answers, most extreme first) and what the match number means.
  function renderVerdict(type, result, isSample) {
    const evidence = result.evidenceIds.map((id) => statementsById[id]).filter(Boolean);

    let lead;
    if (isSample) lead = t('evidenceLeadSample');
    else if (type.id === 'soulmate') lead = t('evidenceLeadHidden');
    else if (type.id === 'untouched') {
      // Up to 4 mild answers, but only 3 exhibits: say so instead of "everything".
      lead = result.total > evidence.length ? t('evidenceLeadSome', { n: result.total }) : t('evidenceLeadOnly');
    } else if (type.id === 'merged' || type.id === 'balanced') lead = t('evidenceLeadSpread', { n: result.total });
    else lead = t('evidenceLead');

    const letters = ['A', 'B', 'C', 'D', 'E'];
    const exhibits = evidence.length
      ? el('ol', { class: 'exhibits' }, evidence.map((s, i) => {
        const level = LEVELS[s.id];
        return el('li', { class: 'exhibit' }, [
          el('span', { class: 'exhibit-tag', 'aria-hidden': 'true', text: letters[i] }),
          el('div', { class: 'exhibit-body' }, [
            el('p', { class: 'exhibit-meta' }, [
              el('span', { class: 'visually-hidden', text: t('exhibitLabel', { n: letters[i] }) + ': ' }),
              t('exhibitMeta', { dim: L(dimsByKey[s.dim].name), level: level, weight: weightWord(level) })
            ]),
            // Same line-break rules as the big statement on the question screen.
            el('p', { class: 'exhibit-text' }, statementPieces(L(s.text)))
          ])
        ]);
      }))
      : el('p', { class: 'exhibit-none', text: t('evidenceNone') });

    return el('section', { class: 'verdict' }, [
      kicker(t('whyTitle')),
      el('p', { class: 'verdict-why', text: L(type.why) }),
      el('p', { class: 'exhibits-lead', text: lead }),
      exhibits,
      el('p', { class: 'verdict-match' }, [
        el('strong', { text: t('matchHeading', { n: result.match }) }),
        state.lang === 'zh' ? '' : ' ',
        isSample ? t('matchSample') : matchText(type, result)
      ]),
      !isSample && unsureLine()
    ]);
  }

  // One quiet line under the match, only when the player answered "Not
  // sure" at least once: how many, and that they counted as Never. From
  // scoring.UNSURE_MANY on, one more sentence: the purity is probably kind.
  // The card and the PNG never mention it.
  function unsureLine() {
    const n = scoring.unsureCount(state.answers);
    if (n === 0) return null;
    let text = t('unsureNote', { n: n });
    if (n >= scoring.UNSURE_MANY) text += (state.lang === 'zh' ? '' : ' ') + t('unsureMany');
    return el('p', { class: 'verdict-unsure', text: text });
  }

  // "1 point" / "8 points" (Chinese: "8 分").
  function pts(n) {
    return n === 1 ? t('pointOne', { n: n }) : t('pointMany', { n: n });
  }

  // What the match number means for this player, in their own numbers
  // (see SCORING.md, section 6). Never repeats the number itself: it sits
  // in bold right before this sentence.
  function matchText(type, result) {
    if (type.id === 'untouched') return t('matchUntouched');
    if (type.id === 'merged') return t('matchMerged');
    if (type.id === 'soulmate') return t('matchSoulmate');
    if (type.id === 'balanced') {
      // The depth gap between the heaviest and lightest touched section, in points.
      const touched = scoring.DIM_KEYS.filter((k) => result.perDim[k] > 0).map((k) => result.points[k]);
      const gap = Math.max.apply(null, touched) - Math.min.apply(null, touched);
      return gap === 0 ? t('matchBalancedExact') : t('matchBalanced', { gap: pts(gap) });
    }

    // A section type: the lead against the next section.
    const lead = result.dominantDim;
    const next = result.runnerUpDim;
    const vars = {
      dim: L(dimsByKey[lead].name),
      dim2: next ? L(dimsByKey[next].name) : '',
      a: result.points[lead],
      b: next ? result.points[next] : 0
    };
    let text;
    if (!next) text = t('matchDimAlone', vars);
    else if (result.tieBreak === 'top') text = t('matchTieTop', vars);
    else if (result.tieBreak === 'count') text = t('matchTieCount', vars);
    else if (result.tieBreak === 'order') text = t('matchTieOrder', vars);
    else text = t('matchDim', vars);
    // One or two answers cannot prove much: scoring.js capped the number.
    if (result.matchCap) {
      const capLine = result.perDim[lead] === 1
        ? t('matchCapOne', { cap: result.matchCap })
        : t('matchCapTwo', { cap: result.matchCap });
      text += (state.lang === 'zh' ? '' : ' ') + capLine; // no space between Chinese sentences
    }
    return text;
  }

  // 4. Three telltale signs.
  function renderSigns(type) {
    if (!Array.isArray(type.signs) || !type.signs.length) return null;
    return el('section', { class: 'r-section' }, [
      kicker(t('signsTitle')),
      el('ul', { class: 'signs' }, type.signs.map((sign) => el('li', { text: L(sign) })))
    ]);
  }

  // 6. Each section: its ten statements as squares that grow with their
  // weight (filled = admitted), its points, and the one-line read for its band.
  // On a sample (preview or peek) the reads are left out: they talk to "you".
  function renderDimensions(type, result, ticked, isSample) {
    // Tag the sections that decided a section type and its secondary. Every
    // section tied for the top gets "Tied", so a tie is never hidden: for a
    // section type that is the lead's twin, for balanced the 3+ tied sections.
    const leadDim = dimOfType(type.id);
    // Only where the tie decided something: the lead of a section type, or
    // the three-or-more-way tie that made the type balanced.
    const tieMatters = leadDim || (type.id === 'balanced' && result.tiedDims.length >= scoring.RULES.balancedTieMin);
    const tied = new Set(tieMatters ? result.tiedDims : []);
    const secondDim = leadDim ? dimOfType(result.secondaryTypeId) : null;

    const rows = content.dimensions.map((d) => {
      const n = result.perDim[d.key] || 0;
      const p = result.points[d.key] || 0;
      const band = result.band[d.key];
      const squares = content.statements.filter((s) => s.dim === d.key).map((s) =>
        el('i', { class: weightClass(LEVELS[s.id]) + (ticked.has(s.id) ? ' on' : '') }));
      let tag = null;
      if (d.key === leadDim) tag = el('span', { class: 'dim-tag is-lead', text: t('dimLeads') });
      else if (tied.has(d.key)) tag = el('span', { class: 'dim-tag', text: t('dimTied') });
      else if (d.key === secondDim) tag = el('span', { class: 'dim-tag', text: t('dimSecond') });

      return el('li', { class: 'dim-row' + (d.key === leadDim ? ' is-lead' : '') }, [
        el('div', { class: 'dim-top' }, [
          el('span', { class: 'dim-name', text: L(d.name) }),
          tag,
          el('span', { class: 'dim-meta', 'aria-hidden': 'true', text: t('dimRowMeta', { n: n, pts: pts(p), band: bandWord(band) }) })
        ]),
        el('span', {
          class: 'dim-squares', role: 'img',
          'aria-label': t('dimAria', { name: L(d.name), n: n, pts: pts(p), band: bandWord(band) })
        }, squares),
        !isSample && d.reads && d.reads[band] && el('p', { class: 'dim-read', text: L(d.reads[band]) })
      ]);
    });

    return el('section', { class: 'r-section' }, [
      kicker(t('dimsTitle')),
      el('p', { class: 'dims-note', text: t('dimsNote') }),
      isSample && el('p', { class: 'dims-sample', text: t('dimsSample') }),
      el('ol', { class: 'dims' }, rows)
    ]);
  }

  // Returns `text` as nodes in which each of `phrases` (a type code or name)
  // sits in a no-wrap span, so "HAHA-OK" or 「潜台词翻译官」 never splits
  // across two lines.
  function keepWhole(text, phrases) {
    let nodes = [text];
    phrases.filter(Boolean).forEach((phrase) => {
      nodes = nodes.flatMap((node) => {
        if (typeof node !== 'string') return [node];
        const parts = node.split(phrase);
        const out = [parts[0]];
        for (let i = 1; i < parts.length; i++) out.push(el('span', { class: 'nowrap', text: phrase }), parts[i]);
        return out;
      });
    });
    return nodes.filter((n) => n !== '');
  }

  // A type code as a small coloured label, like the stickers on the landing page.
  function chip(type) {
    return el('span', {
      class: 'chip',
      style: '--chip-bg:' + type.color + ';--chip-fg:' + textColorOn(type.color)
    }, [type.code]);
  }

  // 7. The runner-up leaning, when scoring.js found one.
  function renderSecondary(type, result) {
    const sec = typesById[result.secondaryTypeId];
    if (!sec) return null;
    const vars = { code: sec.code, name: L(sec.name) };
    let line;
    if (type.id === 'soulmate') line = t('secondarySoulmate', vars);
    else if (type.id === 'merged') line = t('secondaryMerged', vars);
    else {
      // A section type: name both sections and give the real points.
      const secDim = dimOfType(sec.id);
      const leadDim = result.dominantDim;
      Object.assign(vars, {
        dim: L(dimsByKey[secDim].name),
        leadDim: L(dimsByKey[leadDim].name),
        a: result.points[leadDim],
        b: result.points[secDim]
      });
      line = vars.a === vars.b ? t('secondaryTie', vars) : t('secondaryDim', vars);
    }

    return el('section', { class: 'r-section secondary' }, [
      kicker(t('secondaryTitle')),
      el('div', { class: 'secondary-row' }, [
        chip(sec),
        el('div', {}, [
          el('p', { class: 'secondary-line' }, keepWhole(line, [sec.code, L(sec.name)])),
          el('button', { class: 'btn-text btn-see', type: 'button', 'data-nav': 'see-' + sec.id, onclick: () => peekAt(sec.id) },
            [t('seeType', { code: sec.code }), el('span', { 'aria-hidden': 'true', text: ' →' })])
        ])
      ])
    ]);
  }

  // 8. Gets on with / clashes with. Each is one big button that opens that type.
  function renderPairs(type) {
    function pair(kind, otherId, line) {
      const other = typesById[otherId];
      if (!other) return null;
      // MY-BOT "gets on with" the hidden type. Until it is earned, that card
      // looks like the locked grid card: not a button, no code, no name.
      if (otherId === 'soulmate' && !hiddenOpenNow()) {
        return el('div', { class: 'pair is-locked' }, [
          el('span', { class: 'pair-kicker', text: kind }),
          el('span', { class: 'pair-head' }, [
            el('span', { class: 'chip chip-locked', 'aria-hidden': 'true', text: '???' }),
            el('span', { class: 'pair-name', text: t('typesHidden') })
          ]),
          el('span', { class: 'visually-hidden', text: t('typesLocked') + '. ' }),
          el('span', { class: 'pair-line' }, statementPieces(t('typesLockedHint')))
        ]);
      }
      return el('button', { class: 'pair', type: 'button', 'data-nav': 'pair-' + otherId, onclick: () => peekAt(otherId) }, [
        el('span', { class: 'pair-kicker', text: kind }),
        el('span', { class: 'pair-head' }, [chip(other), el('span', { class: 'pair-name', text: L(other.name) })]),
        el('span', { class: 'pair-line', text: L(line) }),
        el('span', { class: 'pair-go', 'aria-hidden': 'true', text: '→' })
      ]);
    }
    const best = pair(t('bestWithTitle'), type.bestWith, type.bestWithLine);
    const clash = pair(t('clashWithTitle'), type.clashWith, type.clashWithLine);
    if (!best && !clash) return null;
    return el('section', { class: 'r-section' }, [
      // The way to all fourteen sits just above the two pairings (not under
      // them: the second link, next to Start over, follows right after).
      // Left out on a peek, where the way back is the bar on top.
      !state.peek && el('p', { class: 'types-more' }, [typesLink('types-pairs')]),
      el('div', { class: 'pairs' }, [best, clash])
    ]);
  }

  // 1b. Under the card: Save image is the main action; Copy link and Share
  // sit side by side under it. (Start over lives at the bottom of the page.)
  function renderActions(model) {
    const row = [el('button', { class: 'btn btn-ghost', type: 'button', onclick: copyLink }, [t('copyLink')])];
    if (navigator.share) {
      row.push(el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => shareResult(model) }, [t('share')]));
      prepareShareFile(model);
    }
    return el('div', { class: 'result-actions' }, [
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn-primary', type: 'button', onclick: () => saveImage(model) }, [t('saveImage')]),
        el('div', { class: 'actions-row' }, row)
      ])
    ]);
  }

  // "How this is scored": six plain sentences, closed until tapped.
  function renderHowScored() {
    return el('details', { class: 'how' }, [
      el('summary', { text: t('howTitle') }),
      el('ol', {}, [
        el('li', { text: t('howWeights') }),
        el('li', { text: t('howUnsure') }),
        el('li', { text: t('howLead') }),
        el('li', { text: t('howSpecial') }),
        el('li', { text: t('howSecondary') }),
        el('li', { text: t('howHonest') })
      ])
    ]);
  }

  // While peeking: a bar on top saying whose result this is, with the way back.
  function renderPeekBar() {
    const peeked = typesById[state.peek];
    return el('div', { class: 'peek-bar' }, [
      el('p', { class: 'peek-note', tabindex: '-1', 'data-focus': true, text: t('peekNote', { code: peeked.code }) }),
      renderPeekBack('')
    ]);
  }
  // Opened from the grid, the way back leads to the grid; otherwise to the
  // screen underneath (normally the player's own result).
  function renderPeekBack(extraClass) {
    const label = state.gallery ? t('typesBack') : baseBackLabel();
    return el('button', { class: 'btn btn-peek-back ' + extraClass, type: 'button', onclick: closeLayer }, [label]);
  }

  // ---------- All types: the grid of the 14 cards ----------
  /*
   * Each card is a small copy of the result card: the type's colour, a
   * small top line (which section and depth, or the rule for the four
   * special types), the code as large as the card allows, the name and the
   * tagline. Tapping one opens that type as a peek; the player's own card
   * (marked "you") goes back to their real result instead. The hidden type
   * stays a locked card until it has been earned on this device.
   *
   * Order (scoring.galleryOrder): the ten section types, light then deep
   * per section, so on a phone each row is one section and on a laptop the
   * light ones run along the top row and the deep ones under them; then the
   * four special types, the hidden one last.
   */
  // Largest code size on a grid card, in % of the card's inner width. Short
  // codes ("404") would otherwise fill half the card.
  const TILE_CODE_MAX = 34;

  function renderGallery() {
    const order = scoring.galleryOrder();
    const own = ownTypeId();
    const hiddenOpen = hiddenOpenNow();

    document.title = t('typesTitle') + ' | ' + t('appName');

    function group(title, ids, extraClass) {
      return el('section', { class: 'types-group ' + extraClass }, [
        kicker(title),
        el('ul', { class: 'types-grid' }, ids.filter((id) => typesById[id]).map((id) =>
          el('li', {}, [typeTile(typesById[id], id === own, hiddenOpen)])))
      ]);
    }

    return el('section', { class: 'screen types' }, [
      el('div', { class: 'types-head' }, [
        galleryBack('types-back-top'),
        el('h1', { class: 'types-title', tabindex: '-1', 'data-focus': true, text: t('typesTitle') }),
        el('p', { class: 'types-intro', text: t('typesIntro') })
      ]),
      group(t('typesSections'), order.sections, 'is-sections'),
      group(t('typesSpecial'), order.special, 'is-special'),
      galleryBack('types-back-bottom')
    ]);
  }

  function galleryBack(extraClass) {
    return el('button', { class: 'btn btn-ghost types-back ' + extraClass, type: 'button', onclick: closeLayer }, [
      el('span', { 'aria-hidden': 'true', text: '←' }),
      baseBackLabel()
    ]);
  }

  // The small line at the top of a grid card.
  function tileLabel(type) {
    const dim = dimOfType(type.id);
    if (dim) {
      const depth = type.id.slice(-5) === '_deep' ? t('typesDeep') : t('typesLite');
      return L(dimsByKey[dim].name) + ' · ' + depth;
    }
    if (type.id === 'untouched') return t('typesRuleUntouched');
    if (type.id === 'balanced') return t('typesRuleBalanced');
    if (type.id === 'merged') return t('typesRuleMerged');
    return t('typesHidden');
  }

  function typeTile(type, mine, hiddenOpen) {
    if (type.id === 'soulmate' && !hiddenOpen) {
      // Locked: no code, no name, no colour. Not a button: nothing to open.
      return el('div', { class: 'tcard is-locked' }, [
        el('span', { class: 'tcard-top' }, [el('span', { text: t('typesHidden') })]),
        el('span', { class: 'tcard-code', 'aria-hidden': 'true', text: '???' }),
        el('span', { class: 'visually-hidden', text: t('typesLocked') + '. ' }),
        el('span', { class: 'tcard-hint' }, statementPieces(t('typesLockedHint')))
      ]);
    }
    // The code is fitted with the same measuring as the big card: as large
    // as the card's inner width allows (96%, a little safety margin).
    const code = fitText(type.code, 800, fontStacks().display, TILE_CODE_MAX, 96, 1);
    return el('button', {
      class: 'tcard' + (mine ? ' is-mine' : ''),
      type: 'button',
      'data-nav': 'type-' + type.id,
      style: '--type-bg:' + type.color + ';--type-fg:' + textColorOn(type.color),
      onclick: () => (mine ? closeLayer() : peekAt(type.id))
    }, [
      el('span', { class: 'tcard-top' }, [
        el('span', { class: 'tcard-label', text: tileLabel(type) }),
        mine && el('span', { class: 'tcard-you', text: t('typesYou') })
      ]),
      el('span', {
        class: 'tcard-code',
        style: 'font-size:calc(' + code.size.toFixed(2) + ' * 1cqw)'
      }, [type.code]),
      // statementPieces keeps Chinese from breaking mid-word and keeps
      // "Cloud-Hosted" together in English (see its comment).
      el('span', { class: 'tcard-name' }, statementPieces(L(type.name))),
      el('span', { class: 'tcard-tagline' }, statementPieces(L(type.tagline)))
    ]);
  }

  function startOver() {
    state.answers = {};
    state.index = 0;
    state.preview = null;
    state.from = null;
    state.peek = null;
    state.gallery = false;
    setUrlParams({ preview: null, from: null, types: null });
    go('landing');
  }

  // ---------------------------------------------------------------------
  // The result card: one layout model, drawn twice (DOM and canvas)
  // ---------------------------------------------------------------------

  /*
   * All numbers are in "card units": 1 unit = 1% of the card width.
   * The card is 100 x 133.33 units (3:4). In the DOM, 1 unit = 1cqw.
   * In the PNG (1080 px wide), 1 unit = 10.8 px.
   * styles.css reads these through custom properties set on the card.
   *
   * Layout, top to bottom:
   *   top row (product name ... ticks)
   *   free space (whatever is left over)
   *   CODE  (the hero: as big as width and height allow)
   *   name, tagline
   *   a fixed gap (gapScore), so every card has the same rhythm
   *   PURITY label, score, five bars, note — pinned to the bottom
   *
   * The five bars show WEIGHT, not counts: each section fills depth / 10 of
   * its ten squares (depth = points out of 19, as 0..100; see scoring.js).
   * The type is decided by weight, so the longest bar always belongs to the
   * section that decided it. Counting statements instead would let six mild
   * School answers draw a longer bar than three extreme Heart answers on a
   * card that says HAHA-OK.
   */
  const CARD = {
    width: 100, height: 400 / 3,
    pad: 7,
    topSize: 3.4, topLine: 4.4,
    gapTopMin: 5,                          // smallest space between the top row and the code
    codeMaxSize: 28, codeLineRatio: 0.94,  // code size is fitted per type, see buildCardModel
    gapCode: 2.2,
    nameSize: 6.2, nameMinSize: 5.2, nameLine: 7.4, nameMaxLines: 2,
    gapName: 1.4,
    tagSize: 3.9, tagMinSize: 3.5, tagLine: 5.2, tagMaxLines: 2,
    gapScore: 7,
    scoreLabelSize: 3, scoreLabelLine: 4.6,
    puritySize: 15, pctSize: 7, purityLine: 13.5,
    gapPurity: 2.6,
    barRow: 6, barLabelW: 16, barLabelSize: 3.4, barGap: 1.6,
    barStroke: 0.45, barRadius: 0.9,
    gapBars: 2.8,
    noteSize: 3.1, noteLine: 4.4,
    // The small column on the right of the score: "MATCH" (on the label row),
    // the match number, then the secondary chip ("ALSO [HAHA-OK]") when there
    // is one. It fits beside the score's two rows, so it adds no height:
    // 4.6 (label) + 7.4 + 0.8 + 5.2 = 18 <= 4.6 + 13.5.
    matchSize: 7, matchPctSize: 4, matchLine: 7.4,
    gapChip: 0.8, chipH: 5.2, chipSize: 3.5, chipPadX: 1.5,
    chipStroke: 0.4, chipRadius: 1.2, chipLabelGap: 1.4
  };
  // The squares stretch so the bars run the full inner width.
  CARD.barSize = (CARD.width - CARD.pad * 2 - CARD.barLabelW - 9 * CARD.barGap) / 10;
  CARD.bottomHeight = CARD.scoreLabelLine + CARD.purityLine + CARD.gapPurity +
    CARD.barRow * 5 + CARD.gapBars + CARD.noteLine;

  const PNG_W = 1080;
  const PNG_H = 1440;
  const UNIT = PNG_W / CARD.width; // px per card unit in the PNG

  function fontStacks() {
    const css = getComputedStyle(document.documentElement);
    return {
      display: css.getPropertyValue('--font-display').trim() || 'sans-serif',
      body: css.getPropertyValue('--font-body').trim() || 'sans-serif'
    };
  }

  // Canvas font string for a size given in card units.
  function canvasFont(weight, sizeUnits, family) {
    return weight + ' ' + (sizeUnits * UNIT).toFixed(2) + 'px ' + family;
  }

  let measureCtx = null;
  function measurer() {
    if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
    return measureCtx;
  }

  // Text is split into tokens: Latin words, single CJK characters and
  // punctuation. `space` says whether a space came before the token.
  const CJK = '⺀-鿿豈-﫿＀-￯　-〿';
  const TOKEN_RE = new RegExp('(\\s*)([' + CJK + ']|[^\\s' + CJK + ']+)', 'g');
  // Closing punctuation never starts a line.
  const NO_LINE_START = /^[，。！？、；：」』）》…,.!?;:)]/;

  function tokenize(text) {
    const tokens = [];
    String(text).replace(TOKEN_RE, (match, space, word) => {
      tokens.push({ text: word, space: space.length > 0 });
      return match;
    });
    return tokens;
  }

  function joinTokens(tokens) {
    return tokens.map((tok, i) => (i > 0 && tok.space ? ' ' : '') + tok.text).join('');
  }

  // Greedy wrap: fills each line as far as it goes.
  function wrapLines(ctx, tokens, maxWidth) {
    const lines = [];
    let line = [];
    tokens.forEach((tok) => {
      const attempt = line.concat(tok);
      if (line.length && ctx.measureText(joinTokens(attempt)).width > maxWidth && !NO_LINE_START.test(tok.text)) {
        lines.push(line);
        line = [tok];
      } else {
        line = attempt;
      }
    });
    if (line.length) lines.push(line);
    return lines;
  }

  // For two lines, picks the break that makes them as even as possible, so a
  // single word never sits alone on the second line ("...than / you.").
  function balanceTwo(ctx, tokens, maxWidth) {
    let best = null;
    for (let i = 1; i < tokens.length; i++) {
      if (NO_LINE_START.test(tokens[i].text)) continue;
      const a = joinTokens(tokens.slice(0, i));
      const b = joinTokens(tokens.slice(i));
      const widest = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
      if (widest <= maxWidth && (!best || widest < best.widest)) best = { widest: widest, lines: [a, b] };
    }
    return best ? best.lines : null;
  }

  // Finds the largest size (<= startSize) at which `text` fits in maxLines.
  // With oneLineMin, it first tries to keep the text on one line, shrinking
  // no further than oneLineMin. Returns { size, lines }; the DOM and the PNG
  // both use these exact lines.
  function fitText(text, weight, family, startSize, maxWidthUnits, maxLines, oneLineMin) {
    const ctx = measurer();
    const maxWidth = maxWidthUnits * UNIT;
    const tokens = tokenize(text);

    if (oneLineMin) {
      for (let size = startSize; size >= oneLineMin - 0.001; size -= 0.1) {
        ctx.font = canvasFont(weight, size, family);
        if (ctx.measureText(joinTokens(tokens)).width <= maxWidth) {
          return { size: size, lines: [joinTokens(tokens)] };
        }
      }
    }

    let size = startSize;
    let lines = [];
    for (let i = 0; i < 12; i++) {
      ctx.font = canvasFont(weight, size, family);
      lines = wrapLines(ctx, tokens, maxWidth);
      const widest = Math.max.apply(null, lines.map((l) => ctx.measureText(joinTokens(l)).width).concat(0));
      if (lines.length <= maxLines && widest <= maxWidth) break;
      size *= 0.94;
    }
    let out = lines.map(joinTokens);
    if (lines.length === 2) {
      out = balanceTwo(ctx, tokens, maxWidth) || out;
    } else if (lines.length > maxLines) {
      // Still too long at the smallest size: cut and add an ellipsis.
      out = out.slice(0, maxLines);
      out[maxLines - 1] = out[maxLines - 1].replace(/\s*\S$/, '') + '…';
    }
    return { size: size, lines: out };
  }

  function buildCardModel(type, result) {
    const fonts = fontStacks();
    const C = CARD;
    const inner = C.width - C.pad * 2;
    // fill = how many of the ten squares to fill: the section's depth in tenths.
    // Any admitted statement is worth at least 1 point (depth 5), so a touched
    // section always shows at least one square.
    const dims = content.dimensions.map((d) => ({ name: L(d.name), fill: Math.round((result.depth[d.key] || 0) / 10) }));

    // Dimension labels share one size: the largest at which every label fits.
    const labelSize = Math.min.apply(null, dims.map((d) =>
      fitText(d.name, 700, fonts.body, C.barLabelSize, (C.barLabelW - 1.5) * 0.9, 1).size));

    // Body text gets a 10% safety margin: at small screen sizes the system font
    // switches to a wider "text" cut than the canvas measures at PNG size, so a
    // line that just fits in the PNG could spill over the card edge on screen.
    const name = fitText(L(type.name), 700, fonts.body, C.nameSize, inner * 0.92, C.nameMaxLines, C.nameMinSize);
    const tagline = fitText(L(type.tagline), 500, fonts.body, C.tagSize, inner * 0.9, C.tagMaxLines, C.tagMinSize);

    // The code is the loudest thing on the card, so it grows to fill the width
    // (short codes get huge). It may only use the height left once everything
    // else, including the fixed gap above the score, has its place.
    const headRest = C.gapCode + name.lines.length * C.nameLine + C.gapName + tagline.lines.length * C.tagLine;
    const usedHeight = C.pad * 2 + C.topLine + C.gapTopMin + headRest + C.gapScore + C.bottomHeight;
    const codeRoom = C.height - usedHeight; // height available for the code's line box
    const codeMax = Math.min(C.codeMaxSize, codeRoom / C.codeLineRatio);
    const code = fitText(type.code, 800, fonts.display, codeMax, inner, 1);
    code.line = code.size * C.codeLineRatio;

    // Where the code starts: the head block sits a fixed gap above the score,
    // and any leftover space goes between the top row and the code.
    const headTop = C.height - C.pad - C.bottomHeight - C.gapScore - headRest - code.line;

    // The secondary chip: its width is measured once here, so the screen and
    // the PNG draw exactly the same box around the code.
    const sec = result.secondaryTypeId ? typesById[result.secondaryTypeId] : null;
    let lean = null;
    if (sec) {
      const ctx = measurer();
      ctx.font = canvasFont(800, C.chipSize, fonts.display);
      lean = {
        label: t('cardAlso').toUpperCase(),
        code: sec.code,
        bg: sec.color,
        fg: textColorOn(sec.color),
        w: ctx.measureText(sec.code).width / UNIT + C.chipPadX * 2
      };
    }

    return {
      match: String(result.match),
      matchLabel: t('cardMatch').toUpperCase(),
      lean: lean,
      type: type,
      bg: type.color,
      fg: textColorOn(type.color),
      fonts: fonts,
      appName: t('appName'),
      ticks: t('cardTicks', { n: result.total }),
      code: code,
      headTop: headTop,
      name: name,
      tagline: tagline,
      purity: String(result.purity),
      scoreLabel: t('liveLabel').toUpperCase(),
      dims: dims,
      labelSize: labelSize,
      note: fitText(t('cardNote'), 600, fonts.body, C.noteSize, inner * 0.9, 1),
      total: result.total,
      shareText: t('shareText', { code: type.code, name: L(type.name), purity: result.purity })
    };
  }

  // ---------- DOM version ----------
  function buildCardDom(model) {
    // Expose the CARD numbers to CSS as unitless custom properties.
    const vars = Object.keys(CARD).map((key) => '--' + key + ':' + CARD[key]).join(';');
    const lines = (fit) => fit.lines.map((line) => el('span', { style: 'display:block;white-space:nowrap' }, [line]));

    const bars = model.dims.map((d) => {
      const squares = [];
      for (let i = 0; i < 10; i++) squares.push(el('i', { class: i < d.fill ? 'on' : '' }));
      return el('li', {}, [
        el('span', { class: 'bar-label', text: d.name }),
        el('span', { class: 'bar-squares', role: 'img', 'aria-label': t('barAria', { name: d.name, n: d.fill }) }, squares)
      ]);
    });

    // The frame is the size container that the card's cqw units measure against.
    const frame = el('div', { class: 'card-frame', style: vars });
    const card = el('article', {
      class: 'card',
      style: '--type-bg:' + model.bg + ';--type-fg:' + model.fg + ';--labelSize:' + model.labelSize +
        ';--noteFit:' + model.note.size
    }, [
      el('div', { class: 'card-top' }, [el('span', { text: model.appName }), el('span', { text: model.ticks })]),
      el('div', { class: 'card-head' }, [
        el('p', {
          class: 'card-code',
          style: 'font-size:calc(' + model.code.size + ' * 1cqw);line-height:calc(' + model.code.line + ' * 1cqw)',
          'aria-hidden': 'true'
        }, lines(model.code)),
        el('h1', {
          class: 'card-name', tabindex: '-1', 'data-focus': true,
          'aria-label': model.type.code + ' ' + L(model.type.name),
          style: 'font-size:calc(' + model.name.size + ' * 1cqw)'
        }, lines(model.name)),
        el('p', { class: 'card-tagline', style: 'font-size:calc(' + model.tagline.size + ' * 1cqw)' }, lines(model.tagline))
      ]),
      el('div', { class: 'card-bottom' }, [
        el('div', { class: 'card-score' }, [
          el('p', { class: 'card-score-label', text: model.scoreLabel }),
          el('p', { class: 'card-purity' }, [
            el('span', { class: 'card-purity-num', text: model.purity }),
            el('span', { class: 'card-purity-pct', text: '%' })
          ]),
          // Right-hand column: match, then the secondary chip if there is one.
          el('div', { class: 'card-match' }, [
            el('p', { class: 'card-score-label', text: model.matchLabel }),
            el('p', { class: 'card-match-num' }, [
              el('span', { text: model.match }),
              el('span', { class: 'card-match-pct', text: '%' })
            ]),
            model.lean && el('p', { class: 'card-lean' }, [
              el('span', { class: 'card-lean-label', text: model.lean.label }),
              el('span', {
                class: 'card-chip',
                style: '--chip-bg:' + model.lean.bg + ';--chip-fg:' + model.lean.fg + ';--chipW:' + model.lean.w
              }, [model.lean.code])
            ])
          ])
        ]),
        el('ul', { class: 'card-bars', 'aria-label': t('barsLabel') }, bars),
        el('p', { class: 'card-note' }, lines(model.note))
      ])
    ]);
    frame.appendChild(card);
    return frame;
  }

  // ---------- Canvas (PNG) version ----------

  // Where the text baseline sits inside a CSS line box of height lineH.
  // CSS centres the font's ascent+descent in the line box; we do the same.
  function baselineIn(ctx, top, lineH, sizeUnits) {
    const m = ctx.measureText('Hg');
    const size = sizeUnits * UNIT;
    const ascent = m.fontBoundingBoxAscent !== undefined ? m.fontBoundingBoxAscent : size * 0.8;
    const descent = m.fontBoundingBoxDescent !== undefined ? m.fontBoundingBoxDescent : size * 0.2;
    return top * UNIT + (lineH * UNIT - (ascent + descent)) / 2 + ascent;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function drawCard(model) {
    const canvas = document.createElement('canvas');
    canvas.width = PNG_W;
    canvas.height = PNG_H;
    const ctx = canvas.getContext('2d');
    const f = model.fonts;
    const C = CARD;
    const left = C.pad * UNIT;
    const right = (C.width - C.pad) * UNIT;

    ctx.fillStyle = model.bg;
    ctx.fillRect(0, 0, PNG_W, PNG_H);
    ctx.fillStyle = model.fg;
    ctx.strokeStyle = model.fg;
    ctx.textBaseline = 'alphabetic';

    // Draws lines of text top-down from y (in units) and returns the new y.
    function textBlock(fit, weight, family, lineH, y) {
      ctx.font = canvasFont(weight, fit.size, family);
      fit.lines.forEach((line, i) => {
        ctx.fillText(line, left, baselineIn(ctx, y + i * lineH, lineH, fit.size));
      });
      return y + fit.lines.length * lineH;
    }

    // --- top row ---
    ctx.font = canvasFont(700, C.topSize, f.body);
    const topBase = baselineIn(ctx, C.pad, C.topLine, C.topSize);
    ctx.textAlign = 'left';
    ctx.fillText(model.appName, left, topBase);
    ctx.textAlign = 'right';
    ctx.fillText(model.ticks, right, topBase);
    ctx.textAlign = 'left';

    // --- head: code, name, tagline (placed a fixed gap above the score) ---
    let y = model.headTop;
    y = textBlock(model.code, 800, f.display, model.code.line, y);
    y = textBlock(model.name, 700, f.body, C.nameLine, y + C.gapCode);
    textBlock(model.tagline, 500, f.body, C.tagLine, y + C.gapName);

    // --- bottom block, measured up from the bottom edge ---
    y = C.height - C.pad - C.bottomHeight;

    // Small spaced-out label ("PURITY", "MATCH", "ALSO"), left or right aligned.
    function smallLabel(text, x, align, top, lineH) {
      ctx.font = canvasFont(700, C.scoreLabelSize, f.body);
      if ('letterSpacing' in ctx) ctx.letterSpacing = (0.08 * C.scoreLabelSize * UNIT).toFixed(2) + 'px';
      ctx.textAlign = align;
      ctx.fillText(text, x, baselineIn(ctx, top, lineH, C.scoreLabelSize));
      ctx.textAlign = 'left';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    }

    const scoreTop = y;
    smallLabel(model.scoreLabel, left, 'left', y, C.scoreLabelLine);
    y += C.scoreLabelLine;

    ctx.font = canvasFont(800, C.puritySize, f.display);
    const purityBase = baselineIn(ctx, y, C.purityLine, C.puritySize);
    ctx.fillText(model.purity, left, purityBase);
    const pctX = left + ctx.measureText(model.purity).width + 0.4 * UNIT;
    ctx.font = canvasFont(800, C.pctSize, f.display);
    ctx.fillText('%', pctX, purityBase);
    y += C.purityLine + C.gapPurity;

    // --- right-hand column beside the score: match, then the secondary chip ---
    let ry = scoreTop;
    smallLabel(model.matchLabel, right, 'right', ry, C.scoreLabelLine);
    ry += C.scoreLabelLine;
    ctx.font = canvasFont(800, C.matchSize, f.display);
    const matchBase = baselineIn(ctx, ry, C.matchLine, C.matchSize);
    ctx.font = canvasFont(800, C.matchPctSize, f.display);
    const matchPctW = ctx.measureText('%').width;
    ctx.fillText('%', right - matchPctW, matchBase);
    ctx.font = canvasFont(800, C.matchSize, f.display);
    ctx.textAlign = 'right';
    ctx.fillText(model.match, right - matchPctW - 0.3 * UNIT, matchBase);
    ctx.textAlign = 'left';
    ry += C.matchLine + C.gapChip;

    if (model.lean) {
      const chipW = model.lean.w * UNIT;
      const chipH = C.chipH * UNIT;
      const chipX = right - chipW;
      const chipY = ry * UNIT;
      const edge = C.chipStroke * UNIT;
      // Fill in the secondary type's colour, outlined in the card's text colour.
      ctx.fillStyle = model.lean.bg;
      roundRect(ctx, chipX, chipY, chipW, chipH, C.chipRadius * UNIT);
      ctx.fill();
      ctx.lineWidth = edge;
      ctx.strokeStyle = model.fg;
      roundRect(ctx, chipX + edge / 2, chipY + edge / 2, chipW - edge, chipH - edge, Math.max(0, (C.chipRadius - C.chipStroke / 2) * UNIT));
      ctx.stroke();
      ctx.fillStyle = model.lean.fg;
      ctx.font = canvasFont(800, C.chipSize, f.display);
      ctx.textAlign = 'center';
      ctx.fillText(model.lean.code, chipX + chipW / 2, baselineIn(ctx, ry, C.chipH, C.chipSize));
      ctx.textAlign = 'left';
      ctx.fillStyle = model.fg;
      smallLabel(model.lean.label, chipX - C.chipLabelGap * UNIT, 'right', ry, C.chipH);
    }

    const squaresX = left + C.barLabelW * UNIT;
    const sq = C.barSize * UNIT;
    const stroke = C.barStroke * UNIT;
    model.dims.forEach((d) => {
      const centre = (y + C.barRow / 2) * UNIT;
      ctx.font = canvasFont(700, model.labelSize, f.body);
      ctx.fillText(d.name, left, baselineIn(ctx, y + (C.barRow - model.labelSize) / 2, model.labelSize, model.labelSize));
      for (let i = 0; i < 10; i++) {
        const sx = squaresX + i * (C.barSize + C.barGap) * UNIT;
        const sy = centre - sq / 2;
        if (i < d.fill) {
          roundRect(ctx, sx, sy, sq, sq, C.barRadius * UNIT);
          ctx.fill();
        } else {
          // Empty slot: an outline at 55%, readable on every type colour.
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = stroke;
          roundRect(ctx, sx + stroke / 2, sy + stroke / 2, sq - stroke, sq - stroke, Math.max(0, (C.barRadius - C.barStroke / 2) * UNIT));
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      y += C.barRow;
    });
    y += C.gapBars;

    textBlock(model.note, 600, f.body, C.noteLine, y);

    return canvas;
  }

  function cardBlob(model) {
    return new Promise((resolve) => {
      try { drawCard(model).toBlob(resolve, 'image/png'); } catch (e) { resolve(null); }
    });
  }

  function fileName(model) {
    return 'ai-purity-' + model.type.code.toLowerCase() + '.png';
  }

  // ---------------------------------------------------------------------
  // Sharing
  // ---------------------------------------------------------------------

  // In-app browsers (Xiaohongshu, WeChat, Instagram...) ignore download links,
  // and on phones a long-press on an image saves it straight to the photos.
  // So on touch screens "Save image" shows the picture instead of downloading.
  const IN_APP_UA = /MicroMessenger|xhsdiscover|XiaoHongShu|Weibo|QQ\/|DingTalk|Instagram|FBAN|FBAV|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat/i;
  function shouldShowImage() {
    if (IN_APP_UA.test(navigator.userAgent || '')) return true;
    try {
      return window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(hover: hover)').matches;
    } catch (e) {
      return false;
    }
  }

  function saveImage(model) {
    let canvas;
    try {
      canvas = drawCard(model);
    } catch (e) {
      toast(t('imageFailed'));
      return;
    }

    if (shouldShowImage()) {
      let dataUrl = '';
      try { dataUrl = canvas.toDataURL('image/png'); } catch (e) { /* handled below */ }
      if (dataUrl.length < 100) { toast(t('imageFailed')); return; }
      showImageOverlay(dataUrl, model);
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) { toast(t('imageFailed')); return; }
      const url = URL.createObjectURL(blob);
      const link = el('a', { href: url, download: fileName(model) });
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast(t('imageSaved'));
    }, 'image/png');
  }

  // A full-screen sheet with the PNG and a "press and hold to save" hint.
  function showImageOverlay(src, model) {
    const opener = document.activeElement;
    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      if (opener && opener.focus) opener.focus();
    }
    function onKey(event) {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') { event.preventDefault(); closeBtn.focus(); } // only one control inside
    }
    const closeBtn = el('button', { class: 'btn btn-primary', type: 'button', onclick: close }, [t('close')]);
    const overlay = el('div', {
      class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('saveImage'),
      onclick: (event) => { if (event.target === overlay) close(); }
    }, [
      el('div', { class: 'overlay-inner' }, [
        el('img', { class: 'overlay-img', src: src, alt: model.type.code + ' ' + L(model.type.name) }),
        el('p', { class: 'overlay-hint', text: t('saveHint') }),
        closeBtn
      ])
    ]);
    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey);
    closeBtn.focus();
  }

  // Makes the share file as soon as the result shows, so that the Share
  // button can call navigator.share right inside the tap. (Safari refuses
  // to open the share sheet if the tap was too long ago.)
  function prepareShareFile(model) {
    model.file = null;
    if (!navigator.canShare) return;
    setTimeout(() => {
      cardBlob(model).then((blob) => {
        if (!blob) return;
        try {
          const file = new File([blob], fileName(model), { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) model.file = file;
        } catch (e) { /* File constructor missing: share the link only */ }
      });
    }, 250);
  }

  function shareUrl() {
    const typeId = state.preview || currentScore().typeId;
    const base = location.href.split(/[?#]/)[0];
    return base + '?from=' + encodeURIComponent(typeId) + '&lang=' + state.lang;
  }

  async function copyLink() {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast(t('linkCopied'));
      return;
    } catch (e) { /* clipboard API missing or blocked (e.g. file://); try the old way */ }
    try {
      const area = el('textarea', { style: 'position:fixed;top:-100px;opacity:0', readonly: true });
      area.value = url;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      toast(ok ? t('linkCopied') : t('copyFailed'));
    } catch (e) {
      toast(t('copyFailed'));
    }
  }

  function shareResult(model) {
    const text = model.shareText;
    const data = model.file
      ? { files: [model.file], title: t('appName'), text: text + ' ' + shareUrl() }
      : { title: t('appName'), text: text, url: shareUrl() };
    // Called directly inside the click, with nothing awaited first.
    navigator.share(data).catch((e) => {
      // AbortError = the person closed the share sheet; anything else, offer the link.
      if (e && e.name !== 'AbortError') copyLink();
    });
  }

  // ---------------------------------------------------------------------
  // Language toggle and start
  // ---------------------------------------------------------------------
  document.getElementById('langToggle').addEventListener('click', () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    setUrlParams({ lang: state.lang });
    render(); // focus stays on the toggle
  });

  if (state.preview) {
    state.screen = 'result';
  } else {
    restoreState();
    // A shared link (?from=) opens on the landing page unless a run is underway.
    if (state.from && answeredCount() === 0) state.screen = 'landing';
  }

  render();

  // Mark this history entry with the layers on show (see "Moving between
  // layers"). After a refresh it keeps its depth; a peek it recorded is
  // dropped, because a refresh never reopens a peek.
  try { history.replaceState(historyEntry(historyDepth()), '', layerUrl()); } catch (e) { /* not important */ }

  // The card is measured with canvas, so it needs the display font.
  // "APT Display" is embedded in styles.css (no network) and is used where
  // Avenir Next Condensed is missing (Android, Windows). If it was not ready
  // for the first render of a result (or of the grid, whose codes are
  // measured the same way), measure and draw again.
  if (document.fonts && document.fonts.load && !document.fonts.check('800 40px "APT Display"')) {
    document.fonts.load('800 40px "APT Display"', 'A0').then(() => {
      if (state.screen === 'result' || currentLayer() !== 'base') render();
    }).catch(() => {});
  }
})();
