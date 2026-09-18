import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';

import { Divider, SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { clearAllData, seedDemoData } from '@/dev/seedDatabase';
import { shareExport } from '@/export/shareExport';
import type { ExportFormat } from '@/export/serialize';
import { useDb } from '@/hooks/useHabitData';
import { useToday } from '@/hooks/useToday';
import { t, type TranslationKey } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { showPrivacyOptionsForm } from '@/monetization/ads';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/monetization/config';
import { FREE_HABIT_LIMIT, habitSlotsRemaining } from '@/monetization/entitlements';
import { cancelAllReminders } from '@/notifications/reminders';
import {
  selectActiveHabitCount,
  selectArchivedHabitCount,
  useHabitsStore,
} from '@/store/useHabitsStore';
import { useAdsConsentStore } from '@/store/useAdsConsentStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme, type ThemePreference } from '@/theme';

const THEME_LABEL_KEY: Record<ThemePreference, TranslationKey> = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
};

export default function SettingsScreen() {
  const router = useRouter();
  const db = useDb();
  const today = useToday();
  const { spacing, preference, setPreference } = useTheme();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const offerPrivacyOptions = useAdsConsentStore((s) => s.consent.offerPrivacyOptions);
  const restore = usePremiumStore((s) => s.restore);
  const loadHabits = useHabitsStore((s) => s.load);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const activeCount = useHabitsStore(selectActiveHabitCount);
  const archivedCount = useHabitsStore(selectArchivedHabitCount);

  const slots = habitSlotsRemaining(activeCount, isPremium);

  const version = useMemo(() => {
    const v = Application.nativeApplicationVersion ?? '1.0.0';
    const build = Application.nativeBuildVersion ?? '1';
    return `${v} (${build})`;
  }, []);

  const cycleTheme = useCallback(() => {
    const order: ThemePreference[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(preference) + 1) % order.length]!;
    setPreference(next);
  }, [preference, setPreference]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!isPremium) {
        router.push({ pathname: '/paywall', params: { reason: 'export' } });
        return;
      }
      setExporting(format);
      const result = await shareExport(db, format, today);
      setExporting(null);

      if (result.status === 'empty') {
        Alert.alert(t('exportEmptyTitle'), t('addHabitFirstBody'));
      } else if (result.status === 'unavailable') {
        Alert.alert(t('sharingUnavailableTitle'), t('cannotShareFilesBody'));
      } else if (result.status === 'error') {
        Alert.alert(t('exportFailedTitle'), result.message);
      }
    },
    [db, isPremium, router, today],
  );

  const handleRestore = useCallback(async () => {
    const status = await restore();
    if (status === 'purchased') Alert.alert(t('restored'), t('gridHabitProActiveBody'));
    else if (status === 'none') Alert.alert(t('nothingToRestoreTitle'), t('noPreviousPurchaseBody'));
    else Alert.alert(t('restoreFailedTitle'), t('pleaseTryAgain'));
  }, [restore]);

  const openManageSubscription = useCallback(() => {
    void Linking.openURL(
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions',
    );
  }, []);

  const handleDisableAllReminders = useCallback(() => {
    Alert.alert(t('turnOffAllRemindersTitle'), t('turnOffAllRemindersBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('turnOffAction'),
        style: 'destructive',
        onPress: () => void cancelAllReminders(),
      },
    ]);
  }, []);

  // Development-only helpers for dogfooding and store screenshots. `__DEV__`
  // is statically false in a release build, so this is stripped by the bundler.
  const handleSeed = useCallback(async () => {
    try {
      await seedDemoData(db, today);
      await loadHabits(db);
      Alert.alert(t('seededTitle'), t('seededBody'));
    } catch (error) {
      Alert.alert(t('couldNotSeedTitle'), (error as Error).message);
    }
  }, [db, loadHabits, today]);

  const handleClear = useCallback(() => {
    Alert.alert(t('deleteAllDataTitle'), t('deleteAllDataBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteEverythingAction'),
        style: 'destructive',
        onPress: () => {
          void clearAllData(db).then(() => loadHabits(db));
        },
      },
    ]);
  }, [db, loadHabits]);

  return (
    <Screen scroll contentContainerStyle={{ gap: spacing.xl, paddingTop: spacing.base }}>
      {!isPremium ? (
        <Card>
          <View style={{ gap: spacing.sm }}>
            <Text variant="heading">{t('goProTitle')}</Text>
            <Text variant="callout" tone="muted">
              {t('goProDesc')}
            </Text>
            <Text variant="caption" tone="faint">
              {slots === 0
                ? t('usingAllFreeHabits', { n: FREE_HABIT_LIMIT })
                : t('freeHabitsRemaining', { slots, n: FREE_HABIT_LIMIT })}
            </Text>
            <SettingsRow
              icon="award"
              label={t('seePlansLabel')}
              onPress={() => router.push({ pathname: '/paywall', params: { reason: 'remove-ads' } })}
            />
          </View>
        </Card>
      ) : (
        <Card>
          <View style={{ gap: spacing.xs }}>
            <Text variant="heading">{t('gridHabitProTitle')}</Text>
            <Text variant="callout" tone="muted">
              {t('gridHabitProThankYou')}
            </Text>
          </View>
        </Card>
      )}

      <SettingsGroup title={t('appearanceGroupTitle')}>
        <SettingsRow
          icon="moon"
          label={t('themeRowLabel')}
          value={t(THEME_LABEL_KEY[preference])}
          onPress={cycleTheme}
        />
      </SettingsGroup>

      <SettingsGroup title={t('habitsGroupTitle')}>
        <SettingsRow
          icon="list"
          label={t('reorderHabitsLabel')}
          description={t('reorderHabitsDesc')}
          onPress={() => router.push('/reorder')}
        />
        <Divider />
        <SettingsRow
          icon="archive"
          label={t('archivedHabitsLabel')}
          value={String(archivedCount)}
          onPress={() => router.push('/archive')}
        />
        <Divider />
        <SettingsRow
          icon="bell-off"
          label={t('turnOffAllRemindersLabel')}
          onPress={handleDisableAllReminders}
        />
      </SettingsGroup>

      <SettingsGroup title={t('yourDataGroupTitle')}>
        <SettingsRow
          icon="file-text"
          label={t('exportCsvLabel')}
          description={t('exportCsvDesc')}
          value={exporting === 'csv' ? t('preparingLabel') : isPremium ? undefined : t('proLabel')}
          onPress={() => void handleExport('csv')}
          disabled={exporting !== null}
        />
        <Divider />
        <SettingsRow
          icon="code"
          label={t('exportJsonLabel')}
          description={t('exportJsonDesc')}
          value={exporting === 'json' ? t('preparingLabel') : isPremium ? undefined : t('proLabel')}
          onPress={() => void handleExport('json')}
          disabled={exporting !== null}
        />
      </SettingsGroup>

      <SettingsGroup title={t('purchasesGroupTitle')}>
        <SettingsRow
          icon="refresh-cw"
          label={t('restorePurchasesLabel')}
          description={t('restorePurchasesDesc')}
          onPress={() => void handleRestore()}
        />
        {isPremium ? (
          <>
            <Divider />
            <SettingsRow
              icon="credit-card"
              label={t('manageSubscriptionLabel')}
              onPress={openManageSubscription}
            />
          </>
        ) : null}
      </SettingsGroup>

      <SettingsGroup title={t('aboutGroupTitle')}>
        <SettingsRow
          icon="mail"
          label={t('contactSupportLabel')}
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=GridHabit ${version}`)}
        />
        <Divider />
        <SettingsRow icon="shield" label={t('privacyPolicyLabel')} onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} />
        {offerPrivacyOptions ? (
          <>
            <Divider />
            {/* Google requires a standing entry back into the consent form wherever UMP
                reports that privacy options exist -- in practice the EEA and the regulated
                US states. It is absent elsewhere rather than shown as a dead control. */}
            <SettingsRow
              icon="sliders"
              label={t('adPrivacySettingsLabel')}
              description={t('adPrivacySettingsDesc')}
              onPress={() => void showPrivacyOptionsForm()}
            />
          </>
        ) : null}
        <Divider />
        <SettingsRow icon="file-text" label={t('termsOfUseLabel')} onPress={() => void Linking.openURL(TERMS_URL)} />
        <Divider />
        <SettingsRow icon="info" label={t('versionRowLabel')} value={version} />
      </SettingsGroup>

      {__DEV__ ? (
        <SettingsGroup title={t('developerGroupTitle')}>
          <SettingsRow
            icon="database"
            label={t('seedDemoDataLabel')}
            description={t('seedDemoDataDesc')}
            onPress={() => void handleSeed()}
          />
          <Divider />
          <SettingsRow icon="trash-2" label={t('deleteAllDataLabel')} destructive onPress={handleClear} />
        </SettingsGroup>
      ) : null}
    </Screen>
  );
}
