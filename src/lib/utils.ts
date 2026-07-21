import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Evaluate string max to number. If it's pure string or 0, return a fallback to avoid division by zero if needed, but the prompt says 0 counts as 0.
export function parseMax(val: string): number {
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
}
