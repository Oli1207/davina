import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useRemove, useRows, useSave } from '../hooks/useData';
import { useUserDomains } from '../hooks/useLife';
import { DOMAIN, KIND, KINDS } from '../data/domains';
import { shortDate } from '../lib/dates';
import { PageHeader } from '../components/Layout';
import { toast } from '../components/toast';
import { Button, Chips, Empty, Loading, Sheet, Textarea } from '../components/ui';

const PAGE = 40;

export default function Journal() {
  const [q, setQ] = useState('');
  const [domain, setDomain] = useState(null);
  const [limit, setLimit] = useState(PAGE);
  const [edit, setEdit] = useState(null);
  const { data: domains = [] } = useUserDomains();
  const { data: entries = [], isLoading } = useRows('entries', {
    key: [domain || 'all', limit],
    build: (query) => {
      let r = query.order('created_at', { ascending: false }).limit(limit);
      if (domain === 'none') r = r.is('domain', null);
      else if (domain) r = r.eq('domain', domain);
      return r;
    },
  });

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? entries.filter((e) => e.body.toLowerCase().includes(s)) : entries;
  }, [entries, q]);

  const options = [...domains.filter((d) => d.active).map((d) => [d.domain, DOMAIN[d.domain].name]), ['none', 'Non classé']];

  return (
    <>
      <PageHeader help="capture" title="Journal" sub="Tout ce que tu notes avec le bouton +, au même endroit." />
      <div className="relative mb-3" data-tour="recherche">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input className="input !pl-9" type="search" inputMode="search" placeholder="Chercher dans mes notes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Chercher" />
      </div>
      <Chips options={options} value={domain} onChange={setDomain} className="mb-4" />

      {isLoading ? <Loading /> : shown.length === 0 ? (
        <Empty title={q || domain ? 'Rien ne correspond' : 'Ton journal est vide'}>
          Touche le bouton rouge + pour noter une idée, une leçon ou une victoire.
        </Empty>
      ) : (
        <>
          <ul className="space-y-2">
            {shown.map((e) => (
              <li key={e.id}>
                <button type="button" className="card w-full p-3 text-left" onClick={() => setEdit(e)}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {KIND[e.kind]}{e.domain && ` · ${DOMAIN[e.domain]?.name}`} · {shortDate(e.day)}{e.shared && <span className="text-rouge"> · partagée</span>}
                  </p>
                  <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap break-words">{e.body}</p>
                </button>
              </li>
            ))}
          </ul>
          {entries.length >= limit && !q && <Button variant="ghost" className="mt-3 w-full" onClick={() => setLimit(limit + PAGE)}>Voir plus</Button>}
        </>
      )}
      <EntrySheet entry={edit} onClose={() => setEdit(null)} options={options.filter(([k]) => k !== 'none')} />
    </>
  );
}

function EntrySheet({ entry, onClose, options }) {
  const [form, setForm] = useState(null);
  const save = useSave('entries');
  const remove = useRemove('entries');
  const cur = form?.id === entry?.id ? form : entry;

  const patch = (f) => setForm({ ...cur, ...f });
  const submit = async (e) => {
    e.preventDefault();
    await save.mutateAsync({ id: cur.id, body: cur.body.trim(), kind: cur.kind, domain: cur.domain, shared: cur.shared });
    toast('Enregistré ✓');
    setForm(null); onClose();
  };
  const del = async () => {
    await remove.mutateAsync(entry.id);
    toast('Note supprimée');
    setForm(null); onClose();
  };

  return (
    <Sheet open={!!entry} onClose={() => { setForm(null); onClose(); }} title="Ma note">
      {cur && (
        <form onSubmit={submit} className="space-y-3">
          <Textarea value={cur.body} onChange={(e) => patch({ body: e.target.value })} rows={6} required aria-label="Texte" />
          <div><span className="field-label">Type</span><Chips options={KINDS} value={cur.kind} onChange={(v) => patch({ kind: v || 'note' })} /></div>
          <div><span className="field-label">Domaine</span><Chips options={options} value={cur.domain} onChange={(v) => patch({ domain: v })} /></div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--rouge)]" checked={cur.shared} onChange={(e) => patch({ shared: e.target.checked })} />
            Partager avec mon binôme
          </label>
          <div className="flex gap-2">
            <Button variant="danger" size="lg" onClick={del} loading={remove.isPending}>Supprimer</Button>
            <Button type="submit" size="lg" className="flex-1" loading={save.isPending} disabled={!cur.body.trim()}>Enregistrer</Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
