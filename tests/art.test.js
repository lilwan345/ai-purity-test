// The characters: tools/pack-art.js (checks and packs the drawings into
// art.js), the art.js it wrote, and the app coping with art that is missing
// or broken. Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const pack = require('../tools/pack-art.js');
const { checkSvg, normalizeSvg, collectArt, packArt, OLD_NAMES, MAX_BYTES, TYPE_IDS } = pack;
const appSource = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

const OUT_DIR = path.join(ROOT, 'art-src', 'c', 'out');
const OLD_DIR = path.join(ROOT, 'art-src', 'c');

// A small valid drawing, as the artist delivers them.
const GOOD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">' +
  '<g fill="none" stroke="#1C2541" stroke-width="6"><path d="M10,10L230,230"/><circle cx="120" cy="80" r="30"/></g></svg>';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'apt-art-'));
}

// Loads an art.js file the way the page does (a classic script) and returns APT_ART.
function loadArtScript(file) {
  const sandbox = { globalThis: {}, module: undefined };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  return sandbox.APT_ART;
}

// ---------------------------------------------------------------------------
// pack-art: the checks
// ---------------------------------------------------------------------------

test('checkSvg: a clean drawing passes', () => {
  assert.deepStrictEqual(checkSvg(GOOD), []);
});

test('checkSvg: scripts, handlers and anything outside the file are refused', () => {
  const bad = {
    script: GOOD.replace('</svg>', '<script>alert(1)</script></svg>'),
    handler: GOOD.replace('<path ', '<path onclick="alert(1)" '),
    handlerOnRoot: GOOD.replace('<svg ', '<svg onload="alert(1)" '),
    externalHref: GOOD.replace('</svg>', '<use href="https://example.com/a.svg#x"/></svg>'),
    externalXlink: GOOD.replace('</svg>', '<use xlink:href="other.svg#x"/></svg>'),
    externalUrl: GOOD.replace('fill="none"', 'fill="url(https://example.com/p.svg#g)"'),
    jsUrl: GOOD.replace('</svg>', '<a href="javascript:alert(1)"><path d="M0,0"/></a></svg>'),
    foreignObject: GOOD.replace('</svg>', '<foreignObject><div>hi</div></foreignObject></svg>'),
    image: GOOD.replace('</svg>', '<image href="data:image/png;base64,AAAA"/></svg>'),
    text: GOOD.replace('</svg>', '<text x="1" y="1">hi</text></svg>'),
    filter: GOOD.replace('</svg>', '<filter id="f"/></svg>'),
    importCss: GOOD.replace('</svg>', '<style>@import "x.css";</style></svg>')
  };
  Object.keys(bad).forEach((name) => {
    assert.ok(checkSvg(bad[name]).length > 0, name + ' should be refused');
  });
  // A link to something inside the same file is fine.
  assert.deepStrictEqual(checkSvg(GOOD.replace('</svg>', '<defs><path id="p" d="M0,0"/></defs><use href="#p"/></svg>')), []);
});

test('checkSvg: the root, the size and the 12 KB cap', () => {
  assert.ok(checkSvg('<div>' + GOOD + '</div>').length > 0, 'must be an <svg> root');
  assert.ok(checkSvg(GOOD.replace('viewBox="0 0 240 240"', 'viewBox="0 0 100 100"')).length > 0, 'viewBox');
  assert.ok(checkSvg(GOOD.replace(' xmlns="http://www.w3.org/2000/svg"', '')).length > 0, 'xmlns');
  assert.ok(checkSvg(GOOD.replace('width="240"', 'width="300"')).length > 0, 'width');
  assert.ok(checkSvg(GOOD.replace('</svg>', '<svg viewBox="0 0 1 1"></svg></svg>')).length > 0, 'one root only');
  const padding = '<path d="M' + '1,1L'.repeat(Math.ceil(MAX_BYTES / 4)) + '2,2"/>';
  assert.ok(checkSvg(GOOD.replace('</svg>', padding + '</svg>')).some((p) => /too big/.test(p)), 'size cap');
  assert.strictEqual(MAX_BYTES, 12 * 1024);
});

