import { type ElementType, type ReactNode } from 'react';

export type SurfaceVariant = 'card' | 'raised' | 'float' | 'flat';

type SurfaceProps = {
  variant?: SurfaceVariant;
  className?: string;
  children?: ReactNode;
  /** Render as a different HTML element. Defaults to `div`. */
  as?: ElementType;
};

const variantClass: Record<SurfaceVariant, string> = {
  card: 'surface surface-card', // 默认卡片 / 列表项：扁平无阴影，仅暖描边 + surface/canvas 微差
  raised: 'surface surface-raised', // chrome：侧栏 / 顶栏 / 浮层（略深阴影）
  float: 'surface surface-float', // overlay：弹窗 / 拖拽（更深阴影）
  flat: 'surface surface-flat', // 内嵌 / 占位：仅暖描边，无阴影
};

/**
 * Shared matte surface primitive — dicha 暖白哑光设计系统的卡片底座。
 * 靠暖描边 + 极轻暖阴影制造层次（非玻璃模糊）。日夜随 data-theme 自动切换。
 * 契约见 .trellis/spec/frontend/design-system.md。
 */
export function Surface({ variant = 'card', className = '', children, as }: SurfaceProps) {
  const Tag = (as ?? 'div') as ElementType;
  const cls = [variantClass[variant], className].filter(Boolean).join(' ');
  return <Tag className={cls}>{children}</Tag>;
}
