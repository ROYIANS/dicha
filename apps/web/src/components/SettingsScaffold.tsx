import { Link } from '@tanstack/react-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/AppBrand';
import { HeroSwitch } from '@/components/HeroControls';
import { SettingsPatternField, SettingsSlash } from '@/components/SettingsOrnaments';
import {
  settingsHeaderClassName,
  settingsTintClass,
  settingsTitleClassName,
  type SettingsTint,
} from '@/components/settings-ui';

export function SettingsDetailShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <main className="relative min-h-full overflow-hidden">
      <Link
        to="/settings"
        aria-label={t('account.backToSettings')}
        title={t('account.backToSettings')}
        className="settings-back-button app-icon-btn fixed z-30 inline-flex size-9 items-center justify-center rounded-full border border-hairline bg-surface text-ink-soft shadow-raised"
      >
        <ChevronLeft size={20} strokeWidth={1.8} />
      </Link>
      <div className="mx-auto min-h-full w-full max-w-6xl px-2 sm:px-6 lg:px-8">
        <div className="relative min-w-0">
          <SettingsPatternField />

          <div className="relative z-10 pb-0">
            <header className={settingsHeaderClassName}>
              <div className="max-w-2xl space-y-2">
                <h1 className={settingsTitleClassName}>{title}</h1>
                <p className="text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
                  {subtitle}
                </p>
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
      <BrandMark aria-hidden className="h-28 w-44 text-ink-faint opacity-[0.12] sm:h-36 sm:w-56" />
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
        <h2 className="mb-2 px-1 text-[11px] font-semibold tracking-wider text-ink-faint">
          {title}
        </h2>
      ) : null}
      <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
        {children}
      </div>
      {footer ? (
        <p className="mt-2 px-1 text-[11px] leading-relaxed text-ink-faint">{footer}</p>
      ) : null}
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
    <HeroSwitch
      label={label}
      showLabel={false}
      isSelected={checked}
      isDisabled={disabled}
      onChange={onChange}
    />
  );
}
