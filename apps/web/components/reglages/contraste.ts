/**
 * Rapport de contraste WCAG entre deux couleurs hexadécimales. Sert à afficher, sous
 * l'aperçu, le contraste réel des paroles sur le thème choisi plutôt qu'un chiffre recopié.
 */

function canal(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (x) => x + x) : h, 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

export function rapportContraste(a: string, b: string): number {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (clair + 0.05) / (sombre + 0.05);
}

/** « AAA » dès 7:1, « AA » dès 4,5:1 (texte courant). */
export function niveauContraste(rapport: number): 'AAA' | 'AA' | '—' {
  return rapport >= 7 ? 'AAA' : rapport >= 4.5 ? 'AA' : '—';
}

/** « 14,1:1 » en français, « 14.1:1 » en anglais. */
export function formaterRapport(rapport: number, langue: 'fr' | 'en'): string {
  // Arrondi d'affichage seulement : le niveau AA/AAA se calcule sur la valeur exacte.
  return `${rapport.toLocaleString(langue === 'fr' ? 'fr-FR' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}:1`;
}
