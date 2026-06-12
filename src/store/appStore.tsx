// App-wide UI preferences (theme + language), persisted on-device so they
// survive restarts. Defaults: device color scheme, English.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'bn';

const KEY_THEME = 'app.isDark';
const KEY_LANG = 'app.lang';

interface AppContextValue {
  isDark: boolean;
  toggleTheme: () => void;
  lang: Lang;
  toggleLang: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [isDark, setIsDark] = useState(scheme === 'dark');
  const [lang, setLang] = useState<Lang>('en');

  // Restore saved preferences once on mount; ignore storage failures silently
  // (worst case the defaults above stay in effect).
  useEffect(() => {
    (async () => {
      try {
        const [storedTheme, storedLang] = await AsyncStorage.multiGet([KEY_THEME, KEY_LANG]);
        if (storedTheme[1] !== null) setIsDark(storedTheme[1] === 'true');
        if (storedLang[1] === 'en' || storedLang[1] === 'bn') setLang(storedLang[1]);
      } catch {
        // keep defaults
      }
    })();
  }, []);

  function toggleTheme() {
    setIsDark(d => {
      const next = !d;
      AsyncStorage.setItem(KEY_THEME, String(next)).catch(() => {});
      return next;
    });
  }

  function toggleLang() {
    setLang(l => {
      const next: Lang = l === 'en' ? 'bn' : 'en';
      AsyncStorage.setItem(KEY_LANG, next).catch(() => {});
      return next;
    });
  }

  return (
    <AppContext.Provider value={{ isDark, toggleTheme, lang, toggleLang }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
