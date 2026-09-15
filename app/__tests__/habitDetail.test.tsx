import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import type { Habit } from '@/db/types';
import { useHabitsStore } from '@/store/useHabitsStore';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { usePremiumStore } from '@/store/usePremiumStore';

import HabitDetailScreen from '../habit/[id]';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: 'a' };

jest.mock('@/hooks/useHabitData', () => ({ useDb: () => ({}) }));
jest.mock('@/hooks/useToday', () => ({ useToday: () => '2026-09-16' })); // Wednesday
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

const setCompletion = jest.fn().mockResolvedValue(undefined);
const setArchived = jest.fn().mockResolvedValue(undefined);
const removeHabit = jest.fn().mockResolvedValue(undefined);

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'a',
    name: 'Meditate',
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
    setCompletion,
    setArchived,
    removeHabit,
  } as never);
}

beforeEach(() => {
  mockParams = { id: 'a' };
  mockPush.mockClear();
  mockBack.mockClear();
  setCompletion.mockClear();
  setArchived.mockClear();
  removeHabit.mockClear();
  usePremiumStore.setState({ isPremium: false, isReady: true });
  seed([habit()]);
});

afterEach(() => jest.restoreAllMocks());

describe('HabitDetailScreen', () => {
  it('renders the habit and its schedule', async () => {
    const { getByText } = await renderWithProviders(<HabitDetailScreen />);
    expect(getByText('Every day')).toBeTruthy();
  });

  it('shows the current streak with the right unit', async () => {
    seed([habit()], { a: ['2026-09-14', '2026-09-15', '2026-09-16'] });
    const { getByText } = await renderWithProviders(<HabitDetailScreen />);
    expect(getByText('3 days')).toBeTruthy();
  });

  it('uses the singular unit for a one-day streak', async () => {
    seed([habit()], { a: ['2026-09-16'] });
    const { getByText } = await renderWithProviders(<HabitDetailScreen />);
    expect(getByText('1 day')).toBeTruthy();
  });

  it('counts a weekly-quota streak in weeks', async () => {
    seed([habit({ frequency: { type: 'weekly', timesPerWeek: 2 } })], {
      a: ['2026-09-14', '2026-09-15'],
    });
    const { getByText } = await renderWithProviders(<HabitDetailScreen />);
    expect(getByText('1 week')).toBeTruthy();
  });

  it('prompts the user when there is no streak yet', async () => {
    const { getByText } = await renderWithProviders(<HabitDetailScreen />);
    expect(getByText('Complete today to start a streak')).toBeTruthy();
  });

  it('shows longest streak, total and completion rate', async () => {
    seed([habit()], { a: ['2026-09-14', '2026-09-15', '2026-09-16'] });
    const { getByLabelText } = await renderWithProviders(<HabitDetailScreen />);
    expect(getByLabelText('Longest: 3')).toBeTruthy();
    expect(getByLabelText('Total: 3')).toBeTruthy();
    expect(getByLabelText(/^Rate: \d+%$/)).toBeTruthy();
  });

  it('logs a past day from the grid', async () => {
    const { getByLabelText } = await renderWithProviders(<HabitDetailScreen />);
    await fireEvent.press(getByLabelText('Mon, Sep 14, 2026: missed'));
    expect(setCompletion).toHaveBeenCalledWith({}, 'a', '2026-09-14', true);
  });

  it('un-logs a day that was already complete', async () => {
    seed([habit()], { a: ['2026-09-14'] });
    const { getByLabelText } = await renderWithProviders(<HabitDetailScreen />);
    await fireEvent.press(getByLabelText('Mon, Sep 14, 2026: completed'));
    expect(setCompletion).toHaveBeenCalledWith({}, 'a', '2026-09-14', false);
  });

  it('archives the habit and goes back', async () => {
    const { getByLabelText } = await renderWithProviders(<HabitDetailScreen />);
    await fireEvent.press(getByLabelText('Archive habit'));
    expect(setArchived).toHaveBeenCalledWith({}, 'a', true);
    expect(mockBack).toHaveBeenCalled();
  });

  it('offers to unarchive an archived habit', async () => {
    seed([habit({ archived: true })]);
    const { getByLabelText } = await renderWithProviders(<HabitDetailScreen />);
    await fireEvent.press(getByLabelText('Unarchive habit'));
    expect(setArchived).toHaveBeenCalledWith({}, 'a', false);
  });

  it('confirms before deleting, and does not delete on cancel', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByLabelText } = await renderWithProviders(<HabitDetailScreen />);
    await fireEvent.press(getByLabelText('Delete habit'));

    expect(alert).toHaveBeenCalled();
    expect(removeHabit).not.toHaveBeenCalled();
    expect(alert.mock.calls[0]![1]).toMatch(/cannot be undone/i);
  });

  it('deletes once the confirmation is accepted', async () => {
    let confirm: (() => void) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      confirm = buttons?.find((b) => b.style === 'destructive')?.onPress as () => void;
    });
    const { getByLabelText } = await renderWithProviders(<HabitDetailScreen />);
    await fireEvent.press(getByLabelText('Delete habit'));

    confirm?.();
    expect(removeHabit).toHaveBeenCalledWith({}, 'a');
    expect(mockBack).toHaveBeenCalled();
  });

  it('degrades gracefully when the habit no longer exists', async () => {
    seed([]);
    const { getByText } = await renderWithProviders(<HabitDetailScreen />);
    expect(getByText('This habit is no longer available.')).toBeTruthy();
  });

  it('shows the banner to a free user and not to a premium one', async () => {
    // A banner needs consent as well as a free account; consent is exercised directly
    // in BannerAdSlot's own tests.
    useAdsConsentStore.setState({
      consent: { canServeAds: true, offerPrivacyOptions: false },
    });
    const free = await renderWithProviders(<HabitDetailScreen />);
    expect(free.queryByTestId('banner-ad')).not.toBeNull();

    await act(async () => {
      usePremiumStore.setState({ isPremium: true, isReady: true });
    });
    const paid = await renderWithProviders(<HabitDetailScreen />);
    expect(paid.queryByTestId('banner-ad')).toBeNull();
  });
});
