/** The alternating fold: place the strongest context at the prompt's edges
 * and let the weakest converge on the middle, by construction.
 *
 * Models recall the start and end of a long prompt better than the middle
 * (Liu et al., "Lost in the Middle"). Sorting context by relevance and
 * concatenating it top-down puts your second-best item in exactly the
 * region the model reads worst. The fold deals ranked items alternately to
 * the front and the back instead: rank 1 opens the prompt, rank 2 closes
 * it, rank 3 follows the opener, rank 4 precedes the closer, and the tail
 * of the ranking meets in the middle where the least is lost. */

export interface Item {
  id: string;
  content: string;
  /** caller-supplied relevance; higher is stronger */
  score: number;
}

export type Region = 'leading' | 'interior' | 'trailing';

export interface Placement {
  id: string;
  /** 0 = strongest */
  rank: number;
  /** position in the final sequence */
  index: number;
  /** derived for reporting only: first third, last third, or interior */
  region: Region;
  score: number;
}

export interface Dropped {
  id: string;
  score: number;
  units: number;
}

export interface Packed {
  /** items in final prompt order */
  order: Item[];
  placements: Placement[];
  /** lowest-scored items that did not fit the budget, strongest first */
  dropped: Dropped[];
  unitsUsed: number;
  unitsBudget: number | null;
}

export interface PackOptions {
  /** size budget; omit for no limit */
  maxUnits?: number;
  /** how big one item is; default counts words */
  measure?: (item: Item) => number;
}

export const countWords = (item: Item): number =>
  item.content.split(/\s+/).filter(Boolean).length;

/** Deterministic ranking: score descending, id ascending on ties. Two
 * inputs are refused at the boundary. A non-finite score, because NaN
 * ordering is arbitrary and an arbitrary layout defeats the whole point.
 * And a repeated id, because `placements` is keyed by id: duplicates make
 * the rank column report the last duplicate's rank for every copy, so the
 * provenance table would silently disagree with the layout it describes. */
export function rankItems(items: Item[]): Item[] {
  const seen = new Set<string>();
  for (const item of items) {
    if (!Number.isFinite(item.score)) {
      throw new TypeError(`item "${item.id}" has a non-finite score (${item.score})`);
    }
    if (seen.has(item.id)) {
      throw new TypeError(`item "${item.id}" appears more than once; ids must be unique for placement provenance`);
    }
    seen.add(item.id);
  }
  return [...items].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Fold a ranked list: alternate front/back, back half reversed, so the
 * strongest sit outermost and the weakest meet in the middle. */
export function fold<T>(ranked: T[]): T[] {
  const front: T[] = [];
  const back: T[] = [];
  ranked.forEach((item, i) => (i % 2 === 0 ? front : back).push(item));
  return [...front, ...back.reverse()];
}

function regionOf(index: number, total: number): Region {
  if (total <= 2) return index === 0 ? 'leading' : 'trailing';
  const third = total / 3;
  if (index < third) return 'leading';
  if (index >= total - third) return 'trailing';
  return 'interior';
}

/** Rank, budget, and fold. The budget keeps the highest-scored prefix
 * that fits and cuts at the FIRST item that does not: a small weak item
 * can never outlive a stronger one that was dropped. Nothing is dropped
 * silently; every cut item comes back in `dropped` with its score. */
export function pack(items: Item[], opts: PackOptions = {}): Packed {
  const measure = opts.measure ?? countWords;
  const ranked = rankItems(items);

  let kept = ranked;
  let dropped: Dropped[] = [];
  let unitsUsed = ranked.reduce((sum, i) => sum + measure(i), 0);
  if (opts.maxUnits != null) {
    kept = [];
    unitsUsed = 0;
    for (let i = 0; i < ranked.length; i++) {
      const units = measure(ranked[i]);
      if (unitsUsed + units > opts.maxUnits) {
        dropped = ranked.slice(i).map((item) => ({ id: item.id, score: item.score, units: measure(item) }));
        break;
      }
      kept.push(ranked[i]);
      unitsUsed += units;
    }
  }

  const order = fold(kept);
  // rank is the PRE-drop rank, so a placement traces back to the original
  // ranking even after a budget cut
  const rankOf = new Map(ranked.map((item, r) => [item.id, r]));
  const placements = order.map((item, index) => ({
    id: item.id,
    rank: rankOf.get(item.id)!,
    index,
    region: regionOf(index, order.length),
    score: item.score
  }));

  return {
    order,
    placements,
    dropped,
    unitsUsed,
    unitsBudget: opts.maxUnits ?? null
  };
}

export interface RenderOptions {
  separator?: string;
  label?: (item: Item, placement: Placement) => string;
}

/** Join the packed sequence into prompt text. */
export function render(packed: Packed, opts: RenderOptions = {}): string {
  const sep = opts.separator ?? '\n\n';
  return packed.order
    .map((item, i) => {
      const label = opts.label?.(item, packed.placements[i]);
      return label ? `${label}\n${item.content}` : item.content;
    })
    .join(sep);
}
