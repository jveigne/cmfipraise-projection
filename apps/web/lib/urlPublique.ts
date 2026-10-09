/**
 * Adresse publique de la web app : celle que les QR et les liens partagés font ouvrir sur un
 * autre appareil.
 *
 * Sur le web, c'est l'origine du site, pour qu'un QR affiché en développement mène au serveur de
 * développement. Dans l'app de bureau, l'origine est `app://…`, qu'un téléphone ne sait pas
 * ouvrir : on prend alors le site public. NEXT_PUBLIC_URL_PUBLIQUE, fixée au build, l'emporte
 * partout (ex. une préproduction).
 */
export const URL_PUBLIQUE_PAR_DEFAUT = 'https://www.cmfipraise.com';

const URL_PUBLIQUE = process.env.NEXT_PUBLIC_URL_PUBLIQUE;

export function originePublique(
  origine: { protocol: string; origin: string } | null = typeof window !== 'undefined' ? window.location : null
): string {
  if (URL_PUBLIQUE) return URL_PUBLIQUE.replace(/\/+$/, '');
  if (origine && /^https?:$/.test(origine.protocol)) return origine.origin;
  return URL_PUBLIQUE_PAR_DEFAUT;
}
