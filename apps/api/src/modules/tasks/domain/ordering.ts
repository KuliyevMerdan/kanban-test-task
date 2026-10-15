/**
 * Fractional indexing: each task stores a string key and a column is sorted by plain
 * string comparison of the keys. To put a task between two neighbours we generate a key
 * that sorts strictly between theirs, so a move updates exactly one row.
 *
 * Keys are base-62 "fractions" with the digits in ASCII order, e.g. "V" ≈ 0.5.
 * Algorithm: https://observablehq.com/@dgreensp/implementing-fractional-indexing
 * (the `fractional-indexing` npm package uses the same idea but ships as ESM only).
 */
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ZERO = '0';

export class InvalidOrderKeyError extends Error {}

/**
 * Returns a key `k` such that `before < k < after`.
 * `null` means "no neighbour on that side" (start / end of the column).
 */
export function generateKeyBetween(before: string | null, after: string | null): string {
  if (before !== null) assertValidKey(before);
  if (after !== null) assertValidKey(after);
  if (before !== null && after !== null && before >= after) {
    throw new InvalidOrderKeyError(`Expected "${before}" < "${after}"`);
  }
  // Appending / prepending is the common case (every new task goes to the end), so the
  // edges use the smallest step instead of halving: keys grow by one char per ~30
  // appends instead of per ~6.
  if (before !== null && after === null) return keyAfter(before);
  if (before === null && after !== null) return keyBefore(after);
  return midpoint(before ?? '', after);
}

function keyAfter(key: string): string {
  const head = DIGITS.indexOf(key[0]!);
  if (head < DIGITS.length - 1) return DIGITS[head + 1]!;
  // Head is already the max digit: keep it and step one level deeper.
  return key[0]! + (key.length > 1 ? keyAfter(key.slice(1)) : midpoint('', null));
}

function keyBefore(key: string): string {
  const head = DIGITS.indexOf(key[0]!);
  // "0" can't be a key on its own (trailing zero), so the smallest single digit is "1".
  if (head > 1) return DIGITS[head - 1]!;
  const rest = head === 0 ? key.slice(1) : '';
  return ZERO + (rest ? keyBefore(rest) : midpoint('', null));
}

function assertValidKey(key: string): void {
  if (key === '' || key.endsWith(ZERO) || [...key].some((char) => !DIGITS.includes(char))) {
    throw new InvalidOrderKeyError(`Invalid order key "${key}"`);
  }
}

/** `a` may be empty (start of range), `b === null` means end of range. */
function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    // Strip the common prefix (`a` is padded with zeros), it stays in the result as is.
    let n = 0;
    while ((a[n] ?? ZERO) === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }

  // The first digits differ (or one of them is missing).
  const digitA = a ? DIGITS.indexOf(a[0]!) : 0;
  const digitB = b !== null ? DIGITS.indexOf(b[0]!) : DIGITS.length;

  if (digitB - digitA > 1) {
    return DIGITS[Math.round((digitA + digitB) / 2)]!;
  }

  // Consecutive first digits: either `b`'s first digit alone fits between,
  // or we keep `a`'s first digit and go one level deeper.
  if (b !== null && b.length > 1) return b.slice(0, 1);
  return DIGITS[digitA] + midpoint(a.slice(1), null);
}
