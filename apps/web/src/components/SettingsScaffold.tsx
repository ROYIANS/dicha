import { Link } from '@tanstack/react-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { settingsTintClass, type SettingsTint } from '@/components/settings-ui';

export function SettingsDetailShell({
  title,
  subtitle,
  summary,
  children,
}: {
  title: string;
  subtitle: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <main className="relative min-h-full overflow-hidden">
      <div className="mx-auto min-h-full w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative min-w-0">
          <SettingsGridPattern />

          <div className="relative z-10 pb-36">
            <header className="relative border-b border-hairline px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
              <Link
                to="/settings"
                className="lp-nav-link mb-5 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-soft"
              >
                <ChevronLeft size={16} />
                {t('account.backToSettings')}
              </Link>
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-end">
                <div className="space-y-2">
                  <h1 className="text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">
                    {title}
                  </h1>
                  <p className="max-w-2xl text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
                    {subtitle}
                  </p>
                </div>
                {summary}
              </div>
            </header>

            <SettingsSlash />

            <div className="bg-canvas px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function SettingsSummaryCard({
  icon: Icon,
  tint,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  tint: SettingsTint;
  title: ReactNode;
  subtitle: ReactNode;
}) {
  return (
    <div className="relative isolate min-w-0 overflow-hidden rounded-md border border-hairline bg-surface px-4 py-4 shadow-[6px_6px_0_color-mix(in_oklab,var(--ink)_5%,transparent)]">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-md border border-hairline ${settingsTintClass[tint]}`}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{title}</p>
          <span className="block max-w-[34ch] text-[11px] leading-relaxed text-ink-faint">
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SettingsPanel({
  title,
  children,
  footer,
}: {
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section>
      {title ? (
        <h2 className="mb-2 px-1 text-[11px] font-semibold tracking-wider text-ink-faint">{title}</h2>
      ) : null}
      <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--ink)_8%,transparent)]">
        {children}
      </div>
      {footer ? <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-faint">{footer}</p> : null}
    </section>
  );
}

export function SettingsValueRow({
  icon: Icon,
  tint,
  label,
  description,
  value,
  action,
}: {
  icon?: LucideIcon;
  tint?: SettingsTint;
  label: ReactNode;
  description?: ReactNode;
  value?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[58px] w-full items-center gap-3 border-b border-hairline/70 px-3.5 text-left last:border-b-0">
      {Icon && tint ? (
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-md border border-hairline ${settingsTintClass[tint]}`}
        >
          <Icon size={16} />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-faint">{description}</span>
        ) : null}
      </span>
      {action ?? (value ? <span className="shrink-0 text-[12px] text-ink-faint">{value}</span> : null)}
    </div>
  );
}

export function SettingsSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border border-hairline transition-colors ${
        checked ? 'bg-[var(--sidebar-bg)]' : 'bg-canvas'
      }`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full border border-hairline bg-surface transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SettingsGridPattern() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
      style={{
        color: 'var(--lp-deco)',
        maskImage: 'linear-gradient(to bottom, #000 0%, transparent 78%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 78%)',
      }}
    >
      <defs>
        <pattern id="settings-detail-grid-fine" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </pattern>
        <pattern id="settings-detail-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill="url(#settings-detail-grid-fine)" />
          <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#settings-detail-grid)" />
    </svg>
  );
}

function SettingsSlash() {
  return (
    <div className="relative h-3.5 border-b border-hairline bg-canvas">
      <SettingsHatch />
    </div>
  );
}

function SettingsHatch() {
  return (
    <svg aria-hidden className="pointer-events-none size-full text-ink-faint">
      <defs>
        <pattern id="settings-detail-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#settings-detail-hatch)" opacity="0.28" />
    </svg>
  );
}
