import { useEffect, useState } from 'react';

import { signedThumbUrls } from './api';

/** Lädt die Links der Vorschaubilder für eine Liste von Fotos (Pfad -> Link). */
export function useThumbUrls(storagePaths: readonly string[]): ReadonlyMap<string, string> {
  const [urls, setUrls] = useState<ReadonlyMap<string, string>>(new Map());
  const key = storagePaths.join('|');

  useEffect(() => {
    let cancelled = false;
    const paths = key === '' ? [] : key.split('|');
    if (paths.length === 0) return;
    signedThumbUrls(paths)
      .then((next) => {
        if (!cancelled) setUrls(next);
      })
      .catch(() => {
        // Ohne Verbindung bleiben die Felder leer; beim nächsten Wechsel wird neu versucht.
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return urls;
}
