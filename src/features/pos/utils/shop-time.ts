/**
 * The shop's day, not the server's.
 *
 * The server runs in UTC, and Sri Lanka is UTC+5:30, so "today's takings"
 * asked for at 9am in Nawalapitiya covers a window that started at 6:30pm
 * UTC the previous day. Every counter report resolves its range here rather
 * than trusting the server's local midnight.
 *
 * A fixed offset is correct for Asia/Colombo: it has observed no daylight
 * saving since 1996.
 */

export const SHOP_UTC_OFFSET_MINUTES = 5 * 60 + 30;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** `YYYY-MM-DD` for the shop's calendar day containing `instant`. */
export function shopDateKey(instant: Date = new Date()): string {
  const shifted = new Date(
    instant.getTime() + SHOP_UTC_OFFSET_MINUTES * MINUTE_MS,
  );
  return shifted.toISOString().slice(0, 10);
}

/** The UTC instant at which the shop's `YYYY-MM-DD` began. */
export function shopDayStart(dateKey: string): Date {
  const midnightUtc = new Date(`${dateKey}T00:00:00.000Z`).getTime();
  return new Date(midnightUtc - SHOP_UTC_OFFSET_MINUTES * MINUTE_MS);
}

/** Half-open range `[start, end)` covering one shop day. */
export function shopDayRange(dateKey: string) {
  const start = shopDayStart(dateKey);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Half-open range covering `startKey`..`endKey` inclusive of both days. */
export function shopRange(startKey: string, endKey: string) {
  const { start } = shopDayRange(startKey);
  const { end } = shopDayRange(endKey);
  return { start, end };
}

/** The shop day `days` days before today, as `YYYY-MM-DD`. */
export function shopDateKeyDaysAgo(days: number, from: Date = new Date()): string {
  return shopDateKey(new Date(from.getTime() - days * DAY_MS));
}

/** Every shop day key from `startKey` to `endKey`, in order. */
export function shopDayKeysBetween(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let cursor = shopDayStart(startKey).getTime();
  const last = shopDayStart(endKey).getTime();
  // A runaway range would otherwise build an unbounded array.
  for (let guard = 0; cursor <= last && guard < 400; guard += 1) {
    keys.push(shopDateKey(new Date(cursor)));
    cursor += DAY_MS;
  }
  return keys;
}
