import { createFileRoute, Link } from '@tanstack/react-router';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LandingNavDrawer } from '@/components/LandingNavDrawer';
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
  Menu,
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

const LINE = 'color-mix(in oklab, var(--ink) 16%, transparent)';
const RULE = 'color-mix(in oklab, var(--ink) 12%, transparent)';
const LP = {
  deco: 'var(--lp-deco)',
  chrome: 'var(--sidebar-bg)',
  chromeFg: 'var(--sidebar-ink)',
  footRail: 'var(--lp-footer-rail)',
  footHair: 'var(--lp-footer-hair)',
  footMuted: 'var(--lp-footer-fg-muted)',
  footFaint: 'var(--lp-footer-fg-faint)',
} as const;

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

/** 菱形节点（Zed 式 rotate-45 方块）：6px、无 translate，显式 offset 骑线。
    垂直：top/bottom = -var(--node-vertical-offset)（中心压在 1px 分界线中心）；
    水平：left/right = var(--node-horizontal-offset)（外侧对走 .lp-outer-node-offset
    断点值，container 内侧对由父级 [--node-horizontal-offset:-3.5px] 覆盖）。 */
type NodePos = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

function Node({ pos, className = '' }: { pos: NodePos; className?: string }) {
  const [v, h] = pos.split('-') as ['top' | 'bottom', 'left' | 'right'];
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-50 size-1.5 rotate-45 border ${className}`}
      style={{
        borderColor: LINE,
        backgroundColor: 'var(--canvas)',
        [v]: 'calc(-1 * var(--node-vertical-offset))',
        [h]: 'var(--node-horizontal-offset)',
      }}
    />
  );
}

/** 斜线舱壁分隔（Zed divider-slash）：上下细线全幅贯穿视口 + 容器内 45° 斜纹。 */
function Slash() {
  const id = useId().replace(/:/g, '');
  // 上沿 1px 线画在元素内部（top:0..1），骑线中心在 0.5px → 垂直 offset 改 2.5px
  return (
    <div className="relative h-3.5 w-full" style={{ '--node-vertical-offset': '2.5px' } as CSSProperties}>
      <div aria-hidden className="absolute left-1/2 top-0 h-px w-[200vw] -translate-x-1/2" style={{ backgroundColor: LINE }} />
      <div aria-hidden className="absolute bottom-0 left-1/2 h-px w-[200vw] -translate-x-1/2" style={{ backgroundColor: LINE }} />
      <svg aria-hidden className="absolute inset-x-0 bottom-[1px] top-[1px] w-full" style={{ opacity: 0.45, color: RULE }}>
        <defs>
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <Node pos="top-left" />
      <Node pos="top-right" />
    </div>
  );
}

/** 普通虚线横隔（节内细分用）。 */
function HRule() {
  return <div className="w-full border-t border-dashed" style={{ borderColor: LINE }} />;
}

/** 侧沟分段标尺：一条被切成不等段的竖线，部分实段部分虚段。
    zed 式贴边：1px 线压在 rail 的内边界上（side 边 -0.5px，线中心 = 边界）。 */
function Ruler({ segs, side, color = RULE }: { segs: { f: number; dash?: boolean }[]; side: 'left' | 'right'; color?: string }) {
  return (
    <div aria-hidden className="absolute inset-y-0 flex flex-col" style={{ width: 1, color, [side]: -0.5 }}>
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

/** 条码刻线纹（Zed 侧沟里不等宽水平 rect 的 pattern）：放在弹性 rail 内、
    贴 container 边缘（rail="left" 表示位于左侧弹性 rail → 贴自己的右边）。 */
function Barcode({ rail, color = RULE }: { rail: 'left' | 'right'; color?: string }) {
  const id = useId().replace(/:/g, '');
  // 伪随机但确定：避免每次渲染抖动
  const rows = Array.from({ length: 22 }, (_, i) => ({
    y: i * 9,
    w: 9 + ((i * 7919 + 13) % 15),
  }));
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-y-0 h-full w-8"
      style={{ color, [rail === 'left' ? 'right' : 'left']: -1 }}
    >
      <defs>
        <pattern id={id} width="32" height="198" patternUnits="userSpaceOnUse">
          {rows.map((r, i) => (
            <rect key={i} x={rail === 'left' ? 32 - r.w : 0} y={r.y} width={r.w} height="1" fill="currentColor" />
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
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
      style={{ color: LP.deco, opacity: 0.12, maskImage: `linear-gradient(${mask}, #000, transparent)` }}
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
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-0 size-full" style={{ color: LP.deco, opacity: 0.22 }}>
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
      className={`ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded px-1 text-[11px] leading-none ${onDark ? 'lp-key-on-chrome' : ''}`}
      style={
        onDark
          ? { fontFamily: MONO }
          : {
              fontFamily: MONO,
              border: `1px solid ${LINE}`,
              color: 'var(--ink-soft)',
            }
      }
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

function Nav({ drawerOpen, onMenuClick }: { drawerOpen: boolean; onMenuClick: () => void }) {
  return (
    <header
      className="lp-outer-node-offset sticky top-0 z-40 flex h-[57px] min-w-0 border-y sm:border-t-0"
      style={{
        borderColor: LINE,
        backgroundColor: 'color-mix(in oklab, var(--canvas) 82%, transparent)',
        backdropFilter: 'saturate(160%) blur(14px)',
        WebkitBackdropFilter: 'saturate(160%) blur(14px)',
      }}
    >
      {/* 外侧节点对：骑 header 自己的 border-b，跟随 sticky，z 高于 nav 背景 */}
      <Node pos="bottom-left" className="hidden lg:block" />
      <Node pos="bottom-right" className="hidden lg:block" />

      {/* 五段 rail 框架（header 区 rail 用实线） */}
      <span aria-hidden className="w-4 shrink-0 border-r sm:w-6 md:w-12 lg:border-r-0" style={{ borderColor: LINE }} />
      <span aria-hidden className="hidden flex-1 border-x lg:block" style={{ borderColor: LINE }} />

      <nav className="lp-container-max-w relative isolate z-[2] flex max-md:min-w-0 flex-1 items-center justify-between gap-4 px-3 [--node-horizontal-offset:-3.5px] lg:gap-0 lg:px-3.5">
        {/* container 内侧节点对：压 container 边线 × header 底线，常显 */}
        <Node pos="bottom-left" />
        <Node pos="bottom-right" />

        <div className="flex min-w-0 items-center gap-4">
          <a href="#top" className="flex shrink-0 items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-[5px] text-[12px] font-bold" style={{ backgroundColor: LP.chrome, color: LP.chromeFg }}>v</span>
            <Mono className="text-[15px] font-semibold tracking-tight text-ink">vidorra</Mono>
          </a>
          <div className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="lp-nav-link inline-flex h-8 items-center rounded-md px-2.5">
                <Mono className="text-[13px]">{n.label}</Mono>
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="lp-nav-link inline-flex size-8 items-center justify-center rounded-md" iconSize={15} />
          <Link to="/home" className="lp-btn lp-btn-primary hidden items-center rounded-md px-3 py-1.5 lg:inline-flex">
            <Mono className="text-[13px] font-medium">开始入住</Mono>
            <Key onDark>D</Key>
          </Link>
          <button
            type="button"
            aria-label={drawerOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
            className="inline-flex size-8 items-center justify-center rounded-md border lg:hidden"
            style={{ borderColor: LINE }}
            onClick={onMenuClick}
          >
            <Menu size={15} className="text-ink-soft" />
          </button>
        </div>
      </nav>

      <span aria-hidden className="hidden flex-1 border-x lg:block" style={{ borderColor: LINE }} />
      <span aria-hidden className="w-4 shrink-0 border-l sm:w-6 md:w-12 lg:border-l-0" style={{ borderColor: LINE }} />
    </header>
  );
}

/** 公告光带（Zed Introducing 行）：横向渐变 + hover 整行高亮，整行可点。 */
function Announce() {
  return (
    <a
      href="#author"
      className="lp-intro-banner group relative block py-2.5 text-center"
      style={{ '--node-vertical-offset': '2.5px' } as CSSProperties}
    >
      <span aria-hidden className="absolute bottom-0 left-1/2 block h-px w-[200vw] -translate-x-1/2" style={{ backgroundColor: LINE }} />
      <Node pos="bottom-left" className="hidden lg:block" />
      <Node pos="bottom-right" className="hidden lg:block" />
      <span className="text-[13px] tracking-wide text-lp-brand" style={{ fontFamily: SERIF }}>新功能：</span>
      <span className="text-[13px] font-medium tracking-wide text-ink" style={{ fontFamily: SERIF }}>齐默默 —— 不催促的物品管家</span>
      <span className="ml-2 inline-block text-[13px] text-ink-soft transition-transform group-hover:translate-x-0.5">→</span>
    </a>
  );
}

// ─── 主框：全幅五段（窄 rail / 弹性 rail / 中央 container / 弹性 rail / 窄 rail）
// zed 并非每段左右都有刻度——各 section 的 rail 装饰组合不同，由 props 逐段配置。

type RulerSeg = { f: number; dash?: boolean };
type FlexRail = { ruler?: RulerSeg[]; barcode?: boolean };

function SectionFrame({
  children,
  className = '',
  tracks = false,
  leftNarrow,
  leftFlex,
  rightFlex,
  rightNarrow,
}: {
  children: ReactNode;
  className?: string;
  /** 仅显示 rail 轨道边线（header 式实线框），不渲染分段刻度 */
  tracks?: boolean;
  leftNarrow?: RulerSeg[];
  leftFlex?: FlexRail;
  rightFlex?: FlexRail;
  rightNarrow?: RulerSeg[];
}) {
  const trackBorder = tracks ? { borderColor: LINE } : undefined;
  return (
    <div className={`lp-outer-node-offset relative flex w-full min-w-0 ${className}`}>
      <span
        className={`relative w-4 shrink-0 sm:w-6 md:w-12 ${tracks ? 'border-r lg:border-r-0' : ''}`}
        style={trackBorder}
      >
        {leftNarrow && <Ruler side="right" segs={leftNarrow} />}
      </span>
      <span className={`relative hidden flex-1 lg:block ${tracks ? 'border-x' : ''}`} style={trackBorder}>
        {leftFlex?.ruler && <Ruler side="right" segs={leftFlex.ruler} />}
        {leftFlex?.barcode && <Barcode rail="left" />}
      </span>

      <div className="lp-container-max-w relative max-md:min-w-0 flex-1 [--node-horizontal-offset:-3.5px]">{children}</div>

      <span className={`relative hidden flex-1 lg:block ${tracks ? 'border-x' : ''}`} style={trackBorder}>
        {rightFlex?.ruler && <Ruler side="left" segs={rightFlex.ruler} />}
        {rightFlex?.barcode && <Barcode rail="right" />}
      </span>
      <span
        className={`relative w-4 shrink-0 sm:w-6 md:w-12 ${tracks ? 'border-l lg:border-l-0' : ''}`}
        style={trackBorder}
      >
        {rightNarrow && <Ruler side="left" segs={rightNarrow} />}
      </span>
    </div>
  );
}

type SectionRails = Omit<Parameters<typeof SectionFrame>[0], 'children'>;

/** 各 section 的 rail 装饰预设（对照 zed：hero 才有条码，多数段仅一侧 flex 标尺 + 对侧窄 rail）。 */
const RAILS = {
  /** intro banner：五段轨道框，无刻度线 */
  intro: { tracks: true },
  hero: {
    leftNarrow: [{ f: 1.3 }, { f: 4.6, dash: true }, { f: 2.4 }],
    leftFlex: { ruler: [{ f: 2.9 }, { f: 1.9, dash: true }, { f: 3.7 }], barcode: true },
    rightFlex: { ruler: [{ f: 2.9, dash: true }, { f: 1.6 }, { f: 1.9, dash: true }, { f: 3.2 }], barcode: true },
    rightNarrow: [{ f: 2.4 }, { f: 2.9, dash: true }, { f: 3.8 }],
  },
  marquee: {
    leftNarrow: [{ f: 1.7, dash: true }, { f: 3.2 }, { f: 2.1 }],
    leftFlex: { ruler: [{ f: 2.2 }, { f: 4.1, dash: true }] },
    rightFlex: { ruler: [{ f: 2.2 }, { f: 4.1, dash: true }] },
    rightNarrow: [{ f: 3.1 }, { f: 1.8 }],
  },
  standard: {
    leftNarrow: [{ f: 2.6 }, { f: 3.3, dash: true }],
    leftFlex: { ruler: [{ f: 2.9 }, { f: 1.9, dash: true }, { f: 3.6 }] },
    rightFlex: { ruler: [{ f: 2.9 }, { f: 1.9, dash: true }, { f: 3.6 }] },
    rightNarrow: [{ f: 2.6 }, { f: 3.3, dash: true }],
  },
  leftHeavy: {
    leftNarrow: [{ f: 2.0 }, { f: 3.5, dash: true }],
    leftFlex: { ruler: [{ f: 2.4 }, { f: 4.0 }] },
    rightFlex: { ruler: [{ f: 2.4 }, { f: 4.0 }] },
    rightNarrow: [{ f: 1.9, dash: true }, { f: 3.2 }],
  },
  minimal: {
    leftNarrow: [{ f: 4.0 }, { f: 2.2, dash: true }],
    rightNarrow: [{ f: 4.0 }, { f: 2.2, dash: true }],
  },
  /** 无轨道无刻度（收尾 CTA 等） */
  bare: {},
} as const satisfies Record<string, SectionRails>;

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section id="top" className="relative isolate overflow-clip px-6 pb-24 pt-20 text-center sm:pt-28">
      {/* hero 底：暖色渐变（zed 层次：from/10 via/40）→ 网格叠上 */}
      <div aria-hidden className="lp-hero-gradient pointer-events-none absolute inset-0" />
      <HeroArt />
      <Reveal className="relative z-10">
        <h1 className="mx-auto max-w-[20ch] font-medium leading-[1.05] text-ink" style={{ fontFamily: SERIF, fontSize: 'clamp(2.8rem, 8vw, 6.5rem)', letterSpacing: '-0.01em' }}>
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

/** Hero 底景：细网格（zed opacity-8 层次，vidorra 暖棕线色）+ 慢旋嵌套方块水印。 */
function HeroArt() {
  const squares = Array.from({ length: 9 });
  const gridId = useId().replace(/:/g, '');
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <svg
        aria-hidden
        className="lp-hero-grid-lines absolute inset-0 size-full opacity-[0.028]"
      >
        <defs>
          <pattern id={gridId} width="10" height="10" patternUnits="userSpaceOnUse" x="-1" y="-1">
            <path d="M.5 10V.5H10" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" strokeWidth="0" fill={`url(#${gridId})`} />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg viewBox="0 0 480 480" className="lp-spin block w-[680px]" style={{ opacity: 0.035, color: 'var(--ink)' }}>
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
          <Mono className="text-[12px] text-lp-brand">// 功能</Mono>
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
                      <Icon size={15} className="text-lp-brand" />
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
            <span key={pos} aria-hidden className={`absolute size-4 border-lp-brand ${pos}`} />
          ))}
          <div className="absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-lg p-4" style={{ backgroundColor: 'var(--surface)', border: `1px solid var(--hairline)`, boxShadow: 'var(--shadow-md)' }}>
            <Mono className="text-[10px] text-lp-brand">已识别</Mono>
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
            <div className="h-full w-[72%] rounded-full bg-lp-brand opacity-45" />
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
          <span className="grid h-5 w-5 place-items-center rounded-full" style={{ backgroundColor: LP.chrome }}>
            <Play size={10} style={{ color: LP.chromeFg }} />
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
          <span className="grid h-8 w-8 place-items-center rounded-lg text-[13px] font-bold" style={{ backgroundColor: LP.chrome, color: LP.chromeFg }}>v</span>
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
          <Mono className="text-[12px] text-lp-brand">// 房间</Mono>
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
      <div className="grid grid-cols-1 gap-px lg:grid-cols-3 lg:grid-rows-2" style={{ backgroundColor: LINE }}>
        {/* 大金句卡（左列跨两行）*/}
        <Reveal className="bg-surface relative isolate overflow-hidden p-8 sm:p-10 lg:col-span-2 lg:row-span-2">
          <GridPattern />
          <Mono className="text-[12px] text-lp-brand">// 为什么</Mono>
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
        <Mono className="text-[12px] text-lp-brand">// 细节台账</Mono>
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
        <Mono className="text-[12px] text-lp-brand">// 来自作者</Mono>
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
        <h2 className="font-medium leading-tight text-ink" style={{ fontFamily: SERIF, fontSize: 'clamp(2.2rem,5.5vw,3.8rem)' }}>推门进去。</h2>
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

const FOOT_COLS: { h: string; items: { label: string; ext?: boolean }[] }[] = [
  { h: '产品', items: [{ label: '功能' }, { label: '房间' }, { label: '齐默默' }, { label: '更新日志' }] },
  { h: '资源', items: [{ label: '使用指南' }, { label: '常见问题' }, { label: '开源' }, { label: '反馈' }] },
  { h: '公司', items: [{ label: '理念' }, { label: '团队' }, { label: '博客' }, { label: '联系我们' }] },
  { h: '社交', items: [{ label: '微博', ext: true }, { label: '小红书', ext: true }, { label: 'GitHub', ext: true }, { label: 'X', ext: true }] },
];

/** 页脚底部装饰带：border-t + 45° 斜纹 + 渐隐水平刻线 + 描边 wordmark
    （负 margin 伸出 container，由父级 overflow-clip 裁掉下缘；移动端少裁切）。 */
function FooterBand() {
  const id = useId().replace(/:/g, '');
  return (
    <div className="lp-footer-band relative col-span-full flex w-full justify-center border-t" style={{ borderColor: LP.footHair }}>
      <svg aria-hidden className="lp-footer-band-slash pointer-events-none absolute inset-0 size-full opacity-30">
        <defs>
          <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <div aria-hidden className="lp-footer-band-ticks pointer-events-none absolute inset-0" />
      <span aria-hidden className="lp-footer-wordmark block select-none font-bold leading-[0.85] tracking-tighter">
        vidorra
      </span>
    </div>
  );
}

function Footer() {
  return (
    <footer
      id="about"
      className="lp-outer-node-offset relative flex min-w-0 border-t"
      style={{ backgroundColor: LP.chrome, borderColor: LINE }}
    >
      {/* 节点对骑 footer 上边界 hairline */}
      <Node pos="top-left" className="hidden lg:block" />
      <Node pos="top-right" className="hidden lg:block" />

      {/* 五段 rail 框架（深底白低透明标尺；无网格/条码，保持 footer 干净） */}
      <span className="relative z-[1] w-4 shrink-0 sm:w-6 md:w-12">
        <Ruler side="right" color={LP.footRail} segs={[{ f: 2.2 }, { f: 3.4, dash: true }, { f: 1.8 }]} />
      </span>
      <span className="relative z-[1] hidden flex-1 lg:block">
        <Ruler side="right" color={LP.footRail} segs={[{ f: 3.1 }, { f: 2.2, dash: true }, { f: 2.8 }]} />
      </span>

      <div className="lp-container-max-w relative z-[1] max-md:min-w-0 flex-1 [--node-horizontal-offset:-3.5px]">
        <Node pos="top-left" className="hidden lg:block" />
        <Node pos="top-right" className="hidden lg:block" />
        <div className="lp-footer-clip relative isolate size-full overflow-clip">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4 lg:grid-cols-6 lg:gap-6 lg:divide-x lg:divide-[var(--lp-footer-divide)]">
            {/* 第 1 列：品牌 + 短 hr + 法务 */}
            <div className="flex flex-col px-5 py-8 sm:col-span-2 lg:py-10 lg:pl-6">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-[5px] text-[12px] font-bold" style={{ backgroundColor: LP.chromeFg, color: LP.chrome }}>v</span>
                <Mono className="text-[15px] font-semibold" style={{ color: LP.chromeFg }}>vidorra</Mono>
              </div>
              <Mono className="mt-4 block text-[12px]" style={{ color: LP.footMuted }}>vidorra © 2026</Mono>
              <hr className="my-3 w-20 border-t" style={{ borderColor: LP.footHair }} />
              <Link to="/home" className="lp-foot-link w-fit"><Mono className="text-[12px]">已有账号？登录</Mono></Link>
              <Mono className="mt-3 block text-[11px]" style={{ color: LP.footFaint }}>服务条款 · 隐私政策</Mono>
            </div>
            {FOOT_COLS.map((c) => (
              <div key={c.h} className="flex flex-col gap-4 px-5 py-4 md:py-8 lg:py-10">
                <Mono className="text-[12px] font-semibold" style={{ color: LP.chromeFg }}>{c.h}</Mono>
                <ul className="flex flex-col gap-3">
                  {c.items.map((it) => (
                    <li key={it.label}>
                      <a href="#about" className="lp-foot-link">
                        <Mono className="text-[12px]">{it.label}</Mono>
                        {it.ext && <span aria-hidden className="ml-2 text-[12px]" style={{ color: LP.footFaint }}>↗</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <FooterBand />
          </div>
        </div>
      </div>

      <span className="relative z-[1] hidden flex-1 lg:block">
        <Ruler side="left" color={LP.footRail} segs={[{ f: 1.9, dash: true }, { f: 3.6 }, { f: 2.4 }]} />
      </span>
      <span className="relative z-[1] w-4 shrink-0 sm:w-6 md:w-12">
        <Ruler side="left" color={LP.footRail} segs={[{ f: 2.7 }, { f: 1.6 }, { f: 3.9, dash: true }]} />
      </span>
    </footer>
  );
}

// ─── 页面 ──────────────────────────────────────────────────────────────────────

function LandingPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="lp-drawer-root relative min-h-screen overflow-clip">
      <LandingNavDrawer open={drawerOpen} onOpenChange={setDrawerOpen} items={NAV} />
      <div
        className="lp-drawer-shell min-h-screen overflow-x-clip bg-canvas text-ink"
        data-drawer-active={drawerOpen ? '' : undefined}
      >
        <Nav drawerOpen={drawerOpen} onMenuClick={() => setDrawerOpen((v) => !v)} />
        {/* isolate：内容里的 z-50 节点只在 main 内比较，不会盖过 sticky 顶栏 */}
        <main className="isolate">
        <SectionFrame {...RAILS.intro}>
          <Announce />
        </SectionFrame>
        <SectionFrame {...RAILS.hero}>
          <Hero />
        </SectionFrame>
        <Slash />
        <SectionFrame {...RAILS.marquee}>
          <Marquee />
        </SectionFrame>
        <Slash />
        <SectionFrame {...RAILS.standard}>
          <FeatureTabs />
        </SectionFrame>
        <Slash />
        <SectionFrame {...RAILS.leftHeavy}>
          <Demo />
        </SectionFrame>
        <Slash />
        <SectionFrame {...RAILS.minimal}>
          <SpecPanel />
        </SectionFrame>
        <Slash />
        <SectionFrame {...RAILS.standard}>
          <Rooms />
        </SectionFrame>
        <Slash />
        <SectionFrame {...RAILS.standard}>
          <Principles />
        </SectionFrame>
        <Slash />
        <SectionFrame {...RAILS.leftHeavy}>
          <Extras />
        </SectionFrame>
        <Slash />
        <SectionFrame {...RAILS.marquee}>
          <AuthorLetter />
        </SectionFrame>
        <Slash />
        <SectionFrame {...RAILS.bare}>
          <FinalCTA />
        </SectionFrame>
        <Footer />
      </main>
      </div>
    </div>
  );
}
