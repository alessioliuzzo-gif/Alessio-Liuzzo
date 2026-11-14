# DayShot

Visuelles Foto-Tagebuch: ein Foto pro Tag, gesammelt in einem Kalender, mit Freunden und Chat.
Gebaut mit Expo (React Native), TypeScript und Expo Router. "DayShot" ist ein Arbeitstitel.

## Stand

| Phase | Inhalt | Status |
|---|---|---|
| 0 | Fundament: Projekt, Themes, Sprachen, Tests | fertig |
| 1 | Konto (Supabase Auth, Profil, Row Level Security) | offen |
| 2 | Tagesfoto und Editor | offen |
| 3 | Kalender mit Fotos, Jahres-Collage, Streak | offen |
| 4 | Belohnungen | offen |
| 5 | Freunde und Feeds | offen |
| 6 | Chat | offen |
| 7 | Moderation | offen |
| 8 | Push-Benachrichtigungen | offen |
| 9 | Abo (RevenueCat, hinter Feature Flag) | offen |
| 10 | Kalenderdruck (Stripe, Gelato) | offen |
| 11 | Release | offen |

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
