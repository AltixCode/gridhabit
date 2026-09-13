import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { todayKey, type DateKey } from '@/logic/dates';

/**
 * The current LOCAL date, kept fresh.
 *
 * A habit app is routinely left open across midnight, and a timer alone is not
 * enough: a backgrounded app's timers are throttled or suspended, and the
 * device's timezone can change while it is away (a flight, a DST shift). So we
 * re-read the date on every foreground AND schedule a wake-up for the next
 * local midnight, recomputed each time rather than assuming 24h intervals.
 */
export function useToday(): DateKey {
  const [today, setToday] = useState<DateKey>(() => todayKey());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      if (cancelled) return;
      setToday((current) => {
        const next = todayKey();
        return next === current ? current : next;
      });
      scheduleNextMidnight();
    };

    const scheduleNextMidnight = () => {
      if (timer.current) clearTimeout(timer.current);
      const now = new Date();
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        5, // A few seconds past midnight, to avoid a boundary race.
      );
      // Clamp: setTimeout overflows past ~24.8 days, and a bogus system clock
      // should not produce a negative delay that fires in a tight loop.
      const delay = Math.min(Math.max(midnight.getTime() - now.getTime(), 1_000), 86_400_000);
      timer.current = setTimeout(sync, delay);
    };

    scheduleNextMidnight();

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') sync();
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      subscription.remove();
    };
  }, []);

  return today;
}
