/** npm run bench: what does the fold buy over the layout you already use?
 *
 * The only question a reader has is "I already sort my chunks by relevance
 * score - what does folding change?". So this compares three layouts of the
 * same items over the same seeded trials: arrival order, sort-by-score
 * descending, and the fold. Scores are random, so ranks are not baked into
 * the fixture.
 *
 * The metric is edge distance: how far an item sits from the nearest prompt
 * edge, normalised so 0 is at an edge and 0.5 is dead centre. It measures
 * LAYOUT, which is what u-pack controls. The recall benefit of edge
 * placement is the literature's claim (Liu et al., "Lost in the Middle");
 * this only shows which layout puts which items where. */

import { pack, rankItems } from '../src/pack.ts';
import type { Item } from '../src/pack.ts';

/** normalized distance from the nearest edge: 0 = at an edge, 0.5 = dead centre */
export const edgeDistance = (index: number, total: number): number =>
  total <= 1 ? 0 : Math.min(index, total - 1 - index) / (total - 1);

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z ^= z >>> 16;
    z = Math.imul(z, 0x21f0aaad);
    z ^= z >>> 15;
    z = Math.imul(z, 0x735a2d97);
    z ^= z >>> 15;
    return (z >>> 0) / 0x100000000;
  };
}

export interface LayoutStats {
  name: string;
  /** mean edge distance of the top-k ranked items, parallel to `ks` */
  topK: number[];
  /** mean edge distance of the worst-ranked item */
  worst: number;
}

export interface BenchResult {
  trials: number;
  n: number;
  ks: number[];
  layouts: LayoutStats[];
}

export interface BenchOptions {
  trials?: number;
  n?: number;
  ks?: number[];
  seed?: number;
}

/** Mean edge distance per rank, for one layout of one trial. */
function edgeDistanceByRank(layout: Item[], rankedIds: string[]): number[] {
  const indexOf = new Map(layout.map((item, i) => [item.id, i]));
  return rankedIds.map((id) => edgeDistance(indexOf.get(id)!, layout.length));
}

export function runBench(opts: BenchOptions = {}): BenchResult {
  const trials = opts.trials ?? 1000;
  const n = opts.n ?? 21;
  const ks = opts.ks ?? [1, 2, 5, 10];
  const rand = seededRandom(opts.seed ?? 11);

  const names = ['insertion order', 'sort by score, descending', 'folded (u-pack)'];
  const topKSums = names.map(() => ks.map(() => 0));
  const worstSums = names.map(() => 0);

  for (let t = 0; t < trials; t++) {
    // Random scores in arrival order: rank is a uniform random permutation of
    // arrival position, so nothing about the layout is predetermined.
    const items: Item[] = Array.from({ length: n }, (_, i) => ({
      id: `c${i}`,
      content: 'a candidate passage',
      score: rand()
    }));
    const ranked = rankItems(items);
    const rankedIds = ranked.map((item) => item.id);

    const layouts = [items, ranked, pack(items).order];
    for (let l = 0; l < layouts.length; l++) {
      const byRank = edgeDistanceByRank(layouts[l], rankedIds);
      for (let j = 0; j < ks.length; j++) {
        const k = Math.min(ks[j], n);
        let sum = 0;
        for (let r = 0; r < k; r++) sum += byRank[r];
        topKSums[l][j] += sum / k;
      }
      worstSums[l] += byRank[n - 1];
    }
  }

  return {
    trials,
    n,
    ks,
    layouts: names.map((name, l) => ({
      name,
      topK: topKSums[l].map((sum) => sum / trials),
      worst: worstSums[l] / trials
    }))
  };
}

const fmt = (value: number): string => value.toFixed(3);

/** The exact block the README publishes. A test asserts the README contains
 * this string verbatim, so the numbers cannot drift from the code. */
export function formatBenchBlock(result: BenchResult): string {
  const header = `| layout | ${result.ks.map((k) => `top-${k}`).join(' | ')} | worst-ranked |`;
  const rule = `| :-- |${result.ks.map(() => ' --: |').join('')} --: |`;
  const rows = result.layouts.map(
    (l) => `| ${l.name} | ${l.topK.map(fmt).join(' | ')} | ${fmt(l.worst)} |`
  );
  return [
    `Mean edge distance over ${result.trials.toLocaleString('en-US')} seeded trials of ${result.n} items`,
    `(0 = at a prompt edge, 0.5 = dead centre):`,
    '',
    header,
    rule,
    ...rows
  ].join('\n');
}

function main(): void {
  const result = runBench();
  const sorted = result.layouts.find((l) => l.name.startsWith('sort'))!;
  const folded = result.layouts.find((l) => l.name.startsWith('folded'))!;
  console.log(formatBenchBlock(result));
  console.log(
    `\ntop-1: folded ${fmt(folded.topK[0])} vs sorted ${fmt(sorted.topK[0])} - a tie. ` +
      `For the single strongest item the fold buys nothing:\nboth put it at index 0. ` +
      `The gain is in ranks 2..k, and in the last column, where\nsorting spends a prime edge slot on your weakest item and the fold spends it on rank 2.`
  );
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  main();
}
