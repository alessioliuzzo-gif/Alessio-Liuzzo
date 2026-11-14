/**
 * Rechtstexte auf Deutsch (massgebliche Fassung).
 *
 * ENTWURF nach Schweizer Datenschutzgesetz (DSG) und DSGVO. Kein Ersatz für
 * eine Rechtsberatung: Vor dem Release von einer Fachperson prüfen lassen.
 */
import { LEGAL_VERSION, type LegalDocument, OPERATOR } from './types';

const contact = `${OPERATOR.name}, ${OPERATOR.address}, E-Mail: ${OPERATOR.email}`;

export const privacyDe: LegalDocument = {
  title: 'Datenschutzerklärung',
  updated: LEGAL_VERSION,
  intro:
    'Diese Datenschutzerklärung erklärt, welche Personendaten die App DayShot bearbeitet, wozu und welche Rechte du hast. Sie gilt nach dem Schweizer Datenschutzgesetz (DSG) und, soweit anwendbar, nach der Datenschutz-Grundverordnung der EU (DSGVO).',
  sections: [
    {
      heading: '1. Verantwortlicher',
      paragraphs: [
        `Verantwortlich für die Datenbearbeitung ist: ${contact}.`,
        'Für Personen in der EU: Ein Vertreter in der EU nach Art. 27 DSGVO ist [NOCH ZU PRÜFEN, ob nötig].',
      ],
    },
    {
      heading: '2. Welche Daten wir bearbeiten',
      paragraphs: [
        'Konto: E-Mail-Adresse, Passwort (nur verschlüsselt gespeichert), Benutzername, Anzeigename, Profilbild, Geburtsjahr (nur zur Altersprüfung, für andere unsichtbar), Zeitpunkt und Version der akzeptierten Nutzungsbedingungen.',
        'Inhalte: deine Tagesfotos mit Datum und Sichtbarkeit, Kommentare, eigene Beiträge im Entdecken-Feed, Chat-Nachrichten, Freundschaften, Blockierungen und Meldungen.',
        'Technische Daten: IP-Adresse und Zeitpunkt von Anfragen (Server-Protokolle), Gerätetyp und Betriebssystem, Push-Token für Benachrichtigungen.',
        'Bestellungen gedruckter Kalender: Name, Lieferadresse, E-Mail, bestellte Produkte und Zahlungsstatus. Kartendaten erhalten wir nicht; die Zahlung wickelt Stripe ab.',
        'Abonnements: Kaufbelege und Abo-Status aus dem App Store bzw. Google Play.',
        'Auf deinem Gerät speichern wir Einstellungen wie Design und Sprache. Wir setzen keine Werbe- oder Tracking-Cookies ein und verkaufen keine Daten.',
      ],
    },
    {
      heading: '3. Zwecke und Rechtsgrundlagen',
      paragraphs: [
        'Bereitstellung der App und deines Kontos, Anzeige deiner Fotos für dich und für die von dir gewählten Personen, Chat und Kommentare (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO).',
        'Sicherheit, Missbrauchsbekämpfung, Bearbeitung von Meldungen und Durchsetzung der Nutzungsbedingungen (berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO).',
        'Push-Benachrichtigungen nur nach deiner Zustimmung im Betriebssystem (Einwilligung, Art. 6 Abs. 1 lit. a DSGVO). Du kannst sie jederzeit in den Einstellungen widerrufen.',
        'Abwicklung von Bestellungen und Abonnements sowie Aufbewahrung von Buchhaltungsbelegen (Vertragserfüllung und gesetzliche Pflicht, Art. 6 Abs. 1 lit. b und c DSGVO).',
      ],
    },
    {
      heading: '4. Wer deine Inhalte sieht',
      paragraphs: [
        'Fotos mit der Sichtbarkeit "Nur Freunde" (Standard) sehen nur du und deine bestätigten Freunde. "Öffentlich" heisst: alle angemeldeten Nutzer der App.',
        'Benutzername, Anzeigename und Profilbild sind für angemeldete Nutzer sichtbar, damit dich Freunde finden. Kommentare und eigene Beiträge im Entdecken-Feed sind für alle angemeldeten Nutzer sichtbar.',
        'Chat-Nachrichten sehen nur Absender und Empfänger. Wer blockiert wird, sieht keine Inhalte der blockierenden Person mehr.',
      ],
    },
    {
      heading: '5. Empfänger und Auftragsbearbeiter',
      paragraphs: [
        'Supabase Inc. (Datenbank, Speicher, Anmeldung, Server-Funktionen). Die Daten liegen in einem Rechenzentrum in London (Vereinigtes Königreich). Für das Vereinigte Königreich bestehen Angemessenheitsentscheide der Schweiz und der EU.',
        'Expo (650 Industries, Inc., USA): Auslieferung von App-Updates und Push-Benachrichtigungen.',
        'Apple Inc. und Google LLC: Vertrieb der App, Push-Benachrichtigungen und In-App-Käufe.',
        'RevenueCat, Inc. (USA): Verwaltung von Abonnements, falls angeboten.',
        'Stripe Payments Europe Ltd. (Irland): Zahlungen für gedruckte Kalender.',
        'Gelato AS (Norwegen) und deren Druckpartner: Druck und Versand von Kalendern. Je nach Lieferadresse kann der Druck ausserhalb der Schweiz und des EWR erfolgen.',
        'Wikimedia Foundation (USA): Beim Anzeigen von Fakten im Entdecken-Feed lädt die App Bilder von Wikimedia-Servern; dabei wird deine IP-Adresse übermittelt.',
        'Übermittlungen in Länder ohne angemessenes Datenschutzniveau (z. B. USA) erfolgen auf Grundlage der EU-Standardvertragsklauseln bzw. des Swiss-U.S. und EU-U.S. Data Privacy Framework, soweit der Empfänger zertifiziert ist.',
      ],
    },
    {
      heading: '6. Aufbewahrung und Löschung',
      paragraphs: [
        'Deine Daten bleiben gespeichert, solange dein Konto besteht. Du kannst dein Konto jederzeit in der App unter Profil > Konto löschen entfernen. Dabei löschen wir Profil, Fotos, Kommentare, Beiträge und Nachrichten, die du gesendet hast, sofort und endgültig.',
        'Meldungen über Verstösse bewahren wir bis zu 12 Monate auf, um Missbrauch nachzuweisen. Buchhaltungsbelege zu Bestellungen bewahren wir 10 Jahre auf (Art. 958f OR). Server-Protokolle werden nach spätestens 30 Tagen gelöscht.',
      ],
    },
    {
      heading: '7. Mindestalter',
      paragraphs: [
        'DayShot ist für Personen ab 16 Jahren. Bei der Registrierung fragen wir das Geburtsjahr ab. Erfahren wir, dass ein Konto einer jüngeren Person gehört, löschen wir es.',
      ],
    },
    {
      heading: '8. Deine Rechte',
      paragraphs: [
        'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Bearbeitung, Datenherausgabe bzw. Datenübertragbarkeit sowie Widerspruch. Eine Einwilligung kannst du jederzeit für die Zukunft widerrufen.',
        `Schreib uns dafür an ${OPERATOR.email}. Wir antworten innert 30 Tagen.`,
        'Du kannst dich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) beschweren, in der EU bei der Aufsichtsbehörde deines Wohnsitzlandes.',
      ],
    },
    {
      heading: '9. Sicherheit',
      paragraphs: [
        'Die Übertragung erfolgt verschlüsselt (HTTPS). Zugriffe auf Daten sind in der Datenbank durch Zugriffsregeln (Row Level Security) geschützt; private Fotos sind nur über zeitlich begrenzte Links abrufbar. Geheime Zugangsschlüssel liegen ausschliesslich auf dem Server.',
      ],
    },
    {
      heading: '10. Änderungen',
      paragraphs: [
        'Wir passen diese Erklärung an, wenn sich die App oder die Rechtslage ändert. Die aktuelle Fassung ist in der App abrufbar. Über wesentliche Änderungen informieren wir in der App.',
      ],
    },
  ],
};

