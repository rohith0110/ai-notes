/**
 * Forgiving relevance ranker for note search results.
 * Convex full-text gives us candidate notes; we re-rank them client-side
 * so that title-prefix matches beat title-substring beat tag beat body.
 */

export type Rankable = {
  id: string;
  title: string;
  contentText: string;
  tags: string[];
  updatedAt: number;
};

function norm(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

function subsequenceScore(haystack: string, needle: string): number {
  let i = 0;
  let j = 0;
  let consecutive = 0;
  let bestRun = 0;
  while (i < haystack.length && j < needle.length) {
    if (haystack[i] === needle[j]) {
      j++;
      consecutive++;
      bestRun = Math.max(bestRun, consecutive);
    } else {
      consecutive = 0;
    }
    i++;
  }
  if (j < needle.length) return 0;
  return bestRun / needle.length;
}

export function scoreItem(item: Rankable, rawQuery: string): number {
  const q = norm(rawQuery.trim());
  if (!q) return 0;
  const title = norm(item.title);
  const tags = item.tags.map(norm);
  const body = norm(item.contentText);

  let score = 0;
  if (title === q) score += 1000;
  else if (title.startsWith(q)) score += 600;
  else if (title.includes(q)) score += 350;
  else {
    const sub = subsequenceScore(title, q);
    if (sub > 0.6) score += 180 * sub;
  }

  for (const t of tags) {
    if (t === q) score += 220;
    else if (t.startsWith(q)) score += 140;
    else if (t.includes(q)) score += 80;
  }

  const bodyIdx = body.indexOf(q);
  if (bodyIdx >= 0) {
    score += 70;
    if (bodyIdx < 200) score += 40;
  } else if (q.length > 3) {
    const sub = subsequenceScore(body.slice(0, 4000), q);
    if (sub > 0.7) score += 30 * sub;
  }

  const ageDays = (Date.now() - item.updatedAt) / 86_400_000;
  score += Math.max(0, 40 - ageDays);

  return score;
}

export function rankItems<T extends Rankable>(items: T[], query: string): T[] {
  if (!query.trim()) {
    return [...items].sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return items
    .map((item) => ({ item, score: scoreItem(item, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
