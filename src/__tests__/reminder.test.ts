import { DEFAULT_REMINDER, formatTime, parseReminder } from '@/features/notifications/reminder';

describe('Erinnerung', () => {
  it('liest gespeicherte Einstellungen robust', () => {
    expect(parseReminder(null)).toEqual(DEFAULT_REMINDER);
    expect(parseReminder('kaputt')).toEqual(DEFAULT_REMINDER);
    expect(parseReminder('{"enabled":true,"hour":21,"minute":30}')).toEqual({
      enabled: true,
      hour: 21,
      minute: 30,
    });
    expect(parseReminder('{"enabled":true,"hour":99,"minute":-1}')).toEqual({
      enabled: true,
      hour: 19,
      minute: 0,
    });
  });
  it('formatiert Uhrzeiten zweistellig', () => {
    expect(formatTime(8, 5)).toBe('08:05');
  });
});
