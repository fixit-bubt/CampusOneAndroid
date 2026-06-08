import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

export type Lang = 'en' | 'bn';

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

  function toggleTheme() { setIsDark(d => !d); }
  function toggleLang()  { setLang(l => l === 'en' ? 'bn' : 'en'); }

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
