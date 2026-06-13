// App-wide UI preferences (theme + language), persisted on-device so they
// survive restarts. Defaults: device color scheme, English.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export type Lang = 'en' | 'bn';

const KEY_THEME = 'app.isDark';
const KEY_LANG = 'app.lang';

// Load AsyncStorage defensively: if the native module isn't present (e.g. a
// dev client built before it was added), fall back to a no-op so the app still
// opens — persistence is simply disabled until the binary is rebuilt.
let storage: {
  multiGet: (keys: string[]) => Promise<[string, string | null][]>;
  setItem: (key: string, value: string) => Promise<void>;
} = {
  multiGet: async () => [],
  setItem: async () => {},
};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-async-storage/async-storage').default;
  if (mod && typeof mod.multiGet === 'function') storage = mod;
} catch {
  // keep the no-op fallback
}

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
        const [storedTheme, storedLang] = await storage.multiGet([KEY_THEME, KEY_LANG]);
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
      storage.setItem(KEY_THEME, String(next)).catch(() => {});
      return next;
    });
  }

  function toggleLang() {
    setLang(l => {
      const next: Lang = l === 'en' ? 'bn' : 'en';
      storage.setItem(KEY_LANG, next).catch(() => {});
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
