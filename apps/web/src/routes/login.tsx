import { createFileRoute } from '@tanstack/react-router';
import { env } from '@/lib/env';
import { useId, type CSSProperties } from 'react';
import { LogIn } from 'lucide-react';

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
      className="pointer-events-none absolute z-10 size-1.5 rotate-45 border"
      style={{
        borderColor: LINE,
        backgroundColor: 'var(--canvas)',
        [v]: 'calc(-1 * var(--node-vertical-offset))',
        [h]: 'var(--node-horizontal-offset)',
      }}
    />
  );
}

function GridPattern() {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 size-full"
      style={{
        color: 'var(--lp-deco)',
        opacity: 0.08,
        maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
      }}
    >
      <defs>
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse" x="-1" y="-1">
          <path d="M.5 8V.5H8" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Zed 式物理感按钮：底边 inset 阴影 + hover 摊平 + active 下压 */
function PhysicalButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full rounded-md border border-transparent px-4 py-3 text-white transition-all duration-150 active:translate-y-px active:scale-[.99]"
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

/** 装饰性侧沟刻度线（Zed ruler pattern） */
function Ruler({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 flex flex-col"
      style={{ width: 1, color: RULE, [side]: -0.5 }}
    >
      <div style={{ flex: 2.3, width: 1, backgroundColor: 'currentColor' }} />
      <div
        style={{
          flex: 1.9,
          width: 1,
          backgroundImage: 'repeating-linear-gradient(to bottom, currentColor 0 4px, transparent 4px 8px)',
        }}
      />
      <div style={{ flex: 3.1, width: 1, backgroundColor: 'currentColor' }} />
    </div>
  );
}

function LoginPage() {
  const searchParams = Route.useSearch();
  const error = (searchParams as { error?: string }).error;

  const handleLogin = () => {
    window.location.href = `${env.VITE_API_BASE_URL}/auth/login`;
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-clip bg-canvas p-4">
      <GridPattern />

      {/* 侧沟装饰（左右各一条刻度线） */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 md:block">
        <Ruler side="right" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-12 md:block">
        <Ruler side="left" />
      </div>

      <div
        className="relative isolate w-full max-w-md rounded-xl border p-8 shadow-lg"
        style={{
          borderColor: LINE,
          backgroundColor: 'var(--surface)',
          boxShadow: 'color-mix(in oklab, var(--ink) 5%, transparent) 0 -2px 0 0 inset, var(--shadow-lg)',
          '--node-vertical-offset': '2.5px',
          '--node-horizontal-offset': '-3.5px',
        } as CSSProperties}
      >
        <Node pos="top-left" />
        <Node pos="top-right" />
        <Node pos="bottom-left" />
        <Node pos="bottom-right" />

        <div className="space-y-6">
          {/* 品牌头 */}
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-lg text-[13px] font-bold transition-transform hover:scale-105"
              style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-ink)' }}
            >
              v
            </span>
            <div>
              <h1 className="text-[18px] font-semibold leading-tight text-ink" style={{ fontFamily: SERIF }}>
                物有所安
              </h1>
              <span className="text-[11px] tracking-wide text-ink-faint" style={{ fontFamily: MONO }}>
                vidorra · 登录
              </span>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="relative h-px w-full" style={{ backgroundColor: LINE }}>
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rotate-45 border"
              style={{ borderColor: LINE, backgroundColor: 'var(--surface)' }}
            />
          </div>

          {/* 错误提示（Zed 式柔和告警卡） */}
          {error && (
            <div
              className="rounded-lg border p-3 transition-all duration-200"
              style={{
                borderColor: 'var(--accent-pink)',
                backgroundColor: 'var(--chip-pink)',
                boxShadow: 'color-mix(in oklab, var(--accent-pink) 8%, transparent) 0 -1px 0 0 inset',
              }}
            >
              <span className="block text-[11px] tracking-wider text-ink-soft" style={{ fontFamily: MONO }}>
                ERROR
              </span>
              <p className="mt-1 text-[13px] leading-relaxed text-ink">
                {decodeURIComponent(error)}
              </p>
            </div>
          )}

          {/* 登录按钮 */}
          <PhysicalButton onClick={handleLogin}>
            <LogIn size={14} />
            <span>使用 Casdoor 登录</span>
          </PhysicalButton>

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
