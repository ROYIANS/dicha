import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router';
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  KeyRound,
  Languages,
  Moon,
  Palette,
  Search,
  Settings,
  ShieldCheck,
  User,
  type LucideIcon,
} from 'lucide-react';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { settingsTintClass, type SettingsTint } from '@/components/settings-ui';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});

type SettingsItem = {
  icon: LucideIcon;
  tint: SettingsTint;
  label: string;
  description?: string;
  value?: string;
  to?: SettingsRouteTo;
};

type SettingsRouteTo =
  | '/settings/profile'
  | '/settings/security'
  | '/settings/privacy'
  | '/settings/appearance'
  | '/settings/theme'
  | '/settings/notifications'
  | '/settings/language'
  | '/settings/storage'
  | '/settings/export'
  | '/settings/about';

const sections = [
  {
    key: 'account',
    items: [
      { icon: User, tint: 'peach', labelKey: 'profile', descKey: 'profileDesc', to: '/settings/profile' },
      { icon: KeyRound, tint: 'lavender', labelKey: 'security', descKey: 'securityDesc', to: '/settings/security' },
      { icon: ShieldCheck, tint: 'sage', labelKey: 'privacy', descKey: 'privacyDesc', to: '/settings/privacy' },
    ],
  },
  {
    key: 'app',
    items: [
      { icon: Palette, tint: 'mist', labelKey: 'appearance', descKey: 'appearanceDesc', valueKey: 'warmMatte', to: '/settings/appearance' },
      { icon: Moon, tint: 'lavender', labelKey: 'theme', descKey: 'themeDesc', valueKey: 'autoTheme', to: '/settings/theme' },
      { icon: Bell, tint: 'pink', labelKey: 'notifications', descKey: 'notificationsDesc', to: '/settings/notifications' },
      { icon: Languages, tint: 'sage', labelKey: 'language', descKey: 'languageDesc', valueKey: 'chinese', to: '/settings/language' },
    ],
  },
  {
    key: 'data',
    items: [
      { icon: Database, tint: 'peach', labelKey: 'storage', descKey: 'storageDesc', valueKey: 'localFirst', to: '/settings/storage' },
      { icon: Download, tint: 'mist', labelKey: 'export', descKey: 'exportDesc', to: '/settings/export' },
    ],
  },
  {
    key: 'about',
    items: [
      { icon: CircleHelp, tint: 'sage', labelKey: 'about', descKey: 'aboutDesc', valueKey: 'preAlpha', to: '/settings/about' },
    ],
  },
] as const;

function SettingsPage() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== '/settings') {
    return <Outlet />;
  }

  const settingSections = sections.map((section) => ({
    title: t(`settings.sections.${section.key}`),
    items: section.items.map((item) => ({
      icon: item.icon,
      tint: item.tint,
      label: t(`settings.items.${item.labelKey}`),
      description: t(`settings.items.${item.descKey}`),
      value: 'valueKey' in item ? t(`settings.values.${item.valueKey}`) : undefined,
      to: 'to' in item ? item.to : undefined,
    })),
  }));

  return (
    <main className="relative min-h-full overflow-hidden">
      <div className="mx-auto min-h-full w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative min-w-0">
          <GridPattern />

          <div className="relative z-10 pb-36">
            <header className="relative border-b border-hairline px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-end">
                <div className="space-y-2">
                  <h1 className="text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">
                    {t('settings.pageTitle')}
                  </h1>
                  <p className="max-w-2xl text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
                    {t('settings.pageSubtitle')}
                  </p>
                </div>
                <SettingsSummary />
              </div>
            </header>

            <Slash />

            <div className="bg-canvas px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
              <div className="mx-auto max-w-3xl space-y-6">
                <button
                  type="button"
                  className="app-input-field flex min-h-11 w-full items-center gap-3 rounded-md border border-hairline bg-surface px-3.5 text-left text-[13px] text-ink-faint"
                >
                  <Search size={15} className="shrink-0" />
                  <span>{t('settings.searchPlaceholder')}</span>
                </button>

                {settingSections.map((section) => (
                  <SettingsGroup key={section.title} title={section.title}>
                    {section.items.map((item) => (
                      <SettingsRow key={item.label} item={item} />
                    ))}
                  </SettingsGroup>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SettingsSummary() {
  const { t } = useTranslation();

  return (
    <div className="relative isolate min-w-0 overflow-hidden rounded-md border border-hairline bg-surface px-4 py-4 shadow-[6px_6px_0_color-mix(in_oklab,var(--ink)_5%,transparent)]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-md border border-hairline bg-chip-peach text-peach">
          <Settings size={21} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{t('settings.summaryTitle')}</p>
          <span className="block max-w-[34ch] text-[11px] leading-relaxed text-ink-faint">
            {t('settings.summarySubtitle')}
          </span>
        </div>
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-semibold tracking-wider text-ink-faint">{title}</h2>
      <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--ink)_8%,transparent)]">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ item }: { item: SettingsItem }) {
  const Icon = item.icon;
  const content = (
    <>
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-md border border-hairline ${settingsTintClass[item.tint]}`}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink">{item.label}</span>
        {item.description ? (
          <span className="mt-0.5 block truncate text-[11px] text-ink-faint">{item.description}</span>
        ) : null}
      </span>
      {item.value ? <span className="shrink-0 text-[12px] text-ink-faint">{item.value}</span> : null}
      <ChevronRight size={15} className="shrink-0 text-ink-faint" />
    </>
  );

  const className =
    'group flex min-h-[58px] w-full items-center gap-3 border-b border-hairline px-3.5 text-left transition-colors last:border-b-0 hover:bg-surface-alt';

  if (item.to) {
    return (
      <Link to={item.to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}

function GridPattern() {
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
        <pattern id="settings-grid-fine" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </pattern>
        <pattern id="settings-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill="url(#settings-grid-fine)" />
          <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#settings-grid)" />
    </svg>
  );
}

function Slash() {
  return (
    <div className="relative h-3.5 border-b border-hairline bg-canvas">
      <Hatch />
    </div>
  );
}

function Hatch() {
  return (
    <svg aria-hidden className="pointer-events-none size-full text-ink-faint">
      <defs>
        <pattern id="settings-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#settings-hatch)" opacity="0.28" />
    </svg>
  );
}
