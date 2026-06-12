import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useId, useState, type CSSProperties } from 'react';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
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

type Mode = 'login' | 'register';

function LoginPage() {
  const router = useRouter();
  const searchParams = Route.useSearch();
  const urlError = (searchParams as { error?: string }).error;

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const error = formError ?? (urlError ? decodeURIComponent(urlError) : null);

  const resetFeedback = () => {
    setNotice(null);
    setFormError(null);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    resetFeedback();
  };

  const handleGithub = async () => {
    resetFeedback();
    setPending(true);
    const { error: err } = await authClient.signIn.social({ provider: 'github', callbackURL: '/' });
    if (err) {
      setFormError(err.message ?? 'GitHub 登录失败，请稍后再试');
      setPending(false);
    }
    // 成功时浏览器会跳转到 GitHub，无需复位 pending
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setPending(true);

    if (mode === 'register') {
      const { error: err } = await authClient.signUp.email({
        email,
        password,
        name: displayName,
        displayName,
        callbackURL: '/',
      });
      setPending(false);
      if (err) {
        setFormError(err.message ?? '注册失败，请稍后再试');
        return;
      }
      setNotice('验证邮件已发送，请查收后登录');
      setMode('login');
      setPassword('');
      return;
    }

    const { error: err } = await authClient.signIn.email({ email, password, callbackURL: '/' });
    setPending(false);
    if (err) {
      if (err.status === 403) {
        setFormError('邮箱尚未验证，请先查收验证邮件');
      } else {
        setFormError(err.message ?? '登录失败，请检查邮箱与密码');
      }
      return;
    }
    await router.navigate({ to: '/' });
  };

  const isLogin = mode === 'login';

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-clip bg-canvas p-4">
      <GridPattern />

      {/* 工程刻度尺（左右贴边） */}
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
        <Corner pos="bottom-right" label={isLogin ? 'AUTH·01' : 'AUTH·02'} />

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
                vidorra — {isLogin ? 'sign in' : 'sign up'}
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

          {/* 错误提示（工程告警卡：方角 + 左侧标记条） */}
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

          {/* 成功提示（验证邮件已发送等） */}
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

          {/* 邮箱 + 密码表单 */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <Field
                label="昵称"
                value={displayName}
                onChange={setDisplayName}
                autoComplete="nickname"
                placeholder="你想被怎么称呼"
              />
            )}
            <Field
              label="邮箱"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              placeholder="you@example.com"
            />
            <Field
              label="密码"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="••••••••"
            />

            <PhysicalButton type="submit" disabled={pending}>
              {pending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isLogin ? (
                <LogIn size={14} />
              ) : (
                <UserPlus size={14} />
              )}
              <span>{isLogin ? '登录' : '注册'}</span>
            </PhysicalButton>
          </form>

          {/* 分隔：或 */}
          <div className="relative flex items-center gap-3">
            <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
            <span className="text-[11px] tracking-wider text-ink-faint" style={{ fontFamily: MONO }}>
              OR
            </span>
            <span className="h-px flex-1" style={{ backgroundColor: LINE }} />
          </div>

          {/* GitHub 登录（次级描边按钮） */}
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

          {/* 模式切换 */}
          <p className="text-center text-[12px] text-ink-soft" style={{ fontFamily: MONO }}>
            {isLogin ? '还没有账号？' : '已有账号？'}{' '}
            <button
              type="button"
              onClick={() => switchMode(isLogin ? 'register' : 'login')}
              className="text-ink underline-offset-2 hover:underline"
            >
              {isLogin ? '注册' : '去登录'}
            </button>
          </p>

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
