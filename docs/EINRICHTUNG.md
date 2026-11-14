# Was eingerichtet ist

Diese Übersicht zeigt, was für DayShot konfiguriert wurde, wo es liegt und was du noch selbst erledigen musst.
Urheber der App ist Alessio Liuzzo (Vermerk in `src/config/author.ts` und auf der versteckten Credits-Seite).

## Konten und Projekte

| Dienst | Was eingerichtet ist | Wo du es findest |
|---|---|---|
| GitHub | Code im Branch `claude/dayshot-mobile-app-wua2ha` | github.com/alessioliuzzo-gif/Alessio-Liuzzo |
| Expo | Projekt `@highway-production/dayshot`, EAS Update auf dem Branch `preview`, Umgebungsvariablen für Supabase | expo.dev, Projekt dayshot |
| Supabase | Projekt "Dayshot" in London (`eu-west-2`), Kennung `detmfyccpcnzcabvgrli` | supabase.com/dashboard |
| Apple Developer | noch nicht abgeschlossen | developer.apple.com |
| Google Play, RevenueCat, Stripe, Gelato | noch nicht angelegt | siehe `RELEASE.md` |

## Supabase im Detail

**Tabellen** (alle mit Row Level Security): `app_config`, `profiles`, `profile_private`, `daily_photos`, `photo_comments`, `friendships`, `blocks`, `messages`, `feed_items`, `feed_comments`, `reports`, `push_tokens`, `subscriptions`, `print_orders`, `albums`, `memories`, `ideas`, `idea_votes`.

**Speicher-Buckets:** `avatars` (öffentlich), `photos`, `memories`, `print-files` (alle privat).

**Edge Functions:**

| Funktion | Aufgabe | Braucht noch |
|---|---|---|
| `delete-account` | Konto mit allen Dateien löschen | nichts |
| `refresh-feed` | täglich Fakten von Wikipedia und Titel aus RSS-Quellen holen | nichts |
| `notify-message` | Push bei neuer Chat-Nachricht | Dev-Build zum Testen |
| `revenuecat-webhook` | Abo-Status speichern | Secret `REVENUECAT_WEBHOOK_AUTH` |
| `create-print-checkout` | Druckauftrag anlegen, Stripe-Zahlung starten | Secret `STRIPE_SECRET_KEY` |
| `stripe-webhook` | nach Zahlung PDF erzeugen und an Gelato senden | Secrets `STRIPE_WEBHOOK_SECRET`, `GELATO_API_KEY` |

**Geplanter Job:** `refresh-feed` läuft täglich um 04:15 UTC (pg_cron).

**Geheimnisse:** `CRON_SECRET` (Function-Secret und im Vault als `cron_secret`), `project_url` im Vault. Beide sind zufällig erzeugt und stehen in keinem Dokument.

**Anmeldung:** Passwort mindestens 8 Zeichen, E-Mail-Bestätigung an, erlaubte Rückkehr-Adressen `dayshot://**` und `exp://**`.

## Schalter ohne App-Update (Tabelle `app_config`)

Ändern im Supabase-Dashboard unter Table Editor, Tabelle `app_config`, Spalte `value`.

| Schlüssel | Bedeutung | Aktuell |
|---|---|---|
| `subscriptions_enabled` | Abo und Paywall anzeigen | `false` |
| `print_enabled` | Kalenderdruck anzeigen | `false` |
| `print_price_chf` | Verkaufspreis des Kalenders | `29.90` |
| `print_premium_discount_percent` | Rabatt für Abonnenten | `15` |
| `print_margin_chf` | deine geplante Marge (nur intern sichtbar) | `10.00` |
| `print_gelato_product_uid` | Produktkennung bei Gelato (intern) | noch ausfüllen |
| `print_ship_countries` | Lieferländer (intern) | CH, LI, DE, AT, FR, IT |
| `feed_sources` | zusätzliche RSS-Quellen für den Feed (intern) | leer |
| `min_age` | Mindestalter | `16` |
| `terms_version` | Version der Nutzungsbedingungen | `2026-11-entwurf` |

## Moderation: so bearbeitest du Meldungen

1. Supabase-Dashboard, Table Editor, Tabelle `reports`, Filter `status = open`.
2. `target_type` und `target_id` zeigen, was gemeldet wurde (Foto, Profil, Nachricht, Kommentar, Beitrag, Idee).
3. Verbotenen Inhalt in der jeweiligen Tabelle löschen. Bei schweren Verstössen das Konto unter Authentication, Users löschen.
4. `status` auf `reviewed` setzen. Apple verlangt eine Reaktion innert 24 Stunden.

Ideen der Community: In der Tabelle `ideas` setzt du `status` auf `planned`, `done` oder `declined`.

## Versteckte Funktionen

| Auslöser | Wirkung |
|---|---|
| 7-mal schnell auf "DayShot" im Kalender tippen | schaltet das Neon-Theme frei |
| Flamme im Kalender lange drücken | zeigt die Serien-Statistik |
| Serie erreicht 7, 30, 100 oder 365 Tage | Konfetti |
| 5-mal schnell auf die Versionsnummer im Profil tippen | Credits-Seite mit deinem Namen |

Die Widmung auf der Credits-Seite erscheint nur an einem Datum, das du in `src/config/author.ts` bei `dedicationDate` einträgst (Format `MM-TT`).

## Vor dem Release noch von dir zu erledigen

- **Betreiberangaben** in `src/features/legal/types.ts` eintragen (Name, Adresse, Kontakt-E-Mail) und den Gerichtsstand in den Texten ersetzen.
- **Rechtstexte prüfen lassen.** Sie sind Entwürfe nach DSG und DSGVO.
- **Rechtstexte ins Netz stellen:** `npx tsx scripts/legal/build-site.ts web-legal` erzeugt die Seiten. Der Upload zu Expo Hosting wurde mit dem jetzigen Token abgelehnt; lade den Ordner bei einem beliebigen Webhoster hoch (z. B. GitHub Pages).
- **Eigener E-Mail-Versand (SMTP):** Der eingebaute Versand von Supabase schickt nur 2 Mails pro Stunde und erlaubt keine eigenen Vorlagen.
- **Kontakt im Feed-Abruf:** Wikimedia wünscht eine Kontaktangabe; trage deine E-Mail in `USER_AGENT` in `supabase/functions/refresh-feed/index.ts` ein.
- **FR und IT gegenlesen lassen.** Die Rechtstexte gibt es nur auf Deutsch und Englisch.

## Was nicht auf einem echten Handy geprüft ist

Alles wurde mit automatischen Tests und im Browser geprüft, zusätzlich Konto und Löschen auf deinem iPhone. Nicht auf dem Gerät geprüft sind: Text und Sticker im Editor, Kamera, Push vom Server, Abo-Kauf, Bezahlung und der gedruckte Kalender (Format der Druckdatei muss zur Gelato-Vorgabe passen, Testbestellung nötig).
