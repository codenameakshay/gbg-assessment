export type Review = { id: string; posted_at: string; text: string };

/**
 * Character 3-grams. Korean particles glue onto words, so word tokens miss matches that char n-grams catch.
 * Keeping only syllables, letters and digits drops emoji, ㅋㅋ/ㅎㅎ and spacing, which differ between cross-posts.
 */
export const shingles = (text: string, n = 3) => {
  const s = text.toLowerCase().replace(/[^가-힣a-z0-9]/g, "");
  return new Set(Array.from({ length: Math.max(0, s.length - n + 1) }, (_, i) => s.slice(i, i + n)));
};

/** Share of the shorter text found in the longer one. Cross-posts add greetings and hashtags, which drag Jaccard down. */
export const overlap = (a: Set<string>, b: Set<string>) => {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  return small.size < 20 ? 0 : small.intersection(big).size / small.size; // too short to call ("만족해요")
};

/** Maps each review id to the earliest review it duplicates (itself if none). */
export function dedupe(reviews: Review[], threshold = 0.7) {
  // ponytail: O(n × canonicals) scan; MinHash + LSH, blocked by clinic, once the corpus outgrows memory.
  const reps: { id: string; sh: Set<string> }[] = [];
  const canonical = new Map<string, string>();
  for (const r of reviews.toSorted((a, b) => a.posted_at.localeCompare(b.posted_at))) {
    const sh = shingles(r.text);
    const rep = reps.find((p) => overlap(sh, p.sh) >= threshold);
    canonical.set(r.id, rep?.id ?? r.id);
    if (!rep) reps.push({ id: r.id, sh });
  }
  return canonical;
}
