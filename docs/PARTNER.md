# Partnerschaften für den Entdecken-Feed

Der Feed zeigt heute Wikipedia-Fakten und Beiträge der Community. Für lustige News und weitere Inhalte brauchst du die Erlaubnis der Quelle. Ohne Erlaubnis übernimmt die App höchstens Titel und Link.

## Stand der Recherche

E-Mail-Adressen stehen hier bewusst nicht: Ich habe keine verifiziert. Nimm die Kontaktadresse aus dem Impressum der jeweiligen Seite.

| Quelle | Was sie bietet | Lizenzlage (Stand Recherche) | Nächster Schritt |
|---|---|---|---|
| Wikipedia "An diesem Tag" | tägliche Fakten in DE, EN, FR, IT | frei mit Quellenangabe (CC BY-SA), bereits eingebaut | Kontakt im Abruf ergänzen |
| Good News (Impact Partner GmbH, Berlin) | täglich kuratierte positive Nachrichten | keine freie Lizenz gefunden | Partnerschaft anfragen |
| Utopia.de, Rubrik "Good News" | positive Nachrichten, wöchentlich | keine freie Lizenz gefunden | Partnerschaft anfragen |
| Beobachter, "Lichtblick des Tages" (Ringier) | positive Alltagsgeschichten aus der Schweiz | keine freie Lizenz gefunden | Partnerschaft anfragen |
| blue News (Swisscom) | Schweizer News, auch positive Meldungen | keine freie Lizenz gefunden | Partnerschaft anfragen |
| netzpolitik.org | Netzthemen | Creative Commons, aber laut Recherche mit "NC" (nicht kommerziell) | für eine App mit Abo nur mit Erlaubnis |

Die Lizenzangaben stammen aus einer Websuche und teils aus Sekundärquellen. Prüfe sie im Impressum, bevor du eine Quelle einträgst.

## So trägst du eine erlaubte Quelle ein

In Supabase, Tabelle `app_config`, Zeile `feed_sources`:

```json
[{ "name": "Name der Quelle", "url": "https://beispiel.ch/feed.xml", "lang": "de" }]
```

Beim nächsten Lauf um 04:15 UTC erscheinen bis zu fünf Titel pro Quelle im Feed.

## Vorlage für die Anfrage

> Betreff: Kooperationsanfrage: Ihre Schlagzeilen in der App DayShot
>
> Guten Tag
>
> Ich entwickle DayShot, ein Foto-Tagebuch aus der Schweiz: Nutzerinnen und Nutzer halten jeden Tag ein Foto fest und sehen ihr Jahr als Kalender. Im Bereich "Entdecken" zeigen wir täglich Wissenswertes und positive Nachrichten.
>
> Ich würde dort gern Ihre Schlagzeilen aus dem RSS-Feed anzeigen: nur Titel und Link, klar mit Ihrem Namen gekennzeichnet. Wer antippt, landet direkt auf Ihrer Website. Artikeltexte übernehmen wir nicht.
>
> Wären Sie damit einverstanden? Gern richte ich mich nach Ihren Vorgaben zu Darstellung und Quellenangabe.
>
> Freundliche Grüsse
> Alessio Liuzzo

## Quellen der Recherche

- [Wikimedia: Hinweise zur Weiterverwendung](https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse)
- [Wikimedia: Zugriffsregeln der APIs](https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy)
- [netzpolitik.org: Creative-Commons-Lizenzen](https://netzpolitik.org/tag/creative-commons-lizenzen/page/2/)
- [Good News App](https://apps.apple.com/DE/app/id1321856447)
- [Utopia.de: Good News](https://utopia.de/news/ein-halbes-jahr-good-news-auf-utopia-de-unsere-5-favoriten_971590/)
- [Beobachter: Lichtblick des Tages](https://www.beobachter.ch/lichtblick-des-tages)
- [blue News](https://www.bluewin.ch/en/news/this-good-news-gives-us-hope-now-li.3164335)
