type Seg = { f: number; dash?: boolean };

type EdgeRulerProps = {
  segs: Seg[];
  side: 'left' | 'right';
  color?: string;
  className?: string;
};

/** 侧沟分段标尺 — 与落地页 Ruler 同实现，贴 rail 内边界。 */
export function EdgeRuler({ segs, side, color = 'var(--border)', className = '' }: EdgeRulerProps) {
  return (
    <div
      aria-hidden
      className={`absolute inset-y-0 flex flex-col ${className}`}
      style={{ width: 1, color, [side]: -0.5 }}
    >
      {segs.map((s, i) => (
        <div
          key={i}
          style={{
            flex: s.f,
            width: 1,
            backgroundColor: s.dash ? undefined : 'currentColor',
            backgroundImage: s.dash
              ? 'repeating-linear-gradient(to bottom, currentColor 0 4px, transparent 4px 8px)'
              : undefined,
          }}
        />
      ))}
    </div>
  );
}
