import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { useId, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowLeft, KeyRound, Loader2, Mail, Plus, ShieldCheck } from 'lucide-react';
import 'altcha';
import type { AltchaWidgetElement } from 'altcha';
import { authQueryOptions } from '@/api/auth';
import { EdgeRuler } from '@/components/EdgeRuler';
import { BrandMark } from '@/components/AppBrand';
import { FrameNode } from '@/components/FrameNode';
import { altchaChallengeUrl } from '@/lib/altcha';
import { authClient } from '@/lib/auth-client';

type Step = 'email' | 'otp';

const LINE = 'color-mix(in oklab, var(--ink) 16%, transparent)';
const RULE = 'color-mix(in oklab, var(--ink) 12%, transparent)';

function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function GridPattern() {
  const fine = useId().replace(/:/g, '');
  const major = useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 size-full"
      style={{
        color: 'var(--lp-deco)',
        maskImage: 'radial-gradient(ellipse 90% 80% at center, #000 35%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at center, #000 35%, transparent 80%)',
      }}
    >
      <defs>
        <pattern id={fine} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </pattern>
        <pattern id={major} width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill={`url(#${fine})`} />
          <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${major})`} />
    </svg>
  );
}

function CrossDivider() {
  return (
    <div className="relative h-px w-full" style={{ backgroundColor: LINE }}>
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 grid size-3 -translate-x-1/2 -translate-y-1/2 place-items-center text-[12px] leading-none text-ink-faint"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        +
      </span>
    </div>
  );
}

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ context }) => {
    try {
      const user = await context.queryClient.ensureQueryData(authQueryOptions());
      if (user.isSuperAdmin) throw redirect({ to: '/' });
      throw redirect({ to: '/unauthorized' });
    } catch (error) {
      if (isRedirect(error)) throw error;
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const altchaRef = useRef<AltchaWidgetElement>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault();
    resetFeedback();
    setPending(true);

    let altchaPayload: string | undefined;
    try {
      const result = await altchaRef.current?.verify();
      altchaPayload = result?.payload;
    } catch {
      altchaPayload = undefined;
    }

    if (!altchaPayload) {
      setPending(false);
      altchaRef.current?.reset();
      setError('人机验证未通过，请重试');
      return;
    }

    const { error: authError } = await authClient.emailOtp.sendVerificationOtp(
      { email, type: 'sign-in' },
      { headers: { 'x-altcha-response': altchaPayload } },
    );

    altchaRef.current?.reset();
    setPending(false);
    if (authError) {
      setError(authError.message ?? '验证码发送失败，请稍后再试');
      return;
    }
    setStep('otp');
    setMessage('验证码已发送，请查收邮件');
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    resetFeedback();
    setPending(true);
    const { error: authError } = await authClient.signIn.emailOtp({ email, otp });
    setPending(false);
    if (authError) {
      setError(authError.message ?? '验证码错误或已过期');
      return;
    }
    await router.navigate({ to: '/' });
  };

  const handlePasskey = async () => {
    resetFeedback();
    setPending(true);
    const res = await authClient.signIn.passkey();
    setPending(false);
    if (res?.error) {
      setError(res.error.message ?? 'Passkey 登录失败或被取消');
      return;
    }
    await router.navigate({ to: '/' });
  };

  const handleGithub = async () => {
    resetFeedback();
    setPending(true);
    const { error: authError } = await authClient.signIn.social({
      provider: 'github',
      callbackURL: new URL('/', window.location.origin).toString(),
    });
    if (authError) {
      setPending(false);
      setError(authError.message ?? 'GitHub 登录失败，请稍后再试');
    }
  };

  return (
    <div className="lp-outer-node-offset relative flex min-h-dvh min-w-0 bg-canvas">
      <FrameNode pos="top-left" className="hidden lg:block" />
      <FrameNode pos="top-right" className="hidden lg:block" />

      <span className="relative hidden w-4 shrink-0 sm:w-6 md:block md:w-12">
        <EdgeRuler side="right" color={RULE} segs={[{ f: 2.6 }, { f: 3.3, dash: true }]} />
      </span>
      <span className="relative hidden flex-1 lg:block">
        <EdgeRuler
          side="right"
          color={RULE}
          segs={[{ f: 2.9 }, { f: 1.9, dash: true }, { f: 3.6 }]}
        />
      </span>

      <div className="login-container lp-container-max-w relative max-md:min-w-0 flex-1 [--node-horizontal-offset:-3.5px]">
        <FrameNode pos="top-left" />
        <FrameNode pos="top-right" />
        <GridPattern />

        <div className="login-stage relative z-10 flex min-h-dvh items-center justify-center p-4">
          <section
            className="login-panel relative isolate w-full max-w-5xl overflow-hidden border bg-surface p-0 lg:grid lg:grid-cols-[0.92fr_1.08fr]"
            style={
              {
                '--node-vertical-offset': '3.5px',
                '--node-horizontal-offset': '-3.5px',
              } as CSSProperties
            }
          >
            <FrameNode pos="top-left" className="login-panel-node" />
            <FrameNode pos="top-right" className="login-panel-node" />
            <FrameNode pos="bottom-left" className="login-panel-node" />
            <FrameNode pos="bottom-right" className="login-panel-node" />

            <div className="relative hidden min-h-[560px] overflow-hidden bg-sidebar-bg p-8 text-sidebar-ink lg:block">
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />
              <div className="relative z-[1] flex h-full flex-col">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-12 place-items-center rounded-md bg-white/10">
                    <BrandMark className="h-[18px] w-[27px]" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">滴茶 Admin</p>
                    <p className="text-[11px] text-sidebar-ink-soft">Super Admin Console</p>
                  </div>
                </div>

                <div className="mt-auto max-w-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-sidebar-ink-soft">
                    Protected Workspace
                  </p>
                  <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
                    管理系统入口
                  </h1>
                  <p className="mt-5 text-sm leading-7 text-sidebar-ink-soft">
                    这里复用主系统账号体系，但后台域名、登录回跳和 Passkey origin 都单独纳入服务端授权边界。
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="space-y-6">
              <div className="flex items-center gap-3 lg:hidden">
                <span
                  className="grid h-10 w-12 place-items-center rounded-md bg-sidebar-bg transition-transform hover:scale-105"
                  style={{ color: 'var(--sidebar-ink)' }}
                >
                  <BrandMark className="h-[18px] w-[27px]" />
                </span>
                <div>
                  <h1 className="font-serif text-[18px] font-semibold leading-tight text-ink">
                    滴茶 Admin
                  </h1>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                    super admin console
                  </span>
                </div>
              </div>

              <CrossDivider />

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
                  Sign in
                </p>
                <h2 className="mt-2 text-xl font-semibold text-ink">
                  {step === 'email' ? '使用邮箱验证码登录' : '输入验证码'}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                  进入后仍会经过服务端超级管理员 guard 校验。
                </p>
              </div>

            {step === 'email' ? (
              <form className="space-y-4" onSubmit={handleSendOtp}>
                <label className="block space-y-1.5">
                  <span className="text-[11px] tracking-wider text-ink-soft">管理员邮箱</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full rounded-md border border-hairline bg-canvas px-3 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-[var(--lp-brand)]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="lp-btn lp-btn-primary inline-flex w-full items-center justify-center gap-2.5 rounded-md px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  发送验证码
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={verifyOtp}>
                <label className="block space-y-1.5">
                  <span className="text-[11px] tracking-wider text-ink-soft">6 位验证码</span>
                  <input
                    inputMode="numeric"
                    required
                    minLength={6}
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="000000"
                    className="w-full rounded-md border border-hairline bg-canvas px-3 py-2.5 text-center text-lg font-semibold tracking-[0.32em] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-[var(--lp-brand)]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending || otp.length !== 6}
                  className="lp-btn lp-btn-primary inline-flex w-full items-center justify-center gap-2.5 rounded-md px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  登录
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setOtp('');
                    resetFeedback();
                  }}
                  className="lp-nav-link inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[12px]"
                >
                  <ArrowLeft className="size-3" strokeWidth={1.8} />
                  换一个邮箱
                </button>
              </form>
            )}

            <div className="relative flex items-center gap-3">
              <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
              <span className="flex items-center gap-1 text-[11px] tracking-wider text-ink-faint">
                <Plus size={10} className="rotate-45" />
                OR
              </span>
              <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
            </div>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={handlePasskey}
                disabled={pending}
                className="lp-btn lp-btn-ghost inline-flex items-center justify-center gap-2.5 rounded-md px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound className="size-4" strokeWidth={1.8} />
                使用 Passkey 登录
              </button>
              <button
                type="button"
                onClick={handleGithub}
                disabled={pending}
                className="lp-btn lp-btn-ghost inline-flex items-center justify-center gap-2.5 rounded-md px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GithubMark size={15} />
                使用 GitHub 登录
              </button>
            </div>

            {message ? (
              <p className="mt-4 rounded-md bg-chip-sage px-3 py-2 text-xs text-ink">{message}</p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-md bg-chip-pink px-3 py-2 text-xs text-ink">{error}</p>
            ) : null}
              </div>
            </div>

          <altcha-widget
            ref={altchaRef}
            challenge={altchaChallengeUrl()}
            auto="off"
            display="invisible"
            hidefooter
            hidelogo
            suppressHydrationWarning
          />
          </section>
        </div>
      </div>

      <span className="relative hidden flex-1 lg:block">
        <EdgeRuler
          side="left"
          color={RULE}
          segs={[{ f: 2.9 }, { f: 1.9, dash: true }, { f: 3.6 }]}
        />
      </span>
      <span className="relative hidden w-4 shrink-0 sm:w-6 md:block md:w-12">
        <EdgeRuler side="left" color={RULE} segs={[{ f: 2.6 }, { f: 3.3, dash: true }]} />
      </span>
    </div>
  );
}

function isRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isRedirect' in error &&
    (error as { isRedirect?: unknown }).isRedirect === true
  );
}