export const termsDe: LegalDocument = {
  title: 'Nutzungsbedingungen',
  updated: LEGAL_VERSION,
  intro: `Diese Bedingungen regeln die Nutzung der App DayShot, betrieben von ${OPERATOR.name}. Mit der Registrierung akzeptierst du sie.`,
  sections: [
    {
      heading: '1. Konto',
      paragraphs: [
        'Du musst mindestens 16 Jahre alt sein. Deine Angaben müssen wahr sein. Du bist für die Geheimhaltung deines Passworts verantwortlich. Pro Person ist ein Konto erlaubt.',
      ],
    },
    {
      heading: '2. Deine Inhalte',
      paragraphs: [
        'Die Rechte an deinen Fotos und Texten bleiben bei dir. Du erteilst uns eine einfache, unentgeltliche, weltweite Lizenz, sie zu speichern, technisch zu verarbeiten und den von dir gewählten Personen anzuzeigen. Die Lizenz endet, wenn du den Inhalt oder dein Konto löschst.',
        'Du darfst nur Inhalte hochladen, an denen du die nötigen Rechte hast. Zeigst du andere Personen, brauchst du deren Einverständnis.',
      ],
    },
    {
      heading: '3. Verbotene Inhalte und Verhalten (Nulltoleranz)',
      paragraphs: [
        'Verboten sind insbesondere: Nacktheit und sexuelle Inhalte, jede Darstellung von Minderjährigen in sexualisiertem Zusammenhang, Gewalt und Gewaltverherrlichung, Hass, Diskriminierung, Belästigung und Mobbing, Drohungen, Spam und Werbung, illegale Inhalte, Verletzung von Urheber- und Persönlichkeitsrechten sowie das Ausspähen anderer Nutzer.',
        'Für anstössige Inhalte und missbräuchliches Verhalten gilt Nulltoleranz.',
      ],
    },
    {
      heading: '4. Melden, Blockieren und Moderation',
      paragraphs: [
        'Du kannst jeden Inhalt und jede Person melden und Nutzer blockieren. Wir prüfen Meldungen innert 24 Stunden, entfernen verbotene Inhalte und sperren oder löschen Konten, die gegen diese Bedingungen verstossen. Strafbare Inhalte können wir den Behörden melden.',
      ],
    },
    {
      heading: '5. Entdecken-Feed',
      paragraphs: [
        'Automatisch angezeigte Fakten stammen aus frei lizenzierten Quellen (z. B. Wikipedia, CC BY-SA) und sind mit Quelle verlinkt. Für deren Richtigkeit übernehmen wir keine Gewähr. Eigene Beiträge sind auf 5 pro Tag begrenzt.',
      ],
    },
    {
      heading: '6. Abonnement (falls angeboten)',
      paragraphs: [
        'Zusatzfunktionen können als Abonnement über den App Store bzw. Google Play angeboten werden. Es gelten deren Kauf-, Verlängerungs- und Kündigungsbedingungen. Ein Abo verlängert sich automatisch, wenn du es nicht mindestens 24 Stunden vor Ablauf in den Einstellungen deines Store-Kontos kündigst.',
      ],
    },
    {
      heading: '7. Gedruckte Kalender',
      paragraphs: [
        'Preise werden vor der Bestellung inklusive Mehrwertsteuer und Versand angezeigt. Die Zahlung erfolgt über Stripe. Gedruckt und versendet wird durch unseren Partner Gelato.',
        'Kalender werden nach deinen Fotos individuell hergestellt. Ein Widerrufsrecht besteht deshalb nicht (für Kunden in der EU: Art. 16 lit. c der Richtlinie 2011/83/EU). Bei Druck- oder Transportschäden ersetzen wir den Kalender oder erstatten den Preis, wenn du uns innert 14 Tagen nach Erhalt mit Foto kontaktierst.',
      ],
    },
    {
      heading: '8. Verfügbarkeit und Änderungen',
      paragraphs: [
        'Wir bemühen uns um einen störungsfreien Betrieb, können ihn aber nicht garantieren. Wir dürfen Funktionen ändern oder einstellen. Über wesentliche Änderungen dieser Bedingungen informieren wir in der App; wer weiter nutzt, akzeptiert sie.',
      ],
    },
    {
      heading: '9. Haftung',
      paragraphs: [
        'Wir haften nur für Schäden, die wir vorsätzlich oder grobfahrlässig verursachen, soweit das Gesetz dies zulässt. Für Inhalte anderer Nutzer haften wir nicht. Bitte sichere wichtige Fotos zusätzlich selbst.',
      ],
    },
    {
      heading: '10. Kündigung',
      paragraphs: [
        'Du kannst dein Konto jederzeit in der App löschen. Wir können Konten bei Verstössen sperren oder löschen.',
      ],
    },
    {
      heading: '11. Anwendbares Recht und Gerichtsstand',
      paragraphs: [
        'Es gilt Schweizer Recht. Gerichtsstand ist [ORT DES BETREIBERS], soweit nicht zwingende Verbraucherschutzvorschriften einen anderen Gerichtsstand vorsehen.',
        `Kontakt: ${contact}.`,
      ],
    },
  ],
};