test('normalizeSvg: trims the file to the <svg> and gives the root a size', () => {
  const raw = '﻿<?xml version="1.0" encoding="UTF-8"?>\n<!-- drawn by hand -->\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><path d="M0,0L1,1"/></svg>\n';
  const svg = normalizeSvg(raw);
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /^<svg[^>]*\swidth="240"/);
  assert.match(svg, /^<svg[^>]*\sheight="240"/);
  assert.deepStrictEqual(checkSvg(svg), []);
  // A size that is already there is kept, not doubled.
  assert.strictEqual(normalizeSvg(GOOD), GOOD);
});

// ---------------------------------------------------------------------------
// pack-art: finding the files and writing art.js
// ---------------------------------------------------------------------------

test('packArt: with all 14 drawings in out/, every type id is in art.js once', () => {
  const src = tempDir();
  const outFile = path.join(src, 'art.js');
  TYPE_IDS.forEach((id) => fs.writeFileSync(path.join(src, id + '.svg'), GOOD.replace('r="30"', 'r="' + (10 + id.length) + '"')));
  const result = packArt({ srcDir: src, oldDir: null, outFile: outFile });
  assert.deepStrictEqual(result.problems, []);
  assert.deepStrictEqual(result.missing, []);
  const art = loadArtScript(outFile);
  assert.deepStrictEqual(Object.keys(art), TYPE_IDS, 'all 14, in TYPE_IDS order, each once');
  TYPE_IDS.forEach((id) => assert.deepStrictEqual(checkSvg(art[id]), [], id));
  // Also usable from Node through module.exports.
  const viaRequire = require(outFile);
  assert.deepStrictEqual(Object.keys(viaRequire), TYPE_IDS);
});

test('packArt: a missing drawing is left out and listed; old names stand in until out/ has the file', () => {
  const src = tempDir();
  const old = tempDir();
  Object.keys(OLD_NAMES).forEach((id) => fs.writeFileSync(path.join(old, OLD_NAMES[id]), GOOD));
  fs.writeFileSync(path.join(src, 'school_lite.svg'), GOOD);
  // out/ wins over an old name for the same type.
  fs.writeFileSync(path.join(src, 'untouched.svg'), GOOD.replace('r="30"', 'r="31"'));
  const result = collectArt({ srcDir: src, oldDir: old });
  assert.deepStrictEqual(result.problems, []);
  assert.deepStrictEqual(Object.keys(result.art).sort(), ['bond_deep', 'brain_deep', 'heart_deep', 'school_lite', 'untouched']);
  assert.match(result.art.untouched, /r="31"/);
  assert.strictEqual(result.missing.length, TYPE_IDS.length - 5);
  assert.ok(result.missing.every((id) => !result.art[id]));
});

test('packArt: a drawing that fails a check stops the run and art.js is not written', () => {
  const src = tempDir();
  const outFile = path.join(src, 'art.js');
  fs.writeFileSync(path.join(src, 'merged.svg'), GOOD.replace('</svg>', '<script>x()</script></svg>'));
  const result = packArt({ srcDir: src, oldDir: null, outFile: outFile });
  assert.ok(result.problems.some((p) => /merged/.test(p) && /script/.test(p)));
  assert.strictEqual(fs.existsSync(outFile), false);
});

// ---------------------------------------------------------------------------
// The art.js in the repo
// ---------------------------------------------------------------------------

test('art.js: every character is a clean SVG of at most 12 KB under a real type id', () => {
  const art = loadArtScript(path.join(ROOT, 'art.js'));
  assert.ok(art && typeof art === 'object');
  Object.keys(art).forEach((id) => {
    assert.ok(TYPE_IDS.includes(id), id + ' is a type id');
    assert.strictEqual(typeof art[id], 'string');
    assert.deepStrictEqual(checkSvg(art[id]), [], id);
    assert.ok(Buffer.byteLength(art[id], 'utf8') <= MAX_BYTES, id + ' fits the 12 KB cap');
    // No script and no web address (other than the SVG namespace itself).
    assert.doesNotMatch(art[id].replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, ''), /<script|https?:\/\//i, id);
  });
});

