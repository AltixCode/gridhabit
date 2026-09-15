import { act } from '@testing-library/react-native';
import React from 'react';

import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { usePremiumStore } from '@/store/usePremiumStore';

import { BannerAdSlot } from '../BannerAdSlot';
import { renderWithProviders } from './renderWithProviders';

describe('BannerAdSlot', () => {
  beforeEach(async () => {
    // Consent is the precondition for any ad request; these cases are about entitlement, so
    // they start from a user whose region either does not require a form or has answered one.
    await act(async () => {
      useAdsConsentStore.setState({ consent: { canServeAds: true, offerPrivacyOptions: false } });
    });
  });

  afterEach(async () => {
    await act(async () => {
      usePremiumStore.setState({ isPremium: false, isReady: false });
      useAdsConsentStore.getState().resetForTests();
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

  it('renders nothing until UMP consent permits an ad request', async () => {
    // An EEA user who has not answered the consent form must not have an ad requested on
    // their behalf -- that is the breach that gets an AdMob account suspended, and it is
    // invisible in testing because ads keep serving everywhere else.
    useAdsConsentStore.setState({
      consent: { canServeAds: false, offerPrivacyOptions: true },
    });
    usePremiumStore.setState({ isPremium: false, isReady: true });
    const { queryByTestId } = await renderWithProviders(<BannerAdSlot />);
    expect(queryByTestId('banner-ad')).toBeNull();
  });
});
