/**
 * Appairage d'un téléphone, côté régie. La régie monte `useRelaisRegie` une fois pour le
 * culte et ouvre `DialogueAppairage` à la demande. Le QR est `CodeQr` de components/ui.
 */
export { DialogueAppairage } from './DialogueAppairage';
export type { PropsDialogueAppairage } from './DialogueAppairage';
export { useRelaisRegie } from '@/lib/reseau/distant';
export type { OptionsRelaisRegie, RelaisRegie } from '@/lib/reseau/distant';
