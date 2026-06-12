import { useState, useRef, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Modal,
  Avatar,
  TextField,
  Label,
  Input,
  FieldError,
  Button,
  Spinner,
} from '@heroui/react';
import {
  X,
  LogOut,
  Upload,
  KeyRound,
  Trash2,
  Link2,
  Unlink,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { DotsBackdrop } from '@/components/DotsBackdrop';
import {
  updateUser,
  linkSocial,
  unlinkAccount,
  listAccounts,
  useListPasskeys,
  passkey,
  emailOtp,
  signOut,
} from '@/lib/auth-client';
import { authQueryOptions } from '@/api/auth';
import type { UserDto } from '@vidorra/shared';

const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const PRESET_AVATARS = [1, 2, 3, 4, 5, 6].map((n) => `/avatars/avatar-${n}.svg`);

type AccountModalProps = {
  user: UserDto;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

type Tab = 'profile' | 'security';

/** 区块标题（mono 小标 + 细线）。 */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="block text-[10px] uppercase tracking-[0.2em] text-ink-faint"
      style={{ fontFamily: MONO }}
    >
      {children}
    </span>
  );
}

// PLACEHOLDER_BODY

/** 账户弹窗：HeroUI Modal + 在 Backdrop 内渲染 DotsBackdrop 点阵遮罩。 */
export function AccountModal({ user, isOpen, onOpenChange }: AccountModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop className="lp-drawer-backdrop backdrop-blur-[14px] backdrop-saturate-150">
        <DotsBackdrop visible={isOpen} className="pointer-events-none absolute inset-0 size-full" />
        <Modal.Container placement="center">
          <Modal.Dialog
            className="relative isolate w-[min(92vw,520px)] max-h-[88dvh] overflow-hidden border bg-surface/95 p-0 shadow-float outline-none"
            style={{ borderColor: 'color-mix(in oklab, var(--ink) 22%, transparent)' }}
          >
            <AccountModalContent
              user={user}
              tab={tab}
              setTab={setTab}
              onClose={() => onOpenChange(false)}
              t={t}
            />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

type ContentProps = {
  user: UserDto;
  tab: Tab;
  setTab: (t: Tab) => void;
  onClose: () => void;
  t: ReturnType<typeof useTranslation>['t'];
};

function AccountModalContent({ user, tab, setTab, onClose, t }: ContentProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    onClose();
    await router.navigate({ to: '/login' });
  };

  const tabBtn = (key: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className="relative px-3 py-2 text-[13px] transition-colors"
      style={{
        fontFamily: MONO,
        color: tab === key ? 'var(--ink)' : 'var(--ink-faint)',
      }}
    >
      {label}
      {tab === key ? (
        <span className="absolute inset-x-2 -bottom-px h-0.5" style={{ background: 'var(--lp-brand)' }} />
      ) : null}
    </button>
  );

  return (
    <div className="flex max-h-[88dvh] flex-col">
      {/* 头部：标题 + tabs + 关闭 */}
      <div className="flex shrink-0 items-center justify-between border-b border-hairline px-4 pt-3">
        <div className="flex items-center gap-1">
          {tabBtn('profile', t('account.tabProfile'))}
          {tabBtn('security', t('account.tabSecurity'))}
        </div>
        <button
          type="button"
          aria-label={t('account.close')}
          onClick={onClose}
          className="app-icon-btn inline-flex size-8 items-center justify-center rounded-md border border-hairline"
        >
          <X size={16} className="text-ink-soft" />
        </button>
      </div>

      {/* 主体：可滚动 */}
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
        {tab === 'profile' ? (
          <ProfileTab user={user} t={t} />
        ) : (
          <SecurityTab user={user} t={t} />
        )}
      </div>

      {/* 底部：退出登录 */}
      <div className="flex shrink-0 items-center justify-between border-t border-hairline px-5 py-3">
        <span className="text-[11px] text-ink-faint" style={{ fontFamily: MONO }}>
          {user.email}
        </span>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-[12px] text-ink-soft transition-colors hover:text-ink"
          style={{ fontFamily: MONO }}
        >
          <LogOut size={13} />
          {t('account.logout')}
        </button>
      </div>
    </div>
  );
}

