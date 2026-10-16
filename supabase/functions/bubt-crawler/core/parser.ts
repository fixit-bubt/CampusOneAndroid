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

  // 1. Check numeric BUBT department IDs
  if (dId === 27 || t.includes('computer science') || t.includes('cse') || t.includes('data science')) {
    return { department: 'Computer Science & Engineering', deptCode: 'CSE' };
  }
  if (dId === 37 || t.includes('civil engineering')) {
    return { department: 'Civil Engineering', deptCode: 'Civil' };
  }
  if (dId === 29 || t.includes('electrical & electronic') || t.includes('eee')) {
    return { department: 'Electrical & Electronic Engineering', deptCode: 'EEE' };
  }
  if (dId === 38 || t.includes('textile engineering')) {
    return { department: 'Textile Engineering', deptCode: 'Textile' };
  }
  if (dId === 36 || t.includes('law & justice') || t.includes('ll.b') || t.includes('ll.m')) {
    return { department: 'Law & Justice', deptCode: 'Law' };
  }
  if (dId === 30 || t.includes('economic')) {
    return { department: 'Economics', deptCode: 'ECON' };
  }

  // 2. Check numeric BUBT administrative office IDs
  if (oId === 13 || t.includes('exam') || t.includes('controller of examination')) {
    return { department: 'Controller of Examinations', deptCode: 'EXAM' };
  }
  if (oId === 14 || t.includes('registrar')) {
    return { department: 'Office of the Registrar', deptCode: 'REG' };
  }
  if (oId === 16 || t.includes('accounts') || t.includes('tuition fee')) {
    return { department: 'Accounts & Admission', deptCode: 'ALL' };
  }

  // 3. Department text heuristics
  if (t.includes('department of english') || t.includes('b.a. in english')) {
    return { department: 'English', deptCode: 'ENG' };
  }
  if (t.includes('business') || t.includes('bba') || t.includes('mba') || t.includes('accounting') || t.includes('finance') || t.includes('marketing') || t.includes('management')) {
    return { department: 'Faculty of Business', deptCode: 'BBA' };
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
