import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Theme, ScopeFilter } from '@/types';

interface UIContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  scope: ScopeFilter;
  setScope: (s: ScopeFilter) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('lawcaseflow-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Scope dropdown was removed from the topbar — always start unfiltered.
  const [scope, setScopeState] = useState<ScopeFilter>({ kind: 'all', value: '' });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('lawcaseflow-theme', theme);
  }, [theme]);

  const setScope = useCallback((s: ScopeFilter) => {
    setScopeState(s);
  }, []);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  return (
    <UIContext.Provider value={{ theme, setTheme, toggleTheme, sidebarOpen, setSidebarOpen, toggleSidebar, scope, setScope }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
