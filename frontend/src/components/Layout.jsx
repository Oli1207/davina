import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { BookOpen, CalendarRange, CircleHelp, Flame, HandHeart, LayoutGrid, Leaf, Settings, Sun } from 'lucide-react';
import { GUIDE } from '../data/guide';
import GuideSection from './GuideSection';
import { IconButton, Sheet } from './ui';
import QuickAdd from './QuickAdd';

const NAV = [
  { to: '/', label: 'Jour', icon: Sun, end: true },
  { to: '/semaine', label: 'Semaine', icon: CalendarRange },
  { to: '/esprit', label: 'Esprit', icon: Flame },
  { to: '/service', label: 'Service', icon: HandHeart },
  { to: '/corps', label: 'Corps', icon: Leaf },
  { to: '/etudes', label: 'Études', icon: BookOpen },
];
const MORE = [
  { to: '/plus', label: 'Plus', icon: LayoutGrid },
  { to: '/guide', label: 'Guide', icon: CircleHelp },
  { to: '/reglages', label: 'Réglages', icon: Settings },
];

export default function Layout() {
  return (
    <div className="min-h-screen md:flex">
      {/* Bureau : colonne latérale */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line md:flex">
        <Link to="/" className="px-5 py-6 font-display text-3xl font-extrabold tracking-tight text-rouge">Davina</Link>
        <nav className="flex-1 space-y-1 px-3">
          {[...NAV, ...MORE].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => clsx(
                'flex min-h-11 items-center gap-3 rounded-sm px-3 font-semibold transition',
                isActive ? 'bg-rouge-soft text-rouge' : 'text-muted hover:bg-paper-2 hover:text-ink',
              )}
            >
              <n.icon className="h-5 w-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="safe-bottom mx-auto w-full max-w-3xl px-4 lg:max-w-5xl pt-[calc(env(safe-area-inset-top)+1rem)] md:px-8 md:pb-24 md:pt-8">
          <Outlet />
        </main>
      </div>

      <QuickAdd />

      {/* Mobile : barre du bas */}
      <nav data-tour="barre" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-6">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => clsx(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-[3px] text-[0.65rem] font-semibold',
                isActive ? 'border-rouge text-rouge' : 'border-transparent text-muted',
              )}
            >
              <n.icon className="h-[1.35rem] w-[1.35rem]" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** En-tête de page : titre, sous-titre, action. */
export function PageHeader({ title, sub, action, kicker, help }) {
  const [open, setOpen] = useState(false);
  const section = help && GUIDE.find((g) => g.key === help);
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {kicker && <p className="text-xs font-bold uppercase tracking-[0.14em] text-rouge">{kicker}</p>}
        <h1 className="font-display text-[1.9rem] font-extrabold leading-[1.08]">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {(action || section) && (
        <div className="flex shrink-0">
          {section && <IconButton icon={CircleHelp} label="Comment ça marche ?" onClick={() => setOpen(true)} />}
          {action}
        </div>
      )}
      {section && (
        <Sheet open={open} onClose={() => setOpen(false)} title={section.title} wide>
          <GuideSection section={section} flat />
          <Link to={`/guide?section=${section.key}`} className="text-sm font-semibold text-rouge" onClick={() => setOpen(false)}>Ouvrir le guide complet →</Link>
        </Sheet>
      )}
    </header>
  );
}
