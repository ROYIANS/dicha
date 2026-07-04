import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { useRef, useState, type FormEvent } from 'react';
import { KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import 'altcha';
import type { AltchaWidgetElement } from 'altcha';
import { authQueryOptions } from '@/api/auth';
import { BrandMark } from '@/components/AppBrand';
import { altchaChallengeUrl } from '@/lib/altcha';
import { authClient } from '@/lib/auth-client';

type Step = 'email' | 'otp';

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
      callbackURL: '/',
    });
    if (authError) {
      setPending(false);
      setError(authError.message ?? 'GitHub 登录失败，请稍后再试');
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-canvas p-5">
      <div className="admin-noise" aria-hidden />
      <div className="relative z-[1] grid w-full max-w-5xl overflow-hidden rounded-card border border-hairline bg-surface shadow-float lg:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-sidebar-bg p-6 text-sidebar-ink lg:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-white/10">
              <BrandMark className="h-5 w-[30px] text-sidebar-ink" />
            </span>
            <div>
              <p className="text-sm font-semibold">滴茶 Admin</p>
              <p className="text-xs text-sidebar-ink-soft">Super Admin Console</p>
            </div>
          </div>
          <div className="mt-16 max-w-sm">
            <p className="text-xs uppercase tracking-[0.16em] text-sidebar-ink-soft">
              Protected Workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">登录管理系统</h1>
            <p className="mt-4 text-sm leading-7 text-sidebar-ink-soft">
              管理端复用主系统账号与 Better Auth session，进入后仍会通过服务端超级管理员
              guard 再校验一次。
            </p>
          </div>
        </section>

        <section className="p-6 lg:p-8">
          <div className="mx-auto max-w-sm">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
              Sign in
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink">
              {step === 'email' ? '使用邮箱验证码登录' : '输入验证码'}
            </h2>

            {step === 'email' ? (
              <form className="mt-6 space-y-4" onSubmit={handleSendOtp}>
                <label className="block space-y-1.5">
                  <span className="text-xs text-ink-soft">管理员邮箱</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    className="w-full rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink-soft"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sidebar-bg px-3 py-2.5 text-sm font-medium text-sidebar-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  发送验证码
                </button>
              </form>
            ) : (
              <form className="mt-6 space-y-4" onSubmit={verifyOtp}>
                <label className="block space-y-1.5">
                  <span className="text-xs text-ink-soft">6 位验证码</span>
                  <input
                    inputMode="numeric"
                    required
                    minLength={6}
                    maxLength={6}
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                    placeholder="000000"
                    className="w-full rounded-md border border-hairline bg-canvas px-3 py-2.5 text-center text-lg font-semibold tracking-[0.32em] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink-soft"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending || otp.length !== 6}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-sidebar-bg px-3 py-2.5 text-sm font-medium text-sidebar-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="w-full rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-canvas"
                >
                  返回邮箱输入
                </button>
              </form>
            )}

            <div className="my-5 h-px bg-hairline" />

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handlePasskey}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink transition-colors hover:bg-canvas disabled:opacity-60"
              >
                <KeyRound className="size-4" strokeWidth={1.8} />
                Passkey
              </button>
              <button
                type="button"
                onClick={handleGithub}
                disabled={pending}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink transition-colors hover:bg-canvas disabled:opacity-60"
              >
                <KeyRound className="size-4" strokeWidth={1.8} />
                GitHub
              </button>
            </div>

            {message ? (
              <p className="mt-4 rounded-md bg-chip-sage px-3 py-2 text-xs text-ink">{message}</p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-md bg-chip-pink px-3 py-2 text-xs text-ink">{error}</p>
            ) : null}
          </div>

          <altcha-widget
            ref={altchaRef}
            challenge={altchaChallengeUrl()}
            display="invisible"
            hidefooter
            hidelogo
            suppressHydrationWarning
          />
        </section>
      </div>
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
