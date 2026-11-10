import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { DOMAIN } from '../data/domains';
import { MY_TRACKING, TOOLS } from '../data/tools';
import { PageHeader } from '../components/Layout';

const Item = ({ i }) => (
  <li>
    <Link to={i.to} className="card flex min-h-16 items-center gap-3 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rouge-soft text-rouge"><i.icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block font-semibold">{i.title}</span><span className="block text-sm text-muted">{i.sub}</span></span>
      <ChevronRight className="h-4 w-4 text-muted" />
    </Link>
  </li>
);

export default function More() {
  const domains = [...new Set(TOOLS.map((t) => t.domain))];
  return (
    <>
      <PageHeader title="Plus" />
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">Mon suivi</h2>
      <ul className="mb-6 space-y-2">{MY_TRACKING.map((i) => <Item key={i.to} i={i} />)}</ul>
      <div data-tour="outils">
      {domains.map((d) => (
        <section key={d} className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted">{DOMAIN[d].name}</h2>
          <ul className="space-y-2">{TOOLS.filter((t) => t.domain === d).map((i) => <Item key={i.to} i={i} />)}</ul>
        </section>
      ))}
      </div>
    </>
  );
}
