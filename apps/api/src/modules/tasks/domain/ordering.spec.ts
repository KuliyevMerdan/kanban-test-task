import { describe, expect, it } from '@jest/globals';
import { generateKeyBetween, InvalidOrderKeyError } from './ordering';

/** Deterministic PRNG (mulberry32), so a failing randomized run can be reproduced. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VALID_KEY = /^[0-9A-Za-z]*[1-9A-Za-z]$/;

describe('generateKeyBetween', () => {
  it('creates the first key of an empty column', () => {
    expect(generateKeyBetween(null, null)).toMatch(VALID_KEY);
  });

  it.each([
    ['V', 'W'],
    ['V', 'V1'],
    ['A', 'B'],
    ['1', '2'],
    ['a', 'a01'],
    ['zz', 'zzV'],
    ['0V', '1'],
    ['V05', 'V1'],
  ])('generates a key strictly between "%s" and "%s"', (before, after) => {
    const key = generateKeyBetween(before, after);

    expect(key > before).toBe(true);
    expect(key < after).toBe(true);
    expect(key).toMatch(VALID_KEY);
  });

  it.each(['1', 'V', 'z', 'zzz', '0V'])('places a key after "%s" (end of column)', (before) => {
    const key = generateKeyBetween(before, null);
    expect(key > before).toBe(true);
    expect(key).toMatch(VALID_KEY);
  });

  it.each(['1', 'V', 'z', '01', '0V'])('places a key before "%s" (top of column)', (after) => {
    const key = generateKeyBetween(null, after);
    expect(key < after).toBe(true);
    expect(key).toMatch(VALID_KEY);
  });

  it('keeps keys short when tasks are always appended or prepended', () => {
    // Regression: halving towards the edge made keys grow by a char per ~6 inserts
    // (200 chars after 1000 appends).
    let last: string | null = null;
    let first: string | null = null;
    for (let i = 0; i < 1000; i++) {
      const appended: string = generateKeyBetween(last, null);
      expect(last === null || appended > last).toBe(true);
      last = appended;

      const prepended: string = generateKeyBetween(null, first);
      expect(first === null || prepended < first).toBe(true);
      first = prepended;
    }
    expect(last!.length).toBeLessThanOrEqual(40);
    expect(first!.length).toBeLessThanOrEqual(40);
  });

  it('keeps the list sorted and keys unique under random inserts', () => {
    const random = seededRandom(42);
    const keys: string[] = [];

    for (let i = 0; i < 3000; i++) {
      const roll = random();
      // Mix of the real-world cases: append, move to top, drop between two tasks.
      const index =
        roll < 0.3 ? keys.length : roll < 0.4 ? 0 : Math.floor(random() * (keys.length + 1));
      const key = generateKeyBetween(keys[index - 1] ?? null, keys[index] ?? null);
      keys.splice(index, 0, key);
    }

    expect(keys).toEqual([...keys].sort());
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((key) => VALID_KEY.test(key))).toBe(true);
  });

  it('sorts the same way as Postgres with COLLATE "C" (plain code-unit order)', () => {
    // Uppercase before lowercase, digits first: a locale-aware sort would break this.
    const keys = ['a', 'Z', 'V', '1', 'z', 'A'].map((key) => generateKeyBetween(key, null));
    const byCodeUnit = [...keys].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
    expect([...keys].sort()).toEqual(byCodeUnit);
  });

  describe('rejects invalid input', () => {
    it.each([
      ['equal keys', 'V', 'V'],
      ['reversed keys', 'W', 'V'],
    ])('%s', (_, before, after) => {
      expect(() => generateKeyBetween(before, after)).toThrow(InvalidOrderKeyError);
    });

    it.each(['', 'V0', 'ab-c', 'ключ'])('malformed key "%s"', (key) => {
      expect(() => generateKeyBetween(key, null)).toThrow(InvalidOrderKeyError);
      expect(() => generateKeyBetween(null, key)).toThrow(InvalidOrderKeyError);
    });
  });
});
