import type { Case, ScopeFilter } from '@/types';

/** Apply the global dashboard scope (advocate / court type / court) to a list of cases */
export function applyScope(cases: Case[], scope: ScopeFilter): Case[] {
  if (scope.kind === 'all' || !scope.value) return cases;
  if (scope.kind === 'advocate') return cases.filter((c) => c.advocateIds.includes(scope.value));
  if (scope.kind === 'courtType') return cases.filter((c) => c.courtType === scope.value);
  return cases.filter((c) => c.courtName === scope.value);
}

/** Set of case ids visible under the current scope */
export function scopedCaseIdSet(cases: Case[], scope: ScopeFilter): Set<string> {
  return new Set(applyScope(cases, scope).map((c) => c.id));
}
