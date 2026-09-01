# u-pack

![TypeScript](https://img.shields.io/badge/TypeScript-erasable_syntax-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D22.18-5FA04E?logo=nodedotjs&logoColor=white)
![Dependencies](https://img.shields.io/badge/dependencies-0-B45309)
[![CI](https://github.com/m-sanchez/u-pack/actions/workflows/test.yml/badge.svg)](https://github.com/m-sanchez/u-pack/actions/workflows/test.yml)
![License](https://img.shields.io/badge/license-MIT-6E6E6E)
[![npm](https://img.shields.io/npm/v/@m-sanchez/u-pack?color=CB3837&logo=npm&logoColor=white)](https://www.npmjs.com/package/@m-sanchez/u-pack)

> **In plain English:** this fits as much useful context as possible into a limited space, and refuses cleanly when something will not fit instead of silently dropping it.

Defeat lost-in-the-middle by construction: rank your context, fold the
strongest to the prompt's edges, and let the weakest meet in the middle.

[More tools](https://github.com/m-sanchez) · [Working rules](https://miguelsanchez.co.uk/ethics)

*Provenance: this came out of one body of production LLM work, extracted and
generalised into a standalone package. First published 2026-08-31.*

Models recall the start and the end of a long prompt better than the middle
(Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172)). The
obvious layout, most relevant first, uses one of those two edges and then
walks the rest of your ranking steadily into the middle — and it spends the
other edge, the closing slot, on your weakest item. u-pack deals ranked items
alternately to the front and the back instead: rank 1 opens the prompt,
rank 2 closes it, and the tail of the ranking converges on the middle,
where the least is lost.

```
ranking:   1  2  3  4  5  6  7
folded:    1  3  5  7  6  4  2
           ^edge    middle    edge^
```

```ts
import { pack, render, overlap } from '@m-sanchez/u-pack';

const score = overlap('who paid this account most often this quarter');
const packed = pack(
  docs.map((d) => ({ id: d.id, content: d.text, score: score(d.text) })),
  { maxUnits: 2000 }
);

render(packed);       // prompt text, strongest at the edges
packed.placements;    // id, rank, index, region for every item
packed.dropped;       // whatever the budget cut, strongest first, in writing
```

Item ids must be unique. `placements` is keyed by id, so a repeated id would
report one item's rank against another's content; `pack` throws instead.

## Honest limits

Placement helps recall; it does not guarantee it. And placement quality is
bounded by scoring quality: the fold puts your rank 1 at the edge, it
cannot know whether rank 1 deserved it. The bundled scorers are lexical
(Sorensen-Dice overlap, exponential half-life recency, a weighted
combiner). Plug an embedding similarity in when you have one.

## Budgeting without silent caps

`maxUnits` (with a pluggable `measure`, word count by default) keeps the
highest-scored prefix that fits and cuts at the first item that does not,
so a small weak item can never outlive a stronger one that was dropped.
Every cut item is returned in `packed.dropped` with its score and size,
and placements keep their pre-drop ranks. A prompt that quietly lost
evidence reads as "covered everything" when it did not; this one tells
you.

## Measured, not asserted

The question worth answering is not "does the fold beat random insertion
order" — nobody ships random order. It is "I already sort my chunks by
score, so what does folding change?". `npm run bench` compares all three
layouts over the same seeded trials, with random scores so no rank is baked
into the fixture:

Mean edge distance over 1,000 seeded trials of 21 items
(0 = at a prompt edge, 0.5 = dead centre):

| layout | top-1 | top-2 | top-5 | top-10 | worst-ranked |
| :-- | --: | --: | --: | --: | --: |
| insertion order | 0.238 | 0.232 | 0.237 | 0.238 | 0.243 |
| sort by score, descending | 0.000 | 0.025 | 0.100 | 0.225 | 0.000 |
| folded (u-pack) | 0.000 | 0.000 | 0.040 | 0.100 | 0.500 |

For the top-k rows lower is better: those are your strongest items and you
want them near an edge. **At top-1 the fold and plain sorting tie at
0.000.** For a single strongest item folding buys you nothing — both put it
at index 0. The gain starts at rank 2 and grows: 0.040 vs 0.100 across the
top 5 (2.5x closer to an edge), 0.100 vs 0.225 across the top 10.

The last column reverses, and it is the sharper argument. Sorting
descending parks your *weakest* item at index 20 — a prime edge slot — at
0.000. The fold parks it dead centre at 0.500 and gives that slot to rank 2
instead.

Two caveats on the table, both pinned by tests. The bottom two rows are
structural rather than statistical: at a fixed item count the fold's
geometry is exact, so those numbers do not move with the seed and only the
insertion-order row carries sampling noise. And this measures *layout*,
which is what u-pack controls; that edge placement helps recall is the
paper's claim, not this benchmark's. The fold is what makes your context
eligible for it.

## Install

```bash
npm install @m-sanchez/u-pack
```

Also installable from a pinned git tag: `github:m-sanchez/u-pack#v2.0.0`. CI
proves the packed tarball imports cleanly. Zero runtime dependencies.

## Develop

```bash
npm ci            # dev-only: typescript
npm test
npm run bench
npm run typecheck
```

Node 22.18+ (erasable-syntax TypeScript; node runs the sources directly).

## The tests are the point

Every falsifiable claim on this page is mapped to the test that enforces
it in [CLAIMS.md](CLAIMS.md). A sample:

| Test | Claim |
| :-- | :-- |
| rank 1 first and rank 2 last, for every size tried | the strongest hold both edges, always |
| the weakest is interior from n = 6 up | the middle absorbs what the model would lose anyway |
| fold is total and input-order independent | layout is deterministic; ties break on id, not arrival |
| the needle among twenty distractors lands at an edge | insertion order buried it at position 10; the fold surfaces it |
| sorting spends the closing edge on the weakest item | the fold's real argument, measured; it does not bury rank 2 |
| the fold ties sorting at top-1 and wins from rank 2 on | the published comparison carries the tie, not just the wins |
| the README's bench table is the bench's own output | the published numbers cannot drift from the code |
| budget cuts at the first overflow; the weak cannot outlive the strong | the reviewer counterexample is a pinned test |
| an item bigger than the whole budget empties the prompt | the surprising edge of cut-at-first-overflow, pinned rather than discovered live |
| a non-finite score is refused | an arbitrary layout defeats the point |
| a duplicate id is refused | placements are keyed by id; duplicates would report a rank that is not the item's |
| placement ranks survive a budget cut | provenance over renumbering |
| recency is 0.5 at exactly one half-life | the decay curve is the documented one |
