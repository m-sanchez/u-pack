# u-pack

![TypeScript](https://img.shields.io/badge/TypeScript-erasable_syntax-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D22.18-5FA04E?logo=nodedotjs&logoColor=white)
![Dependencies](https://img.shields.io/badge/dependencies-0-B45309)
[![CI](https://github.com/m-sanchez/u-pack/actions/workflows/test.yml/badge.svg)](https://github.com/m-sanchez/u-pack/actions/workflows/test.yml)
![License](https://img.shields.io/badge/license-MIT-6E6E6E)

Defeat lost-in-the-middle by construction: rank your context, fold the
strongest to the prompt's edges, and let the weakest meet in the middle.

[More tools](https://github.com/m-sanchez) · [Working rules](https://miguelsanchez.co.uk/ethics)

Models recall the start and the end of a long prompt better than the middle
(Liu et al., [Lost in the Middle](https://arxiv.org/abs/2307.03172)). The
obvious layout, most relevant first, puts your second-best evidence in
exactly the region the model reads worst. u-pack deals ranked items
alternately to the front and the back instead: rank 1 opens the prompt,
rank 2 closes it, and the tail of the ranking converges on the middle,
where the least is lost.

```
ranking:   1  2  3  4  5  6  7
folded:    1  3  5  7  6  4  2
           ^edge    middle    edge^
```

```ts
import { pack, render, overlap } from 'u-pack';

const score = overlap('who paid this account most often this quarter');
const packed = pack(
  docs.map((d) => ({ id: d.id, content: d.text, score: score(d.text) })),
  { maxUnits: 2000 }
);

render(packed);       // prompt text, strongest at the edges
packed.placements;    // id, rank, index, region for every item
packed.dropped;       // whatever the budget cut, strongest first, in writing
```

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

`npm run bench` runs 1,000 seeded needle-among-distractors layouts:

```
  insertion order: mean edge distance 0.230, at an edge 9.7%
  folded:          mean edge distance 0.000, at an edge 100.0%
```

That measures layout, which is what u-pack controls; the recall benefit
of edge placement is the paper's claim, and the fold is what makes your
context eligible for it.

## Install

```bash
npm install github:m-sanchez/u-pack#v1.1.0
```

Not yet on npm; the pinned git tag is the supported install and CI proves
the packed tarball imports cleanly. Zero runtime dependencies.

## Develop

```bash
npm ci            # dev-only: typescript
npm test
npm run bench
npm run typecheck
```

Node 22.18+ (erasable-syntax TypeScript; node runs the sources directly).

## The tests are the point

| Test | Claim |
| :-- | :-- |
| rank 1 first and rank 2 last, for every size tried | the strongest hold both edges, always |
| the weakest is interior from n = 6 up | the middle absorbs what the model would lose anyway |
| fold is total and input-order independent | layout is deterministic; ties break on id, not arrival |
| the needle among twenty distractors lands at an edge | insertion order buried it at position 10; the fold surfaces it |
| budget cuts at the first overflow; the weak cannot outlive the strong | the reviewer counterexample is a pinned test |
| a non-finite score is refused | an arbitrary layout defeats the point |
| placement ranks survive a budget cut | provenance over renumbering |
| recency is 0.5 at exactly one half-life | the decay curve is the documented one |
