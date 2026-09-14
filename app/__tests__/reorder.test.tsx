import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import type { Habit } from '@/db/types';
import { useHabitsStore } from '@/store/useHabitsStore';

import ReorderScreen from '../reorder';

/**
 * Mirrors the real store: `reorder` re-sorts `habits` optimistically before it
 * persists, and the screen renders straight off that.
 */
const reorder = jest.fn(async (_db: unknown, ids: string[]) => {
  const rank = new Map(ids.map((id, index) => [id, index]));
  useHabitsStore.setState((state) => ({
    habits: [...state.habits].sort(
      (a, b) => (rank.get(a.id) ?? a.sortOrder) - (rank.get(b.id) ?? b.sortOrder),
    ),
  }));
});

jest.mock('@/hooks/useHabitData', () => ({ useDb: () => ({}) }));

function habit(id: string, name: string, sortOrder: number): Habit {
  return {
    id,
    name,
    color: '#7C5CFF',
    icon: null,
    frequency: { type: 'daily' },
    createdAt: '2026-08-01',
    archived: false,
    sortOrder,
    reminderEnabled: false,
    reminderTime: null,
    notificationId: null,
  };
}

function seed(habits: Habit[]) {
  useHabitsStore.setState({
    habits,
    completions: {},
    status: 'ready',
    error: null,
    reorder,
  } as never);
}

beforeEach(() => {
  reorder.mockClear();
  seed([habit('a', 'Meditate', 0), habit('b', 'Read', 1), habit('c', 'Run', 2)]);
});

describe('ReorderScreen', () => {
  it('lists the habits in their current order', async () => {
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    expect(getByLabelText('Meditate, position 1 of 3')).toBeTruthy();
    expect(getByLabelText('Read, position 2 of 3')).toBeTruthy();
    expect(getByLabelText('Run, position 3 of 3')).toBeTruthy();
  });

  it('moves a habit down and persists the new order', async () => {
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    await fireEvent.press(getByLabelText('Move Meditate down'));

    expect(reorder).toHaveBeenCalledWith(expect.anything(), ['b', 'a', 'c']);
    await waitFor(() => expect(getByLabelText('Meditate, position 2 of 3')).toBeTruthy());
  });

  it('moves a habit up and persists the new order', async () => {
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    await fireEvent.press(getByLabelText('Move Run up'));

    expect(reorder).toHaveBeenCalledWith(expect.anything(), ['a', 'c', 'b']);
    await waitFor(() => expect(getByLabelText('Run, position 2 of 3')).toBeTruthy());
  });

  it('disables moving the first habit up', async () => {
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    const control = getByLabelText('Move Meditate up');
    expect(control.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(control);
    expect(reorder).not.toHaveBeenCalled();
  });

  it('disables moving the last habit down', async () => {
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    const control = getByLabelText('Move Run down');
    expect(control.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(control);
    expect(reorder).not.toHaveBeenCalled();
  });

  it('applies several moves cumulatively', async () => {
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    await fireEvent.press(getByLabelText('Move Run up'));   // a, c, b
    await fireEvent.press(getByLabelText('Move Run up'));   // c, a, b

    expect(reorder).toHaveBeenLastCalledWith(expect.anything(), ['c', 'a', 'b']);
    await waitFor(() => expect(getByLabelText('Run, position 1 of 3')).toBeTruthy());
  });

  it('offers screen-reader actions in place of the buttons', async () => {
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    const row = getByLabelText('Read, position 2 of 3');
    expect(row.props.accessibilityActions).toEqual([
      { name: 'moveUp', label: 'Move up' },
      { name: 'moveDown', label: 'Move down' },
    ]);
  });

  it('omits the move-up action on the first row', async () => {
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    expect(getByLabelText('Meditate, position 1 of 3').props.accessibilityActions).toEqual([
      { name: 'moveDown', label: 'Move down' },
    ]);
  });

  it('reorders from a screen-reader action', async () => {
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    await fireEvent(getByLabelText('Read, position 2 of 3'), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveUp' },
    });
    expect(reorder).toHaveBeenCalledWith(expect.anything(), ['b', 'a', 'c']);
  });

  it('shows an empty state when there is nothing to reorder', async () => {
    seed([]);
    const { getByText } = await renderWithProviders(<ReorderScreen />);
    expect(getByText('Nothing to reorder')).toBeTruthy();
  });

  it('excludes archived habits', async () => {
    seed([habit('a', 'Meditate', 0), { ...habit('b', 'Read', 1), archived: true }]);
    const { getByLabelText, queryByLabelText } = await renderWithProviders(<ReorderScreen />);
    expect(getByLabelText('Meditate, position 1 of 1')).toBeTruthy();
    expect(queryByLabelText(/^Read, position/)).toBeNull();
  });

  it('cannot move anything in a single-habit list', async () => {
    seed([habit('a', 'Meditate', 0)]);
    const { getByLabelText } = await renderWithProviders(<ReorderScreen />);
    expect(getByLabelText('Move Meditate up').props.accessibilityState.disabled).toBe(true);
    expect(getByLabelText('Move Meditate down').props.accessibilityState.disabled).toBe(true);
  });
});
