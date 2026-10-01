/**
 * Minimal RFC 4180 CSV writer - no dependency pulled in just to join some fields with commas.
 * Quotes a field whenever it contains a comma, quote, or newline; doubles embedded quotes.
 */
function escapeField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: Record<string, unknown>[], columns: { key: string; header: string }[]): string {
  const headerLine = columns.map((c) => escapeField(c.header)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeField(row[c.key])).join(','));
  return [headerLine, ...lines].join('\r\n') + '\r\n';
}
