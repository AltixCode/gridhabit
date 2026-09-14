import { canMove, moveItem } from '../reorder';

describe('moveItem', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('moves an item later in the list', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item earlier in the list', () => {
    expect(moveItem(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('moves an item one place down', () => {
    expect(moveItem(list, 1, 2)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moves an item one place up', () => {
    expect(moveItem(list, 2, 1)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('moves the first item to the end', () => {
    expect(moveItem(list, 0, 3)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('moves the last item to the front', () => {
    expect(moveItem(list, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('is a no-op when the indices match', () => {
    expect(moveItem(list, 2, 2)).toEqual(list);
  });

  it('never mutates the input', () => {
    const original = [...list];
    moveItem(list, 0, 3);
    expect(list).toEqual(original);
  });

  it('always preserves length and membership', () => {
    for (let from = 0; from < list.length; from += 1) {
      for (let to = 0; to < list.length; to += 1) {
        const result = moveItem(list, from, to);
        expect(result).toHaveLength(list.length);
        expect([...result].sort()).toEqual([...list].sort());
      }
    }
  });

  it('clamps an out-of-range destination rather than dropping the item', () => {
    expect(moveItem(list, 0, 99)).toEqual(['b', 'c', 'd', 'a']);
    expect(moveItem(list, 3, -5)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('returns a copy when the source index does not exist', () => {
    expect(moveItem(list, 99, 0)).toEqual(list);
    expect(moveItem(list, -1, 0)).toEqual(list);
  });

  it('handles an empty and a single-item list', () => {
    expect(moveItem([], 0, 1)).toEqual([]);
    expect(moveItem(['only'], 0, 1)).toEqual(['only']);
  });
});

describe('canMove', () => {
  it('refuses to move the first item up', () => {
    expect(canMove(0, 'up', 4)).toBe(false);
    expect(canMove(0, 'down', 4)).toBe(true);
  });

  it('refuses to move the last item down', () => {
    expect(canMove(3, 'down', 4)).toBe(false);
    expect(canMove(3, 'up', 4)).toBe(true);
  });

  it('allows both directions in the middle', () => {
    expect(canMove(1, 'up', 4)).toBe(true);
    expect(canMove(1, 'down', 4)).toBe(true);
  });

  it('refuses both directions for a single-item list', () => {
    expect(canMove(0, 'up', 1)).toBe(false);
    expect(canMove(0, 'down', 1)).toBe(false);
  });

  it('refuses both directions for an empty list', () => {
    expect(canMove(0, 'up', 0)).toBe(false);
    expect(canMove(0, 'down', 0)).toBe(false);
  });
});
