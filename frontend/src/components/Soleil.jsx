/**
 * Le soleil de Davina : un rond central, un anneau, puis des pétales qui rayonnent.
 * Il sert de jauge : les pétales se colorent avec la progression, dans le sens des
 * aiguilles d'une montre, en alternant rouge et rose.
 */
export default function Soleil({ value = 0, size = 120, petals = 24, children, tones = ['rouge', 'rose'], className, core = 19 }) {
  const c = 50;
  const ring = core + 5;
  const top = 2;
  const bottom = 50 - (ring + 3);
  const mid = (top + bottom) / 2;
  const w = Math.max(2.2, (bottom - top) / 6);
  const petal = `M50 ${top} C${50 + w} ${mid - 3} ${50 + w} ${mid + 3} 50 ${bottom} C${50 - w} ${mid + 3} ${50 - w} ${mid - 3} 50 ${top} Z`;
  const lit = Math.round(Math.max(0, Math.min(1, value)) * petals);
  return (
    <div className={className} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        {Array.from({ length: petals }, (_, i) => {
          const on = i < lit;
          const tone = tones[i % tones.length];
          return (
            <path key={i} d={petal} transform={`rotate(${(i / petals) * 360} ${c} ${c})`}
              fill={on ? `var(--${tone})` : 'none'} stroke={on ? `var(--${tone})` : 'var(--line)'} strokeWidth="1" />
          );
        })}
        <circle cx={c} cy={c} r={ring} fill="none" stroke="var(--rouge)" strokeWidth="3" />
        <circle cx={c} cy={c} r={core} fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.2" />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">{children}</div>}
    </div>
  );
}
