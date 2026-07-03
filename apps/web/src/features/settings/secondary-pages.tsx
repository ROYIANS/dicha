import {
  Activity,
  Bell,
  Check,
  CloudOff,
  Database,
  Download,
  EyeOff,
  FlaskConical,
  Globe2,
  HardDrive,
  HeartHandshake,
  Info,
  Languages,
  LayoutList,
  LockKeyhole,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  SettingsDetailShell,
  SettingsPanel,
  SettingsSwitch,
  SettingsValueRow,
} from '@/components/SettingsScaffold';
import { useTheme } from '@/lib/hooks/useTheme';
import { THEME_PALETTES, themePaletteById, type ThemePalette } from '@/lib/theme-palettes';

type SettingsDetailPageKey =
  | 'privacy'
  | 'appearance'
  | 'theme'
  | 'notifications'
  | 'language'
  | 'storage'
  | 'export'
  | 'help'
  | 'labs'
  | 'diagnostics'
  | 'about';

function SettingsPageShell({
  pageKey,
  children,
}: {
  pageKey: SettingsDetailPageKey;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <SettingsDetailShell
      title={t(`settings.detail.${pageKey}.title`)}
      subtitle={t(`settings.detail.${pageKey}.subtitle`)}
    >
      <div className="mx-auto max-w-3xl space-y-6">{children}</div>
    </SettingsDetailShell>
  );
}

