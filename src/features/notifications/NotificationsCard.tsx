/**
 * Profil-Karte: tägliche Erinnerung ein/aus und Uhrzeit.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Notice } from '@/components/form';
import { AppText, Card } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

import { applyReminder, loadReminder, registerForPush } from './notifications';
import { DEFAULT_REMINDER, formatTime, REMINDER_HOURS, type ReminderSettings } from './reminder';

export function NotificationsCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    void loadReminder().then(setSettings);
  }, []);

  async function update(next: ReminderSettings) {
    setSettings(next);
    const ok = await applyReminder(next, {
      title: t('notifications.reminderTitle'),
      body: t('notifications.reminderBody'),
    });
    setDenied(next.enabled && !ok && Platform.OS !== 'web');
    if (ok && next.enabled) void registerForPush();
  }

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.flex}>
          <AppText variant="heading">{t('notifications.title')}</AppText>
          <AppText variant="caption" muted>
            {t('notifications.reminderHint')}
          </AppText>
        </View>
        <Switch
          accessibilityLabel={t('notifications.title')}
          value={settings.enabled}
          onValueChange={(enabled) => void update({ ...settings, enabled })}
          trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
        />
      </View>
      {settings.enabled && (
        <View accessibilityRole="radiogroup" style={styles.hours}>
          {REMINDER_HOURS.map((hour) => {
            const active = settings.hour === hour;
            return (
              <Pressable
                key={hour}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => void update({ ...settings, hour, minute: 0 })}
                style={[
                  styles.hour,
                  {
                    borderRadius: theme.radius.pill,
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                  },
                ]}>
                <AppText
                  variant="caption"
                  style={{
                    color: active ? theme.colors.onPrimary : theme.colors.text,
                    fontWeight: '600',
                  }}>
                  {formatTime(hour, 0)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
      {denied && <Notice kind="error">{t('notifications.denied')}</Notice>}
      {Platform.OS === 'web' && (
        <AppText variant="caption" muted>
          {t('notifications.webHint')}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  hours: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hour: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
