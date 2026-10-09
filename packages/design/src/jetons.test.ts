import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  Couleurs,
  CouleursProjection,
  OmbreGlisser,
  Polices,
  Structure,
  Teintes,
  TypoInterface,
  tailleProjection,
  tailleProjectionVh,
} from './jetons';

const css = readFileSync(fileURLToPath(new URL('./jetons.css', import.meta.url)), 'utf8');

/** Lit la valeur d'une variable CSS déclarée dans jetons.css. */
function variable(nom: string): string | undefined {
  const m = css.match(new RegExp(`--${nom}:\\s*([^;]+);`));
  return m?.[1]?.trim();
}

/** bleuCmfi → bleu-cmfi */
function enKebab(nom: string): string {
  return nom.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);
}

describe('jetons.css reste le miroir de jetons.ts', () => {
  it.each(Object.entries({ ...Couleurs, ...Teintes, ...CouleursProjection }))(
    'couleur %s',
    (nom, valeur) => {
      expect(variable(enKebab(nom))?.toLowerCase()).toBe(valeur.toLowerCase());
    }
  );

  it('polices', () => {
    expect(variable('police-serif')).toBe(Polices.serif);
    expect(variable('police-sans')).toBe(Polices.sans);
  });

  it('structure', () => {
    expect(variable('rayon-surface')).toBe(`${Structure.rayon.surface}px`);
    expect(variable('rayon-bouton')).toBe(`${Structure.rayon.bouton}px`);
    expect(variable('rayon-vignette')).toBe(`${Structure.rayon.vignette}px`);
    expect(variable('gouttiere')).toBe(`${Structure.gouttiere}px`);
    expect(variable('cible-minimale')).toBe(`${Structure.cible.minimale}px`);
    expect(variable('cible-suivant')).toBe(`${Structure.cible.suivant}px`);
    expect(variable('cible-bascule')).toBe(`${Structure.cible.bascule}px`);
    expect(variable('bordure-direct')).toBe(`${Structure.bordure.direct}px`);
    expect(variable('ombre-glisser')).toBe(OmbreGlisser);
  });

  it('typographie de l’interface', () => {
    expect(variable('taille-titre-ecran')).toBe(`${TypoInterface.titreEcran.taille}px`);
    expect(variable('taille-paroles')).toBe(`${TypoInterface.paroles.taille}px`);
    expect(variable('taille-accroche')).toBe(`${TypoInterface.accroche.taille}px`);
  });

  it('échelle de projection en vh', () => {
    expect(variable('proj-paroles')).toBe(tailleProjectionVh('paroles'));
    expect(variable('proj-paroles-bilingue')).toBe(tailleProjectionVh('parolesBilingue'));
    expect(variable('proj-seconde-langue')).toBe(tailleProjectionVh('secondeLangue'));
    expect(variable('proj-verset-double')).toBe(tailleProjectionVh('versetDouble'));
    expect(variable('proj-reference')).toBe(tailleProjectionVh('reference'));
  });
});

describe('tailleProjection', () => {
  it('s’échelonne avec la hauteur de la sortie', () => {
    expect(tailleProjection('paroles', 1080)).toBe(72);
    expect(tailleProjection('paroles', 720)).toBe(48);
    expect(tailleProjection('reference', 2160)).toBe(56);
  });
});
