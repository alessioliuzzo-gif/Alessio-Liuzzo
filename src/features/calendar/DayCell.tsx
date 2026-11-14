/**
 * Ein Feld im Kalender: leer, mit Tageszahl oder mit Mini-Foto.
 * Das Aussehen hängt vom gewählten Kalenderdesign ab.
 */
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import type { CalendarDesign } from '@/features/rewards/rewards';
import { useTheme } from '@/theme/ThemeProvider';

export function DayCell({
  day,
  inMonth,
  isToday,
  thumbUrl,
  hasPhoto,
  design,
  compact = false,
  label,
  onPress,
}: {
  day: number;
  inMonth: boolean;
  isToday: boolean;
  thumbUrl?: string;
  hasPhoto: boolean;
  design: CalendarDesign;
  /** Für die Jahresübersicht: ohne Zahl, ganz klein */
  compact?: boolean;
  label?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const round = design === 'round';
  const polaroid = design === 'polaroid';
  const radius = round ? 999 : compact ? 2 : theme.radius.sm;

  if (!inMonth) return <View style={[styles.cell, round && styles.square]} />;

  return (
    <Pressable
      accessibilityRole={hasPhoto ? 'button' : undefined}
      accessibilityLabel={label}
      disabled={!hasPhoto || !onPress}
      onPress={onPress}
      style={[
        styles.cell,
        round && styles.square,
        {
          borderRadius: radius,
          backgroundColor: polaroid && hasPhoto ? '#FDFBF6' : theme.colors.surfaceAlt,
          borderColor: isToday ? theme.colors.primary : 'transparent',
          borderWidth: compact ? 0 : 2,
          padding: polaroid && hasPhoto ? (compact ? 1 : 3) : 0,
          paddingBottom: polaroid && hasPhoto ? (compact ? 3 : 9) : 0,
        },
      ]}>
      {thumbUrl ? (
        <Image
          source={{ uri: thumbUrl }}
          contentFit="cover"
          transition={120}
          style={[styles.image, { borderRadius: polaroid ? 1 : Math.max(0, radius - 2) }]}
        />
      ) : hasPhoto ? (
        // Foto vorhanden, Vorschaubild lädt noch.
        <View
          style={[
            styles.image,
            { backgroundColor: theme.colors.accent, opacity: 0.35, borderRadius: radius },
          ]}
        />
      ) : null}
      {!compact && !hasPhoto && (
        <AppText
          variant="caption"
          muted={!isToday}
          style={[styles.number, isToday && { color: theme.colors.primary, fontWeight: '700' }]}>
          {day}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Hochformat 3:4 wie die Fotos.
  cell: { flex: 1, aspectRatio: 3 / 4, overflow: 'hidden' },
  square: { aspectRatio: 1 },
  image: { flex: 1, width: '100%' },
  number: { position: 'absolute', top: 3, left: 5 },
});
