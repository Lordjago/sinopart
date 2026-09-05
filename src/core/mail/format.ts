/**
 * Formatting helpers shared by the email templates.
 *
 * Dates in customer email are always written in Lagos time, because that is
 * where the reader is and the whole point of a timestamp in a security notice
 * is that they can check it against their own memory. `toLocaleString()`
 * without an explicit zone would follow the *server's* locale instead, which
 * on a cloud host is whatever the region happens to be.
 */

const WAT = new Intl.DateTimeFormat('en-NG', {
  timeZone: 'Africa/Lagos',
  dateStyle: 'long',
  timeStyle: 'short',
});

/** e.g. "4 September 2026 at 18:59 WAT". */
export function formatWat(date: Date): string {
  return `${WAT.format(date)} WAT`;
}

const NGN = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

/** e.g. "₦155,000". Inspection fees and refunds are always whole naira. */
export function formatNaira(amount: number): string {
  return NGN.format(amount);
}

/**
 * A hold deadline. Same shape as formatWat, named separately because a
 * reservation cut-off is read as "how long have I got" rather than "when did
 * this happen" — if the two ever need to diverge, they diverge here.
 */
export const formatDeadline = formatWat;
