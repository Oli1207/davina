import { createClient } from '@supabase/supabase-js';
import { createDemoClient } from './demo';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const DEMO = import.meta.env.VITE_DEMO === '1';

// Une cle copiee depuis un affichage masque (« eyJhbGci•••• ») ou avec un
// caractere invisible casse toutes les requetes avec une erreur obscure.
// On le detecte au demarrage pour afficher un message clair.
const printable = (v) => /^[!-~]+$/.test(v);
export const configError = DEMO || !url || !key ? null
  : !printable(url) ? 'VITE_SUPABASE_URL contient un caractère invalide.'
    : !printable(key) ? 'VITE_SUPABASE_ANON_KEY contient des caractères invalides (souvent des « • » copiés depuis une clé masquée).'
      : null;

/** Faux si la configuration manque ou est invalide : l'app affiche alors un ecran d'aide. */
export const supabaseReady = DEMO || Boolean(url && key && !configError);

// La cle « anon » est publique par conception : la securite repose sur la
// Row Level Security cote base, pas sur le secret de cette cle.
export const supabase = DEMO
  ? createDemoClient()
  : createClient(url || 'http://localhost', key || 'absent', {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'davina-auth' },
  });

/** Leve l'erreur Supabase pour que react-query la remonte, sinon renvoie les donnees. */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
