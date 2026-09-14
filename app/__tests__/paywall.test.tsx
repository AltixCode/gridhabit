import { fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { renderWithProviders } from '@/components/__tests__/renderWithProviders';
import { usePremiumStore } from '@/store/usePremiumStore';

import PaywallScreen from '../paywall';

const mockBack = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

const purchase = jest.fn();
const restore = jest.fn();
const refreshOfferings = jest.fn().mockResolvedValue(undefined);

function pkg(identifier: string, price: number, period: string | null): PurchasesPackage {
  return {
    identifier,
    product: { priceString: `$${price.toFixed(2)}`, price, subscriptionPeriod: period },
  } as never;
}

const LIFETIME = pkg('$rc_lifetime', 39.99, null);
const ANNUAL = pkg('$rc_annual', 19.99, 'P1Y');
const MONTHLY = pkg('$rc_monthly', 2.99, 'P1M');

function seed(packages: PurchasesPackage[], over: Record<string, unknown> = {}) {
  usePremiumStore.setState({
    isPremium: false,
    isReady: true,
    packages,
    isPurchasing: false,
    error: null,
    purchase,
    restore,
    refreshOfferings,
    ...over,
  } as never);
}

beforeEach(() => {
  mockParams = {};
  purchase.mockReset().mockResolvedValue('cancelled');
  restore.mockReset().mockResolvedValue('none');
  refreshOfferings.mockClear();
  mockBack.mockClear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  seed([LIFETIME, ANNUAL, MONTHLY]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PaywallScreen', () => {
  it('renders every plan with its price', async () => {
    const { getByText } = await renderWithProviders(<PaywallScreen />);
    expect(getByText('Lifetime')).toBeTruthy();
    expect(getByText('$39.99')).toBeTruthy();
    expect(getByText('Yearly')).toBeTruthy();
    expect(getByText('Monthly')).toBeTruthy();
  });

  it('refreshes offerings on mount', async () => {
    await renderWithProviders(<PaywallScreen />);
    await waitFor(() => expect(refreshOfferings).toHaveBeenCalled());
  });

  it('badges lifetime as the best value', async () => {
    const { getByText } = await renderWithProviders(<PaywallScreen />);
    expect(getByText('BEST VALUE')).toBeTruthy();
  });

  it('shows the yearly saving against the monthly plan', async () => {
    // 12 x 2.99 = 35.88 vs 19.99 -> 44%.
    const { getByText } = await renderWithProviders(<PaywallScreen />);
    expect(getByText('SAVE 44%')).toBeTruthy();
  });

  it('preselects lifetime, so the default CTA is the one-time purchase', async () => {
    const { getByLabelText } = await renderWithProviders(<PaywallScreen />);
    expect(
      getByLabelText('Lifetime, $39.99, One-time payment').props.accessibilityState.selected,
    ).toBe(true);
    expect(getByLabelText('Upgrade for life')).toBeTruthy();
  });

  it('buys the selected plan', async () => {
    const { getByLabelText } = await renderWithProviders(<PaywallScreen />);
    await fireEvent.press(getByLabelText('Upgrade for life'));
    expect(purchase).toHaveBeenCalledWith(LIFETIME);
  });

  it('switches the selection and buys that plan instead', async () => {
    const { getByLabelText } = await renderWithProviders(<PaywallScreen />);
    await fireEvent.press(getByLabelText('Monthly, $2.99, Billed monthly'));
    await waitFor(() => expect(getByLabelText('Continue')).toBeTruthy());
    await fireEvent.press(getByLabelText('Continue'));
    expect(purchase).toHaveBeenCalledWith(MONTHLY);
  });

  it('closes on a successful purchase', async () => {
    purchase.mockResolvedValue('purchased');
    const { getByLabelText } = await renderWithProviders(<PaywallScreen />);
    await fireEvent.press(getByLabelText('Upgrade for life'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('stays open and explains a failed purchase', async () => {
    purchase.mockResolvedValue('error');
    usePremiumStore.setState({ error: 'Card declined' });
    const { getByLabelText } = await renderWithProviders(<PaywallScreen />);
    await fireEvent.press(getByLabelText('Upgrade for life'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Purchase failed', 'Card declined'),
    );
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('says nothing and stays open when the user cancels', async () => {
    purchase.mockResolvedValue('cancelled');
    const { getByLabelText } = await renderWithProviders(<PaywallScreen />);
    await fireEvent.press(getByLabelText('Upgrade for life'));
    await waitFor(() => expect(purchase).toHaveBeenCalled());
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  // App Review tests restore on a fresh install; a missing or broken restore is
  // one of the most common rejection reasons for a paid app.
  it('offers Restore purchases', async () => {
    const { getByText } = await renderWithProviders(<PaywallScreen />);
    expect(getByText('Restore purchases')).toBeTruthy();
  });

  it('restores an existing purchase and closes', async () => {
    restore.mockResolvedValue('purchased');
    const { getByText } = await renderWithProviders(<PaywallScreen />);
    await fireEvent.press(getByText('Restore purchases'));
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('reports when there is nothing to restore', async () => {
    restore.mockResolvedValue('none');
    const { getByText } = await renderWithProviders(<PaywallScreen />);
    await fireEvent.press(getByText('Restore purchases'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Nothing to restore',
        expect.stringContaining('previous purchase'),
      ),
    );
  });

  it('shows the one-time wording for lifetime and the auto-renew disclosure for a subscription', async () => {
    const { getByText, getByLabelText, queryByText } = await renderWithProviders(
      <PaywallScreen />,
    );
    expect(getByText(/One payment\. No subscription\./)).toBeTruthy();
    expect(queryByText(/renew automatically/)).toBeNull();

    await fireEvent.press(getByLabelText('Yearly, $19.99, Billed once a year'));
    await waitFor(() => expect(getByText(/renew automatically/)).toBeTruthy());
  });

  it('explains the reason it was opened', async () => {
    mockParams = { reason: 'habit-limit' };
    const { getByText } = await renderWithProviders(<PaywallScreen />);
    expect(getByText(/4-habit limit/)).toBeTruthy();
  });

  it('falls back to a generic pitch with no reason', async () => {
    const { getByText } = await renderWithProviders(<PaywallScreen />);
    expect(getByText(/Unlock unlimited habits/)).toBeTruthy();
  });

  it('offers a retry rather than a dead end when plans fail to load', async () => {
    seed([]);
    const { getByText, getByLabelText } = await renderWithProviders(<PaywallScreen />);
    expect(getByText(/Plans are unavailable/)).toBeTruthy();
    await fireEvent.press(getByLabelText('Retry'));
    expect(refreshOfferings).toHaveBeenCalled();
  });

  it('disables the CTA while a purchase is in flight', async () => {
    seed([LIFETIME, ANNUAL, MONTHLY], { isPurchasing: true });
    const { getByLabelText } = await renderWithProviders(<PaywallScreen />);
    const cta = getByLabelText('Upgrade for life');
    expect(cta.props.accessibilityState.busy).toBe(true);
    await fireEvent.press(cta);
    expect(purchase).not.toHaveBeenCalled();
  });

  it('closes itself if the user is already premium', async () => {
    seed([LIFETIME], { isPremium: true });
    await renderWithProviders(<PaywallScreen />);
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });
});
