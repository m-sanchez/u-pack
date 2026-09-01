import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pack, rankItems } from '../src/pack.ts';
import type { Item } from '../src/pack.ts';
import { edgeDistance, formatBenchBlock, runBench } from '../bench/layout.ts';

const N = 21;
const corpus = (): Item[] =>
  Array.from({ length: N }, (_, i) => ({ id: `c${i}`, content: 'x', score: N - i }));

const indexIn = (layout: Item[], id: string) => layout.findIndex((x) => x.id === id);

test('sorting by score does not bury rank 2; what it wastes is the trailing edge', () => {
  // The README used to say the obvious layout "puts your second-best evidence
  // in exactly the region the model reads worst". It does not: sorted puts the
  // second-best at index 1, a leading slot. The real cost is the other end.
  const sorted = rankItems(corpus());
  assert.equal(indexIn(sorted, 'c1'), 1);
  assert.equal(edgeDistance(1, N), 0.05);

  // Sorting spends index 20 - a prime edge - on the WEAKEST item.
  assert.equal(indexIn(sorted, `c${N - 1}`), N - 1);
  assert.equal(edgeDistance(N - 1, N), 0);

  // The fold spends that slot on rank 2 and puts the weakest dead centre.
  const folded = pack(corpus());
  const placed = (id: string) => folded.placements.find((p) => p.id === id)!;
  assert.equal(placed('c1').index, N - 1);
  assert.equal(edgeDistance(placed(`c${N - 1}`).index, N), 0.5);
});

test('the fold ties sorting at top-1 and beats it from rank 2 on', () => {
  const result = runBench({ trials: 200 });
  const sorted = result.layouts.find((l) => l.name.startsWith('sort'))!;
  const folded = result.layouts.find((l) => l.name.startsWith('folded'))!;

  // The tie is the honest part: for one item, the fold buys nothing.
  assert.equal(folded.topK[0], sorted.topK[0]);
  assert.equal(folded.topK[0], 0);

  // The gain is in ranks 2..k. Lower edge distance is better here.
  for (let j = 1; j < result.ks.length; j++) {
    assert.ok(
      folded.topK[j] < sorted.topK[j],
      `top-${result.ks[j]}: folded ${folded.topK[j]} should beat sorted ${sorted.topK[j]}`
    );
  }

  // The figures the README quotes in prose beside the table, pinned as published.
  assert.equal(folded.topK[2].toFixed(3), '0.040');
  assert.equal(sorted.topK[2].toFixed(3), '0.100');
  assert.equal((sorted.topK[2] / folded.topK[2]).toFixed(1), '2.5');
  assert.equal(folded.topK[3].toFixed(3), '0.100');
  assert.equal(sorted.topK[3].toFixed(3), '0.225');

  // And reversed for the weakest item, where a HIGH edge distance is the win:
  // sorting parks it at an edge, the fold parks it in the middle.
  assert.equal(sorted.worst, 0);
  assert.equal(folded.worst, 0.5);
});

test('fold vs sorted is structural: only the insertion-order row moves with the seed', () => {
  // Stated so nobody reads the table as a sampling result. At a given N the
  // fold's geometry is fixed, so those two rows are exact, not estimated;
  // arrival order is the only row with sampling noise in it.
  const a = runBench({ trials: 200, seed: 11 });
  const b = runBench({ trials: 200, seed: 4242 });
  const row = (r: typeof a, name: string) => r.layouts.find((l) => l.name.startsWith(name))!;

  assert.deepEqual(row(a, 'sort').topK, row(b, 'sort').topK);
  assert.deepEqual(row(a, 'folded').topK, row(b, 'folded').topK);
  assert.notDeepEqual(row(a, 'insertion').topK, row(b, 'insertion').topK);
});

test('the README publishes exactly the block the bench produces', () => {
  // The anti-rot check: `npm run bench` and README.md cannot disagree.
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8').replace(
    /\r\n/g,
    '\n'
  );
  const block = formatBenchBlock(runBench());
  assert.ok(
    readme.includes(block),
    `README does not contain the current bench block:\n\n${block}`
  );
});
