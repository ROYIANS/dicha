import type { Selection } from '@heroui/react';

export function heroSelectionToValue(selection: Selection) {
  if (selection === 'all') return '';
  const [key] = Array.from(selection);
  return key == null ? '' : String(key);
}
