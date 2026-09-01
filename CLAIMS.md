# Claims

Every externally falsifiable behavioural claim u-pack makes in public — the
package description and README.md — mapped to the executable test that
enforces it. If a row's test is deleted, the claim it backs is unsupported and
the sentence should come out of the README with it.

Run them all with `npm test`.

## Package description

> Defeat lost-in-the-middle by construction: rank context items, fold the
> strongest to the prompt's edges, budget without silent drops.

| Claim | Enforced by |
| :-- | :-- |
| ranks context items deterministically | `test/pack.test.ts::score ties break on id, so the layout never depends on input order` |
| folds the strongest to the prompt's edges | `test/pack.test.ts::rank 1 opens the prompt and rank 2 closes it, for any size` |
| budgets without silent drops | `test/pack.test.ts::a budget drops the weakest first and reports every drop` |

## README

| # | Claim (README line) | Enforced by |
| :-- | :-- | :-- |
| 1 | "refuses cleanly when something will not fit instead of silently dropping it" (10) | `test/pack.test.ts::a budget drops the weakest first and reports every drop`; `test/pack.test.ts::an item bigger than the whole budget takes the prompt with it, in writing` |
| 2 | "rank your context, fold the strongest to the prompt's edges, and let the weakest meet in the middle" (12-13) | `test/pack.test.ts::rank 1 opens the prompt and rank 2 closes it, for any size`; `test/pack.test.ts::the weakest item lands in the interior once there is an interior` |
| 3 | sorting by score "uses one of those two edges … and spends the other edge, the closing slot, on your weakest item" (21-24) | `test/layout.test.ts::sorting by score does not bury rank 2; what it wastes is the trailing edge` |
| 4 | "rank 1 opens the prompt, rank 2 closes it, and the tail of the ranking converges on the middle" (24-27) | `test/pack.test.ts::rank 1 opens the prompt and rank 2 closes it, for any size`; `test/pack.test.ts::the weakest item lands in the interior once there is an interior` |
| 5 | the fold diagram: `1 2 3 4 5 6 7` → `1 3 5 7 6 4 2` (29-33) | `test/pack.test.ts::fold reproduces the sequence the README diagram publishes` |
| 6 | the usage block imports `pack`, `render`, `overlap` from the package entry point (35-47) | `test/contract.test.ts::the entry point exports every name the README usage block imports` |
| 7 | `packed.placements` carries id, rank, index, region for every item (45) | `test/pack.test.ts::placement rank survives a budget cut: pre-drop ranks, not renumbered`; `test/pack.test.ts::the needle among twenty distractors sits at an edge, not mid-list` |
| 8 | `packed.dropped` is "whatever the budget cut, strongest first" (46) | `test/pack.test.ts::a budget drops the weakest first and reports every drop` |
| 9 | "item ids must be unique … `pack` throws instead" (49-50) | `test/pack.test.ts::a duplicate id is refused at the boundary: provenance cannot be trusted otherwise` |
| 10 | the bundled scorer is Sorensen-Dice overlap (56-58) | `test/score.test.ts::overlap is 1 for identical token sets and 0 for disjoint ones`; `test/score.test.ts::overlap is symmetric in magnitude and bounded by [0, 1]`; `test/score.test.ts::short tokens do not inflate overlap` |
| 11 | the bundled scorer is exponential half-life recency (56-58) | `test/score.test.ts::recency is 1 now, 0.5 at one half-life, 0.25 at two`; `test/score.test.ts::the future does not score above the present` |
| 12 | the bundled scorer is a weighted combiner (56-58) | `test/score.test.ts::weighted combines components linearly` |
| 13 | `maxUnits` "keeps the highest-scored prefix that fits and cuts at the first item that does not, so a small weak item can never outlive a stronger one that was dropped" (62-64) | `test/pack.test.ts::the reviewer's counterexample: a small weak item cannot outlive a dropped stronger one`; `test/pack.test.ts::an item bigger than the whole budget takes the prompt with it, in writing` |
| 14 | "every cut item is returned in `packed.dropped` with its score and size" (65-66) | `test/pack.test.ts::a budget drops the weakest first and reports every drop` |
| 15 | "placements keep their pre-drop ranks" (66) | `test/pack.test.ts::placement rank survives a budget cut: pre-drop ranks, not renumbered` |
| 16 | `measure` defaults to word count (62) | `test/pack.test.ts::countWords ignores blank runs`; `test/pack.test.ts::with no budget nothing is dropped and usage is still reported` |
| 17 | the published benchmark table is what `npm run bench` prints (78-85) | `test/layout.test.ts::the README publishes exactly the block the bench produces` |
| 18 | "at top-1 the fold and plain sorting tie at 0.000" (88-89) | `test/layout.test.ts::the fold ties sorting at top-1 and beats it from rank 2 on` |
| 19 | "0.040 vs 0.100 across the top 5 (2.5x closer to an edge), 0.100 vs 0.225 across the top 10" (90-91) | `test/layout.test.ts::the fold ties sorting at top-1 and beats it from rank 2 on` |
| 20 | sorting parks the weakest at 0.000, the fold at 0.500 (93-96) | `test/layout.test.ts::the fold ties sorting at top-1 and beats it from rank 2 on`; `test/layout.test.ts::sorting by score does not bury rank 2; what it wastes is the trailing edge` |
| 21 | "the bottom two rows are structural rather than statistical … only the insertion-order row carries sampling noise" (98-101) | `test/layout.test.ts::fold vs sorted is structural: only the insertion-order row moves with the seed` |
| 22 | "zero runtime dependencies" (113), and the dependencies-0 badge (5) | `test/contract.test.ts::zero runtime dependencies` |
| 23 | "CI proves the packed tarball imports cleanly" (112-113) | `.github/workflows/test.yml::install proof` (npm pack, then install and import the tarball in a scratch project) |
| 24 | "layout is deterministic" / the fold is total (README test table) | `test/pack.test.ts::the fold is total and deterministic: every item appears exactly once` |
| 25 | "a non-finite score is refused" (README test table) | `test/pack.test.ts::a non-finite score is refused at the boundary` |
| 26 | "the needle among twenty distractors lands at an edge; insertion order buried it at position 10" (README test table) | `test/pack.test.ts::the needle among twenty distractors sits at an edge, not mid-list` |
| 27 | `render` joins in fold order and takes optional labels (44) | `test/pack.test.ts::render joins in fold order with optional labels` |
| 28 | "Node 22.18+ … node runs the sources directly" (124) | `.github/workflows/test.yml` runs the full suite on node 22, 24 and 26 against the `.ts` sources; `erasableSyntaxOnly` in `tsconfig.json` plus `npm run typecheck` in CI enforce the syntax subset that makes that possible |

## Claims deliberately left untested

Two statements in the README are not behavioural claims about this code, and
no test here can settle them. They are listed so the table above is not read
as complete coverage of every sentence.

| Statement | Why there is no test |
| :-- | :-- |
| "Models recall the start and the end of a long prompt better than the middle" (20-21) | A result from Liu et al., *Lost in the Middle*, cited as such. u-pack measures layout, not recall; the README says so explicitly. |
| "Placement helps recall; it does not guarantee it" and "placement quality is bounded by scoring quality" (54-56) | Limits on what the package can be expected to do, not behaviour it performs. The first depends on the model, the second on the caller's scorer. |
