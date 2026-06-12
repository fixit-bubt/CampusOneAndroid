// i18n entry point. Usage in any component:
//   const t = useT();
//   <Text>{t.home.quickActions}</Text>
//   <Text>{t.home.newAlerts(unread)}</Text>
// Language comes from the persisted appStore toggle (EN / বাং).
import { useApp } from '../store/appStore';
import { en, type Dict } from './en';
import { bn } from './bn';

const DICTS: Record<'en' | 'bn', Dict> = { en, bn };

export function useT(): Dict {
  const { lang } = useApp();
  return DICTS[lang];
}

export { en, bn };
export type { Dict };
