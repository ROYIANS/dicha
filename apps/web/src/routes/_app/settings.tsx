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
  WalletCards,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { logout } from '@/api/auth';
import { BrandMark } from '@/components/AppBrand';
import { SettingsPatternField, SettingsSlash } from '@/components/SettingsOrnaments';
import { settingsHeaderClassName, settingsTitleClassName } from '@/components/settings-ui';
import { useTheme } from '@/lib/hooks/useTheme';
import { HeroTextInput } from '@/components/HeroControls';

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
});

type SettingsItem = {
  icon: LucideIcon;
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
  | '/settings/credits'
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
        labelKey: 'profile',
        descKey: 'profileDesc',
        to: '/settings/profile',
      },
      {
        icon: KeyRound,
        labelKey: 'security',
        descKey: 'securityDesc',
        to: '/settings/security',
      },
      {
        icon: ShieldCheck,
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
        labelKey: 'appearance',
        descKey: 'appearanceDesc',
        valueKey: 'warmMatte',
        to: '/settings/appearance',
      },
      {
        icon: Moon,
        labelKey: 'theme',
        descKey: 'themeDesc',
        valueKey: 'autoTheme',
        to: '/settings/theme',
      },
      {
        icon: Bell,
        labelKey: 'notifications',
        descKey: 'notificationsDesc',
        to: '/settings/notifications',
      },
      {
        icon: Languages,
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
        labelKey: 'storage',
        descKey: 'storageDesc',
        valueKey: 'localFirst',
        to: '/settings/storage',
      },
      {
        icon: Download,
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
        labelKey: 'aiProviders',
        descKey: 'aiProvidersDesc',
        valueKey: 'catalog',
        to: '/settings/ai-providers',
      },
      {
        icon: Bot,
        labelKey: 'aiModels',
        descKey: 'aiModelsDesc',
        valueKey: 'mockCatalog',
        to: '/settings/ai-models',
      },
      {
        icon: ReceiptText,
        labelKey: 'aiUsage',
        descKey: 'aiUsageDesc',
        valueKey: 'usage',
        to: '/settings/ai-usage',
      },
      {
        icon: WalletCards,
        labelKey: 'credits',
        descKey: 'creditsDesc',
        valueKey: 'credits',
        to: '/settings/credits',
      },
      {
        icon: FlaskConical,
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
      { icon: LifeBuoy, labelKey: 'help', descKey: 'helpDesc', to: '/settings/help' },
      {
        icon: FlaskConical,
        labelKey: 'labs',
        descKey: 'labsDesc',
        valueKey: 'soon',
        to: '/settings/labs',
      },
      {
        icon: Activity,
        labelKey: 'diagnostics',
        descKey: 'diagnosticsDesc',
        valueKey: 'localOnly',
        to: '/settings/diagnostics',
      },
      {
        icon: CircleHelp,
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
            <header className={settingsHeaderClassName}>
              <div className="max-w-2xl space-y-2">
                <h1 className={settingsTitleClassName}>{t('settings.pageTitle')}</h1>
                <p className="text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
                  {t('settings.pageSubtitle')}
                </p>
              </div>
            </header>

            <SettingsSlash />

            <div className="bg-canvas px-2 py-7 sm:px-8 sm:py-9 lg:px-10">
              <div className="mx-auto max-w-3xl space-y-6">
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-ink-faint"
                  />
                  <HeroTextInput
                    value=""
                    readOnly
                    aria-label={t('settings.searchPlaceholder')}
                    placeholder={t('settings.searchPlaceholder')}
                    onFocus={() => toast.info('搜索功能即将开放')}
                    className="app-input-field min-h-11 w-full rounded-md border border-hairline bg-surface pl-10 text-[13px] text-ink"
                  />
                </div>

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
      <div className="overflow-hidden rounded-md border border-hairline bg-surface shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
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
        className={`grid w-5 shrink-0 place-items-center ${item.danger ? 'text-pink' : 'text-ink'}`}
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
    'group flex min-h-[58px] w-full appearance-none items-center gap-3 border-b border-hairline bg-transparent px-3.5 text-left text-inherit transition-colors last:border-b-0 hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-60';

  if (item.to) {
    return (
      <Link to={item.to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={item.onPress}
      disabled={item.loading}
      className={className}
    >
      {content}
    </button>
  );
}
