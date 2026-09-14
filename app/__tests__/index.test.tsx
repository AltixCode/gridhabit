import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import type { Habit } from '@/db/types';
import { useHabitsStore } from '@/store/useHabitsStore';
import { usePremiumStore } from '@/store/usePremiumStore';

import HomeScreen from '../index';

// `mock`-prefixed so jest.mock's factory may reference it.
const mockPush = jest.fn();
const load = jest.fn().mockResolvedValue(undefined);
const setCompletion = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/useHabitData', () => ({ useDb: () => ({}) }));
jest.mock('@/hooks/useToday', () => ({ useToday: () => '2026-09-13' }));
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

function habit(id: string, name: string, over: Partial<Habit> = {}): Habit {
  return {
    id,
    name,
    color: '#7C5CFF',
    icon: null,
    frequency: { type: 'daily' },
    createdAt: '2026-08-01',
    archived: false,
    sortOrder: 0,
    reminderEnabled: false,
    reminderTime: null,
    notificationId: null,
    ...over,
  };
}

function seed(habits: Habit[], completions: Record<string, string[]> = {}) {
  useHabitsStore.setState({
    habits,
    completions,
    status: 'ready',
    error: null,
    load,
    setCompletion,
  } as never);
}

beforeEach(() => {
  mockPush.mockClear();
  load.mockClear();
  setCompletion.mockClear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  seed([]);
});

describe('HomeScreen', () => {
  // Regression guard: subscribing to a selector that builds a new array makes
  // zustand v5 report a change on every render, and React throws
  // "Maximum update depth exceeded". This crashed the app's entry screen.
  it('renders without falling into a render loop', async () => {
    seed([habit('a', 'Meditate'), habit('b', 'Read')]);
    const { getByText } = await renderWithProviders(<HomeScreen />);
    expect(getByText('Today')).toBeTruthy();
    expect(getByText('Meditate')).toBeTruthy();
    expect(getByText('Read')).toBeTruthy();
  });

  it('loads from the database on mount', async () => {
    await renderWithProviders(<HomeScreen />);
    await waitFor(() => expect(load).toHaveBeenCalled());
  });

  it('shows the empty state when there are no habits', async () => {
    const { getByText } = await renderWithProviders(<HomeScreen />);
    expect(getByText('Start your first grid')).toBeTruthy();
  });

  it('hides archived habits', async () => {
    seed([habit('a', 'Meditate'), habit('b', 'Read', { archived: true })]);
    const { getByText, queryByText } = await renderWithProviders(<HomeScreen />);
    expect(getByText('Meditate')).toBeTruthy();
    expect(queryByText('Read')).toBeNull();
  });

  it('counts how many of today’s habits are done', async () => {
    seed([habit('a', 'Meditate'), habit('b', 'Read')], { a: ['2026-09-13'] });
    const { getByText } = await renderWithProviders(<HomeScreen />);
    expect(getByText('1 of 2 done')).toBeTruthy();
  });

  it('excludes habits that are not due today from the count', async () => {
    // 2026-09-13 is a Sunday, so a Mon/Wed/Fri habit is not due.
    seed([habit('a', 'Meditate'), habit('b', 'Gym', { frequency: { type: 'custom', days: [1, 3, 5] } })]);
    const { getByText } = await renderWithProviders(<HomeScreen />);
    expect(getByText('0 of 1 done')).toBeTruthy();
  });

  it('checks a habit off for today', async () => {
    seed([habit('a', 'Meditate')]);
    const { getByLabelText } = await renderWithProviders(<HomeScreen />);
    await fireEvent.press(getByLabelText('Mark Meditate complete for today'));
    expect(setCompletion).toHaveBeenCalledWith({}, 'a', '2026-09-13', true);
  });

  it('un-checks a habit that was already done', async () => {
    seed([habit('a', 'Meditate')], { a: ['2026-09-13'] });
    const { getByLabelText } = await renderWithProviders(<HomeScreen />);
    await fireEvent.press(getByLabelText('Mark Meditate incomplete for today'));
    expect(setCompletion).toHaveBeenCalledWith({}, 'a', '2026-09-13', false);
  });

  it('opens the create screen while below the free limit', async () => {
    seed([habit('a', 'Meditate')]);
    const { getByLabelText } = await renderWithProviders(<HomeScreen />);
    await fireEvent.press(getByLabelText('Add a habit'));
    expect(mockPush).toHaveBeenCalledWith('/habit/new');
  });

  it('sends a free user to the paywall at the habit limit', async () => {
    seed(['a', 'b', 'c', 'd'].map((id, i) => habit(id, `Habit ${i}`)));
    const { getByLabelText } = await renderWithProviders(<HomeScreen />);
    await fireEvent.press(getByLabelText('Add a habit'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/paywall',
      params: { reason: 'habit-limit' },
    });
  });

  it('lets a premium user past the habit limit', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true });
    seed(['a', 'b', 'c', 'd', 'e'].map((id, i) => habit(id, `Habit ${i}`)));
    const { getByLabelText } = await renderWithProviders(<HomeScreen />);
    await fireEvent.press(getByLabelText('Add a habit'));
    expect(mockPush).toHaveBeenCalledWith('/habit/new');
  });

  it('shows the banner to a free user and not to a premium one', async () => {
    seed([habit('a', 'Meditate')]);
    const free = await renderWithProviders(<HomeScreen />);
    expect(free.queryByTestId('banner-ad')).not.toBeNull();

    usePremiumStore.setState({ isPremium: true, isReady: true });
    const paid = await renderWithProviders(<HomeScreen />);
    expect(paid.queryByTestId('banner-ad')).toBeNull();
  });
});
