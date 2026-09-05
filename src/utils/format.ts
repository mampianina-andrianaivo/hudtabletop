/**
 * Helper functions for formatting numbers, prices, and amounts with thousand separators.
 */

export function formatIntWithThousands(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '0';
  const str = val.toString().trim();
  if (!str) return '0';
  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str;
  // Strip leading zeros if more than 1 digit, e.g. "0500" -> "500", but keep "0"
  const normalizedStr = cleanStr.length > 1 ? cleanStr.replace(/^0+/, '') || '0' : cleanStr;
  const formatted = normalizedStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return isNegative ? `-${formatted}` : formatted;
}

export function splitPrice(
  prixInt: string | number | undefined | null,
  prixDec?: string | null,
  decimalMode?: '0' | '2'
): { intPart: string; decPart?: string } {
  const intPart = formatIntWithThousands(prixInt || '0');
  if (decimalMode === '2') {
    const dec = (prixDec || '00').padEnd(2, '0').slice(0, 2);
    return { intPart, decPart: dec };
  }
  return { intPart };
}

export function splitAmountString(
  amountStr: string | undefined | null,
  decimalMode?: '0' | '2'
): { intPart: string; decPart?: string } {
  if (!amountStr) return { intPart: '0', decPart: decimalMode === '2' ? '00' : undefined };
  const str = amountStr.trim().replace(/\s/g, '');
  if (!str) return { intPart: '0', decPart: decimalMode === '2' ? '00' : undefined };

  if (str.includes(',') || str.includes('.')) {
    const parts = str.split(/[,.]/);
    const intPart = formatIntWithThousands(parts[0]);
    if (decimalMode === '0') {
      return { intPart };
    }
    const decPart = (parts[1] || '00').padEnd(2, '0').slice(0, 2);
    return { intPart, decPart };
  }

  const intPart = formatIntWithThousands(str);
  if (decimalMode === '2') {
    return { intPart, decPart: '00' };
  }
  return { intPart };
}

export function formatPrice(
  prixInt: string | number | undefined | null,
  prixDec?: string | null,
  decimalMode?: '0' | '2'
): string {
  const formattedInt = formatIntWithThousands(prixInt || '0');
  if (decimalMode === '2') {
    const dec = (prixDec || '00').padEnd(2, '0').slice(0, 2);
    return `${formattedInt},${dec}`;
  }
  return formattedInt;
}

export function formatAmountString(
  amountStr: string | undefined | null,
  decimalMode?: '0' | '2'
): string {
  if (!amountStr) return '0';
  const str = amountStr.trim().replace(/\s/g, '');
  if (!str) return '0';

  if (str.includes(',') || str.includes('.')) {
    const parts = str.split(/[,.]/);
    const intPart = formatIntWithThousands(parts[0]);
    if (decimalMode === '0') {
      return intPart;
    }
    const decPart = (parts[1] || '00').padEnd(2, '0').slice(0, 2);
    return `${intPart},${decPart}`;
  }

  const intPart = formatIntWithThousands(str);
  if (decimalMode === '2') {
    return `${intPart},00`;
  }
  return intPart;
}

export function formatNumberAmount(
  amount: number | string | undefined | null,
  decimalMode?: '0' | '2'
): string {
  if (amount === undefined || amount === null) return '0';
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString().replace(',', '.'));
  if (isNaN(num)) return '0';

  if (decimalMode === '2') {
    const fixed = num.toFixed(2);
    const [intP, decP] = fixed.split('.');
    return `${formatIntWithThousands(intP)},${decP}`;
  } else {
    const rounded = Math.round(num);
    return formatIntWithThousands(rounded);
  }
}
