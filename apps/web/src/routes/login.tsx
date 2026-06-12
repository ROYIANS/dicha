import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useId, useState, type CSSProperties } from 'react';
import { KeyRound, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

/** GitHub 标识（lucide v1 已移除品牌图标，内联官方 mark）。 */
function GithubMark({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden focusable="false">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SERIF = "'Noto Serif SC', serif";
const LINE = 'color-mix(in oklab, var(--ink) 16%, transparent)';
const RULE = 'color-mix(in oklab, var(--ink) 12%, transparent)';

type NodePos = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

function Node({ pos }: { pos: NodePos }) {
  const [v, h] = pos.split('-') as ['top' | 'bottom', 'left' | 'right'];
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-10 size-2 border"
      style={{
        borderColor: 'color-mix(in oklab, var(--ink) 38%, transparent)',
        backgroundColor: 'var(--surface)',
        [v]: 'calc(-1 * var(--node-vertical-offset))',
        [h]: 'var(--node-horizontal-offset)',
      }}
    />
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
        {/* 细格 8px：工程纸底纹 */}
        <pattern id={fine} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
        </pattern>
        {/* 主格 32px：蓝图主网格 */}
        <pattern id={major} width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill={`url(#${fine})`} />
          <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.18" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${major})`} />
    </svg>
  );
}

/** Zed 式物理感按钮：底边 inset 阴影 + hover 摊平 + active 下压 */
function PhysicalButton({
  onClick,
  type = 'button',
  disabled = false,
  children,
}: {
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full border border-transparent px-4 py-3 text-white transition-all duration-150 active:translate-y-px active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        backgroundColor: 'var(--lp-brand)',
        boxShadow:
          'color-mix(in oklab, var(--lp-brand) 70%, black) 0 -2px 0 0 inset, color-mix(in oklab, var(--lp-brand) 95%, white) 0 1px 3px 0',
      }}
    >
      <span className="flex items-center justify-center gap-2.5 text-[14px] font-medium" style={{ fontFamily: MONO }}>
        {children}
      </span>
    </button>
  );
}

/** Zed 式描边输入框（次按钮风格的中性边 + focus 提亮）。 */
function Field({
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="block text-[11px] tracking-wider text-ink-soft" style={{ fontFamily: MONO }}>
        {label}
      </span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="w-full border bg-canvas px-3 py-2.5 text-[14px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-[var(--lp-brand)]"
        style={{ borderColor: 'color-mix(in oklab, var(--ink) 20%, transparent)', fontFamily: MONO }}
      />
    </label>
  );
}

/** 工程刻度尺：主竖线 + 等距 tick 刻度（结构即装饰）。 */
function Ruler({ side }: { side: 'left' | 'right' }) {
  const inward = side === 'left' ? 'right' : 'left';
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0"
      style={{ width: 12, color: RULE, [side]: 0 }}
    >
      {/* 主竖线 */}
      <div className="absolute inset-y-0" style={{ width: 1, backgroundColor: 'currentColor', [side]: 0 }} />
      {/* 等距刻度：每 24px 一个 tick，每第 5 个加长 */}
      <div
        className="absolute inset-y-0"
        style={{
          width: 12,
          [side]: 0,
          backgroundImage:
            'repeating-linear-gradient(to bottom, currentColor 0 1px, transparent 1px 24px)',
          maskImage: `linear-gradient(to ${inward}, #000 0, #000 5px, transparent 6px)`,
          WebkitMaskImage: `linear-gradient(to ${inward}, #000 0, #000 5px, transparent 6px)`,
        }}
      />
    </div>
  );
}

/** 角落坐标标注（蓝图工程细节）。 */
function Corner({ pos, label }: { pos: NodePos; label: string }) {
  const [v, h] = pos.split('-') as ['top' | 'bottom', 'left' | 'right'];
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute z-10 text-[9px] tracking-[0.15em] tabular-nums"
      style={{ color: 'var(--ink-faint)', fontFamily: MONO, [v]: 8, [h]: 10 }}
    >
      {label}
    </span>
  );
}


