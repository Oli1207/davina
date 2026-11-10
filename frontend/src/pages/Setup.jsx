import { configError } from '../lib/supabase';

/** Affiché tant que Supabase n'est pas branché (fichier .env manquant ou invalide). */
export default function Setup() {
  return (
    <div className="mx-auto flex min-h-[100svh] max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="font-display text-3xl font-extrabold text-rouge">Davina</h1>
      <p className="font-semibold">{configError || 'Supabase n\'est pas encore branché.'}</p>
      <p className="text-sm text-muted">
        Copie <code>frontend/.env.example</code> en <code>.env</code>, remplis l'adresse et la clé « anon » de ton projet,
        puis relance. Pas à pas : <code>docs/SUPABASE.md</code>. Pour essayer sans backend : <code>npm run demo</code>.
      </p>
    </div>
  );
}
