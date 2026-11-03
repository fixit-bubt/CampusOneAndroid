import { fetchWithRetry } from '../core/http.ts';
import { stripHtml, resolveDepartment, resolveNoticeCategory, resolveNoticePriority } from '../core/parser.ts';
import { computeFingerprint, filterUnchangedRecords, batchUpsert } from '../core/diff.ts';
import type { AdapterResult, NoticeItem } from '../types.ts';

const BUBT_NOTICE_URL = 'https://www.bubt.edu.bd/notice';
const BUBT_STORAGE_BASE = 'https://www.bubt.edu.bd/storage/';
const BUBT_UPLOADS_BASE = 'https://www.bubt.edu.bd/uploads/';

export async function runNoticesAdapter(
  supabase: any,
  systemAdminId: string
): Promise<{ result: AdapterResult; rawNotices: any[] }> {
  const html = await fetchWithRetry(BUBT_NOTICE_URL, { timeoutMs: 12000 });

  const match = html.match(/notices:\s*(\[[\s\S]*?\]),\s*categories:/);
  if (!match) {
    throw new Error('notices dataset payload not found on BUBT notice board');
  }

  const rawNotices = JSON.parse(match[1]);
  const totalScanned = rawNotices.length;

  // Strict 4-Month (120-Day) Active Semester Window Cutoff for Announcements
  const fourMonthsAgo = Date.now() - (120 * 24 * 60 * 60 * 1000);
  const activeBatch: any[] = [];

  for (const n of rawNotices) {
    if (!n || !n.title) continue;
    const createdAtMs = n.created_at ? new Date(n.created_at).getTime() : Date.now();
    if (createdAtMs < fourMonthsAgo) {
      break;
    }
    activeBatch.push(n);
  }

  // Pre-fetch existing pin, banner and order status to protect manual admin curation from being overwritten
  const candidateCodes = activeBatch.map(n => `BUBT-N-${n.id}`);
  const existingPinMap = new Map<string, boolean>();
  const existingBannerMap = new Map<string, boolean>();
  const existingOrderMap = new Map<string, number>();
  const existingBannerImgMap = new Map<string, string | null>();

  const CHUNK_SIZE = 50;
  for (let i = 0; i < candidateCodes.length; i += CHUNK_SIZE) {
    const chunk = candidateCodes.slice(i, i + CHUNK_SIZE);
    const { data: existingRows } = await supabase
      .from('announcements')
      .select('code, pinned, in_banner, banner_order, banner_image_url')
      .in('code', chunk);

    if (existingRows) {
      for (const row of existingRows) {
        if (row.code) {
          existingPinMap.set(row.code, Boolean(row.pinned));
          existingBannerMap.set(row.code, Boolean(row.in_banner));
          existingOrderMap.set(row.code, Number(row.banner_order ?? 0));
          existingBannerImgMap.set(row.code, row.banner_image_url ?? null);
        }
      }
    }
  }

  const candidateItems: NoticeItem[] = [];

  for (const n of activeBatch) {
    const code = `BUBT-N-${n.id}`;
    const externalId = String(n.id);
    const { categoryName, categorySlug } = resolveNoticeCategory(n.category?.slug || '', n.title);
    const { department, deptCode } = resolveDepartment(
      (n.title || '') + ' ' + (n.description || ''),
      n.department_id,
      n.office_id
    );
    const { priority, pinned: defaultPinned } = resolveNoticePriority(n.title, categorySlug);
    // Preserve manual admin pin if announcement already exists
    const pinned = existingPinMap.has(code) ? (existingPinMap.get(code) ?? defaultPinned) : defaultPinned;

    const externalUrl = n.slug ? `https://www.bubt.edu.bd/notice/details/${n.slug}` : BUBT_NOTICE_URL;

    let imageUrl: string | null = null;
    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    // Direct file attachment check
    if (n.file) {
      const cleanFile = String(n.file).replace(/^\/+/, '');
      const fullUrl = cleanFile.startsWith('http') ? cleanFile : `${BUBT_STORAGE_BASE}${cleanFile}`;
      if (/\.(jpg|jpeg|png|webp)$/i.test(cleanFile)) {
        imageUrl = fullUrl;
      } else if (/\.pdf$/i.test(cleanFile)) {
        attachmentUrl = fullUrl;
        attachmentName = (n.title || 'BUBT Notice').slice(0, 60).trim() + '.pdf';
      }
    }

    // Older document storage check
    if (!attachmentUrl && n.notice_document) {
      const cleanDoc = String(n.notice_document).replace(/^\/+/, '');
      const docUrl = cleanDoc.startsWith('http') ? cleanDoc : `${BUBT_UPLOADS_BASE}${cleanDoc}`;
      if (/\.pdf$/i.test(cleanDoc)) {
        attachmentUrl = docUrl;
        attachmentName = (n.title || 'BUBT Notice').slice(0, 60).trim() + '.pdf';
      } else if (/\.(jpg|jpeg|png|webp)$/i.test(cleanDoc)) {
        imageUrl = imageUrl || docUrl;
      }
    }

    // Inline image check in HTML
    if (!imageUrl && n.description) {
      const imgMatch = String(n.description).match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        const src = imgMatch[1].trim();
        imageUrl = src.startsWith('http') ? src : `${BUBT_STORAGE_BASE}${src.replace(/^\/+/, '')}`;
      }
    }

    const rawDesc = n.description ? stripHtml(n.description) : '';
    const body = rawDesc && rawDesc.length > 5
      ? rawDesc
      : `Official circular published by BUBT for ${categoryName}. View or download the attached document for full details.`;

    const inBanner = existingBannerMap.get(code) ?? false;
    const bannerOrder = existingOrderMap.get(code) ?? 0;
    const bannerImageUrl = existingBannerImgMap.get(code) ?? null;

    const fingerprint = await computeFingerprint(`${n.title}|${body}|${attachmentUrl || ''}|${imageUrl || ''}|${pinned}|${inBanner}|${bannerOrder}`);

    candidateItems.push({
      code,
      title: n.title.trim(),
      body,
      department: department || 'University-Wide',
      department_code: deptCode || null,
      priority,
      pinned,
      in_banner: inBanner,
      banner_order: bannerOrder,
      banner_image_url: bannerImageUrl,
      category: categoryName,
      category_slug: categorySlug,
      attachment_url: attachmentUrl || null,
      attachment_name: attachmentName || null,
      image_url: imageUrl || null,
      external_url: externalUrl || null,
      external_id: externalId || null,
      source: 'bubt_official',
      content_hash: fingerprint,
      created_at: n.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Delta Filter: accurately distinguish new insertions vs updates
  const { toInsert, toUpdate, unchangedCount } = await filterUnchangedRecords(supabase, 'announcements', candidateItems);

  let added = 0;
  let updated = 0;

  if (toInsert.length > 0) {
    const rows = toInsert.map(item => ({
      ...item,
      created_by: systemAdminId,
    }));
    const res = await batchUpsert(supabase, 'announcements', rows, 'code', { isUpdate: false });
    added = res.added;
  }

  if (toUpdate.length > 0) {
    const rows = toUpdate.map(item => ({
      ...item,
      created_by: systemAdminId,
    }));
    const res = await batchUpsert(supabase, 'announcements', rows, 'code', { isUpdate: true });
    updated = res.updated;
  }

  return {
    result: {
      feature: 'notices',
      scanned: activeBatch.length,
      added,
      updated,
      unchanged: unchangedCount,
      details: {
        total_in_bubt_history: totalScanned,
        four_month_window_count: activeBatch.length,
      },
    },
    // Return top 300 notices to downstream routines, calendar & bus adapters
    // so semester-spanning circulars from earlier months are never starved
    rawNotices: rawNotices.slice(0, 300),
  };
}
