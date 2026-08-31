import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overlap, recency, weighted } from '../src/score.ts';

test('overlap is 1 for identical token sets and 0 for disjoint ones', () => {
  const score = overlap('quarterly payment totals');
  assert.equal(score('quarterly payment totals'), 1);
  assert.equal(score('unrelated words entirely'), 0);
});

test('overlap is symmetric in magnitude and bounded by [0, 1]', () => {
  const s = overlap('alpha beta gamma delta')('beta gamma something else here');
  assert.ok(s > 0 && s < 1);
});

test('short tokens do not inflate overlap', () => {
  assert.equal(overlap('a an to of')('a an to of'), 0); // nothing length >= 3
});

test('recency is 1 now, 0.5 at one half-life, 0.25 at two', () => {
  const day = 24 * 60 * 60 * 1000;
  const now = () => 100 * day;
  const score = recency(14, now);
  assert.equal(score(100 * day), 1);
  assert.ok(Math.abs(score(86 * day) - 0.5) < 1e-9);
  assert.ok(Math.abs(score(72 * day) - 0.25) < 1e-9);
});

test('the future does not score above the present', () => {
  const score = recency(14, () => 0);
  assert.equal(score(999_999), 1);
});

test('weighted combines components linearly', () => {
  const double = (n: number) => n * 2;
  const half = (n: number) => n / 2;
  const combined = weighted<number>([
    [double, 1],
    [half, 2]
  ]);
  assert.equal(combined(10), 30); // 20 + 10
});
