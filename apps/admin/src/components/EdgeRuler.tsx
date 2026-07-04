type Seg = { f: number; dash?: boolean };

type EdgeRulerProps = {
  segs: Seg[];
  side: 'left' | 'right';
  color?: string;
  className?: string;
};

export function EdgeRuler({
  segs,
  side,
  color = 'var(--hairline)',
  className = '',
}: EdgeRulerProps) {
  return (
    <div
      aria-hidden
      className={`absolute inset-y-0 flex flex-col ${className}`}
      style={{ width: 1, color, [side]: -0.5 }}
    >
      {segs.map((seg, index) => (
        <div
          key={index}
          style={{
            flex: seg.f,
            width: 1,
            backgroundColor: seg.dash ? undefined : 'currentColor',
            backgroundImage: seg.dash
              ? 'repeating-linear-gradient(to bottom, currentColor 0 4px, transparent 4px 8px)'
              : undefined,
          }}
        />
      ))}
    </div>
  );
}
