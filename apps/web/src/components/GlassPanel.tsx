import { type ElementType, type ReactNode } from 'react';

export type GlassPanelVariant = 'default' | 'strong' | 'subtle';

type GlassPanelProps = {
  variant?: GlassPanelVariant;
  className?: string;
  children?: ReactNode;
  /** Render as a different HTML element. Defaults to `div`. */
  as?: ElementType;
};

const variantClass: Record<GlassPanelVariant, string> = {
  default: 'glass-default',
  strong: 'glass-strong',
  subtle: 'glass-subtle',
};

/**
 * Shared Liquid Glass surface primitive.
 * Three material tiers: strong (sidebar/topbar) → default (modal) → subtle (cards).
 * Always backed by the app-level gradient background.
 */
export function GlassPanel({ variant = 'default', className = '', children, as }: GlassPanelProps) {
  const Tag = (as ?? 'div') as ElementType;
  const cls = ['glass-panel', variantClass[variant], className].filter(Boolean).join(' ');
  return <Tag className={cls}>{children}</Tag>;
}
