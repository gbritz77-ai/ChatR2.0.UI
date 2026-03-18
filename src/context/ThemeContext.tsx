import React, { createContext, useContext, useLayoutEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeTokens {
  bgMain: string;
  bgSidebar: string;
  bgCard: string;
  bgInput: string;
  bgOverlay: string;
  border: string;
  border2: string;
  textMain: string;
  textMuted: string;
  textOnAccent: string;
  accent: string;
  accentBorder: string;
  accentSoft: string;
  accentDisabled: string;
  danger: string;
}

const darkTokens: ThemeTokens = {
  bgMain: '#0f172a',
  bgSidebar: '#020617',
  bgCard: '#1e293b',
  bgInput: '#1e293b',
  bgOverlay: 'rgba(0,0,0,0.7)',
  border: '#1e293b',
  border2: '#334155',
  textMain: '#e5e7eb',
  textMuted: '#9ca3af',
  textOnAccent: '#020617',
  accent: '#38bdf8',
  accentBorder: '#0369a1',
  accentSoft: 'rgba(56, 189, 248, 0.12)',
  accentDisabled: '#164e63',
  danger: '#ef4444',
};

const lightTokens: ThemeTokens = {
  bgMain: '#ffffff',
  bgSidebar: '#f1f5f9',
  bgCard: '#f8fafc',
  bgInput: '#f1f5f9',
  bgOverlay: 'rgba(0,0,0,0.5)',
  border: '#cbd5e1',
  border2: '#94a3b8',
  textMain: '#1e293b',
  textMuted: '#64748b',
  textOnAccent: '#ffffff',
  accent: '#0369a1',
  accentBorder: '#0284c7',
  accentSoft: 'rgba(3, 105, 161, 0.1)',
  accentDisabled: '#bae6fd',
  danger: '#dc2626',
};

interface ThemeContextValue {
  theme: Theme;
  tokens: ThemeTokens;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  tokens: darkTokens,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) ?? 'dark';
  });

  // useLayoutEffect runs before paint → no flash of wrong theme
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, tokens: theme === 'dark' ? darkTokens : lightTokens, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