type TabProps = { user: UserDto; t: ContentProps['t'] };

function ProfileTab({ user, t }: TabProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.displayName ?? user.name ?? '');
  const [image, setImage] = useState(user.image);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resending, setResending] = useState(false);

  const nameInvalid = name.trim().length === 0;
  const dirty = name.trim() !== (user.displayName ?? user.name ?? '');

  const refreshSession = () =>
    queryClient.invalidateQueries({ queryKey: authQueryOptions().queryKey });

  const applyImage = async (next: string) => {
    setImage(next);
    const { error } = await updateUser({ image: next });
    if (error) {
      toast.error(error.message ?? t('account.error'));
      setImage(user.image);
      return;
    }
    await refreshSession();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/media/avatar', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });
      if (!res.ok) throw new Error(String(res.status));
      const { image: uploaded } = (await res.json()) as { image: string };
      setImage(uploaded);
      await refreshSession();
      toast.success(t('account.saved'));
    } catch {
      toast.error(t('account.error'));
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    if (nameInvalid || !dirty) return;
    setSavingName(true);
    const { error } = await updateUser({ displayName: name.trim() });
    setSavingName(false);
    if (error) {
      toast.error(error.message ?? t('account.error'));
      return;
    }
    await refreshSession();
    toast.success(t('account.saved'));
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await emailOtp.sendVerificationOtp({
      email: user.email,
      type: 'email-verification',
    });
    setResending(false);
    if (error) {
      toast.error(error.message ?? t('account.error'));
      return;
    }
    toast.success(t('account.emailResent'));
  };

  return (
    <>
      {/* 头像 */}
      <section className="space-y-3">
        <SectionLabel>{t('account.avatar')}</SectionLabel>
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-16 shrink-0 rounded-lg">
            {image ? <Avatar.Image src={image} alt={name} /> : null}
            <Avatar.Fallback>{(name || 'V').slice(0, 1).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_AVATARS.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => void applyImage(src)}
                aria-label={src}
                className="size-9 overflow-hidden rounded-md border transition-transform hover:scale-105"
                style={{
                  borderColor:
                    image === src ? 'var(--lp-brand)' : 'color-mix(in oklab, var(--ink) 18%, transparent)',
                }}
              >
                <img src={src} alt="" className="size-full" />
              </button>
            ))}
          </div>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void handleUpload(e)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-1.5 text-[12px] text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
            style={{ fontFamily: MONO }}
          >
            {uploading ? <Spinner size="sm" /> : <Upload size={13} />}
            {uploading ? t('account.avatarUploading') : t('account.avatarUpload')}
          </button>
          <p className="mt-1.5 text-[11px] text-ink-faint" style={{ fontFamily: MONO }}>
            {t('account.avatarHint')}
          </p>
        </div>
      </section>

      {/* 昵称 */}
      <section className="space-y-3">
        <SectionLabel>{t('account.displayName')}</SectionLabel>
        <div className="flex items-end gap-2">
          <TextField
            className="flex-1"
            value={name}
            onChange={setName}
            isInvalid={nameInvalid}
            isRequired
          >
            <Label className="sr-only">{t('account.displayName')}</Label>
            <Input placeholder={t('account.displayNamePlaceholder')} />
            {nameInvalid ? <FieldError>{t('account.displayNameRequired')}</FieldError> : null}
          </TextField>
          <Button
            isDisabled={nameInvalid || !dirty || savingName}
            onPress={() => void handleSaveName()}
          >
            {savingName ? t('account.saving') : t('account.save')}
          </Button>
        </div>
      </section>

      {/* 邮箱（仅展示 + 验证状态） */}
      <section className="space-y-3">
        <SectionLabel>{t('account.email')}</SectionLabel>
        <div className="flex items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2.5">
          <span className="min-w-0 truncate text-[13px] text-ink" style={{ fontFamily: MONO }}>
            {user.email}
          </span>
          {user.emailVerified ? (
            <span
              className="inline-flex shrink-0 items-center gap-1 text-[11px] text-accent-sage"
              style={{ fontFamily: MONO }}
            >
              <ShieldCheck size={13} />
              {t('account.emailVerified')}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={resending}
              className="inline-flex shrink-0 items-center gap-1 text-[11px] text-accent-pink transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ fontFamily: MONO }}
            >
              <ShieldAlert size={13} />
              {resending ? t('account.avatarUploading') : t('account.emailResend')}
            </button>
          )}
        </div>
      </section>
    </>
  );
}

