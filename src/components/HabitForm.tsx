import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import { Platform, Switch, View } from 'react-native';

import type { Habit } from '@/db/types';
import type { Frequency } from '@/logic/frequency';
import { isNeverDue } from '@/logic/frequency';
import { formatReminderTime, parseReminderTime } from '@/notifications/schedule';
import { DEFAULT_HABIT_COLOR, useTheme } from '@/theme';

import { ColorPicker, FrequencyPicker, IconPicker } from './pickers';
import { SettingsRow } from './SettingsRow';
import { TextField } from './TextField';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Text } from './ui/Text';

export interface HabitFormValues {
  name: string;
  color: string;
  icon: string | null;
  frequency: Frequency;
  reminderEnabled: boolean;
  reminderTime: string | null;
}

interface HabitFormProps {
  initial?: Habit;
  submitLabel: string;
  onSubmit: (values: HabitFormValues) => Promise<void> | void;
  busy?: boolean;
}

const DEFAULT_REMINDER_TIME = '09:00';

function reminderDate(time: string | null): Date {
  const parsed = parseReminderTime(time) ?? { hour: 9, minute: 0 };
  const date = new Date();
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return date;
}

function formatForDisplay(time: string | null): string {
  const parsed = parseReminderTime(time);
  if (!parsed) return '—';
  const date = new Date();
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Shared create/edit form. One implementation keeps the two screens identical. */
export function HabitForm({ initial, submitLabel, onSubmit, busy = false }: HabitFormProps) {
  const { spacing } = useTheme();

  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? DEFAULT_HABIT_COLOR);
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? { type: 'daily' });
  const [reminderEnabled, setReminderEnabled] = useState(initial?.reminderEnabled ?? false);
  const [reminderTime, setReminderTime] = useState<string | null>(
    initial?.reminderTime ?? DEFAULT_REMINDER_TIME,
  );
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');
  const [touched, setTouched] = useState(false);

  const error = useMemo(() => {
    // Deselecting every weekday is an explicit action, so explain it straight
    // away rather than leaving the user with a silently disabled button.
    if (isNeverDue(frequency)) return 'Pick at least one day.';
    if (!touched) return null;
    if (name.trim().length === 0) return 'Give your habit a name.';
    if (name.trim().length > 60) return 'Keep the name under 60 characters.';
    return null;
  }, [name, frequency, touched]);

  const canSubmit = name.trim().length > 0 && !isNeverDue(frequency) && !busy;

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;
    void onSubmit({
      name: name.trim(),
      color,
      icon,
      frequency,
      reminderEnabled,
      reminderTime: reminderEnabled ? (reminderTime ?? DEFAULT_REMINDER_TIME) : null,
    });
  };

  return (
    <View style={{ gap: spacing.xl }}>
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        onBlur={() => setTouched(true)}
        placeholder="Meditate, Read, Run…"
        autoFocus={!initial}
        maxLength={60}
        returnKeyType="done"
        error={error}
      />

      <View style={{ gap: spacing.md }}>
        <Text variant="caption" tone="muted">
          Colour
        </Text>
        <ColorPicker value={color} onChange={setColor} />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text variant="caption" tone="muted">
          Icon (optional)
        </Text>
        <IconPicker value={icon} onChange={setIcon} tint={color} />
      </View>

      <View style={{ gap: spacing.md }}>
        <Text variant="caption" tone="muted">
          Repeat
        </Text>
        <FrequencyPicker value={frequency} onChange={setFrequency} tint={color} />
      </View>

      <Card padded={false}>
        <SettingsRow
          icon="bell"
          label="Daily reminder"
          description="A quiet nudge at the time you choose."
          accessory={
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              accessibilityLabel="Enable daily reminder"
              trackColor={{ true: color }}
            />
          }
        />
        {reminderEnabled ? (
          Platform.OS === 'ios' || showTimePicker ? (
            <View style={{ paddingHorizontal: spacing.base, paddingBottom: spacing.sm }}>
              <DateTimePicker
                value={reminderDate(reminderTime)}
                mode="time"
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') setShowTimePicker(false);
                  if (event.type === 'dismissed' || !date) return;
                  setReminderTime(formatReminderTime(date.getHours(), date.getMinutes()));
                }}
              />
            </View>
          ) : (
            <SettingsRow
              icon="clock"
              label="Reminder time"
              value={formatForDisplay(reminderTime)}
              onPress={() => setShowTimePicker(true)}
            />
          )
        ) : null}
      </Card>

      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={busy}
        disabled={!canSubmit}
        fullWidth
        size="lg"
        tint={color}
      />
    </View>
  );
}
