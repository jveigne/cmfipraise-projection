import { CouleursProjection, Couleurs } from '@cmfi/design';
import { describe, expect, it } from 'vitest';

import { formaterRapport, niveauContraste, rapportContraste } from './contraste';

describe('contraste des thèmes de projection', () => {
  it('retrouve les chiffres de la maquette (14,1:1 sur Nuit, 18,6:1 sur Noir)', () => {
    const nuit = rapportContraste(CouleursProjection.ivoireProjection, Couleurs.nuit);
    const noir = rapportContraste(CouleursProjection.ivoireProjection, CouleursProjection.ecranNoir);
    expect(formaterRapport(nuit, 'fr')).toBe('14,1:1');
    expect(formaterRapport(noir, 'fr')).toBe('18,6:1');
    expect(niveauContraste(nuit)).toBe('AAA');
  });

  it('est symétrique et vaut 21 entre noir et blanc', () => {
    expect(rapportContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(rapportContraste('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
  });
});
