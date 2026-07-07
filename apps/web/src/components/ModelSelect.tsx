import { AlertCircle, Check } from 'lucide-react';
import { useMemo } from 'react';
import type { AiGatewayCatalog } from '@dicha/shared';
import { DichaSelect, type SelectOptions } from '@/components/base/DichaControls';
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
  const selectValue = selected ? value : allowEmpty ? '' : null;
  const options = useMemo<SelectOptions<string>>(
    () => [
      ...(allowEmpty ? [{ label: placeholder, value: '' }] : []),
      ...modelGroups.map((group) => ({
        label: group.provider.name,
        options: group.models.map((model) => ({
          label: model.displayName,
          value: model.id,
        })),
      })),
    ],
    [allowEmpty, modelGroups, placeholder],
  );

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
      <DichaSelect
        value={selectValue}
        disabled={disabled}
        options={options}
        placeholder={placeholder}
        popupMatchSelectWidth
        className="w-full text-[12px] font-medium"
        onChange={(next) => onChange(typeof next === 'string' ? next : '')}
      />
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
