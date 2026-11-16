// Entry point so that `node --test tests/` works on Node 22+.
// (Newer Node treats "tests/" as a module path, which resolves to this file.)
// `node --test` with no arguments also finds the *.test.js files on its own.
require('./scoring.test.js');
require('./content.test.js');
require('./personas.test.js');
require('./answers.test.js');
require('./gallery.test.js');
require('./draw.test.js');
require('./fairness.test.js');
require('./art.test.js');
require('./extras.test.js');
require('./reveal.test.js');
require('./stats.test.js');
require('./playoff.test.js');
require('./counts.test.js');
require('./judging.test.js');
