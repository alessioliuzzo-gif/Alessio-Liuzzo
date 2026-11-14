import { LANGUAGES, resolveLanguage } from '@/i18n/languages';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import it_ from '@/i18n/locales/it.json';

type Tree = { [key: string]: string | Tree };

/** Macht aus verschachtelten Übersetzungen eine flache Liste wie "tabs.feed". */
function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});
}

const locales: Record<string, Tree> = { de, en, fr, it: it_ };

describe('Übersetzungen', () => {
  it('deckt genau die angebotenen Sprachen ab', () => {
    expect(Object.keys(locales).sort()).toEqual([...LANGUAGES].sort());
  });

  it.each(Object.keys(locales))('%s hat dieselben Schlüssel wie Deutsch', (language) => {
    expect(Object.keys(flatten(locales[language])).sort()).toEqual(Object.keys(flatten(de)).sort());
  });

  it.each(Object.keys(locales))(
    '%s hat keine leeren Texte und dieselben Platzhalter',
    (language) => {
      const reference = flatten(de);
      const placeholders = (text: string) => (text.match(/{{\w+}}/g) ?? []).sort();
      for (const [key, text] of Object.entries(flatten(locales[language]))) {
        expect(text.trim()).not.toBe('');
        expect(placeholders(text)).toEqual(placeholders(reference[key]));
      }
    },
  );
});

describe('resolveLanguage', () => {
  it('bevorzugt die gespeicherte Wahl', () => {
    expect(resolveLanguage('it', ['de'])).toBe('it');
  });

  it('nimmt die erste unterstützte Gerätesprache', () => {
    expect(resolveLanguage(null, ['es', 'fr-CH', 'de'])).toBe('fr');
    expect(resolveLanguage(null, ['DE'])).toBe('de');
  });

  it('fällt auf Englisch zurück', () => {
    expect(resolveLanguage(null, ['es', null, undefined])).toBe('en');
    expect(resolveLanguage('xx', [])).toBe('en');
  });
});
