import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  ScanLine,
  Feather,
  Wind,
  MessageSquareText,
  Shirt,
  BookOpen,
  Package,
  Refrigerator,
  Pill,
  Plus as PlusIcon,
  Play,
  ArrowRight,
  Search,
  BellRing,
  PieChart,
  RefreshCw,
  Smile,
  Download,
  Lock,
  type LucideIcon,
} from 'lucide-react';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

/* ════════════════════════════════════════════════════════════════════════════
   vidorra landing — 工业 / 蓝图（深度参考 zed.dev 的结构语汇）· 暖棕配色
   斜线舱壁分隔 · 侧栏分段标尺 · 菱形节点 · 每节排版变体 · 高亮底纹金句 ·
   等宽体技术标签 · 框选式产品演示 · 暖棕页脚 + 巨型水印。
   颜色全部取自 dashboard 体系（侧栏暖棕 + 暖白 + 功能柔彩）。
   ════════════════════════════════════════════════════════════════════════════ */

const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SERIF = "'Noto Serif SC', serif";

const BROWN = '#2e2a26'; // = --sidebar-bg / --ink：实色块、按钮、页脚
const ACCENT = '#7a6248'; // 暖核桃棕：小标签 / 高亮字 / 图标
const ACCENT_DEEP = '#3a352f';
const LINE = 'color-mix(in oklab, var(--ink) 16%, transparent)';
const RULE = 'color-mix(in oklab, var(--ink) 12%, transparent)';

// ─── 数据 ──────────────────────────────────────────────────────────────────────

const FEATURES: { id: string; code: string; icon: LucideIcon; title: string; body: string }[] = [
  { id: 'capture', code: 'F.01', icon: ScanLine, title: '录入即装饰', body: '拍照、说话、扫码，AI 自动识别。记录这件事，从此没有打卡感。' },
  { id: 'poem', code: 'F.02', icon: Feather, title: '物品有诗', body: '每件东西都配一句话，只在你翻开它时静静出现。' },
  { id: 'dust', code: 'F.03', icon: Wind, title: '落灰', body: '久未触碰的物品会积灰。不催你清空，只承认时间过去了。' },
  { id: 'zimomo', code: 'F.04', icon: MessageSquareText, title: '齐默默', body: '一个不轻易开口的同伴，懂得沉默的分寸。' },
];

const SPECS: { k: string; v: string }[] = [
  { k: '房间', v: '6 间' },
  { k: '物品', v: '无上限' },
  { k: '提醒', v: '智能到期' },
  { k: '平台', v: 'Web · iOS · Android' },
  { k: '同步', v: '实时' },
];

const ROOMS: { id: string; no: string; icon: LucideIcon; label: string; caption: string; tint: string }[] = [
  { id: 'wardrobe', no: '01', icon: Shirt, label: '衣橱', caption: '每一件衣服，都是一种心情。', tint: 'lavender' },
  { id: 'library', no: '02', icon: BookOpen, label: '书房', caption: '书和时间，都会留下来。', tint: 'peach' },
  { id: 'storage', no: '03', icon: Package, label: '杂物间', caption: '装着「以后会用上」的宝藏。', tint: 'sage' },
  { id: 'fridge', no: '04', icon: Refrigerator, label: '冰箱', caption: '新鲜与过期，都值得被记得。', tint: 'mist' },
  { id: 'meds', no: '05', icon: Pill, label: '药盒', caption: '照顾好身体，才走得更远。', tint: 'pink' },
  { id: 'more', no: '06', icon: PlusIcon, label: '更多房间', caption: '未来，还会有更多。', tint: '' },
];

const PRINCIPLES: { t: string; d: string }[] = [
  { t: '不催促', d: '没有红色待办，没有「还差几件」。' },
  { t: '不评判', d: '凌乱也好，留白也好，都被允许。' },
  { t: '不丢弃', d: '落灰可以拂去，也可以让它停着。' },
  { t: '只是陪着', d: '齐默默在你需要时，才轻声出现。' },
];

