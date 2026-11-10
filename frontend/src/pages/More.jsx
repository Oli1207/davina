import { Link } from 'react-router-dom';
import { BookOpen, CalendarClock, ChevronRight, CircleHelp, Footprints, Layers, NotebookPen, Settings, Users } from 'lucide-react';
import { DOMAINS } from '../data/domains';
import { PageHeader } from '../components/Layout';

const Item = ({ to, icon: Icon, title, sub }) => (
  <li>
    <Link to={to} className="card flex min-h-16 items-center gap-3 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rouge-soft text-rouge"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span>{sub && <span className="block text-sm text-muted">{sub}</span>}</span>
      <ChevronRight className="h-4 w-4 text-muted" />
    </Link>
  </li>
);

const SECTIONS = [
  ['Mon suivi', [
    { to: '/chemin', icon: Footprints, title: 'Mon chemin', sub: 'Ma progression, mois après mois, année après année' },
    { to: '/journal', icon: NotebookPen, title: 'Journal', sub: 'Tout ce que j\'ai noté avec le bouton +' },
    { to: '/binome', icon: Users, title: 'Binôme', sub: 'Avancer avec quelqu\'un, en choisissant ce qu\'on partage' },
  ]],
  ['Savoir', [
    { to: '/lecture', icon: BookOpen, title: 'Mes lectures', sub: 'Mes livres, mes pages, mes fiches de synthèse' },
    { to: '/revision', icon: Layers, title: 'Cartes de révision', sub: 'Vocabulaire, versets, idées' },
  ]],
  ['Organisation', [
    { to: '/emploi-du-temps', icon: CalendarClock, title: 'Mon emploi du temps', sub: 'Cours, travail, réveil et coucher : pour calculer mes créneaux libres' },
  ]],
  ['Aide et réglages', [
    { to: '/guide', icon: CircleHelp, title: 'Guide', sub: 'Tout ce que l\'app sait faire, et la visite guidée' },
    { to: '/reglages', icon: Settings, title: 'Réglages', sub: 'Prénom, rappel du matin, apparence, mes données' },
  ]],
];

/** Le menu : tout ce qui n'a pas sa place dans la barre du bas. */
export default function More() {
  const others = DOMAINS.filter((d) => !['esprit', 'corps'].includes(d.key));
  return (
    <>
      <PageHeader title="Menu" />
      {SECTIONS.map(([label, items]) => (
        <section key={label} className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">{label}</h2>
          <ul className="space-y-2">{items.map((i) => <Item key={i.to} {...i} />)}</ul>
        </section>
      ))}
      <section className="mb-6" data-tour="domaines">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">Tous mes domaines</h2>
        <ul className="space-y-2">
          {others.map((d) => <Item key={d.key} to={`/domaine/${d.key}`} icon={d.icon} title={d.name} sub={d.about} />)}
        </ul>
      </section>
    </>
  );
}
