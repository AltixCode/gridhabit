import { act } from '@testing-library/react-native';
import React from 'react';

import { usePremiumStore } from '@/store/usePremiumStore';

import { BannerAdSlot } from '../BannerAdSlot';
import { renderWithProviders } from './renderWithProviders';

describe('BannerAdSlot', () => {
  afterEach(async () => {
    await act(async () => {
      usePremiumStore.setState({ isPremium: false, isReady: false });
    });
  });

  it('renders a banner for a free user once entitlements have resolved', async () => {
    usePremiumStore.setState({ isPremium: false, isReady: true });
    const { queryByTestId } = await renderWithProviders(<BannerAdSlot />);
    expect(queryByTestId('banner-ad')).not.toBeNull();
  });

  it('renders nothing for a premium user — the whole point of the upgrade', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: true });
    const { queryByTestId } = await renderWithProviders(<BannerAdSlot />);
    expect(queryByTestId('banner-ad')).toBeNull();
  });

  it('renders nothing while entitlements are still loading, so no ad flashes', async () => {
    usePremiumStore.setState({ isPremium: false, isReady: false });
    const { queryByTestId } = await renderWithProviders(<BannerAdSlot />);
    expect(queryByTestId('banner-ad')).toBeNull();
  });

  it('renders nothing for a premium user even before entitlements resolve', async () => {
    usePremiumStore.setState({ isPremium: true, isReady: false });
    const { queryByTestId } = await renderWithProviders(<BannerAdSlot />);
    expect(queryByTestId('banner-ad')).toBeNull();
  });
});