test('art.js: once art-src/c/out holds all 14, art.js has all 14 and is up to date', (t) => {
  if (!fs.existsSync(OUT_DIR) || !TYPE_IDS.every((id) => fs.existsSync(path.join(OUT_DIR, id + '.svg')))) {
    t.skip('art-src/c/out is not complete yet');
    return;
  }
  const fresh = collectArt({ srcDir: OUT_DIR, oldDir: OLD_DIR });
  assert.deepStrictEqual(fresh.problems, []);
  const art = loadArtScript(path.join(ROOT, 'art.js'));
  assert.deepStrictEqual(Object.keys(art), TYPE_IDS, 'run `node tools/pack-art.js`');
  TYPE_IDS.forEach((id) => assert.strictEqual(art[id], fresh.art[id], id + ' differs from out/: run `node tools/pack-art.js`'));
});

test('index.html: art.js loads after scoring.js and before app.js', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // Each reference may carry a ?v= version (tools/bump-version.js).
  const at = (f) => html.search(new RegExp('<script src="' + f.replace('.', '\\.') + '(\\?v=[^"]*)?"></script>'));
  const order = ['content.js', 'scoring.js', 'extras.js', 'art.js', 'app.js'].map(at);
  order.forEach((i) => assert.ok(i > 0));
  assert.deepStrictEqual([...order].sort((a, b) => a - b), order);
});

// ---------------------------------------------------------------------------
// The app with missing or broken art
// ---------------------------------------------------------------------------

// The art helpers in app.js, run on their own (they sit between two markers
// and may only use globalThis.APT_ART, Image, document and Promise).
const helperBlock = (() => {
  const m = appSource.match(/\/\/ ART HELPERS START\n([\s\S]*?)\n\s*\/\/ ART HELPERS END/);
  assert.ok(m, 'app.js has the ART HELPERS block');
  return m[1];
})();

// A stand-in for the browser's Image: loads (async) unless told to fail.
function fakeImage(behaviour) {
  return function FakeImage() {
    const img = { complete: false, naturalWidth: 0, onload: null, onerror: null };
    Object.defineProperty(img, 'src', {
      set(value) {
        img._src = value;
        setTimeout(() => {
          if (behaviour === 'error') { if (img.onerror) img.onerror(); return; }
          if (behaviour === 'never') return;
          img.complete = true;
          img.naturalWidth = 480;
          if (img.onload) img.onload();
        }, 1);
      },
      get() { return img._src; }
    });
    if (behaviour === 'decode-rejects') img.decode = () => Promise.reject(new Error('EncodingError'));
    if (behaviour === 'decode-hangs') img.decode = () => new Promise(() => {});
    return img;
  };
}

function helpers(aptArt, imageBehaviour, withDocument) {
  const sandbox = { Promise, setTimeout, encodeURIComponent, Object };
  sandbox.globalThis = sandbox;
  if (aptArt !== '__absent__') sandbox.APT_ART = aptArt;
  sandbox.Image = fakeImage(imageBehaviour || 'load');
  if (withDocument) {
    sandbox.document = { createElement: () => ({ getContext: () => ({ drawImage() { throw new Error('blank'); } }) }) };
  }
  vm.runInNewContext(helperBlock + '\nglobalThis.H = { artSvg, hasArt, artUri, loadArt, artImage, artReady, preloadArt, ART_PX };', sandbox);
  return sandbox.H;
}

test('app art helpers: no art.js, or a broken one, means "no character" and never an error', async () => {
  const cases = ['__absent__', undefined, null, 'oops', 42, [], {}, { untouched: 123 }, { untouched: '<div>not svg</div>' },
    { untouched: '<svg xmlns="http://www.w3.org/2000/svg">' }, Object.create(null)];
  for (const art of cases) {
    const H = helpers(art);
    TYPE_IDS.forEach((id) => {
      assert.strictEqual(H.artSvg(id), null);
      assert.strictEqual(H.hasArt(id), false);
      assert.strictEqual(H.artUri(id), null);
      assert.strictEqual(H.artImage(id), null);
    });
    assert.strictEqual(await H.loadArt('untouched'), null);
    assert.strictEqual(await H.artReady('untouched', 50), null);
    await H.preloadArt(TYPE_IDS);
  }
  // A key on the prototype is not a character.
  const H = helpers(Object.create({ untouched: GOOD }));
  assert.strictEqual(H.hasArt('untouched'), false);
});

