import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronLeft, Download, LogOut } from 'lucide-react';
import { exportAll } from '../lib/export';
import { useSave } from '../hooks/useData';
import { useAuth } from '../store/auth';
import { usePrefs } from '../store/prefs';
import { currentSubscription, pushSupport, subscribePush, unsubscribePush } from '../lib/push';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { Button, Chips, Field, Input } from '../components/ui';
import InstallCard from '../components/InstallCard';

export default function Settings({ profile }) {
  const save = useSave('profiles');
  const { signOut } = useAuth();
  const { theme, setTheme } = usePrefs();
  const [name, setName] = useState(profile?.display_name || '');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const support = pushSupport();

  useEffect(() => { currentSubscription().then((s) => setSubscribed(!!s)).catch(() => {}); }, []);

  // `profiles` a pour clé `id` : la mise à jour passe par l'id du profil.
  const patch = (fields, msg = 'Enregistré ✓') => save.mutate({ id: profile.id, ...fields }, { onSuccess: () => toast(msg) });

  const togglePush = async () => {
    setBusy(true);
    try {
      if (subscribed) { await unsubscribePush(); setSubscribed(false); toast('Notifications désactivées'); }
      else { await subscribePush(); setSubscribed(true); toast('Notifications activées ✓'); }
    } catch (e) { toast(e.message, { tone: 'error' }); }
    setBusy(false);
  };

  const doExport = async () => {
    setExporting(true);
    try { await exportAll(); toast('Fichier téléchargé ✓'); } catch (e) { toast(e.message, { tone: 'error' }); }
    setExporting(false);
  };

  return (
    <>
      <Link to="/plus" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Menu</Link>
      <PageHeader title="Réglages" />
      <div className="space-y-5">
        <InstallCard always />
        <Field label="Mon prénom">
          <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() !== profile.display_name && patch({ display_name: name.trim() })} autoComplete="given-name" />
        </Field>

        <section className="card space-y-3 p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Bell className="h-5 w-5 text-rouge" />Mon rappel du matin</h2>
          <Field label="Heure" hint="Un rappel du matin, plus l'heure exacte de tes actions à heure fixe.">
            <Input type="time" defaultValue={(profile?.reminder_time || '08:00').slice(0, 5)} onBlur={(e) => e.target.value && patch({ reminder_time: e.target.value })} />
          </Field>
          {!support.ok && <p className="text-sm text-muted">{support.reason}</p>}
          <Button variant={subscribed ? 'secondary' : 'primary'} size="lg" className="w-full" disabled={!support.ok} loading={busy} onClick={togglePush}>
            {subscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
          </Button>
        </section>

        <Field label="Apparence">
          <Chips options={[['light', 'Clair'], ['dark', 'Sombre'], ['auto', 'Automatique']]} value={theme} onChange={(v) => v && setTheme(v)} />
        </Field>

        <section className="card space-y-2 p-4">
          <h2 className="text-lg font-bold">Mes données</h2>
          <p className="text-sm text-muted">Tout ce que tu as écrit t'appartient. Télécharge-le quand tu veux, en un seul fichier.</p>
          <Button variant="secondary" size="lg" icon={Download} className="w-full" loading={exporting} onClick={doExport}>Exporter mes données</Button>
        </section>

        <Button variant="secondary" size="lg" icon={LogOut} className="w-full" onClick={signOut}>Me déconnecter</Button>
      </div>
    </>
  );
}
