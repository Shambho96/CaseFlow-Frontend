import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format currency in Indian Rupees */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a date string to DD MMM YYYY */
export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const dt = new Date(dateStr);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format a date string to YYYY-MM-DD (for inputs) */
export function toInputDate(dateStr: string | undefined): string {
  return dateStr?.split('T')[0] ?? '';
}

/** Check if a date string is today */
export function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

/** Check if a date string is tomorrow */
export function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dateStr === tomorrow.toISOString().split('T')[0];
}

/** Get relative label for a date */
export function getDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return 'Today';
  if (isTomorrow(dateStr)) return 'Tomorrow';
  return formatDate(dateStr);
}

/** Format bytes to human-readable size */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Simple fuzzy match — returns true if needle chars appear in order in haystack */
export function fuzzyMatch(needle: string, haystack: string): boolean {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  let j = 0;
  for (let i = 0; i < h.length && j < n.length; i++) {
    if (h[i] === n[j]) j++;
  }
  return j === n.length;
}

/** Get initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}
