import {
  createFileRoute,
  Link,
  Outlet,
  useRouteContext,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import {
  Activity,
  Bell,
  Bot,
  ChevronRight,
  CircleHelp,
  Database,
  Download,
  FlaskConical,
  KeyRound,
  Languages,
  LifeBuoy,
  LogOut,
  Moon,
  Palette,
  ReceiptText,
  Search,
  Server,
  ShieldCheck,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { logout } from '@/api/auth';
import { BrandMark } from '@/components/AppBrand';
import { SettingsPatternField, SettingsSlash } from '@/components/SettingsOrnaments';
import { settingsTintClass, type SettingsTint } from '@/components/settings-ui';
import { useTheme } from '@/lib/hooks/useTheme';

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
  adminOnly?: boolean;
  onPress?: () => void;
  danger?: boolean;
  loading?: boolean;
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
  | '/settings/ai-providers'
  | '/settings/ai-models'
  | '/settings/ai-usage'
  | '/settings/ai-invoke-demo'
  | '/settings/help'
  | '/settings/labs'
  | '/settings/diagnostics'
  | '/settings/about';

const sections = [
  {
    key: 'account',
    items: [
      {
        icon: User,
        tint: 'peach',
        labelKey: 'profile',
        descKey: 'profileDesc',
        to: '/settings/profile',
      },
      {
        icon: KeyRound,
        tint: 'lavender',
        labelKey: 'security',
        descKey: 'securityDesc',
        to: '/settings/security',
      },
      {
        icon: ShieldCheck,
        tint: 'sage',
        labelKey: 'privacy',
        descKey: 'privacyDesc',
        to: '/settings/privacy',
      },
    ],
  },
  {
    key: 'app',
    items: [
      {
        icon: Palette,
        tint: 'mist',
        labelKey: 'appearance',
        descKey: 'appearanceDesc',
        valueKey: 'warmMatte',
        to: '/settings/appearance',
      },
      {
        icon: Moon,
        tint: 'lavender',
        labelKey: 'theme',
        descKey: 'themeDesc',
        valueKey: 'autoTheme',
        to: '/settings/theme',
      },
      {
        icon: Bell,
        tint: 'pink',
        labelKey: 'notifications',
        descKey: 'notificationsDesc',
        to: '/settings/notifications',
      },
      {
        icon: Languages,
        tint: 'sage',
        labelKey: 'language',
        descKey: 'languageDesc',
        valueKey: 'chinese',
        to: '/settings/language',
      },
    ],
  },
  {
    key: 'data',
    items: [
      {
        icon: Database,
        tint: 'peach',
        labelKey: 'storage',
        descKey: 'storageDesc',
        valueKey: 'localFirst',
        to: '/settings/storage',
      },
      {
        icon: Download,
        tint: 'mist',
        labelKey: 'export',
        descKey: 'exportDesc',
        to: '/settings/export',
      },
    ],
  },
  {
    key: 'ai',
    items: [
      {
        icon: Server,
        tint: 'mist',
        labelKey: 'aiProviders',
        descKey: 'aiProvidersDesc',
        valueKey: 'catalog',
        to: '/settings/ai-providers',
      },
      {
        icon: Bot,
        tint: 'lavender',
        labelKey: 'aiModels',
        descKey: 'aiModelsDesc',
        valueKey: 'mockCatalog',
        to: '/settings/ai-models',
      },
      {
        icon: ReceiptText,
        tint: 'sage',
        labelKey: 'aiUsage',
        descKey: 'aiUsageDesc',
        valueKey: 'usage',
        to: '/settings/ai-usage',
      },
      {
        icon: FlaskConical,
        tint: 'peach',
        labelKey: 'aiInvokeDemo',
        descKey: 'aiInvokeDemoDesc',
        valueKey: 'internal',
        to: '/settings/ai-invoke-demo',
        adminOnly: true,
      },
    ],
  },
  {
    key: 'about',
    items: [
      { icon: LifeBuoy, tint: 'mist', labelKey: 'help', descKey: 'helpDesc', to: '/settings/help' },
      {
        icon: FlaskConical,
        tint: 'lavender',
        labelKey: 'labs',
        descKey: 'labsDesc',
        valueKey: 'soon',
        to: '/settings/labs',
      },
      {
        icon: Activity,
        tint: 'peach',
        labelKey: 'diagnostics',
        descKey: 'diagnosticsDesc',
        valueKey: 'localOnly',
        to: '/settings/diagnostics',
      },
      {
        icon: CircleHelp,
        tint: 'sage',
        labelKey: 'about',
        descKey: 'aboutDesc',
        valueKey: 'preAlpha',
        to: '/settings/about',
      },
    ],
  },
] as const;

function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useRouteContext({ from: '/_app' });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [loggingOut, setLoggingOut] = useState(false);
  const { mode, palette } = useTheme();

  if (pathname !== '/settings') {
    return <Outlet />;
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    if (!window.confirm(t('settings.actions.logoutConfirm'))) return;

    setLoggingOut(true);
    try {
      await logout();
      await router.navigate({ to: '/login' });
    } catch {
      toast.error(t('settings.actions.logoutFailed'));
      setLoggingOut(false);
    }
  };

  const settingSections = sections.map((section) => ({
    title: t(`settings.sections.${section.key}`),
    items: section.items
      .filter((item) => !('adminOnly' in item) || user.isSuperAdmin)
      .map((item) => ({
        icon: item.icon,
        tint: item.tint,
        label: t(`settings.items.${item.labelKey}`),
        description: t(`settings.items.${item.descKey}`),
        value:
          item.labelKey === 'appearance'
            ? t(`settings.themePalettes.${palette}.name`)
            : item.labelKey === 'theme'
              ? t(`settings.values.${mode === 'auto' ? 'autoTheme' : 'manualTheme'}`)
              : 'valueKey' in item
                ? t(`settings.values.${item.valueKey}`)
                : undefined,
        to: 'to' in item ? item.to : undefined,
      })),
  }));
  const actionItems: SettingsItem[] = [
    {
      icon: LogOut,
      tint: 'pink',
      label: t('settings.actions.logout'),
      description: t('settings.actions.logoutDesc'),
      value: loggingOut ? t('settings.actions.loggingOut') : undefined,
      onPress: () => void handleLogout(),
      danger: true,
      loading: loggingOut,
    },
  ];

  return (
    <main className="relative min-h-full overflow-hidden">
      <div className="mx-auto min-h-full w-full max-w-6xl px-2 sm:px-6 lg:px-8">
        <div className="relative min-w-0">
          <SettingsPatternField />

          <div className="relative z-10 pb-0">
            <header className="relative border-b border-hairline px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
              <div className="max-w-2xl space-y-2">
                <h1 className="text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">
                  {t('settings.pageTitle')}
                </h1>
                <p className="text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
                  {t('settings.pageSubtitle')}
                </p>
              </div>
            </header>

            <SettingsSlash />

            <div className="bg-canvas px-2 py-7 sm:px-8 sm:py-9 lg:px-10">
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
                <SettingsGroup title={t('settings.sections.accountAction')}>
                  {actionItems.map((item) => (
                    <SettingsRow key={item.label} item={item} />
                  ))}
                </SettingsGroup>
                <SettingsFooterMark />
              </div>
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
        <span
          className={`block truncate text-[14px] font-medium ${item.danger ? 'text-pink' : 'text-ink'}`}
        >
          {item.label}
        </span>
        {item.description ? (
          <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
            {item.description}
          </span>
        ) : null}
      </span>
      {item.value ? (
        <span className="shrink-0 text-[12px] text-ink-faint">{item.value}</span>
      ) : null}
      {item.to ? <ChevronRight size={15} className="shrink-0 text-ink-faint" /> : null}
    </>
  );

  const className =
    'group flex min-h-[58px] w-full items-center gap-3 border-b border-hairline px-3.5 text-left transition-colors last:border-b-0 hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60';

  if (item.to) {
    return (
      <Link to={item.to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={item.onPress} disabled={item.loading} className={className}>
      {content}
    </button>
  );
}
