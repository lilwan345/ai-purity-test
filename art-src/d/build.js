// node build.js [id ...]  -> <id>.svg for every file in ./types (or the ids given)
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(path.join(__dirname, 'types')).map((f) => f.replace(/\.js$/, ''));
for (const id of ids) {
  L.reseed(7);
  const svg = require('./types/' + id + '.js')(L);
  fs.writeFileSync(path.join(__dirname, 'out', id + '.svg'), svg);
  console.log(id, Buffer.byteLength(svg), 'bytes');
}
