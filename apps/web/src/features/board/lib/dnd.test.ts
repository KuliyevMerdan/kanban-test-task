import { describe, expect, it } from 'vitest';
import { type ColumnIds, findColumn, moveAcrossColumns, resolveDrop } from './dnd';

const columns: ColumnIds = { NEW: ['a', 'b', 'c'], IN_PROGRESS: ['p'], DONE: [] };

describe('findColumn', () => {
  it('finds the column of a card, or returns the column for a column id', () => {
    expect(findColumn(columns, 'b')).toBe('NEW');
    expect(findColumn(columns, 'DONE')).toBe('DONE');
    expect(findColumn(columns, 'unknown')).toBeNull();
  });
});

describe('moveAcrossColumns (preview while dragging)', () => {
  it('puts the card in front of the hovered card in another column', () => {
    expect(moveAcrossColumns(columns, 'b', 'p')).toEqual({
      NEW: ['a', 'c'],
      IN_PROGRESS: ['b', 'p'],
      DONE: [],
    });
  });

  it('appends the card when hovering an (empty) column', () => {
    expect(moveAcrossColumns(columns, 'a', 'DONE')?.DONE).toEqual(['a']);
  });

  it('does nothing inside the same column (dnd-kit animates that itself)', () => {
    expect(moveAcrossColumns(columns, 'a', 'c')).toBeNull();
    expect(moveAcrossColumns(columns, 'a', 'NEW')).toBeNull();
  });
});

describe('resolveDrop (final drop → move request)', () => {
  it('reorders down inside a column', () => {
    // Dragging "a" onto "c": the list becomes b, c, a.
    expect(resolveDrop(columns, columns, 'a', 'c')).toEqual({ status: 'NEW', afterId: 'c' });
  });

  it('reorders up to the top of a column', () => {
    expect(resolveDrop(columns, columns, 'c', 'a')).toEqual({ status: 'NEW', afterId: null });
  });

  it('moves a card to another column using the preview position', () => {
    const preview = moveAcrossColumns(columns, 'b', 'p')!;
    expect(resolveDrop(columns, preview, 'b', 'b')).toEqual({
      status: 'IN_PROGRESS',
      afterId: null,
    });
  });

  it('moves a card to the end of another column', () => {
    const preview = moveAcrossColumns(columns, 'a', 'IN_PROGRESS')!;
    expect(resolveDrop(columns, preview, 'a', 'IN_PROGRESS')).toEqual({
      status: 'IN_PROGRESS',
      afterId: 'p',
    });
  });

  it('returns null when the card is dropped where it started', () => {
    expect(resolveDrop(columns, columns, 'b', 'b')).toBeNull();
    expect(resolveDrop(columns, columns, 'b', 'NEW')).toBeNull();
  });
});
