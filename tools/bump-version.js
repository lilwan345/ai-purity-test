#!/usr/bin/env node
/*
 * bump-version.js — gives every local file that index.html loads a new
 * ?v= version, all the same, in one go.
 *
 * Why: GitHub Pages lets browsers keep styles.css and the scripts for 10
 * minutes (max-age=600), so right after a push people can still get the
 * old files. A new ?v= is a new address, so the browser fetches it fresh.
 * Run it before each push.
 *
 *   node tools/bump-version.js            -> today's date plus the next letter (20261115a, then 20261115b, ...)
 *   node tools/bump-version.js 20261116x  -> exactly that value (letters, digits, "-", "_", ".")
 *
 * Only the references to local files (styles.css and the .js files next to
 * index.html) change; nothing else in index.html is touched.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const INDEX = path.join(__dirname, '..', 'index.html');
// href="styles.css" / src="app.js", with or without an existing ?v=...
const REF = /((?:src|href)=")([\w.-]+\.(?:css|js))(?:\?v=[^"]*)?(")/g;
const VALUE = /^[\w.-]{1,40}$/;

function today() {
  const d = new Date();
  return String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

// The versions index.html carries now, e.g. ['20261115a', ...].
function currentVersions(html) {
  return Array.from(html.matchAll(/(?:src|href)="[\w.-]+\.(?:css|js)\?v=([^"]*)"/g), (m) => m[1]);
}

// Today's date plus the letter after the one in use today (a, b, c, ...).
function nextVersion(html) {
  const date = today();
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const used = currentVersions(html).filter((v) => v.startsWith(date)).map((v) => letters.indexOf(v.slice(date.length)));
  const next = used.length ? Math.max.apply(null, used) + 1 : 0;
  return next < letters.length ? date + letters[next] : date + 'z' + Date.now().toString(36);
}

function bump(html, version) {
  let count = 0;
  const out = html.replace(REF, (m, before, file, after) => {
    count += 1;
    return before + file + '?v=' + version + after;
  });
  return { html: out, count: count };
}

if (require.main === module) {
  const html = fs.readFileSync(INDEX, 'utf8');
  const version = process.argv[2] || nextVersion(html);
  if (!VALUE.test(version)) {
    console.error('Not a usable version: "' + version + '" (letters, digits, "-", "_", "." only)');
    process.exit(1);
  }
  const result = bump(html, version);
  if (result.count === 0) {
    console.error('No local styles.css / .js references found in index.html');
    process.exit(1);
  }
  fs.writeFileSync(INDEX, result.html);
  console.log('index.html: ' + result.count + ' references now carry ?v=' + version);
}

module.exports = { bump, nextVersion, currentVersions };
