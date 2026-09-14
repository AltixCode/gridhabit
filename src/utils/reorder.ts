/**
 * List reordering.
 *
 * Pure and total: every index is clamped or rejected rather than trusted, so a
 * stale index from a list that changed underneath the UI can never drop or
 * duplicate a habit.
 */

export type MoveDirection = 'up' | 'down';

/** Returns a new array with the item at `from` relocated to `to`. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  if (from < 0 || from >= next.length) return next;

  const target = Math.max(0, Math.min(next.length - 1, to));
  if (target === from) return next;

  const [item] = next.splice(from, 1);
  next.splice(target, 0, item as T);
  return next;
}

/** Whether the item at `index` can move in `direction` within a list of `length`. */
export function canMove(index: number, direction: MoveDirection, length: number): boolean {
  if (length <= 1) return false;
  return direction === 'up' ? index > 0 : index < length - 1;
}
