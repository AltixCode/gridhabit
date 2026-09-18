import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerAdSlot } from '@/components/BannerAdSlot';
import { EmptyState } from '@/components/EmptyState';
import { HabitCard } from '@/components/HabitCard';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { useDb } from '@/hooks/useHabitData';
import { useToday } from '@/hooks/useToday';
import { getDeviceLanguage, t } from '@/i18n';
import { formatDateKeyLong } from '@/logic/dates';
import { isHabitDueOn, isNeverDue } from '@/logic/frequency';
import { canAddHabit } from '@/monetization/entitlements';
import { useShallow } from 'zustand/react/shallow';

import { selectActiveHabits, useHabitsStore } from '@/store/useHabitsStore';
import { usePremiumStore } from '@/store/usePremiumStore';
import { useTheme } from '@/theme';
import { useTabletColumn } from '@/theme/useTabletColumn';

export default function HomeScreen() {
  const router = useRouter();
  const db = useDb();
  const today = useToday();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const tabletColumn = useTabletColumn();

  // useShallow: the selector builds a new array, which would otherwise make
  // zustand report a change on every render and loop forever.
  const habits = useHabitsStore(useShallow(selectActiveHabits));
  const completions = useHabitsStore((s) => s.completions);
  const status = useHabitsStore((s) => s.status);
  const load = useHabitsStore((s) => s.load);
  const setCompletion = useHabitsStore((s) => s.setCompletion);
  const isPremium = usePremiumStore((s) => s.isPremium);

  useEffect(() => {
    void load(db);
  }, [db, load]);

  const dueToday = useMemo(
    () =>
      habits.filter((h) => !isNeverDue(h.frequency) && isHabitDueOn(h.frequency, today)),
    [habits, today],
  );
  const doneToday = useMemo(
    () => dueToday.filter((h) => (completions[h.id] ?? []).includes(today)).length,
    [dueToday, completions, today],
  );

  const handleToggle = useCallback(
    (habitId: string) => {
      const isDone = (useHabitsStore.getState().completions[habitId] ?? []).includes(today);
      void setCompletion(db, habitId, today, !isDone);
    },
    [db, setCompletion, today],
  );

  const handleAdd = useCallback(() => {
    if (canAddHabit(habits.length, isPremium)) router.push('/habit/new');
    else router.push({ pathname: '/paywall', params: { reason: 'habit-limit' } });
  }, [habits.length, isPremium, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={habits}
        keyExtractor={(habit) => habit.id}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.base,
          paddingBottom: spacing['3xl'],
          gap: spacing.md,
        
          ...tabletColumn,
        }}
        ListHeaderComponent={
          <View style={{ gap: spacing.xs, marginBottom: spacing.base }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="muted">
                  {formatDateKeyLong(today, getDeviceLanguage())}
                </Text>
                <Text variant="display">{t('todayLabel')}</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <IconButton
                  icon="plus"
                  accessibilityLabel={t('addHabitA11y')}
                  onPress={handleAdd}
                />
                <IconButton
                  icon="settings"
                  accessibilityLabel={t('settingsA11y')}
                  onPress={() => router.push('/settings')}
                />
              </View>
            </View>
            {dueToday.length > 0 ? (
              <Text variant="callout" tone="muted" accessibilityLiveRegion="polite">
                {t('doneOfTotal', { done: doneToday, total: dueToday.length })}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <HabitCard
            habit={item}
            completions={completions[item.id] ?? []}
            today={today}
            onToggleToday={handleToggle}
          />
        )}
        ListEmptyComponent={
          status === 'ready' ? (
            <EmptyState
              icon="grid"
              title={t('emptyHomeTitle')}
              body={t('emptyHomeBody')}
              actionLabel={t('addHabitA11y')}
              onAction={handleAdd}
            />
          ) : null
        }
        // Rows are a fixed, known height; this keeps a long list smooth.
        removeClippedSubviews
        initialNumToRender={6}
        windowSize={9}
      />
      <BannerAdSlot />
    </View>
  );
}
