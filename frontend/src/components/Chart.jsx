import { shortDate } from '../lib/dates';

/** Courbe minimaliste en SVG (poids, tour de taille). Trait plein, cible en pointillé, moyenne glissante facultative. */
export function LineChart({ points, target, height = 160, format = (v) => v, avg }) {
  if (points.length < 2) return <p className="py-6 text-center text-sm text-muted">La courbe apparaît dès la deuxième mesure.</p>;
  const W = 320;
  const H = height;
  const pad = { l: 34, r: 8, t: 10, b: 22 };
  const values = points.map((p) => p.v).concat(target != null ? [target] : []);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < 2) { lo -= 1; hi += 1; }
  const x = (i) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const line = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const smooth = avg ? points.map((_, i) => {
    const w = points.slice(Math.max(0, i - avg + 1), i + 1);
    return w.reduce((s, p) => s + p.v, 0) / w.length;
  }) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe d'évolution">
      {[lo, (lo + hi) / 2, hi].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
          <text x={pad.l - 5} y={y(v) + 3.5} textAnchor="end" fontSize="9" fill="var(--muted)">{format(Math.round(v * 10) / 10)}</text>
        </g>
      ))}
      {target != null && <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 3" />}
      <path d={line(points.map((p) => p.v))} fill="none" stroke={smooth ? 'var(--line)' : 'var(--rouge)'} strokeWidth={smooth ? 1.5 : 2.5} />
      {smooth && <path d={line(smooth)} fill="none" stroke="var(--rouge)" strokeWidth="2.5" />}
      {points.map((p, i) => <circle key={p.d + i} cx={x(i)} cy={y(p.v)} r="2.6" fill="var(--rouge)" />)}
      <text x={pad.l} y={H - 6} fontSize="9" fill="var(--muted)">{shortDate(points[0].d)}</text>
      <text x={W - pad.r} y={H - 6} fontSize="9" fill="var(--muted)" textAnchor="end">{shortDate(points[points.length - 1].d)}</text>
    </svg>
  );
}
