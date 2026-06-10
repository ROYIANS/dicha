type NodePos = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type FrameNodeProps = {
  pos: NodePos;
  className?: string;
};

/** 菱形骑线节点 — 与落地页 Node 同几何（Zed outer-section-node-offset 体系）。 */
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
