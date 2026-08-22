import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Case, FilterState } from '@/types';
import { cases as mockCases } from '@/mocks';

interface CaseContextValue {
  cases: Case[];
  addCase: (c: Case) => void;
  updateCase: (id: string, updates: Partial<Case>) => void;
  deleteCase: (id: string) => void;
  getCase: (id: string) => Case | undefined;
  filters: FilterState;
  setFilters: (f: Partial<FilterState>) => void;
  clearFilters: () => void;
  filteredCases: Case[];
}

const CaseContext = createContext<CaseContextValue | undefined>(undefined);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<Case[]>(mockCases);
  const [filters, setFiltersState] = useState<FilterState>({});

  const addCase = useCallback((c: Case) => {
    setCases((prev) => [...prev, c]);
  }, []);

  const updateCase = useCallback((id: string, updates: Partial<Case>) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCase = useCallback((id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getCase = useCallback((id: string) => cases.find((c) => c.id === id), [cases]);

  const setFilters = useCallback((f: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
  }, []);

  const clearFilters = useCallback(() => setFiltersState({}), []);

  const filteredCases = cases.filter((c) => {
    if (filters.status && c.status !== filters.status) return false;
    if (filters.category && c.category !== filters.category) return false;
    if (filters.courtType && c.courtType !== filters.courtType) return false;
    if (filters.courtName && !c.courtName.toLowerCase().includes(filters.courtName.toLowerCase())) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        c.caseNo.toLowerCase().includes(q) ||
        c.firstParty.toLowerCase().includes(q) ||
        c.oppositeParty.toLowerCase().includes(q) ||
        c.courtName.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters.onlyDecided && c.status !== 'Decided') return false;
    if (filters.onlyAwaited && c.status !== 'Awaited') return false;
    if (!filters.includeDecided && c.status === 'Decided' && !filters.onlyDecided) {
      // show decided by default — only filter if explicitly requested
    }
    return true;
  });

  return (
    <CaseContext.Provider
      value={{ cases, addCase, updateCase, deleteCase, getCase, filters, setFilters, clearFilters, filteredCases }}
    >
      {children}
    </CaseContext.Provider>
  );
}

export function useCases() {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error('useCases must be used within CaseProvider');
  return ctx;
}
