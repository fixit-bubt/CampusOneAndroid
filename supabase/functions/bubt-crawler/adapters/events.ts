import { fetchWithRetry } from '../core/http.ts';
import { stripHtml, parseDhakaDate } from '../core/parser.ts';
import { computeFingerprint, filterUnchangedRecords, batchUpsert } from '../core/diff.ts';
import type { AdapterResult, EventItem } from '../types.ts';

const BUBT_NEWS_URL = 'https://www.bubt.edu.bd/news';

function resolveEventCategory(title: string, desc: string): 'Academic' | 'Cultural' | 'Sports' | 'Club' | 'Career' {
  const text = (title + ' ' + desc).toLowerCase();
  if (/futsal|cricket|football|sports|tournament|championship|badminton|athletics/i.test(text)) return 'Sports';
  if (/cultural|music|singing|drama|dance|reception|farewell|celebration|rabindra|nazrul|pohela boishakh/i.test(text)) return 'Cultural';
  if (/career|job fair|internship|resume|recruitment|corporate|cv writing/i.test(text)) return 'Career';
  if (/club|bncc|rover scout|ieee|moot court|basis|advisory committee/i.test(text)) return 'Club';
  return 'Academic';
}

function resolveEventVenue(desc: string): string {
  const text = desc.toLowerCase();
  if (text.includes('auditorium')) return 'Campus Auditorium, Building 1';
  if (text.includes('hall room')) return 'Hall Room, Building 2';
  if (text.includes('lab') || text.includes('laboratory')) return 'Computer Lab, Building 2';
  if (text.includes('playground') || text.includes('field')) return 'BUBT Campus Ground';
  if (text.includes('conference room')) return 'Conference Room, Building 1';
  return 'BUBT Main Campus, Mirpur-2';
}

