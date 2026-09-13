import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PurchasesPackage } from 'react-native-purchases';
import { create } from 'zustand';

import {
  addCustomerInfoListener,
  configurePurchases,
  getCurrentOffering,
  getCustomerInfo,
  hasProEntitlement,
  orderedPackages,
  purchasePackage,
  restorePurchases,
} from '@/monetization/purchases';
import { isPurchasesConfigured } from '@/monetization/config';

const CACHE_KEY = 'gridhabit.entitlement.pro';

interface PremiumState {
  /** The user holds the `pro` entitlement. */
  isPremium: boolean;
  /** Entitlements have resolved at least once — gates ad rendering. */
  isReady: boolean;
  packages: PurchasesPackage[];
  isPurchasing: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  refreshOfferings: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<'purchased' | 'cancelled' | 'error'>;
  restore: () => Promise<'purchased' | 'none' | 'error'>;
  clearError: () => void;
}

let unsubscribe: (() => void) | null = null;

async function cacheEntitlement(isPremium: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, isPremium ? '1' : '0');
  } catch {
    // A cache miss only costs one extra network round-trip next launch.
  }
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: false,
  isReady: false,
  packages: [],
  isPurchasing: false,
  error: null,

  async initialize() {
    // Seed from the cached entitlement first. Without this a paying user who
    // launches offline would briefly be treated as free — and shown an ad.
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached === '1') set({ isPremium: true });
    } catch {
      /* ignore */
    }

    if (!isPurchasesConfigured) {
      // No billing configured (fresh clone, CI smoke build): run as a free app
      // rather than crashing, but never show ads we cannot switch off.
      set({ isReady: false });
      return;
    }

    try {
      await configurePurchases();
      const info = await getCustomerInfo();
      const isPremium = hasProEntitlement(info) || get().isPremium;
      set({ isPremium, isReady: true });
      void cacheEntitlement(isPremium);

      unsubscribe?.();
      unsubscribe = addCustomerInfoListener((next) => {
        const premium = hasProEntitlement(next);
        set({ isPremium: premium });
        void cacheEntitlement(premium);
      });

      void get().refreshOfferings();
    } catch (error) {
      set({ error: (error as Error).message, isReady: true });
    }
  },

  async refreshOfferings() {
    const offering = await getCurrentOffering();
    set({ packages: orderedPackages(offering) });
  },

  async purchase(pkg) {
    set({ isPurchasing: true, error: null });
    const result = await purchasePackage(pkg);
    set({ isPurchasing: false });
    if (result.status === 'purchased') {
      set({ isPremium: result.isPremium });
      void cacheEntitlement(result.isPremium);
    } else if (result.status === 'error') {
      set({ error: result.message ?? 'Purchase failed.' });
    }
    return result.status;
  },

  async restore() {
    set({ isPurchasing: true, error: null });
    const result = await restorePurchases();
    set({ isPurchasing: false });
    if (result.status === 'error') {
      set({ error: result.message ?? 'Could not restore purchases.' });
      return 'error';
    }
    set({ isPremium: result.isPremium });
    void cacheEntitlement(result.isPremium);
    return result.isPremium ? 'purchased' : 'none';
  },

  clearError() {
    set({ error: null });
  },
}));
