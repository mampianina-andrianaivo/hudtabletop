export function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export function isSameMonth(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth();
}

export function getStartOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay() || 7; // Get current day number, converting Sun. to 7
  if (day !== 1) {
    date.setDate(date.getDate() - (day - 1));
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameWeek(d1: Date, d2: Date): boolean {
  const w1 = getStartOfWeek(d1);
  const w2 = getStartOfWeek(d2);
  return w1.getTime() === w2.getTime();
}