const EXTRAS: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: Search, t: '全文搜索', d: '一秒找到任何一件东西。' },
  { icon: BellRing, t: '到期提醒', d: '药品、食物、借出，不再忘记。' },
  { icon: PieChart, t: '空间统计', d: '看清每个房间的占用。' },
  { icon: RefreshCw, t: '多端同步', d: '网页与手机，实时一致。' },
  { icon: Smile, t: '心情记录', d: '记物，也记此刻的心情。' },
  { icon: Download, t: '随时导出', d: '你的数据，始终属于你。' },
  { icon: Wind, t: '落灰提醒', d: '温柔提示久未打理的角落。' },
  { icon: Lock, t: '数据私有', d: '默认私密，安心收存。' },
];

// ─── 工业装饰原子 ──────────────────────────────────────────────────────────────

/** 菱形节点（Zed 式 rotate-45 方块），吸附容器角。 */
function Node({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-30 size-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45 border ${className}`}
      style={{ borderColor: LINE, backgroundColor: 'var(--canvas)' }}
    />
  );
}

/** 斜线舱壁分隔（Zed divider-slash）：上下细线 + 45° 斜纹底。 */
function Slash() {
  const id = useId().replace(/:/g, '');
  return (
    <div className="relative h-3.5 w-full" style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
      <svg aria-hidden className="absolute inset-0 size-full" style={{ opacity: 0.45, color: RULE }}>
        <defs>
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

/** 普通虚线横隔（节内细分用）。 */
function HRule() {
  return <div className="w-full border-t border-dashed" style={{ borderColor: LINE }} />;
}

/** 侧栏分段标尺：一条被切成不等段的竖线，部分实线部分虚段。 */
function Ruler({ segs }: { segs: { f: number; dash?: boolean }[] }) {
  return (
    <div aria-hidden className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col" style={{ width: 1, color: RULE }}>
      {segs.map((s, i) => (
        <div
          key={i}
          style={{
            flex: s.f,
            width: 1,
            backgroundColor: s.dash ? undefined : 'currentColor',
            backgroundImage: s.dash
              ? 'repeating-linear-gradient(to bottom, currentColor 0 4px, transparent 4px 8px)'
              : undefined,
          }}
        />
      ))}
    </div>
  );
}

/** 高亮短语（Zed 式 mark，柔彩底）。 */
function Mark({ children, tint = 'peach' }: { children: ReactNode; tint?: string }) {
  return (
    <span className="rounded-[3px] px-1 py-0.5" style={{ backgroundColor: `var(--chip-${tint})` }}>
      {children}
    </span>
  );
}

/** 细网格底纹（用于强调卡）。 */
function GridPattern() {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-0 size-full" style={{ color: ACCENT, opacity: 0.12, maskImage: 'linear-gradient(to bottom, #000, transparent)' }}>
      <defs>
        <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse" x="-1" y="-1">
          <path d="M.5 7V.5H7" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** 滚动入场。 */
function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'li';
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      id={id}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(20px)',
        transition: `opacity 0.8s var(--ease-soft) ${delay}ms, transform 0.8s var(--ease-soft) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

function Mono({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={className} style={{ fontFamily: MONO, ...style }}>
      {children}
    </span>
  );
}

function Key({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span
      className="ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded px-1 text-[11px] leading-none"
      style={{
        fontFamily: MONO,
        border: `1px solid ${onDark ? 'rgba(243,239,232,0.35)' : LINE}`,
        color: onDark ? 'rgba(243,239,232,0.85)' : 'var(--ink-soft)',
      }}
    >
      {children}
    </span>
  );
}

// ─── 顶栏 ──────────────────────────────────────────────────────────────────────

const NAV = [
  { href: '#features', label: '功能' },
  { href: '#demo', label: '体验' },
  { href: '#rooms', label: '房间' },
  { href: '#author', label: '齐默默' },
  { href: '#about', label: '关于' },
];

function Nav() {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        backgroundColor: 'color-mix(in oklab, var(--canvas) 82%, transparent)',
        backdropFilter: 'saturate(160%) blur(14px)',
        WebkitBackdropFilter: 'saturate(160%) blur(14px)',
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-6">
        <a href="#top" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-[5px] text-[12px] font-bold" style={{ backgroundColor: BROWN, color: '#f7f4ef' }}>v</span>
          <Mono className="text-[15px] font-semibold tracking-tight text-ink">vidorra</Mono>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href}>
              <Mono className="text-[13px] text-ink-soft transition-colors hover:text-ink">{n.label}</Mono>
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-md px-2 py-1 sm:flex" style={{ border: `1px solid ${LINE}` }}>
            <Search size={12} className="text-ink-faint" />
            <Mono className="text-[11px] text-ink-faint">⌘K</Mono>
          </span>
          <Link to="/home"><Mono className="text-[13px] text-ink-soft transition-colors hover:text-ink">登录</Mono></Link>
          <Link to="/home" className="inline-flex items-center rounded-md px-3 py-1.5" style={{ backgroundColor: BROWN, color: '#f7f4ef' }}>
            <Mono className="text-[13px] font-medium">开始入住</Mono>
            <Key onDark>D</Key>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Announce() {
  return (
    <div className="py-3 text-center" style={{ borderBottom: `1px solid ${LINE}` }}>
      <a href="#author" className="group inline-flex items-center gap-2">
        <Mono className="text-[12px]" style={{ color: ACCENT }}>新功能：</Mono>
        <Mono className="text-[12px] text-ink transition-colors group-hover:text-ink-soft">齐默默 —— 你的物品管家</Mono>
        <ArrowRight size={12} className="text-ink-soft transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}

// ─── 主框：左右标尺侧栏 + 中央内容（角部菱形节点）────────────────────────────────

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px]">
      {/* 左标尺 */}
      <div className="relative w-5 shrink-0 sm:w-8 md:w-12" style={{ borderRight: `1px dashed ${LINE}` }}>
        <Ruler segs={[{ f: 1.3 }, { f: 4.6 }, { f: 4.8, dash: true }, { f: 2.4 }, { f: 3.1 }]} />
      </div>

      {/* 中央内容 */}
      <div className="relative min-w-0 flex-1">
        <Node className="left-0 top-0" />
        <Node className="right-0 top-0" />
        <Node className="bottom-0 left-0" />
        <Node className="bottom-0 right-0" />
        {children}
      </div>

      {/* 右标尺 */}
      <div className="relative w-5 shrink-0 sm:w-8 md:w-12" style={{ borderLeft: `1px dashed ${LINE}` }}>
        <Ruler segs={[{ f: 2.4 }, { f: 2.9 }, { f: 2.1, dash: true }, { f: 3.8 }, { f: 4.2 }]} />
      </div>
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section id="top" className="relative px-6 pb-24 pt-20 text-center sm:pt-28">
      <BlueprintRings />
      <Reveal className="relative z-10">
        <h1 className="mx-auto max-w-[20ch] font-medium leading-[1.05]" style={{ fontFamily: SERIF, color: BROWN, fontSize: 'clamp(2.8rem, 8vw, 6.5rem)', letterSpacing: '-0.01em' }}>
          让万物，各归其位。
        </h1>
        <p className="mx-auto mt-6 max-w-[42ch] text-[16px] leading-relaxed text-ink-soft">
          vidorra 是一套为「物」而生的收纳系统 —— 把琐碎的记录，变成安心的布置。每一件东西，都在这里被看见、被记得。
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link to="/home" className="inline-flex items-center rounded-md px-4 py-2.5 transition-opacity hover:opacity-90" style={{ backgroundColor: BROWN, color: '#f7f4ef' }}>
            <Play size={14} className="mr-2" />
            <Mono className="text-[14px] font-medium">开始入住</Mono>
            <Key onDark>D</Key>
          </Link>
          <a href="#demo" className="inline-flex items-center rounded-md px-4 py-2.5 transition-colors hover:bg-surface-alt" style={{ border: `1px solid ${LINE}`, color: 'var(--ink)' }}>
            <Mono className="text-[14px]">查看演示</Mono>
            <Key>C</Key>
          </a>
        </div>
        <Mono className="mt-6 block text-[12px] text-ink-faint">支持 · 网页 · iOS · Android</Mono>
      </Reveal>
    </section>
  );
}

function BlueprintRings() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
      <svg width="1000" height="620" viewBox="0 0 1000 620" fill="none" style={{ opacity: 0.45 }}>
        <g stroke={LINE} strokeWidth="1">
          <circle cx="500" cy="310" r="130" />
          <circle cx="500" cy="310" r="230" strokeDasharray="3 5" />
          <circle cx="500" cy="310" r="330" />
          <line x1="0" y1="310" x2="1000" y2="310" strokeDasharray="3 6" />
          <line x1="500" y1="0" x2="500" y2="620" strokeDasharray="3 6" />
        </g>
      </svg>
    </div>
  );
}

