/**
 * Bausteine für alles Soziale: Profilbild, Nutzerzeile und das Menü zum
 * Melden und Blockieren.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { avatarUrl } from '@/features/profile/api';
import { blockUser, reportContent } from '@/features/social/api';
import type { Profile, ReportReason, ReportTarget } from '@/lib/database.types';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/themes';

import { Button, Notice } from './form';
import { AppText } from './ui';

export function Avatar({ profile, size = 40 }: { profile: Profile | null; size?: number }) {
  const theme = useTheme();
  const url = avatarUrl(profile);
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surfaceAlt,
        },
      ]}>
      {url ? (
        <Image source={{ uri: url }} style={styles.fill} contentFit="cover" />
      ) : (
        <AppText style={{ color: theme.colors.primary, fontWeight: '700', fontSize: size * 0.42 }}>
          {(profile?.display_name ?? '?').slice(0, 1).toUpperCase()}
        </AppText>
      )}
    </View>
  );
}

export function UserRow({
  profile,
  subtitle,
  right,
  onPress,
}: {
  profile: Profile | null;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  const content = (
    <>
      <Avatar profile={profile} />
      <View style={styles.flex}>
        <AppText numberOfLines={1} style={styles.name}>
          {profile?.display_name ?? t('social.unknownUser')}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {subtitle ?? (profile ? `@${profile.username}` : '')}
        </AppText>
      </View>
    </>
  );
  // Die Schaltflächen rechts liegen bewusst ausserhalb der antippbaren Zeile,
  // damit sie eigenständig bedienbar bleiben.
  return (
    <View style={styles.userRow}>
      {onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.userMain}>
          {content}
        </Pressable>
      ) : (
        <View style={styles.userMain}>{content}</View>
      )}
      {right}
    </View>
  );
}

const REASONS: ReportReason[] = ['spam', 'harassment', 'nudity', 'violence', 'hate', 'other'];

/**
 * Drei-Punkte-Menü an fremden Inhalten: melden und Nutzer blockieren.
 * Apple und Google verlangen beides bei nutzergenerierten Inhalten.
 */
export function ContentMenu({
  targetType,
  targetId,
  userId,
  onBlocked,
}: {
  targetType: ReportTarget;
  targetId: string;
  /** Urheber des Inhalts, für "Blockieren" */
  userId: string;
  onBlocked?: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'menu' | 'reasons' | 'reported' | 'confirmBlock'>('menu');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  function close() {
    setOpen(false);
    setStep('menu');
    setFailed(false);
  }

  async function run(action: () => Promise<void>, after: () => void) {
    setBusy(true);
    setFailed(false);
    try {
      await action();
      after();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('social.moreActions')}
        hitSlop={10}
        onPress={() => setOpen(true)}>
        <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('common.close')}>
          <Pressable
            onPress={() => {}}
            style={[
              styles.sheet,
              { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg },
            ]}>
            {failed && <Notice kind="error">{t('profile.actionFailed')}</Notice>}
            {step === 'menu' && (
              <>
                <Button
                  label={t('social.report')}
                  variant="secondary"
                  onPress={() => setStep('reasons')}
                />
                <Button
                  label={t('social.block')}
                  variant="danger"
                  onPress={() => setStep('confirmBlock')}
                />
                <Button label={t('common.cancel')} variant="text" onPress={close} />
              </>
            )}
            {step === 'reasons' && (
              <>
                <AppText variant="heading">{t('social.reportTitle')}</AppText>
                {REASONS.map((reason) => (
                  <Button
                    key={reason}
                    label={t(`social.reasons.${reason}`)}
                    variant="secondary"
                    disabled={busy}
                    onPress={() =>
                      run(
                        () => reportContent(targetType, targetId, reason),
                        () => setStep('reported'),
                      )
                    }
                  />
                ))}
                <Button label={t('common.cancel')} variant="text" onPress={close} />
              </>
            )}
            {step === 'reported' && (
              <>
                <AppText variant="heading">{t('social.reportedTitle')}</AppText>
                <AppText muted>{t('social.reportedBody')}</AppText>
                <Button
                  label={t('social.block')}
                  variant="danger"
                  onPress={() => setStep('confirmBlock')}
                />
                <Button label={t('common.close')} variant="secondary" onPress={close} />
              </>
            )}
            {step === 'confirmBlock' && (
              <>
                <AppText variant="heading">{t('social.blockTitle')}</AppText>
                <AppText muted>{t('social.blockBody')}</AppText>
                <Button
                  label={t('social.block')}
                  variant="danger"
                  loading={busy}
                  onPress={() =>
                    run(
                      () => blockUser(userId),
                      () => {
                        close();
                        onBlocked?.();
                      },
                    )
                  }
                />
                <Button label={t('common.cancel')} variant="text" onPress={close} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
    minHeight: 48,
  },
  userMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs },
  flex: { flex: 1 },
  name: { fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  sheet: {
    gap: spacing.sm,
    padding: spacing.md,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
});
