/**
 * Rechtstexte als strukturierte Daten: Titel, Stand und Abschnitte.
 * Platzhalter in [ECKIGEN KLAMMERN] muss der Betreiber vor dem Release ersetzen.
 */
export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDocument = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

/** Stand der Texte. Bei Änderungen erhöhen und app_config.terms_version anpassen. */
export const LEGAL_VERSION = '2026-11-entwurf';

/** Kontaktangaben des Betreibers. VOR DEM RELEASE AUSFÜLLEN. */
export const OPERATOR = {
  name: '[VOR- UND NACHNAME ODER FIRMA]',
  address: '[STRASSE NR, PLZ ORT, SCHWEIZ]',
  email: '[KONTAKT-E-MAIL, z. B. hallo@dayshot.ch]',
};
