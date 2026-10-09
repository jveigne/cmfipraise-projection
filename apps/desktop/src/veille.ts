/**
 * Anti-veille : l'écran ne doit pas s'éteindre au milieu d'un chant.
 *
 * Deux sources de verrous : ceux que la web app demande (contrat `veille`), et un verrou
 * automatique tenu tant qu'une sortie est ouverte — un bénévole qui a oublié le réglage ne
 * voit pas le projecteur se mettre en veille pendant la prédication.
 */
import { powerSaveBlocker } from 'electron';

/** Verrous demandés par la web app, par webContents : libérés si la page se ferme ou recharge. */
const parContenu = new Map<number, Set<number>>();
let verrouSorties: number | null = null;

export function empecher(idContenu: number): number {
  const id = powerSaveBlocker.start('prevent-display-sleep');
  const ensemble = parContenu.get(idContenu) ?? new Set<number>();
  ensemble.add(id);
  parContenu.set(idContenu, ensemble);
  return id;
}

export function autoriser(idContenu: number, id: number): void {
  const ensemble = parContenu.get(idContenu);
  // On ne libère que ses propres verrous : une page ne peut pas couper celui d'une autre.
  if (!ensemble?.has(id)) return;
  ensemble.delete(id);
  if (powerSaveBlocker.isStarted(id)) powerSaveBlocker.stop(id);
}

export function libererContenu(idContenu: number): void {
  for (const id of parContenu.get(idContenu) ?? []) {
    if (powerSaveBlocker.isStarted(id)) powerSaveBlocker.stop(id);
  }
  parContenu.delete(idContenu);
}

/** Appelé quand le nombre de sorties ouvertes change. */
export function suivreSorties(auMoinsUne: boolean): void {
  if (auMoinsUne && verrouSorties === null) {
    verrouSorties = powerSaveBlocker.start('prevent-display-sleep');
  } else if (!auMoinsUne && verrouSorties !== null) {
    if (powerSaveBlocker.isStarted(verrouSorties)) powerSaveBlocker.stop(verrouSorties);
    verrouSorties = null;
  }
}
