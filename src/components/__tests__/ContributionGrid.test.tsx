import { fireEvent } from '@testing-library/react-native';
import React from 'react';

import { ContributionGrid } from '../ContributionGrid';
import { renderWithProviders } from './renderWithProviders';

const BASE = {
  completions: [] as string[],
  frequency: { type: 'daily' } as const,
  createdAt: '2020-01-01',
  today: '2026-09-16', // A Wednesday.
  color: '#7C5CFF',
};

describe('ContributionGrid', () => {
  it('labels today as not yet due rather than missed', async () => {
    const { getByLabelText } = await renderWithProviders(
      <ContributionGrid {...BASE} weeks={2} scrollable={false} />,
    );
    expect(getByLabelText('Wed, Sep 16, 2026: not due')).toBeTruthy();
  });

  it('labels a completed day', async () => {
    const { getByLabelText } = await renderWithProviders(
      <ContributionGrid {...BASE} completions={['2026-09-14']} weeks={2} scrollable={false} />,
    );
    expect(getByLabelText('Mon, Sep 14, 2026: completed')).toBeTruthy();
  });

  it('labels a missed due day', async () => {
    const { getByLabelText } = await renderWithProviders(
      <ContributionGrid {...BASE} weeks={2} scrollable={false} />,
    );
    expect(getByLabelText('Tue, Sep 15, 2026: missed')).toBeTruthy();
  });

  it('calls back with the tapped date when interactive', async () => {
    const onToggleDay = jest.fn();
    const { getByLabelText } = await renderWithProviders(
      <ContributionGrid {...BASE} weeks={2} scrollable={false} onToggleDay={onToggleDay} />,
    );
    await fireEvent.press(getByLabelText('Mon, Sep 14, 2026: missed'));
    expect(onToggleDay).toHaveBeenCalledWith('2026-09-14');
  });

  it('does not let the user log a future day', async () => {
    const onToggleDay = jest.fn();
    const { getByLabelText } = await renderWithProviders(
      <ContributionGrid {...BASE} weeks={2} scrollable={false} onToggleDay={onToggleDay} />,
    );
    await fireEvent.press(getByLabelText('Thu, Sep 17, 2026: not due'));
    expect(onToggleDay).not.toHaveBeenCalled();
  });

  it('does not let the user log a day before the habit existed', async () => {
    const onToggleDay = jest.fn();
    const { getByLabelText } = await renderWithProviders(
      <ContributionGrid
        {...BASE}
        createdAt="2026-09-15"
        weeks={2}
        scrollable={false}
        onToggleDay={onToggleDay}
      />,
    );
    await fireEvent.press(getByLabelText('Mon, Sep 14, 2026: not due'));
    expect(onToggleDay).not.toHaveBeenCalled();
  });

  it('exposes cells as images, not buttons, when read-only', async () => {
    const { getByLabelText } = await renderWithProviders(
      <ContributionGrid {...BASE} weeks={2} scrollable={false} />,
    );
    expect(getByLabelText('Mon, Sep 14, 2026: missed').props.accessibilityRole).toBe('image');
  });

  it('renders month labels when labels are enabled', async () => {
    const { getByText } = await renderWithProviders(
      <ContributionGrid {...BASE} weeks={20} scrollable={false} />,
    );
    expect(getByText('Sep')).toBeTruthy();
  });

  it('renders without labels when asked', async () => {
    const { queryByText } = await renderWithProviders(
      <ContributionGrid {...BASE} weeks={20} scrollable={false} showLabels={false} />,
    );
    expect(queryByText('Sep')).toBeNull();
  });

  it('renders inside a horizontal scroller when scrollable', async () => {
    const { getByLabelText } = await renderWithProviders(
      <ContributionGrid {...BASE} weeks={52} />,
    );
    expect(getByLabelText('Wed, Sep 16, 2026: not due')).toBeTruthy();
  });

  it('marks non-due days of a custom habit as not due, never missed', async () => {
    const { getByLabelText } = await renderWithProviders(
      <ContributionGrid
        {...BASE}
        frequency={{ type: 'custom', days: [1, 3, 5] }}
        weeks={2}
        scrollable={false}
      />,
    );
    expect(getByLabelText('Tue, Sep 15, 2026: not due')).toBeTruthy();
    expect(getByLabelText('Mon, Sep 14, 2026: missed')).toBeTruthy();
  });
});
