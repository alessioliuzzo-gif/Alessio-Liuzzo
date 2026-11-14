/**
 * Profil-Tab: Konto (Name, Bild, Abmelden, Löschen) und Einstellungen für
 * Design und Sprache.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Notice, TextField } from '@/components/form';
import { AppText, Card, OptionRow, Screen } from '@/components/ui';
import { APP_NAME, APP_VERSION } from '@/config/brand';
import { useAuth } from '@/features/auth/AuthProvider';
import { validateDisplayName } from '@/features/auth/validation';
import { CalendarDesignCard, RewardsCard } from '@/features/rewards/RewardsCard';
import { avatarUrl, updateDisplayName, uploadAvatar } from '@/features/profile/api';
import { createTapCounter } from '@/features/secrets/secrets';
import { setLanguage } from '@/i18n';
import { LANGUAGE_NAMES, LANGUAGES } from '@/i18n/languages';
import { CustomThemeEditor } from '@/theme/CustomThemeCard';
import { useTheme, useThemeControls } from '@/theme/ThemeProvider';
import { spacing, THEME_IDS, themes } from '@/theme/themes';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { themeId, setThemeId, neonUnlocked } = useThemeControls();
  const router = useRouter();
  const [versionTaps] = useState(() => createTapCounter(5, 2500));
  const { demoMode } = useAuth();
  const link = { color: theme.colors.primary };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <AppText variant="title">{t('profile.title')}</AppText>

        {demoMode ? <Notice>{t('profile.demoMode')}</Notice> : <AccountCard />}
        {!demoMode && <RewardsCard />}

        <Card>
          <AppText variant="heading">{t('profile.theme')}</AppText>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {THEME_IDS.map((id) => (
              <OptionRow
                key={id}
                label={t(`themes.${id}`)}
                selected={id === themeId}
                onPress={() => setThemeId(id)}
                leading={<Swatch id={id} />}
              />
            ))}
            {neonUnlocked && (
              <OptionRow
                label={`${t('themes.neon')} ✨`}
                selected={themeId === 'neon'}
                onPress={() => setThemeId('neon')}
                leading={<Swatch id="neon" />}
              />
            )}
            <OptionRow
              label={t('themes.custom')}
              selected={themeId === 'custom'}
              onPress={() => setThemeId('custom')}
              leading={<Ionicons name="color-palette" size={24} color={theme.colors.primary} />}
            />
          </View>
          {themeId === 'custom' && <CustomThemeEditor />}
        </Card>

        {!demoMode && <CalendarDesignCard />}

        <Card>
          <AppText variant="heading">{t('profile.language')}</AppText>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {LANGUAGES.map((language) => (
              <OptionRow
                key={language}
                label={LANGUAGE_NAMES[language]}
                selected={i18n.language === language}
                onPress={() => void setLanguage(language)}
              />
            ))}
          </View>
        </Card>

        {!demoMode && <DangerZone />}

        <View style={styles.legal}>
          <Link href="/legal/terms">
            <AppText variant="caption" style={link}>
              {t('legal.terms')}
            </AppText>
          </Link>
          <Link href="/legal/privacy">
            <AppText variant="caption" style={link}>
              {t('legal.privacy')}
            </AppText>
          </Link>
        </View>
        {/* Versteckt: 5 schnelle Taps auf die Version öffnen die Credits. */}
        <Pressable onPress={() => versionTaps() && router.push('/secret')}>
          <AppText variant="caption" muted style={styles.center}>
            {APP_NAME} · {t('profile.version', { version: APP_VERSION })}
          </AppText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function AccountCard() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { session, profile, refreshProfile, signOut } = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState<'name' | 'avatar' | 'signOut' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;
  const url = avatarUrl(profile);
  const nameError = validateDisplayName(name);

  /** Führt eine Aktion aus und zeigt bei einem Fehler eine Meldung statt abzustürzen. */
  async function run(kind: NonNullable<typeof busy>, action: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch {
      setError('profile.actionFailed');
    } finally {
      setBusy(null);
    }
  }

  async function pickAvatar() {
    if (!userId) return;
    // Öffnet die Galerie des Systems. Die App sieht nur das gewählte Bild.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled) return;
    await run('avatar', async () => {
      await uploadAvatar(userId, result.assets[0].uri);
      await refreshProfile();
    });
  }

  async function saveName() {
    if (!userId || nameError) return;
    await run('name', async () => {
      await updateDisplayName(userId, name);
      await refreshProfile();
      setEditing(false);
    });
  }

  return (
    <Card>
      <View style={styles.account}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profile.changePhoto')}
          disabled={busy !== null}
          onPress={pickAvatar}
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.surfaceAlt, opacity: busy === 'avatar' ? 0.5 : 1 },
          ]}>
          {url ? (
            <Image source={{ uri: url }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <AppText variant="title" style={{ color: theme.colors.primary }}>
              {(profile?.display_name ?? '?').slice(0, 1).toUpperCase()}
            </AppText>
          )}
        </Pressable>
        <View style={styles.accountText}>
          <AppText variant="heading" numberOfLines={1}>
            {profile?.display_name ?? '…'}
          </AppText>
          {profile && (
            <AppText muted numberOfLines={1}>
              @{profile.username}
            </AppText>
          )}
          <AppText variant="caption" muted numberOfLines={1}>
            {session?.user.email}
          </AppText>
        </View>
      </View>

      {error && <Notice kind="error">{t(error)}</Notice>}

      {editing ? (
        <>
          <TextField
            label={t('auth.displayName')}
            value={name}
            onChangeText={setName}
            error={nameError ? t(nameError) : null}
            maxLength={40}
            autoFocus
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                onPress={() => setEditing(false)}
              />
            </View>
            <View style={styles.flex}>
              <Button
                label={t('common.save')}
                onPress={saveName}
                loading={busy === 'name'}
                disabled={nameError !== null}
              />
            </View>
          </View>
        </>
      ) : (
        <>
          <Button
            label={t('profile.changePhoto')}
            variant="secondary"
            onPress={pickAvatar}
            loading={busy === 'avatar'}
          />
          <Button
            label={t('profile.editName')}
            variant="secondary"
            onPress={() => {
              setName(profile?.display_name ?? '');
              setEditing(true);
            }}
          />
          <Button
            label={t('profile.signOut')}
            variant="secondary"
            onPress={() => run('signOut', signOut)}
            loading={busy === 'signOut'}
          />
        </>
      )}
    </Card>
  );
}

