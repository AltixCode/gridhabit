import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import type { Habit } from '@/db/types';

import { HabitCard } from '../HabitCard';
import { renderWithProviders } from './renderWithProviders';

const habit: Habit = {
  id: 'h1',
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
};

const TODAY = '2026-09-13'; // A Sunday.

async function renderCard(props: Partial<React.ComponentProps<typeof HabitCard>> = {}) {
  const onToggleToday = props.onToggleToday ?? jest.fn();
  const utils = await renderWithProviders(
    <HabitCard
      habit={habit}
      completions={[]}
      today={TODAY}
      {...props}
      onToggleToday={onToggleToday}
    />,
  );
  return { ...utils, onToggleToday };
}

describe('HabitCard', () => {
  it('shows the habit name and its frequency', async () => {
    const { getByText } = await renderCard();
    expect(getByText('Meditate')).toBeTruthy();
    expect(getByText(/Every day/)).toBeTruthy();
  });

  it('renders an unchecked check-in control when today is not logged', async () => {
    const { getByLabelText } = await renderCard();
    expect(
      getByLabelText('Mark Meditate complete for today').props.accessibilityState.checked,
    ).toBe(false);
  });

  it('renders a checked control and offers to undo when today is logged', async () => {
    const { getByLabelText } = await renderCard({ completions: [TODAY] });
    expect(
      getByLabelText('Mark Meditate incomplete for today').props.accessibilityState.checked,
    ).toBe(true);
  });

  it('calls back with the habit id when the check-in is tapped', async () => {
    const { getByLabelText, onToggleToday } = await renderCard();
    await fireEvent.press(getByLabelText('Mark Meditate complete for today'));
    expect(onToggleToday).toHaveBeenCalledWith('h1');
  });

  it('shows the current streak', async () => {
    const { getByLabelText } = await renderCard({
      completions: ['2026-09-11', '2026-09-12', '2026-09-13'],
    });
    expect(getByLabelText('Streak: 3 days')).toBeTruthy();
  });

  it('uses the singular unit for a one-day streak', async () => {
    const { getByLabelText } = await renderCard({ completions: [TODAY] });
    expect(getByLabelText('Streak: 1 day')).toBeTruthy();
  });

  it('reports no active streak rather than a bare zero', async () => {
    const { getByLabelText } = await renderCard();
    expect(getByLabelText('No active streak')).toBeTruthy();
  });

  it('marks a habit that is not due today', async () => {
    const { getByText } = await renderCard({
      habit: { ...habit, frequency: { type: 'custom', days: [1, 3, 5] } },
    });
    expect(getByText(/not due today/)).toBeTruthy();
  });

  it('exposes the mini grid as one summarised image, not ~100 separate cells', async () => {
    const { getByLabelText } = await renderCard({ completions: ['2026-09-11', '2026-09-12'] });
    expect(getByLabelText('Activity over the last 14 weeks: 2 days completed')).toBeTruthy();
  });
});
