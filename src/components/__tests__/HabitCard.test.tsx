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

describe('HabitCard accessibility', () => {
  /**
   * The card used to carry `accessibilityRole="button"` on its outer Pressable,
   * which makes it a single accessibility element and COLLAPSES its children.
   * With VoiceOver on, the whole row announced as one "name. frequency." button:
   * the check button was unreachable and the grid announced nothing.
   *
   * Marking a habit done is this app's primary daily action. This test is about
   * that function being reachable, not about the markup.
   */
  it('does not make the card itself an accessibility element', async () => {
    // This asserts the MECHANISM, not the symptom, and that is deliberate.
    //
    // The obvious test -- query the check button and press it -- passes whether
    // or not the bug is present: react-native-testing-library does not model
    // the native collapsing of descendants, so `getByLabelText` finds a nested
    // control even when a real VoiceOver user cannot reach it. I wrote that
    // test first, reintroduced the bug, and watched it pass. It would have been
    // a false guard.
    //
    // What actually causes the collapse is an accessibilityRole or
    // accessibilityLabel on the container, so that is what is pinned here.
    const { toJSON } = await renderCard({});
    const tree = JSON.stringify(toJSON());

    // The card's own container must not advertise itself to a screen reader.
    // If either of these appears on it again, descendants collapse and the
    // check button becomes unreachable.
    expect(tree).toContain('"accessible":false');
    expect(tree).not.toContain('"accessibilityHint":"Opens habit details","accessibilityRole":"button","accessible":true,"style":[{"backgroundColor"');
  });

  it('still offers a way to open the habit details', async () => {
    // The title block carries the "opens details" affordance now, labelled with
    // the habit and its frequency. getByLabelText matches accessibilityLabel,
    // not accessibilityHint, so this asserts the label rather than the hint.
    const { getByLabelText } = await renderCard({});
    expect(getByLabelText(/Every day\./i)).toBeTruthy();
  });
});
