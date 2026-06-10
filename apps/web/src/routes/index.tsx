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
  ChevronRight,
  Search,
  type LucideIcon,
} from 'lucide-react';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

/* ════════════════════════════════════════════════════════════════════════════
   vidorra landing — 工业 / 蓝图（深度参考 zed.dev 源码的结构语汇）· 暖棕配色
   语汇清单（均来自 zed.html 实测）：
   · 斜线舱壁分隔（divider-slash，细线全幅贯穿视口）
   · 侧沟分段标尺 + 条码刻线纹（不等宽水平 rect pattern）
   · 菱形节点吸附线条交点
   · 横向渐变光带公告（from-transparent via-tint to-transparent）
   · 物理感按钮（inset 底边阴影，hover 摊平，active 下压）
   · 纵向交互 Tab（选中行展开 + 圆点纹理底）
   · 跑马灯物件流（border-y 包夹 marquee）
   · Hero 慢旋几何水印 + 细网格渐隐
   每个 section 排版刻意不同：居中宣言 / 跑马灯 / 左列表右画布 / 读数条 /
   编目网格 / 大金句拼格 / 清单台账 / 非对称信笺 / 留白收尾。
   ════════════════════════════════════════════════════════════════════════════ */

const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SERIF = "'Noto Serif SC', serif";

const BROWN = '#2e2a26'; // = --sidebar-bg / --ink：实色块、按钮、页脚
const ACCENT = '#7a6248'; // 暖核桃棕：小标签 / 高亮字 / 图标
const ACCENT_DEEP = '#3a352f';
const LINE = 'color-mix(in oklab, var(--ink) 16%, transparent)';
const RULE = 'color-mix(in oklab, var(--ink) 12%, transparent)';
const CREAM = '#f3efe8';

// ─── 数据 ──────────────────────────────────────────────────────────────────────

const FEATURES: { id: string; code: string; icon: LucideIcon; title: string; body: string }[] = [
  { id: 'capture', code: 'F.01', icon: ScanLine, title: '录入即装饰', body: '拍照、说话、扫码，自动识别。把一件东西放进 vidorra，更像往房间里摆一件摆设，而不是填一张表。' },
  { id: 'poem', code: 'F.02', icon: Feather, title: '物品有诗', body: '每件东西都配有一句话，平时收着，只在你翻开它的时候静静出现。' },
  { id: 'dust', code: 'F.03', icon: Wind, title: '落灰', body: '久未触碰的物品会慢慢积灰。不催你清空，也不算 KPI，只是承认时间确实过去了。' },
  { id: 'zimomo', code: 'F.04', icon: MessageSquareText, title: '齐默默', body: '一个不轻易开口的同伴。它记得所有东西的位置，但只在你需要时才轻声出现。' },
];