// ─── 特性四列 ──────────────────────────────────────────────────────────────────

function FeatureStrip() {
  return (
    <section id="features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map((f, i) => {
        const Icon = f.icon;
        return (
          <Reveal as="article" id={f.id} key={f.id} delay={i * 70} className="relative px-7 py-9">
            {i !== 0 && <div className="pointer-events-none absolute inset-y-0 left-0 hidden border-l border-dashed sm:block" style={{ borderColor: LINE }} />}
            <div className="flex items-center gap-2">
              <Icon size={16} style={{ color: ACCENT }} />
              <Mono className="text-[11px] text-ink-faint">{f.code}</Mono>
            </div>
            <h3 className="mt-3 text-[17px] font-semibold text-ink">{f.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{f.body}</p>
          </Reveal>
        );
      })}
    </section>
  );
}

// ─── 产品演示（CSS 框选窗口）───────────────────────────────────────────────────

function Demo() {
  return (
    <section id="demo" className="px-6 py-16 sm:px-10">
      <Reveal className="relative mx-auto max-w-[980px]">
        <button type="button" className="absolute -top-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 shadow-float" style={{ backgroundColor: 'var(--surface)', border: `1px solid ${LINE}` }}>
          <span className="grid h-5 w-5 place-items-center rounded-full" style={{ backgroundColor: BROWN }}>
            <Play size={10} style={{ color: '#f7f4ef' }} />
          </span>
          <Mono className="text-[12px] text-ink">观看演示</Mono>
        </button>
        <AppWindow />
        <Mono className="mt-4 block text-center text-[12px] text-ink-faint">▦ 你的「小窝」总览 —— 记录、提醒、空间，一屏掌握。</Mono>
      </Reveal>
    </section>
  );
}

