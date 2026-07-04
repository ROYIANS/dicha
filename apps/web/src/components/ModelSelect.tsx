import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { useMemo } from 'react';
import type { AiGatewayCatalog } from '@dicha/shared';
import { getAssignableModelGroups } from '@/lib/ai-catalog-ui';

type ModelSelectProps = {
  catalog: AiGatewayCatalog;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowEmpty?: boolean;
  placeholder: string;
  unavailableLabel: string;
  emptyLabel: string;
};

type AssignableModelGroup = ReturnType<typeof getAssignableModelGroups>[number];

export function ModelSelect({
  catalog,
  value,
  onChange,
  disabled = false,
  allowEmpty = false,
  placeholder,
  unavailableLabel,
  emptyLabel,
}: ModelSelectProps) {
  const { modelGroups, selectableModels } = useMemo(() => {
    const groups = getAssignableModelGroups(catalog);
    const modelById = new Map<
      string,
      { model: AssignableModelGroup['models'][number]; provider: AssignableModelGroup['provider'] }
    >();

    for (const group of groups) {
      for (const model of group.models) {
        modelById.set(model.id, { model, provider: group.provider });
      }
    }

    return { modelGroups: groups, selectableModels: modelById };
  }, [catalog]);
  const selected = selectableModels.get(value);
  const selectedUnavailable = Boolean(value) && !selected;
  const selectValue = selected ? value : '';

  if (modelGroups.length === 0) {
    return (
      <span className="flex w-full min-w-0 flex-col items-stretch gap-1">
        <span className="inline-flex w-full rounded-md border border-hairline bg-surface-alt px-2.5 py-1.5 text-[12px] text-ink-faint">
          {emptyLabel}
        </span>
        {selectedUnavailable ? (
          <span className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-tight text-pink">
            <AlertCircle size={12} className="shrink-0" />
            <span className="truncate">{unavailableLabel}</span>
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="flex w-full min-w-0 flex-col items-stretch gap-1">
      <span className="relative block w-full">
        <select
          value={selectValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-label={placeholder}
          className="h-9 w-full appearance-none truncate rounded-md border border-hairline bg-surface-alt py-0 pl-3 pr-8 text-[12px] font-medium text-ink shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--ink)_7%,transparent)] outline-none transition-colors hover:bg-surface focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="" disabled={!allowEmpty}>
            {placeholder}
          </option>
          {modelGroups.map((group) => (
            <optgroup key={group.provider.id} label={group.provider.name}>
              {group.models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
      </span>
      {selectedUnavailable ? (
        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-tight text-pink">
          <AlertCircle size={12} className="shrink-0" />
          <span className="truncate">{unavailableLabel}</span>
        </span>
      ) : selected ? (
        <span className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-tight text-ink-faint">
          <Check size={12} className="shrink-0 text-sage" />
          <span className="truncate">
            {selected.provider.name} / {selected.model.priceHint}
          </span>
        </span>
      ) : null}
    </span>
  );
}
