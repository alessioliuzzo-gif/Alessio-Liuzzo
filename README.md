# DayShot

Visuelles Foto-Tagebuch: ein Foto pro Tag, gesammelt in einem Kalender, mit Freunden und Chat.
Gebaut mit Expo (React Native), TypeScript und Expo Router. "DayShot" ist ein Arbeitstitel.

## Stand

| Phase | Inhalt | Status |
|---|---|---|
| 0 | Fundament: Projekt, Themes, Sprachen, Tests | fertig |
| 1 | Konto (Supabase Auth, Profil, Row Level Security) | fertig, offen: Passwort vergessen, Rechtstexte |
| 2 | Tagesfoto und Editor | fertig (Text und Sticker auf dem Handy noch zu prüfen) |
| 3 | Kalender mit Fotos, Jahres-Collage, Streak | fertig |
| 4 | Belohnungen | fertig |
| 5 | Freunde und Feeds (inkl. Entdecken mit Fakten und eigenen Beiträgen) | fertig |
| 6 | Chat | fertig |
| 7 | Moderation | fertig |
| 8 | Push-Benachrichtigungen | fertig (Push vom Server erst im Dev-Build testbar) |
| 9 | Abo (RevenueCat, hinter Feature Flag) | eingebaut, wartet auf RevenueCat- und Store-Konten |
| 10 | Kalenderdruck (Stripe, Gelato) | eingebaut, wartet auf Stripe- und Gelato-Keys |
| 11 | Release | vorbereitet: Rechtstexte, Icon, Screenshots, Store-Texte, eas.json. Konten und Einreichen: siehe docs/RELEASE.md |

Zusätzlich gebaut: privates Album, Ideen-Box mit Abstimmung, Entdecken-Feed, eigenes Design, versteckte Funktionen.

## Dokumente

| Datei | Inhalt |
|---|---|
| `docs/EINRICHTUNG.md` | Was eingerichtet ist, Schalter, Moderation, offene Punkte |
| `docs/RELEASE.md` | Konten, Builds, Store-Texte, Datenschutzangaben, Abo und Druck einschalten |
| `docs/MARKETING.md` | Sprüche und Werbekampagnen |
| `docs/PARTNER.md` | Quellen für den Feed und Anfrage-Vorlage |
| `docs/INVESTOREN.md` | Plan und Anlaufstellen |

## Auf dem Handy testen (Expo Go)

Voraussetzungen: Node.js 20 oder neuer auf dem Computer, die App "Expo Go" auf dem Handy,
Computer und Handy im selben WLAN.

```bash
npm install
npx expo start
```

Dann den QR-Code scannen: auf iOS mit der Kamera-App, auf Android in Expo Go.
Falls das Handy den Computer nicht findet (z. B. im Schul-WLAN): `npx expo start --tunnel`.

Im Browser geht es auch, ohne Handy: `npx expo start --web`.

## Auf dem Handy testen ohne Computer

Der aktuelle Stand wird mit EAS Update auf die Expo-Server geladen. In Expo Go mit dem
Expo-Konto anmelden, Projekt `dayshot` wählen, Branch `preview` öffnen.

```bash
npx eas-cli update --branch preview --environment preview --message "..."
```

## Backend (Supabase)

- Tabellen und Zugriffsregeln liegen als SQL in `supabase/migrations`.
- Edge Functions liegen in `supabase/functions` (bisher `delete-account`).
- Tests der Zugriffsregeln: `supabase/tests/run-local.sh` (braucht eine lokale
  PostgreSQL-Installation). Dieselbe Datei `supabase/tests/phase1_rls.test.sql` läuft auch im
  SQL Editor von Supabase; sie rollt alles zurück.
- Die App braucht `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` (der
  Publishable Key). Lokal in `.env`, für EAS als Umgebungsvariablen des Projekts.
- Ohne diese Werte startet die App im Demo-Modus ohne Konto.

Vor dem Release noch nötig: eigener E-Mail-Versand (SMTP), weil der eingebaute Versand von
Supabase nur wenige Mails pro Stunde erlaubt, und ein Ziel für den Bestätigungslink.

## Prüfen

```bash
npm run check      # Typprüfung, Lint und Tests zusammen
npm test           # nur die Tests
```

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/app` | Screens. Jede Datei ist eine Route (Expo Router). |
| `src/components` | Wiederverwendbare Bausteine der Oberfläche |
| `src/features` | Fachlogik pro Funktion, ohne UI (z. B. Kalenderraster) |
| `src/theme` | Die vier Themes und der Theme-Provider |
| `src/i18n` | Übersetzungen (DE, EN, FR, IT) |
| `src/lib` | Technische Helfer (Speicher, Umgebungsvariablen) |
| `src/config` | Zentrale Einstellungen (App-Name) |

## Regeln im Projekt

- **Texte** stehen in `src/i18n/locales/*.json`, nie direkt im Code. Ein Test prüft, dass alle
  vier Sprachen dieselben Schlüssel haben.
- **Farben** kommen aus dem Theme (`useTheme()`), nie als fester Wert im Screen. Ein Test prüft
  den Kontrast jedes Themes.
- **App-Name** steht nur in `app.json` unter `expo.name`.
- **Secrets** gehören nicht ins Repository. `.env` ist ignoriert, `.env.example` zeigt die
  nötigen Variablen. Variablen mit `EXPO_PUBLIC_` sind öffentlich; geheime Keys (Stripe, Gelato,
  Supabase `service_role`) leben nur in Supabase Edge Functions.
- **Pakete** mit `npx expo install <paket>` hinzufügen, damit die Version zum Expo SDK passt.