function SecurityTab({ t }: TabProps) {
  const [busy, setBusy] = useState(false);
  const { data: passkeys, isPending: passkeysPending, refetch: refetchPasskeys } = useListPasskeys();

  // 已绑定的社交账户（用于判断 GitHub 是否已连接）。
  const { data: accounts, refetch: refetchAccounts } = useQuery({
    queryKey: ['auth', 'accounts'],
    queryFn: async () => {
      const { data } = await listAccounts();
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const githubLinked = (accounts ?? []).some((a) => a.providerId === 'github');

  const handleLinkGithub = async () => {
    setBusy(true);
    const { error } = await linkSocial({ provider: 'github', callbackURL: '/' });
    if (error) {
      toast.error(error.message ?? t('account.error'));
      setBusy(false);
    }
    // 成功会跳转 GitHub OAuth；无需复位
  };

  const handleUnlinkGithub = async () => {
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
    setBusy(true);
    const res = await passkey.addPasskey();
    setBusy(false);
    if (res?.error) {
      toast.error(res.error.message ?? t('account.error'));
      return;
    }
    await refetchPasskeys();
    toast.success(t('account.saved'));
  };

  const handleDeletePasskey = async (id: string) => {
    setBusy(true);
    const { error } = await passkey.deletePasskey({ id });
    setBusy(false);
    if (error) {
      toast.error(error.message ?? t('account.error'));
      return;
    }
    await refetchPasskeys();
    toast.success(t('account.saved'));
  };

  return (
    <>
      {/* GitHub 绑定 */}
      <section className="space-y-3">
        <SectionLabel>{t('account.github')}</SectionLabel>
        <div className="flex items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2.5">
          <span className="flex items-center gap-2 text-[13px] text-ink" style={{ fontFamily: MONO }}>
            <GithubMark size={15} />
            {githubLinked ? t('account.githubLinked') : t('account.github')}
          </span>
          {githubLinked ? (
            <button
              type="button"
              onClick={() => void handleUnlinkGithub()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-[12px] text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-[12px] text-ink-soft transition-colors hover:text-ink disabled:opacity-60"
              style={{ fontFamily: MONO }}
            >
              <Link2 size={13} />
              {t('account.githubLink')}
            </button>
          )}
        </div>
      </section>

      {/* Passkey 管理 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel>{t('account.passkey')}</SectionLabel>
          <button
            type="button"
            onClick={() => void handleAddPasskey()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[12px] text-accent-sage transition-opacity hover:opacity-80 disabled:opacity-60"
            style={{ fontFamily: MONO }}
          >
            <KeyRound size={13} />
            {t('account.passkeyAdd')}
          </button>
        </div>

        {passkeysPending ? (
          <div className="flex justify-center py-3">
            <Spinner size="sm" />
          </div>
        ) : !passkeys || passkeys.length === 0 ? (
          <p className="rounded-md border border-dashed border-hairline px-3 py-3 text-center text-[12px] text-ink-faint" style={{ fontFamily: MONO }}>
            {t('account.passkeyEmpty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {passkeys.map((pk) => (
              <li
                key={pk.id}
                className="flex items-center justify-between gap-3 rounded-md border border-hairline px-3 py-2"
              >
                <span className="flex items-center gap-2 text-[13px] text-ink" style={{ fontFamily: MONO }}>
                  <KeyRound size={13} className="text-ink-soft" />
                  {pk.name || t('account.passkeyUnnamed')}
                </span>
                <button
                  type="button"
                  aria-label={t('account.passkeyDelete')}
                  onClick={() => void handleDeletePasskey(pk.id)}
                  disabled={busy}
                  className="app-icon-btn inline-flex size-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:text-accent-pink disabled:opacity-60"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/** GitHub 标识（lucide v1 已移除品牌图标，内联官方 mark）。 */
function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}




