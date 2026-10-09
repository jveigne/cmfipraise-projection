import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { creerTransportLocal } from './local';
import { normaliserCodeSalle, type CommandeDistante, type CoteRegie, type CoteTelephone, type EtatDiffuse } from './transport';

const attendre = (ms = 30) => new Promise((r) => setTimeout(r, ms));

const etat: EtatDiffuse = {
  v: 1,
  titre: 'Grâce infinie',
  programme: null,
  precedente: null,
  enDirect: { libelle: '1.', genre: 'couplet', lignes: ['Grâce'], lignesSecondes: null, reference: null },
  suivante: null,
  ecranNoir: false,
  texteMasque: false,
  logo: false,
  langues: { premiere: 'fr', seconde: null },
  misAJourLe: 1,
};

describe('transport distant local', () => {
  const transport = creerTransportLocal();
  let regie: CoteRegie;
  const telephones: CoteTelephone[] = [];

  beforeEach(() => {
    window.sessionStorage.clear();
    regie = transport.ouvrirRegie();
  });

  afterEach(() => {
    telephones.splice(0).forEach((t) => t.fermer());
    regie.fermer();
  });

  it('est disponible dans ce navigateur', () => {
    expect(transport.disponible).toBe(true);
    expect(normaliserCodeSalle(regie.invitation.codeSalle)).toBe(regie.invitation.codeSalle);
    expect(regie.invitation.adresse('assemblee')).toContain(`/suivre/?salle=${regie.invitation.codeSalle}`);
  });

  it('admet l’assemblée sans demande et lui envoie l’état', async () => {
    regie.diffuser(etat);
    const tel = transport.rejoindre({ codeSalle: regie.invitation.codeSalle, role: 'assemblee', nom: '' });
    telephones.push(tel);
    await attendre();
    expect(tel.liaison()).toBe('connecte');
    expect(tel.etat()?.titre).toBe('Grâce infinie');
    // Lecture seule : rien ne part.
    expect(tel.envoyer({ type: 'suivante' })).toBe(false);
  });

  it('n’exécute les commandes d’une télécommande qu’après acceptation', async () => {
    const recues: CommandeDistante[] = [];
    regie.surCommande((c) => recues.push(c));
    const tel = transport.rejoindre({ codeSalle: regie.invitation.codeSalle, role: 'telecommande', nom: 'Paul' });
    telephones.push(tel);
    await attendre();

    const demande = regie.appareils().find((a) => a.role === 'telecommande');
    expect(demande).toMatchObject({ nom: 'Paul', statut: 'en-attente', codeVerification: tel.codeVerification });
    expect(tel.envoyer({ type: 'suivante' })).toBe(false);

    regie.accepter(demande!.id);
    await attendre();
    expect(tel.liaison()).toBe('connecte');
    expect(tel.envoyer({ type: 'suivante' })).toBe(true);
    await attendre();
    expect(recues).toEqual([{ type: 'suivante' }]);

    regie.retirer(demande!.id);
    await attendre();
    expect(tel.liaison()).toBe('termine');
  });

  it('prévient le téléphone d’un refus', async () => {
    const tel = transport.rejoindre({ codeSalle: regie.invitation.codeSalle, role: 'telecommande', nom: '' });
    telephones.push(tel);
    await attendre();
    regie.refuser(regie.appareils()[0]!.id);
    await attendre();
    expect(tel.liaison()).toBe('refuse');
    expect(regie.appareils()).toHaveLength(0);
  });

  it('ignore une autre salle', async () => {
    const tel = transport.rejoindre({ codeSalle: 'ZZZZZZ', role: 'assemblee', nom: '' });
    telephones.push(tel);
    await attendre();
    expect(regie.appareils()).toHaveLength(0);
    expect(tel.liaison()).toBe('connexion');
  });
});

describe('normaliserCodeSalle', () => {
  it('accepte minuscules, espaces et tiret ; refuse les caractères ambigus', () => {
    expect(normaliserCodeSalle('k7m q2-x')).toBe('K7MQ2X');
    expect(normaliserCodeSalle('K7MQ2O')).toBeNull();
    expect(normaliserCodeSalle('ABC')).toBeNull();
  });
});