test('app art helpers: art.js lacking a type gives that type nothing, the others their picture', async () => {
  const H = helpers({ untouched: GOOD }, 'load', true);
  assert.strictEqual(H.hasArt('untouched'), true);
  assert.strictEqual(H.hasArt('merged'), false);
  // The data URI is self-contained and asks for a large size (sharp in the PNG).
  const uri = H.artUri('untouched');
  assert.match(uri, /^data:image\/svg\+xml;charset=utf-8,/);
  const svg = decodeURIComponent(uri.split(',').slice(1).join(','));
  assert.match(svg, new RegExp('^<svg[^>]*width="' + H.ART_PX + '" height="' + H.ART_PX + '"'));
  assert.strictEqual((svg.match(/\swidth="/g) || []).length, 1, 'the old width is replaced, not doubled');
  assert.strictEqual(H.artUri('untouched'), uri, 'cached');
  const results = await H.preloadArt(TYPE_IDS);
  assert.strictEqual(results.filter(Boolean).length, 1);
  assert.ok(H.artImage('untouched'), 'loaded and ready to draw (the warm-up draw throwing does not matter)');
  assert.strictEqual(H.artImage('merged'), null);
});

test('app art helpers: a picture that fails, or whose decode() rejects or hangs, never blocks', async () => {
  const failing = helpers({ untouched: GOOD }, 'error');
  assert.strictEqual(await failing.loadArt('untouched'), null);
  assert.strictEqual(failing.artImage('untouched'), null);

  const rejects = helpers({ untouched: GOOD }, 'decode-rejects');
  assert.ok(await rejects.loadArt('untouched'), 'a rejected decode() still counts as loaded');

  const hangs = helpers({ untouched: GOOD }, 'decode-hangs');
  assert.ok(await hangs.loadArt('untouched'), 'a decode() that never settles times out as loaded');

  const never = helpers({ untouched: GOOD }, 'never');
  const started = Date.now();
  assert.strictEqual(await never.artReady('untouched', 60), null, 'artReady gives up after its wait');
  assert.ok(Date.now() - started < 1000);
});

test('app.js: the art is optional everywhere it is used', () => {
  // APT_ART is read only inside the helper block (comments aside).
  const code = (src) => src.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
  assert.ok(code(helperBlock).includes('APT_ART'));
  assert.strictEqual(code(appSource).split('APT_ART').length, code(helperBlock).split('APT_ART').length);
  // The card picks its layout from hasArt, and the PNG draws only a loaded picture.
  assert.match(appSource, /const withArt = hasArt\(type\.id\);/);
  assert.match(appSource, /artImage\(model\.art\.id\)/);
  // Save image and the share file wait for the picture first.
  assert.match(appSource, /if \(model\.art && !artImage\(model\.art\.id\)\) \{\s*cardArtReady\(model\)\.then\(\(\) => saveImageNow\(model\)\);/);
  assert.match(appSource, /cardArtReady\(model\)\.then\(\(\) => cardBlob\(model\)\)/);
  // Everything is loaded at startup.
  assert.match(appSource, /preloadArt\(content\.types\.map\(\(type\) => type\.id\)\);/);
  // Pictures are decorative <img>s, never inline markup.
  assert.match(appSource, /class: className, src: uri, alt: '', 'aria-hidden': 'true'/);
  assert.doesNotMatch(appSource, /innerHTML\s*=\s*[^;]*art/i);
});

test('app.js: the locked hidden type never shows its character', () => {
  // The locked grid card and the locked pairing return before any artImg call.
  const tile = appSource.match(/function typeTile\(type, mine, hiddenOpen, collected\) \{([\s\S]*?)\n {2}\}/)[1];
  const lockedTile = tile.slice(tile.indexOf("if (type.id === 'soulmate' && !hiddenOpen)"), tile.indexOf('return el(\'button\''));
  assert.ok(lockedTile.length > 0);
  assert.doesNotMatch(lockedTile, /artImg/);
  const pairs = appSource.match(/function renderPairs\(type\) \{([\s\S]*?)\n {2}\}/)[1];
  const lockedPair = pairs.slice(pairs.indexOf("if (otherId === 'soulmate' && !hiddenOpenNow())"), pairs.indexOf("return el('button'"));
  assert.ok(lockedPair.length > 0);
  assert.doesNotMatch(lockedPair, /artImg/);
  // The landing's character stickers never include it.
  const faces = appSource.match(/const TEASER_ART = (\[[^\]]*\])/);
  assert.ok(faces);
  assert.ok(!JSON.parse(faces[1].replace(/'/g, '"')).includes('soulmate'));
});
