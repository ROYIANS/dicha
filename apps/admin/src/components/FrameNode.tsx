type NodePos = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type FrameNodeProps = {
  pos: NodePos;
  className?: string;
};

export function FrameNode({ pos, className = '' }: FrameNodeProps) {
  const [v, h] = pos.split('-') as ['top' | 'bottom', 'left' | 'right'];
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-50 size-1.5 rotate-45 border border-hairline bg-canvas ${className}`}
      style={{
        [v]: 'calc(-1 * var(--node-vertical-offset))',
        [h]: 'var(--node-horizontal-offset)',
      }}
    />
  );
}
