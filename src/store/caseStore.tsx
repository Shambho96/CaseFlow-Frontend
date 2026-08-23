import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import type { Case, FilterState, CaseLabel, CustomField } from '@/types';
import { cases as mockCases } from '@/mocks';
import { useUI } from './uiStore';
import { isToday, isTomorrow } from '@/lib/utils';

// v2: bumped so previously cached (pre-fix) case data refreshes with corrected dates
const LS_CASES = 'lawcaseflow-cases-v2';
const LS_LABELS = 'lawcaseflow-labels';
const LS_FIELDS = 'lawcaseflow-fields';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

export const DEFAULT_LABELS: CaseLabel[] = [
  { id: 'lbl-urgent', name: 'Urgent', color: 'chart-3' },
  { id: 'lbl-important', name: 'Important', color: 'primary' },
  { id: 'lbl-settlement', name: 'Settlement Track', color: 'chart-1' },
  { id: 'lbl-trail', name: 'Trail Watch', color: 'chart-4' },
];

const DEFAULT_FIELDS: CustomField[] = [];

interface CaseContextValue {
  cases: Case[];
  addCase: (c: Case) => void;
  addCases: (c: Case[]) => void;
  updateCase: (id: string, updates: Partial<Case>) => void;
  bulkUpdateStatus: (ids: string[], status: Case['status']) => void;
  archiveCases: (ids: string[]) => void;
  deleteCase: (id: string) => void;
  getCase: (id: string) => Case | undefined;
  filters: FilterState;
  setFilters: (f: Partial<FilterState>) => void;
  clearFilters: () => void;
  filteredCases: Case[];
  scopedCases: Case[];
  labels: CaseLabel[];
  addLabel: (l: CaseLabel) => void
  updateLabel: (id: string, updates: Partial<CaseLabel>) => void;
  removeLabel: (id: string) => void;
  customFields: CustomField[];
  addCustomField: (f: CustomField) => void;
  removeCustomField: (id: string) => void;
}

const CaseContext = createContext<CaseContextValue | undefined>(undefined);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const { scope } = useUI();
  const [cases, setCases] = useState<Case[]>(() => load(LS_CASES, mockCases));
  const [labels, setLabels] = useState<CaseLabel[]>(() => load(LS_LABELS, DEFAULT_LABELS));
  const [customFields, setCustomFields] = useState<CustomField[]>(() => load(LS_FIELDS, DEFAULT_FIELDS));
  const [filters, setFiltersState] = useState<FilterState>({});

  useEffect(() => {
    localStorage.setItem(LS_CASES, JSON.stringify(cases));
  }, [cases]);
  useEffect(() => {
    localStorage.setItem(LS_LABELS, JSON.stringify(labels));
  }, [labels]);
  useEffect(() => {
    localStorage.setItem(LS_FIELDS, JSON.stringify(customFields));
  }, [customFields]);

  const addCase = useCallback((c: Case) => {
    setCases((prev) => [...prev, c]);
  }, []);

  const addCases = useCallback((list: Case[]) => {
    setCases((prev) => [...prev, ...list]);
  }, []);

  const updateCase = useCallback((id: string, updates: Partial<Case>) => {
    setCases((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const bulkUpdateStatus = useCallback((ids: string[], status: Case['status']) => {
    setCases((prev) =>
      prev.map((c) => {
        if (!ids.includes(c.id)) return c;
        if (status === 'Decided' && !c.decidedDate) {
          return { ...c, status, decidedDate: new Date().toISOString().split('T')[0] };
        }
        if (status === 'Abandoned') {
          return { ...c, status, abandonedDate: c.abandonedDate ?? new Date().toISOString().split('T')[0] };
        }
        return { ...c, status };
      })
    );
  }, []);

  /** Archive = move to Abandoned lifecycle without deleting data */
  const archiveCases = useCallback((ids: string[]) => {
    setCases((prev) =>
      prev.map((c) =>
        ids.includes(c.id)
          ? { ...c, status: 'Abandoned', abandonedDate: c.abandonedDate ?? new Date().toISOString().split('T')[0] }
          : c
      )
    );
  }, []);

  const deleteCase = useCallback((id: string) => {
    setCases((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const getCase = useCallback((id: string) => cases.find((c) => c.id === id), [cases]);

  const setFilters = useCallback((f: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
  }, []);

  const clearFilters = useCallback(() => setFiltersState({}), []);

  const scopedCases = useMemo(() => {
    if (scope.kind === 'all' || !scope.value) return cases;
    if (scope.kind === 'advocate') return cases.filter((c) => c.advocateIds.includes(scope.value));
    if (scope.kind === 'courtType') return cases.filter((c) => c.courtType === scope.value);
    return cases.filter((c) => c.courtName === scope.value);
  }, [cases, scope]);

  const filteredCases = useMemo(
    () =>
      scopedCases.filter((c) => {
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
        if (filters.dateScope === 'today' && !isToday(c.nextDate)) return false;
        if (filters.dateScope === 'tomorrow' && !isTomorrow(c.nextDate)) return false;
        return true;
      }),
    [scopedCases, filters]
  );

  const addLabel = useCallback((l: CaseLabel) => {
    setLabels((prev) => [...prev, l]);
  }, []);

  const updateLabel = useCallback((id: string, updates: Partial<CaseLabel>) => {
    setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }, []);

  const removeLabel = useCallback((id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    setCases((prev) =>
      prev.map((c) => ({ ...c, labelIds: (c.labelIds ?? []).filter((lid) => lid !== id) }))
    );
  }, []);

  const addCustomField = useCallback((f: CustomField) => {
    setCustomFields((prev) => [...prev, f]);
  }, []);

  const removeCustomField = useCallback((id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
    setCases((prev) =>
      prev.map((c) => {
        if (!c.customFieldValues || !(id in c.customFieldValues)) return c;
        const next = { ...c.customFieldValues };
        delete next[id];
        return { ...c, customFieldValues: next };
      })
    );
  }, []);

  return (
    <CaseContext.Provider
      value={{
        cases, addCase, addCases, updateCase, bulkUpdateStatus, archiveCases, deleteCase, getCase,
        filters, setFilters, clearFilters, filteredCases, scopedCases,
        labels, addLabel, updateLabel, removeLabel,
        customFields, addCustomField, removeCustomField,
      }}
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
