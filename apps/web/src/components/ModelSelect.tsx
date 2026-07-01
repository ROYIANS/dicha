import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import type { AiGatewayCatalog, AiModel } from '@dicha/shared';

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
  const models = catalog.models;
  const selected = models.find((model) => model.id === value);
  const selectedUnavailable = Boolean(value) && (selected ? !isModelUsable(selected) : true);

  if (models.length === 0) {
    return (
      <span className="shrink-0 rounded-md border border-hairline bg-surface-alt px-2.5 py-1.5 text-[12px] text-ink-faint">
        {emptyLabel}
      </span>
    );
  }

  return (
    <span className="flex min-w-0 shrink-0 flex-col items-end gap-1">
      <span className="relative block w-[min(46vw,220px)] sm:w-[220px]">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-label={placeholder}
          className="h-9 w-full appearance-none truncate rounded-md border border-hairline bg-surface-alt py-0 pl-3 pr-8 text-[12px] font-medium text-ink shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--ink)_7%,transparent)] outline-none transition-colors hover:bg-surface focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="" disabled={!allowEmpty}>
            {placeholder}
          </option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.displayName}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
      </span>
      {selectedUnavailable ? (
        <span className="inline-flex max-w-[min(46vw,220px)] items-center gap-1 text-right text-[11px] leading-tight text-pink">
          <AlertCircle size={12} className="shrink-0" />
          <span className="truncate">{unavailableLabel}</span>
        </span>
      ) : selected ? (
        <span className="inline-flex max-w-[min(46vw,220px)] items-center gap-1 text-right text-[11px] leading-tight text-ink-faint">
          <Check size={12} className="shrink-0 text-sage" />
          <span className="truncate">{selected.priceHint}</span>
        </span>
      ) : null}
    </span>
  );
}

function isModelUsable(model: AiModel) {
  return model.enabled && model.availability !== 'offline' && model.availability !== 'config_required';
}
