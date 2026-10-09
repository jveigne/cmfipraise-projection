'use client';

/**
 * Page Soutien (design 10) : don volontaire, ponctuel ou mensuel, par carte ou Mobile
 * Money. Aucune intégration de paiement : la page prépare le choix et mène chez le
 * prestataire, qui demande lui-même numéro et e-mail (CMFIPraise ne voit jamais les
 * données de paiement). Tant que le lien n'est pas défini, le bouton est désactivé et le
 * dit.
 *
 * Tous les choix sont de vrais boutons radio natifs : flèches du clavier, lecteurs d'écran
 * et formulaires fonctionnent sans code.
 */
import Link from 'next/link';
import { useId, useState } from 'react';

import { Icone } from '@/components/ui';
import { formater, useLangue, useT, type Langue } from '@/lib/i18n';

import { BandeauDon } from './BandeauDon';
import styles from './EcranSoutien.module.css';
import { construireLienDon, PRESTATAIRE_DON } from './liens';

type Devise = 'XAF' | 'EUR' | 'USD';
type Frequence = 'unique' | 'mensuel';
type Moyen = 'carte' | 'mobile';
type Operateur = 'orange' | 'mtn' | 'autre';

/** Montants proposés par devise : 5 000 FCFA ne vaut pas 5 000 €. */
const MONTANTS: Record<Devise, number[]> = {
  XAF: [2000, 5000, 10000],
  EUR: [5, 10, 20],
  USD: [5, 10, 20],
};
const PAR_DEFAUT: Record<Devise, number> = { XAF: 5000, EUR: 10, USD: 10 };

function locale(langue: Langue): string {
  return langue === 'fr' ? 'fr-FR' : 'en-GB';
}

function nombre(n: number, langue: Langue): string {
  return new Intl.NumberFormat(locale(langue), { maximumFractionDigits: 0 }).format(n);
}

function somme(n: number, devise: Devise, langue: Langue): string {
  return new Intl.NumberFormat(locale(langue), { style: 'currency', currency: devise, maximumFractionDigits: 0 }).format(n);
}

