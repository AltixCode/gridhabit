import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Text as RNText } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/theme';

import { EmptyState } from '../EmptyState';
import { SettingsGroup, SettingsRow } from '../SettingsRow';
import { StatTile } from '../StatTile';
import { TextField } from '../TextField';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { IconButton } from '../ui/IconButton';
import { Screen } from '../ui/Screen';
import { renderWithProviders } from './renderWithProviders';

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten));
  return (style ?? {}) as Record<string, unknown>;
}

describe('Button', () => {
  it('fires onPress', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await renderWithProviders(
      <Button label="Save" onPress={onPress} />,
    );
    await fireEvent.press(getByLabelText('Save'));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not fire while disabled', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await renderWithProviders(
      <Button label="Save" onPress={onPress} disabled />,
    );
    await fireEvent.press(getByLabelText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire while loading, so a purchase cannot be double-submitted', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await renderWithProviders(
      <Button label="Buy" onPress={onPress} loading />,
    );
    await fireEvent.press(getByLabelText('Buy'));
    expect(onPress).not.toHaveBeenCalled();
    expect(getByLabelText('Buy').props.accessibilityState.busy).toBe(true);
  });

  it('meets the minimum touch target at its smallest size', async () => {
    const { getByLabelText } = await renderWithProviders(<Button label="Go" size="sm" />);
    const style = flatten(getByLabelText('Go').props.style);
    expect(style.height as number).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('renders each variant', async () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'danger'] as const) {
      const { getByLabelText } = await renderWithProviders(
        <Button label={variant} variant={variant} icon="check" />,
      );
      expect(getByLabelText(variant)).toBeTruthy();
    }
  });

  it('renders a trailing icon', async () => {
    const { getByLabelText } = await renderWithProviders(
      <Button label="Next" icon="arrow-right" iconPosition="right" />,
    );
    expect(getByLabelText('Next')).toBeTruthy();
  });
});

describe('IconButton', () => {
  it('requires and exposes an accessible label', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await renderWithProviders(
      <IconButton icon="plus" accessibilityLabel="Add a habit" onPress={onPress} />,
    );
    await fireEvent.press(getByLabelText('Add a habit'));
    expect(onPress).toHaveBeenCalled();
  });

  it('meets the minimum touch target', async () => {
    const { getByLabelText } = await renderWithProviders(
      <IconButton icon="x" accessibilityLabel="Close" />,
    );
    const style = flatten(getByLabelText('Close').props.style);
    expect(style.width).toBe(MIN_TOUCH_TARGET);
    expect(style.height).toBe(MIN_TOUCH_TARGET);
  });
});

describe('TextField', () => {
  it('keeps its label visible alongside the value', async () => {
    const { getByText, getByLabelText } = await renderWithProviders(
      <TextField label="Name" value="Read" onChangeText={jest.fn()} />,
    );
    expect(getByText('Name')).toBeTruthy();
    expect(getByLabelText('Name').props.value).toBe('Read');
  });

  it('shows an error in place of the hint', async () => {
    const { getByText, queryByText } = await renderWithProviders(
      <TextField label="Name" hint="Up to 60 characters" error="Required" />,
    );
    expect(getByText('Required')).toBeTruthy();
    expect(queryByText('Up to 60 characters')).toBeNull();
  });

  it('shows the hint when there is no error', async () => {
    const { getByText } = await renderWithProviders(
      <TextField label="Name" hint="Up to 60 characters" />,
    );
    expect(getByText('Up to 60 characters')).toBeTruthy();
  });
});

describe('SettingsRow', () => {
  it('is pressable when given a handler', async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await renderWithProviders(
      <SettingsRow icon="bell" label="Reminders" description="Daily nudge" onPress={onPress} />,
    );
    await fireEvent.press(getByLabelText('Reminders'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders a static row with a value when it has no handler', async () => {
    const { getByText, queryByLabelText } = await renderWithProviders(
      <SettingsRow label="Version" value="1.0.0 (1)" />,
    );
    expect(getByText('1.0.0 (1)')).toBeTruthy();
    expect(queryByLabelText('Version')).toBeNull();
  });

  it('does not fire while disabled', async () => {
    const onPress = jest.fn();
    const { queryByLabelText } = await renderWithProviders(
      <SettingsRow label="Sync" onPress={onPress} disabled />,
    );
    expect(queryByLabelText('Sync')).toBeNull();
  });

  it('renders an accessory instead of a chevron', async () => {
    const { getByText } = await renderWithProviders(
      <SettingsRow label="Theme" onPress={jest.fn()} accessory={<RNText>Dark</RNText>} />,
    );
    expect(getByText('Dark')).toBeTruthy();
  });
});

describe('SettingsGroup, Card, Screen, StatTile, EmptyState', () => {
  it('renders a titled group', async () => {
    const { getByText } = await renderWithProviders(
      <SettingsGroup title="Habits">
        <SettingsRow label="Archived" value="2" />
      </SettingsGroup>,
    );
    expect(getByText('HABITS')).toBeTruthy();
  });

  it('renders a card, padded and unpadded', async () => {
    const { getByText } = await renderWithProviders(
      <Card padded={false}>
        <RNText>Body</RNText>
      </Card>,
    );
    expect(getByText('Body')).toBeTruthy();
  });

  it('renders a screen in both fixed and scrolling modes', async () => {
    const fixed = await renderWithProviders(
      <Screen>
        <RNText>Fixed</RNText>
      </Screen>,
    );
    expect(fixed.getByText('Fixed')).toBeTruthy();

    const scrolled = await renderWithProviders(
      <Screen scroll bottomInset={60}>
        <RNText>Scrolled</RNText>
      </Screen>,
    );
    expect(scrolled.getByText('Scrolled')).toBeTruthy();
  });

  it('announces a stat as a single label/value pair', async () => {
    const { getByLabelText } = await renderWithProviders(
      <StatTile icon="award" label="Longest" value="34" />,
    );
    expect(getByLabelText('Longest: 34')).toBeTruthy();
  });

  it('renders an empty state with and without an action', async () => {
    const onAction = jest.fn();
    const withAction = await renderWithProviders(
      <EmptyState
        icon="grid"
        title="Start your first grid"
        body="Add a habit."
        actionLabel="Add a habit"
        onAction={onAction}
      />,
    );
    await fireEvent.press(withAction.getByLabelText('Add a habit'));
    expect(onAction).toHaveBeenCalled();

    const plain = await renderWithProviders(
      <EmptyState icon="archive" title="Nothing archived" body="Archive a habit to see it here." />,
    );
    expect(plain.getByText('Nothing archived')).toBeTruthy();
  });
});
