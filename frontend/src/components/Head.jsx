import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from './Layout';

/**
 * En-tête d'un écran qui existe seul (avec son retour) ou à l'intérieur d'un onglet
 * d'un autre écran (`embedded` : juste la phrase d'explication et le bouton d'action).
 */
export default function Head({ embedded, back = '/plus', backLabel = 'Menu', ...props }) {
  if (embedded) {
    if (!props.sub && !props.action) return null;
    return (
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm text-muted">{props.sub}</p>
        {props.action && <div className="flex shrink-0">{props.action}</div>}
      </div>
    );
  }
  return (
    <>
      {back && <Link to={back} className="-ml-2 mb-1 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-muted"><ChevronLeft className="h-4 w-4" />{backLabel}</Link>}
      <PageHeader {...props} />
    </>
  );
}
