import { createFileRoute, useRouteContext, useRouter } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Avatar from 'boring-avatars';
import 'altcha';
import type { AltchaWidgetElement } from 'altcha';
import {
  Check,
  KeyRound,
  Link2,
  Loader2,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Unlink,
  Upload,
  User,
} from 'lucide-react';
import {
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { authQueryOptions } from '@/api/auth';
import { FrameNode } from '@/components/FrameNode';
import { altchaChallengeUrl } from '@/lib/altcha';
import {
  accountFormFromUser,
  generatedAvatarMarker,
  makeGeneratedAvatarSeeds,
  parseGeneratedAvatarMarker,
  suggestPasskeyName,
  type AccountProfileForm,
} from '@/lib/account-settings';
import {
  authClient,
  emailOtp,
  linkSocial,
  listAccounts,
  passkey,
  signOut,
  unlinkAccount,
  updateUser,
  useListPasskeys,
} from '@/lib/auth-client';
import type { UserDto } from '@dicha/shared';

export const Route = createFileRoute('/_app/account')({
  component: AccountPage,
});

const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const LINE = 'color-mix(in oklab, var(--ink) 16%, transparent)';
const AVATAR_COLORS = ['#2E2A26', '#7A6248', '#F0C3A3', '#A9C0A0', '#A8C4D6'];

type PasskeyRecord = {
  id: string;
  name?: string | null;
  createdAt?: Date | string | null;
  deviceType?: string | null;
  backedUp?: boolean | null;
};

type UpdatePasskeyClient = {
  passkey: {
    updatePasskey?: (body: { id: string; name: string }) => Promise<{ error?: { message?: string } | null }>;
  };
};

function AccountPage() {
  const { user } = useRouteContext({ from: '/_app' });
  const { t } = useTranslation();

  return (
    <main className="relative min-h-full overflow-hidden">
      <div className="mx-auto min-h-full w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative min-w-0 [--node-horizontal-offset:-3.5px]">
          <FrameNode pos="top-left" />
          <FrameNode pos="top-right" />
          <GridPattern />

          <div className="relative z-10 pb-36">
            <header className="relative border-b border-hairline px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-end">
                <div className="space-y-2">
                  <h1 className="text-[28px] font-semibold leading-tight text-ink sm:text-[34px]">
                    {t('account.pageTitle')}
                  </h1>
                  <p className="max-w-2xl text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
                    {t('account.pageSubtitle')}
                  </p>
                </div>
                <AccountSummary user={user as UserDto} />
              </div>
            </header>

            <Slash />

            <div className="grid gap-7 bg-canvas px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1.04fr)_minmax(340px,0.96fr)] lg:px-10">
              <div className="space-y-7">
                <ProfileSection user={user as UserDto} />
                <AvatarSection user={user as UserDto} />
              </div>
              <div>
                <SecuritySection user={user as UserDto} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function AccountSummary({ user }: { user: UserDto }) {
  const seed = parseGeneratedAvatarMarker(user.image) ?? user.email;
  const uploadedImage = user.image && !parseGeneratedAvatarMarker(user.image) ? user.image : null;
  const displayName = user.displayName || user.name;

  return (
    <div className="relative isolate min-w-0 overflow-hidden border border-hairline bg-surface px-4 py-4 shadow-[6px_6px_0_color-mix(in_oklab,var(--ink)_5%,transparent)] [--node-horizontal-offset:-3.5px] [--node-vertical-offset:3.5px]">
      <FrameNode pos="top-left" />
      <FrameNode pos="bottom-right" />
      <div className="flex min-w-0 items-center gap-3">
        <div className="size-12 shrink-0 overflow-hidden rounded-md border border-hairline bg-canvas">
          {uploadedImage ? (
            <img src={uploadedImage} alt={displayName} className="size-full object-cover" />
          ) : (
            <Avatar name={seed} variant="beam" colors={AVATAR_COLORS} size={48} square />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{displayName}</p>
          <Mono className="block max-w-[32ch] truncate text-[11px] text-ink-faint">{user.email}</Mono>
        </div>
      </div>
    </div>
  );
}

function ProfileSection({ user }: { user: UserDto }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AccountProfileForm>(() => accountFormFromUser(user));
  const [saving, setSaving] = useState(false);

  const initial = useMemo(() => accountFormFromUser(user), [user]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const nameInvalid = form.displayName.trim().length === 0;

  const updateField = (key: keyof AccountProfileForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const refreshSession = () => queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey });

  const handleSave = async () => {
    if (!dirty || nameInvalid) return;
    setSaving(true);
    const { error } = await updateUser({
      displayName: form.displayName.trim(),
      homeName: form.homeName.trim() || null,
      city: form.city.trim() || null,
      gender: form.gender.trim() || null,
      personalityArchetype: form.personalityArchetype.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message ?? t('account.error'));
      return;
    }
    await refreshSession();
    toast.success(t('account.saved'));
  };

  return (
    <Panel title={t('account.profileTitle')}>
      <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
        <Field
          label={t('account.displayName')}
          value={form.displayName}
          onChange={(value) => updateField('displayName', value)}
          invalid={nameInvalid}
          errorText={t('account.displayNameRequired')}
        />
        <Field
          label={t('account.homeName')}
          value={form.homeName}
          onChange={(value) => updateField('homeName', value)}
        />
        <Field
          label={t('account.city')}
          value={form.city}
          onChange={(value) => updateField('city', value)}
        />
        <Field
          label={t('account.gender')}
          value={form.gender}
          onChange={(value) => updateField('gender', value)}
        />
        <div className="md:col-span-2">
          <Field
            label={t('account.personalityArchetype')}
            value={form.personalityArchetype}
            onChange={(value) => updateField('personalityArchetype', value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="border border-hairline bg-canvas px-3 py-2">
          <Mono className="block text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            {t('account.coins')}
          </Mono>
          <span className="text-[18px] font-semibold text-ink">{user.coins}</span>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || nameInvalid || saving}
          className="lp-btn lp-btn-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ fontFamily: MONO }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {saving ? t('account.saving') : t('account.save')}
        </button>
      </div>
    </Panel>
  );
}

function AvatarSection({ user }: { user: UserDto }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState(user.image);
  const [uploading, setUploading] = useState(false);
  const seeds = makeGeneratedAvatarSeeds(user);
  const selectedSeed = parseGeneratedAvatarMarker(image);
  const uploadedImage = image && !selectedSeed ? image : null;

  const refreshSession = () => queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey });

  const applyGeneratedAvatar = async (seed: string) => {
    const next = generatedAvatarMarker(seed);
    setImage(next);
    const { error } = await updateUser({ image: next });
    if (error) {
      setImage(user.image);
      toast.error(error.message ?? t('account.error'));
      return;
    }
    await refreshSession();
    toast.success(t('account.saved'));
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch('/api/media/avatar', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!response.ok) throw new Error(String(response.status));
      const { image: uploaded } = (await response.json()) as { image: string };
      setImage(uploaded);
      await refreshSession();
      toast.success(t('account.saved'));
    } catch {
      toast.error(t('account.error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Panel title={t('account.avatarTitle')}>
      <div className="grid gap-5 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start">
        <div className="size-24 shrink-0 overflow-hidden rounded-md border border-hairline bg-canvas">
          {uploadedImage ? (
            <img src={uploadedImage} alt={user.displayName ?? user.name} className="size-full object-cover" />
          ) : (
            <Avatar name={selectedSeed ?? user.email} variant="beam" colors={AVATAR_COLORS} size={96} square />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Mono className="block text-[11px] tracking-wider text-ink-soft">
            {t('account.avatarGenerated')}
          </Mono>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {seeds.map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => void applyGeneratedAvatar(seed)}
                aria-label={seed}
                className="size-14 overflow-hidden rounded-md border bg-canvas transition-transform hover:scale-[1.03]"
                style={{ borderColor: selectedSeed === seed ? 'var(--lp-brand)' : 'var(--hairline)' }}
              >
                <Avatar name={seed} variant="beam" colors={AVATAR_COLORS} size={56} square />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-hairline pt-5">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => void handleUpload(event)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="lp-btn lp-btn-ghost inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md px-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          style={{ fontFamily: MONO }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? t('account.avatarUploading') : t('account.avatarUpload')}
        </button>
        <Mono className="mt-2 block text-[11px] text-ink-faint">{t('account.avatarHint')}</Mono>
      </div>
    </Panel>
  );
}

function SecuritySection({ user }: { user: UserDto }) {
  const { t } = useTranslation();
  const router = useRouter();
  const altchaRef = useRef<AltchaWidgetElement>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [newPasskeyName, setNewPasskeyName] = useState(() => suggestPasskeyName(user));
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState('');

  const { data: passkeys, isPending: passkeysPending, refetch: refetchPasskeys } = useListPasskeys();
  const { data: accounts, refetch: refetchAccounts } = useQuery({
    queryKey: ['auth', 'accounts'],
    queryFn: async () => {
      const { data } = await listAccounts();
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const githubLinked = (accounts ?? []).some((account) => account.providerId === 'github');
  const typedPasskeys = (passkeys ?? []) as PasskeyRecord[];

  const handleLogout = async () => {
    await signOut();
    await router.navigate({ to: '/login' });
  };

  const handleResend = async () => {
    setResending(true);
    let payload: string | undefined;
    try {
      payload = (await altchaRef.current?.verify())?.payload;
    } catch {
      payload = undefined;
    }

    if (!payload) {
      setResending(false);
      altchaRef.current?.reset();
      toast.error(t('account.altchaFailed'));
      return;
    }

    const { error } = await emailOtp.sendVerificationOtp(
      { email: user.email, type: 'email-verification' },
      { headers: { 'x-altcha-response': payload } },
    );
    altchaRef.current?.reset();
    setResending(false);
    if (error) {
      toast.error(error.message ?? t('account.error'));
      return;
    }
    toast.success(t('account.emailResent'));
  };

  const handleLinkGithub = async () => {
    setBusy(true);
    const { error } = await linkSocial({ provider: 'github', callbackURL: '/account' });
    if (error) {
      toast.error(error.message ?? t('account.error'));
      setBusy(false);
    }
  };

  const handleUnlinkGithub = async () => {
    if (!window.confirm(t('account.githubUnlinkConfirm'))) return;
    setBusy(true);
    const { error } = await unlinkAccount({ providerId: 'github' });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? t('account.error'));
      return;
    }
    await refetchAccounts();
    toast.success(t('account.saved'));
  };

  const handleAddPasskey = async () => {
    const name = newPasskeyName.trim() || suggestPasskeyName(user);
    setBusy(true);
    const result = await passkey.addPasskey({ name });
    setBusy(false);
    if (result?.error) {
      toast.error(result.error.message ?? t('account.error'));
      return;
    }
    setNewPasskeyName(suggestPasskeyName(user));
    await refetchPasskeys();
    toast.success(t('account.saved'));
  };

  const handleStartRename = (record: PasskeyRecord) => {
    setEditingPasskeyId(record.id);
    setEditingPasskeyName(record.name || '');
  };

  const handleRenamePasskey = async () => {
    if (!editingPasskeyId || !editingPasskeyName.trim()) return;
    const updatePasskey = (authClient as unknown as UpdatePasskeyClient).passkey.updatePasskey;
    if (!updatePasskey) {
      toast.error(t('account.passkeyRenameUnavailable'));
      return;
    }

    setBusy(true);
    const { error } = await updatePasskey({
      id: editingPasskeyId,
      name: editingPasskeyName.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? t('account.error'));
      return;
    }
    setEditingPasskeyId(null);
    setEditingPasskeyName('');
    await refetchPasskeys();
    toast.success(t('account.saved'));
  };

  const handleDeletePasskey = async (record: PasskeyRecord) => {
    if (!window.confirm(t('account.passkeyDeleteConfirm', { name: record.name || t('account.passkeyUnnamed') }))) {
      return;
    }
    setBusy(true);
    const { error } = await passkey.deletePasskey({ id: record.id });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? t('account.error'));
      return;
    }
    await refetchPasskeys();
    toast.success(t('account.saved'));
  };

  return (
    <Panel title={t('account.securityTitle')}>
      <section className="space-y-3">
        <SectionLabel>{t('account.email')}</SectionLabel>
        <div className="flex flex-col gap-3 border border-hairline bg-canvas px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Mono className="block truncate text-[12px] text-ink">{user.email}</Mono>
            <Mono className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-soft">
              {user.emailVerified ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
              {user.emailVerified ? t('account.emailVerified') : t('account.emailUnverified')}
            </Mono>
          </div>
          {!user.emailVerified ? (
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resending}
              className="lp-btn lp-btn-ghost inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontFamily: MONO }}
            >
              {resending ? <Loader2 size={13} className="animate-spin" /> : <ShieldAlert size={13} />}
              {resending ? t('account.sending') : t('account.emailResend')}
            </button>
          ) : null}
        </div>
        <altcha-widget
          ref={altchaRef}
          challenge={altchaChallengeUrl()}
          auto="off"
          display="invisible"
          hidefooter
          hidelogo
        />
      </section>

      <section className="space-y-3 border-t border-hairline pt-5">
        <SectionLabel>{t('account.github')}</SectionLabel>
        <div className="flex flex-col gap-3 border border-hairline bg-canvas px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-[13px] text-ink" style={{ fontFamily: MONO }}>
            <GithubMark size={15} />
            {githubLinked ? t('account.githubLinked') : t('account.githubNotLinked')}
          </span>
          {githubLinked ? (
            <button
              type="button"
              onClick={() => void handleUnlinkGithub()}
              disabled={busy}
              className="lp-btn lp-btn-ghost inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontFamily: MONO }}
            >
              <Unlink size={13} />
              {t('account.githubUnlink')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleLinkGithub()}
              disabled={busy}
              className="lp-btn lp-btn-ghost inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontFamily: MONO }}
            >
              <Link2 size={13} />
              {t('account.githubLink')}
            </button>
          )}
        </div>
      </section>

      <section className="space-y-3 border-t border-hairline pt-5">
        <SectionLabel>{t('account.passkey')}</SectionLabel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newPasskeyName}
            onChange={(event) => setNewPasskeyName(event.target.value)}
            className="w-full rounded-md border border-hairline bg-canvas px-3 py-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-[var(--lp-brand)]"
            style={{ fontFamily: MONO }}
          />
          <button
            type="button"
            onClick={() => void handleAddPasskey()}
            disabled={busy}
            className="lp-btn lp-btn-primary inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontFamily: MONO }}
          >
            <KeyRound size={14} />
            {t('account.passkeyAdd')}
          </button>
        </div>

        {passkeysPending ? (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin text-ink-soft" />
          </div>
        ) : typedPasskeys.length === 0 ? (
          <p className="border border-dashed px-3 py-3 text-center text-[12px] text-ink-faint" style={{ fontFamily: MONO, borderColor: LINE }}>
            {t('account.passkeyEmpty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {typedPasskeys.map((record) => (
              <li key={record.id} className="border border-hairline bg-canvas px-3 py-3">
                {editingPasskeyId === record.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={editingPasskeyName}
                      onChange={(event) => setEditingPasskeyName(event.target.value)}
                      className="w-full rounded-md border border-hairline bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-[var(--lp-brand)]"
                      style={{ fontFamily: MONO }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleRenamePasskey()}
                      disabled={busy || !editingPasskeyName.trim()}
                      className="lp-btn lp-btn-primary inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3 text-[12px] disabled:opacity-60"
                      style={{ fontFamily: MONO }}
                    >
                      <Check size={13} />
                      {t('account.save')}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink" style={{ fontFamily: MONO }}>
                        <KeyRound size={13} className="shrink-0 text-ink-soft" />
                        <span className="truncate">{record.name || t('account.passkeyUnnamed')}</span>
                      </span>
                      <Mono className="mt-1 block text-[11px] text-ink-faint">
                        {formatPasskeyMeta(record, t('account.passkeyMetaUnknown'))}
                      </Mono>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartRename(record)}
                        className="app-icon-btn inline-flex size-8 items-center justify-center rounded-md text-ink-soft"
                        aria-label={t('account.passkeyRename')}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeletePasskey(record)}
                        disabled={busy}
                        className="app-icon-btn inline-flex size-8 items-center justify-center rounded-md text-ink-soft hover:text-accent-pink disabled:opacity-60"
                        aria-label={t('account.passkeyDelete')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-hairline pt-5">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="lp-btn lp-btn-ghost inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md px-4 text-[13px]"
          style={{ fontFamily: MONO }}
        >
          <User size={14} />
          {t('account.logout')}
        </button>
        <Mono className="mt-3 block text-[11px] leading-relaxed text-ink-faint">
          {t('account.futureSettingsNote')}
        </Mono>
      </section>
    </Panel>
  );
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative isolate overflow-hidden border border-hairline bg-surface p-5 shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--ink)_8%,transparent)] sm:p-6 [--node-horizontal-offset:-3.5px] [--node-vertical-offset:3.5px] ${className}`}
    >
      <FrameNode pos="top-left" />
      <FrameNode pos="top-right" />
      <div className="absolute inset-x-0 top-0 h-8 opacity-35 [mask-image:linear-gradient(to_bottom,#000,transparent)]">
        <Hatch />
      </div>
      <div className="relative z-10 mb-5 flex items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
        </div>
        <span aria-hidden className="h-px w-14 bg-[color-mix(in_oklab,var(--ink)_16%,transparent)]" />
      </div>
      <div className="relative z-10 space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  invalid,
  errorText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  errorText?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <Mono className="block text-[11px] tracking-wider text-ink-soft">{label}</Mono>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        className="w-full rounded-md border bg-canvas px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-[var(--lp-brand)]"
        style={{ borderColor: invalid ? 'var(--accent-pink)' : 'var(--hairline)', fontFamily: MONO }}
      />
      {invalid && errorText ? <Mono className="block text-[11px] text-accent-pink">{errorText}</Mono> : null}
    </label>
  );
}

function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={className} style={{ fontFamily: MONO }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Mono className="block text-[10px] uppercase tracking-[0.2em] text-ink-faint">
      {children}
    </Mono>
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
        <pattern id="account-grid-fine" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </pattern>
        <pattern id="account-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill="url(#account-grid-fine)" />
          <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#account-grid)" />
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
        <pattern id="account-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#account-hatch)" opacity="0.28" />
    </svg>
  );
}

function formatPasskeyMeta(record: PasskeyRecord, fallback: string) {
  const parts = [
    record.deviceType,
    record.backedUp === true ? 'backed up' : null,
    record.createdAt ? new Date(record.createdAt).toISOString().slice(0, 10) : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' / ') : fallback;
}

function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
