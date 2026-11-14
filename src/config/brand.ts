/**
 * Der App-Name steht nur an einer Stelle: in app.json unter "expo.name".
 * Zum Umbenennen dort ändern, der Code liest ihn von hier.
 */
import Constants from 'expo-constants';

export const APP_NAME = Constants.expoConfig?.name ?? 'DayShot';
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
