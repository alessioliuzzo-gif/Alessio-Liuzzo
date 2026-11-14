# Release-Anleitung

Schritt für Schritt von den Konten bis zur Veröffentlichung. Menünamen können leicht abweichen, weil die Anbieter ihre Seiten öfter umbauen. Alle Befehle laufen auf einem Computer mit Node.js im Projektordner.

## 0. Reihenfolge

| Schritt | Was | Dauer |
|---|---|---|
| 1 | Apple Developer und Google Play Konto | Freischaltung bis einige Tage |
| 2 | Betreiberangaben, Rechtstexte prüfen, Webseite | ein Abend |
| 3 | Dev-Build und Test auf dem Handy | ein Tag |
| 4 | Store-Einträge ausfüllen | ein Abend |
| 5 | Produktions-Builds, TestFlight, interner Test | ein bis zwei Tage |
| 6 | Einreichen | Apple meist 1 bis 3 Tage; Google verlangt bei neuen privaten Konten zuerst 14 Tage Test mit 12 Personen |
| 7 | Abo und Kalenderdruck einschalten | später, unabhängig vom ersten Release |

Falls du unter 18 bist: Apple, Google und Stripe verlangen Volljährigkeit. Dann muss ein Elternteil die Konten eröffnen.

## 1. Konten

**Apple Developer (USD 99 pro Jahr)**
1. developer.apple.com/programs/enroll öffnen, mit Apple-ID anmelden (Zwei-Faktor-Anmeldung nötig).
2. "Individual / Sole Proprietor" wählen.
3. Namen exakt wie im Ausweis, Adresse und Telefon angeben, bezahlen.
4. Auf die Bestätigungs-E-Mail warten.

**Google Play Console (USD 25 einmalig)**
1. play.google.com/console öffnen, Konto vom Typ "Persönlich" erstellen.
2. Identität bestätigen (Ausweis) und bezahlen.

## 2. Vor dem ersten Build

1. `src/features/legal/types.ts`: Name, Adresse und Kontakt-E-Mail eintragen. In `de.ts` und `en.ts` den Gerichtsstand ersetzen.
2. Rechtstexte von einer Fachperson prüfen lassen.
3. Webseite erzeugen: `npx tsx scripts/legal/build-site.ts web-legal`, den Ordner hochladen. Du brauchst zwei öffentliche Adressen: Datenschutzerklärung und Support.
4. Namen "DayShot" prüfen: im App Store und bei Google Play suchen, und im Markenregister (swissreg.ch, euipo.europa.eu). Zum Umbenennen `name` in `app.json` ändern.
5. Bundle-ID `ch.dayshot.app` steht in `app.json`. Nach dem ersten Upload ist sie nicht mehr änderbar.

## 3. Dev-Build (für Push, Abo und Druck)

Expo Go kann diese Funktionen nicht. Ein Dev-Build ist deine eigene Test-App.

```bash
npx eas-cli login
npx eas-cli build --profile development --platform android   # gratis, ergibt eine installierbare Datei
npx eas-cli build --profile development --platform ios       # braucht das Apple-Developer-Konto
```

Beim ersten iOS-Build fragt EAS nach deiner Apple-ID und legt Zertifikate selbst an. Antworte auf die Fragen mit Ja.

**Hinweis zu Updates:** `runtimeVersion` steht auf `sdkVersion`, damit Expo Go die Vorschau laden kann. Für die veröffentlichte App ist `{"policy": "appVersion"}` sicherer. Stelle das in `app.json` vor dem ersten Produktions-Build um.

## 4. Store-Texte

### Deutsch

- **Name:** DayShot: Foto-Tagebuch
- **Untertitel (30 Zeichen):** Ein Foto pro Tag im Kalender
- **Kurzbeschreibung Google (80 Zeichen):** Ein Foto pro Tag. Dein Jahr als Kalender, mit Freunden und privatem Album.
- **Werbetext (170 Zeichen):** Halte jeden Tag mit einem Foto fest und sieh dein Jahr als Kalender wachsen. Mit Freunden, Chat und privatem Album.
- **Schlüsselwörter (100 Zeichen):** tagebuch,foto,kalender,journal,erinnerung,streak,album,freunde,collage,jahr,moment,täglich

**Beschreibung:**

