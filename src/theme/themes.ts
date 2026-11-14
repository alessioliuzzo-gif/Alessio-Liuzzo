/**
 * Alle Themes der App. Jedes Theme liefert dieselben "Tokens" (Farben, Radien,
 * Schriften). Komponenten greifen nur über diese Tokens auf Farben zu, nie über
 * feste Farbwerte. So lässt sich ein Theme ergänzen, ohne Screens anzufassen.
 */
import { Platform } from 'react-native';

/** Die vier fertigen Themes. */
export type PresetThemeId = 'warm' | 'bold' | 'minimal' | 'pastel';
/** 'custom' ist das selbst zusammengestellte Design (siehe custom.ts). */
export type ThemeId = PresetThemeId | 'custom';

export type ThemeColors = {
  /** Hintergrund des ganzen Screens */
  background: string;
  /** Karten und erhöhte Flächen */
  surface: string;
  /** Zweite Flächenstufe, z. B. leere Kalendertage */
  surfaceAlt: string;
  text: string;
  textMuted: string;
  /** Akzentfarbe für Buttons und Hervorhebungen */
  primary: string;
  /** Text auf der Akzentfarbe */
  onPrimary: string;
  /** Zweite Akzentfarbe für Dekoration (Streak, Sticker) */
  accent: string;
  border: string;
  danger: string;
  success: string;
};

export type Theme = {
  id: ThemeId;
  /** Steuert Statusleiste und Navigations-Grundfarben */
  isDark: boolean;
  colors: ThemeColors;
  radius: { sm: number; md: number; lg: number; pill: number };
  fonts: { heading: string | undefined; body: string | undefined };
};

/** Systemschriften: kein Font-Download nötig, sieht auf jedem Gerät nativ aus. */
const systemFont = (kind: 'sans' | 'serif' | 'rounded'): string | undefined =>
  Platform.select({
    ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded' }[kind],
    android: { sans: 'sans-serif', serif: 'serif', rounded: 'sans-serif' }[kind],
    default: {
      sans: 'system-ui, sans-serif',
      serif: 'Georgia, serif',
      rounded: 'ui-rounded, system-ui, sans-serif',
    }[kind],
  });

export const themes: Record<PresetThemeId, Theme> = {
  warm: {
    id: 'warm',
    isDark: false,
    colors: {
      background: '#FAF4EA',
      surface: '#FFFDF8',
      surfaceAlt: '#F1E7D8',
      text: '#2B2622',
      textMuted: '#6F6358',
      primary: '#B5472F',
      onPrimary: '#FFFFFF',
      accent: '#E0A458',
      border: '#E4D8C6',
      danger: '#B3261E',
      success: '#3F7D4E',
    },
    radius: { sm: 6, md: 12, lg: 20, pill: 999 },
    fonts: { heading: systemFont('serif'), body: systemFont('sans') },
  },
  bold: {
    id: 'bold',
    isDark: true,
    colors: {
      background: '#0E0E12',
      surface: '#18181F',
      surfaceAlt: '#23232D',
      text: '#F5F5F7',
      textMuted: '#A0A0AE',
      primary: '#B6F23C',
      onPrimary: '#10140A',
      accent: '#8B5CF6',
      border: '#2E2E3A',
      danger: '#FF6B6B',
      success: '#4ADE80',
    },
    radius: { sm: 8, md: 14, lg: 22, pill: 999 },
    fonts: { heading: systemFont('sans'), body: systemFont('sans') },
  },
  minimal: {
    id: 'minimal',
    isDark: false,
    colors: {
      background: '#FFFFFF',
      surface: '#F6F6F7',
      surfaceAlt: '#ECECEE',
      text: '#111111',
      textMuted: '#636368',
      primary: '#1F5FE0',
      onPrimary: '#FFFFFF',
      accent: '#111111',
      border: '#E2E2E5',
      danger: '#C62828',
      success: '#2E7D32',
    },
    radius: { sm: 2, md: 4, lg: 8, pill: 999 },
    fonts: { heading: systemFont('sans'), body: systemFont('sans') },
  },
  pastel: {
    id: 'pastel',
    isDark: false,
    colors: {
      background: '#FBF5FF',
      surface: '#FFFFFF',
      surfaceAlt: '#F0E4FA',
      text: '#3A2E4D',
      textMuted: '#6E5F84',
      primary: '#7650C8',
      onPrimary: '#FFFFFF',
      accent: '#FFB5C8',
      border: '#E6D8F2',
      danger: '#C2385A',
      success: '#3E8E6B',
    },
    radius: { sm: 10, md: 18, lg: 28, pill: 999 },
    fonts: { heading: systemFont('rounded'), body: systemFont('rounded') },
  },
};

export const THEME_IDS = Object.keys(themes) as PresetThemeId[];
export const DEFAULT_THEME_ID: ThemeId = 'warm';

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (value === 'custom' || value in themes);
}

/** Abstände in einem festen Raster, damit Screens einheitlich wirken. */
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
