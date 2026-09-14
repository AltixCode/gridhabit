import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import type { Habit } from '@/db/types';
import { useHabitsStore } from '@/store/useHabitsStore';
import { usePremiumStore } from '@/store/usePremiumStore';

import EditHabitScreen from '../habit/edit/[id]';
import NewHabitScreen from '../habit/new';

const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: 'a' };

jest.mock('@/hooks/useHabitData', () => ({ useDb: () => ({}) }));
jest.mock('@/hooks/useToday', () => ({ useToday: () => '2026-09-16' }));
jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

// `mock`-prefixed so jest.mock's hoisted factory may reference it.
const mockSyncHabitReminders = jest.fn().mockResolvedValue('notif-1');
jest.mock('@/notifications/reminders', () => ({
  syncHabitReminders: (...args: unknown[]) => mockSyncHabitReminders(...args),
  cancelHabitReminders: jest.fn().mockResolvedValue(undefined),
}));

const addHabit = jest.fn();
const editHabit = jest.fn().mockResolvedValue(undefined);

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

function seed(habits: Habit[]) {
  useHabitsStore.setState({
    habits,
    completions: {},
    status: 'ready',
    error: null,
    addHabit,
    editHabit,
  } as never);
}

beforeEach(() => {
  mockParams = { id: 'a' };
  mockReplace.mockClear();
  mockBack.mockClear();
  mockSyncHabitReminders.mockClear();
  editHabit.mockClear();
  addHabit.mockReset().mockImplementation(async (_db, input) => habit('new', input.name));
  usePremiumStore.setState({ isPremium: false, isReady: true });
  seed([]);
});

afterEach(() => jest.restoreAllMocks());

describe('NewHabitScreen', () => {
  it('creates a habit dated today, so its grid starts now', async () => {
    const { getByLabelText } = await renderWithProviders(<NewHabitScreen />);
    await fireEvent.changeText(getByLabelText('Name'), 'Read');
    await fireEvent.press(getByLabelText('Create habit'));

    await waitFor(() =>
      expect(addHabit).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ name: 'Read', createdAt: '2026-09-16' }),
      ),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('does not schedule a reminder that was never enabled', async () => {
    const { getByLabelText } = await renderWithProviders(<NewHabitScreen />);
    await fireEvent.changeText(getByLabelText('Name'), 'Read');
    await fireEvent.press(getByLabelText('Create habit'));

    await waitFor(() => expect(addHabit).toHaveBeenCalled());
    expect(mockSyncHabitReminders).not.toHaveBeenCalled();
  });

  it('schedules a reminder and stores the notification id', async () => {
    const { getByLabelText } = await renderWithProviders(<NewHabitScreen />);
    await fireEvent.changeText(getByLabelText('Name'), 'Read');
    await fireEvent(getByLabelText('Enable daily reminder'), 'valueChange', true);
    await fireEvent.press(getByLabelText('Create habit'));

    await waitFor(() => expect(mockSyncHabitReminders).toHaveBeenCalled());
    expect(editHabit).toHaveBeenCalledWith({}, 'new', { notificationId: 'notif-1' });
  });

  // The gate is re-checked at submit, not only at navigation: a slot could have
  // been filled on another device since this screen was opened.
  it('redirects to the paywall if the free limit filled while the form was open', async () => {
    seed(['a', 'b', 'c', 'd'].map((id, i) => habit(id, `Habit ${i}`)));
    const { getByLabelText } = await renderWithProviders(<NewHabitScreen />);
    await fireEvent.changeText(getByLabelText('Name'), 'Read');
    await fireEvent.press(getByLabelText('Create habit'));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/paywall',
        params: { reason: 'habit-limit' },
      }),
    );
    expect(addHabit).not.toHaveBeenCalled();
  });

  it('lets a premium user past the limit', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true });
    seed(['a', 'b', 'c', 'd', 'e'].map((id, i) => habit(id, `Habit ${i}`)));
    const { getByLabelText } = await renderWithProviders(<NewHabitScreen />);
    await fireEvent.changeText(getByLabelText('Name'), 'Read');
    await fireEvent.press(getByLabelText('Create habit'));

    await waitFor(() => expect(addHabit).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('surfaces a save failure instead of closing silently', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    addHabit.mockRejectedValue(new Error('database is locked'));
    const { getByLabelText } = await renderWithProviders(<NewHabitScreen />);
    await fireEvent.changeText(getByLabelText('Name'), 'Read');
    await fireEvent.press(getByLabelText('Create habit'));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Could not save habit', 'database is locked'),
    );
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('EditHabitScreen', () => {
  beforeEach(() => {
    seed([habit('a', 'Meditate', { reminderEnabled: true, reminderTime: '07:30' })]);
  });

  it('saves the edited habit', async () => {
    const { getByLabelText } = await renderWithProviders(<EditHabitScreen />);
    await fireEvent.changeText(getByLabelText('Name'), 'Meditate 10m');
    await fireEvent.press(getByLabelText('Save changes'));

    await waitFor(() =>
      expect(editHabit).toHaveBeenCalledWith(
        {},
        'a',
        expect.objectContaining({ name: 'Meditate 10m' }),
      ),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  // A changed weekday set or time must not leave the old triggers armed.
  it('reschedules reminders from the new values', async () => {
    const { getByLabelText } = await renderWithProviders(<EditHabitScreen />);
    await fireEvent.press(getByLabelText('Save changes'));

    await waitFor(() => expect(mockSyncHabitReminders).toHaveBeenCalled());
    expect(editHabit).toHaveBeenLastCalledWith({}, 'a', { notificationId: 'notif-1' });
  });

  it('degrades gracefully when the habit no longer exists', async () => {
    seed([]);
    const { getByText } = await renderWithProviders(<EditHabitScreen />);
    expect(getByText('This habit is no longer available.')).toBeTruthy();
  });

  it('surfaces a save failure', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    editHabit.mockRejectedValue(new Error('disk full'));
    const { getByLabelText } = await renderWithProviders(<EditHabitScreen />);
    await fireEvent.press(getByLabelText('Save changes'));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Could not save changes', 'disk full'),
    );
  });
});
