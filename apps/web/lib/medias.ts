'use client';

/**
 * URL d'objet d'un média de l'appareil (magasin `medias` d'IndexedDB, ex. une photo de fond).
 * Le fichier vit sur la machine : il s'affiche hors-ligne. L'URL est libérée quand l'id
 * change ou au démontage. Partagé par la sortie et l'aperçu des réglages.
 */
import { lireMedia } from '@cmfi/api';
import { useEffect, useState } from 'react';

export function useUrlMedia(id: string | null): string | null {
  const [url, setUrl] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    let annule = false;
    let creee: string | null = null;
    lireMedia(id)
      .then((media) => {
        if (annule || !media) return;
        creee = URL.createObjectURL(media.blob);
        setUrl({ id, url: creee });
      })
      .catch(() => {
        // Média introuvable ou IndexedDB indisponible : rien ne casse, le fond nuit reste.
      });
    return () => {
      annule = true;
      if (creee) URL.revokeObjectURL(creee);
    };
  }, [id]);

  return id && url?.id === id ? url.url : null;
}
