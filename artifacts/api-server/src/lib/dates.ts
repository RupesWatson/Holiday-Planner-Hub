const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

export function validateDateRange(
  startDate: string,
  endDate: string,
): string | null {
  if (!isValidISODate(startDate)) return "startDate must be a valid YYYY-MM-DD date";
  if (!isValidISODate(endDate)) return "endDate must be a valid YYYY-MM-DD date";
  if (startDate > endDate) return "startDate must be on or before endDate";
  return null;
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const start = parseISO(from);
  const end = parseISO(to);
  for (let cur = start; cur <= end; cur.setDate(cur.getDate() + 1)) {
    out.push(toISO(cur));
  }
  return out;
}

export function overlapsRange(
  startDate: string,
  endDate: string,
  from: string,
  to: string,
): boolean {
  return startDate <= to && endDate >= from;
}
