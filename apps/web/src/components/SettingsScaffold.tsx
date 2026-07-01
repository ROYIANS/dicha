import { Link } from '@tanstack/react-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/AppBrand';
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
      <div className="mx-auto min-h-full w-full max-w-6xl px-2 sm:px-6 lg:px-8">
        <div className="relative min-w-0">
          <SettingsGridPattern />

          <div className="relative z-10 pb-0">
            <header className="relative border-b border-hairline px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
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

            <div className="bg-canvas px-2 pb-32 pt-7 sm:px-8 sm:py-9 lg:px-10">
              {children}
              <SettingsFooterMark />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SettingsFooterMark() {
  return (
    <div className="flex min-h-44 items-end justify-center pt-16 pb-0 sm:min-h-56 sm:pt-24">
      <BrandMark
        aria-hidden
        className="h-28 w-44 text-ink-faint opacity-[0.12] sm:h-36 sm:w-56"
      />
    </div>
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
  const trailing = action ?? value;
  return (
    <div className="grid min-h-[58px] w-full grid-cols-[minmax(0,1fr)] items-start gap-x-3 gap-y-3 border-b border-hairline/70 px-3.5 py-3 text-left last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:py-0">
      <span className="flex min-w-0 items-center gap-3">
        {Icon && tint ? (
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-md border border-hairline ${settingsTintClass[tint]}`}
          >
            <Icon size={16} />
          </span>
        ) : null}
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-ink">{label}</span>
          {description ? (
            <span className="mt-0.5 block min-w-0 text-[11px] leading-relaxed text-ink-faint">
              {description}
            </span>
          ) : null}
        </span>
      </span>
      {trailing ? (
        <span className="min-w-0 justify-self-stretch text-[12px] text-ink-faint sm:shrink-0 sm:justify-self-auto">
          {trailing}
        </span>
      ) : null}
    </div>
  );
}

export function SettingsSwitch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border border-hairline transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-[var(--sidebar-bg)]' : 'bg-canvas'
      }`}
    >
      <span
        className={`absolute left-1 top-1/2 size-5 -translate-y-1/2 rounded-full border border-hairline bg-surface transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
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