const MARQUEE_ITEMS = [
  '白瓷盖碗', '牛皮笔记本', '胶片相机', '外婆的顶针', '亚麻衬衫', '维生素 D',
  '《百年孤独》', '手冲咖啡壶', '旧毛衣', '登山绳', '薄荷茶', '备用钥匙',
  '尤加利干花', '奶酪刨', '未拆封的画框', '冬被',
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

const EXTRAS: { t: string; d: string }[] = [
  { t: '全文搜索', d: '一秒找到任何一件东西' },
  { t: '到期提醒', d: '药品、食物、借出，不再忘记' },
  { t: '空间统计', d: '看清每个房间的占用' },
  { t: '多端同步', d: '网页与手机，实时一致' },
  { t: '心情记录', d: '记物，也记此刻的心情' },
  { t: '随时导出', d: '你的数据，始终属于你' },
  { t: '落灰提醒', d: '温柔提示久未打理的角落' },
  { t: '数据私有', d: '默认私密，安心收存' },
];

// ─── 工业装饰原子 ──────────────────────────────────────────────────────────────

/** 菱形节点（Zed 式 rotate-45 方块），吸附线条交点。 */
function Node({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-30 size-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45 border ${className}`}
      style={{ borderColor: LINE, backgroundColor: 'var(--canvas)' }}
    />
  );
}

/** 斜线舱壁分隔（Zed divider-slash）：上下细线全幅贯穿视口 + 容器内 45° 斜纹。 */
function Slash() {
  const id = useId().replace(/:/g, '');
  return (
    <div className="relative h-3.5 w-full">
      <div aria-hidden className="absolute left-1/2 top-0 h-px w-[200vw] -translate-x-1/2" style={{ backgroundColor: LINE }} />
      <div aria-hidden className="absolute bottom-0 left-1/2 h-px w-[200vw] -translate-x-1/2" style={{ backgroundColor: LINE }} />
      <svg aria-hidden className="absolute inset-0 size-full" style={{ opacity: 0.45, color: RULE }}>
        <defs>
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <Node className="left-0 top-0" />
      <Node className="right-0 top-0" />
    </div>
  );
}

/** 普通虚线横隔（节内细分用）。 */
function HRule() {
  return <div className="w-full border-t border-dashed" style={{ borderColor: LINE }} />;
}

/** 侧沟分段标尺：一条被切成不等段的竖线，部分实段部分虚段。 */
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

/** 条码刻线纹（Zed 侧沟里不等宽水平 rect 的 pattern）：贴在侧沟边缘。 */
function Barcode({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  // 伪随机但确定：避免每次渲染抖动
  const rows = Array.from({ length: 22 }, (_, i) => ({
    y: i * 9,
    w: 9 + ((i * 7919 + 13) % 15),
  }));
  return (
    <svg aria-hidden className={`pointer-events-none absolute ${className}`} width="32" height="198" style={{ color: RULE }}>
      {rows.map((r, i) => (
        <rect key={i} x={flip ? 0 : 32 - r.w} y={r.y} width={r.w} height="1" fill="currentColor" />
      ))}
    </svg>
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

/** 细网格底纹（Zed 10×10 grid texture），可控渐隐方向。 */
function GridPattern({ mask = 'to bottom' }: { mask?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 size-full"
      style={{ color: ACCENT, opacity: 0.12, maskImage: `linear-gradient(${mask}, #000, transparent)` }}
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

/** 圆点纹理（Zed 选中态 tab 的底纹）。 */
function DotPattern() {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-0 size-full" style={{ color: ACCENT, opacity: 0.22 }}>
      <defs>
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="0.75" fill="currentColor" />
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
          <Link to="/home" className="lp-btn lp-btn-primary inline-flex items-center rounded-md px-3 py-1.5">
            <Mono className="text-[13px] font-medium">开始入住</Mono>
            <Key onDark>D</Key>
          </Link>
        </div>
      </div>
    </header>
  );
}

/** 公告光带（Zed Introducing 行）：横向渐变高亮 + serif 前缀，整行可点。 */
function Announce() {
  return (
    <a
      href="#author"
      className="group relative block py-2.5 text-center"
      style={{
        background: 'linear-gradient(to right, transparent, color-mix(in oklab, var(--chip-peach) 75%, transparent), transparent)',
        borderBottom: `1px solid ${LINE}`,
      }}
    >
      <span className="text-[13px] tracking-wide" style={{ fontFamily: SERIF, color: ACCENT }}>新功能：</span>
      <span className="text-[13px] font-medium tracking-wide text-ink" style={{ fontFamily: SERIF }}>齐默默 —— 不催促的物品管家</span>
      <span className="ml-2 inline-block text-[13px] text-ink-soft transition-transform group-hover:translate-x-0.5">→</span>
    </a>
  );
}

// ─── 主框：左右标尺侧沟 + 中央内容（角部菱形节点）────────────────────────────────

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1240px]">
      {/* 左侧沟 */}
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

      {/* 右侧沟 */}
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
      <HeroArt />
      <Barcode className="-right-[33px] top-24 hidden md:block" flip />
      <Reveal className="relative z-10">
        <h1 className="mx-auto max-w-[20ch] font-medium leading-[1.05]" style={{ fontFamily: SERIF, color: BROWN, fontSize: 'clamp(2.8rem, 8vw, 6.5rem)', letterSpacing: '-0.01em' }}>
          让万物，各归其位。
        </h1>
        <p className="mx-auto mt-6 max-w-[42ch] text-[16px] leading-relaxed text-ink-soft" style={{ textWrap: 'balance' }}>
          vidorra 是一套为「物」而生的收纳系统 —— 把琐碎的记录，变成安心的布置。每一件东西，都在这里被看见、被记得。
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link to="/home" className="lp-btn lp-btn-primary inline-flex items-center rounded-md px-4 py-2.5">
            <Play size={14} className="mr-2" />
            <Mono className="text-[14px] font-medium">开始入住</Mono>
            <Key onDark>D</Key>
          </Link>
          <a href="#demo" className="lp-btn lp-btn-ghost inline-flex items-center rounded-md px-4 py-2.5">
            <Mono className="text-[14px]">查看演示</Mono>
            <Key>C</Key>
          </a>
        </div>
        <Mono className="mt-6 block text-[12px] text-ink-faint">支持 · 网页 · iOS · Android</Mono>
      </Reveal>
    </section>
  );
}

