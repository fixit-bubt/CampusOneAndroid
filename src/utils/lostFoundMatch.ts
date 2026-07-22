// Lost & Found match ranking — shared by the item detail (suggests matches to
// the poster) and the post form (pre-post "this might already be posted" hint).
// Mirrors web findItemMatches: opposite type + same category (filtered in the
// query), scored by shared title/description tokens, top N.

export interface MatchItem {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  status: string;
  created_at: string;
  poster_id: string;
  location: string;
}

const MATCH_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'was', 'lost', 'found', 'near', 'item',
  'from', 'have', 'has', 'this', 'that', 'your', 'you', 'are',
]);

export function matchTokens(text: string | null): Set<string> {
  return new Set(
    (text || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !MATCH_STOPWORDS.has(w)),
  );
}

export function rankMatches(
  target: { title: string; description: string; poster_id: string },
  items: MatchItem[],
  limit = 4,
): MatchItem[] {
  const titleTokens = matchTokens(target.title);
  const descTokens = matchTokens(target.description);
  return items
    .filter(i => i.poster_id !== target.poster_id)
    .map(i => {
      const iTitle = matchTokens(i.title);
      const iAll = new Set<string>(iTitle);
      matchTokens(i.description).forEach(w => iAll.add(w));
      let score = 0;
      titleTokens.forEach(tk => { if (iTitle.has(tk)) score += 2; else if (iAll.has(tk)) score += 1; });
      descTokens.forEach(tk => { if (iAll.has(tk)) score += 1; });
      return { item: i, score };
    })
    .sort((a, b) => b.score - a.score || (b.item.created_at || '').localeCompare(a.item.created_at || ''))
    .slice(0, limit)
    .map(x => x.item);
}