export async function runEventsAdapter(
  supabase: any,
  systemAdminId: string
): Promise<AdapterResult> {
  const html = await fetchWithRetry(BUBT_NEWS_URL, { timeoutMs: 10000 });

  // 1. Fetch clubs for smart association
  const { data: clubsList } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('is_active', true);

  // 2. Parse card chunks directly from /news listing page
  const cardChunks = html.split(/(?=<div[^>]*class=["'][^"']*rounded-xl[^"']*overflow-hidden)/i);
  const rawCards: Array<{
    slug: string;
    url: string;
    title: string;
    thumbnail: string | null;
    snippet: string;
  }> = [];

  const seenSlugs = new Set<string>();

  for (const chunk of cardChunks) {
    const linkMatch = chunk.match(/href=["'](https?:\/\/www\.bubt\.edu\.bd\/news\/([a-zA-Z0-9-]+))["']/i);
    if (!linkMatch) continue;
    const url = linkMatch[1];
    const slug = linkMatch[2];
    if (seenSlugs.has(slug) || slug === 'all' || slug === 'category') continue;
    seenSlugs.add(slug);

    const imgMatch = chunk.match(/<img[^>]+src=["']([^"']*(?:jpg|jpeg|png|webp))["']/i);
    let thumbnail: string | null = null;
    if (imgMatch && !imgMatch[1].includes('no-image')) {
      thumbnail = imgMatch[1].startsWith('http') ? imgMatch[1] : `https://www.bubt.edu.bd${imgMatch[1]}`;
    }

    const titleMatch = chunk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const descMatch = chunk.match(/<p[^>]*class=["'][^"']*text-gray-600[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);

    rawCards.push({
      slug,
      url,
      title: titleMatch ? stripHtml(titleMatch[1]) : slug.replace(/-/g, ' '),
      thumbnail,
      snippet: descMatch ? stripHtml(descMatch[1]) : '',
    });
  }

  // 3. Check existing events in DB to skip redundant network calls
  const { data: existingEvents } = await supabase
    .from('events')
    .select('code, external_id, date, banner_url, content_hash')
    .eq('source', 'bubt_news');

  const existingMap = new Map<string, any>();
  if (existingEvents) {
    for (const e of existingEvents) {
      if (e.external_id) existingMap.set(e.external_id, e);
      if (e.code) existingMap.set(e.code, e);
    }
  }

  // Strict 120-Day Active Window Cutoff
  const fourMonthsAgoMs = Date.now() - (120 * 24 * 60 * 60 * 1000);

  // 4. Concurrently resolve article details only where needed
  const candidateItems: EventItem[] = [];

  const processedCards = await Promise.all(
    rawCards.slice(0, 10).map(async (card) => {
      const slugHash = (await computeFingerprint(card.slug)).slice(0, 6);
      const cleanSlug = card.slug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      const code = `EVT-${cleanSlug}-${slugHash}`;
      const externalId = `bubt_news_${card.slug}`;

      let title = card.title;
      let description = card.snippet;
      let eventDate = parseDhakaDate(title);
      let imageUrl = card.thumbnail;

      const existing = existingMap.get(externalId);

      // If already stored and has a valid date and banner, reuse cached details
      if (existing && existing.date && existing.banner_url) {
        eventDate = existing.date;
        imageUrl = existing.banner_url;
      } else {
        // Fetch article detail page concurrently
        try {
          const artHtml = await fetchWithRetry(card.url, { timeoutMs: 6000, maxRetries: 1 });

          const titleMatch = artHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || artHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
          if (titleMatch) title = stripHtml(titleMatch[1]);

          const dateMatch = artHtml.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i);
          if (dateMatch) eventDate = parseDhakaDate(dateMatch[0]);

          const pMatch = artHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) || artHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
          if (pMatch) {
            description = stripHtml(pMatch[1]).slice(0, 600);
          }

          // Detail image check: only overwrite if not generic no-image
          const detailImgMatch = artHtml.match(/<img[^>]+src=["']([^"']*(?:storage\/news\/[^"']+\.(?:jpg|jpeg|png|webp)))["']/i);
          if (detailImgMatch) {
            imageUrl = detailImgMatch[1].startsWith('http') ? detailImgMatch[1] : `https://www.bubt.edu.bd${detailImgMatch[1]}`;
          }
        } catch {
          // Fall back gracefully to card data
        }
      }

      // Enforce 120-Day Cutoff: Skip ancient historical events
      const eventTimeMs = new Date(eventDate).getTime();
      if (!isNaN(eventTimeMs) && eventTimeMs < fourMonthsAgoMs) {
        return null;
      }

      const category = resolveEventCategory(title, description);
      const venue = resolveEventVenue(description);

      let matchedClubId: string | null = null;
      if (clubsList && clubsList.length > 0) {
        const fullTxt = (title + ' ' + description).toLowerCase();
        for (const c of clubsList) {
          if (fullTxt.includes(c.name.toLowerCase())) {
            matchedClubId = c.id;
            break;
          }
        }
      }

      const fingerprint = await computeFingerprint(`${title}|${eventDate}|${venue}|${imageUrl || ''}`);

      return {
        code,
        title: title.slice(0, 200).trim(),
        category,
        organizer: 'BUBT Administration',
        venue,
        date: eventDate,
        time: '10:00',
        end_time: '13:00',
        banner_url: imageUrl,
        description: description || title,
        source: 'bubt_news',
        external_id: externalId,
        external_url: card.url,
        club_id: matchedClubId,
        tags: [category.toLowerCase(), 'official_bubt'],
        content_hash: fingerprint,
      } as EventItem;
    })
  );

  for (const item of processedCards) {
    if (item) candidateItems.push(item);
  }

  // 5. Delta filter with separate add vs update counting
  const { toInsert, toUpdate, unchangedCount } = await filterUnchangedRecords(supabase, 'events', candidateItems);

  let added = 0;
  let updated = 0;

  if (toInsert.length > 0) {
    const rows = toInsert.map(item => ({
      ...item,
      created_by: systemAdminId,
    }));
    const res = await batchUpsert(supabase, 'events', rows, 'code', { isUpdate: false });
    added = res.added;
  }

  if (toUpdate.length > 0) {
    const rows = toUpdate.map(item => ({
      ...item,
      created_by: systemAdminId,
    }));
    const res = await batchUpsert(supabase, 'events', rows, 'code', { isUpdate: true });
    updated = res.updated;
  }

  return {
    feature: 'events',
    scanned: rawCards.length,
    added,
    updated,
    unchanged: unchangedCount,
  };
}
