/*
 * app.js — the UI. Reads globalThis.APT_CONTENT (content.js) and
 * globalThis.APT_SCORING (scoring.js). No framework: each screen is rebuilt
 * from `state` by a render function.
 *
 * Screens: landing -> question 1..30 (one statement per screen) -> result
 * On top of any screen: "all types" (the grid of the 14 cards), and a peek
 * at one type's full result (see "Moving between layers" below).
 * URL params: ?lang=en|zh  ?preview=<typeId>  ?from=<typeId>  ?seed=<seed>  ?types=1
 *             ?vs=<code> (a challenge: the sender's answers)  &re=<code> (a reply)
 *
 * A play is a seed. scoring.drawStatements(content, seed) turns it into the
 * 30 statements this play asks, in order (2 mild, 2 medium, 2 extreme per
 * section, mild ones first). The seed is saved with the answers
 * (sessionStorage) and in history.state, so a refresh or the language button
 * never changes the set. It is NOT written into the address bar: a copied
 * address, a bookmark or the browser's own share button would otherwise hand
 * out one fixed set and claim it came from a friend. Only the share link
 * (?from=...&seed=...) carries it, and a ?seed= that arrived in a link stays
 * in the address for as long as that play lasts.
 */
(function () {
  'use strict';

  const content = globalThis.APT_CONTENT;
  const scoring = globalThis.APT_SCORING;
  // Comparison codes, the AI's remarks and the collection (extras.js).
  const extras = globalThis.APT_EXTRAS;
  const app = document.getElementById('app');

  // ---------------------------------------------------------------------
  // Startup checks
  // ---------------------------------------------------------------------
  if (!content || !scoring || !extras) {
    app.innerHTML = '<p class="load-error">The quiz content did not load. Check that content.js sits next to index.html.<br>' +
      '题目没加载出来，请确认 content.js 和 index.html 在同一个文件夹。</p>';
    return;
  }
  try {
    const problems = scoring.validateContent(content).concat(extras.validateRemarks(content));
    if (problems.length) {
      // Not fatal: the editor sees this in the browser console while working.
      console.warn('[AI Purity Test] content.js has ' + problems.length + ' problem(s):\n- ' + problems.join('\n- '));
    }
  } catch (e) {
    console.warn('[AI Purity Test] could not check content.js:', e);
  }

  const INK = '#1C2541';
  const WHITE = '#FFFFFF';
  // v3: { seed, seedFromLink, answers: { statementId: 'yes' | 'no' |
  // 'unsure' }, screen, index }. Saves from the 50-statement version
  // (apt-state-v2, no seed, a fixed order) cannot be mapped onto a drawn set
  // of 30, so they are not read; restoreState removes the old key.
  const STORE_KEY = 'apt-state-v3';
  const OLD_STORE_KEYS = ['apt-state-v2'];
  const params = new URLSearchParams(location.search);
  const typesById = {};
  content.types.forEach((t) => { if (t && t.id) typesById[t.id] = t; });
  const dimsByKey = {};
  content.dimensions.forEach((d) => { if (d && d.key) dimsByKey[d.key] = d; });
  const statementsById = {};
  content.statements.forEach((s) => { if (s && s.id) statementsById[s.id] = s; });

  // ---------------------------------------------------------------------
  // Character art (art.js, made by tools/pack-art.js)
  // ---------------------------------------------------------------------
  /*
   * globalThis.APT_ART = { typeId: '<svg ...>' }, one hand-drawn character
   * per type. It is optional: if art.js is missing, or lacks a type, that
   * type simply shows no character (the card falls back to its plain layout).
   *
   * Every picture is used as an <img> from a data: URI, never as inline
   * markup: decorative (alt=""), no ids that could clash, nothing that runs.
   * (One exception: the result reveal puts the card's SVG inline for a
   * few seconds to draw its lines, then removes it; see startReveal.)
   * The same URI feeds the canvas for the saved PNG. Canvas can only draw an
   * image that has finished loading, so all of them are loaded and decoded
   * at startup (preloadArt), and "Save image" waits for its one if needed.
   * The URI gives the SVG a large intrinsic size (ART_PX) so every browser
   * rasterises it sharply at PNG size; on screen CSS sets the size.
   *
   * tests/art.test.js runs the block between the two ART HELPERS markers on
   * its own, so it may only use globalThis.APT_ART, Image, document and
   * Promise, and must never throw.
   */
  // ART HELPERS START
  const ART_PX = 480;
  const artCache = {};

  // The SVG text for a type, or null when there is none (or it is not an SVG).
  function artSvg(typeId) {
    let art = null;
    try { art = globalThis.APT_ART; } catch (e) { art = null; }
    if (!art || typeof art !== 'object' || !Object.prototype.hasOwnProperty.call(art, typeId)) return null;
    const svg = art[typeId];
    return typeof svg === 'string' && /^<svg[\s>]/.test(svg) && /<\/svg>\s*$/.test(svg) ? svg : null;
  }

  function hasArt(typeId) {
    return artSvg(typeId) !== null;
  }

  // data: URI for a type's picture (cached), sized ART_PX square.
  function artUri(typeId) {
    const svg = artSvg(typeId);
    if (!svg) return null;
    const entry = artCache[typeId] || (artCache[typeId] = {});
    if (!entry.uri) {
      const sized = svg.replace(/^<svg\b[^>]*>/, (tag) => tag
        .replace(/\s(width|height)="[^"]*"/g, '')
        .replace(/^<svg\b/, '<svg width="' + ART_PX + '" height="' + ART_PX + '"'));
      entry.uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
    }
    return entry.uri;
  }

  // Loads (once) the Image the canvas draws. Resolves with the Image when it
  // can be drawn, or null (no art, a load error); never rejects.
  function loadArt(typeId) {
    const uri = artUri(typeId);
    if (!uri) return Promise.resolve(null);
    const entry = artCache[typeId];
    if (entry.loading) return entry.loading;
    entry.loading = new Promise((resolve) => {
      let img;
      try { img = new Image(); } catch (e) { resolve(null); return; }
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        if (!ok) { resolve(null); return; }
        // Safari can paint a freshly loaded SVG image blank the first time it
        // is drawn onto a canvas; one throwaway draw gets that out of the way.
        try {
          const warm = document.createElement('canvas');
          warm.width = 8;
          warm.height = 8;
          warm.getContext('2d').drawImage(img, 0, 0, 8, 8);
        } catch (e) { /* not important */ }
        entry.img = img;
        resolve(img);
      };
      img.onload = () => {
        // decode() makes sure the pixels are ready. Some WebKit versions
        // reject it (or never settle) for SVG although the image draws fine,
        // so a rejection counts as ready, and so does waiting 500 ms.
        if (img.decode) {
          img.decode().then(() => finish(true), () => finish(true));
          setTimeout(() => finish(true), 500);
        } else {
          finish(true);
        }
      };
      img.onerror = () => finish(false);
      img.src = uri;
      if (img.complete && img.naturalWidth) img.onload();
    });
    return entry.loading;
  }

  // The loaded Image for a type, or null if it is not ready (yet).
  function artImage(typeId) {
    const entry = artCache[typeId];
    const img = entry && entry.img;
    return img && img.complete !== false && (img.naturalWidth || img.width) ? img : null;
  }

  // Waits for a type's picture, but never longer than `ms`. Resolves either way.
  function artReady(typeId, ms) {
    if (!hasArt(typeId) || artImage(typeId)) return Promise.resolve(artImage(typeId));
    return Promise.race([loadArt(typeId), new Promise((resolve) => setTimeout(() => resolve(null), ms))]);
  }

  // Starts loading every picture in art.js. Returns a promise for all of them.
  function preloadArt(typeIds) {
    return Promise.all((typeIds || []).map((id) => loadArt(id)));
  }
  // ART HELPERS END

  // A decorative <img> of a type's character, or null when there is none.
  function artImg(typeId, className, style) {
    const uri = artUri(typeId);
    if (!uri) return null;
    return el('img', {
      class: className, src: uri, alt: '', 'aria-hidden': 'true', style: style,
      width: '240', height: '240', draggable: 'false', decoding: 'async'
    });
  }

  // How many statements at the start of a play quietly say "close enough
  // counts" (people were answering too literally).
  const CLOSE_ENOUGH_FOR = 3;

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  const state = {
    lang: pickLanguage(),
    screen: 'landing',   // 'landing' | 'question' | 'result'
    // This play: its seed and the 30 statement ids it draws, in asking order
    // (filled in by startPlay / restoreState before the first render).
    seed: null,
    drawn: [],
    // True when the seed came from someone's link: the landing page then says
    // these are the same statements the sender answered.
    seedFromLink: false,
    index: 0,            // position in state.drawn while on the question screen
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
    gallery: params.get('types') === '1',
    // A challenge link (?seed=...&vs=...): the sender's "Guilty" ids on this
    // play, and their code as it goes back into links. The result screen
    // then compares; nothing shows the sender's answers before that.
    challenge: null,
    challengeCode: null,
    // A reply link (?seed=...&vs=...&re=...): { seed, drawn, mine, friend,
    // mineCode, friendCode }. Shows the comparison instead of any screen,
    // without touching this tab's own play.
    reply: null,
    // Statements of this play (indexes) that already got one of the AI's
    // remarks; extras.remarkFor keeps it to 4, never two in a row.
    remarked: [],
    // Answers to play-off statements ({ id: 'yes' | 'no' | 'unsure' }), only
    // when two sections ended dead level (scoring.playoffRounds). Positions
    // 30 and up of state.index are the play-off statements.
    playoffAnswers: {},
    challengePlayoff: {}
  };

  // The ids answered "yes": this is what scoring.score counts. "Not sure"
  // is left out, so it counts exactly like "Never".
  function yesIds() {
    return scoring.admittedIds(state.answers);
  }
  function answeredCount() {
    return Object.keys(state.answers).length;
  }
  // The statement objects of this play, in asking order.
  function playOrder() {
    return state.drawn.map((id) => statementsById[id]);
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
        seed: state.seed,
        seedFromLink: state.seedFromLink,
        answers: state.answers,
        screen: state.screen,
        index: state.index,
        remarked: state.remarked,
        playoff: state.playoffAnswers
      }));
    } catch (e) { /* storage unavailable: fine */ }
  }

  // Picks this tab's play: the link's seed, the saved play, or a new one
  // (the rules live in scoring.resumePlay, which the tests cover).
  function restoreState(linkSeed) {
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORE_KEY));
      OLD_STORE_KEYS.forEach((key) => sessionStorage.removeItem(key));
    } catch (e) { /* nothing saved, junk, or storage blocked: start fresh */ }
    // Storage blocked: history.state still remembers this tab's seed across
    // a refresh (the answers are lost, but the 30 statements stay the same).
    if (!(saved && typeof saved === 'object' && saved.seed)) {
      const entry = history.state;
      if (entry && typeof entry.aptSeed === 'string') {
        saved = { seed: entry.aptSeed, seedFromLink: entry.aptSeedFromLink === true };
      }
    }
    const play = scoring.resumePlay(saved, linkSeed, content);
    state.seed = play.seed;
    state.drawn = play.drawn;
    state.seedFromLink = play.seedFromLink;
    state.answers = play.answers;
    state.screen = play.screen;
    state.index = play.index;
    // The remarks already shown, only when this is the same play carrying on.
    const kept = saved && saved.seed === play.seed && Array.isArray(saved.remarked) ? saved.remarked : [];
    state.remarked = kept.filter((i) => Number.isInteger(i) && i >= 0 && i < play.drawn.length).slice(0, extras.REMARK_RULES.maxPerPlay);
    // Play-off answers carry on with the same play only, and only for real
    // statements outside the 30 with a known answer.
    state.playoffAnswers = {};
    if (saved && saved.seed === play.seed && saved.playoff && typeof saved.playoff === 'object') {
      Object.keys(saved.playoff).forEach((id) => {
        if (statementsById[id] && play.drawn.indexOf(id) === -1 && scoring.ANSWER_VALUES.indexOf(saved.playoff[id]) !== -1) {
          state.playoffAnswers[id] = saved.playoff[id];
        }
      });
    }
    // A refresh during a play-off goes back to it (resumePlay only knows the 30).
    if (state.screen !== 'landing' && playoffPending()) {
      const seq = playoffShown(playoffState());
      const at = saved && Number.isInteger(saved.index) ? saved.index - state.drawn.length : -1;
      const firstOpen = seq.findIndex((id) => !state.playoffAnswers[id]);
      state.screen = 'question';
      state.index = state.drawn.length + (at >= 0 && at < seq.length ? at : Math.max(0, firstOpen));
    }
  }

  // A new play with a new seed ("New questions" on the result, via startOver).
  function startPlay() {
    playNo += 1;
    state.playoffAnswers = {};
    state.seed = scoring.makeSeed();
    state.drawn = scoring.drawStatements(content, state.seed);
    state.seedFromLink = false;
    state.answers = {};
    state.index = 0;
    state.remarked = [];
  }

  // localStorage holds exactly one thing: whether the hidden type has been
  // earned on this device (scoring.hiddenUnlocked / rememberHiddenUnlocked).
  // Even reaching window.localStorage can throw when storage is blocked.
  function deviceStorage() {
    try { return window.localStorage; } catch (e) { return null; }
  }

  // ---------------------------------------------------------------------
  // Visit statistics (GoatCounter; README "Statistics")
  // ---------------------------------------------------------------------
  /*
   * track('start', 'play') sends one count. extras.sendStat decides what
   * goes out (a fixed name, the screen width, and for the landing's page
   * view the origin of an outside referrer; never the address's query, an
   * id, an answer, the purity or the seed) and sends nothing anywhere but
   * the real site. `once`: 'play' = at most once per play, 'load' = at most
   * once per page load. Every call site is one line.
   */
  const trackedOnce = new Set();
  let playNo = 0;   // goes up with every new play (new questions, start over)
  function track(name, once) {
    const key = once === 'play' ? name + '|' + playNo : name;
    if (once) {
      if (trackedOnce.has(key)) return;
      trackedOnce.add(key);
    }
    extras.sendStat(name, {
      location: location,
      referrer: document.referrer,
      screen: window.screen ? window.screen.width : 0,
      send: sendStatRequest
    });
  }
  // A fire-and-forget GET with no cookies and no Referer. If it is blocked,
  // slow or offline, nothing on the page notices.
  function sendStatRequest(url) {
    try {
      fetch(url, { mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true, cache: 'no-store' })
        .catch(() => {});
    } catch (e) {
      try {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = url;
      } catch (e2) { /* not important */ }
    }
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
      // It also carries this play's seed (see seedState).
      history.replaceState(Object.assign({}, history.state, seedState()), '', urlWith(changes));
    } catch (e) { /* some file:// setups refuse; not important */ }
  }

  // The seed lives in history.state, which survives a refresh but is never
  // copied by a share sheet, a bookmark or address-bar autocomplete.
  function seedState() {
    return { aptSeed: state.seed, aptSeedFromLink: state.seedFromLink };
  }

  // What ?seed= should say: the seed only when it came from a link (so a
  // refresh of a friend's link stays on it), otherwise nothing.
  function seedParam() {
    return state.seedFromLink ? state.seed : null;
  }
  // Same for ?vs=: it stays in the address while the challenge play lasts.
  function challengeParam() {
    return state.challenge ? state.challengeCode : null;
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  function render(options) {
    const opts = options || {};
    // A reveal still playing jumps to its end first (a language switch, say).
    finishReveal();
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hans' : 'en';
    document.title = t('appName');
    renderBrand();
    // statementPieces: in Chinese the footer breaks after "，" or "。", never
    // inside a word ("这台 / 设备"); styles.css sets keep-all on it.
    document.getElementById('footerNote').replaceChildren(...statementPieces(t('footer')));

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
    // A reply link shows the comparison and nothing else.
    if (state.reply) screen = renderReply();
    else if (layer === 'peek') screen = renderResult();
    else if (layer === 'gallery') screen = renderGallery();
    else if (state.screen === 'question') screen = renderQuestion(opts.enter);
    else if (state.screen === 'result') screen = renderResult();
    else screen = renderLanding();

    const onQuestion = !state.reply && layer === 'base' && state.screen === 'question';
    if (!onQuestion) hideRemark();
    app.classList.toggle('is-wide', !onQuestion);
    document.body.classList.toggle('layout-wide', !onQuestion);
    document.body.classList.toggle('on-question', onQuestion);
    // The landing page already shows the name huge, so the small one hides there.
    document.body.classList.toggle('on-landing', !state.reply && layer === 'base' && state.screen === 'landing');
    app.replaceChildren(screen);
    // The reveal: only when the last answer of a play brought us here.
    if (opts.reveal && !state.reply && layer === 'base' && state.screen === 'result' && !state.preview) {
      startReveal(screen, currentScore().typeId);
    }

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
  // Six stickers: two rows of three on a phone, two columns on a laptop.
  // Never the hidden type (soulmate): the grid one tap away shows it locked,
  // so a sticker with its code and colour would give the secret away.
  const TEASER_TYPES = ['bond_deep', 'work_deep', 'brain_lite', 'heart_lite', 'school_lite', 'heart_deep'];
  const TEASER_TILTS = [-6, 4, -2, 7, -4, 3];
  // Three of them also show their character above the codes. Same rule:
  // never the hidden type.
  const TEASER_ART = ['bond_deep', 'brain_lite', 'heart_deep'];
  const TEASER_ART_TILTS = [-5, 3, -2];

  function sticker(type, extraClass, tilt, delay) {
    return el('span', {
      class: 'sticker' + (extraClass ? ' ' + extraClass : ''),
      style: '--sticker-bg:' + type.color + ';--sticker-fg:' + textColorOn(type.color) +
        ';--tilt:' + (tilt || 0) + 'deg;--delay:' + (delay || 0) + 'ms'
    }, [type.code]);
  }

  // "A friend got {name}. What are you?" with the name kept on one line.
  // The text around the name goes through statementPieces, so in Chinese
  // "你呢？" never splits as "你 / 呢？" (styles.css sets keep-all on it).
  function fromFriendText(friend) {
    const parts = t('fromFriend').split('{name}');
    const children = statementPieces(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      children.push(el('span', { class: 'nowrap', text: L(friend.name) }), ...statementPieces(parts[i]));
    }
    return el('span', { class: 'from-friend-text' }, children);
  }

  function renderLanding() {
    track('/', 'load');
    track('lang:' + state.lang, 'load');
    // A challenge never shows what the sender got before the end, so it
    // has its own line instead of the friend banner.
    const friend = state.from && !state.challenge ? typesById[state.from] : null;
    // When the seed came from a link, one quiet line says these are the
    // sender's statements: inside the friend banner when there is one,
    // otherwise on its own above the title.
    const sameSet = state.seedFromLink && el('span', { class: 'seed-note',
      text: state.challenge ? t('challengeLanding') : t('seedFromLink') });

    const copy = el('div', { class: 'landing-copy' }, [
      friend && el('div', { class: 'from-friend' }, [
        sticker(friend, 'sticker-small', -4),
        el('p', { class: 'from-friend-copy' }, [fromFriendText(friend), sameSet])
      ]),
      !friend && sameSet && el('p', { class: 'seed-note-alone' }, [sameSet]),
      el('h1', { class: 'landing-title', tabindex: '-1', 'data-focus': true, text: t('appName') }),
      el('p', { class: 'lede', text: t('intro') }),
      el('p', { class: 'meta', text: t('meta') }),
      el('p', { class: 'close-enough', text: t('closeEnough') }),
      landingActions()
    ]);

    const stickers = TEASER_TYPES.filter((id) => typesById[id]).map((id, i) =>
      el('li', {}, [sticker(typesById[id], '', TEASER_TILTS[i % TEASER_TILTS.length], 120 + i * 70)]));

    // A few characters as die-cut stickers above the codes (only the ones
    // art.js has; none at all without it). Decorative, like the codes.
    const faces = TEASER_ART.filter((id) => typesById[id] && hasArt(id)).map((id, i) =>
      el('li', {}, [el('span', {
        class: 'sticker sticker-art',
        style: '--sticker-bg:' + typesById[id].color + ';--tilt:' + TEASER_ART_TILTS[i % TEASER_ART_TILTS.length] +
          'deg;--delay:' + (40 + i * 70) + 'ms'
      }, [artImg(id, 'sticker-art-img')])]));

    const sheet = el('figure', { class: 'sticker-sheet' }, [
      faces.length > 0 && el('ul', { class: 'sticker-faces', 'aria-hidden': 'true' }, faces),
      el('ul', { 'aria-hidden': 'true' }, stickers),
      el('figcaption', {}, [
        el('span', { class: 'teaser-text', text: t('typesTeaser') }),
        typesLink('types-landing')
      ])
    ]);

    return el('section', { class: 'screen landing' }, [copy, sheet]);
  }

  // The landing's buttons. Nothing answered: one start button. A play under
  // way (the player came back through the title in the top bar, or after a
  // refresh): continue where they were, or start over. Every statement
  // answered: back to the result, or start over. No confirm dialog anywhere:
  // leaving never loses anything, and starting over is a deliberate tap.
  function landingActions() {
    let choice = extras.landingChoice(state.answers, state.drawn.length, state.index);
    // All 30 answered but a play-off still open: continue into it.
    if (choice.kind === 'result' && playoffPending()) {
      const seq = playoffShown(playoffState());
      const open = Math.max(0, seq.findIndex((id) => !state.playoffAnswers[id]));
      choice = { kind: 'continue', position: state.drawn.length, playoffAt: state.drawn.length + open };
    }
    if (choice.kind === 'start') {
      return el('button', {
        class: 'btn btn-primary btn-big',
        type: 'button',
        onclick: () => { state.index = 0; go('question'); }
      }, [t('start')]);
    }
    const primary = choice.kind === 'result'
      ? el('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: () => go('result') }, [t('peekBack')])
      : el('button', {
        class: 'btn btn-primary btn-big', type: 'button',
        onclick: () => { if (choice.playoffAt !== undefined) state.index = choice.playoffAt; go('question'); }
      }, [t('continuePlay', { n: choice.position, total: state.drawn.length })]);
    const keepsSet = extras.restartKeepsSet(state);
    return el('div', { class: 'landing-actions' }, [
      el('div', { class: 'landing-buttons' }, [
        primary,
        el('button', { class: 'btn btn-ghost btn-big', type: 'button', onclick: restartPlay }, [t('startOver')])
      ]),
      // From someone's link the restart keeps their 30, so say so.
      keepsSet && el('p', { class: 'restart-note', text: t('restartSameSet') })
    ]);
  }

  /*
   * "Start over" on the landing: the answers are cleared and the play
   * begins again at statement 1, as a new play (remarks can come again, the
   * reveal plays at the end, only finishing counts for the collection).
   * Which 30 (extras.restartKeepsSet): a play that came from someone's link
   * (a seed link or a challenge link) keeps that link's set, or the
   * comparison with the sender would silently stop matching; any other play
   * gets a fresh set, like "New questions".
   */
  function restartPlay() {
    track('start-over');
    if (extras.restartKeepsSet(state)) {
      playNo += 1;
      state.playoffAnswers = {};
      state.answers = {};
      state.index = 0;
      state.remarked = [];
    } else {
      startPlay();
      state.challenge = null;
      state.challengeCode = null;
    }
    setUrlParams({ seed: seedParam(), vs: challengeParam() });
    go('question');
  }

  // ---------- The title in the top bar: back to the landing page ----------
  /*
   * A real link (to the plain address, so it also opens in a new tab), named
   * "AI Purity Test, back to the start" for screen readers. On the landing
   * page it is hidden (the huge title is right there; styles.css). A plain
   * click leaves whatever shows (a question, the result, the grid, a peek,
   * a preview or a reply link) for the landing page of this tab's own play,
   * which then offers to continue or start over.
   */
  function renderBrand() {
    const brand = document.getElementById('brand');
    brand.replaceChildren(el('a', {
      class: 'brand-link',
      href: baseUrl() + '?lang=' + state.lang,
      onclick: goHome
    }, [t('appName'), el('span', { class: 'visually-hidden', text: ', ' + t('brandHomeLabel') })]));
  }

  function goHome(event) {
    if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
    if (event) event.preventDefault();
    hideRemark();
    if (state.reply) state.reply = null;
    state.preview = null;
    state.peek = null;
    state.gallery = false;
    setUrlParams({ preview: null, types: null, re: null, seed: seedParam(), vs: challengeParam() });
    try { history.replaceState(historyEntry(0), '', layerUrl()); } catch (e) { /* not important */ }
    go('landing');
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
    const statement = statementsById[statementAt(state.index)];
    if (!statement) {
      // A play-off position that no longer exists (the tie was settled or
      // went away): the play is finished.
      state.screen = 'result';
      return renderResult();
    }
    const dim = dimsByKey[statement.dim];
    const n = state.index + 1;
    const total = state.drawn.length;
    // In a play-off: which round (0-2) and which of its two statements (1-2).
    const inPlayoff = state.index >= total;
    const playoffRound = inPlayoff ? Math.floor((state.index - total) / 2) : -1;
    const playoffN = inPlayoff ? (state.index - total) % 2 + 1 : 0;
    const playoffLine = inPlayoff ? (playoffRound === 0 ? t('playoffIntro') : t('playoffAgain')) : '';
    const given = (inPlayoff ? state.playoffAnswers : state.answers)[statement.id]; // 'yes' | 'no' | 'unsure' | undefined

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
    const pct = (i) => (Math.min(i, total) / total * 100).toFixed(2) + '%';
    const from = enter === 'next' ? state.index - 1 : (enter === 'prev' ? state.index + 1 : null);
    const fill = el('span', {
      class: from === null ? '' : 'is-moving',
      style: 'width:' + pct(state.index) + (from === null ? '' : ';--from:' + pct(from))
    });

    // Progress and purity are for the eyes; the statement heading below
    // carries "Statement 12 of 30" for screen readers instead.
    const head = el('div', { class: 'q-head' }, [
      backBtn,
      el('div', { class: 'q-progress', 'aria-hidden': 'true' }, [
        el('div', { class: 'q-bar' }, [fill]),
        el('span', { class: 'q-count' + (inPlayoff ? ' is-playoff' : ''),
          text: inPlayoff ? t('playoffCount', { n: playoffN, total: 2 }) : n + ' / ' + total })
      ]),
      el('p', { class: 'q-purity' }, [
        el('span', { class: 'q-purity-label', text: t('liveLabel') }),
        el('span', { class: 'q-purity-num', id: 'liveNum', text: String(currentScore().purity) })
      ])
    ]);

    // On the first few statements, a quiet "close enough counts" sits at the
    // right end of the section label: it uses space the label leaves empty,
    // so the card and the buttons do not move when it goes away.
    const card = el('div', { class: 'q-card' + (enter ? ' enter-' + enter : '') + (inPlayoff ? ' is-playoff' : '') }, [
      inPlayoff && el('p', { class: 'q-playoff', 'aria-hidden': 'true', text: playoffLine }),
      el('p', { class: 'q-dim', 'aria-hidden': 'true' }, [
        el('span', { text: L(dim.name) }),
        state.index < CLOSE_ENOUGH_FOR && el('span', { class: 'q-hint', text: t('closeEnoughHint') })
      ]),
      el('h1', { class: 'q-text', tabindex: '-1', 'data-focus': true }, [
        el('span', { class: 'visually-hidden', text: inPlayoff
          ? playoffLine + ' ' + t('playoffProgress', { n: playoffN, total: 2 }) + ', ' + L(dim.name) + ': '
          : t('progress', { n: n, total: total }) + ', ' + L(dim.name) + ': ' }),
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
    // When a run between break points is too long for the line, the safety
    // net (overflow-wrap: anywhere) breaks at its last possible spot, which
    // is right before the closing "，", so the next line would start with a
    // comma. Keeping the last character and its punctuation in one no-wrap
    // span moves that emergency break one character earlier ("对话 / 框，").
    // Content should still keep clauses short enough that it never happens
    // (tests/content.test.js checks the runs).
    const pushRun = (r) => {
      const m = r.match(/^([\s\S]*[^\s])([，。！？、；：」』）》…]+)$/);
      if (m && Array.from(m[1]).length > 1) {
        const head = Array.from(m[1]);
        const last = head.pop();
        pieces.push(head.join(''), el('span', { class: 'nowrap', text: last + m[2] }));
      } else {
        pieces.push(r);
      }
    };
    const flush = () => { pushRun(run); pieces.push(el('wbr')); run = ''; };
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
    if (run) pushRun(run);
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
    const statementId = statementAt(state.index);
    if (!statementId) return;
    const inPlayoff = state.index >= state.drawn.length;
    const firstAnswer = answeredCount() === 0;
    if (inPlayoff) state.playoffAnswers[statementId] = value;
    else state.answers[statementId] = value;
    saveState();
    if (firstAnswer) track('start', 'play');
    busy = true;

    // 1. Confirmation: the picked button fills in and draws its tick, and the
    //    purity number drops (on "yes") with a little bump.
    app.querySelectorAll('.btn-answer').forEach((btn) => {
      const picked = btn.getAttribute('data-answer') === value;
      btn.setAttribute('aria-pressed', picked ? 'true' : 'false');
      btn.classList.toggle('is-confirming', picked);
    });
    updateLive(value === 'yes' && !inPlayoff);
    // Now and then the AI says something about a "Guilty" (never about the
    // other two answers, never in a play-off). It floats above the buttons on
    // its own layer, so the next statement comes in on time and nothing moves.
    if (!inPlayoff) maybeRemark(state.index, value);

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
        const next = nextPosition(state.index);
        if (next === null) {
          // The end of a play: the result arrives with its reveal (none with
          // reduced motion). Nothing else ever asks for the reveal. The
          // finished play goes into this device's history (never a preview,
          // a peek or a reply link: they do not come through here).
          state.screen = 'result';
          const finished = currentScore();
          track('finish', 'play');
          track('result:' + finished.typeId, 'play');
          extras.rememberPlay(deviceStorage(), finished.typeId);
          render({ moveFocus: true, reveal: !reduce });
        } else {
          if (next >= state.drawn.length) track('tiebreak', 'play');
          state.index = next;
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
    if (state.reply || state.screen !== 'question' || currentLayer() !== 'base') return;
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

  // The player's result so far, on this play's drawn statements (purity =
  // round(100 * (1 - admitted / 30))).
  function currentScore() {
    return scoring.score(yesIds(), content, state.drawn, null, state.playoffAnswers);
  }

  // ---------- The play-off ----------
  /*
   * When two sections end dead level after every tie-break the 30 answers
   * allow, scoring.score() returns result.playoff: up to three rounds of two
   * statements (one per section, same band). The player answers them after
   * statement 30, as positions 30, 31, ... of state.index; a round is only
   * shown once the one before it ended level. The answers decide only which
   * of the two sections leads (scoring.js), so purity and everything else
   * stay on the 30. No remarks during it; Back works as usual.
   */
  function playoffState() {
    const p = currentScore().playoff;
    return p && p.rounds.length ? p : null;
  }
  // The play-off statements shown so far, in order (the rounds played, plus
  // the one being played when it is not settled yet).
  function playoffShown(p) {
    if (!p) return [];
    const rounds = p.complete ? p.played : Math.min(p.rounds.length, p.played + 1);
    return p.rounds.slice(0, rounds).reduce((list, r) => list.concat(r.ids), []);
  }
  // True while the 30 are all answered and a play-off is still to be played.
  function playoffPending() {
    if (answeredCount() < state.drawn.length) return false;
    const p = playoffState();
    return Boolean(p && !p.complete);
  }
  // The statement at a position: one of the 30, or a play-off statement.
  function statementAt(index) {
    if (index < state.drawn.length) return state.drawn[index];
    return playoffShown(playoffState())[index - state.drawn.length] || null;
  }
  // Where to go after answering a position: the next of the 30, the next
  // play-off statement, or null when the play is finished.
  function nextPosition(index) {
    const total = state.drawn.length;
    if (index + 1 < total) return index + 1;
    const p = playoffState();
    if (!p || p.complete) return null;
    const seq = playoffShown(p);
    if (index + 1 - total < seq.length) return index + 1;
    const open = seq.findIndex((id) => !state.playoffAnswers[id]);
    return open === -1 ? null : total + open;
  }
  // The play-off as a challenge link needs it (extras.encodeAnswers).
  function playoffForCode() {
    const p = currentScore().playoff;
    return p ? { rounds: p.rounds, answers: state.playoffAnswers } : null;
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


  // ---------- The AI's remarks while answering ----------
  /*
   * extras.remarkSchedule fixes, from the seed, which statements of a play
   * may get a remark and which line each gets (its own generator: the draw
   * is never touched). extras.remarkFor applies the limits: only on Guilty,
   * not in the first 3 or on the last statement, never two in a row, at
   * most 4. The remark sits on its own layer above the Guilty button for
   * REMARK_MS, hidden from screen readers so it never interrupts the
   * statement being read.
   */
  const REMARK_MS = 1500;
  let remarkCache = null;   // { seed, schedule }
  let remarkTimer = null;
  let remarkNode = null;

  function remarkSchedule() {
    if (!remarkCache || remarkCache.seed !== state.seed) {
      remarkCache = { seed: state.seed, schedule: extras.remarkSchedule(content, state.seed, state.drawn) };
    }
    return remarkCache.schedule;
  }

  function maybeRemark(index, value) {
    const entry = extras.remarkFor(remarkSchedule(), index, value, state.remarked);
    if (!entry) return;
    state.remarked.push(index);
    saveState();
    showRemark(L(entry.line));
  }

  function showRemark(text) {
    const yes = app.querySelector('.btn-answer[data-answer="yes"]');
    if (!yes) return;
    if (!remarkNode) {
      remarkNode = el('div', { class: 'ai-remark', 'aria-hidden': 'true' });
      document.body.appendChild(remarkNode);
    }
    const box = yes.getBoundingClientRect();
    const root = document.documentElement;
    remarkNode.textContent = text;
    // Beside the Guilty button where the window leaves room (laptops), so it
    // never touches the statement card; otherwise just above the button.
    const room = root.clientWidth - box.right - 14 - 16;
    const side = room >= 200;
    remarkNode.classList.toggle('is-side', side);
    if (side) {
      remarkNode.style.cssText = 'left:' + (box.right + 14) + 'px;top:' + (box.top + box.height / 2) + 'px;max-width:' + Math.min(room, 340) + 'px';
    } else {
      remarkNode.style.cssText = 'right:' + Math.max(8, root.clientWidth - box.right) + 'px;bottom:' + (window.innerHeight - box.top + 12) + 'px';
    }
    remarkNode.classList.remove('is-on');
    void remarkNode.offsetWidth; // restart the entrance
    remarkNode.classList.add('is-on');
    clearTimeout(remarkTimer);
    remarkTimer = setTimeout(hideRemark, REMARK_MS);
  }

  function hideRemark() {
    clearTimeout(remarkTimer);
    if (remarkNode) remarkNode.classList.remove('is-on');
  }

  // ---------- The result reveal ----------
  /*
   * The moment the quiz builds to. After the last answer of a play:
   *   1. stage    the page empties and the card is held up, larger and
   *               centred in the window (everything else is absent)
   *   2. pen      the figure is drawn big, centred on the card (up to 2.4x
   *               its size); a marker tip travels along each ink line as it
   *               appears, longest lines first, lifting and moving between lines;
   *               the white scribble and accent colour follow as quick
   *               strokes (on a dark card the white goes first, or the navy
   *               line would hardly show)
   *   3. impact   the figure shrinks and glides to its place while the type
   *               code slams down from big to size with a hard,
   *               slightly overshooting stop; the card takes the knock and
   *               a ring of ink specks is thrown off the letters (and on a
   *               phone, one short vibration)
   *   4. numbers  purity counts down from 100, the match counts up, the
   *               section squares fill row by row
   *   5. settle   the card moves into its real place and size, then the
   *               rest of the page arrives block by block, in reading order
   * About 4.5 s (REVEAL.end); a tap or a key skips to the end at once; never
   * with reduced motion (answer() does not ask for it then), never on a
   * refresh, a language switch, a preview or a way back from another layer.
   *
   * The card is built exactly as always. The drawing is the character's SVG
   * (trusted markup from art.js) put inline over the card's <img> for the
   * length of the reveal; the pen and the specks are extra
   * elements; the counting numbers change text for a moment. Everything is
   * removed or put back at the end, and every motion is a Web Animation
   * (transform and opacity, apart from the drawn lines), cancelled at the
   * end, so the settled card and the PNG made from the same model are the
   * same as after a refresh.
   */
  const REVEAL = {
    beat: 200,                        // the page empties
    cardAt: 200, cardMs: 420,         // the card is lifted into view, held up in the middle
    stageMaxScale: 1.3,               // how much larger than its real size, at most
    drawAt: 650, drawMs: 1800,        // the pen draws the ink lines (light cards)
    artMaxScale: 2.4,                 // while drawn, the figure is this much bigger at most, centred on the card
    artBackAt: 2860, artBackMs: 380,  // then it shrinks to its place as the code comes down
    darkWhiteMs: 380,                 // dark cards: the white scribble first, then the ink in the rest
    travelShare: 0.22,                // share of drawMs the pen spends moving between lines
    fillMs: 360,                      // white scribble / accent as quick strokes, after the ink
    codeAt: 2900, codeMs: 380,        // the code slams down...
    codeFromScale: 2.5,               // ...from this size, or as big as the window allows
    codeMinFromScale: 1.3,            //    (a long code on a phone), but never less than this
    impactAt: 3140,                   // ...and hits here: knock, specks, vibration
    knockMs: 340, knockDeg: 2.6,
    wordsAt: 3200, wordsMs: 220,      // name, tagline and the top line
    numbersAt: 3300, numbersMs: 600,  // purity down, match up, squares row by row
    settleAt: 3880, settleMs: 420,    // the card moves to its real place
    restAt: 4100, restStep: 80, restMs: 220, restMax: 4,   // the page, block by block (the first four)
    end: 4560                         // tidy up
  };
  const INK_STROKE = '#1C2541';
  let reveal = null;   // { finish } while one plays

  function finishReveal() {
    if (reveal) reveal.finish();
  }

  // The character's SVG as an element, or null.
  function inlineArt(typeId) {
    const svg = artSvg(typeId);
    if (!svg || typeof DOMParser === 'undefined') return null;
    try {
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const root = doc.documentElement;
      if (!root || root.nodeName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
      const node = document.importNode(root, true);
      node.removeAttribute('width');
      node.removeAttribute('height');
      node.setAttribute('class', 'card-art reveal-art');
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute('focusable', 'false');
      return node;
    } catch (e) {
      return null;
    }
  }

  // The marker, drawn in the art's own units (viewBox 240): the tip at 0,0,
  // the body leaning to the upper right. Navy with a white die-cut edge, so
  // it reads on light and dark cards alike.
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function makePen() {
    const pen = document.createElementNS(SVG_NS, 'g');
    pen.setAttribute('class', 'reveal-pen');
    pen.innerHTML = // static markup, not content
      '<g stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round">' +
      '<path d="M0 0 L-5 -12 L5 -12 Z" fill="' + INK_STROKE + '"/>' +
      '<rect x="-7" y="-20" width="14" height="9" rx="2" fill="#FFFFFF" stroke="' + INK_STROKE + '" stroke-width="2"/>' +
      '<rect x="-8.5" y="-66" width="17" height="47" rx="5" fill="' + INK_STROKE + '"/>' +
      '<rect x="-8.5" y="-74" width="17" height="11" rx="4" fill="' + INK_STROKE + '"/>' +
      '</g>' +
      '<path d="M-3 -60 L-3 -28" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".55"/>';
    return pen;
  }

  // Splits the drawing: ink lines (each with the white halo drawn under it
  // on dark cards), white scribble, accent colour, filled dots (eyes).
  function sortArt(svg) {
    const ink = [];
    const whites = [];
    const accents = [];
    const dots = [];
    let pendingHalo = null;
    svg.querySelectorAll('path, circle').forEach((node) => {
      const stroke = (node.getAttribute('stroke') || INK_STROKE).toUpperCase();
      if (node.nodeName !== 'path' || typeof node.getTotalLength !== 'function') { dots.push(node); return; }
      if (stroke === '#FFFFFF' && parseFloat(node.getAttribute('stroke-width')) >= 9) { pendingHalo = node; return; }
      if (stroke === INK_STROKE) {
        const halo = pendingHalo && pendingHalo.getAttribute('d') === node.getAttribute('d') ? pendingHalo : null;
        if (pendingHalo && !halo) whites.push(pendingHalo);
        ink.push({ node: node, halo: halo });
        pendingHalo = null;
        return;
      }
      if (pendingHalo) { whites.push(pendingHalo); pendingHalo = null; }
      if (stroke === '#FFFFFF') whites.push(node);
      else accents.push(node);
    });
    if (pendingHalo) whites.push(pendingHalo);
    return { ink: ink, whites: whites, accents: accents, dots: dots };
  }

  // Maps a path's own coordinates to the svg's (merged and brain_lite are
  // drawn mirrored inside a transformed group).
  function toRoot(svg, node) {
    try {
      const m = svg.getScreenCTM().inverse().multiply(node.getScreenCTM());
      return (p) => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
    } catch (e) {
      return (p) => p;
    }
  }

  function startReveal(section, typeId) {
    if (typeof section.animate !== 'function') return;
    const type = typesById[typeId];
    const dark = Boolean(type) && textColorOn(type.color) === WHITE;
    const anims = [];
    const extrasNodes = [];       // overlays to remove at the end
    const restore = [];           // [node, text] to put back at the end
    const restoreAttrs = [];      // [node, attribute, value] to put back at the end
    let timer = null;
    let raf = 0;
    const T0 = performance.now();
    const play = (node, frames, delay, duration, easing, fill) => {
      if (!node) return null;
      const a = node.animate(frames, { delay: delay, duration: duration, easing: easing || 'ease-out', fill: fill || 'both' });
      anims.push(a);
      return a;
    };
    const spring = 'cubic-bezier(.34, 1.56, .64, 1)';
    const hidden = [{ opacity: 0 }, { opacity: 0 }];

    function finish() {
      if (!reveal) return;
      reveal = null;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      document.removeEventListener('pointerdown', finish, true);
      document.removeEventListener('keydown', onKey, true);
      anims.forEach((a) => { try { a.cancel(); } catch (e) { /* already gone */ } });
      extrasNodes.forEach((node) => node.remove());
      restore.forEach((pair) => { pair[0].textContent = pair[1]; });
      restoreAttrs.forEach((r) => { if (r[2] === null) r[0].removeAttribute(r[1]); else r[0].setAttribute(r[1], r[2]); });
      document.documentElement.classList.remove('is-revealing');
      // was-revealed keeps the card from playing its normal entrance again
      // (it already landed); the card itself is untouched.
      section.classList.remove('is-revealing');
      section.classList.add('was-revealed');
    }
    function onKey(event) {
      if (!event.repeat) finish();
    }
    reveal = { finish: finish };
    section.classList.add('is-revealing');
    document.documentElement.classList.add('is-revealing');

    const wrap = section.querySelector('.card-wrap');
    const frame = section.querySelector('.card-frame');
    const card = section.querySelector('.card');
    if (!wrap || !card) { finish(); return; }

    // Measure first, before anything moves.
    const cardBox = card.getBoundingClientRect();
    const artImg = section.querySelector('img.card-art');
    const artBox = artImg ? artImg.getBoundingClientRect() : null;
    const code = card.querySelector('.card-code');
    const codeLine = code && code.firstElementChild;
    let textW = code ? code.offsetWidth : 0;
    if (code) {
      try {
        const range = document.createRange();
        range.selectNodeContents(codeLine || code);
        textW = range.getBoundingClientRect().width || textW;
      } catch (e) { /* keep the box width */ }
    }

    // Everything but the card is absent until the card has settled.
    const restBlocks = [];
    const left = section.querySelector('.result-left');
    const actions = section.querySelector('.result-actions');
    const badge = section.querySelector('.preview-badge');
    const body = section.querySelector('.result-body');
    const bodyBlocks = body ? Array.from(body.children) : [];
    const topbar = document.querySelector('.topbar');
    const footer = document.querySelector('.site-footer');
    const viewH = window.innerHeight;
    const viewW = document.documentElement.clientWidth;
    // Reading order: on a laptop the buttons under the card come in with the
    // top of the right column; on a phone they are simply the next block.
    const sideBySide = left && body && body.getBoundingClientRect().top < left.getBoundingClientRect().bottom - 40;
    if (sideBySide) {
      restBlocks.push(bodyBlocks[0], actions);
      bodyBlocks.slice(1).forEach((b) => restBlocks.push(b));
    } else {
      restBlocks.push(actions);
      bodyBlocks.forEach((b) => restBlocks.push(b));
    }
    const near = restBlocks.filter((b) => b && b.getBoundingClientRect().top < viewH * 1.05).slice(0, REVEAL.restMax);
    const far = restBlocks.filter((b) => b && near.indexOf(b) === -1);

    // 1. Stage: where the card really sits, and where it is held up.
    const real = wrap.getBoundingClientRect();
    const settle = parseFloat(getComputedStyle(wrap).getPropertyValue('--settle')) || 0;
    const topSpace = topbar ? topbar.getBoundingClientRect().bottom : 0;
    const scale = Math.max(1, Math.min(REVEAL.stageMaxScale,
      (viewH - topSpace - 32) / real.height, (viewW - 24) / real.width));
    const dx = viewW / 2 - (real.left + real.width / 2);
    const dy = topSpace + (viewH - topSpace) / 2 - (real.top + real.height / 2) - 6;
    const staged = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + scale.toFixed(3) + ') rotate(0deg)';
    const settled = 'translate(0px,0px) scale(1) rotate(' + settle + 'deg)';
    play(wrap, [
      { opacity: 0, transform: staged.replace(/scale\([^)]*\)/, 'scale(' + (scale * 0.86).toFixed(3) + ')').replace('rotate(0deg)', 'rotate(-5deg)') },
      { opacity: 1, transform: staged }
    ], REVEAL.cardAt, REVEAL.cardMs, spring);
    // 5a. ...and back to its real place later. (Two animations on one
    // element: the later one takes over when it starts.)
    play(wrap, [{ transform: staged }, { transform: settled }], REVEAL.settleAt, REVEAL.settleMs,
      'cubic-bezier(.3, .7, .2, 1)', 'forwards');

    [topbar, footer, badge, actions].concat(bodyBlocks).forEach((node) => {
      if (node) play(node, hidden, 0, REVEAL.restAt, 'linear', 'forwards');
    });

    // 2. The pen.
    const img = section.querySelector('img.card-art');
    const art = img ? inlineArt(typeId) : null;
    let penJob = null;
    if (art) {
      img.after(art);
      extrasNodes.push(art);
      // Big and centred on the card while it is drawn: the ink (its own
      // bounding box, plus the line width) as large as the card allows, at
      // most artMaxScale. A plain transform on the SVG, so it is drawn as
      // vector at that size; it shrinks back to its place with the code.
      if (artBox && artBox.width > 0) {
        let ink = { x: 20, y: 20, width: 200, height: 200 };
        try {
          const b = art.getBBox();
          if (b.width > 0 && b.height > 0) ink = { x: b.x - 4, y: b.y - 4, width: b.width + 8, height: b.height + 8 };
        } catch (e) { /* keep the guess */ }
        const unit = artBox.width / 240;   // px per drawing unit at its real size
        const big = Math.max(1, Math.min(REVEAL.artMaxScale,
          (cardBox.width * 0.86) / (ink.width * unit), (cardBox.height * 0.78) / (ink.height * unit)));
        const inkCx = (ink.x + ink.width / 2) * unit;
        const inkCy = (ink.y + ink.height / 2) * unit;
        const tx = cardBox.width / 2 - (artBox.left - cardBox.left) - big * inkCx;
        const ty = cardBox.height * 0.47 - (artBox.top - cardBox.top) - big * inkCy;
        const bigTransform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' + big.toFixed(3) + ')';
        art.style.transformOrigin = '0 0';
        art.style.transform = bigTransform;
        play(art, [{ transform: bigTransform }, { transform: 'translate(0px,0px) scale(1)' }],
          REVEAL.artBackAt, REVEAL.artBackMs, 'cubic-bezier(.55, 0, .25, 1)', 'forwards');
      }
      const parts = sortArt(art);
      // Every line is hidden first: nothing may flash complete before it is drawn.
      const prep = (node) => {
        let len = 0;
        try { len = node.getTotalLength(); } catch (e) { len = 0; }
        node.style.strokeDasharray = len + ' ' + (len + 40);
        node.style.strokeDashoffset = String(len + 20);
        return len;
      };
      const lines = parts.ink.map((entry) => {
        const len = prep(entry.node);
        if (entry.halo) prep(entry.halo);
        return { node: entry.node, halo: entry.halo, len: len, map: toRoot(art, entry.node) };
      }).filter((l) => l.len > 0);
      // Longest lines first: the outline, then the details.
      lines.sort((a, b) => b.len - a.len);
      const quick = (list, at, ms) => {
        list.forEach((node, i) => {
          const len = prep(node);
          const each = Math.max(90, ms * 0.55);
          const delay = at + (list.length > 1 ? (ms - each) * i / (list.length - 1) : 0);
          play(node, [{ strokeDashoffset: len + 20 }, { strokeDashoffset: 0 }], delay, each, 'cubic-bezier(.5, 0, .3, 1)');
        });
      };
      let inkAt = REVEAL.drawAt;
      let inkMs = REVEAL.drawMs;
      if (dark) {
        quick(parts.whites, REVEAL.drawAt, REVEAL.darkWhiteMs);
        inkAt += REVEAL.darkWhiteMs + 60;
        inkMs -= REVEAL.darkWhiteMs + 60;
        quick(parts.accents, inkAt + inkMs, REVEAL.fillMs);
      } else {
        quick(parts.whites.concat(parts.accents), inkAt + inkMs, REVEAL.fillMs);
      }
      parts.dots.forEach((node, i) => play(node, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }],
        inkAt + inkMs + 40 * i, 200, spring));
      parts.dots.forEach((node) => { node.style.transformBox = 'fill-box'; node.style.transformOrigin = 'center'; });

      // The schedule: each line gets time in proportion to its length; the
      // moves between lines share travelShare of the time by distance.
      const start = (l) => l.map(l.node.getPointAtLength(0));
      const stop = (l) => l.map(l.node.getPointAtLength(l.len));
      const moves = lines.map((l, i) => {
        if (i === 0) return 0;
        const a = stop(lines[i - 1]);
        const b = start(l);
        return Math.hypot(b.x - a.x, b.y - a.y);
      });
      const totalLen = lines.reduce((sum, l) => sum + l.len, 0) || 1;
      const totalMove = moves.reduce((sum, m) => sum + m, 0) || 1;
      const drawTime = inkMs * (1 - REVEAL.travelShare);
      const moveTime = inkMs * REVEAL.travelShare;
      let t = inkAt;
      const steps = [];
      lines.forEach((l, i) => {
        if (i > 0) {
          const ms = moveTime * moves[i] / totalMove;
          steps.push({ kind: 'move', t0: t, t1: t + ms, from: stop(lines[i - 1]), to: start(l) });
          t += ms;
        }
        const ms = Math.max(10, drawTime * l.len / totalLen);
        steps.push({ kind: 'draw', t0: t, t1: t + ms, line: l });
        t += ms;
      });
      const pen = makePen();
      pen.style.opacity = '0';
      art.appendChild(pen);
      penJob = { steps: steps, pen: pen, startAt: inkAt, endAt: t, done: 0, first: lines.length ? start(lines[0]) : { x: 120, y: 120 } };
    }

    // 3. Impact.
    if (code) {
      // Scale around the middle of the letters, as big as the window allows.
      const from = Math.max(REVEAL.codeMinFromScale, Math.min(REVEAL.codeFromScale, (viewW * 0.96) / (textW * scale)));
      restoreAttrs.push([code, 'style', code.getAttribute('style')]);
      code.style.transformOrigin = (textW / 2).toFixed(1) + 'px 55%';
      const hit = (REVEAL.impactAt - REVEAL.codeAt) / REVEAL.codeMs;
      // Solid almost at once, then it falls: accelerating all the way down,
      // a hard stop a touch under size, and back.
      play(code, [
        { opacity: 0, transform: 'scale(' + from.toFixed(2) + ')', easing: 'linear' },
        { opacity: 1, transform: 'scale(' + (from * 0.93).toFixed(2) + ')', offset: hit * 0.18, easing: 'cubic-bezier(.6, 0, .95, .5)' },
        { opacity: 1, transform: 'scale(.94)', offset: hit, easing: 'cubic-bezier(.2, .8, .3, 1)' },
        { opacity: 1, transform: 'scale(1)' }
      ], REVEAL.codeAt, REVEAL.codeMs, 'linear');
      // The card takes the hit.
      play(frame, [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(' + REVEAL.knockDeg + 'deg) translateY(1%)', offset: 0.18 },
        { transform: 'rotate(-1deg)', offset: 0.5 },
        { transform: 'rotate(.35deg)', offset: 0.78 },
        { transform: 'rotate(0deg)' }
      ], REVEAL.impactAt, REVEAL.knockMs, 'ease-out', 'none');
      // A ring of ink specks thrown off the edge of the code. (offsetLeft
      // and offsetTop ignore transforms: the card is the offset parent.)
      const codeH = code.offsetHeight;
      const ring = el('div', {
        class: 'reveal-specks', 'aria-hidden': 'true',
        style: 'left:' + (code.offsetLeft + textW / 2).toFixed(1) + 'px;top:' +
          (code.offsetTop + codeH * 0.52).toFixed(1) + 'px'
      });
      const count = 16;
      const rx = textW / 2 + codeH * 0.08;
      const ry = codeH * 0.42;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.14 : -0.09);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const push = codeH * (0.28 + (i % 3) * 0.1);
        const speck = el('i', { class: 'reveal-speck' + (i % 4 === 0 ? ' is-big' : (i % 3 === 0 ? ' is-small' : '')) });
        ring.appendChild(speck);
        const at = (k) => 'translate(' + (cos * (rx + push * k)).toFixed(1) + 'px,' + (sin * (ry + push * k)).toFixed(1) + 'px)';
        play(speck, [
          { opacity: 0, transform: at(0) + ' scale(.5)' },
          { opacity: 1, transform: at(0.55) + ' scale(1)', offset: 0.3 },
          { opacity: 0, transform: at(1) + ' scale(.7)' }
        ], REVEAL.impactAt - 10, 420, 'cubic-bezier(.15, .7, .3, 1)');
      }
      card.appendChild(ring);
      extrasNodes.push(ring);
    }

    // Name, tagline, the top line: once the code is down.
    ['.card-top', '.card-words'].forEach((sel) => play(card.querySelector(sel),
      [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], REVEAL.wordsAt, REVEAL.wordsMs));

    // 4. The numbers.
    play(card.querySelector('.card-bottom'), [{ opacity: 0 }, { opacity: 1 }], REVEAL.numbersAt - 60, 160);
    const purityNode = card.querySelector('.card-purity-num');
    const matchNode = card.querySelector('.card-match-num span');
    const counters = [];
    [[purityNode, 100], [matchNode, 0]].forEach((pair) => {
      const node = pair[0];
      if (!node) return;
      const target = parseInt(node.textContent, 10);
      if (!Number.isFinite(target)) return;
      restore.push([node, node.textContent]);
      node.textContent = String(pair[1]);
      counters.push({ node: node, from: pair[1], to: target, last: pair[1] });
    });
    const rows = Array.from(card.querySelectorAll('.bar-squares'));
    const perRow = REVEAL.numbersMs * 0.45;
    rows.forEach((row, r) => {
      const on = Array.from(row.querySelectorAll('i.on'));
      on.forEach((sq, i) => play(sq, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }],
        REVEAL.numbersAt + r * (REVEAL.numbersMs - perRow - 120) / Math.max(1, rows.length - 1) + i * perRow / 10, 140, spring));
    });

    // 5b. The rest of the page, block by block.
    if (topbar) play(topbar, [{ opacity: 0 }, { opacity: 1 }], REVEAL.restAt, REVEAL.restMs);
    near.forEach((node, i) => play(node, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      REVEAL.restAt + i * REVEAL.restStep, REVEAL.restMs, 'cubic-bezier(.2, .7, .3, 1)'));
    far.concat([footer, badge]).forEach((node) => {
      if (node && near.indexOf(node) === -1) play(node, [{ opacity: 0 }, { opacity: 1 }], REVEAL.restAt + near.length * REVEAL.restStep, 1);
    });

    // One loop moves the pen, draws the lines and counts the numbers.
    let buzzed = false;
    const coarse = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
    function frameTick(now) {
      const t = now - T0;
      if (penJob) {
        const job = penJob;
        while (job.done < job.steps.length && job.steps[job.done].t1 <= t) {
          const s = job.steps[job.done];
          if (s.kind === 'draw') {
            s.line.node.style.strokeDashoffset = '0';
            if (s.line.halo) s.line.halo.style.strokeDashoffset = '0';
          }
          job.done += 1;
        }
        let x = job.first.x;
        let y = job.first.y;
        let lift = 1;
        let alpha = 0;
        if (t >= job.startAt - 160 && t < job.endAt + 220) {
          alpha = Math.min(1, (t - (job.startAt - 160)) / 160, Math.max(0, (job.endAt + 220 - t) / 220));
          const s = job.steps[job.done];
          if (!s) {
            const last = job.steps[job.steps.length - 1];
            const end = last.kind === 'draw' ? last.line.map(last.line.node.getPointAtLength(last.line.len)) : last.to;
            const p = Math.min(1, (t - job.endAt) / 220);
            x = end.x + 30 * p; y = end.y - 40 * p; lift = 1;
          } else if (t < s.t0) {
            lift = 1;
          } else if (s.kind === 'draw') {
            const p = (t - s.t0) / (s.t1 - s.t0);
            const at = s.line.len * p;
            const point = s.line.map(s.line.node.getPointAtLength(at));
            x = point.x; y = point.y; lift = 0;
            const off = String(s.line.len - at);
            s.line.node.style.strokeDashoffset = off;
            if (s.line.halo) s.line.halo.style.strokeDashoffset = off;
          } else {
            const p = (t - s.t0) / (s.t1 - s.t0);
            const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            x = s.from.x + (s.to.x - s.from.x) * e;
            y = s.from.y + (s.to.y - s.from.y) * e;
            lift = Math.sin(Math.PI * p);
          }
        }
        job.pen.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (y - 7 * lift).toFixed(1) + ') rotate(' + (32 + 5 * lift).toFixed(1) + ')');
        job.pen.style.opacity = alpha.toFixed(2);
      }
      if (t >= REVEAL.impactAt && !buzzed) {
        buzzed = true;
        if (coarse && navigator.vibrate) { try { navigator.vibrate(18); } catch (e) { /* not important */ } }
      }
      const p = Math.max(0, Math.min(1, (t - REVEAL.numbersAt) / (REVEAL.numbersMs - 80)));
      const eased = 1 - Math.pow(1 - p, 3);
      counters.forEach((c) => {
        const v = Math.round(c.from + (c.to - c.from) * eased);
        if (v !== c.last) { c.node.textContent = String(v); c.last = v; }
      });
      if (t < REVEAL.end) raf = requestAnimationFrame(frameTick);
    }
    raf = requestAnimationFrame(frameTick);

    document.addEventListener('pointerdown', finish, true);
    document.addEventListener('keydown', onKey, true);
    timer = setTimeout(finish, REVEAL.end);
  }

  // ---------- Result ----------

  /*
   * Sample players, used by ?preview=<typeId> and when someone taps another
   * type on the result screen to look at it. Every play draws different
   * statements, so a sample cannot be a list of ids. Each one is written as
   * band counts per section, like the personas in tools/personas.js:
   * { school: [mild, medium, extreme] } = how many of the shown statements of
   * each band it admits (0, 1 or 2). scoring.admitByCounts turns that into
   * real ids on this play's draw, and scoring.js really scores them as that
   * type on every draw (tests/gallery.test.js checks it), so a preview shows
   * real evidence, a real match and, for school_lite and soulmate, a real
   * secondary type. None of them ends in a tie decided by lot. If a rule
   * change ever moves one, the console says so (see renderResult).
   * The object below is plain data: the tests read it straight from this file.
   */
  const SAMPLE_COUNTS = {
    untouched:   { school: [1, 0, 0], brain: [1, 0, 0] },
    // One extreme Bond and both extreme Heart statements left out on purpose:
    // with the hidden rule met, the sample would show the locked hidden type
    // as its "Also" chip.
    merged:      { school: [2, 2, 2], work: [2, 2, 2], heart: [2, 2, 0], brain: [2, 2, 2], bond: [2, 2, 1] },
    balanced:    { school: [2, 0, 0], work: [2, 0, 0], heart: [2, 0, 0], brain: [2, 0, 0], bond: [1, 0, 0] },
    soulmate:    { bond: [2, 2, 2], heart: [1, 0, 1], school: [1, 0, 0] },
    school_lite: { school: [2, 2, 0], heart: [1, 2, 0], work: [1, 0, 0], bond: [1, 0, 0] },
    school_deep: { school: [2, 2, 1], heart: [1, 0, 0], bond: [1, 0, 0] },
    work_lite:   { work: [2, 2, 0], school: [1, 0, 0], brain: [1, 0, 0] },
    work_deep:   { work: [2, 2, 2], school: [1, 0, 0], heart: [1, 0, 0] },
    heart_lite:  { heart: [2, 0, 1], bond: [1, 0, 0] },
    heart_deep:  { heart: [2, 2, 2], work: [1, 0, 0], bond: [1, 0, 0], brain: [0, 1, 0] },
    brain_lite:  { brain: [2, 2, 0], school: [1, 0, 0], work: [2, 0, 0], heart: [1, 0, 0], bond: [1, 0, 0] },
    brain_deep:  { brain: [2, 2, 2], school: [1, 0, 0], work: [1, 0, 0], heart: [1, 0, 0], bond: [1, 0, 0] },
    bond_lite:   { bond: [2, 1, 0], school: [1, 0, 0] },
    bond_deep:   { bond: [2, 2, 1], heart: [1, 0, 0], school: [1, 0, 0] }
  };
  // The sample player's "Guilty" ids on this play's draw.
  function sampleIds(typeId) {
    return scoring.admitByCounts(content, state.drawn, SAMPLE_COUNTS[typeId] || {});
  }

  // "school_lite" -> "school"; null for the four special types.
  function dimOfType(typeId) {
    return typeId && typeId.indexOf('_') > 0 ? typeId.split('_')[0] : null;
  }

  // Word for a statement's band (mild / medium / extreme), and the class
  // that sizes its square in "Section by section".
  function weightWord(band) {
    if (band === 'extreme') return t('levelExtreme');
    if (band === 'medium') return t('levelMedium');
    return t('levelMild');
  }
  function weightClass(band) {
    return 'w' + (scoring.BAND_WEIGHTS[band] || 1);
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
    return Object.assign({ aptDepth: depth, aptGallery: state.gallery, aptPeek: state.peek }, seedState());
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
    // was switched further up, or a link's ?seed= if "New questions" was
    // used further up. The address must match the play on screen.
    setUrlParams({ lang: state.lang, seed: seedParam(), vs: challengeParam() });
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
    const result = scoring.score(ticked, content, state.drawn, null, sampleType ? {} : state.playoffAnswers);
    if (sampleType && result.typeId !== sampleType) {
      console.warn('[AI Purity Test] the sample answers for "' + sampleType + '" now score as "' +
        result.typeId + '". Update SAMPLE_COUNTS in app.js.');
    }
    const typeId = sampleType || result.typeId;
    const type = typesById[typeId];
    const model = buildCardModel(type, result);
    const isSample = Boolean(sampleType);
    // A real result that met the hidden type unlocks its card in the grid,
    // on this device, for good. Previews and peeks never do.
    if (!isSample && scoring.earnedHidden(result)) scoring.rememberHiddenUnlocked(deviceStorage());
    // The collection: the type a finished play ended on, on this device.
    // Same rule as the unlock: previews, peeks and comparison links never count.
    if (!isSample) extras.rememberCollected(deviceStorage(), result.typeId);

    document.title = type.code + ' ' + L(type.name) + ' | ' + t('appName');

    const typeVars = '--type-bg:' + type.color + ';--type-fg:' + textColorOn(type.color);

    // While peeking, the actions would save or share a type the person did
    // not get, so they are left out (the way back sits at the bottom instead).
    const left = el('div', { class: 'result-left' }, [
      state.preview && !state.peek && el('p', { class: 'preview-badge', text: t('previewBadge') }),
      el('div', { class: 'card-wrap' }, [buildCardDom(model)]),
      !state.peek && renderActions(model)
    ]);

    if (!isSample && state.challenge) track('compare-shown', 'play');
    const body = el('div', { class: 'result-body', style: typeVars }, [
      // After a challenge, the comparison comes first: it is what they came for.
      !isSample && state.challenge && renderCompare({
        drawn: state.drawn, seed: state.seed, mine: ticked, friend: state.challenge,
        minePlayoff: state.playoffAnswers, friendPlayoff: state.challengePlayoff,
        friendCode: state.challengeCode, sendBack: true
      }),
      renderVerdict(type, result, isSample),
      el('p', { class: 'roast' }, keepQuotes(L(type.roast))),
      renderSigns(type),
      el('dl', { class: 'traits' }, [
        el('div', {}, [el('dt', { text: t('superpower') }), el('dd', {}, keepQuotes(L(type.superpower)))]),
        el('div', {}, [el('dt', { text: t('weakness') }), el('dd', {}, keepQuotes(L(type.weakness)))])
      ]),
      el('figure', { class: 'ai-says' }, [
        el('figcaption', { text: t('aiSays') }),
        el('blockquote', { class: 'bubble' }, keepQuotes(L(type.aiSays)))
      ]),
      renderDimensions(type, result, new Set(ticked), isSample),
      renderSecondary(type, result),
      renderPairs(type),
      state.peek
        ? renderPeekBack('peek-back-bottom')
        : el('div', { class: 'result-end' }, [
          el('button', { class: 'btn-text', type: 'button', onclick: startOver }, [t('newQuestions')]),
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
      // Up to 3 mild answers and up to 3 exhibits today, but if the limits
      // ever differ, say "three of them" instead of "everything".
      lead = result.total > evidence.length ? t('evidenceLeadSome', { n: result.total }) : t('evidenceLeadOnly');
    } else if (type.id === 'merged' || type.id === 'balanced') lead = t('evidenceLeadSpread', { n: result.total });
    else lead = t('evidenceLead');

    const letters = ['A', 'B', 'C', 'D', 'E'];
    const exhibits = evidence.length
      ? el('ol', { class: 'exhibits' }, evidence.map((s, i) => {
        return el('li', { class: 'exhibit' }, [
          el('span', { class: 'exhibit-tag', 'aria-hidden': 'true', text: letters[i] }),
          el('div', { class: 'exhibit-body' }, [
            el('p', { class: 'exhibit-meta' }, [
              el('span', { class: 'visually-hidden', text: t('exhibitLabel', { n: letters[i] }) + ': ' }),
              t('exhibitMeta', { dim: L(dimsByKey[s.dim].name), weight: weightWord(s.band), pts: pts(scoring.statementWeight(s)) })
            ]),
            // Same line-break rules as the big statement on the question screen.
            el('p', { class: 'exhibit-text' }, statementPieces(L(s.text)))
          ])
        ]);
      }))
      : el('p', { class: 'exhibit-none', text: t('evidenceNone') });

    return el('section', { class: 'verdict' }, [
      kicker(t('whyTitle')),
      el('p', { class: 'verdict-why' }, keepQuotes(L(type.why))),
      el('p', { class: 'exhibits-lead' }, keepQuotes(lead)),
      exhibits,
      el('p', { class: 'verdict-match' }, [
        el('strong', { text: t('matchHeading', { n: result.match }) }),
        state.lang === 'zh' ? '' : ' ',
        isSample ? t('matchSample') : matchText(type, result)
      ]),
      !isSample && unsureLine(),
      !isSample && reasonBlock(result),
      !isSample && historyLine()
    ]);
  }

  // Two lines built from the player's own answers (extras.reasonLines): a
  // contrast in plain numbers, and a statement they did not admit that marks
  // the edge of the result. The keys are written out so the tests can find
  // them.
  function reasonText(key, vars) {
    switch (key) {
      case 'reasonDimContrast': return t('reasonDimContrast', vars);
      case 'reasonDimAll': return t('reasonDimAll', vars);
      case 'reasonDimOne': return t('reasonDimOne', vars);
      case 'reasonDimSome': return t('reasonDimSome', vars);
      case 'reasonAnalogCount': return t('reasonAnalogCount', vars);
      case 'reasonAnalogNone': return t('reasonAnalogNone', vars);
      case 'reasonAnalogPassed': return t('reasonAnalogPassed', vars);
      case 'reasonBalancedCounts': return t('reasonBalancedCounts', vars);
      case 'reasonBalancedMax': return t('reasonBalancedMax', vars);
      case 'reasonMergedSpread': return t('reasonMergedSpread', vars);
      case 'reasonMergedZero': return t('reasonMergedZero', vars);
      case 'reasonMergedEven': return t('reasonMergedEven', vars);
      case 'reasonHeaviestPassed': return t('reasonHeaviestPassed', vars);
      case 'reasonPassedNone': return t('reasonPassedNone', vars);
      case 'reasonSoulmate': return t('reasonSoulmate', vars);
      default: return '';
    }
  }
  // A statement quoted inside a sentence: “...” in English, 「...」 in
  // Chinese (quotes inside it become 『』).
  function quoteStatement(id) {
    const text = L(statementsById[id] && statementsById[id].text);
    return state.lang === 'zh' ? '「' + text.replace(/「/g, '『').replace(/」/g, '』') + '」' : '“' + text + '”';
  }
  function reasonBlock(result) {
    const sep = state.lang === 'zh' ? '、' : ', ';
    const lines = extras.reasonLines(result, content, state.drawn, yesIds()).map((line) => {
      const vars = Object.assign({}, line.vars);
      if (vars.dim) vars.dim = L(dimsByKey[vars.dim].name);
      if (Array.isArray(vars.list)) vars.list = vars.list.map((it) => L(dimsByKey[it.dim].name) + ' ' + it.n).join(sep);
      if (line.quoteId) vars.quote = quoteStatement(line.quoteId);
      return el('p', { class: 'verdict-reason' }, keepQuotes(reasonText(line.key, vars)));
    });
    return el('div', { class: 'verdict-reasons' }, lines);
  }

  // From three finished plays on this device: which types the last few
  // were, and the most frequent (extras.historySummary).
  function historyLine() {
    const summary = extras.historySummary(extras.playHistory(deviceStorage()));
    if (!summary) return null;
    const sep = state.lang === 'zh' ? '、' : ', ';
    const code = (id) => typesById[id].code;
    // Every play a different type: no "most often" to name.
    if (summary.counts[0].count === 1) {
      const codes = summary.counts.map((c) => code(c.typeId));
      return el('p', { class: 'verdict-history' }, keepWhole(t('historyAllDifferent', { n: summary.n, list: codes.join(sep) }), codes));
    }
    const list = summary.counts.map((c) => code(c.typeId) + ' ' + c.count).join(sep);
    const most = summary.most.map(code);
    const mostText = most.length === 1 ? most[0] : t('listAnd', { a: most.slice(0, -1).join(sep), b: most[most.length - 1] });
    return el('p', { class: 'verdict-history' }, keepWhole(t('historyLine', { n: summary.n, list: list, most: mostText }), most));
  }

  // One quiet line under the match, only when the player answered "Not
  // sure" at least once: how many, and that they counted as Never. From
  // scoring.UNSURE_MANY on, one more sentence: the purity is probably kind.
  // The card and the PNG never mention it.
  function unsureLine() {
    const n = scoring.unsureCount(state.answers);
    if (n === 0) return null;
    let text = t('unsureNote', { n: n, total: state.drawn.length });
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
    // Nothing in the answers separates the two: scoring.js decided it by the
    // play's lot (fixed per play, fair across players). Say so plainly.
    // Level answer for answer: a play-off settled it (scoring.playoffRounds),
    // or, when the play-off ended level too (or could not be held), the play's
    // lot (fixed per play, fair across players). Say which, plainly.
    else if (result.tieBreak === 'playoff') text = t('matchPlayoff', Object.assign({ round: result.playoff.decidedRound }, vars));
    else if (result.tieBreak === 'lot' && result.playoff && result.playoff.played > 0) text = t('matchPlayoffLot', vars);
    else if (result.tieBreak === 'lot') text = t('matchTieLot', vars);
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
      el('ul', { class: 'signs' }, type.signs.map((sign) => el('li', {}, keepQuotes(L(sign)))))
    ]);
  }

  // 6. Each section: the six statements this play showed from it, as squares
  // that grow with their weight (mildest on the left, filled = admitted), its
  // points, and the one-line read for its band.
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
      // This section's drawn statements, lightest first (sort is stable, so
      // statements of one band keep the order they were asked in).
      const shownHere = playOrder().filter((s) => s.dim === d.key)
        .sort((a, b) => scoring.statementWeight(a) - scoring.statementWeight(b));
      const squares = shownHere.map((s) =>
        el('i', { class: weightClass(s.band) + (ticked.has(s.id) ? ' on' : '') }));
      const shown = result.shown[d.key] || shownHere.length;
      let tag = null;
      if (d.key === leadDim) tag = el('span', { class: 'dim-tag is-lead', text: t('dimLeads') });
      else if (tied.has(d.key)) tag = el('span', { class: 'dim-tag', text: t('dimTied') });
      else if (d.key === secondDim) tag = el('span', { class: 'dim-tag', text: t('dimSecond') });

      return el('li', { class: 'dim-row' + (d.key === leadDim ? ' is-lead' : '') }, [
        el('div', { class: 'dim-top' }, [
          el('span', { class: 'dim-name', text: L(d.name) }),
          tag,
          el('span', { class: 'dim-meta', 'aria-hidden': 'true', text: t('dimRowMeta', { n: n, shown: shown, pts: pts(p), band: bandWord(band) }) })
        ]),
        el('span', {
          class: 'dim-squares', role: 'img',
          'aria-label': t('dimAria', { name: L(d.name), n: n, shown: shown, pts: pts(p), band: bandWord(band) })
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

  // Long result text (the why line, signs, roast, pairings): a short
  // 「quoted」 type name or phrase never splits across two lines
  // (「大 / 脑云托管」). The rest of the text wraps normally.
  function keepQuotes(text) {
    const quotes = String(text).match(/「[^「」]{1,12}」/g) || [];
    return keepWhole(String(text), Array.from(new Set(quotes)));
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
        // The other type's character, small, when art.js has one (decorative).
        el('span', { class: 'pair-head' }, [
          artImg(otherId, 'pair-art', '--art-bg:' + other.color),
          chip(other),
          el('span', { class: 'pair-name', text: L(other.name) })
        ]),
        el('span', { class: 'pair-line' }, keepQuotes(L(line))),
        el('span', { class: 'pair-go', 'aria-hidden': 'true', text: '→' })
      ]);
    }
    const best = pair(t('bestWithTitle'), type.bestWith, type.bestWithLine);
    const clash = pair(t('clashWithTitle'), type.clashWith, type.clashWithLine);
    if (!best && !clash) return null;
    return el('section', { class: 'r-section' }, [
      // The way to all fourteen sits just above the two pairings (not under
      // them: the second link, next to New questions, follows right after).
      // Left out on a peek, where the way back is the bar on top.
      !state.peek && el('p', { class: 'types-more' }, [typesLink('types-pairs')]),
      el('div', { class: 'pairs' }, [best, clash])
    ]);
  }

  // 1b. Under the card: Save image is the main action; Copy link and Share
  // sit side by side under it. ("New questions" lives at the bottom of the page.)
  function renderActions(model) {
    const row = [el('button', { class: 'btn btn-ghost', type: 'button', onclick: copyLink }, [t('copyLink')])];
    if (navigator.share) {
      row.push(el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => shareResult(model) }, [t('share')]));
      prepareShareFile(model);
    }
    // On the player's own result (renderActions is never called on a peek;
    // a preview has no answers to send), one more action: a link that
    // carries these answers, so a friend plays the same 30 and then sees
    // how the two compare. The line under it says plainly what it reveals,
    // before anything is copied.
    const challenge = !state.preview && el('div', { class: 'challenge' }, [
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: copyChallengeLink }, [t('challengeAction')]),
      el('p', { class: 'challenge-note', text: t('challengePrivacy') })
    ]);
    return el('div', { class: 'result-actions' }, [
      el('div', { class: 'actions' }, [
        el('button', { class: 'btn btn-primary', type: 'button', onclick: () => saveImage(model) }, [t('saveImage')]),
        el('div', { class: 'actions-row' }, row)
      ]),
      challenge
    ]);
  }

  // ---------- Compare with a friend ----------
  /*
   * opts: { drawn, seed, mine, friend, friendCode, sendBack, heading }
   *   mine / friend: the "Guilty" ids of "you" and "your friend" on this draw.
   * Both results come from scoring.score() via extras.comparePlays, from
   * the seed and the answer bits alone, so both sides always see the types
   * and numbers the players saw. The two cards are small, static copies of
   * the grid cards (no buttons: the friend's result is not a sample to peek at).
   */
  function renderCompare(opts) {
    const cmp = extras.comparePlays(content, opts.drawn, opts.mine, opts.friend, opts.minePlayoff, opts.friendPlayoff);
    const mineType = typesById[cmp.mine.typeId];
    const friendType = typesById[cmp.friend.typeId];

    function side(label, type, result) {
      return el('figure', { class: 'compare-side' }, [
        el('figcaption', { class: 'compare-who', text: label }),
        staticTile(type),
        el('p', { class: 'compare-purity', text: t('comparePurity', { n: result.purity }) })
      ]);
    }

    let purer;
    if (cmp.purer === 'mine') purer = t('comparePurerYou', { pts: pts(cmp.gap) });
    else if (cmp.purer === 'friend') purer = t('comparePurerFriend', { pts: pts(cmp.gap) });
    else purer = t('compareTie', { n: cmp.mine.purity });

    // How the two types get along: the type's own pairing line when "your"
    // type names theirs, otherwise a short neutral line.
    const rel = cmp.relation;
    let relation;
    if (rel.kind === 'best' || rel.kind === 'clash') {
      const owner = typesById[rel.typeId];
      relation = [
        el('span', { class: 'compare-tag', text: rel.kind === 'best' ? t('bestWithTitle') : t('clashWithTitle') }),
        ...keepQuotes(L(rel.kind === 'best' ? owner.bestWithLine : owner.clashWithLine))
      ];
    } else if (rel.kind === 'same') relation = [t('compareSame')];
    else if (rel.kind === 'theyBest') relation = [t('compareTheyBest')];
    else if (rel.kind === 'theyClash') relation = [t('compareTheyClash')];
    else relation = [t('compareNone')];

    function list(title, ids, emptyText) {
      if (!ids.length && !emptyText) return null;
      return el('div', { class: 'compare-list' }, [
        el('h3', { class: 'compare-list-title', text: title }),
        ids.length
          ? el('ul', {}, ids.map((id) => {
            const st = statementsById[id];
            return el('li', {}, [
              el('p', { class: 'exhibit-meta', text: t('compareMeta', { dim: L(dimsByKey[st.dim].name), weight: weightWord(st.band) }) }),
              el('p', { class: 'exhibit-text' }, statementPieces(L(st.text)))
            ]);
          }))
          : el('p', { class: 'compare-empty', text: emptyText })
      ]);
    }

    return el('section', { class: 'compare' }, [
      opts.heading || kicker(t('compareTitle')),
      el('div', { class: 'compare-cards' }, [
        side(t('compareYou'), mineType, cmp.mine),
        side(t('compareFriend'), friendType, cmp.friend)
      ]),
      el('p', { class: 'compare-purer', text: purer }),
      el('p', { class: 'compare-relation' }, relation),
      list(t('compareBoth'), cmp.both, t('compareBothNone')),
      list(t('compareOnlyFriend'), cmp.onlyFriend),
      list(t('compareOnlyYou'), cmp.onlyMine),
      opts.sendBack && el('div', { class: 'challenge compare-send' }, [
        el('button', { class: 'btn btn-primary', type: 'button', onclick: () => copySendBack(opts) }, [t('sendBack')]),
        el('p', { class: 'challenge-note', text: t('sendBackNote') })
      ])
    ]);
  }

  // A reply link: the comparison on its own, straight from the address.
  // "You" is the person who sent the challenge (the reply goes back to them).
  function renderReply() {
    const r = state.reply;
    document.title = t('compareTitle') + ' | ' + t('appName');
    return el('section', { class: 'screen reply' }, [
      el('p', { class: 'seed-note-alone' }, [el('span', { class: 'seed-note', text: t('replyIntro') })]),
      renderCompare({
        drawn: r.drawn, seed: r.seed, mine: r.mine, friend: r.friend, sendBack: false,
        minePlayoff: r.minePlayoff, friendPlayoff: r.friendPlayoff,
        heading: el('h1', { class: 'reply-title', tabindex: '-1', 'data-focus': true, text: t('compareTitle') })
      }),
      el('div', { class: 'reply-end' }, [
        el('button', { class: 'btn btn-primary btn-big', type: 'button', onclick: leaveReply }, [t('replyStart')])
      ])
    ]);
  }

  // From a reply link to a play of one's own: a new set of 30.
  function leaveReply() {
    state.reply = null;
    state.challenge = null;
    state.challengeCode = null;
    state.from = null;
    state.preview = null;
    startPlay();
    setUrlParams({ vs: null, re: null, from: null, preview: null, seed: seedParam() });
    go('landing');
  }

  function baseUrl() {
    return location.href.split(/[?#]/)[0];
  }

  // ?seed=<seed>&vs=<this play's answers>: a friend plays the same 30, then compares.
  function challengeUrl() {
    const code = extras.encodeAnswers(state.seed, state.drawn, yesIds(), playoffForCode());
    return code ? baseUrl() + '?seed=' + state.seed + '&vs=' + code + '&lang=' + state.lang : null;
  }

  function copyChallengeLink() {
    track('challenge-made', 'play');
    const url = challengeUrl();
    if (url) copyText(url, t('challengeCopied'));
    else toast(t('copyFailed'));
  }

  // ?seed=...&vs=<challenger>&re=<mine>: opens straight on the comparison.
  function copySendBack(opts) {
    const minePlayoff = scoring.score(opts.mine, content, opts.drawn, null, opts.minePlayoff || {}).playoff;
    const mine = extras.encodeAnswers(opts.seed, opts.drawn, opts.mine,
      minePlayoff ? { rounds: minePlayoff.rounds, answers: opts.minePlayoff || {} } : null);
    if (!mine || !opts.friendCode) { toast(t('copyFailed')); return; }
    copyText(baseUrl() + '?seed=' + opts.seed + '&vs=' + opts.friendCode + '&re=' + mine + '&lang=' + state.lang, t('linkCopied'));
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
    // The collection on this device, plus the result underneath (so blocked
    // storage still marks the type the player is looking back from).
    const collected = new Set(extras.collectedTypes(deviceStorage()));
    if (own) collected.add(own);
    // How many of the recent finished plays ended on each type.
    const plays = extras.historyCounts(extras.playHistory(deviceStorage()));

    document.title = t('typesTitle') + ' | ' + t('appName');

    function group(title, ids, extraClass) {
      return el('section', { class: 'types-group ' + extraClass }, [
        kicker(title),
        el('ul', { class: 'types-grid' }, ids.filter((id) => typesById[id]).map((id) =>
          el('li', {}, [typeTile(typesById[id], id === own, hiddenOpen, collected.has(id) ? (plays[id] || true) : false)])))
      ]);
    }

    return el('section', { class: 'screen types' }, [
      el('div', { class: 'types-head' }, [
        galleryBack('types-back-top'),
        el('h1', { class: 'types-title', tabindex: '-1', 'data-focus': true, text: t('typesTitle') }),
        el('p', { class: 'types-intro', text: t('typesIntro') }),
        // Only once something is collected: the page is also how people
        // browse the types, so it never nags or greys anything out.
        collected.size > 0 && el('p', { class: 'types-collected', text: t('typesCollected', { n: collected.size, total: content.types.length }) })
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

  // A small ink stamp with a tick on a collected card, or the number of
  // recent plays that ended on it (decorative; the card says "Collected" and
  // the count to screen readers instead). `collected`: false, true, or the
  // number of recent plays.
  const STAMP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 12.5l4 4L18 8"/></svg>';

  function typeTile(type, mine, hiddenOpen, collected) {
    if (type.id === 'soulmate' && !hiddenOpen) {
      // Locked: no code, no name, no colour. Not a button: nothing to open.
      return el('div', { class: 'tcard is-locked' }, [
        el('span', { class: 'tcard-top' }, [el('span', { text: t('typesHidden') })]),
        el('span', { class: 'tcard-code', 'aria-hidden': 'true', text: '???' }),
        el('span', { class: 'visually-hidden', text: t('typesLocked') + '. ' }),
        el('span', { class: 'tcard-hint' }, statementPieces(t('typesLockedHint')))
      ]);
    }
    let stamp = null;
    const playCount = typeof collected === 'number' ? collected : 0;
    if (collected) {
      stamp = el('span', { class: 'tcard-stamp' + (playCount ? ' has-count' : ''), 'aria-hidden': 'true' });
      if (playCount) stamp.textContent = String(playCount);
      else stamp.innerHTML = STAMP_SVG; // static markup, not content
    }
    return el('button', {
      class: 'tcard' + (mine ? ' is-mine' : ''),
      type: 'button',
      'data-nav': 'type-' + type.id,
      style: '--type-bg:' + type.color + ';--type-fg:' + textColorOn(type.color),
      onclick: () => (mine ? closeLayer() : peekAt(type.id))
    }, tileParts(type, mine).concat([
      stamp,
      collected && el('span', { class: 'visually-hidden', text: '. ' + t('typesCollectedMark') +
        (playCount ? ', ' + t('typesPlays', { n: playCount }) : '') })
    ]));
  }

  // A grid card that is not a button (the comparison's two cards).
  function staticTile(type) {
    return el('div', {
      class: 'tcard tcard-static',
      style: '--type-bg:' + type.color + ';--type-fg:' + textColorOn(type.color)
    }, tileParts(type, false));
  }

  // What a grid card shows: top line, character, code, name, tagline.
  function tileParts(type, mine) {
    // The code is fitted with the same measuring as the big card: as large
    // as the card's inner width allows (96%, a little safety margin).
    const code = fitText(type.code, 800, fontStacks().display, TILE_CODE_MAX, 96, 1);
    return [
      el('span', { class: 'tcard-top' }, [
        el('span', { class: 'tcard-label', text: tileLabel(type) }),
        mine && el('span', { class: 'tcard-you', text: t('typesYou') })
      ]),
      // The character, when art.js has one (decorative: the button's name
      // comes from its text). The locked card above never gets one.
      artImg(type.id, 'tcard-art'),
      el('span', {
        class: 'tcard-code',
        style: 'font-size:calc(' + code.size.toFixed(2) + ' * 1cqw)'
      }, [type.code]),
      // statementPieces keeps Chinese from breaking mid-word and keeps
      // "Cloud-Hosted" together in English (see its comment).
      el('span', { class: 'tcard-name' }, statementPieces(L(type.name))),
      el('span', { class: 'tcard-tagline' }, statementPieces(L(type.tagline)))
    ];
  }

  // "New questions" on the result: a new seed, so a new set of 30, straight
  // to the first statement (the landing page has nothing new to say).
  function startOver() {
    track('new-questions');
    startPlay();
    state.preview = null;
    state.from = null;
    state.peek = null;
    state.gallery = false;
    state.challenge = null;
    state.challengeCode = null;
    setUrlParams({ preview: null, from: null, types: null, vs: null, re: null, seed: seedParam() });
    go('question');
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
   *   CODE  (as big as width and height allow)
   *   name, tagline on the left | the type's character on the right
   *   a fixed gap (gapScore), so every card has the same rhythm
   *   PURITY label, score, five bars, note — pinned to the bottom
   *
   * The character (art.js) is the other hero: it is what people screenshot.
   * It sits beside the name and tagline, artMax (47) units square, so it
   * costs no width from the code, the score or the bars; the name and
   * tagline wrap in the narrower column next to it (up to 3 and 4 lines
   * there). Only a name with a very long word ("Professionally") makes the
   * square smaller, down to artMin, so that word still fits at a readable
   * size. A type without a picture gets the plain layout: name and tagline
   * across the full width, the code taking the height instead.
   *
   * The five bars show WEIGHT, not counts: each section fills depth / 10 of
   * its ten squares (depth = points out of the 12 a section can score in one
   * play, as 0..100; see scoring.js). 1 point fills one square, 12 all ten.
   * The type is decided by weight, so the longest bar always belongs to the
   * section that decided it. Counting statements instead would let six mild
   * School answers draw a longer bar than three extreme Heart answers on a
   * card that says HAHA-OK.
   */
  const CARD = {
    width: 100, height: 400 / 3,
    pad: 7, padY: 6.2,                     // side and top/bottom padding
    topSize: 3.4, topLine: 4,
    gapTopMin: 2.5,                        // smallest space between the top row and the code
    codeMaxSize: 28, codeLineRatio: 0.94,  // code size is fitted per type, see buildCardModel
    gapCode: 2.2,
    nameSize: 6.2, nameMinSize: 5.2, nameLine: 7.4, nameMaxLines: 2,
    gapName: 1.4,
    tagSize: 3.9, tagMinSize: 3.5, tagLine: 5.2, tagMaxLines: 2,
    // Beside the character the column is narrow, so more lines are allowed,
    // and the name may shrink a little further for one very long word.
    // nameOneLineArt: a name stays on one line only down to this size;
    // below it, two lines at a larger size read better ("The / Accessory").
    nameMaxLinesArt: 3, nameMinSizeArt: 4.8, nameOneLineArt: 5.6, tagMaxLinesArt: 4,
    // The character: a square on the right, below the code. Every drawing
    // keeps a few percent of empty margin inside its square, so the square
    // may hang artOverX past the right padding and artOverY into the gap
    // above the score without the ink getting closer to the edge or the
    // score than the text does. It also rises into the empty bottom of the
    // code's line box (codes are capitals and digits: nothing hangs below
    // the baseline): by what the font leaves free there, keeping artClear
    // from the glyphs, at most artRaiseMax (see artRaiseFor).
    artMax: 47, artMin: 40, wordsMinW: 36, gapArt: 2.5, artOverX: 2, artOverY: 2.5,
    artRaiseMax: 3, artClear: 1.2,
    gapScore: 3.2,
    scoreLabelSize: 3, scoreLabelLine: 4,
    puritySize: 14, pctSize: 6.6, purityLine: 12.6,
    gapPurity: 1.6,
    barRow: 4.6, barLabelW: 18, barLabelSize: 3.4, barGap: 3,
    barStroke: 0.45, barRadius: 0.8,
    gapBars: 1.8,
    noteSize: 3.1, noteLine: 4.2,
    // The small column on the right of the score: "MATCH" (on the label row),
    // the match number, then the secondary chip ("ALSO [HAHA-OK]") when there
    // is one. It fits beside the score's two rows (plus a little of the gap
    // under them), so it adds no height: 4 + 6.8 + 0.8 + 5.2 = 16.8 <=
    // 4 + 12.6 + 1.6.
    matchSize: 7, matchPctSize: 4, matchLine: 6.8,
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

  // For two or three lines, picks the breaks that make the lines as even as
  // possible, so a single word never sits alone on the last line
  // ("...than / you."). In Chinese a break after clause punctuation or a
  // phrase-ending word (the same ZH_BREAK_AFTER as statementPieces) wins over
  // an even one, so a tagline splits at "，" ("领英上的你，/ 本人有魅力多了"),
  // not mid-word.
  function balanceLines(ctx, tokens, maxWidth, count) {
    const cjk = new RegExp('[' + CJK + ']');
    const canBreak = (i) => i > 0 && i < tokens.length && !NO_LINE_START.test(tokens[i].text);
    // How good a break before token i is: 2 after clause punctuation, 1 after
    // a phrase-ending word ("的"), 0 elsewhere (Latin text: always 0).
    const breakScore = (i) => {
      const last = tokens[i - 1].text.slice(-1);
      if (!cjk.test(tokens[i - 1].text + tokens[i].text) || !ZH_BREAK_AFTER.test(last)) return 0;
      return /[，、：；。！？」…]/.test(last) ? 2 : 1;
    };
    let best = null;
    const consider = (cuts) => {
      const bounds = [0].concat(cuts, tokens.length);
      const lines = [];
      let widest = 0;
      for (let k = 0; k < bounds.length - 1; k++) {
        const line = joinTokens(tokens.slice(bounds[k], bounds[k + 1]));
        widest = Math.max(widest, ctx.measureText(line).width);
        if (widest > maxWidth) return;
        lines.push(line);
      }
      const good = cuts.reduce((sum, i) => sum + breakScore(i), 0);
      if (!best || good > best.good || (good === best.good && widest < best.widest)) {
        best = { widest: widest, good: good, lines: lines };
      }
    };
    for (let i = 1; i < tokens.length; i++) {
      if (!canBreak(i)) continue;
      if (count === 2) consider([i]);
      else for (let j = i + 1; j < tokens.length; j++) if (canBreak(j)) consider([i, j]);
    }
    return best;
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
    if (lines.length === 2 || lines.length === 3) {
      let best = balanceLines(ctx, tokens, maxWidth, lines.length);
      // Chinese: when two lines cannot break at punctuation ("它不记得你，你 /
      // 记得…"), three lines that break at the "，" and at a phrase end read
      // better ("它不记得你，/ 你记得它说的 / 每一句"), if a third line is allowed.
      if (best && lines.length === 2 && maxLines >= 3 && best.good < 2) {
        const three = balanceLines(ctx, tokens, maxWidth, 3);
        if (three && three.good >= 3) best = three;
      }
      if (best) out = best.lines;
    } else if (lines.length > maxLines) {
      // Still too long at the smallest size: cut and add an ellipsis.
      out = out.slice(0, maxLines);
      out[maxLines - 1] = out[maxLines - 1].replace(/\s*\S$/, '') + '…';
    }
    return { size: size, lines: out };
  }

  // Width (card units) of the widest piece of `text` that cannot be broken:
  // a Latin word, or one CJK character.
  function widestToken(text, weight, family, size) {
    const ctx = measurer();
    ctx.font = canvasFont(weight, size, family);
    return Math.max.apply(null, tokenize(text).map((tok) => ctx.measureText(tok.text).width / UNIT).concat(0));
  }

  // How far (card units) the character may rise into the bottom of the
  // code's line box: the room the font leaves under the code's glyphs (in
  // the line box and the gap under it), less artClear, at most artRaiseMax.
  // Worked out from the font's own numbers, the way CSS places the line, so
  // it holds for Avenir Next Condensed and for the "APT Display" fallback.
  function artRaiseFor(codeText, family, sizeUnits) {
    const ctx = measurer();
    ctx.font = canvasFont(800, sizeUnits, family);
    const m = ctx.measureText(codeText);
    const size = sizeUnits * UNIT;
    const ascent = m.fontBoundingBoxAscent !== undefined ? m.fontBoundingBoxAscent : size * 0.8;
    const descent = m.fontBoundingBoxDescent !== undefined ? m.fontBoundingBoxDescent : size * 0.2;
    const inkBelow = m.actualBoundingBoxDescent !== undefined ? Math.max(0, m.actualBoundingBoxDescent) : size * 0.05;
    const line = sizeUnits * CARD.codeLineRatio * UNIT;
    const baseline = (line - (ascent + descent)) / 2 + ascent;
    const free = (line - baseline - inkBelow) / UNIT + CARD.gapCode - CARD.artClear;
    return Math.max(0, Math.min(CARD.artRaiseMax, free));
  }

  function buildCardModel(type, result) {
    const fonts = fontStacks();
    const C = CARD;
    const inner = C.width - C.pad * 2;
    // fill = how many of the ten squares to fill: the section's depth in tenths.
    // Any admitted statement is worth at least 1 point (depth 8), so a touched
    // section always shows at least one square.
    const dims = content.dimensions.map((d) => ({ name: L(d.name), fill: Math.round((result.depth[d.key] || 0) / 10) }));

    // Dimension labels share one size: the largest at which every label fits.
    const labelSize = Math.min.apply(null, dims.map((d) =>
      fitText(d.name, 700, fonts.body, C.barLabelSize, (C.barLabelW - 1.5) * 0.9, 1).size));

    // Body text gets a 10% safety margin: at small screen sizes the system font
    // switches to a wider "text" cut than the canvas measures at PNG size, so a
    // line that just fits in the PNG could spill over the card edge on screen.
    // With a character, the name and tagline wrap in the column beside it.
    const withArt = hasArt(type.id);
    const nameText = L(type.name);
    const tagText = L(type.tagline);
    // The character's size: artMax, unless the name or tagline has a word
    // too wide for the column that leaves, even at their smallest size.
    let artSize = 0;
    if (withArt) {
      const needW = Math.max(C.wordsMinW,
        widestToken(nameText, 700, fonts.body, C.nameMinSizeArt) / 0.92,
        widestToken(tagText, 500, fonts.body, C.tagMinSize) / 0.9);
      artSize = Math.max(C.artMin, Math.min(C.artMax, inner + C.artOverX - C.gapArt - needW));
    }
    const wordsW = withArt ? inner - (artSize - C.artOverX) - C.gapArt : inner;
    const name = fitText(nameText, 700, fonts.body, C.nameSize, wordsW * 0.92,
      withArt ? C.nameMaxLinesArt : C.nameMaxLines, withArt ? C.nameOneLineArt : C.nameMinSize);
    const tagline = fitText(tagText, 500, fonts.body, C.tagSize, wordsW * 0.9,
      withArt ? C.tagMaxLinesArt : C.tagMaxLines, C.tagMinSize);
    const wordsH = name.lines.length * C.nameLine + C.gapName + tagline.lines.length * C.tagLine;

    // The code grows to fill the width (short codes get huge). It may only
    // use the height left once everything else, including the character and
    // the fixed gap above the score, has its place. How far the character
    // may rise into the code's line box depends on the code's size, so the
    // fit runs twice: first assuming the largest rise, then with the rise
    // that size really allows (it can only get a touch smaller).
    let artRaise = withArt ? C.artRaiseMax : 0;
    let midH = 0;
    let code = null;
    for (let pass = 0; pass < 2; pass++) {
      // The row under the code: the words, and the character when there is
      // one. The words sit in the middle of the row, beside the character.
      midH = withArt ? Math.max(artSize - C.artOverY - artRaise, wordsH) : wordsH;
      const usedHeight = C.padY * 2 + C.topLine + C.gapTopMin + C.gapCode + midH + C.gapScore + C.bottomHeight;
      const codeRoom = C.height - usedHeight; // height available for the code's line box
      const codeMax = Math.min(C.codeMaxSize, codeRoom / C.codeLineRatio);
      code = fitText(type.code, 800, fonts.display, codeMax, inner, 1);
      code.line = code.size * C.codeLineRatio;
      if (!withArt) break;
      const raise = artRaiseFor(type.code, fonts.display, code.size);
      if (raise >= artRaise - 0.01) break;
      artRaise = raise;
    }
    if (withArt) midH = Math.max(artSize - C.artOverY - artRaise, wordsH);
    const wordsOffset = (midH - wordsH) / 2;
    const headRest = C.gapCode + midH;

    // Where the code starts: the head block sits a fixed gap above the score,
    // and any leftover space goes between the top row and the code.
    const headTop = C.height - C.padY - C.bottomHeight - C.gapScore - headRest - code.line;

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
      ticks: t('cardTicks', { n: result.total, total: result.drawnCount }),
      code: code,
      headTop: headTop,
      name: name,
      tagline: tagline,
      midH: midH,
      wordsOffset: wordsOffset,
      // Where the character goes (card units), or null for the plain layout.
      art: withArt ? {
        id: type.id,
        uri: artUri(type.id),
        x: C.width - C.pad - artSize + C.artOverX,
        y: headTop + code.line + C.gapCode - artRaise,
        size: artSize,
        raise: artRaise
      } : null,
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
        // Name and tagline, with the character beside them when there is one.
        // The row is exactly midH tall, as in the PNG.
        el('div', {
          class: 'card-mid' + (model.art ? ' has-art' : ''),
          style: 'height:calc(' + model.midH + ' * 1cqw)' +
            (model.art ? ';--artS:' + model.art.size + ';--artR:' + model.art.raise : '')
        }, [
          el('div', { class: 'card-words' }, [
            el('h1', {
              class: 'card-name', tabindex: '-1', 'data-focus': true,
              'aria-label': model.type.code + ' ' + L(model.type.name),
              style: 'font-size:calc(' + model.name.size + ' * 1cqw)'
            }, lines(model.name)),
            el('p', { class: 'card-tagline', style: 'font-size:calc(' + model.tagline.size + ' * 1cqw)' }, lines(model.tagline))
          ]),
          model.art && artImg(model.art.id, 'card-art')
        ])
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

  // opts.noArt: draw without the character (the fallback in exportCard).
  function drawCard(model, opts) {
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
    const topBase = baselineIn(ctx, C.padY, C.topLine, C.topSize);
    ctx.textAlign = 'left';
    ctx.fillText(model.appName, left, topBase);
    ctx.textAlign = 'right';
    ctx.fillText(model.ticks, right, topBase);
    ctx.textAlign = 'left';

    // --- head: code, name, tagline (placed a fixed gap above the score) ---
    let y = model.headTop;
    y = textBlock(model.code, 800, f.display, model.code.line, y);
    y = textBlock(model.name, 700, f.body, C.nameLine, y + C.gapCode + model.wordsOffset);
    textBlock(model.tagline, 500, f.body, C.tagLine, y + C.gapName);

    // --- the character, beside the name and tagline ---
    // saveImage and prepareShareFile wait for the picture before they get
    // here; if it still is not loaded, the card is drawn without it.
    const artImgNode = model.art && !(opts && opts.noArt) ? artImage(model.art.id) : null;
    if (artImgNode) {
      try {
        ctx.drawImage(artImgNode, model.art.x * UNIT, model.art.y * UNIT, model.art.size * UNIT, model.art.size * UNIT);
      } catch (e) { /* a broken picture: the card is still fine without it */ }
    }

    // --- bottom block, measured up from the bottom edge ---
    y = C.height - C.padY - C.bottomHeight;

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

  // The card as a PNG. If the browser refuses to export a canvas with the
  // character on it (a "tainted" canvas: current browsers allow a data: SVG
  // without outside references, some old Safari versions did not), it tries
  // once more without the character instead of failing.
  function cardDataUrl(model) {
    for (const noArt of [false, true]) {
      try {
        const url = drawCard(model, { noArt: noArt }).toDataURL('image/png');
        if (url.length > 100) return url;
      } catch (e) { /* tainted or out of memory: try the plain card */ }
      if (!model.art) break;
    }
    return '';
  }

  function cardBlob(model) {
    return new Promise((resolve) => {
      const attempt = (noArt) => {
        const retry = !noArt && model.art;
        try {
          drawCard(model, { noArt: noArt }).toBlob((blob) => {
            if (blob || !retry) resolve(blob);
            else attempt(true);
          }, 'image/png');
        } catch (e) {
          if (retry) attempt(true);
          else resolve(null);
        }
      };
      attempt(false);
    });
  }

  // How long "Save image" waits for a character that has not loaded yet
  // (normally it loaded at startup, so there is no wait at all).
  const ART_WAIT_MS = 4000;

  // Resolves once the card's character can be drawn (or there is none, or
  // it failed / timed out: then the card is drawn without it).
  function cardArtReady(model) {
    return model.art ? artReady(model.art.id, ART_WAIT_MS) : Promise.resolve(null);
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
    track('save-image', 'play');
    // The character was loaded at startup (preloadArt), so this is normally
    // synchronous. On a slow device, wait for it first: a saved card without
    // its character is the one thing this button must not produce.
    if (model.art && !artImage(model.art.id)) {
      cardArtReady(model).then(() => saveImageNow(model));
      return;
    }
    saveImageNow(model);
  }

  function saveImageNow(model) {
    if (shouldShowImage()) {
      const dataUrl = cardDataUrl(model);
      if (dataUrl.length < 100) { toast(t('imageFailed')); return; }
      showImageOverlay(dataUrl, model);
      return;
    }

    cardBlob(model).then((blob) => {
      if (!blob) { toast(t('imageFailed')); return; }
      const url = URL.createObjectURL(blob);
      const link = el('a', { href: url, download: fileName(model) });
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast(t('imageSaved'));
    });
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
      // Wait for the character first, so the shared picture has it too.
      cardArtReady(model).then(() => cardBlob(model)).then((blob) => {
        if (!blob) return;
        try {
          const file = new File([blob], fileName(model), { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) model.file = file;
        } catch (e) { /* File constructor missing: share the link only */ }
      });
    }, 250);
  }

  // ?from=<type>&seed=<seed>&lang=<lang>: the friend who opens it sees what
  // you got and plays the same 30 statements, so the two results compare.
  function shareUrl() {
    const typeId = state.preview || currentScore().typeId;
    const base = location.href.split(/[?#]/)[0];
    return base + '?from=' + encodeURIComponent(typeId) + '&seed=' + encodeURIComponent(state.seed) +
      '&lang=' + state.lang;
  }

  function copyLink() {
    track('copy-link', 'play');
    copyText(shareUrl(), t('linkCopied'));
  }

  // Copies `url` and says `done` (or that copying failed).
  async function copyText(url, done) {
    try {
      await navigator.clipboard.writeText(url);
      toast(done);
      return;
    } catch (e) { /* clipboard API missing or blocked (e.g. file://); try the old way */ }
    try {
      const area = el('textarea', { style: 'position:fixed;top:-100px;opacity:0', readonly: true });
      area.value = url;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      toast(ok ? done : t('copyFailed'));
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

  // Pick the play (a link's seed, this tab's saved play, or a new seed). A
  // preview needs a draw too, for its sample player, but never saves.
  // A comparison link? extras.readCompareLink checks every value against
  // the seed and the draw; anything malformed or tampered gives null, and
  // the page carries on as for an ordinary link.
  const compareLink = extras.readCompareLink({ seed: params.get('seed'), vs: params.get('vs'), re: params.get('re') }, content);
  try {
    // A reply link only shows the comparison: this tab's own play (if any)
    // stays as it was, so its seed is not taken from the link.
    restoreState(compareLink && compareLink.re ? null : params.get('seed'));
  } catch (e) {
    // Only a broken bank gets here (a stratum with fewer than 2 statements):
    // validateContent has already listed the problem in the console.
    console.error('[AI Purity Test] could not draw a play:', e);
    app.innerHTML = '<p class="load-error">The quiz content is broken: no set of statements could be drawn.<br>' +
      '题库有问题，抽不出题。</p>';
    return;
  }
  if (compareLink && compareLink.re) {
    state.reply = {
      seed: compareLink.seed, drawn: compareLink.drawn, mine: compareLink.vs, friend: compareLink.re,
      minePlayoff: compareLink.vsPlayoff, friendPlayoff: compareLink.rePlayoff
    };
  } else if (compareLink && compareLink.seed === state.seed && !state.preview) {
    state.challenge = compareLink.vs;
    state.challengePlayoff = compareLink.vsPlayoff || {};
    state.challengeCode = params.get('vs').trim().toLowerCase();
  }
  if (state.preview) {
    state.screen = 'result';
  } else if (state.from && answeredCount() === 0) {
    // A shared link (?from=) opens on the landing page unless a run is underway.
    state.screen = 'landing';
  }
  // Only a seed that came from a link stays in the address (in its standard
  // form: it may have been typed in capitals). An invalid ?seed= is removed,
  // and a play the page picked itself never shows up there; history.state
  // and sessionStorage keep it through a refresh.
  // The same for ?vs= and ?re=: kept while they mean something, removed
  // when they were broken (or ignored, as on a preview).
  if (state.reply) track('reply-opened', 'load');
  else if (state.challenge && state.screen === 'landing') track('challenge-opened', 'load');
  if (state.reply) setUrlParams({ seed: compareLink.seed });
  else setUrlParams({ seed: seedParam(), vs: challengeParam(), re: null });

  render();

  // Load every character now, so that "Save image" can draw the card's one
  // straight away (canvas cannot wait for an image inside a tap). Small:
  // about 100 KB of SVG in all, already in memory from art.js.
  preloadArt(content.types.map((type) => type.id));

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
