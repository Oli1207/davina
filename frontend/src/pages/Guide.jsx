import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Play } from 'lucide-react';
import { GUIDE } from '../data/guide';
import { Button } from '../components/ui';
import { useTour } from '../components/Tour';
import GuideSection from '../components/GuideSection';
import { PageHeader } from '../components/Layout';

/** Le didacticiel complet : toutes les fonctions, pas à pas. */
export default function Guide() {
  const [params] = useSearchParams();
  const [open, setOpen] = useState(params.get('section') || 'demarrer');
  const startTour = useTour((s) => s.start);
  return (
    <div>
      <Link to="/plus" className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />Menu</Link>
      <PageHeader kicker="Didacticiel" title="Le guide de Davina" sub="Tout ce que l'app sait faire, et comment t'en servir." />
      <Button variant="secondary" icon={Play} className="mb-5 w-full sm:w-auto" onClick={startTour}>Refaire la visite guidée</Button>
      <div className="divide-y divide-line border-y border-line">
        {GUIDE.map((s, n) => (
          <GuideSection key={s.key} section={s} index={n} open={open === s.key} onToggle={() => setOpen(open === s.key ? null : s.key)} />
        ))}
      </div>
    </div>
  );
}
