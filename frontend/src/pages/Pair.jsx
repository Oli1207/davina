import { useState } from 'react';
import { Check, Copy, Share2, UserPlus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '../lib/supabase';
import { useRemove, useRows } from '../hooks/useData';
import { today } from '../lib/dates';
import { DOMAIN } from '../data/domains';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { Button, Empty, ErrorNote, Field, Input, Loading } from '../components/ui';

export default function Pair() {
  const qc = useQueryClient();
  const day = today();
  const { data: pairs = [], isLoading } = useRows('pairs', { build: (q) => q.order('created_at') });
  const { data: overview = [] } = useQuery({
    queryKey: ['partner_overview', day],
    queryFn: async () => unwrap(await supabase.rpc('partner_overview', { p_day: day })),
  });
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);

  const invite = useMutation({
    mutationFn: async () => unwrap(await supabase.from('pairs').insert({}).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pairs'] }),
  });
  const join = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('join_pair', { p_code: code })),
    onSuccess: (name) => {
      toast(`Vous êtes binômes${name ? ` avec ${name}` : ''} ✓`);
      setCode(''); setError(null);
      qc.invalidateQueries();
    },
    onError: (e) => setError(e),
  });
  const leave = useRemove('pairs', { also: ['partner_overview'] });

  const open = pairs.filter((p) => !p.b);
  const linked = pairs.filter((p) => p.b);

  const share = async (c) => {
    const text = `Rejoins-moi sur Davina. Mon code de binôme : ${c}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast('Code copié ✓'); }
    } catch { /* annulé */ }
  };

  // Regroupe par binôme.
  const byPartner = overview.reduce((acc, r) => {
    (acc[r.partner_id] ||= { name: r.partner_name, items: [] }).items.push(r);
    return acc;
  }, {});

  if (isLoading) return <Loading />;
  return (
    <>
      <PageHeader help="binome" title="Binôme" sub="Avance avec quelqu'un. Tu choisis, élément par élément, ce qu'il ou elle voit." />

      {Object.entries(byPartner).map(([id, p]) => (
        <section key={id} className="card mb-4 p-4">
          <h2 className="mb-2 font-display text-xl font-extrabold">{p.name || 'Mon binôme'}</h2>
          <ul className="space-y-1.5">
            {p.items.map((r) => (
              <li key={r.habit_id} className="flex min-h-11 items-center gap-3">
                <span className="check !h-8 !w-8" data-state={r.level || undefined}>{r.level && <Check className="h-4 w-4" strokeWidth={3} />}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="text-xs text-muted">{DOMAIN[r.domain]?.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {linked.length > 0 && Object.keys(byPartner).length === 0 && (
        <Empty title="Rien de partagé pour l'instant">
          Pour qu'il ou elle voie une action, ouvre-la et coche « Mon binôme voit si je l'ai faite ». Les notes se partagent depuis le bouton +.
        </Empty>
      )}

      {linked.length === 0 && open.length === 0 && (
        <Empty title="Pas encore de binôme">Invite quelqu'un avec un code, ou entre le code qu'on t'a envoyé.</Empty>
      )}

      {open.map((p) => (
        <section key={p.id} className="card mb-4 p-4">
          <p className="field-label">Mon code d'invitation</p>
          <p className="font-display text-3xl font-extrabold tracking-widest text-rouge">{p.code}</p>
          <p className="mt-1 text-sm text-muted">À usage unique. Envoie-le à la personne : elle l'entre dans son app.</p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" icon={Share2} className="flex-1" onClick={() => share(p.code)}>Envoyer</Button>
            <Button variant="ghost" icon={Copy} onClick={() => { navigator.clipboard?.writeText(p.code); toast('Code copié ✓'); }}>Copier</Button>
          </div>
        </section>
      ))}

      <div className="mt-4 grid gap-3" data-tour="binome">
        <Button size="lg" icon={UserPlus} variant="secondary" loading={invite.isPending} onClick={() => invite.mutate()}>Inviter quelqu'un</Button>
        <form
          className="card p-4"
          onSubmit={(e) => { e.preventDefault(); setError(null); join.mutate(); }}
        >
          <Field label="J'ai reçu un code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Ex. 3fa9c2d1b0" required />
          </Field>
          <ErrorNote error={error} />
          <Button type="submit" size="lg" className="mt-3 w-full" loading={join.isPending}>Rejoindre</Button>
        </form>
      </div>

      {linked.length > 0 && (
        <div className="mt-6 space-y-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Mes binômes</h2>
          {linked.map((p) => (
            <div key={p.id} className="flex min-h-11 items-center justify-between text-sm">
              <span>Binôme depuis le {new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
              <button type="button" className="min-h-11 px-2 font-semibold text-rouge" onClick={() => leave.mutate(p.id, { onSuccess: () => toast('Binôme quitté') })}>Quitter</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
