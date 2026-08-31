/** Optional scoring helpers. u-pack has no opinion about what "relevant"
 * means; these are honest, cheap defaults for when you have nothing better.
 * Placement quality is bounded by scoring quality, and both of these are
 * lexical, not semantic; plug an embedding similarity in when you have one. */

const tokenize = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3)
  );

/** Sorensen-Dice coefficient over word tokens: 2|A n B| / (|A| + |B|). */
export function overlap(query: string): (content: string) => number {
  const q = tokenize(query);
  return (content) => {
    const c = tokenize(content);
    if (q.size === 0 || c.size === 0) return 0;
    let shared = 0;
    for (const t of q) if (c.has(t)) shared++;
    return (2 * shared) / (q.size + c.size);
  };
}

/** Exponential half-life decay: 0.5 at exactly one half-life of age. */
export function recency(
  halfLifeDays = 14,
  now: () => number = Date.now
): (timestampMs: number) => number {
  const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000;
  return (timestampMs) => {
    const age = Math.max(0, now() - timestampMs);
    return Math.pow(0.5, age / halfLifeMs);
  };
}

/** Combine component scores with weights: weighted([[f, 2], [g, 1]]). */
export function weighted<T>(pairs: Array<[score: (value: T) => number, weight: number]>) {
  return (value: T): number => pairs.reduce((sum, [fn, w]) => sum + w * fn(value), 0);
}
