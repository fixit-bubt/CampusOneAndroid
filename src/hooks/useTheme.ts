import { useApp } from '../store/appStore';
import { LightColors, DarkColors } from '../theme';
import type { Colors } from '../theme';

export function useTheme(): { C: Colors; isDark: boolean } {
  const { isDark } = useApp();
  return { C: isDark ? DarkColors : LightColors, isDark };
}