type Step = 'email' | 'otp';

function LoginPage() {
  const router = useRouter();
  const searchParams = Route.useSearch();
  const urlError = (searchParams as { error?: string }).error;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const error = formError ?? (urlError ? decodeURIComponent(urlError) : null);

  const resetFeedback = () => {
    setNotice(null);
    setFormError(null);
  };

  // 第一步：发送邮箱登录验证码
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setPending(true);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    });
    setPending(false);
    if (err) {
      setFormError(err.message ?? '验证码发送失败，请稍后再试');
      return;
    }
    setStep('otp');
    setNotice('验证码已发送，请查收邮件');
  };

  // 第二步：用验证码登录（未注册会自动注册）
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setPending(true);
    const { error: err } = await authClient.signIn.emailOtp({ email, otp });
    setPending(false);
    if (err) {
      setFormError(err.message ?? '验证码错误或已过期');
      return;
    }
    await router.navigate({ to: '/' });
  };

  // passkey 登录（无需先输邮箱，浏览器弹凭证选择器）
  const handlePasskey = async () => {
    resetFeedback();
    setPending(true);
    const res = await authClient.signIn.passkey();
    if (res?.error) {
      setFormError(res.error.message ?? 'passkey 登录失败或被取消');
      setPending(false);
      return;
    }
    await router.navigate({ to: '/' });
  };

  const handleGithub = async () => {
    resetFeedback();
    setPending(true);
    const { error: err } = await authClient.signIn.social({ provider: 'github', callbackURL: '/' });
    if (err) {
      setFormError(err.message ?? 'GitHub 登录失败，请稍后再试');
      setPending(false);
    }
    // 成功时浏览器跳转 GitHub，无需复位 pending
  };

  const backToEmail = () => {
    setStep('email');
    setOtp('');
    resetFeedback();
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-clip bg-canvas p-4">
      <GridPattern />

      <div className="pointer-events-none absolute inset-y-0 left-0 hidden sm:block">
        <Ruler side="left" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden sm:block">
        <Ruler side="right" />
      </div>

      <div
        className="relative isolate w-full max-w-md border bg-surface/95 p-8 backdrop-blur-[1px]"
        style={{
          borderColor: 'color-mix(in oklab, var(--ink) 22%, transparent)',
          boxShadow: 'color-mix(in oklab, var(--ink) 6%, transparent) 0 -2px 0 0 inset, var(--shadow-lg)',
          '--node-vertical-offset': '4.5px',
          '--node-horizontal-offset': '-4.5px',
        } as CSSProperties}
      >
        <Node pos="top-left" />
        <Node pos="top-right" />
        <Node pos="bottom-left" />
        <Node pos="bottom-right" />
        <Corner pos="top-left" label="A1" />
        <Corner pos="bottom-right" label={step === 'otp' ? 'AUTH·OTP' : 'AUTH·01'} />

        <div className="space-y-6">
          {/* 品牌头 */}
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center border text-[15px] font-bold transition-transform hover:scale-105"
              style={{
                backgroundColor: 'var(--sidebar-bg)',
                color: 'var(--sidebar-ink)',
                borderColor: 'color-mix(in oklab, var(--ink) 30%, transparent)',
                fontFamily: SERIF,
              }}
            >
              物
            </span>
            <div>
              <h1 className="text-[18px] font-semibold leading-tight text-ink" style={{ fontFamily: SERIF }}>
                物有所安
              </h1>
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-faint" style={{ fontFamily: MONO }}>
                vidorra — sign in
              </span>
            </div>
          </div>

          {/* 分隔线（带中心十字标记） */}
          <div className="relative h-px w-full" style={{ backgroundColor: LINE }}>
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 grid size-3 -translate-x-1/2 -translate-y-1/2 place-items-center text-[12px] leading-none text-ink-faint"
              style={{ backgroundColor: 'var(--surface)', fontFamily: MONO }}
            >
              +
            </span>
          </div>

          {error && (
            <div
              className="border border-l-2 p-3 transition-all duration-200"
              style={{
                borderColor: 'color-mix(in oklab, var(--accent-pink) 60%, var(--ink) 8%)',
                borderLeftColor: 'var(--accent-pink)',
                backgroundColor: 'var(--chip-pink)',
              }}
            >
              <span className="block text-[10px] uppercase tracking-[0.2em] text-ink-soft" style={{ fontFamily: MONO }}>
                ERR
              </span>
              <p className="mt-1 text-[13px] leading-relaxed text-ink">{error}</p>
            </div>
          )}

          {notice && (
            <div
              className="border border-l-2 p-3 transition-all duration-200"
              style={{
                borderColor: 'color-mix(in oklab, var(--accent-sage) 60%, var(--ink) 8%)',
                borderLeftColor: 'var(--accent-sage)',
                backgroundColor: 'var(--chip-sage)',
              }}
            >
              <span className="block text-[10px] uppercase tracking-[0.2em] text-ink-soft" style={{ fontFamily: MONO }}>
                OK
              </span>
              <p className="mt-1 text-[13px] leading-relaxed text-ink">{notice}</p>
            </div>
          )}

          {/* 邮箱 OTP — 第一步：输入邮箱发码 */}
          {step === 'email' && (
            <form className="space-y-4" onSubmit={handleSendOtp}>
              <Field
                label="邮箱"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                placeholder="you@example.com"
              />
              <PhysicalButton type="submit" disabled={pending}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                <span>发送验证码</span>
              </PhysicalButton>
            </form>
          )}

          {/* 邮箱 OTP — 第二步：输入验证码登录 */}
          {step === 'otp' && (
            <form className="space-y-4" onSubmit={handleVerifyOtp}>
              <Field
                label={`验证码（已发送至 ${email}）`}
                value={otp}
                onChange={setOtp}
                autoComplete="one-time-code"
                placeholder="6 位数字"
              />
              <PhysicalButton type="submit" disabled={pending}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                <span>验证并登录</span>
              </PhysicalButton>
              <button
                type="button"
                onClick={backToEmail}
                className="flex items-center justify-center gap-1.5 text-[12px] text-ink-soft hover:text-ink"
                style={{ fontFamily: MONO }}
              >
                <ArrowLeft size={12} />
                换一个邮箱
              </button>
            </form>
          )}

          {/* 分隔：或 */}
          <div className="relative flex items-center gap-3">
            <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
            <span className="text-[11px] tracking-wider text-ink-faint" style={{ fontFamily: MONO }}>
              OR
            </span>
            <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
          </div>

          {/* passkey 登录 */}
          <button
            type="button"
            onClick={handlePasskey}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2.5 border px-4 py-3 text-[14px] font-medium text-ink transition-colors duration-150 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: 'color-mix(in oklab, var(--ink) 20%, transparent)', fontFamily: MONO }}
          >
            <KeyRound size={15} />
            <span>使用 passkey 登录</span>
          </button>

          {/* GitHub 登录 */}
          <button
            type="button"
            onClick={handleGithub}
            disabled={pending}
            className="flex w-full items-center justify-center gap-2.5 border px-4 py-3 text-[14px] font-medium text-ink transition-colors duration-150 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
            style={{ borderColor: 'color-mix(in oklab, var(--ink) 20%, transparent)', fontFamily: MONO }}
          >
            <GithubMark size={15} />
            <span>使用 GitHub 登录</span>
          </button>

          {/* 页脚小字 */}
          <p className="text-center text-[11px] leading-relaxed text-ink-faint" style={{ fontFamily: MONO }}>
            登录即表示您同意
            <br />
            服务条款 · 隐私政策
          </p>
        </div>
      </div>
    </div>
  );
}
