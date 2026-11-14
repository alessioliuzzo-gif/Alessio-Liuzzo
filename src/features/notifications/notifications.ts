/**
 * Benachrichtigungen: tägliche Erinnerung (lokal auf dem Gerät geplant) und
 * Push bei neuen Nachrichten (über Expo, ausgelöst vom Server).
 *
 * Hinweis: Push vom Server funktioniert nur in einem Dev-Build bzw. der
 * veröffentlichten App, nicht in Expo Go. Die tägliche Erinnerung ist lokal
 * und funktioniert auch ohne Server.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { readSetting, StorageKeys, writeSetting } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

import { parseReminder, type ReminderSettings } from './reminder';

const REMINDER_ID = 'daily-photo-reminder';

// Benachrichtigungen auch anzeigen, wenn die App offen ist.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function loadReminder(): Promise<ReminderSettings> {
  return parseReminder(await readSetting(StorageKeys.reminder));
}

/** Fragt das System um Erlaubnis. Gibt true zurück, wenn Benachrichtigungen erlaubt sind. */
export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Plant (oder entfernt) die tägliche Erinnerung und speichert die Wahl. */
export async function applyReminder(
  settings: ReminderSettings,
  texts: { title: string; body: string },
): Promise<boolean> {
  await writeSetting(StorageKeys.reminder, JSON.stringify(settings));
  if (Platform.OS === 'web') return false;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  if (!settings.enabled) return true;
  if (!(await ensurePermission())) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: texts.title,
      importance: AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: texts.title, body: texts.body, data: { url: '/today' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.hour,
      minute: settings.minute,
      channelId: 'reminders',
    },
  });
  return true;
}

/**
 * Meldet das Gerät für Push bei neuen Nachrichten an. Scheitert still in
 * Expo Go, im Simulator und ohne Erlaubnis.
 */
export async function registerForPush(): Promise<void> {
  if (!supabase || Platform.OS === 'web' || !Device.isDevice) return;
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!permission.granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase
      .from('push_tokens')
      .upsert(
        { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
        { onConflict: 'token' },
      );
  } catch {
    // Push ist optional; die App funktioniert auch ohne.
  }
}
