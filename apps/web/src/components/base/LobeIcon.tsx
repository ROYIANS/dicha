import { createElement, type ComponentType, type ReactNode, useEffect, useState } from 'react';

import { getLobeIconLoader, resolveLobeIconName } from '@/lib/lobe-icon-resolver';

type LobeIconComponent = ComponentType<{ size?: number | string }>;

const loadedIconCache = new Map<string, LobeIconComponent>();

export function LobeIcon({
  fallback = null,
  iconName,
  size = 22,
}: {
  fallback?: ReactNode;
  iconName: string;
  size?: number | string;
}) {
  const resolvedIconName = resolveLobeIconName(iconName);
  const [, setLoadVersion] = useState(0);
  const Icon = resolvedIconName ? loadedIconCache.get(resolvedIconName) : undefined;

  useEffect(() => {
    if (!resolvedIconName || loadedIconCache.has(resolvedIconName)) return;

    const loader = getLobeIconLoader(resolvedIconName);
    if (!loader) return;

    let cancelled = false;
    loader().then((module) => {
      loadedIconCache.set(resolvedIconName, module.default);
      if (!cancelled) setLoadVersion((version) => version + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [resolvedIconName]);

  return Icon ? createElement(Icon, { size }) : fallback;
}
