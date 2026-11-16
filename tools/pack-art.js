/*
 * tools/pack-art.js — packs the 14 character drawings into art.js.
 *
 *   node tools/pack-art.js
 *
 * Reads art-src/c/out/<type id>.svg for every type id (scoring.TYPE_IDS) and
 * writes art.js at the repo root: a classic script that sets
 * globalThis.APT_ART = { <type id>: "<svg ...>", ... } (and module.exports,
 * for the tests). index.html loads it before app.js. A type with no drawing
 * is simply left out of APT_ART; the app then shows that type without one.
 *
 * Until art-src/c/out/ holds all 14, four early drawings next to build.js
 * stand in under their old names (OLD_NAMES below). A file in out/ always
 * wins, so once all 14 are there, rerunning needs no change here.
 *
 * Every drawing is checked before it is packed (checkSvg): one <svg> root
 * with viewBox 0 0 240 240, at most 12 KB, no script, no event handlers, no
 * <foreignObject> or <image>, no link or url() to anything outside the file.
 * A root without width/height gets width="240" height="240" (Safari needs a
 * size to draw an SVG image onto a canvas). A drawing that fails the check
 * stops the run and art.js is not written.
 *
 * It also packs the purity figure of the question screen,
 * art-src/c/out/purity-figure.svg, as globalThis.APT_FIGURE (same checks, except
 * that it has its own viewBox and size). Without it the question screen simply
 * has no figure.
 *
 * No dependencies.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { TYPE_IDS } = require(path.join(__dirname, '..', 'scoring.js'));

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'art-src', 'c', 'out');
const OLD_DIR = path.join(ROOT, 'art-src', 'c');
const OUT_FILE = path.join(ROOT, 'art.js');
const MAX_BYTES = 12 * 1024;
const FIGURE_FILE = 'purity-figure.svg';

// The four early drawings, under the names they were drawn with.
const OLD_NAMES = {
  untouched: 'analog.svg',
  heart_deep: 'ccbot.svg',
  brain_deep: '404.svg',
  bond_deep: 'mybot.svg'
};

// Returns a list of problems with one drawing (empty = fine to pack).
function checkSvg(svg) {
  const problems = [];
  const bytes = Buffer.byteLength(svg, 'utf8');
  if (bytes > MAX_BYTES) problems.push('too big: ' + bytes + ' bytes (limit ' + MAX_BYTES + ')');
  const roots = svg.match(/<svg\b/gi) || [];
  if (!/^<svg\b[^>]*>/i.test(svg) || !/<\/svg>$/i.test(svg)) problems.push('must start with <svg ...> and end with </svg>');
  if (roots.length !== 1) problems.push('must hold exactly one <svg> element (found ' + roots.length + ')');
  const rootTag = (svg.match(/^<svg\b[^>]*>/i) || [''])[0];
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(rootTag)) problems.push('root needs xmlns="http://www.w3.org/2000/svg"');
  if (!/viewBox="0 0 240 240"/.test(rootTag)) problems.push('root needs viewBox="0 0 240 240"');
  const size = (name) => (rootTag.match(new RegExp('\\s' + name + '="([^"]*)"')) || [])[1];
  if (size('width') !== undefined && size('width') !== '240') problems.push('width must be 240');
  if (size('height') !== undefined && size('height') !== '240') problems.push('height must be 240');
  if (/<script\b/i.test(svg)) problems.push('contains <script>');
  if (/<foreignObject\b/i.test(svg)) problems.push('contains <foreignObject>');
  if (/<image\b/i.test(svg)) problems.push('contains <image>');
  if (/<(text|tspan|textPath)\b/i.test(svg) || /font-family|@font-face/i.test(svg)) problems.push('uses text or fonts (draw letters as paths)');
  if (/<filter\b|\sfilter="/i.test(svg)) problems.push('uses a filter');
  if (/\son[a-z]+\s*=/i.test(svg)) problems.push('contains an event handler attribute');
  if (/javascript:/i.test(svg)) problems.push('contains javascript:');
  if (/@import/i.test(svg)) problems.push('contains @import');
  // Links: only to something inside this file (#id).
  const hrefs = svg.match(/\s(?:xlink:)?href\s*=\s*"([^"]*)"/gi) || [];
  hrefs.forEach((h) => { if (!/=\s*"#/.test(h)) problems.push('links outside the file: ' + h.trim()); });
  const urls = svg.match(/url\(\s*['"]?([^)'"]*)/gi) || [];
  urls.forEach((u) => { if (!/url\(\s*['"]?#/i.test(u)) problems.push('refers outside the file: ' + u); });
  return problems;
}

// The purity figure: the same checks, but its own viewBox and size are fine.
function checkFigure(svg) {
  return checkSvg(svg).filter((p) => !/^root needs viewBox|^width must|^height must/.test(p));
}

// Trims the file down to the <svg> element and gives the root a size.
function normalizeSvg(text) {
  let svg = String(text).replace(/^﻿/, '')
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  svg = svg.replace(/^<svg\b[^>]*>/i, (tag) => {
    let out = tag;
    if (!/\swidth="/.test(out)) out = out.replace(/^<svg\b/i, '<svg width="240"');
    if (!/\sheight="/.test(out)) out = out.replace(/^<svg\b/i, '<svg height="240"');
    return out;
  });
  return svg;
}

// Finds and checks every drawing. Returns { art, missing, used, problems }.
function collectArt(options) {
  const opts = options || {};
  const srcDir = opts.srcDir || SRC_DIR;
  const oldDir = opts.oldDir === undefined ? OLD_DIR : opts.oldDir;
  const art = {};
  const missing = [];
  const used = {};
  const problems = [];
  TYPE_IDS.forEach((id) => {
    let file = path.join(srcDir, id + '.svg');
    if (!fs.existsSync(file) && oldDir && OLD_NAMES[id]) file = path.join(oldDir, OLD_NAMES[id]);
    if (!fs.existsSync(file)) { missing.push(id); return; }
    const svg = normalizeSvg(fs.readFileSync(file, 'utf8'));
    const found = checkSvg(svg);
    if (found.length) {
      found.forEach((p) => problems.push(id + ' (' + path.relative(ROOT, file) + '): ' + p));
      return;
    }
    art[id] = svg;
    used[id] = path.relative(ROOT, file);
  });
  let figure = null;
  const figureFile = path.join(srcDir, FIGURE_FILE);
  if (fs.existsSync(figureFile)) {
    const svg = normalizeSvg(fs.readFileSync(figureFile, 'utf8'));
    const found = checkFigure(svg);
    if (found.length) found.forEach((p) => problems.push('purity figure (' + path.relative(ROOT, figureFile) + '): ' + p));
    else figure = svg;
  }
  return { art, missing, used, problems, figure };
}

function artScript(art, figure) {
  const lines = Object.keys(art).map((id) => '  ' + JSON.stringify(id) + ': ' + JSON.stringify(art[id]));
  return '/*\n' +
    ' * art.js — GENERATED by tools/pack-art.js from art-src/c/out/*.svg. Do not edit by hand:\n' +
    ' * change the drawings and run `node tools/pack-art.js` again.\n' +
    ' * One hand-drawn character per type id (SVG, viewBox 0 0 240 240). A type\n' +
    ' * that is missing here is shown without a character.\n' +
    ' */\n' +
    'globalThis.APT_ART = {\n' + lines.join(',\n') + (lines.length ? '\n' : '') + '};\n' +
    (figure ? '// The purity figure on the question screen (art-src/c/out/' + FIGURE_FILE + ').\n' +
      'globalThis.APT_FIGURE = ' + JSON.stringify(figure) + ';\n' : '') +
    "if (typeof module !== 'undefined' && module.exports) module.exports = globalThis.APT_ART;\n";
}

function packArt(options) {
  const opts = options || {};
  const result = collectArt(opts);
  if (!result.problems.length) fs.writeFileSync(opts.outFile || OUT_FILE, artScript(result.art, result.figure));
  return result;
}

if (require.main === module) {
  const result = packArt();
  if (result.problems.length) {
    console.error('art.js NOT written. Problems:\n- ' + result.problems.join('\n- '));
    process.exit(1);
  }
  const ids = Object.keys(result.art);
  console.log('art.js written with ' + ids.length + ' of ' + TYPE_IDS.length + ' characters:');
  ids.forEach((id) => console.log('  ' + id.padEnd(12) + ' <- ' + result.used[id] +
    ' (' + Buffer.byteLength(result.art[id], 'utf8') + ' bytes)'));
  if (result.missing.length) console.log('Missing (shown without a character): ' + result.missing.join(', '));
  console.log(result.figure ? 'purity figure  <- art-src/c/out/' + FIGURE_FILE + ' (' + Buffer.byteLength(result.figure, 'utf8') + ' bytes)' : 'No purity figure.');
}

module.exports = { checkSvg, checkFigure, normalizeSvg, collectArt, artScript, packArt, OLD_NAMES, MAX_BYTES, TYPE_IDS, FIGURE_FILE };