/**
 * Konto löschen. Apple und Google verlangen, dass das direkt in der App geht.
 * Zweistufig, damit es nicht versehentlich passiert.
 */
function DangerZone() {
  const { t } = useTranslation();
  const { deleteAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    setBusy(true);
    setFailed(false);
    try {
      await deleteAccount();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <Card>
      <AppText variant="heading">{t('profile.deleteTitle')}</AppText>
      <AppText variant="caption" muted>
        {t('profile.deleteBody')}
      </AppText>
      {failed && <Notice kind="error">{t('profile.deleteFailed')}</Notice>}
      {confirming ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              disabled={busy}
              onPress={() => setConfirming(false)}
            />
          </View>
          <View style={styles.flex}>
            <Button
              label={t('profile.deleteConfirm')}
              variant="danger"
              loading={busy}
              onPress={confirm}
            />
          </View>
        </View>
      ) : (
        <Button
          label={t('profile.deleteAccount')}
          variant="danger"
          onPress={() => setConfirming(true)}
        />
      )}
    </Card>
  );
}

/** Kleine Farbvorschau: zeigt Hintergrund und Akzent des jeweiligen Themes. */
function Swatch({ id }: { id: keyof typeof themes }) {
  const { colors } = themes[id];
  return (
    <View
      style={[styles.swatch, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.swatchDot, { backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xl },
  options: { gap: spacing.sm },
  center: { textAlign: 'center' },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.sm },
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accountText: { flex: 1 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%' },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: { width: 12, height: 12, borderRadius: 6 },
});
