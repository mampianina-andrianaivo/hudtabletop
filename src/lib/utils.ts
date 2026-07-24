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

// Evaluate MP cost from string. Extract first digit sequence, or return 0 if no digits.
export function parseMpCost(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  const str = String(val).trim();
  const match = str.match(/\d+/);
  if (!match) return 0;
  const parsed = parseInt(match[0], 10);
  return isNaN(parsed) ? 0 : parsed;
}

// Roll D12 with 2.5x boosted probabilities for critical success (dice 1) and perfect roll (dice = targetValue)
export function rollD12(targetValue?: number): number {
  const weights: number[] = [];
  for (let face = 1; face <= 12; face++) {
    let weight = 1;
    // Boost critical success (dice 1) by factor 2.5
    if (face === 1) {
      weight *= 2.5;
    }
    // Boost perfect roll (dice matching targetValue) by factor 2.5
    if (targetValue !== undefined && targetValue !== null && targetValue >= 1 && targetValue <= 12 && face === targetValue) {
      weight *= 2.5;
    }
    weights.push(weight);
  }

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let randomVal = Math.random() * totalWeight;

  for (let i = 0; i < 12; i++) {
    if (randomVal < weights[i]) {
      return i + 1;
    }
    randomVal -= weights[i];
  }

  return 12;
}

