export function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n|\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseDhakaDate(text: string): string {
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const m = text.match(/([a-zA-Z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (m) {
    const mon = monthMap[m[1].toLowerCase().slice(0, 3)];
    if (mon) {
      const day = m[2].padStart(2, '0');
      return `${m[3]}-${mon}-${day}`;
    }
  }

  // Fallback to Dhaka today
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(now);
}

export function resolveDepartment(
  text: string,
  departmentId?: number | string | null,
  officeId?: number | string | null
): { department: string; deptCode: string } {
  const dId = departmentId != null ? Number(departmentId) : null;
  const oId = officeId != null ? Number(officeId) : null;
  const t = text.toLowerCase();

  // 1. Explicit Department Keyword Matches in Title & Body (Highest Precedence)
  // Law & Justice
  if (/\b(ll\.?b|ll\.?m|law|justice|moot\s*court|legal|manupatra)\b/i.test(t)) {
    return { department: 'Law & Justice', deptCode: 'Law' };
  }
  // Computer Science & Engineering / Data Science
  if (/\b(cse|computer\s*science|data\s*science|dse)\b/i.test(t)) {
    return { department: 'Computer Science & Engineering', deptCode: 'CSE' };
  }
  // Civil Engineering
  if (/\b(civil\s*engineering|civil|ce\s*day|ce\s*evening)\b/i.test(t)) {
    return { department: 'Civil Engineering', deptCode: 'Civil' };
  }
  // Electrical & Electronic Engineering
  if (/\b(eee|electrical\s*&?\s*electronic)\b/i.test(t)) {
    return { department: 'Electrical & Electronic Engineering', deptCode: 'EEE' };
  }
  // Textile Engineering
  if (/\b(textile\s*engineering|textile)\b/i.test(t)) {
    return { department: 'Textile Engineering', deptCode: 'Textile' };
  }
  // Faculty of Business (BBA / MBA / EMBA)
  if (/\b(bba|mba|emba|faculty\s*of\s*business|accounting|finance|marketing|management)\b/i.test(t)) {
    return { department: 'Faculty of Business', deptCode: 'BBA' };
  }
  // Economics
  if (/\b(economics?|b\.?\s*sc\.?\s*in\s*economics|ede)\b/i.test(t)) {
    return { department: 'Economics', deptCode: 'ECON' };
  }
  // English
  if (/\b(english|b\.?\s*a\.?\s*in\s*english)\b/i.test(t)) {
    return { department: 'Department of English', deptCode: 'ENG' };
  }
  // Mathematics & Statistics
  if (/\b(mathematics|statistics)\b/i.test(t)) {
    return { department: 'Department of Mathematics & Statistics', deptCode: 'MATH' };
  }

  // 2. Numeric BUBT Department IDs (Official Ground Truth from BUBT DB)
  if (dId === 27 || dId === 39) {
    return { department: 'Computer Science & Engineering', deptCode: 'CSE' };
  }
  if (dId === 29) {
    return { department: 'Law & Justice', deptCode: 'Law' };
  }
  if (dId === 35) {
    return { department: 'Electrical & Electronic Engineering', deptCode: 'EEE' };
  }
  if (dId === 36) {
    return { department: 'Textile Engineering', deptCode: 'Textile' };
  }
  if (dId === 37) {
    return { department: 'Civil Engineering', deptCode: 'Civil' };
  }
  if (dId === 38 || dId === 26 || dId === 32 || dId === 33 || dId === 34) {
    return { department: 'Faculty of Business', deptCode: 'BBA' };
  }
  if (dId === 30) {
    return { department: 'Department of English', deptCode: 'ENG' };
  }
  if (dId === 31) {
    return { department: 'Economics', deptCode: 'ECON' };
  }
  if (dId === 28) {
    return { department: 'Department of Mathematics & Statistics', deptCode: 'MATH' };
  }

  // 3. Administrative Office IDs & Keywords
  if (oId === 13 || /\b(exam|examination|controller\s*of\s*examinations?|admit\s*card)\b/i.test(t)) {
    return { department: 'Controller of Examinations', deptCode: 'EXAM' };
  }
  if (oId === 14 || /\b(registrar|registration|rescheduling)\b/i.test(t)) {
    return { department: 'Office of the Registrar', deptCode: 'REG' };
  }
  if (oId === 16 || /\b(accounts|tuition|waiver|installment)\b/i.test(t)) {
    return { department: 'Accounts & Admission', deptCode: 'ALL' };
  }
  if (oId === 19 || /\b(proctor|disciplinary|harassment)\b/i.test(t)) {
    return { department: 'Proctor Office', deptCode: 'ALL' };
  }

  return { department: 'University-Wide', deptCode: 'ALL' };
}

export function resolveNoticeCategory(catSlug: string, title: string): { categoryName: string; categorySlug: string } {
  const t = title.toLowerCase();

  if (catSlug === 'exam-related' || /exam|routine|viva voce|viva schedule|mid-term|final examination|admit card/i.test(t)) {
    return { categoryName: 'Exam related', categorySlug: 'exam-related' };
  }
  if (catSlug === 'offday' || /holiday|offday|vacation|closure|puja|eid|independence day|victory day/i.test(t)) {
    return { categoryName: 'Offday', categorySlug: 'offday' };
  }
  if (catSlug === 'semester' || /semester|registration|tuition fee|installment|waiver|admission/i.test(t)) {
    return { categoryName: 'Semester', categorySlug: 'semester' };
  }
  if (catSlug === 'class-related' || /class|laboratory|lab|routine|room allocation|schedule of classes/i.test(t)) {
    return { categoryName: 'Class Related', categorySlug: 'class-related' };
  }
  if (catSlug === 'tender' || /tender|quotation|procurement/i.test(t)) {
    return { categoryName: 'Tender', categorySlug: 'tender' };
  }

  return { categoryName: 'General', categorySlug: 'general' };
}

export function resolveNoticePriority(title: string, catSlug: string): { priority: 'Urgent' | 'Important' | 'General'; pinned: boolean } {
  const t = title.toLowerCase();

  if (catSlug === 'offday' || /holiday|eid|closure|emergency|admit card|urgent|immediate|last date/i.test(t)) {
    return { priority: 'Urgent', pinned: true };
  }
  if (catSlug === 'exam-related' || catSlug === 'semester' || /mid-term|final examination|routine|result|registration/i.test(t)) {
    return { priority: 'Important', pinned: false };
  }

  return { priority: 'General', pinned: false };
}
