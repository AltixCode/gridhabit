import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import React from 'react';

import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import type { Habit } from '@/db/types';
import { useHabitsStore } from '@/store/useHabitsStore';
import { usePremiumStore } from '@/store/usePremiumStore';

import ArchiveScreen from '../archive';
import SettingsScreen from '../settings';

const mockPush = jest.fn();

jest.mock('@/hooks/useHabitData', () => ({ useDb: () => ({}) }));
jest.mock('@/hooks/useToday', () => ({ useToday: () => '2026-09-13' }));
const mockShareExport = jest.fn().mockResolvedValue({ status: 'shared' });
jest.mock('@/export/shareExport', () => ({
  shareExport: (...args: unknown[]) => mockShareExport(...args),
}));

const mockCancelAllReminders = jest.fn().mockResolvedValue(undefined);
jest.mock('@/notifications/reminders', () => ({
  cancelAllReminders: () => mockCancelAllReminders(),
}));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const setArchived = jest.fn().mockResolvedValue(undefined);
const restore = jest.fn().mockResolvedValue('none');

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
    setArchived,
    load: jest.fn().mockResolvedValue(undefined),
  } as never);
}

beforeEach(() => {
  mockPush.mockClear();
  setArchived.mockClear();
  usePremiumStore.setState({ isPremium: false, isReady: true, restore } as never);
  mockShareExport.mockClear().mockResolvedValue({ status: 'shared' });
  mockCancelAllReminders.mockClear();
  restore.mockClear().mockResolvedValue('none');
  seed([]);
});

afterEach(() => jest.restoreAllMocks());

// These screens subscribe to array-building selectors. Rendering them at all is
// the guard against the zustand snapshot-identity render loop.
describe('ArchiveScreen', () => {
  it('renders an empty state with nothing archived', async () => {
    seed([habit('a', 'Meditate')]);
    const { getByText } = await renderWithProviders(<ArchiveScreen />);
    expect(getByText('Nothing archived')).toBeTruthy();
  });

  it('lists archived habits only', async () => {
    seed([habit('a', 'Meditate'), habit('b', 'Read', { archived: true })]);
    const { getByText, queryByText } = await renderWithProviders(<ArchiveScreen />);
    expect(getByText('Read')).toBeTruthy();
    expect(queryByText('Meditate')).toBeNull();
  });

  it('restores a habit when its row is tapped', async () => {
    seed([habit('b', 'Read', { archived: true })]);
    const { getByLabelText } = await renderWithProviders(<ArchiveScreen />);
    await fireEvent.press(getByLabelText('Read'));
    expect(setArchived).toHaveBeenCalledWith({}, 'b', false);
  });
});

describe('SettingsScreen', () => {
  it('renders for a free user and offers the upgrade', async () => {
    seed([habit('a', 'Meditate')]);
    const { getByText } = await renderWithProviders(<SettingsScreen />);
    expect(getByText('Go Pro, once')).toBeTruthy();
    expect(getByText('3 of 4 free habits remaining.')).toBeTruthy();
  });

  it('reports when every free slot is used', async () => {
    seed(['a', 'b', 'c', 'd'].map((id, i) => habit(id, `Habit ${i}`)));
    const { getByText } = await renderWithProviders(<SettingsScreen />);
    expect(getByText('You are using all 4 free habits.')).toBeTruthy();
  });

  it('thanks a premium user instead of selling to them', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true });
    const { getByText, queryByText } = await renderWithProviders(<SettingsScreen />);
    expect(getByText('GridHabit Pro')).toBeTruthy();
    expect(queryByText('Go Pro, once')).toBeNull();
  });

  it('marks export as Pro for a free user', async () => {
    const { getAllByText } = await renderWithProviders(<SettingsScreen />);
    expect(getAllByText('Pro').length).toBeGreaterThanOrEqual(2);
  });

  it('sends a free user tapping export to the paywall', async () => {
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Export as CSV'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/paywall',
      params: { reason: 'export' },
    });
  });

  it('shows the archived habit count', async () => {
    seed([habit('a', 'Meditate'), habit('b', 'Read', { archived: true })]);
    const { getByText } = await renderWithProviders(<SettingsScreen />);
    expect(getByText('1')).toBeTruthy();
  });

  it('opens the reorder screen', async () => {
    seed([habit('a', 'Meditate')]);
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Reorder habits'));
    expect(mockPush).toHaveBeenCalledWith('/reorder');
  });
});

describe('SettingsScreen — data and purchases', () => {
  it('exports CSV for a premium user without going near the paywall', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true, restore } as never);
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Export as CSV'));

    await waitFor(() => expect(mockShareExport).toHaveBeenCalledWith({}, 'csv', '2026-09-13'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('exports JSON for a premium user', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true, restore } as never);
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Export as JSON'));
    await waitFor(() => expect(mockShareExport).toHaveBeenCalledWith({}, 'json', '2026-09-13'));
  });

  it('explains an empty export rather than sharing an empty file', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true, restore } as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockShareExport.mockResolvedValue({ status: 'empty' });
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Export as CSV'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Nothing to export', expect.any(String)),
    );
  });

  it('surfaces an export failure', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true, restore } as never);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockShareExport.mockResolvedValue({ status: 'error', message: 'disk full' });
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Export as JSON'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Export failed', 'disk full'));
  });

  it('cycles the theme through system, light and dark', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(<SettingsScreen />);
    expect(getByText('Match system')).toBeTruthy();
    await fireEvent.press(getByLabelText('Theme'));
    await waitFor(() => expect(getByText('Light')).toBeTruthy());
    await fireEvent.press(getByLabelText('Theme'));
    await waitFor(() => expect(getByText('Dark')).toBeTruthy());
    await fireEvent.press(getByLabelText('Theme'));
    await waitFor(() => expect(getByText('Match system')).toBeTruthy());
  });

  it('reports a successful restore', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    restore.mockResolvedValue('purchased');
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Restore purchases'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Restored', expect.any(String)));
  });

  it('reports when there is nothing to restore', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Restore purchases'));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith('Nothing to restore', expect.any(String)),
    );
  });

  it('confirms before turning every reminder off', async () => {
    let confirm: (() => void) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      confirm = buttons?.find((b) => b.style === 'destructive')?.onPress as () => void;
    });
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Turn off all reminders'));

    expect(mockCancelAllReminders).not.toHaveBeenCalled();
    confirm?.();
    expect(mockCancelAllReminders).toHaveBeenCalled();
  });

  it('offers manage-subscription only to a premium user', async () => {
    const free = await renderWithProviders(<SettingsScreen />);
    expect(free.queryByLabelText('Manage subscription')).toBeNull();

    usePremiumStore.setState({ isPremium: true, isReady: true, restore } as never);
    const paid = await renderWithProviders(<SettingsScreen />);
    expect(paid.queryByLabelText('Manage subscription')).not.toBeNull();
  });

  it('opens the privacy policy', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByLabelText } = await renderWithProviders(<SettingsScreen />);
    await fireEvent.press(getByLabelText('Privacy policy'));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('privacy'));
  });
});
