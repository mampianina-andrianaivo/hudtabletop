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

export function renderMpDisplay(spell: any): string {
  if (!spell) return '●';
  const val = String(spell.r2 ?? spell.r1 ?? '').trim();
  if (!val || val === '●') return '●';
  return val;
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

export function getStatInit(statName: string): string {
  if (!statName || statName === '●') return '●';
  const upper = statName.toUpperCase().trim();
  if (upper.startsWith('INT')) return 'INT';
  if (upper.startsWith('STR')) return 'STR';
  if (upper.startsWith('SPE') || upper.startsWith('SPD')) return 'SPD';
  if (upper.startsWith('ACC')) return 'ACC';
  if (upper.startsWith('PAT') || upper.startsWith('SOC')) return 'PAT';
  if (upper.startsWith('LUC') || upper.startsWith('LCK') || upper.startsWith('LUK')) return 'LUK';
  return upper.substring(0, 3);
}

export function evaluateSpellDice(spell: any, playerStats?: { name: string; current: number }[]): {
  statName: string;
  statInit: string;
  sign: '+' | '-';
  val: number;
  effectiveD: number | '●';
} {
  if (!spell) {
    return { statName: '●', statInit: '●', sign: '+', val: 0, effectiveD: '●' };
  }

  let statName = spell.diceStat;
  let sign: '+' | '-' = spell.diceSign || '+';
  let val = typeof spell.diceVal === 'number' ? spell.diceVal : 0;

  if (!statName) {
    const diceStr = (spell.dice || '').trim();
    if (diceStr === '●') {
      statName = '●';
    } else if (diceStr.includes('+') || diceStr.includes('-')) {
      sign = diceStr.includes('-') ? '-' : '+';
      const parts = diceStr.split(/[+-]/);
      const namePart = parts[0].trim();
      const numPart = parseInt(parts[1]?.trim() || '0', 10);
      statName = namePart || 'INTELLIGENCE';
      val = isNaN(numPart) ? 0 : numPart;
    } else {
      const parsedNum = parseInt(diceStr, 10);
      if (!isNaN(parsedNum)) {
        statName = 'INTELLIGENCE';
        val = parsedNum;
        sign = '+';
      } else {
        statName = '●';
      }
    }
  }

  if (statName === '●') {
    return { statName: '●', statInit: '●', sign: '+', val: 0, effectiveD: '●' };
  }

  const targetStatUpper = (statName || '').toUpperCase() === 'SOCIAL' ? 'PATIENCE' : (statName || '').toUpperCase();
  const statObj = Array.isArray(playerStats) ? playerStats.find(s => {
    if (!s || !s.name) return false;
    const sUpper = String(s.name).toUpperCase();
    return sUpper === targetStatUpper || sUpper.startsWith(targetStatUpper.substring(0, 3));
  }) : undefined;

  const baseVal = statObj ? (Number(statObj.current) || 0) : 0;
  const rawD = sign === '-' ? baseVal - val : baseVal + val;
  const effectiveD = Math.min(12, Math.max(0, rawD));

  return {
    statName,
    statInit: getStatInit(statName),
    sign,
    val,
    effectiveD
  };
}

