'use client';

/**
 * « Appairer un téléphone » (design 06), ouverte depuis la régie.
 *
 *   const relais = useRelaisRegie({ langueParoles, surPassage });   // une fois, dans la régie
 *   <DialogueAppairage ouvert={ouvert} surFermeture={() => setOuvert(false)} relais={relais} />
 *
 * Sans `relais`, la boîte ouvre sa propre salle le temps d'être affichée : les téléphones se
 * déconnectent quand on la ferme. C'est pratique pour un aperçu, pas pour un culte.
 *
 * Boîte `Dialogue` de components/ui, en disposition « sections » (en-tête, onglets, corps).
 */
import { useId, useState } from 'react';

import { useReglages } from '@/components/reglages/stockage';
import { Bouton, CodeQr, Dialogue, Onglets, idOnglet, idPanneau } from '@/components/ui';
import { formater, useT } from '@/lib/i18n';
import { useRelaisRegie, type RelaisRegie } from '@/lib/reseau/distant';
import type { AppareilDistant, RoleDistant } from '@/lib/reseau/transport';

import styles from './DialogueAppairage.module.css';

export interface PropsDialogueAppairage {
  ouvert: boolean;
  surFermeture: () => void;
  /** Relais ouvert par la régie pour tout le culte (`useRelaisRegie`). */
  relais?: RelaisRegie;
  ongletInitial?: RoleDistant;
}

function Etapes({ etapes }: { etapes: string[] }) {
  return (
    <ol className={styles.etapes}>
      {etapes.map((e, i) => (
        <li key={i} className={styles.etape}>
          <span className={styles.numero} aria-hidden="true">
            {i + 1}.
          </span>
          <span>{e}</span>
        </li>
      ))}
    </ol>
  );
}

export function DialogueAppairage({ ouvert, surFermeture, relais, ongletInitial = 'telecommande' }: PropsDialogueAppairage) {
  const t = useT('appairage');
  const [reglages] = useReglages();
  const interne = useRelaisRegie({ actif: ouvert && !relais, langueParoles: reglages.langueParoles });
  const r = relais ?? interne;

  const [onglet, setOnglet] = useState<RoleDistant>(ongletInitial);
  const [copiee, setCopiee] = useState(false);
  const idBase = useId();

  const telecommandes = r.appareils.filter((a) => a.role === 'telecommande');
  const demande: AppareilDistant | undefined = telecommandes.find((a) => a.statut === 'en-attente');
  const appairees = telecommandes.filter((a) => a.statut === 'accepte');
  const spectateurs = r.appareils.filter((a) => a.role === 'assemblee').length;
  const adresse = r.invitation?.adresse(onglet) ?? null;

  async function copier() {
    if (!adresse) return;
    try {
      await navigator.clipboard.writeText(adresse);
      setCopiee(true);
      window.setTimeout(() => setCopiee(false), 2500);
    } catch {
      // Presse-papiers refusé : l'adresse reste lisible et sélectionnable.
    }
  }

  const onglets = [
    { id: 'telecommande' as const, libelle: t.ongletTelecommande },
    { id: 'assemblee' as const, libelle: t.ongletAssemblee },
  ];

  return (
    <Dialogue ouvert={ouvert} surFermeture={surFermeture} titre={t.titre} largeur="large" disposition="sections">
      <div className={styles.onglets}>
        <Onglets onglets={onglets} actif={onglet} surChangement={setOnglet} idBase={idBase} aria-label={t.typeAria} />
      </div>

      <div id={idPanneau(idBase, onglet)} role="tabpanel" aria-labelledby={idOnglet(idBase, onglet)} className={styles.corps}>
        {!r.disponible || !adresse || !r.invitation ? (
          <p className={styles.indisponible}>{t.indisponible}</p>
        ) : (
          <>
            <div className={styles.colonneQr}>
              <CodeQr valeur={adresse} libelle={formater(t.qrAria, { adresse })} />
              <span className={styles.codeSalle}>{formater(t.codeSalle, { code: r.invitation.codeSalle })}</span>
              <Bouton variante="discret" taille="compacte" icone="copier" onClick={() => void copier()}>
                {copiee ? t.adresseCopiee : t.copierAdresse}
              </Bouton>
              <span className="visuellement-masque" role="status">
                {copiee ? t.adresseCopiee : ''}
              </span>
            </div>

            <div className={styles.colonneTexte}>
              {onglet === 'telecommande' ? (
                <>
                  <Etapes etapes={[t.etapeTelecommande1, t.etapeTelecommande2, t.etapeTelecommande3]} />
                  <div className={styles.demande} role="status">
                    {demande ? (
                      <>
                        <span className={styles.codeVerification}>{demande.codeVerification}</span>
                        <span className={styles.demandeTexte}>
                          {demande.nom ? formater(t.demande, { nom: demande.nom }) : t.demandeAnonyme}
                        </span>
                      </>
                    ) : (
                      <span className={styles.demandeTexte}>{t.enAttente}</span>
                    )}
                  </div>
                  {demande && (
                    <div className={styles.decision}>
                      <Bouton variante="plein" taille="grande" className={styles.accepter} onClick={() => r.accepter(demande.id)}>
                        {t.accepter}
                      </Bouton>
                      <Bouton variante="secondaire" taille="grande" onClick={() => r.refuser(demande.id)}>
                        {t.refuser}
                      </Bouton>
                    </div>
                  )}
                  {appairees.length > 0 && (
                    <div className={styles.appairees}>
                      <span className="etiquette-etat">{t.appairees}</span>
                      <ul className={styles.listeAppairees}>
                        {appairees.map((a) => {
                          const nom = a.nom || t.appareilSansNom;
                          return (
                            <li key={a.id} className={styles.appareil}>
                              <span className={styles.appareilNom}>{nom}</span>
                              <span className={styles.appareilCode}>{a.codeVerification}</span>
                              <Bouton
                                variante="secondaire"
                                taille="compacte"
                                aria-label={formater(t.retirerAria, { nom })}
                                onClick={() => r.retirer(a.id)}
                              >
                                {t.retirer}
                              </Bouton>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Etapes etapes={[t.etapeAssemblee1, t.etapeAssemblee2, t.etapeAssemblee3]} />
                  <div className={styles.demande} role="status">
                    <span className={styles.demandeTexte}>
                      {spectateurs === 0
                        ? t.spectateursAucun
                        : formater(spectateurs === 1 ? t.spectateursUn : t.spectateursPlusieurs, { n: spectateurs })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className={styles.pied}>
        <span className={styles.note}>{t.note}</span>
        {r.mode === 'local' && <span className={styles.note}>{t.modeLocal}</span>}
      </div>
    </Dialogue>
  );
}
