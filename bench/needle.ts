/** npm run bench: where does the strongest item actually land?
 *
 * This measures LAYOUT, which is what u-pack controls: across seeded
 * random insertions of one needle among distractors, how close to a
 * prompt edge does the needle sit, naive order vs folded? The recall
 * benefit of edge placement is the literature's claim (Liu et al.,
 * "Lost in the Middle"); this benchmark proves u-pack delivers the
 * placement that claim depends on, deterministically. */

import { pack } from '../src/pack.ts';
import type { Item } from '../src/pack.ts';

function seededRandom(seed: number): () => number {
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

const TRIALS = 1000;
const N = 21;
/** normalized distance from the nearest edge: 0 = at an edge, ~0.5 = dead centre */
const edgeDistance = (index: number, total: number) =>
  Math.min(index, total - 1 - index) / (total - 1);

const rand = seededRandom(11);
let naiveSum = 0;
let foldedSum = 0;
let naiveEdge = 0;
let foldedEdge = 0;

for (let t = 0; t < TRIALS; t++) {
  const needlePosition = Math.floor(rand() * N);
  const items: Item[] = [];
  for (let i = 0; i < N; i++) {
    items.push(
      i === needlePosition
        ? { id: 'needle', content: 'the relevant passage', score: 0.9 }
        : { id: `noise-${i}`, content: 'a distractor passage', score: 0.1 + rand() * 0.2 }
    );
  }
  const naive = items.findIndex((i) => i.id === 'needle');
  const folded = pack(items).placements.find((p) => p.id === 'needle')!.index;
  naiveSum += edgeDistance(naive, N);
  foldedSum += edgeDistance(folded, N);
  if (edgeDistance(naive, N) === 0) naiveEdge++;
  if (edgeDistance(folded, N) === 0) foldedEdge++;
}

console.log(`needle placement over ${TRIALS} seeded trials, ${N} items each`);
console.log(`(edge distance: 0 = at a prompt edge, 0.5 = dead centre)\n`);
console.log(`  insertion order: mean edge distance ${(naiveSum / TRIALS).toFixed(3)}, at an edge ${((100 * naiveEdge) / TRIALS).toFixed(1)}%`);
console.log(`  folded:          mean edge distance ${(foldedSum / TRIALS).toFixed(3)}, at an edge ${((100 * foldedEdge) / TRIALS).toFixed(1)}%`);
