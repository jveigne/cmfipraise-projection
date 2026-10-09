import { afterEach, describe, expect, it } from 'vitest';

import { ouvrirCanal, type CanalProjection, type MessageProjection } from './canal';

const ouverts: CanalProjection[] = [];
afterEach(() => ouverts.splice(0).forEach((c) => c.fermer()));

function canal(...args: Parameters<typeof ouvrirCanal>) {
  const c = ouvrirCanal(...args);
  ouverts.push(c);
  return c;
}

describe('canal de projection', () => {
  it('transmet un message aux autres fenêtres, pas à l’émetteur', async () => {
    const nom = `test-${Math.random()}`;
    const regie = canal('regie', nom);
    const sortie = canal('sortie', nom);
    const recus: MessageProjection[] = [];
    const recusRegie: MessageProjection[] = [];
    sortie.ecouter((m, e) => {
      expect(e.role).toBe('regie');
      recus.push(m);
    });
    regie.ecouter((m) => recusRegie.push(m));
    regie.envoyer({ type: 'demande-etat' });
    await new Promise((r) => setTimeout(r, 20));
    expect(recus).toEqual([{ type: 'demande-etat' }]);
    expect(recusRegie).toEqual([]);
  });

  it('ignore un message d’un autre protocole', async () => {
    const nom = `test-${Math.random()}`;
    const sortie = canal('sortie', nom);
    const recus: unknown[] = [];
    sortie.ecouter((m) => recus.push(m));
    const intrus = new BroadcastChannel(nom);
    intrus.postMessage({ v: 99, source: 'x', role: 'regie', message: { type: 'etat' } });
    intrus.postMessage('n’importe quoi');
    await new Promise((r) => setTimeout(r, 20));
    intrus.close();
    expect(recus).toEqual([]);
  });
});
