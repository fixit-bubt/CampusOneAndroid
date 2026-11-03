export function getTradeLabel(category?: string | null): string {
  if (!category) return 'Specialists';
  switch (category) {
    case 'Electrical': return 'Electricians';
    case 'Plumbing': return 'Plumbers';
    case 'Cleanliness': return 'Cleaners';
    case 'IT / Network': return 'IT Techs';
    case 'Furniture': return 'Carpenters';
    case 'Safety / Security': return 'Security';
    default: return `${category} Specialists`;
  }
}

export function isTradeMatch(
  staffExpertise: string | null | undefined,
  reportCategory: string | null | undefined
): boolean {
  if (!staffExpertise || !reportCategory) return false;
  const exp = staffExpertise.trim().toLowerCase();
  const cat = reportCategory.trim().toLowerCase();
  if (exp === cat) return true;
  if (cat.includes('electr') && exp.includes('electr')) return true;
  if (cat.includes('plumb') && (exp.includes('plumb') || exp.includes('pipe') || exp.includes('sanit'))) return true;
  if (cat.includes('clean') && (exp.includes('clean') || exp.includes('janit') || exp.includes('hygiene'))) return true;
  if (
    (cat.includes('it') || cat.includes('netw')) &&
    (exp.includes('it') || exp.includes('netw') || exp.includes('tech') || exp.includes('hardware'))
  ) return true;
  if (cat.includes('furn') && (exp.includes('furn') || exp.includes('carp') || exp.includes('wood'))) return true;
  if (
    (cat.includes('safe') || cat.includes('secu')) &&
    (exp.includes('safe') || exp.includes('secu') || exp.includes('guard'))
  ) return true;
  return false;
}
