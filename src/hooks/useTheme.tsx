import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ThemeChoice = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themeChoice: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'pandora-theme';

function resolveSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveEffective(choice: ThemeChoice): Theme {
  return choice === 'system' ? resolveSystemTheme() : choice;
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeChoice, setThemeChoice] = useState<ThemeChoice>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {}
    return 'dark';
  });

  const [theme, setEffective] = useState<Theme>(() => resolveEffective(themeChoice));

  // Sync documentElement class
  useEffect(() => {
    const effective = resolveEffective(themeChoice);
    setEffective(effective);

    if (effective === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeChoice]);

  // Listen for system preference changes when 'system' is chosen
  useEffect(() => {
    if (themeChoice !== 'system') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const t = e.matches ? 'dark' : 'light';
      setEffective(t);
      if (t === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [themeChoice]);

  // Persist choice
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, themeChoice);
  }, [themeChoice]);

  // Cleanup on unmount (for loja pública safety)
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  const setTheme = useCallback((t: ThemeChoice) => setThemeChoice(t), []);
  const toggleTheme = useCallback(() => {
    setThemeChoice(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark'; // system -> dark
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeChoice, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
