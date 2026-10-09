import { ClientApi, ErreurApi, type ChantDTO, type ElementSetlist } from '@cmfi/api';
import { sourceEchantillon } from '@cmfi/projection';
import { describe, expect, it, vi } from 'vitest';

import { textes } from '@/lib/i18n';

import { CHANTS_SECOURS_EXEMPLE } from './exemple';
import { resoudreElement, type ContexteResolution } from './resolution';

const CHANT: ChantDTO = {
  id: 'c1',
  title: 'Grâce infinie',
  position: 112,
  keyRootIndex: 7,
  keyIsMinor: false,
  parts: [
    { position: 1, type: 'VERSE', partId: 1, lines: [{ line: 'Couplet un' }] },
    { position: 2, type: 'CHORUS', partId: 9, lines: [{ line: 'Refrain' }] },
    { position: 3, type: 'VERSE', partId: 2, lines: [{ line: 'Couplet deux' }] },
    { position: 4, type: 'CHORUS', partId: 9, lines: [{ line: 'Refrain' }] },
  ],
};

/** Client dont chaque requête échoue comme si le réseau était coupé. */
function clientHorsLigne(): ClientApi {
  const api = new ClientApi();
  vi.spyOn(api, 'chantParId').mockRejectedValue(new ErreurApi('Réseau indisponible', { chemin: '/song', reseau: true }));
  return api;
}

function contexte(partiel: Partial<ContexteResolution> = {}): ContexteResolution {
  return {
    api: clientHorsLigne(),
    bible: sourceEchantillon,
    langue: 'fr',
    t: textes('regie', 'fr'),
    chantsConnus: new Map(),
    secours: new Map(),
    ...partiel,
  };
}

describe('resoudreElement — chants', () => {
  const element: ElementSetlist = { type: 'chant', id: 'e1', chantId: 'c1', titre: 'Grâce infinie', recueil: 'Recueil CMFI', numero: 112 };

  it('développe un chant connu dans l’ordre d’enchaînement, avec sa méta', async () => {
    const r = await resoudreElement(element, contexte({ chantsConnus: new Map([['c1', CHANT]]) }));
    expect(r.statut).toBe('pret');
    if (r.statut !== 'pret') return;
    expect(r.projete.id).toBe('e1');
    expect(r.projete.ordre).toBe('1 R 2 R');
    expect(r.projete.diapositives).toHaveLength(4);
    expect(r.projete.meta).toBe('Recueil CMFI · n° 112 · Sol');
    expect(r.exemple).toBe(false);
  });

  it('hors-ligne et sans copie : erreur « réseau », jamais une exception', async () => {
    const r = await resoudreElement(element, contexte());
    expect(r).toEqual({ statut: 'erreur', cause: 'reseau' });
  });

  it('retombe sur la copie d’exemple, marquée comme telle', async () => {
    const [id] = [...CHANTS_SECOURS_EXEMPLE.keys()];
    const r = await resoudreElement({ type: 'chant', id: 'x', chantId: id!, titre: 'A TOI LA GLOIRE.' }, contexte({ secours: CHANTS_SECOURS_EXEMPLE }));
    expect(r.statut).toBe('pret');
    if (r.statut !== 'pret') return;
    expect(r.exemple).toBe(true);
    expect(r.projete.meta).toContain('exemple');
  });

  it('une tonalité choisie devient une transposition depuis l’originale', async () => {
    // Sol (7) → La (9) : deux demi-tons ; Sol → Fa (5) : dix, jamais négatif.
    const la = await resoudreElement({ ...element, tonalite: 9 }, contexte({ chantsConnus: new Map([['c1', CHANT]]) }));
    expect(la.statut === 'pret' && la.projete.tonalite).toEqual({ racine: 7, mineur: false });
    expect(la.statut === 'pret' && la.projete.transposition).toBe(2);
    const fa = await resoudreElement({ ...element, tonalite: 5 }, contexte({ chantsConnus: new Map([['c1', CHANT]]) }));
    expect(fa.statut === 'pret' && fa.projete.transposition).toBe(10);
  });

  it('une seconde langue manquante ne rend pas le chant inutilisable', async () => {
    const r = await resoudreElement({ ...element, chantSecondId: 'absent' }, contexte({ chantsConnus: new Map([['c1', CHANT]]) }));
    expect(r.statut).toBe('pret');
    if (r.statut === 'pret') expect(r.secondeManquante).toBe(true);
  });
});

describe('resoudreElement — Bible', () => {
  it('lit l’échantillon, une diapositive par verset, et le signale', async () => {
    const r = await resoudreElement({ type: 'bible', id: 'b1', reference: 'Psaume 23:1-4', version: 'LSG', secondeVersion: 'KJV' }, contexte());
    expect(r.statut).toBe('pret');
    if (r.statut !== 'pret') return;
    expect(r.echantillon).toBe(true);
    expect(r.projete.diapositives).toHaveLength(4);
    expect(r.projete.diapositives[0]?.lignesSecondes).not.toBeNull();
    expect(r.projete.meta).toBe('Bible · LSG + KJV · 4 versets · échantillon');
  });

  it('un passage hors échantillon est indisponible : aucun texte inventé', async () => {
    const r = await resoudreElement({ type: 'bible', id: 'b2', reference: 'Romains 8:28', version: 'LSG' }, contexte());
    expect(r).toEqual({ statut: 'erreur', cause: 'bible-absente' });
  });

  it('refuse une référence illisible ou une version inconnue', async () => {
    expect(await resoudreElement({ type: 'bible', id: 'b3', reference: 'Jo 3', version: 'LSG' }, contexte())).toEqual({ statut: 'erreur', cause: 'reference' });
    expect(await resoudreElement({ type: 'bible', id: 'b4', reference: 'Jean 3:16', version: 'NIV' }, contexte())).toEqual({ statut: 'erreur', cause: 'version' });
  });
});