export function EcranSoutien() {
  const t = useT('don');
  const { langue } = useLangue();
  const id = useId();
  const [frequence, setFrequence] = useState<Frequence>('unique');
  const [devise, setDevise] = useState<Devise>('XAF');
  const [montant, setMontant] = useState<number | 'autre'>(PAR_DEFAUT.XAF);
  const [autre, setAutre] = useState('');
  const [moyen, setMoyen] = useState<Moyen>('mobile');
  const [operateur, setOperateur] = useState<Operateur>('orange');

  const valeur = montant === 'autre' ? Number(autre.replace(/[\s  ,.]/g, '')) : montant;
  const valide = Number.isFinite(valeur) && valeur > 0;
  const lien = valide
    ? construireLienDon({ montant: valeur, devise, frequence, moyen, operateur: moyen === 'mobile' ? operateur : undefined })
    : null;
  const libelleBouton = valide
    ? formater(frequence === 'mensuel' ? t.donnerMensuel : t.donner, { somme: somme(valeur, devise, langue) })
    : t.choisirMontant;

  const changerDevise = (d: Devise) => {
    setDevise(d);
    if (montant !== 'autre') setMontant(PAR_DEFAUT[d]);
  };

  return (
    <div className={styles.page}>
      <BandeauDon forme="bande">{t.bandeau}</BandeauDon>

      <main className={styles.contenu}>
        <div className={styles.presentation}>
          <Link href="/" className={styles.retour}>
            <Icone nom="chevronGauche" />
            {t.retourAccueil}
          </Link>
          <h1 className="accroche">{t.titre}</h1>
          <p className={styles.chapeau}>{t.chapeau}</p>
          <ul className={styles.engagements}>
            {[t.engagement1, t.engagement2, t.engagement3].map((e) => (
              <li key={e}>
                <Icone nom="coche" taille={20} epaisseur={1.6} className={styles.coche} />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>

        <form className={styles.formulaire} onSubmit={(e) => e.preventDefault()} aria-label={t.formulaire}>
          <fieldset className={styles.frequence}>
            <legend className="visuellement-masque">{t.frequence}</legend>
            {(['unique', 'mensuel'] as const).map((f) => (
              <label key={f} className={styles.optionFrequence}>
                <input type="radio" name={`${id}-frequence`} checked={frequence === f} onChange={() => setFrequence(f)} />
                <span>{f === 'unique' ? t.uneFois : t.chaqueMois}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className={styles.groupe}>
            <legend className={styles.legende}>{t.montant}</legend>
            <div className={styles.montants}>
              {MONTANTS[devise].map((m) => (
                <label key={m} className={styles.optionMontant}>
                  <input type="radio" name={`${id}-montant`} checked={montant === m} onChange={() => setMontant(m)} />
                  <span>{nombre(m, langue)}</span>
                </label>
              ))}
              <label className={`${styles.optionMontant} ${styles.autre}`}>
                <input type="radio" name={`${id}-montant`} checked={montant === 'autre'} onChange={() => setMontant('autre')} />
                <span>{t.autre}</span>
              </label>
            </div>
            {montant === 'autre' && (
              <label className={styles.champ}>
                {formater(t.montantLibre, { devise: t[`devise${devise}`] })}
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={autre}
                  onChange={(e) => setAutre(e.target.value)}
                  className={styles.saisie}
                />
              </label>
            )}
            <div className={styles.devise}>
              <label htmlFor={`${id}-devise`}>{t.devise}</label>
              <select id={`${id}-devise`} value={devise} onChange={(e) => changerDevise(e.target.value as Devise)} className={styles.select}>
                <option value="XAF">{t.deviseXAF}</option>
                <option value="EUR">{t.deviseEUR}</option>
                <option value="USD">{t.deviseUSD}</option>
              </select>
            </div>
          </fieldset>

          <fieldset className={styles.groupe}>
            <legend className={styles.legende}>{t.moyen}</legend>
            <div className={styles.moyens}>
              {(['carte', 'mobile'] as const).map((m) => (
                <label key={m} className={styles.optionMoyen}>
                  <input type="radio" name={`${id}-moyen`} checked={moyen === m} onChange={() => setMoyen(m)} />
                  <Icone nom={m === 'carte' ? 'carte' : 'telephone'} taille={22} />
                  <span>{m === 'carte' ? t.carte : t.mobileMoney}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {moyen === 'mobile' && (
            <fieldset className={styles.operateurs}>
              <legend className="visuellement-masque">{t.operateur}</legend>
              {(['orange', 'mtn', 'autre'] as const).map((o) => (
                <label key={o} className={styles.optionOperateur}>
                  <input type="radio" name={`${id}-operateur`} checked={operateur === o} onChange={() => setOperateur(o)} />
                  {o === 'orange' ? t.orange : o === 'mtn' ? t.mtn : t.autreOperateur}
                </label>
              ))}
            </fieldset>
          )}

          <p className={styles.coordonnees}>{moyen === 'mobile' ? t.coordonneesMobile : t.coordonneesCarte}</p>

          {lien ? (
            <a href={lien} className={styles.donner} target="_blank" rel="noopener noreferrer">
              {libelleBouton}
            </a>
          ) : (
            <button type="button" className={styles.donner} disabled aria-describedby={`${id}-indisponible`}>
              {libelleBouton}
            </button>
          )}
          {valide && !lien && (
            <p id={`${id}-indisponible`} role="status" className={styles.indisponible}>
              {t.paiementBientot}
            </p>
          )}
          <p className="meta">
            {moyen === 'mobile' ? `${t.validerTelephone} ` : ''}
            {formater(t.prestataire, { prestataire: PRESTATAIRE_DON ?? t.prestataireDefaut })}
          </p>
        </form>
      </main>
    </div>
  );
}
