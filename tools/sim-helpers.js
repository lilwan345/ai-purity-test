/*
 * tools/sim-helpers.js — shared pieces for tools/simulate.js,
 * tools/fairness.js and the tests. No dependencies.
 *
 *   syntheticContent(perStratum)   a stand-in bank with the same shape as
 *                                  content.js, `perStratum` statements in
 *                                  every dimension x band (7 = the full bank)
 *   seedStream(label)              a repeatable stream of valid seeds
 *   latentLevels(content)          how hard each statement is to admit, for
 *                                  the player model
 *   makePlayerModel(options)       simulated players who answer a drawn set
 */
'use strict';

var path = require('path');
var scoring = require(path.join(__dirname, '..', 'scoring.js'));

/*
 * A fake bank: ids s01, s02, ... grouped by dimension, and inside each
 * dimension `perStratum` mild, then medium, then extreme statements.
 * Only the fields the draw and the scoring read (id, dim, band, text).
 */
function syntheticContent(perStratum) {
  var n = perStratum || scoring.BANK_PER_STRATUM;
  var statements = [];
  var counter = 0;
  scoring.DIM_KEYS.forEach(function (dim) {
    scoring.STATEMENT_BANDS.forEach(function (band) {
      for (var i = 0; i < n; i++) {
        counter += 1;
        var id = 's' + String(counter).padStart(2, '0');
        statements.push({ id: id, dim: dim, band: band, text: { en: 'Did ' + id, zh: '做过 ' + id } });
      }
    });
  });
  var dimensions = scoring.DIM_KEYS.map(function (key) { return { key: key, name: { en: key, zh: key } }; });
  return { dimensions: dimensions, statements: statements };
}

/*
 * seedStream(label) -> a function that returns a new valid seed on every
 * call. The seeds are uniformly random 6-character strings, made by the
 * same unbiased generator as the draw, but from a different label, so a run
 * is repeatable (same label, same seeds) and has nothing to do with how the
 * draw itself uses a seed.
 */
function seedStream(label) {
  var next = scoring.makeGenerator('apt-test-seeds|' + label);
  var alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  return function () {
    var s = '';
    for (var i = 0; i < scoring.SEED_LENGTH; i++) s += alphabet[scoring.randomBelow(next, 36)];
    return s;
  };
}

/*
 * A uniform number in [0, 1) from a 32-bit generator.
 */
function uniform(next) {
  return next() / 4294967296;
}

/*
 * latentLevels(content) -> { id: level } on the old 1-to-10 scale: how far
 * into a section a player has to be before they would admit it.
 * Mild statements spread over levels 1-4, medium over 5-7, extreme over 8-10,
 * by their order inside the stratum. For the real 50 statements this gives
 * back exactly their old levels (s01 = 1 ... s10 = 10), so the simulation
 * keeps the old intuition that some statements in a band are easier than
 * others. Every dimension gets the same spread, so no dimension is easier.
 */
function latentLevels(content) {
  var ranges = { mild: [1, 4], medium: [5, 7], extreme: [8, 10] };
  var strata = scoring.strataOf(content);
  var levels = {};
  scoring.DIM_KEYS.forEach(function (dim) {
    scoring.STATEMENT_BANDS.forEach(function (band) {
      var list = strata[dim][band];
      var lo = ranges[band][0], hi = ranges[band][1];
      list.forEach(function (s, i) {
        levels[s.id] = list.length === 1 ? (lo + hi) / 2 : lo + (hi - lo) * i / (list.length - 1);
      });
    });
  });
  return levels;
}

/*
 * THE PLAYER MODEL (plain words), the same one SCORING.md describes.
 *
 * Every player has a "reach" in each section: roughly the level (1-10) up to
 * which they say Guilty. A statement whose latent level is L is admitted with
 * a probability that falls smoothly as L passes the reach (50% exactly at the
 * reach).
 *  - Overall intensity differs between people: the base reach follows a
 *    normal curve centred on 3.5 with spread 2.5.
 *  - People have favourite sections: 25% have none, 45% one, 30% two. A
 *    favourite gets 2 to 6 extra levels of reach. Which sections are
 *    favourites is uniformly random, so the five dimensions are treated
 *    identically.
 *  - Every section also wobbles a little (spread 1 level) on its own.
 * A player only ever sees the statements of their own draw.
 */
var DEFAULT_MODEL = {
  baseReachMean: 3.5,
  baseReachSd: 2.5,
  favouriteOdds: [0.25, 0.45, 0.30],
  favouriteBoostMin: 2,
  favouriteBoostMax: 6,
  sectionWobbleSd: 1,
  softness: 1.2
};

function makePlayerModel(content, options) {
  var model = Object.assign({}, DEFAULT_MODEL, options || {});
  var levels = latentLevels(content);
  var dimOf = {};
  content.statements.forEach(function (s) { dimOf[s.id] = s.dim; });

  // A normal draw from two uniforms (Box-Muller).
  function normal(next, mean, sd) {
    var u = 1 - uniform(next);
    var v = uniform(next);
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // makePlayer(next) -> one simulated player: { reach: { dim: level } }.
  function makePlayer(next) {
    var base = normal(next, model.baseReachMean, model.baseReachSd);
    var r = uniform(next);
    var favourites = r < model.favouriteOdds[0] ? 0 : (r < model.favouriteOdds[0] + model.favouriteOdds[1] ? 1 : 2);
    // Pick the favourite sections uniformly (unbiased shuffle of the five).
    var order = scoring.DIM_KEYS.slice();
    for (var i = order.length - 1; i > 0; i--) {
      var j = scoring.randomBelow(next, i + 1);
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    var reach = {};
    scoring.DIM_KEYS.forEach(function (key) { reach[key] = base + normal(next, 0, model.sectionWobbleSd); });
    for (var f = 0; f < favourites; f++) {
      reach[order[f]] += model.favouriteBoostMin + uniform(next) * (model.favouriteBoostMax - model.favouriteBoostMin);
    }
    return { reach: reach };
  }

  // admits(next, player, ids) -> the ids (of any statements) the player admits.
  function admits(next, player, ids) {
    return ids.filter(function (id) {
      var p = 1 / (1 + Math.exp((levels[id] - player.reach[dimOf[id]]) / model.softness));
      return uniform(next) < p;
    });
  }

  // answer(next, drawnIds) -> the ids this simulated player admits.
  // (Same random numbers in the same order as before makePlayer existed.)
  function answer(next, drawnIds) {
    return admits(next, makePlayer(next), drawnIds);
  }

  // playoff(next, player, rounds) -> the player's play-off answers
  // ({ id: 'yes' | 'no' }) for all three rounds; score() uses only as many
  // rounds as it needs.
  function playoff(next, player, rounds) {
    var out = {};
    (rounds || []).forEach(function (round) {
      var yes = admits(next, player, round.ids);
      round.ids.forEach(function (id) { out[id] = yes.indexOf(id) !== -1 ? 'yes' : 'no'; });
    });
    return out;
  }

  return { answer: answer, makePlayer: makePlayer, admits: admits, playoff: playoff, model: model };
}

module.exports = {
  syntheticContent: syntheticContent,
  seedStream: seedStream,
  uniform: uniform,
  latentLevels: latentLevels,
  makePlayerModel: makePlayerModel,
  DEFAULT_MODEL: DEFAULT_MODEL
};
