import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';

import { Divider, SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { clearAllData, seedDemoData } from '@/dev/seedDatabase';
import { useDb } from '@/hooks/useHabitData';
import { useToday } from '@/hooks/useToday';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, TERMS_URL } from '@/monetization/config';
import { FREE_HABIT_LIMIT, habitSlotsRemaining } from '@/monetization/entitlements';
import { cancelAllReminders } from '@/notifications/reminders';
import { selectActiveHabits, selectArchivedHabits, useHabitsStore } from '@/store/useHabitsStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme, type ThemePreference } from '@/theme';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'Match system',
  light: 'Light',
  dark: 'Dark',
};

export default function SettingsScreen() {
  const router = useRouter();
  const db = useDb();
  const today = useToday();
  const { spacing, preference, setPreference } = useTheme();

  const isPremium = usePremiumStore((s) => s.isPremium);
  const restore = usePremiumStore((s) => s.restore);
  const loadHabits = useHabitsStore((s) => s.load);
  const activeCount = useHabitsStore(selectActiveHabits).length;
  const archivedCount = useHabitsStore(selectArchivedHabits).length;

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

  const handleRestore = useCallback(async () => {
    const status = await restore();
    if (status === 'purchased') Alert.alert('Restored', 'GridHabit Pro is active.');
    else if (status === 'none') Alert.alert('Nothing to restore', 'No previous purchase found.');
    else Alert.alert('Restore failed', 'Please try again.');
  }, [restore]);

  const openManageSubscription = useCallback(() => {
    void Linking.openURL(
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions',
    );
  }, []);

  const handleDisableAllReminders = useCallback(() => {
    Alert.alert('Turn off all reminders?', 'You can re-enable them per habit at any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Turn off',
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
      Alert.alert('Seeded', 'Demo habits with synthetic history are in place.');
    } catch (error) {
      Alert.alert('Could not seed', (error as Error).message);
    }
  }, [db, loadHabits, today]);

  const handleClear = useCallback(() => {
    Alert.alert('Delete all data?', 'This wipes every habit and completion.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete everything',
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
            <Text variant="heading">Go Pro, once</Text>
            <Text variant="callout" tone="muted">
              Remove ads for good, unlock unlimited habits and every theme with a single
              one-time payment.
            </Text>
            <Text variant="caption" tone="faint">
              {slots === 0
                ? `You are using all ${FREE_HABIT_LIMIT} free habits.`
                : `${slots} of ${FREE_HABIT_LIMIT} free habits remaining.`}
            </Text>
            <SettingsRow
              icon="award"
              label="See plans"
              onPress={() => router.push({ pathname: '/paywall', params: { reason: 'remove-ads' } })}
            />
          </View>
        </Card>
      ) : (
        <Card>
          <View style={{ gap: spacing.xs }}>
            <Text variant="heading">GridHabit Pro</Text>
            <Text variant="callout" tone="muted">
              Thank you. Ads are off and every feature is unlocked.
            </Text>
          </View>
        </Card>
      )}

      <SettingsGroup title="Appearance">
        <SettingsRow
          icon="moon"
          label="Theme"
          value={THEME_LABELS[preference]}
          onPress={cycleTheme}
        />
      </SettingsGroup>

      <SettingsGroup title="Habits">
        <SettingsRow
          icon="archive"
          label="Archived habits"
          value={String(archivedCount)}
          onPress={() => router.push('/archive')}
        />
        <Divider />
        <SettingsRow
          icon="bell-off"
          label="Turn off all reminders"
          onPress={handleDisableAllReminders}
        />
      </SettingsGroup>

      <SettingsGroup title="Purchases">
        <SettingsRow
          icon="refresh-cw"
          label="Restore purchases"
          description="Already bought Pro? Restore it here."
          onPress={() => void handleRestore()}
        />
        {isPremium ? (
          <>
            <Divider />
            <SettingsRow
              icon="credit-card"
              label="Manage subscription"
              onPress={openManageSubscription}
            />
          </>
        ) : null}
      </SettingsGroup>

      <SettingsGroup title="About">
        <SettingsRow
          icon="mail"
          label="Contact support"
          onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=GridHabit ${version}`)}
        />
        <Divider />
        <SettingsRow icon="shield" label="Privacy policy" onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} />
        <Divider />
        <SettingsRow icon="file-text" label="Terms of use" onPress={() => void Linking.openURL(TERMS_URL)} />
        <Divider />
        <SettingsRow icon="info" label="Version" value={version} />
      </SettingsGroup>

      {__DEV__ ? (
        <SettingsGroup title="Developer">
          <SettingsRow
            icon="database"
            label="Seed demo data"
            description="Synthetic history for screenshots and dogfooding."
            onPress={() => void handleSeed()}
          />
          <Divider />
          <SettingsRow icon="trash-2" label="Delete all data" destructive onPress={handleClear} />
        </SettingsGroup>
      ) : null}
    </Screen>
  );
}
