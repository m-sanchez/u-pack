import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countWords, fold, pack, render } from '../src/pack.ts';
import type { Item } from '../src/pack.ts';

const item = (id: string, score: number, content = `content of ${id}`): Item => ({
  id,
  score,
  content
});

test('rank 1 opens the prompt and rank 2 closes it, for any size', () => {
  for (let n = 2; n <= 30; n++) {
    const items = Array.from({ length: n }, (_, i) => item(`i${i}`, n - i));
    const packed = pack(items);
    assert.equal(packed.order[0].id, 'i0', `n=${n}: strongest first`);
    assert.equal(packed.order[n - 1].id, 'i1', `n=${n}: second strongest last`);
  }
});

test('the weakest item lands in the interior once there is an interior', () => {
  for (let n = 6; n <= 30; n++) {
    const items = Array.from({ length: n }, (_, i) => item(`i${i}`, n - i));
    const packed = pack(items);
    const weakest = packed.placements.find((p) => p.id === `i${n - 1}`)!;
    assert.equal(weakest.region, 'interior', `n=${n}: weakest is interior`);
  }
});

test('the fold is total and deterministic: every item appears exactly once', () => {
  const items = Array.from({ length: 17 }, (_, i) => item(`i${i}`, (i * 7) % 13));
  const a = pack(items);
  const b = pack([...items].reverse());
  assert.deepEqual(
    a.order.map((x) => x.id),
    b.order.map((x) => x.id)
  );
  assert.equal(new Set(a.order.map((x) => x.id)).size, 17);
});

test('score ties break on id, so the layout never depends on input order', () => {
  const packed = pack([item('b', 5), item('a', 5), item('c', 5)]);
  assert.deepEqual(
    packed.placements.map((p) => `${p.rank}:${p.id}`).sort(),
    ['0:a', '1:b', '2:c']
  );
});

test('the needle among twenty distractors sits at an edge, not mid-list', () => {
  const distractors = Array.from({ length: 20 }, (_, i) => item(`noise${i}`, 0.1));
  const needle = item('needle', 0.9);
  const inserted = [...distractors.slice(0, 10), needle, ...distractors.slice(10)];
  // Insertion order buries it at position 10 of 21; the fold surfaces it.
  const packed = pack(inserted);
  const placed = packed.placements.find((p) => p.id === 'needle')!;
  assert.equal(placed.index, 0);
  assert.notEqual(inserted[10].id === 'needle' && placed.region, 'interior');
});

test('a budget drops the weakest first and reports every drop', () => {
  const items = [
    item('big-strong', 10, 'five words of strong content'),
    item('small-mid', 5, 'three mid words'),
    item('small-weak', 1, 'two words'),
    item('tiny-weakest', 0, 'word')
  ];
  const packed = pack(items, { maxUnits: 8 });
  assert.deepEqual(
    packed.order.map((x) => x.id),
    ['big-strong', 'small-mid']
  );
  assert.deepEqual(
    packed.dropped.map((d) => d.id),
    ['small-weak', 'tiny-weakest']
  );
  assert.equal(packed.unitsUsed, 8);
  assert.equal(packed.unitsBudget, 8);
});

test('with no budget nothing is dropped and usage is still reported', () => {
  const packed = pack([item('a', 1, 'four words right here'), item('b', 2, 'and three more')]);
  assert.deepEqual(packed.dropped, []);
  assert.equal(packed.unitsUsed, 7);
  assert.equal(packed.unitsBudget, null);
});

test('countWords ignores blank runs', () => {
  assert.equal(countWords(item('x', 0, '  two   words  ')), 2);
});

test('fold of the empty and singleton lists is itself', () => {
  assert.deepEqual(fold([]), []);
  assert.deepEqual(fold([1]), [1]);
});

test('render joins in fold order with optional labels', () => {
  const packed = pack([item('a', 2, 'AAA'), item('b', 1, 'BBB'), item('c', 3, 'CCC')]);
  assert.equal(render(packed), 'CCC\n\nBBB\n\nAAA');
  const labelled = render(packed, { label: (i, p) => `[${p.index}:${i.id}]`, separator: '\n' });
  assert.equal(labelled, '[0:c]\nCCC\n[1:b]\nBBB\n[2:a]\nAAA');
});
