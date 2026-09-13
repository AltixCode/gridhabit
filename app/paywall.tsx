import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { PRIVACY_POLICY_URL, TERMS_URL } from '@/monetization/config';
import {
  FREE_HABIT_LIMIT,
  paywallReasonFor,
  summarizePlan,
  type PaywallReason,
} from '@/monetization/entitlements';
import { toPlanLike } from '@/monetization/purchases';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme, withAlpha } from '@/theme';

const BENEFITS: Array<{ icon: keyof typeof Feather.glyphMap; title: string; body: string }> = [
  {
    icon: 'zap-off',
    title: 'No ads, ever',
    body: 'One tap, and the banner is gone for good.',
  },
  {
    icon: 'grid',
    title: 'Unlimited habits',
    body: `Go past the ${FREE_HABIT_LIMIT}-habit free limit.`,
  },
  {
    icon: 'droplet',
    title: 'Every colour and theme',
    body: 'Make the grid yours.',
  },
  {
    icon: 'download',
    title: 'Export your history',
    body: 'Your data stays yours — CSV or JSON, any time.',
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, radius, spacing } = useTheme();
  const { reason } = useLocalSearchParams<{ reason?: PaywallReason }>();

  const packages = usePremiumStore((s) => s.packages);
  const isPurchasing = usePremiumStore((s) => s.isPurchasing);
  const isPremium = usePremiumStore((s) => s.isPremium);
  const purchase = usePremiumStore((s) => s.purchase);
  const restore = usePremiumStore((s) => s.restore);
  const refreshOfferings = usePremiumStore((s) => s.refreshOfferings);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void refreshOfferings();
  }, [refreshOfferings]);

  useEffect(() => {
    if (!selectedId && packages.length > 0) setSelectedId(packages[0]!.identifier);
  }, [packages, selectedId]);

  useEffect(() => {
    if (isPremium) router.back();
  }, [isPremium, router]);

  const monthlyBaseline = useMemo(
    () => packages.map(toPlanLike).find((p) => p.periodUnit === 'MONTH'),
    [packages],
  );

  const selected = packages.find((p) => p.identifier === selectedId) ?? packages[0] ?? null;

  const handlePurchase = useCallback(async () => {
    if (!selected) return;
    const status = await purchase(selected);
    if (status === 'purchased') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else if (status === 'error') {
      Alert.alert('Purchase failed', usePremiumStore.getState().error ?? 'Please try again.');
    }
  }, [purchase, router, selected]);

  const handleRestore = useCallback(async () => {
    const status = await restore();
    if (status === 'purchased') {
      Alert.alert('Restored', 'Your GridHabit Pro purchase is active again.');
      router.back();
    } else if (status === 'none') {
      Alert.alert('Nothing to restore', 'We could not find a previous purchase on this account.');
    } else {
      Alert.alert('Restore failed', usePremiumStore.getState().error ?? 'Please try again.');
    }
  }, [restore, router]);

  const isSubscriptionSelected =
    selected !== null && toPlanLike(selected).periodUnit !== null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.sm }}>
        <IconButton icon="x" accessibilityLabel="Close" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: spacing.sm }}>
          <View style={[styles.badge, { backgroundColor: withAlpha(colors.accent, 0.14), borderRadius: radius.full }]}>
            <Feather name="award" size={13} color={colors.accent} />
            <Text variant="micro" tone="accent">
              GRIDHABIT PRO
            </Text>
          </View>
          <Text variant="display">Own it once.{'\n'}Keep it forever.</Text>
          <Text variant="body" tone="muted">
            {paywallReasonFor(reason ?? 'generic')}
          </Text>
        </View>

        <View style={{ gap: spacing.base }}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={[styles.benefit, { gap: spacing.md }]}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: withAlpha(colors.accent, 0.12),
                }}
              >
                <Feather name={benefit.icon} size={17} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="bodyStrong">{benefit.title}</Text>
                <Text variant="caption" tone="muted">
                  {benefit.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {packages.length === 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="callout" tone="muted" align="center">
              Plans are unavailable right now. Check your connection and try again.
            </Text>
            <Button label="Retry" variant="secondary" fullWidth onPress={() => void refreshOfferings()} />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {packages.map((pkg) => (
              <PlanOption
                key={pkg.identifier}
                pkg={pkg}
                monthlyBaseline={monthlyBaseline}
                selected={pkg.identifier === selected?.identifier}
                onSelect={() => {
                  void Haptics.selectionAsync();
                  setSelectedId(pkg.identifier);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.base,
          paddingTop: spacing.md,
          gap: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <Button
          label={selected && summarizePlan(toPlanLike(selected)).isLifetime ? 'Upgrade for life' : 'Continue'}
          size="lg"
          fullWidth
          disabled={!selected}
          loading={isPurchasing}
          onPress={() => void handlePurchase()}
        />

        {/* App Review explicitly tests restore on a fresh install. */}
        <View style={[styles.links, { gap: spacing.base }]}>
          <Pressable onPress={() => void handleRestore()} hitSlop={10} accessibilityRole="button">
            <Text variant="caption" tone="muted">
              Restore purchases
            </Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(TERMS_URL)} hitSlop={10} accessibilityRole="link">
            <Text variant="caption" tone="muted">
              Terms
            </Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} hitSlop={10} accessibilityRole="link">
            <Text variant="caption" tone="muted">
              Privacy
            </Text>
          </Pressable>
        </View>

        {isSubscriptionSelected ? (
          <Text variant="micro" tone="faint" align="center">
            Subscriptions renew automatically until cancelled. Manage or cancel any time in your
            store account settings.
          </Text>
        ) : (
          <Text variant="micro" tone="faint" align="center">
            One payment. No subscription. Yours on every device signed in to this store account.
          </Text>
        )}
      </View>
    </View>
  );
}

function PlanOption({
  pkg,
  monthlyBaseline,
  selected,
  onSelect,
}: {
  pkg: PurchasesPackage;
  monthlyBaseline: ReturnType<typeof toPlanLike> | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const { colors, radius, spacing } = useTheme();
  const plan = toPlanLike(pkg);
  const summary = summarizePlan(plan, monthlyBaseline);

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${summary.title}, ${plan.priceString}, ${summary.cadence}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.base,
        borderRadius: radius.lg,
        backgroundColor: selected ? withAlpha(colors.accent, 0.08) : colors.surface,
        borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
        borderColor: selected ? colors.accent : colors.border,
      }}
    >
      <Feather
        name={selected ? 'check-circle' : 'circle'}
        size={20}
        color={selected ? colors.accent : colors.borderStrong}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="bodyStrong">{summary.title}</Text>
          {summary.isLifetime ? <Pill label="BEST VALUE" /> : null}
          {summary.savingsPercent ? <Pill label={`SAVE ${summary.savingsPercent}%`} /> : null}
        </View>
        <Text variant="caption" tone="muted">
          {summary.cadence}
        </Text>
      </View>
      <Text variant="bodyStrong">{plan.priceString}</Text>
    </Pressable>
  );
}

function Pill({ label }: { label: string }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: radius.xs,
        backgroundColor: colors.accent,
      }}
    >
      <Text variant="micro" color={colors.onAccent}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  benefit: { flexDirection: 'row', alignItems: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center' },
});
