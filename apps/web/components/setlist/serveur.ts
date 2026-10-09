/**
 * Copie d'une setlist locale sur le compte, pour la partager (code permanent du backend).
 *
 * Le serveur ne connaît que des chants, et chacun une seule fois par setlist (clé
 * setlist + chant) : les passages bibliques et les doublons restent sur cet appareil.
 * L'éditeur le dit. Le backend ne sait pas renommer une setlist : le nom partagé est celui
 * du moment de la publication.
 */
import type { ClientApi, SetlistDTO, SetlistLocale } from '@cmfi/api';

/** Chants à envoyer, dans l'ordre, sans doublon. */
export function chantsPartageables(setlist: SetlistLocale): string[] {
  const vus = new Set<string>();
  const ids: string[] = [];
  for (const e of setlist.elements) {
    if (e.type === 'chant' && !vus.has(e.chantId)) {
      vus.add(e.chantId);
      ids.push(e.chantId);
    }
  }
  return ids;
}

/** Vrai si une partie de la setlist ne part pas sur le serveur. */
export function partageIncomplet(setlist: SetlistLocale): { bible: boolean; doublons: boolean } {
  const chants = setlist.elements.filter((e) => e.type === 'chant').length;
  return {
    bible: setlist.elements.some((e) => e.type === 'bible'),
    doublons: chants > chantsPartageables(setlist).length,
  };
}

/** Crée la copie sur le compte ; renvoie l'identifiant serveur. */
export async function publierSetlist(api: ClientApi, setlist: SetlistLocale): Promise<string> {
  const dto = await api.creerSetlist({ name: setlist.nom.trim() || 'Setlist', songIds: chantsPartageables(setlist) });
  return dto.id;
}

/**
 * Met la copie du compte à l'image de la setlist locale : retire ce qui n'y est plus,
 * ajoute ce qui manque, puis replace chaque chant à son rang.
 */
export async function pousserSetlist(api: ClientApi, setlist: SetlistLocale): Promise<SetlistDTO> {
  if (!setlist.idServeur) throw new Error('Setlist jamais publiée');
  const id = setlist.idServeur;
  const serveur = await api.setlistParId(id);
  const voulus = chantsPartageables(setlist);
  const actuels = new Set((serveur.songs ?? []).map((s) => s.id));

  for (const idChant of actuels) {
    if (!voulus.includes(idChant)) await api.retirerChantSetlist(id, idChant);
  }
  for (const [i, idChant] of voulus.entries()) {
    if (actuels.has(idChant)) await api.deplacerChantSetlist(id, idChant, i + 1);
    else await api.ajouterChantSetlist(id, { songId: idChant, position: i + 1 });
  }
  return api.setlistParId(id);
}

/** « A1B2C3D4 » → « A1B2·C3D4 », plus facile à dicter et à recopier. */
export function formaterCode(code: string): string {
  const net = code.trim().toUpperCase();
  if (net.length < 6) return net;
  const milieu = Math.ceil(net.length / 2);
  return `${net.slice(0, milieu)}·${net.slice(milieu)}`;
}