export function PrivacySettingsPage() {
  const { t } = useTranslation();
  const [privateProfile, setPrivateProfile] = useState(true);
  const [hideActivity, setHideActivity] = useState(true);

  return (
    <SettingsPageShell pageKey="privacy">
      <SettingsPanel title={t('settings.detail.privacy.panelAccount')}>
        <SettingsValueRow
          icon={EyeOff}
          tint="sage"
          label={t('settings.detail.privacy.privateProfile')}
          description={t('settings.detail.privacy.privateProfileDesc')}
          action={
            <SettingsSwitch
              checked={privateProfile}
              onChange={setPrivateProfile}
              label={t('settings.detail.privacy.privateProfile')}
            />
          }
        />
        <SettingsValueRow
          icon={LockKeyhole}
          tint="lavender"
          label={t('settings.detail.privacy.hideActivity')}
          description={t('settings.detail.privacy.hideActivityDesc')}
          action={
            <SettingsSwitch
              checked={hideActivity}
              onChange={setHideActivity}
              label={t('settings.detail.privacy.hideActivity')}
            />
          }
        />
      </SettingsPanel>
      <SettingsPanel title={t('settings.detail.privacy.panelBoundaries')}>
        <SettingsValueRow
          icon={CloudOff}
          tint="mist"
          label={t('settings.detail.privacy.cloudSync')}
          description={t('settings.detail.privacy.cloudSyncDesc')}
          value={t('settings.values.soon')}
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

export function AppearanceSettingsPage() {
  const { t } = useTranslation();
  const { theme, palette, setPalette } = useTheme();
  const selectedPalette = themePaletteById(palette);

  return (
    <SettingsPageShell pageKey="appearance">
      <SettingsPanel
        title={t('settings.detail.appearance.panelPalette')}
        footer={
          theme === 'dark'
            ? t('settings.detail.appearance.darkFooter')
            : t('settings.detail.appearance.footer')
        }
      >
        {THEME_PALETTES.map((item) => (
          <ThemePaletteOption
            key={item.id}
            palette={item}
            selected={item.id === selectedPalette.id}
            onSelect={() => setPalette(item.id)}
          />
        ))}
      </SettingsPanel>

      <SettingsPanel title={t('settings.detail.appearance.panelSurface')}>
        <SettingsValueRow
          icon={Palette}
          tint={selectedPalette.tint}
          label={t('settings.detail.appearance.surface')}
          description={t('settings.detail.appearance.surfaceDesc')}
          value={t(`settings.themePalettes.${selectedPalette.id}.name`)}
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

function ThemePaletteOption({
  palette,
  selected,
  onSelect,
}: {
  palette: ThemePalette;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`grid min-h-[76px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline/70 px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-alt ${
        selected ? 'bg-surface-alt' : ''
      }`}
    >
      <span className="grid size-10 shrink-0 grid-cols-2 overflow-hidden rounded-md border border-hairline bg-surface">
        {palette.swatches.map((color) => (
          <span key={color} style={{ backgroundColor: color }} />
        ))}
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-ink">
          {t(`settings.themePalettes.${palette.id}.name`)}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-faint">
          {t(`settings.themePalettes.${palette.id}.desc`)}
        </span>
      </span>
      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-hairline bg-canvas text-ink-soft">
        {selected ? <Check size={15} strokeWidth={2} /> : null}
      </span>
    </button>
  );
}

export function ThemeSettingsPage() {
  const { t } = useTranslation();
  const { mode, theme, setAutoMode } = useTheme();
  const autoModeEnabled = mode === 'auto';

  return (
    <SettingsPageShell pageKey="theme">
      <SettingsPanel
        title={t('settings.detail.theme.panelMode')}
        footer={t('settings.detail.theme.footer')}
      >
        <SettingsValueRow
          icon={theme === 'dark' ? Moon : Sun}
          tint="lavender"
          label={t('settings.detail.theme.currentMode')}
          description={t('settings.detail.theme.currentModeDesc')}
          action={
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[12px] text-ink-faint">
                {autoModeEnabled
                  ? t('settings.detail.theme.autoCurrent', {
                      mode:
                        theme === 'dark'
                          ? t('settings.detail.theme.dark')
                          : t('settings.detail.theme.light'),
                    })
                  : theme === 'dark'
                    ? t('settings.detail.theme.dark')
                    : t('settings.detail.theme.light')}
              </span>
              <ThemeToggle
                className="lp-nav-link inline-flex size-8 items-center justify-center rounded-md border border-hairline"
                iconSize={15}
              />
            </div>
          }
        />
        <SettingsValueRow
          icon={Sun}
          tint="peach"
          label={t('settings.detail.theme.autoMode')}
          description={t('settings.detail.theme.autoModeDesc')}
          action={
            <SettingsSwitch
              checked={autoModeEnabled}
              onChange={setAutoMode}
              label={t('settings.detail.theme.autoMode')}
            />
          }
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

export function NotificationSettingsPage() {
  const { t } = useTranslation();
  const [quietMode, setQuietMode] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [itemReminders, setItemReminders] = useState(true);

  return (
    <SettingsPageShell pageKey="notifications">
      <SettingsPanel title={t('settings.detail.notifications.panelReminders')}>
        <SettingsValueRow
          icon={Bell}
          tint="pink"
          label={t('settings.detail.notifications.quietMode')}
          description={t('settings.detail.notifications.quietModeDesc')}
          action={
            <SettingsSwitch
              checked={quietMode}
              onChange={setQuietMode}
              label={t('settings.detail.notifications.quietMode')}
            />
          }
        />
        <SettingsValueRow
          icon={LayoutList}
          tint="sage"
          label={t('settings.detail.notifications.weeklyDigest')}
          description={t('settings.detail.notifications.weeklyDigestDesc')}
          action={
            <SettingsSwitch
              checked={weeklyDigest}
              onChange={setWeeklyDigest}
              label={t('settings.detail.notifications.weeklyDigest')}
            />
          }
        />
        <SettingsValueRow
          icon={Check}
          tint="peach"
          label={t('settings.detail.notifications.itemReminders')}
          description={t('settings.detail.notifications.itemRemindersDesc')}
          action={
            <SettingsSwitch
              checked={itemReminders}
              onChange={setItemReminders}
              label={t('settings.detail.notifications.itemReminders')}
            />
          }
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

export function LanguageSettingsPage() {
  const { t } = useTranslation();

  return (
    <SettingsPageShell pageKey="language">
      <SettingsPanel title={t('settings.detail.language.panelLanguage')}>
        <SettingsValueRow
          icon={Languages}
          tint="sage"
          label={t('settings.detail.language.chinese')}
          description={t('settings.detail.language.chineseDesc')}
          value={t('settings.detail.language.selected')}
        />
        <SettingsValueRow
          icon={Globe2}
          tint="mist"
          label={t('settings.detail.language.future')}
          description={t('settings.detail.language.futureDesc')}
          value={t('settings.values.soon')}
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

export function StorageSettingsPage() {
  const { t } = useTranslation();

  return (
    <SettingsPageShell pageKey="storage">
      <SettingsPanel
        title={t('settings.detail.storage.panelUsage')}
        footer={t('settings.detail.storage.footer')}
      >
        <SettingsValueRow
          icon={HardDrive}
          tint="peach"
          label={t('settings.detail.storage.localCache')}
          description={t('settings.detail.storage.localCacheDesc')}
          value="24 MB"
        />
        <SettingsValueRow
          icon={Database}
          tint="sage"
          label={t('settings.detail.storage.media')}
          description={t('settings.detail.storage.mediaDesc')}
          value={t('settings.detail.storage.notMeasured')}
        />
        <SettingsValueRow
          icon={CloudOff}
          tint="mist"
          label={t('settings.detail.storage.sync')}
          description={t('settings.detail.storage.syncDesc')}
          value={t('settings.values.soon')}
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

export function ExportSettingsPage() {
  const { t } = useTranslation();

  return (
    <SettingsPageShell pageKey="export">
      <SettingsPanel
        title={t('settings.detail.export.panelData')}
        footer={t('settings.detail.export.footer')}
      >
        <SettingsValueRow
          icon={Download}
          tint="mist"
          label={t('settings.detail.export.archive')}
          description={t('settings.detail.export.archiveDesc')}
          value={t('settings.values.soon')}
        />
        <SettingsValueRow
          icon={Database}
          tint="peach"
          label={t('settings.detail.export.format')}
          description={t('settings.detail.export.formatDesc')}
          value="JSON"
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

export function HelpSettingsPage() {
  const { t } = useTranslation();

  return (
    <SettingsPageShell pageKey="help">
      <SettingsPanel
        title={t('settings.detail.help.panelSupport')}
        footer={t('settings.detail.help.footer')}
      >
        <SettingsValueRow
          icon={HeartHandshake}
          tint="mist"
          label={t('settings.detail.help.feedback')}
          description={t('settings.detail.help.feedbackDesc')}
          value={t('settings.values.soon')}
        />
        <SettingsValueRow
          icon={Info}
          tint="sage"
          label={t('settings.detail.help.guide')}
          description={t('settings.detail.help.guideDesc')}
          value={t('settings.detail.help.inApp')}
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

export function LabsSettingsPage() {
  const { t } = useTranslation();

  return (
    <SettingsPageShell pageKey="labs">
      <SettingsPanel
        title={t('settings.detail.labs.panelExperiments')}
        footer={t('settings.detail.labs.footer')}
      >
        <SettingsValueRow
          icon={FlaskConical}
          tint="lavender"
          label={t('settings.detail.labs.worldPreview')}
          description={t('settings.detail.labs.worldPreviewDesc')}
          value={t('settings.values.soon')}
        />
        <SettingsValueRow
          icon={LayoutList}
          tint="peach"
          label={t('settings.detail.labs.smartInput')}
          description={t('settings.detail.labs.smartInputDesc')}
          value={t('settings.values.soon')}
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

export function DiagnosticsSettingsPage() {
  const { t } = useTranslation();

  return (
    <SettingsPageShell pageKey="diagnostics">
      <SettingsPanel
        title={t('settings.detail.diagnostics.panelRuntime')}
        footer={t('settings.detail.diagnostics.footer')}
      >
        <SettingsValueRow
          icon={Activity}
          tint="peach"
          label={t('settings.detail.diagnostics.appShell')}
          description={t('settings.detail.diagnostics.appShellDesc')}
          value={t('settings.detail.diagnostics.loaded')}
        />
        <SettingsValueRow
          icon={Database}
          tint="sage"
          label={t('settings.detail.diagnostics.authMode')}
          description={t('settings.detail.diagnostics.authModeDesc')}
          value={t('settings.detail.diagnostics.realSession')}
        />
        <SettingsValueRow
          icon={CloudOff}
          tint="mist"
          label={t('settings.detail.diagnostics.report')}
          description={t('settings.detail.diagnostics.reportDesc')}
          value={t('settings.values.soon')}
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}

export function AboutSettingsPage() {
  const { t } = useTranslation();

  return (
    <SettingsPageShell pageKey="about">
      <SettingsPanel title={t('settings.detail.about.panelApp')}>
        <SettingsValueRow
          icon={Info}
          tint="sage"
          label={t('settings.detail.about.version')}
          description={t('settings.detail.about.versionDesc')}
          value="pre-alpha"
        />
        <SettingsValueRow
          icon={ShieldCheck}
          tint="lavender"
          label={t('settings.detail.about.promise')}
          description={t('settings.detail.about.promiseDesc')}
          value={t('settings.detail.about.localFirst')}
        />
      </SettingsPanel>
    </SettingsPageShell>
  );
}
