import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Habit } from '@/db/types';

import { HabitForm } from '../HabitForm';
import { renderWithProviders } from './renderWithProviders';

const existing: Habit = {
  id: 'h1',
  name: 'Meditate',
  color: '#7C5CFF',
  icon: 'moon',
  frequency: { type: 'custom', days: [1, 3, 5] },
  createdAt: '2026-08-01',
  archived: false,
  sortOrder: 0,
  reminderEnabled: true,
  reminderTime: '07:30',
  notificationId: null,
};

function renderForm(props: Partial<React.ComponentProps<typeof HabitForm>> = {}) {
  const onSubmit = props.onSubmit ?? jest.fn();
  return renderWithProviders(
    <HabitForm submitLabel="Create habit" {...props} onSubmit={onSubmit} />,
  ).then((utils) => ({ ...utils, onSubmit }));
}

describe('HabitForm', () => {
  it('starts with an empty name and the submit button disabled', async () => {
    const { getByLabelText } = await renderForm();
    expect(getByLabelText('Create habit').props.accessibilityState.disabled).toBe(true);
  });

  it('enables submit once a name is entered', async () => {
    const { getByLabelText } = await renderForm();
    await fireEvent.changeText(getByLabelText('Name'), 'Read');
    await waitFor(() =>
      expect(getByLabelText('Create habit').props.accessibilityState.disabled).toBe(false),
    );
  });

  it('submits the trimmed name and the chosen defaults', async () => {
    const { getByLabelText, onSubmit } = await renderForm();
    await fireEvent.changeText(getByLabelText('Name'), '  Read  ');
    await fireEvent.press(getByLabelText('Create habit'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Read',
        frequency: { type: 'daily' },
        reminderEnabled: false,
        reminderTime: null,
      }),
    );
  });

  it('does not submit a blank name and shows an inline error', async () => {
    const { getByLabelText, getByText, onSubmit } = await renderForm();
    await fireEvent.changeText(getByLabelText('Name'), '   ');
    await fireEvent(getByLabelText('Name'), 'blur');

    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(getByText('Give your habit a name.')).toBeTruthy());
  });

  it('records the selected colour', async () => {
    const { getByLabelText, onSubmit } = await renderForm();
    await fireEvent.changeText(getByLabelText('Name'), 'Read');
    await fireEvent.press(getByLabelText('Teal'));
    await fireEvent.press(getByLabelText('Create habit'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ color: '#0D9488' }));
  });

  it('records a selected icon and clears it when tapped again', async () => {
    const { getByLabelText, onSubmit } = await renderForm();
    await fireEvent.changeText(getByLabelText('Name'), 'Read');
    await fireEvent.press(getByLabelText('Book'));
    await fireEvent.press(getByLabelText('Create habit'));
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ icon: 'book-open' }));

    await fireEvent.press(getByLabelText('Book'));
    await fireEvent.press(getByLabelText('Create habit'));
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ icon: null }));
  });

  it('switches to a weekly quota', async () => {
    const { getByLabelText, onSubmit } = await renderForm();
    await fireEvent.changeText(getByLabelText('Name'), 'Run');
    await fireEvent.press(getByLabelText('Times a week'));
    await fireEvent.press(getByLabelText('5 times per week'));
    await fireEvent.press(getByLabelText('Create habit'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ frequency: { type: 'weekly', timesPerWeek: 5 } }),
    );
  });

  it('switches to specific weekdays and toggles a day off', async () => {
    const { getByLabelText, onSubmit } = await renderForm();
    await fireEvent.changeText(getByLabelText('Name'), 'Gym');
    await fireEvent.press(getByLabelText('Specific days'));
    await fireEvent.press(getByLabelText('Wed')); // default is Mon/Wed/Fri
    await fireEvent.press(getByLabelText('Create habit'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ frequency: { type: 'custom', days: [1, 5] } }),
    );
  });

  it('blocks submission when every weekday has been deselected', async () => {
    const { getByLabelText, getByText, onSubmit } = await renderForm();
    await fireEvent.changeText(getByLabelText('Name'), 'Gym');
    await fireEvent.press(getByLabelText('Specific days'));
    for (const day of ['Mon', 'Wed', 'Fri']) {
      await fireEvent.press(getByLabelText(day));
    }
    await fireEvent.press(getByLabelText('Create habit'));

    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(getByText('Pick at least one day.')).toBeTruthy());
  });

  it('pre-fills every field when editing an existing habit', async () => {
    const { getByLabelText, onSubmit } = await renderForm({
      initial: existing,
      submitLabel: 'Save changes',
    });
    await fireEvent.press(getByLabelText('Save changes'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Meditate',
      color: '#7C5CFF',
      icon: 'moon',
      frequency: { type: 'custom', days: [1, 3, 5] },
      reminderEnabled: true,
      reminderTime: '07:30',
    });
  });

  it('drops the reminder time when reminders are switched off', async () => {
    const { getByLabelText, onSubmit } = await renderForm({
      initial: existing,
      submitLabel: 'Save changes',
    });
    await fireEvent(getByLabelText('Enable daily reminder'), 'valueChange', false);
    await fireEvent.press(getByLabelText('Save changes'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ reminderEnabled: false, reminderTime: null }),
    );
  });

  it('shows a busy state and refuses further taps while saving', async () => {
    const { getByLabelText, onSubmit } = await renderForm({ initial: existing, busy: true });
    expect(getByLabelText('Create habit').props.accessibilityState.busy).toBe(true);
    await fireEvent.press(getByLabelText('Create habit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
