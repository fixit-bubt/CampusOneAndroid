import { resolveDepartment } from '../core/parser.ts';
import type { AdapterResult } from '../types.ts';

const BUBT_STORAGE_BASE = 'https://www.bubt.edu.bd/storage/';
const BUBT_UPLOADS_BASE = 'https://www.bubt.edu.bd/uploads/';

export interface ScrapedJobItem {
  code: string;
  title: string;
  company: string;
  job_type: 'on_campus' | 'internship' | 'part_time' | 'full_time';
  location: string;
  work_mode: 'onsite' | 'remote' | 'hybrid';
  description: string;
  requirements: string | null;
  stipend: string | null;
  deadline: string;
  apply_method: 'file' | 'email' | 'link';
  apply_value: string | null;
  apply_file_url: string | null;
  apply_file_name: string | null;
  posted_by: string;
  posted_by_name: string;
  department_code: string;
  compensation_type: 'paid' | 'conveyance' | 'unpaid' | 'negotiable';
}

function extractDhakaDeadline(text: string, createdAt?: string): string {
  // Look for deadline or last date patterns in notice text
  const match = text.match(/(?:last date|deadline|before|apply by)[^\d]{1,20}(\d{1,2})[-/.\s]+([a-zA-Z]{3,9}|\d{1,2})[-/.\s]+(\d{4})/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monthPart = match[2].toLowerCase();
    const year = match[3];
    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const mon = monthMap[monthPart.slice(0, 3)] || monthPart.padStart(2, '0');
    return `${year}-${mon}-${day}`;
  }

  // Fallback to notice creation date + 14 days or today + 14 days
  const baseDate = createdAt ? new Date(createdAt) : new Date();
  baseDate.setDate(baseDate.getDate() + 14);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(baseDate);
}

export async function runJobsAdapter(
  supabase: any,
  rawNotices: any[],
  systemAdminId: string
): Promise<AdapterResult> {
  if (!rawNotices || rawNotices.length === 0) {
    return { feature: 'jobs', scanned: 0, added: 0, updated: 0, unchanged: 0 };
  }

  // Filter notices for recruitment, teaching assistant, circular, or career postings
  const jobCandidates = rawNotices.filter((n: any) => {
    if (!n || !n.title) return false;
    const t = `${n.title} ${n.description || ''}`.toLowerCase();
    return /\b(recruitment|teaching\s*assistant|ta\s*recruitment|vacancy\s*announcement|job\s*circular|career\s*opportunity|placement\s*drive|walk-in\s*interview|lecturer\s*recruitment|internship\s*opportunity)\b/i.test(t);
  });

  if (jobCandidates.length === 0) {
    return { feature: 'jobs', scanned: rawNotices.length, added: 0, updated: 0, unchanged: 0 };
  }

  const jobItems: ScrapedJobItem[] = [];

  for (const n of jobCandidates) {
    const title = n.title.trim();
    const fullText = `${title} ${n.description || ''}`;
    const code = `BUBT-JOB-${n.id}`;

    const { department, deptCode } = resolveDepartment(fullText, n.department_id, n.office_id);

    // Determine Job Type
    let jobType: 'on_campus' | 'internship' | 'part_time' | 'full_time' = 'full_time';
    if (/\b(teaching\s*assistant|ta|lab\s*assistant|peer\s*tutor)\b/i.test(title)) {
      jobType = 'on_campus';
    } else if (/\bintern(ship)?\b/i.test(title)) {
      jobType = 'internship';
    } else if (/\bpart[\s-]*time\b/i.test(title)) {
      jobType = 'part_time';
    }

    // Resolve PDF Attachment
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    if (n.file) {
      const clean = String(n.file).replace(/^\/+/, '');
      fileUrl = clean.startsWith('http') ? clean : `${BUBT_STORAGE_BASE}${clean}`;
      fileName = `${title.slice(0, 30)}.pdf`;
    } else if (n.notice_document) {
      const clean = String(n.notice_document).replace(/^\/+/, '');
      fileUrl = clean.startsWith('http') ? clean : `${BUBT_UPLOADS_BASE}${clean}`;
      fileName = `${title.slice(0, 30)}.pdf`;
    }

    const deadline = extractDhakaDeadline(fullText, n.created_at);

    // Description text cleanup
    const cleanDesc = (n.description || title)
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    jobItems.push({
      code,
      title,
      company: 'Bangladesh University of Business & Technology (BUBT)',
      job_type: jobType,
      location: 'BUBT Permanent Campus, Mirpur-2, Dhaka',
      work_mode: 'onsite',
      description: cleanDesc.length >= 10 ? cleanDesc : `${title} - Official recruitment circular from BUBT administration.`,
      requirements: department ? `Target Department: ${department}` : null,
      stipend: jobType === 'on_campus' ? 'As per BUBT TA Policy' : 'As per University Pay Scale',
      deadline,
      apply_method: fileUrl ? 'file' : 'email',
      apply_value: fileUrl ? null : 'cgc@bubt.edu.bd',
      apply_file_url: fileUrl,
      apply_file_name: fileName,
      posted_by: systemAdminId,
      posted_by_name: 'BUBT Career & HR Office',
      department_code: deptCode || 'ALL',
      compensation_type: 'paid',
    });
  }

  // Pre-fetch existing BUBT crawled jobs by code
  const candidateCodes = jobItems.map(j => j.code);
  const { data: existingJobs } = await supabase
    .from('jobs')
    .select('code')
    .in('code', candidateCodes);

  const existingCodesSet = new Set<string>((existingJobs || []).map((j: any) => j.code));
  const newJobs = jobItems.filter(j => !existingCodesSet.has(j.code));

  if (newJobs.length === 0) {
    return {
      feature: 'jobs',
      scanned: jobCandidates.length,
      added: 0,
      updated: 0,
      unchanged: jobCandidates.length,
    };
  }

  const { error: insertErr } = await supabase.from('jobs').insert(newJobs);
  if (insertErr) {
    throw new Error(`Failed to insert crawled jobs: ${insertErr.message}`);
  }

  return {
    feature: 'jobs',
    scanned: jobCandidates.length,
    added: newJobs.length,
    updated: 0,
    unchanged: jobCandidates.length - newJobs.length,
    details: { insertedCodes: newJobs.map(j => j.code) },
  };
}

