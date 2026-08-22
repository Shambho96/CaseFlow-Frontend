import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Theme } from '@/types';

interface UIContextValue {
  theme: Theme;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('lawcaseflow-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('lawcaseflow-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  return (
    <UIContext.Provider value={{ theme, toggleTheme, sidebarOpen, setSidebarOpen, toggleSidebar }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
