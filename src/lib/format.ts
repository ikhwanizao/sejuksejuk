const myrFormatter = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

/** Format a numeric string or number as Malaysian Ringgit: RM 1,234.50 */
export function formatMyr(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "RM 0.00";
  return myrFormatter.format(num);
}

/** Format an ISO date string as a short date: 23 May 2026 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format an ISO date string as YYYY-MM-DD for use in <input type="date"> */
export function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}