/** Hero 底景：细网格自底渐隐 + 慢旋嵌套方块水印（Zed hero 的对应物，无图片）。 */
function HeroArt() {
  const squares = Array.from({ length: 9 });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <GridPattern mask="to top" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg viewBox="0 0 480 480" className="lp-spin block w-[680px]" style={{ opacity: 0.035, color: BROWN }}>
          {squares.map((_, i) => {
            const s = 460 * 0.9 ** i;
            return (
              <rect
                key={i}
                x={240 - s / 2}
                y={240 - s / 2}
                width={s}
                height={s}
                fill="none"
                stroke="currentColor"
                transform={`rotate(${i * 7} 240 240)`}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── 物件流跑马灯（Zed contributor marquee 的对应物）──────────────────────────────

function Marquee() {
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {MARQUEE_ITEMS.map((it, i) => (
        <span key={i} className="flex items-center">
          <Mono className="text-[11px] text-ink-faint">№{String(i + 1).padStart(3, '0')}</Mono>
          <span className="ml-2 mr-6 text-[13px] text-ink-soft" style={{ fontFamily: SERIF }}>{it}</span>
          <span className="mr-6 size-1 rotate-45 border" style={{ borderColor: LINE }} />
        </span>
      ))}
    </div>
  );
  return (
    <section className="py-7">
      <Mono className="mb-3 block px-6 text-center text-[11px] tracking-[0.2em] text-ink-faint sm:px-10">此刻，正被收进 vidorra 的物件</Mono>
      <div
        className="overflow-hidden border-y py-2.5"
        style={{ borderColor: LINE, maskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)' }}
      >
        <div className="lp-marquee flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}

// ─── 功能：纵向交互 Tab（Zed AI section 的结构）──────────────────────────────────

function FeatureTabs() {
  const [active, setActive] = useState(0);
  const current = FEATURES[active] ?? FEATURES[0]!;
  return (
    <section id="features">
      {/* 头排：左标题 + 右幽灵按钮（Zed "AI that works..." 的头排布局） */}
      <div className="flex flex-col gap-5 px-6 py-10 sm:px-10 lg:flex-row lg:items-end lg:justify-between" style={{ borderBottom: `1px solid ${LINE}` }}>
        <hgroup className="max-w-2xl">
          <Mono className="text-[12px]" style={{ color: ACCENT }}>// 功能</Mono>
          <h2 className="mt-1.5 text-[clamp(1.6rem,3.6vw,2.4rem)] font-semibold leading-snug text-ink" style={{ textWrap: 'balance' }}>记录不像打卡，更像布置房间。</h2>
        </hgroup>
        <a href="#demo" className="lp-btn lp-btn-ghost inline-flex h-9 w-fit items-center gap-1 rounded-md pl-3 pr-2">
          <Mono className="text-[13px]">看完整演示</Mono>
          <ChevronRight size={15} className="text-ink-soft" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* 左列：tab 列表，选中行展开并铺圆点纹理 */}
        <div role="tablist" aria-orientation="vertical" className="flex flex-col lg:col-span-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const selected = i === active;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(i)}
                className="relative isolate px-6 text-left transition-colors sm:px-10"
                style={{
                  borderBottom: i !== FEATURES.length - 1 ? `1px dashed ${LINE}` : 'none',
                  backgroundColor: selected ? 'transparent' : undefined,
                }}
              >
                {selected ? (
                  <div className="relative py-7" style={{ animation: 'lp-fade 0.35s var(--ease-soft)' }}>
                    <DotPattern />
                    <div className="relative">
                      <Mono className="text-[11px] text-ink-faint">{f.code}</Mono>
                      <h3 className="mt-1.5 text-[20px] font-semibold text-ink" style={{ fontFamily: SERIF }}>{f.title}</h3>
                      <p className="mt-2 max-w-[40ch] text-[13.5px] leading-relaxed text-ink-soft">{f.body}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-4 text-ink-soft transition-colors hover:text-ink">
                    <span className="flex items-center gap-2.5">
                      <Icon size={15} style={{ color: ACCENT }} />
                      <span className="text-[14px]">{f.title}</span>
                    </span>
                    <PlusIcon size={14} className="opacity-50" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 右画布：当前功能的 CSS 小景 */}
        <div className="relative flex min-h-[340px] items-center justify-center p-6 sm:p-10 lg:col-span-7" style={{ borderLeft: `1px dashed ${LINE}` }}>
          <div key={current.id} className="w-full max-w-[420px]" style={{ animation: 'lp-fade 0.4s var(--ease-soft)' }}>
            <FeatureVignette id={current.id} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** 功能小景：纯 CSS 绘制的微型场景，无图片。 */
function FeatureVignette({ id }: { id: string }) {
  if (id === 'capture') {
    return (
      <VignetteCard label="capture — 03:42 PM">
        {/* 取景框：四角括号 + 识别结果卡 */}
        <div className="relative mx-auto h-[180px] w-full rounded-lg" style={{ border: `1px dashed ${LINE}` }}>
          {(['left-2 top-2 border-l-2 border-t-2', 'right-2 top-2 border-r-2 border-t-2', 'left-2 bottom-2 border-l-2 border-b-2', 'right-2 bottom-2 border-r-2 border-b-2'] as const).map((pos) => (
            <span key={pos} aria-hidden className={`absolute size-4 ${pos}`} style={{ borderColor: ACCENT }} />
          ))}
          <div className="absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-lg p-4" style={{ backgroundColor: 'var(--surface)', border: `1px solid var(--hairline)`, boxShadow: 'var(--shadow-md)' }}>
            <Mono className="text-[10px]" style={{ color: ACCENT }}>已识别</Mono>
            <div className="mt-1 text-[15px] font-semibold text-ink">白瓷盖碗</div>
            <div className="mt-2 flex gap-1.5">
              {['茶具', '厨房', '易碎'].map((t) => (
                <span key={t} className="rounded px-1.5 py-0.5 text-[10px] text-ink-soft" style={{ backgroundColor: 'var(--chip-mist)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </VignetteCard>
    );
  }
  if (id === 'poem') {
    return (
      <VignetteCard label="poem — 翻开一件物品时">
        <div className="px-2 py-6 text-center">
          <p className="text-[19px] leading-loose text-ink" style={{ fontFamily: SERIF }}>
            「杯沿的一道细纹，<br />是去年冬天的事了。」
          </p>
          <Mono className="mt-5 block text-[11px] text-ink-faint">—— 写给：白瓷盖碗</Mono>
        </div>
      </VignetteCard>
    );
  }
  if (id === 'dust') {
    return (
      <VignetteCard label="dust — 218 天未翻动">
        <div className="relative rounded-lg p-5" style={{ backgroundColor: 'var(--surface)', border: `1px solid var(--hairline)` }}>
          {/* 灰膜：自上而下的暖灰渐变盖在卡片上 */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(to bottom, color-mix(in oklab, var(--ink) 9%, transparent), transparent 65%)' }} />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold text-ink">《百年孤独》</div>
              <Mono className="mt-1 block text-[11px] text-ink-faint">书房 · 第三层书架</Mono>
            </div>
            <Wind size={18} className="text-ink-faint" />
          </div>
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--hairline)' }}>
            <div className="h-full w-[72%] rounded-full" style={{ backgroundColor: ACCENT, opacity: 0.45 }} />
          </div>
          <div className="mt-4 flex gap-2">
            <span className="rounded-md px-2.5 py-1 text-[11px] text-ink" style={{ border: `1px solid ${LINE}` }}>拂去灰尘</span>
            <span className="rounded-md px-2.5 py-1 text-[11px] text-ink-faint">让它停着</span>
          </div>
        </div>
      </VignetteCard>
    );
  }
  return (
    <VignetteCard label="zimomo — 不轻易开口">
      <div className="flex flex-col gap-3 py-2">
        <div className="max-w-[80%] self-start rounded-xl rounded-bl-sm px-4 py-3" style={{ backgroundColor: 'var(--chip-sage)' }}>
          <p className="text-[13.5px] leading-relaxed text-ink" style={{ fontFamily: SERIF }}>创可贴在药盒第二格。上次用，是三月你切到手指那回。</p>
        </div>
        <Mono className="self-start pl-1 text-[10px] text-ink-faint">齐默默 · 仅在被问起时</Mono>
        <div className="mt-2 flex items-center gap-2 self-end rounded-full px-3 py-1.5" style={{ border: `1px solid ${LINE}` }}>
          <Mono className="text-[11px] text-ink-soft">创可贴放哪了？</Mono>
        </div>
      </div>
    </VignetteCard>
  );
}

function VignetteCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative">
      <Mono className="mb-3 block text-[11px] text-ink-faint">{label}</Mono>
      {children}
    </div>
  );
}

// ─── 产品演示（CSS 框选窗口）───────────────────────────────────────────────────

function Demo() {
  return (
    <section id="demo" className="px-6 py-16 sm:px-10">
      <Reveal className="relative mx-auto max-w-[980px]">
        <Link to="/home" className="lp-btn absolute -top-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 shadow-float" style={{ backgroundColor: 'var(--surface)', border: `1px solid ${LINE}` }}>
          <span className="grid h-5 w-5 place-items-center rounded-full" style={{ backgroundColor: BROWN }}>
            <Play size={10} style={{ color: '#f7f4ef' }} />
          </span>
          <Mono className="text-[12px] text-ink">亲手试试</Mono>
        </Link>
        <AppWindow />
        <Mono className="mt-4 block text-center text-[12px] text-ink-faint">fig. 01 — 「小窝」总览：记录、提醒、空间，一屏掌握。</Mono>
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
          <div className="text-[16px] font-semibold text-ink" style={{ fontFamily: SERIF }}>早安，Serena</div>
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
    <Reveal as="article" delay={(index % 3) * 60} className="group relative px-8 py-9 transition-colors hover:bg-surface-alt">
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
    <section id="why" className="relative px-6 py-14 sm:px-10">
      <Barcode className="-left-[33px] top-16 hidden md:block" />
      <div className="grid grid-cols-1 gap-px lg:grid-cols-3 lg:grid-rows-2" style={{ backgroundColor: LINE }}>
        {/* 大金句卡（左列跨两行）*/}
        <Reveal className="bg-surface relative isolate overflow-hidden p-8 sm:p-10 lg:col-span-2 lg:row-span-2">
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
        </Reveal>

        {/* 四个原则小格 */}
        {PRINCIPLES.map((p, i) => (
          <Reveal as="article" key={p.t} delay={i * 50} className="bg-surface relative p-7">
            <Mono className="text-[11px] text-ink-faint">0{i + 1}</Mono>
            <h3 className="mt-2 text-[16px] font-semibold text-ink">{p.t}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{p.d}</p>
          </Reveal>
        ))}

        {/* 斜纹填充格：补齐 3×3 网格的空位（Zed 用 pattern 填空档的手法） */}
        <HatchCell />
      </div>
    </section>
  );
}

/** 斜纹填充格：45° 细斜线铺底 + 居中菱形标记。 */
function HatchCell() {
  const id = useId().replace(/:/g, '');
  return (
    <div aria-hidden className="bg-surface relative hidden min-h-[120px] lg:block">
      <svg className="absolute inset-0 size-full" style={{ opacity: 0.4, color: RULE }}>
        <defs>
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border" style={{ borderColor: LINE, backgroundColor: 'var(--surface)' }} />
    </div>
  );
}

// ─── 细节台账（清单式，区别于前面的网格）─────────────────────────────────────────

function Extras() {
  return (
    <section>
      <div className="px-8 py-9">
        <Mono className="text-[12px]" style={{ color: ACCENT }}>// 细节台账</Mono>
        <h2 className="mt-1.5 text-[clamp(1.6rem,3.6vw,2.6rem)] font-semibold text-ink">每一处，都为安心而造。</h2>
      </div>
      <HRule />
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {EXTRAS.map((e, i) => (
          <Reveal as="article" key={e.t} delay={(i % 2) * 50} className="relative flex items-baseline gap-3 px-8 py-5">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 border-b border-dashed" style={{ borderColor: LINE }} />
            {i % 2 === 0 && <div className="pointer-events-none absolute inset-y-0 right-0 hidden border-r border-dashed lg:block" style={{ borderColor: LINE }} />}
            <Mono className="shrink-0 text-[11px] text-ink-faint">№{String(i + 1).padStart(2, '0')}</Mono>
            <span className="shrink-0 text-[15px] font-semibold text-ink">{e.t}</span>
            <span aria-hidden className="mx-1 flex-1 border-b border-dotted" style={{ borderColor: LINE, transform: 'translateY(-3px)' }} />
            <span className="shrink-0 text-[12.5px] text-ink-soft">{e.d}</span>
          </Reveal>
        ))}
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
        <p className="mx-auto mt-4 max-w-[36ch] text-[15px] text-ink-soft" style={{ textWrap: 'balance' }}>在生活里，留一处安静的地方，让自己住下来。</p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link to="/home" className="lp-btn lp-btn-primary inline-flex items-center rounded-md px-5 py-3">
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
      <div aria-hidden className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: `linear-gradient(rgba(243,239,232,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(243,239,232,0.6) 1px, transparent 1px)`, backgroundSize: '34px 34px' }} />
      <div className="relative mx-auto max-w-[1240px] px-6 pb-0 pt-16">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-5">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-[5px] text-[12px] font-bold" style={{ backgroundColor: CREAM, color: BROWN }}>v</span>
              <Mono className="text-[15px] font-semibold" style={{ color: CREAM }}>vidorra</Mono>
            </div>
            <Mono className="mt-4 block text-[12px]" style={{ color: 'rgba(243,239,232,0.7)' }}>vidorra © 2026</Mono>
            <Link to="/home"><Mono className="mt-3 block text-[12px] transition-colors hover:text-[#f3efe8]" style={{ color: 'rgba(243,239,232,0.7)' }}>已有账号？登录</Mono></Link>
            <Mono className="mt-3 block text-[11px]" style={{ color: 'rgba(243,239,232,0.5)' }}>服务条款 · 隐私政策</Mono>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <Mono className="text-[12px] font-semibold" style={{ color: CREAM }}>{c.h}</Mono>
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
    <div className="min-h-screen overflow-x-clip" style={{ backgroundColor: 'var(--canvas)', color: 'var(--ink)' }}>
      <Nav />
      <main>
        <Frame>
          <Announce />
          <Hero />
          <Slash />
          <Marquee />
          <Slash />
          <FeatureTabs />
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
