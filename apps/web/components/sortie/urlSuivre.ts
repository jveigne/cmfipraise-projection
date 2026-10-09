import { originePublique } from '@/lib/urlPublique';

/**
 * Adresse que le QR de la sortie fait ouvrir aux téléphones de l'assemblée : `/suivre/` sur
 * l'adresse publique (lib/urlPublique), donc www.cmfipraise.com depuis l'app de bureau.
 *
 * Avec le code de la salle ouverte par la régie (`useRelaisRegie`), le téléphone arrive
 * directement dans le culte, sans rien retaper.
 */
export function urlSuivre(
  origine: { protocol: string; origin: string } | null = typeof window !== 'undefined' ? window.location : null,
  codeSalle?: string | null
): string | null {
  let url: URL;
  try {
    url = new URL('/suivre/', originePublique(origine));
  } catch {
    return null;
  }
  if (codeSalle) url.searchParams.set('salle', codeSalle);
  return url.toString();
}
