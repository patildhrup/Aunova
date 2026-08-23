import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

export function formatPct(val: number | undefined): string {
  if (val === undefined || val === null) return '—';
  return `${val.toFixed(1)}%`;
}

export function confidenceColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
}

export function confidenceBadge(score: number): string {
  if (score >= 80) return 'badge-high';
  if (score >= 60) return 'badge-medium';
  return 'badge-low';
}

export function confidenceLabel(score: number): string {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  return 'Low';
}
