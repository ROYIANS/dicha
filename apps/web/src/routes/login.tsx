import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { KeyRound, Mail, ArrowLeft, Loader2, Plus } from 'lucide-react';
import { InputOTP } from '@heroui/react';
import 'altcha';
import type { AltchaWidgetElement } from 'altcha';
import { BrandMark } from '@/components/AppBrand';
import { authClient } from '@/lib/auth-client';
import { altchaChallengeUrl } from '@/lib/altcha';
import { suggestEmailCompletions } from '@/lib/email-suggestions';
import { FrameNode } from '@/components/FrameNode';
import { EdgeRuler } from '@/components/EdgeRuler';

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
// 结构线 —— 与落地页同定义（blueprint-aesthetic.md §4.2）
const LINE = 'color-mix(in oklab, var(--ink) 16%, transparent)';
const RULE = 'color-mix(in oklab, var(--ink) 12%, transparent)';

/** 双层工程纸网格（细 8px + 主 32px），radial 渐隐遮罩 —— 登录页辨识度底景。 */
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

/** mono 文字包裹（落地页 Mono 的本地等价）。 */
function Mono({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={className} style={{ fontFamily: MONO }}>
      {children}
    </span>
  );
}

/** 蓝图描边邮箱输入框：奇纸底 + hairline 边 + 常见邮箱域名补全。 */
function EmailField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  const id = useId();
  const listboxId = `${id}-suggestions`;
  const suggestions = useMemo(() => suggestEmailCompletions(value), [value]);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const open = focused && suggestions.length > 0;

  const pickSuggestion = (nextEmail: string) => {
    onChange(nextEmail);
    setActiveIndex(0);
  };

  const handleChange = (nextValue: string) => {
    onChange(nextValue);
    setActiveIndex(0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const suggestion = suggestions[activeIndex] ?? suggestions[0];
      if (suggestion) pickSuggestion(suggestion);
      return;
    }

    if (event.key === 'Escape') {
      setFocused(false);
    }
  };

  return (
    <div className="relative block space-y-1.5">
      <label htmlFor={id}>
        <Mono className="block text-[11px] tracking-wider text-ink-soft">{label}</Mono>
      </label>
      <input
        id={id}
        type="email"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className="w-full rounded-md border bg-canvas px-3 py-2.5 text-[14px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-[var(--lp-brand)]"
        style={{ borderColor: 'var(--hairline)', fontFamily: MONO }}
      />
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-hairline bg-surface shadow-float"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => {
                event.preventDefault();
                pickSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className="block w-full px-3 py-2.5 text-left text-[13px] text-ink transition-colors hover:bg-surface-alt aria-selected:bg-surface-alt"
              style={{ fontFamily: MONO }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** 分隔线（中心十字标记 —— 蓝图标注语汇）。 */
function CrossDivider() {
  return (
    <div className="relative h-px w-full" style={{ backgroundColor: LINE }}>
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 grid size-3 -translate-x-1/2 -translate-y-1/2 place-items-center text-[12px] leading-none text-ink-faint"
        style={{ backgroundColor: 'var(--surface)', fontFamily: MONO }}
      >
        +
      </span>
    </div>
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
  // ALTCHA widget：发码前在此解 proof-of-work，payload 经 header 透传给后端守卫。
  const altchaRef = useRef<AltchaWidgetElement>(null);

  const error = formError ?? (urlError ? decodeURIComponent(urlError) : null);

  const resetFeedback = () => {
    setNotice(null);
    setFormError(null);
  };

  // 第一步：发送邮箱登录验证码。
  // 发码前先解 ALTCHA proof-of-work（后台静默，几乎无感），把 payload 放进
  // x-altcha-response header 透传给后端守卫；解题失败则不发码并提示。
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setPending(true);

    let altchaPayload: string | undefined;
    try {
      const widget = altchaRef.current;
      const result = widget ? await widget.verify() : null;
      altchaPayload = result?.payload;
    } catch {
      altchaPayload = undefined;
    }
    if (!altchaPayload) {
      setPending(false);
      altchaRef.current?.reset();
      setFormError('人机验证未通过，请重试');
      return;
    }

    const { error: err } = await authClient.emailOtp.sendVerificationOtp(
      { email, type: 'sign-in' },
      { headers: { 'x-altcha-response': altchaPayload } },
    );
    // 一次性：无论成败都复位 widget，下次发码取新挑战（防回放被后端挡）。
    altchaRef.current?.reset();
    setPending(false);
    if (err) {
      setFormError(err.message ?? '验证码发送失败，请稍后再试');
      return;
    }
    setStep('otp');
    setNotice('验证码已发送，请查收邮件');
  };

  // 第二步：用验证码登录（未注册会自动注册）。
  // 支持表单提交与 InputOTP onComplete 自动提交（传入 6 位码）。
  const verifyOtp = async (code: string) => {
    if (pending) return;
    resetFeedback();
    setPending(true);
    const { error: err } = await authClient.signIn.emailOtp({ email, otp: code });
    setPending(false);
    if (err) {
      setFormError(err.message ?? '验证码错误或已过期');
      return;
    }
    await router.navigate({ to: '/home' });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtp(otp);
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
    await router.navigate({ to: '/home' });
  };

  const handleGithub = async () => {
    resetFeedback();
    setPending(true);
    const { error: err } = await authClient.signIn.social({ provider: 'github', callbackURL: '/home' });
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
    <div className="lp-outer-node-offset relative flex min-h-dvh min-w-0 bg-canvas">
      {/* 外侧节点对：骑框架顶线（lg+） */}
      <FrameNode pos="top-left" className="hidden lg:block" />
      <FrameNode pos="top-right" className="hidden lg:block" />

      {/* 五段框架：窄rail / 弹性rail / container / 弹性rail / 窄rail（对照 zed sign_up） */}
      <span className="relative w-4 shrink-0 sm:w-6 md:w-12">
        <EdgeRuler side="right" color={RULE} segs={[{ f: 2.6 }, { f: 3.3, dash: true }]} />
      </span>
      <span className="relative hidden flex-1 lg:block">
        <EdgeRuler
          side="right"
          color={RULE}
          segs={[{ f: 2.9 }, { f: 1.9, dash: true }, { f: 3.6 }]}
        />
      </span>

      <div className="lp-container-max-w relative max-md:min-w-0 flex-1 [--node-horizontal-offset:-3.5px]">
        {/* container 内侧节点对：压 container 边线 × 顶线，常显 */}
        <FrameNode pos="top-left" />
        <FrameNode pos="top-right" />

        {/* 工程纸网格底景 */}
        <GridPattern />

        {/* 居中区 */}
        <div className="relative z-10 flex min-h-dvh items-center justify-center p-4">
          <div
            className="relative isolate w-full max-w-sm border bg-surface p-8"
            style={
              {
                borderColor: 'var(--hairline)',
                borderRadius: '0.375rem',
                boxShadow:
                  '6px 6px 0 color-mix(in oklab, var(--ink) 6%, transparent)', // zed 邮戳阴影（dicha 暖墨低透明）
                '--node-vertical-offset': '3.5px',
                '--node-horizontal-offset': '-3.5px',
              } as CSSProperties
            }
          >
            {/* 卡片四角骑节点 */}
            <FrameNode pos="top-left" />
            <FrameNode pos="top-right" />
            <FrameNode pos="bottom-left" />
            <FrameNode pos="bottom-right" />

            <div className="space-y-6">
              {/* 品牌头 */}
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-12 place-items-center rounded-md bg-sidebar-bg transition-transform hover:scale-105"
                  style={{ color: 'var(--sidebar-ink)' }}
                >
                  <BrandMark className="h-[18px] w-[27px]" />
                </span>
                <div>
                  <h1 className="text-[18px] font-semibold leading-tight text-ink" style={{ fontFamily: SERIF }}>
                    滴茶
                  </h1>
                  <Mono className="text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                    dicha — sign in
                  </Mono>
                </div>
              </div>

              {/* 分隔线（中心十字标记） */}
              <CrossDivider />

              {error && (
                <div
                  className="rounded-md border border-l-2 p-3 transition-all duration-200"
                  style={{
                    borderColor: 'color-mix(in oklab, var(--accent-pink) 60%, var(--ink) 8%)',
                    borderLeftColor: 'var(--accent-pink)',
                    backgroundColor: 'var(--chip-pink)',
                  }}
                >
                  <Mono className="block text-[10px] uppercase tracking-[0.2em] text-ink-soft">ERR</Mono>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink">{error}</p>
                </div>
              )}

              {notice && (
                <div
                  className="rounded-md border border-l-2 p-3 transition-all duration-200"
                  style={{
                    borderColor: 'color-mix(in oklab, var(--accent-sage) 60%, var(--ink) 8%)',
                    borderLeftColor: 'var(--accent-sage)',
                    backgroundColor: 'var(--chip-sage)',
                  }}
                >
                  <Mono className="block text-[10px] uppercase tracking-[0.2em] text-ink-soft">OK</Mono>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink">{notice}</p>
                </div>
              )}

              {/* 邮箱 OTP — 第一步：输入邮箱发码 */}
              {step === 'email' && (
                <form className="space-y-4" onSubmit={handleSendOtp}>
                  <EmailField
                    label="邮箱"
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="lp-btn lp-btn-primary inline-flex w-full items-center justify-center gap-2.5 rounded-md px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Mail size={14} />
                    )}
                    <Mono className="text-[14px] font-medium">
                      {pending ? '发送中…' : '发送验证码'}
                    </Mono>
                  </button>
                </form>
              )}

              {/* ALTCHA proof-of-work：隐藏运行，发码时由 handleSendOtp 调 verify()
                  静默解题，payload 经 header 透传。auto=off → 仅命令式触发。
                  必须放在 <form> 外：widget 内部含 required checkbox，留在表单里会被
                  原生校验当成「不可聚焦的必填项」，提交时报错并拦截。display=invisible
                  让其零占位且不渲染可交互 UI。 */}
              {step === 'email' && (
                <altcha-widget
                  ref={altchaRef}
                  challenge={altchaChallengeUrl()}
                  auto="off"
                  display="invisible"
                  hidefooter
                  hidelogo
                />
              )}

              {/* 邮箱 OTP — 第二步：输入验证码登录 */}
              {step === 'otp' && (
                <form className="space-y-4" onSubmit={handleVerifyOtp}>
                  <div className="space-y-2">
                    <Mono className="block text-[11px] tracking-wider text-ink-soft">
                      验证码（已发送至 {email}）
                    </Mono>
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={setOtp}
                      onComplete={(code) => void verifyOtp(code)}
                      autoFocus
                    >
                      <InputOTP.Group>
                        <InputOTP.Slot index={0} />
                        <InputOTP.Slot index={1} />
                        <InputOTP.Slot index={2} />
                        <InputOTP.Slot index={3} />
                        <InputOTP.Slot index={4} />
                        <InputOTP.Slot index={5} />
                      </InputOTP.Group>
                    </InputOTP>
                  </div>
                  <button
                    type="submit"
                    disabled={pending}
                    className="lp-btn lp-btn-primary inline-flex w-full items-center justify-center gap-2.5 rounded-md px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <KeyRound size={14} />
                    )}
                    <Mono className="text-[14px] font-medium">
                      {pending ? '验证中…' : '验证并登录'}
                    </Mono>
                  </button>
                  <button
                    type="button"
                    onClick={backToEmail}
                    className="lp-nav-link inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[12px]"
                  >
                    <ArrowLeft size={12} />
                    <Mono>换一个邮箱</Mono>
                  </button>
                </form>
              )}

              {/* 分隔：或（蓝图式 mono 标记） */}
              <div className="relative flex items-center gap-3">
                <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
                <Mono className="flex items-center gap-1 text-[11px] tracking-wider text-ink-faint">
                  <Plus size={10} className="rotate-45" />
                  OR
                </Mono>
                <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
              </div>

              {/* passkey 登录 */}
              <button
                type="button"
                onClick={handlePasskey}
                disabled={pending}
                className="lp-btn lp-btn-ghost inline-flex w-full items-center justify-center gap-2.5 rounded-md px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound size={15} />
                <Mono className="text-[14px] font-medium">使用 passkey 登录</Mono>
              </button>

              {/* GitHub 登录 */}
              <button
                type="button"
                onClick={handleGithub}
                disabled={pending}
                className="lp-btn lp-btn-ghost inline-flex w-full items-center justify-center gap-2.5 rounded-md px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GithubMark size={15} />
                <Mono className="text-[14px] font-medium">使用 GitHub 登录</Mono>
              </button>

              {/* 页脚小字 —— zed 式下划线渐显链接 */}
              <p className="text-center text-[11px] leading-relaxed text-ink-faint" style={{ fontFamily: MONO }}>
                登录即表示您同意
                <br />
                <a
                  href="#"
                  className="underline decoration-[color-mix(in_oklab,var(--ink)_20%)] underline-offset-2 transition-[text-decoration-color] duration-150 hover:decoration-[color-mix(in_oklab,var(--ink)_80%)] hover:text-ink-soft"
                >
                  服务条款
                </a>
                {' · '}
                <a
                  href="#"
                  className="underline decoration-[color-mix(in_oklab,var(--ink)_20%)] underline-offset-2 transition-[text-decoration-color] duration-150 hover:decoration-[color-mix(in_oklab,var(--ink)_80%)] hover:text-ink-soft"
                >
                  隐私政策
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <span className="relative hidden flex-1 lg:block">
        <EdgeRuler
          side="left"
          color={RULE}
          segs={[{ f: 2.9 }, { f: 1.9, dash: true }, { f: 3.6 }]}
        />
      </span>
      <span className="relative w-4 shrink-0 sm:w-6 md:w-12">
        <EdgeRuler side="left" color={RULE} segs={[{ f: 2.6 }, { f: 3.3, dash: true }]} />
      </span>
    </div>
  );
}