> Ein Foto pro Tag. Dein Jahr als Kalender.
>
> DayShot ist dein visuelles Tagebuch. Jeden Tag hältst du einen Moment fest, und Feld für Feld füllt sich dein Kalender mit deinem Leben.
>
> DEIN KALENDER
> • Monatsansicht mit Mini-Fotos
> • Das ganze Jahr als Collage
> • "Heute vor einem Jahr"
> • Serie: Wie viele Tage schaffst du am Stück?
>
> GESTALTE JEDES FOTO
> • Filter, Rahmen, Text und Sticker
> • Ein voller Monat schaltet neue Effekte und Kalenderdesigns frei
>
> MIT FREUNDEN, WENN DU WILLST
> • Standard: Nur deine Freunde sehen dein Foto
> • Kommentare und Chat in Echtzeit
> • Entdecken: jeden Tag Wissenswertes, dazu Beiträge der Community
>
> NUR FÜR DICH
> • Private Alben für Erinnerungen, die niemand sonst sieht
>
> DEIN STIL
> • Mehrere Designs oder dein eigenes: Farben, Formen, Schrift
> • Deutsch, Englisch, Französisch, Italienisch
>
> DU BESTIMMST MIT
> • Reiche Ideen ein und stimme ab. Was die meisten wollen, bauen wir zuerst.
>
> Keine Werbung. Wir verkaufen keine Daten. Dein Konto kannst du jederzeit in der App löschen.
>
> Und das ist erst der Anfang: Es kommen laufend neue Funktionen.

### English

- **Name:** DayShot: Photo Diary
- **Subtitle (30 chars):** One photo a day, your calendar
- **Short description (80 chars):** One photo a day. Your year as a calendar, with friends and a private album.
- **Promotional text:** Capture every day with one photo and watch your year grow into a calendar. With friends, chat and a private album.
- **Keywords:** diary,photo,calendar,journal,memory,streak,album,friends,collage,year,moment,daily

**Description:**

> One photo a day. Your year as a calendar.
>
> DayShot is your visual diary. Capture one moment each day and watch your calendar fill up with your life.
>
> YOUR CALENDAR
> • Month view with mini photos
> • The whole year as a collage
> • "One year ago today"
> • Streak: how many days in a row can you do?
>
> STYLE EVERY PHOTO
> • Filters, frames, text and stickers
> • A complete month unlocks new effects and calendar designs
>
> WITH FRIENDS, IF YOU LIKE
> • Default: only your friends see your photo
> • Comments and real-time chat
> • Discover: something interesting every day, plus community posts
>
> JUST FOR YOU
> • Private albums for memories nobody else sees
>
> YOUR STYLE
> • Several themes or your own: colours, shapes, fonts
> • German, English, French, Italian
>
> YOU HELP DECIDE
> • Submit ideas and vote. What most people want gets built first.
>
> No ads. We do not sell data. You can delete your account in the app at any time.
>
> And this is only the beginning: new features are added all the time.

### Screenshots, Icon

- Screenshots: `store/screenshots/de` und `store/screenshots/en`, je 8 Bilder in 1290 x 2796 (iPhone 6.7 Zoll). Die Fotos darin sind erzeugte Beispielbilder.
- Für Google Play zusätzlich nötig: eine Feature-Grafik 1024 x 500. Die fehlt noch.
- Icon: `assets/images/icon.png`. Neu erzeugen mit den Skripten in `scripts/brand`.

## 5. Datenschutzangaben in den Stores

Massgebend ist, was die App wirklich tut. Stand heute:

**Apple ("App-Datenschutz"): erhobene Daten, alle mit dem Nutzer verknüpft, keine zum Tracking**

| Datentyp | Zweck |
|---|---|
| Kontaktdaten: E-Mail-Adresse, Name | App-Funktionalität |
| Nutzerinhalte: Fotos, Nachrichten, sonstige Inhalte (Kommentare, Beiträge) | App-Funktionalität |
| Kennungen: Nutzer-ID, Geräte-ID (Push-Token) | App-Funktionalität |
| Käufe (erst wenn das Abo an ist) | App-Funktionalität |
| Kontaktdaten: Adresse, Telefon (erst wenn der Druck an ist, erhoben von Stripe) | App-Funktionalität |

"Tracking": Nein. Werbung: keine.

**Google Play ("Datensicherheit")**
- Daten werden bei der Übertragung verschlüsselt: Ja.
- Nutzer können die Löschung ihrer Daten verlangen: Ja, in der App und über die Support-Adresse.
- Erhobene Daten: E-Mail, Name, Fotos, Nachrichten, sonstige nutzergenerierte Inhalte, Nutzer-IDs, Geräte-ID; Kaufverlauf erst mit Abo.
- Weitergabe an Dritte zu Werbezwecken: Nein.

