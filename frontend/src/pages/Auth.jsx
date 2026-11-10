import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button, ErrorNote, Field, Input } from '../components/ui';
import { InstallHint } from '../components/InstallCard';

const TAGLINE = 'Un petit pas par jour, dans chaque domaine de ta vie.';

const MESSAGES = {
  'Invalid login credentials': 'Email ou mot de passe incorrect.',
  'User already registered': 'Un compte existe déjà avec cet email. Connecte-toi.',
  'Email not confirmed': 'Confirme d\'abord ton email : le lien est dans ta boîte de réception.',
};

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const { data, error: err } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      : await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { display_name: form.name.trim() }, emailRedirectTo: window.location.origin },
      });
    setBusy(false);
    if (err) {
      const msg = MESSAGES[err.message]
        || (/password/i.test(err.message) ? 'Mot de passe trop court : 6 caractères minimum.' : err.message);
      setError({ message: msg });
      return;
    }
    if (mode === 'signup' && !data.session) setInfo('Compte créé. Ouvre le lien reçu par email : il active ton compte et te connecte directement.');
  };

  return (
    // Mobile : la page remplit exactement la zone visible (fixed inset-0), sans dépendre de svh/dvh
    // qui se trompent dans certains navigateurs intégrés. La photo prend tout l'espace au-dessus du
    // formulaire, qui reste collé en bas : le visage n'est jamais masqué.
    // Grand écran : la photo portrait occupe sa moitié gauche, entière.
    <div className="fixed inset-0 flex flex-col bg-[#1c1213] md:static md:ml-[45%] md:min-h-[100svh] md:items-center md:justify-center md:bg-white md:p-10">
      <div className="relative min-h-0 flex-1 md:hidden">
        <img src="/images/accueil.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_36%]" fetchPriority="high" />
      </div>
      <img src="/images/accueil.jpg" alt="" className="fixed inset-y-0 left-0 hidden h-full w-[45%] object-cover object-[50%_20%] md:block" />

      <div className="fixed left-5 top-[calc(env(safe-area-inset-top)+1rem)] md:left-8 md:top-7" style={{ textShadow: '0 1px 10px rgba(28,18,19,0.7)' }}>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Davina</h1>
        <p className="mt-0.5 max-w-[16rem] text-sm font-medium text-white/95">{TAGLINE}</p>
      </div>

      <div className="relative max-h-[78%] w-full shrink-0 overflow-y-auto rounded-t-[1.25rem] bg-white text-[#1c1213] shadow-[0_-8px_30px_rgba(28,18,19,0.3)] md:max-h-none md:max-w-[22rem] md:overflow-visible md:rounded-[1.25rem] md:border md:border-[#ecdcdc] md:shadow-none">
        <form onSubmit={submit} className="space-y-3 px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 md:p-8">
          <InstallHint />
          {mode === 'signup' && <h2 className="font-display text-2xl font-extrabold">Commencer</h2>}
          {mode === 'signup' && (
            <Field label="Ton prénom"><Input value={form.name} onChange={set('name')} required autoComplete="given-name" /></Field>
          )}
          <Field label="Email"><Input type="email" inputMode="email" value={form.email} onChange={set('email')} required autoComplete="email" /></Field>
          <Field label="Mot de passe"><Input type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
          <ErrorNote error={error} />
          {info && <p className="rounded-sm border-l-4 border-rouge bg-rouge-soft px-3 py-2 text-sm">{info}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}</Button>
          <button type="button" className="min-h-11 w-full text-center text-sm font-semibold text-[#6f5f61] underline-offset-4 hover:underline" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}>
            {mode === 'login' ? 'Pas encore de compte ? Créer le mien' : 'J\'ai déjà un compte'}
          </button>
        </form>
      </div>
    </div>
  );
}
