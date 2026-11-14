/**
 * Einstellungen der täglichen Erinnerung. Reine Logik.
 */
export type ReminderSettings = { enabled: boolean; hour: number; minute: number };

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 19, minute: 0 };

/** Zur Auswahl angebotene Uhrzeiten. */
export const REMINDER_HOURS = [8, 12, 17, 19, 21] as const;

export function parseReminder(raw: string | null): ReminderSettings {
  if (!raw) return DEFAULT_REMINDER;
  try {
    const value = JSON.parse(raw) as Partial<ReminderSettings>;
    const hour =
      Number.isInteger(value.hour) && value.hour! >= 0 && value.hour! <= 23
        ? value.hour!
        : DEFAULT_REMINDER.hour;
    const minute =
      Number.isInteger(value.minute) && value.minute! >= 0 && value.minute! <= 59
        ? value.minute!
        : 0;
    return { enabled: value.enabled === true, hour, minute };
  } catch {
    return DEFAULT_REMINDER;
  }
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