**Altersfreigabe:** Fragebogen wahrheitsgemäss ausfüllen: nutzergenerierte Inhalte ja, Chat ja, Melden und Blockieren vorhanden. Mindestalter der App: 16.

**Hinweise für die Apple-Prüfung** (Feld "Notes"): Testkonto mit E-Mail und Passwort angeben. Dazu: "User-generated content: users can report content and block users from the three-dot menu on every photo, comment, post, idea and in chats. Reports are reviewed within 24 hours. Terms with zero tolerance are accepted at sign-up. Account deletion: Profile > Konto löschen."

## 6. Builds und Einreichen

```bash
npx eas-cli build --profile production --platform ios
npx eas-cli build --profile production --platform android
```

**iOS**
1. In App Store Connect unter "Apps" eine neue App anlegen (Bundle-ID `ch.dayshot.app`).
2. Die angezeigte Apple-ID der App (Zahl) in `eas.json` bei `ascAppId` eintragen.
3. `npx eas-cli submit --profile production --platform ios`
4. Nach rund 15 Minuten erscheint der Build in TestFlight. Dort interne Tester hinzufügen und testen.
5. Store-Seite ausfüllen, Build auswählen, "Zur Prüfung einreichen".

**Android**
1. In der Play Console eine App anlegen, Store-Eintrag und Fragebögen ausfüllen.
2. Den ersten Build (`.aab`) einmal von Hand in "Interner Test" hochladen.
3. Für spätere Uploads einen Dienstkonto-Schlüssel anlegen und in `eas.json` unter `submit.production.android.serviceAccountKeyPath` eintragen. Die Datei nie ins Repository legen.
4. Geschlossenen Test mit 12 Personen für 14 Tage durchführen, dann Produktionszugang beantragen.

## 7. Abo einschalten (später)

1. **RevenueCat:** Konto und Projekt anlegen, iOS- und Android-App hinzufügen.
2. **Produkte in den Stores:** Monatsabo CHF 3.– und Jahresabo CHF 25.– anlegen.
3. **RevenueCat:** Berechtigung mit der Kennung `premium` anlegen, beide Produkte zuordnen, ein Angebot mit den Paketen "Monthly" und "Annual" erstellen.
4. **Öffentliche SDK-Keys** als EAS-Variablen setzen:
   `npx eas-cli env:create --environment production --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value appl_... --visibility plaintext` (ebenso `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` mit `goog_...`), danach neu bauen.
5. **Webhook:** In RevenueCat die Adresse `https://detmfyccpcnzcabvgrli.supabase.co/functions/v1/revenuecat-webhook` eintragen und einen selbst gewählten langen Wert als Authorization-Header setzen. Denselben Wert in Supabase als Secret `REVENUECAT_WEBHOOK_AUTH` speichern.
6. Mit einem Sandbox-Konto testen.
7. In `app_config` den Wert von `subscriptions_enabled` auf `true` setzen.
8. Bei Apple das "Small Business Program" beantragen (15 % statt 30 % Provision).

## 8. Kalenderdruck einschalten (später)

1. **Stripe:** Konto anlegen, zuerst im Testmodus bleiben.
2. **Gelato:** Konto anlegen, im Katalog den Wandkalender A4 wählen und dessen Produkt-UID notieren. Die verlangte Druckdatei (Seitenzahl, Format, Beschnitt) mit `buildCalendarPdf` in `supabase/functions/stripe-webhook/index.ts` abgleichen.
3. **Supabase-Secrets setzen** (Dashboard, Edge Functions, Secrets): `STRIPE_SECRET_KEY`, `GELATO_API_KEY`.
4. **Stripe-Webhook:** Endpunkt `https://detmfyccpcnzcabvgrli.supabase.co/functions/v1/stripe-webhook` für das Ereignis `checkout.session.completed` anlegen, das angezeigte Signatur-Geheimnis als Secret `STRIPE_WEBHOOK_SECRET` speichern.
5. In `app_config` die Zeile `print_gelato_product_uid` ausfüllen und `print_price_chf` prüfen: Preis minus Gelato-Kosten minus Versand minus Stripe-Gebühr ergibt deine Marge.
6. Eine Testbestellung an dich selbst auslösen und den gedruckten Kalender prüfen.
7. In `app_config` den Wert von `print_enabled` auf `true` setzen.

Schlägt eine bezahlte Bestellung fehl, steht sie in der Tabelle `print_orders` mit `status = failed` und dem Grund in `error`. Dann von Hand bei Gelato auslösen oder den Betrag in Stripe erstatten.