function AppWindow() {
  const chips = ['lavender', 'peach', 'sage', 'pink'];
  const rooms = ['lavender', 'peach', 'sage', 'mist', 'pink'];
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ border: `1px solid ${LINE}`, backgroundColor: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}>
      <div className="flex h-9 items-center gap-2 px-4" style={{ backgroundColor: 'var(--surface-alt)', borderBottom: `1px solid ${LINE}` }}>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--accent-pink)' }} />
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--accent-peach)' }} />
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--accent-sage)' }} />
        <Mono className="mx-auto text-[12px] text-ink-soft">vidorra — 我的小窝</Mono>
      </div>
      <div className="flex h-[360px] sm:h-[420px]">
        <div className="hidden w-[68px] shrink-0 flex-col items-center gap-4 py-5 sm:flex" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
          <span className="grid h-8 w-8 place-items-center rounded-lg text-[13px] font-bold" style={{ backgroundColor: ACCENT, color: '#f7f4ef' }}>v</span>
          {[0, 1, 2, 3].map((k) => (<span key={k} className="h-7 w-7 rounded-lg" style={{ backgroundColor: 'var(--sidebar-hover)' }} />))}
        </div>
        <div className="flex-1 overflow-hidden p-7">
          <div className="text-[16px] font-semibold text-ink">早安，Serena</div>
          <Mono className="mt-0.5 block text-[11px] text-ink-faint">有序的空间，安定的心。</Mono>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {chips.map((c, i) => (
              <div key={i} className="rounded-xl p-3" style={{ border: `1px solid var(--hairline)`, backgroundColor: 'var(--surface)' }}>
                <span className="mb-2 block h-6 w-6 rounded-full" style={{ backgroundColor: `var(--chip-${c})` }} />
                <span className="block h-2.5 w-8 rounded" style={{ backgroundColor: `var(--accent-${c})` }} />
                <span className="mt-1.5 block h-1.5 w-10 rounded" style={{ backgroundColor: 'var(--hairline)' }} />
              </div>
            ))}
          </div>
          <Mono className="mt-6 block text-[11px] text-ink-faint">我的收纳空间</Mono>
          <div className="mt-2.5 flex gap-3">
            {rooms.map((c, i) => (<div key={i} className="h-24 w-[96px] shrink-0 rounded-xl" style={{ backgroundColor: `var(--chip-${c})`, border: `1px solid var(--hairline)` }} />))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 规格读数 ──────────────────────────────────────────────────────────────────

function SpecPanel() {
  return (
    <section className="flex flex-wrap">
      {SPECS.map((s, i) => (
        <div key={s.k} className="relative min-w-[150px] flex-1 px-7 py-7">
          {i !== 0 && <div className="pointer-events-none absolute inset-y-0 left-0 border-l border-dashed" style={{ borderColor: LINE }} />}
          <Mono className="text-[11px] tracking-wider text-ink-faint">{s.k}</Mono>
          <Mono className="mt-2 block text-[18px] font-semibold text-ink">{s.v}</Mono>
        </div>
      ))}
    </section>
  );
}

// ─── 房间编目 ──────────────────────────────────────────────────────────────────

function Rooms() {
  return (
    <section id="rooms">
      <div className="flex items-end justify-between px-8 py-9">
        <div>
          <Mono className="text-[12px]" style={{ color: ACCENT }}>// 房间</Mono>
          <h2 className="mt-1.5 text-[clamp(1.6rem,3.6vw,2.6rem)] font-semibold text-ink">为不同的物，备不同的处。</h2>
        </div>
        <Mono className="hidden text-[12px] text-ink-faint sm:block">06 间</Mono>
      </div>
      <HRule />
      <div className="grid grid-cols-2 lg:grid-cols-3">
        {ROOMS.map((r, i) => (<RoomCell key={r.id} room={r} index={i} />))}
      </div>
    </section>
  );
}

function RoomCell({ room: r, index }: { room: (typeof ROOMS)[number]; index: number }) {
  const Icon = r.icon;
  const isMore = r.id === 'more';
  return (
    <Reveal as="article" delay={(index % 3) * 60} className="group relative px-8 py-9">
      <div className="pointer-events-none absolute inset-y-0 right-0 border-r border-dashed" style={{ borderColor: LINE }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 border-b border-dashed" style={{ borderColor: LINE }} />
      <div className="flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundColor: isMore ? 'transparent' : `var(--chip-${r.tint})`, border: isMore ? `1px dashed ${LINE}` : 'none' }}>
          <Icon size={20} style={{ color: isMore ? 'var(--ink-faint)' : `var(--accent-${r.tint})` }} />
        </span>
        <Mono className="text-[12px] text-ink-faint">{r.no}</Mono>
      </div>
      <h3 className="mt-4 text-[18px] font-semibold text-ink">{r.label}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{r.caption}</p>
      {!isMore && (
        <span className="mt-4 inline-flex items-center text-ink-soft transition-colors group-hover:text-ink">
          <Mono className="text-[12px]">进入</Mono>
          <ArrowRight size={13} className="ml-1 transition-transform group-hover:translate-x-0.5" />
        </span>
      )}
    </Reveal>
  );
}

// ─── 理念 + 原则（Zed 测评网格变体：大底纹金句 + 小原则格）───────────────────────

function Principles() {
  return (
    <section id="why" className="px-6 py-14 sm:px-10">
      <div className="grid grid-cols-1 gap-px lg:grid-cols-3 lg:grid-rows-2" style={{ backgroundColor: LINE }}>
        {/* 大金句卡（左列跨两行）*/}
        <Reveal className="relative isolate overflow-hidden p-8 sm:p-10 lg:col-span-2 lg:row-span-2" >
          <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'var(--surface)' }} />
          <GridPattern />
          <Mono className="text-[12px]" style={{ color: ACCENT }}>// 为什么</Mono>
          <p className="mt-5 leading-[1.55] text-ink" style={{ fontFamily: SERIF, fontSize: 'clamp(1.6rem,3.2vw,2.5rem)' }}>
            这不是一份清单，而是 <Mark tint="peach">生活的另一种模样</Mark>。每件物品不只是一行数字，
            而是一个 <Mark tint="lavender">有重量的存在</Mark> —— 你录入一件衬衫，它会变成衣橱里的一抹颜色；
            一本搁置三年的书，会慢慢落上时间的灰。
          </p>
          <p className="mt-6 max-w-[52ch] text-[14px] leading-loose text-ink-soft">
            它不催你「还有几本没读」，只是安静地承认：日子，确实过去了。vidorra 想做的，
            是让每一件东西都有归处，也让你在其中，慢慢住下来。
          </p>
          <Mono className="mt-8 block text-[12px] text-ink-faint">—— 齐默默，写于 vidorra 的第一个清晨</Mono>
        </Reveal>

        {/* 四个原则小格 */}
        {PRINCIPLES.map((p, i) => (
          <Reveal as="article" key={p.t} delay={i * 50} className="relative p-7" >
            <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'var(--surface)' }} />
            <Mono className="text-[11px] text-ink-faint">0{i + 1}</Mono>
            <h3 className="mt-2 text-[16px] font-semibold text-ink">{p.t}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{p.d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── 细节网格 ──────────────────────────────────────────────────────────────────

function Extras() {
  return (
    <section>
      <div className="px-8 py-9">
        <Mono className="text-[12px]" style={{ color: ACCENT }}>// 细节之处</Mono>
        <h2 className="mt-1.5 text-[clamp(1.6rem,3.6vw,2.6rem)] font-semibold text-ink">每一处，都为安心而造。</h2>
      </div>
      <HRule />
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {EXTRAS.map((e, i) => {
          const Icon = e.icon;
          return (
            <Reveal as="article" key={e.t} delay={(i % 4) * 50} className="relative px-7 py-8">
              <div className="pointer-events-none absolute inset-y-0 right-0 border-r border-dashed" style={{ borderColor: LINE }} />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 border-b border-dashed" style={{ borderColor: LINE }} />
              <Icon size={18} style={{ color: ACCENT }} />
              <h3 className="mt-3 text-[15px] font-semibold text-ink">{e.t}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{e.d}</p>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

// ─── 作者来信 ──────────────────────────────────────────────────────────────────

function AuthorLetter() {
  return (
    <section id="author" className="grid grid-cols-1 lg:grid-cols-12">
      <div className="relative px-8 py-12 lg:col-span-4">
        <Mono className="text-[12px]" style={{ color: ACCENT }}>// 来自作者</Mono>
        <div className="mt-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ backgroundColor: 'var(--chip-sage)' }}>
            <MessageSquareText size={22} style={{ color: 'var(--accent-sage)' }} />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-ink">齐默默</div>
            <Mono className="text-[11px] text-ink-faint">引导者 · 作者</Mono>
          </div>
        </div>
      </div>
      <Reveal className="relative px-8 py-12 lg:col-span-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden border-l border-dashed lg:block" style={{ borderColor: LINE }} />
        <p className="text-[clamp(1.15rem,2.2vw,1.5rem)] leading-loose text-ink" style={{ fontFamily: SERIF }}>
          我们总在 <Mark tint="mist">整理</Mark> 和 <Mark tint="pink">凌乱</Mark> 之间反复，却很少问自己：那些东西，对我究竟意味着什么。
          vidorra 想做的，不是又一个让你更自律的工具，而是一个安静的角落 —— 让每一件物品都有归处，也让你在其中，慢慢住下来。
        </p>
        <Mono className="mt-8 block text-[13px] text-ink-soft">—— 齐默默，写于 vidorra 的第一个清晨</Mono>
      </Reveal>
    </section>
  );
}

// ─── 收尾 CTA ──────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="relative px-8 py-24 text-center">
      <Reveal>
        <h2 className="font-medium leading-tight" style={{ fontFamily: SERIF, color: 'var(--ink)', fontSize: 'clamp(2.2rem,5.5vw,3.8rem)' }}>推门进去。</h2>
        <p className="mx-auto mt-4 max-w-[36ch] text-[15px] text-ink-soft">在生活里，留一处安静的地方，让自己住下来。</p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link to="/home" className="inline-flex items-center rounded-md px-5 py-3 transition-opacity hover:opacity-90" style={{ backgroundColor: BROWN, color: '#f7f4ef' }}>
            <Mono className="text-[15px] font-medium">开始入住</Mono>
            <Key onDark>D</Key>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

// ─── 页脚 ──────────────────────────────────────────────────────────────────────

function Footer() {
  const cols = [
    { h: '产品', items: ['功能', '房间', '齐默默', '更新日志'] },
    { h: '资源', items: ['使用指南', '常见问题', '开源', '反馈'] },
    { h: '公司', items: ['理念', '团队', '博客', '联系我们'] },
    { h: '社交', items: ['微博 ↗', '小红书 ↗', 'GitHub ↗', 'X ↗'] },
  ];
  return (
    <footer id="about" className="relative overflow-hidden" style={{ backgroundColor: BROWN }}>
      <div aria-hidden className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: 'linear-gradient(rgba(243,239,232,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(243,239,232,0.6) 1px, transparent 1px)', backgroundSize: '34px 34px' }} />
      <div className="relative mx-auto max-w-[1240px] px-6 pb-0 pt-16">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-[5px] text-[12px] font-bold" style={{ backgroundColor: '#f3efe8', color: BROWN }}>v</span>
              <Mono className="text-[15px] font-semibold" style={{ color: '#f3efe8' }}>vidorra</Mono>
            </div>
            <Mono className="mt-4 block text-[12px]" style={{ color: 'rgba(243,239,232,0.7)' }}>vidorra © 2026</Mono>
            <Mono className="mt-3 block text-[12px]" style={{ color: 'rgba(243,239,232,0.7)' }}>已有账号？登录</Mono>
            <Mono className="mt-3 block text-[11px]" style={{ color: 'rgba(243,239,232,0.5)' }}>服务条款 · 隐私政策</Mono>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <Mono className="text-[12px] font-semibold" style={{ color: '#f3efe8' }}>{c.h}</Mono>
              <ul className="mt-4 space-y-3">
                {c.items.map((it) => (
                  <li key={it}><a href="#about"><Mono className="text-[12px] transition-colors hover:text-[#f3efe8]" style={{ color: 'rgba(243,239,232,0.72)' }}>{it}</Mono></a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div aria-hidden className="pointer-events-none mt-10 select-none overflow-hidden" style={{ lineHeight: 0.8 }}>
          <span className="block font-bold tracking-tighter" style={{ fontFamily: MONO, fontSize: 'clamp(5rem, 24vw, 20rem)', color: ACCENT_DEEP, transform: 'translateY(28%)' }}>vidorra</span>
        </div>
      </div>
    </footer>
  );
}

// ─── 页面 ──────────────────────────────────────────────────────────────────────

function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--canvas)', color: 'var(--ink)' }}>
      <Nav />
      <Announce />
      <main>
        <Frame>
          <Hero />
          <Slash />
          <FeatureStrip />
          <Slash />
          <Demo />
          <Slash />
          <SpecPanel />
          <Slash />
          <Rooms />
          <Slash />
          <Principles />
          <Slash />
          <Extras />
          <Slash />
          <AuthorLetter />
          <Slash />
          <FinalCTA />
        </Frame>
        <Footer />
      </main>
    </div>
  );
}
