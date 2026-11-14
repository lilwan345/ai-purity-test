/*
 * tools/stats.js — the few statistics functions tools/fairness.js needs.
 * Plain JavaScript, no dependencies.
 *
 *   chiSquareP(x, df)    chance of a chi-square statistic at least x when
 *                        there is truly no bias (the p-value)
 *   normalP(z)           two-sided p-value of a z-score
 *   pearson(observed, expected) -> the chi-square statistic
 */
'use strict';

// log of the Gamma function (Lanczos approximation, about 15 correct digits).
function lnGamma(x) {
  var c = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  var a = 0.99999999999980993;
  var t = x + 7.5;
  for (var i = 0; i < 8; i++) a += c[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Complementary error function (W. J. Cody's rational approximation via
// Numerical Recipes erfcc; relative error below 1.2e-7 everywhere).
function erfc(x) {
  var z = Math.abs(x);
  var t = 1 / (1 + 0.5 * z);
  var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
    t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

// Two-sided p-value of a standard normal z.
function normalP(z) {
  return erfc(Math.abs(z) / Math.SQRT2);
}

// Regularized upper incomplete gamma Q(a, x) (Numerical Recipes gser / gcf).
function gammaQ(a, x) {
  if (x <= 0) return 1;
  var gln = lnGamma(a);
  if (x < a + 1) {
    // series for P(a, x), then Q = 1 - P
    var sum = 1 / a, del = sum, ap = a;
    for (var n = 0; n < 100000; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
    }
    return Math.max(0, 1 - sum * Math.exp(-x + a * Math.log(x) - gln));
  }
  // continued fraction for Q(a, x) (modified Lentz)
  var b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
  for (var i = 1; i < 100000; i++) {
    var an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    var step = d * c;
    h *= step;
    if (Math.abs(step - 1) < 1e-15) break;
  }
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/*
 * chiSquareP(x, df): upper tail of the chi-square distribution.
 * For very large df the exact series is slow, so the Wilson-Hilferty normal
 * approximation is used (error far below the 0.001 level we test at).
 */
function chiSquareP(x, df) {
  if (df <= 0) return 1;
  if (df > 2000) {
    var z = (Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
    return 0.5 * erfc(z / Math.SQRT2);
  }
  return gammaQ(df / 2, x / 2);
}

// Pearson's statistic: sum of (observed - expected)^2 / expected.
function pearson(observed, expected) {
  var x = 0;
  for (var i = 0; i < observed.length; i++) {
    var e = expected[i];
    if (e > 0) x += (observed[i] - e) * (observed[i] - e) / e;
  }
  return x;
}

module.exports = { lnGamma: lnGamma, erfc: erfc, normalP: normalP, gammaQ: gammaQ, chiSquareP: chiSquareP, pearson: pearson };
