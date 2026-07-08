import { createFileRoute, Link } from '@tanstack/react-router';
import { BrandMark } from '@/components/AppBrand';
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
   dicha landing — 工程纸结构（深度参考 zed.dev 源码的结构语汇）· 暖棕配色
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

const LINE = 'color-mix(in oklab, var(--foreground) 16%, transparent)';
const RULE = 'color-mix(in oklab, var(--foreground) 12%, transparent)';
const LP = {
  deco: 'var(--lp-deco)',
  chrome: 'var(--accent)',
  chromeFg: 'var(--accent-foreground)',
  footRail: 'var(--lp-footer-rail)',
  footHair: 'var(--lp-footer-hair)',
  footMuted: 'var(--lp-footer-fg-muted)',
  footFaint: 'var(--lp-footer-fg-faint)',
} as const;

function chipColor(tint: string) {
  switch (tint) {
    case 'lavender':
      return 'color-mix(in oklab, var(--accent) 14%, var(--surface) 86%)';
    case 'peach':
      return 'color-mix(in oklab, var(--warning) 18%, var(--surface) 82%)';
    case 'sage':
      return 'color-mix(in oklab, var(--success) 16%, var(--surface) 84%)';
    case 'pink':
      return 'color-mix(in oklab, var(--danger) 14%, var(--surface) 86%)';
    case 'mist':
      return 'var(--surface-tertiary)';
    default:
      return 'var(--surface-secondary)';
  }
}

function accentColor(tint: string) {
  switch (tint) {
    case 'lavender':
      return 'var(--accent)';
    case 'peach':
      return 'var(--warning)';
    case 'sage':
      return 'var(--success)';
    case 'pink':
      return 'var(--danger)';
    case 'mist':
      return 'var(--muted)';
    default:
      return 'var(--field-placeholder)';
  }
}

// ─── 数据 ──────────────────────────────────────────────────────────────────────

const FEATURES: { id: string; icon: LucideIcon; title: string; body: string }[] = [
  {
    id: 'capture',
    icon: ScanLine,
    title: '先放进来，慢慢整理',
    body: '拍一张照，或轻轻说一句。滴茶会帮你认出来，先安安静静收好，等你有空再慢慢补全。',
  },
  {
    id: 'poem',
    icon: Feather,
    title: '给物品留一句话',
    body: '不是每件东西都要有意义。但有些时候，一句话能把它和某个日子轻轻系在一起。',
  },
  {
    id: 'dust',
    icon: Wind,
    title: '旧物会落一点灰',
    body: '久未触碰的物品会慢慢积灰。它不催你清空，只是温柔地提醒：时间确实从这里经过。',
  },
  {
    id: 'zimomo',
    icon: MessageSquareText,
    title: '齐默默在旁边',
    body: '一个话不多的同伴。它记得东西在哪里，也知道什么时候应该保持安静。',
  },
];

const MARQUEE_ITEMS = [
  '白瓷盖碗',
  '牛皮笔记本',
  '胶片相机',
  '外婆的顶针',
  '亚麻衬衫',
  '维生素 D',
  '《百年孤独》',
  '手冲咖啡壶',
  '旧毛衣',
  '登山绳',
  '薄荷茶',
  '备用钥匙',
  '尤加利干花',
  '奶酪刨',
  '未拆封的画框',
  '冬被',
];

const SPECS: { k: string; v: string }[] = [
  { k: '房间', v: '6 间' },
  { k: '物品', v: '无上限' },
  { k: '提醒', v: '不催，也不忘' },
  { k: '平台', v: 'Web · iOS · Android' },
  { k: '同步', v: '总在身边' },
];

const ROOMS: {
  id: string;
  no: string;
  icon: LucideIcon;
  label: string;
  caption: string;
  tint: string;
}[] = [
  {
    id: 'wardrobe',
    no: '01',
    icon: Shirt,
    label: '衣橱',
    caption: '挂着一整年的晴雨。',
    tint: 'lavender',
  },
  {
    id: 'library',
    no: '02',
    icon: BookOpen,
    label: '书房',
    caption: '书在，时间就慢一点。',
    tint: 'peach',
  },
  {
    id: 'storage',
    no: '03',
    icon: Package,
    label: '杂物间',
    caption: '「以后用得上」，是家里最温柔的理由。',
    tint: 'sage',
  },
  {
    id: 'fridge',
    no: '04',
    icon: Refrigerator,
    label: '冰箱',
    caption: '新鲜的、快过期的，都值得看一眼。',
    tint: 'mist',
  },
  {
    id: 'meds',
    no: '05',
    icon: Pill,
    label: '药盒',
    caption: '不生病的时候，也记得打开看看。',
    tint: 'pink',
  },
  {
    id: 'more',
    no: '06',
    icon: PlusIcon,
    label: '更多房间',
    caption: '未来，还会有更多。',
    tint: '',
  },
];

const PRINCIPLES: { t: string; d: string }[] = [
  { t: '不催促', d: '没有红色的小红点。' },
  { t: '不评判', d: '乱一点，也没关系。' },
  { t: '不丢弃', d: '灰可以擦，也可以让它落着。' },
  { t: '只是陪着', d: '你需要的时候，它才轻轻说一句。' },
];

const EXTRAS: { t: string; d: string }[] = [
  { t: '全文搜索', d: '只记得一点点，也能顺着线索找回来。' },
  { t: '到期提醒', d: '药、食物、借出去的书，到时候轻轻说一声。' },
  { t: '空间统计', d: '每个房间住了多少东西，心里慢慢有数。' },
  { t: '多端同步', d: '手机和网页，翻开都是同一本小账。' },
  { t: '心情记录', d: '记东西的时候，也给今天留一点余温。' },
  { t: '随时导出', d: '你的东西和记录，始终归你自己。' },
  { t: '落灰提醒', d: '很久没碰的东西，会被温柔地想起来。' },
  { t: '数据私有', d: '默认只给你一个人看见。' },
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
        backgroundColor: 'var(--background)',
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
    <div
      className="relative h-3.5 w-full"
      style={{ '--node-vertical-offset': '2.5px' } as CSSProperties}
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-0 h-px w-[200vw] -translate-x-1/2"
        style={{ backgroundColor: LINE }}
      />
      <div
        aria-hidden
        className="absolute bottom-0 left-1/2 h-px w-[200vw] -translate-x-1/2"
        style={{ backgroundColor: LINE }}
      />
      <svg
        aria-hidden
        className="absolute inset-x-0 bottom-[1px] top-[1px] w-full"
        style={{ opacity: 0.45, color: RULE }}
      >
        <defs>
          <pattern
            id={id}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
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
function Ruler({
  segs,
  side,
  color = RULE,
}: {
  segs: { f: number; dash?: boolean }[];
  side: 'left' | 'right';
  color?: string;
}) {
  return (
    <div
      aria-hidden
      className="absolute inset-y-0 flex flex-col"
      style={{ width: 1, color, [side]: -0.5 }}
    >
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
            <rect
              key={i}
              x={rail === 'left' ? 32 - r.w : 0}
              y={r.y}
              width={r.w}
              height="1"
              fill="currentColor"
            />
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
    <span className="rounded-[3px] px-1 py-0.5" style={{ backgroundColor: chipColor(tint) }}>
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
      style={{
        color: LP.deco,
        opacity: 0.12,
        maskImage: `linear-gradient(${mask}, #000, transparent)`,
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

/** 圆点纹理（Zed 选中态 tab 的底纹）。 */
function DotPattern() {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 size-full"
      style={{ color: LP.deco, opacity: 0.22 }}
    >
      <defs>
        <pattern id={id} width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="0.75" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

type PatternVariant = 'weave' | 'ledger' | 'ticks';

function PatternField({
  variant,
  className = '',
  opacity = 0.22,
  mask = 'linear-gradient(to bottom, #000, transparent)',
}: {
  variant: PatternVariant;
  className?: string;
  opacity?: number;
  mask?: string;
}) {
  const id = useId().replace(/:/g, '');

  if (variant === 'ledger') {
    return (
      <svg
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-0 size-full ${className}`}
        style={{ color: LP.deco, opacity, maskImage: mask, WebkitMaskImage: mask }}
      >
        <defs>
          <pattern id={id} width="36" height="28" patternUnits="userSpaceOnUse">
            <path d="M0 7.5H36M0 21.5H36" stroke="currentColor" strokeWidth="1" fill="none" />
            <path
              d="M18 .5V28"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="1 7"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    );
  }

  if (variant === 'ticks') {
    return (
      <svg
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-0 size-full ${className}`}
        style={{ color: LP.deco, opacity, maskImage: mask, WebkitMaskImage: mask }}
      >
        <defs>
          <pattern id={id} width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M6 .5V8M18 16v7.5M.5 18H8M16 6h7.5"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-0 size-full ${className}`}
      style={{ color: LP.deco, opacity, maskImage: mask, WebkitMaskImage: mask }}
    >
      <defs>
        <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M-8 30C8 12 24 12 40 30S72 48 88 30"
            stroke="currentColor"
            strokeWidth="0.9"
            fill="none"
          />
          <path
            d="M-8 18C8 36 24 36 40 18S72 0 88 18"
            stroke="currentColor"
            strokeWidth="0.9"
            fill="none"
          />
          <path
            d="M24 0V48M0 24H48"
            stroke="currentColor"
            strokeWidth="0.75"
            strokeDasharray="1 7"
            fill="none"
          />
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

function Key({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span
      className={`ml-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded px-1 text-[11px] leading-none ${onDark ? 'lp-key-on-chrome' : ''}`}
      style={
        onDark
          ? undefined
          : {
              border: `1px solid ${LINE}`,
              color: 'var(--muted)',
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
        backgroundColor: 'color-mix(in oklab, var(--background) 82%, transparent)',
        backdropFilter: 'saturate(160%) blur(14px)',
        WebkitBackdropFilter: 'saturate(160%) blur(14px)',
      }}
    >
      {/* 外侧节点对：骑 header 自己的 border-b，跟随 sticky，z 高于 nav 背景 */}
      <Node pos="bottom-left" className="hidden lg:block" />
      <Node pos="bottom-right" className="hidden lg:block" />

      {/* 五段 rail 框架（header 区 rail 用实线） */}
      <span
        aria-hidden
        className="w-4 shrink-0 border-r sm:w-6 md:w-12 lg:border-r-0"
        style={{ borderColor: LINE }}
      />
      <span aria-hidden className="hidden flex-1 border-x lg:block" style={{ borderColor: LINE }} />

      <nav className="lp-container-max-w relative isolate z-[2] flex max-md:min-w-0 flex-1 items-center justify-between gap-4 px-3 [--node-horizontal-offset:-3.5px] lg:gap-0 lg:px-3.5">
        {/* container 内侧节点对：压 container 边线 × header 底线，常显 */}
        <Node pos="bottom-left" />
        <Node pos="bottom-right" />

        <div className="flex min-w-0 items-center gap-4">
          <a href="#top" className="flex shrink-0 items-center gap-2">
            <BrandMark className="h-5 w-[30px]" style={{ color: 'var(--foreground)' }} />
            <span className="text-[16px] font-semibold font-serif text-ink">滴茶</span>
          </a>
          <div className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="lp-nav-link inline-flex h-8 items-center rounded-md px-2.5"
              >
                <span className="text-[13px]">{n.label}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle
            className="lp-nav-link inline-flex size-8 items-center justify-center rounded-md"
            iconSize={15}
          />
          <Link
            to="/home"
            className="lp-btn lp-btn-primary hidden items-center rounded-md px-3 py-1.5 lg:inline-flex"
          >
            <span className="text-[13px] font-medium">开始入住</span>
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
      <span
        aria-hidden
        className="w-4 shrink-0 border-l sm:w-6 md:w-12 lg:border-l-0"
        style={{ borderColor: LINE }}
      />
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
      <span
        aria-hidden
        className="absolute bottom-0 left-1/2 block h-px w-[200vw] -translate-x-1/2"
        style={{ backgroundColor: LINE }}
      />
      <Node pos="bottom-left" className="hidden lg:block" />
      <Node pos="bottom-right" className="hidden lg:block" />
      <span className="text-[13px] tracking-wide text-lp-brand">新的陪伴：</span>
      <span className="text-[13px] font-medium font-serif tracking-wide text-ink">
        齐默默会在旁边，慢慢帮你归置
      </span>
      <span className="ml-2 inline-block text-[13px] text-ink-soft transition-transform group-hover:translate-x-0.5">
        →
      </span>
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
      <span
        className={`relative hidden flex-1 lg:block ${tracks ? 'border-x' : ''}`}
        style={trackBorder}
      >
        {leftFlex?.ruler && <Ruler side="right" segs={leftFlex.ruler} />}
        {leftFlex?.barcode && <Barcode rail="left" />}
      </span>

      <div className="lp-container-max-w relative max-md:min-w-0 flex-1 [--node-horizontal-offset:-3.5px]">
        {children}
      </div>

      <span
        className={`relative hidden flex-1 lg:block ${tracks ? 'border-x' : ''}`}
        style={trackBorder}
      >
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
    rightFlex: {
      ruler: [{ f: 2.9, dash: true }, { f: 1.6 }, { f: 1.9, dash: true }, { f: 3.2 }],
      barcode: true,
    },
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
    <section
      id="top"
      className="relative isolate overflow-clip px-6 pb-24 pt-20 text-center sm:pt-28"
    >
      {/* hero 底：暖色渐变（zed 层次：from/10 via/40）→ 网格叠上 */}
      <div aria-hidden className="lp-hero-gradient pointer-events-none absolute inset-0" />
      <HeroArt />
      <Reveal className="relative z-10">
        <h1 className="mx-auto flex justify-center text-ink" aria-label="滴茶">
          <span className="sr-only">滴茶</span>
          <BrandMark className="h-[clamp(4.5rem,12vw,8.5rem)] w-[clamp(6.75rem,18vw,12.75rem)]" />
        </h1>
        <p
          className="mx-auto mt-6 max-w-[32ch] text-[16px] leading-relaxed text-ink-soft"
          style={{ textWrap: 'balance' }}
        >
          把日子里舍不得丢的东西，一件一件放好。
        </p>
        <p
          className="mx-auto mt-3 max-w-[40ch] text-[12px] leading-relaxed text-ink-faint"
          style={{ textWrap: 'balance' }}
        >
          dicha /ˈdiː.tʃɑː/ · 西语里的幸福，也像中文里的「慢慢来」
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/home"
            className="lp-btn lp-btn-primary inline-flex items-center rounded-md px-4 py-2.5"
          >
            <Play size={14} className="mr-2" />
            <span className="text-[14px] font-medium">开始入住</span>
            <Key onDark>D</Key>
          </Link>
          <a
            href="#demo"
            className="lp-btn lp-btn-ghost inline-flex items-center rounded-md px-4 py-2.5"
          >
            <span className="text-[14px]">先看一眼</span>
            <Key>C</Key>
          </a>
        </div>
        <span className="mt-6 block text-[12px] text-ink-faint">
          网页、手机，之后都可以慢慢住进来
        </span>
      </Reveal>
    </section>
  );
}

/** Hero 底景：细网格（zed opacity-8 层次，dicha 暖棕线色）+ 慢旋嵌套方块水印。 */
function HeroArt() {
  const squares = Array.from({ length: 9 });
  const gridId = useId().replace(/:/g, '');
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <svg aria-hidden className="lp-hero-grid-lines absolute inset-0 size-full opacity-[0.028]">
        <defs>
          <pattern id={gridId} width="10" height="10" patternUnits="userSpaceOnUse" x="-1" y="-1">
            <path d="M.5 10V.5H10" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" strokeWidth="0" fill={`url(#${gridId})`} />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <svg
          viewBox="0 0 480 480"
          className="lp-spin block w-[680px]"
          style={{ opacity: 0.035, color: 'var(--foreground)' }}
        >
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
          <span className="mr-3 size-1 rotate-45 border" style={{ borderColor: LINE }} />
          <span className="mr-6 text-[13px] text-ink-soft">{it}</span>
          <span className="mr-6 size-1 rotate-45 border" style={{ borderColor: LINE }} />
        </span>
      ))}
    </div>
  );
  return (
    <section className="py-7">
      <span className="mb-3 block px-6 text-center text-[11px] tracking-[0.14em] text-ink-faint sm:px-10">
        刚刚，有人把这些放回了自己的小地方
      </span>
      <div
        className="overflow-hidden border-y py-2.5"
        style={{
          borderColor: LINE,
          maskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
        }}
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
      <div
        className="flex flex-col gap-5 px-6 py-10 sm:px-10 lg:flex-row lg:items-end lg:justify-between"
        style={{ borderBottom: `1px solid ${LINE}` }}
      >
        <hgroup className="max-w-2xl">
          <span className="text-[12px] text-lp-brand">功能</span>
          <h2
            className="mt-1.5 text-[clamp(1.6rem,3.6vw,2.4rem)] font-semibold leading-snug text-ink"
            style={{ textWrap: 'balance' }}
          >
            先收下来，再慢慢归置。
          </h2>
        </hgroup>
        <a
          href="#demo"
          className="lp-btn lp-btn-ghost inline-flex h-9 w-fit items-center gap-1 rounded-md pl-3 pr-2"
        >
          <span className="text-[13px]">看看它怎么做</span>
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
                  <div
                    className="relative py-7"
                    style={{ animation: 'lp-fade 0.35s var(--ease-soft)' }}
                  >
                    <DotPattern />
                    <div className="relative">
                      <h3 className="text-[20px] font-semibold text-ink">{f.title}</h3>
                      <p className="mt-2 max-w-[40ch] text-[13.5px] leading-relaxed text-ink-soft">
                        {f.body}
                      </p>
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
        <div
          className="relative flex min-h-[340px] items-center justify-center p-6 sm:p-10 lg:col-span-7"
          style={{ borderLeft: `1px dashed ${LINE}` }}
        >
          <div
            key={current.id}
            className="w-full max-w-[420px]"
            style={{ animation: 'lp-fade 0.4s var(--ease-soft)' }}
          >
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
      <VignetteCard label="刚刚收进一件东西">
        {/* 取景框：四角括号 + 识别结果卡 */}
        <div
          className="relative mx-auto h-[180px] w-full rounded-lg"
          style={{ border: `1px dashed ${LINE}` }}
        >
          {(
            [
              'left-2 top-2 border-l-2 border-t-2',
              'right-2 top-2 border-r-2 border-t-2',
              'left-2 bottom-2 border-l-2 border-b-2',
              'right-2 bottom-2 border-r-2 border-b-2',
            ] as const
          ).map((pos) => (
            <span key={pos} aria-hidden className={`absolute size-4 border-lp-brand ${pos}`} />
          ))}
          <div
            className="absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-lg p-4"
            style={{
              backgroundColor: 'var(--surface)',
              border: `1px solid var(--border)`,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <span className="text-[10px] text-lp-brand">已识别</span>
            <div className="mt-1 text-[15px] font-semibold text-ink">白瓷盖碗</div>
            <div className="mt-2 flex gap-1.5">
              {['茶具', '厨房', '易碎'].map((t) => (
                <span
                  key={t}
                  className="rounded px-1.5 py-0.5 text-[10px] text-ink-soft"
                  style={{ backgroundColor: 'var(--surface-tertiary)' }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </VignetteCard>
    );
  }
  if (id === 'poem') {
    return (
      <VignetteCard label="翻开一件物品时">
        <div className="px-2 py-6 text-center">
          <p className="text-[19px] font-serif leading-loose text-ink">
            「杯沿的一道细纹，
            <br />
            是去年冬天的事了。」
          </p>
          <span className="mt-5 block text-[11px] text-ink-faint">—— 写给：白瓷盖碗</span>
        </div>
      </VignetteCard>
    );
  }
  if (id === 'dust') {
    return (
      <VignetteCard label="已经 218 天没有翻动">
        <div
          className="relative rounded-lg p-5"
          style={{ backgroundColor: 'var(--surface)', border: `1px solid var(--border)` }}
        >
          {/* 灰膜：自上而下的暖灰渐变盖在卡片上 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-lg"
            style={{
              background:
                'linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 9%, transparent), transparent 65%)',
            }}
          />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold text-ink">《百年孤独》</div>
              <span className="mt-1 block text-[11px] text-ink-faint">书房 · 第三层书架</span>
            </div>
            <Wind size={18} className="text-ink-faint" />
          </div>
          <div
            className="mt-4 h-1 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'var(--border)' }}
          >
            <div className="h-full w-[72%] rounded-full bg-lp-brand opacity-45" />
          </div>
          <div className="mt-4 flex gap-2">
            <span
              className="rounded-md px-2.5 py-1 text-[11px] text-ink"
              style={{ border: `1px solid ${LINE}` }}
            >
              拂去灰尘
            </span>
            <span className="rounded-md px-2.5 py-1 text-[11px] text-ink-faint">让它停着</span>
          </div>
        </div>
      </VignetteCard>
    );
  }
  return (
    <VignetteCard label="齐默默很少主动开口">
      <div className="flex flex-col gap-3 py-2">
        <div
          className="max-w-[80%] self-start rounded-xl rounded-bl-sm px-4 py-3"
          style={{ backgroundColor: 'color-mix(in oklab, var(--success) 16%, var(--surface) 84%)' }}
        >
          <p className="text-[13.5px] font-serif leading-relaxed text-ink">
            创可贴在药盒第二格。上次用，是三月你切到手指那回。
          </p>
        </div>
        <span className="self-start pl-1 text-[10px] text-ink-faint">齐默默 · 仅在被问起时</span>
        <div
          className="mt-2 flex items-center gap-2 self-end rounded-full px-3 py-1.5"
          style={{ border: `1px solid ${LINE}` }}
        >
          <span className="text-[11px] text-ink-soft">创可贴放哪了？</span>
        </div>
      </div>
    </VignetteCard>
  );
}

function VignetteCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative">
      <span className="mb-3 block text-[11px] text-ink-faint">{label}</span>
      {children}
    </div>
  );
}

// ─── 产品演示（CSS 框选窗口）───────────────────────────────────────────────────

function Demo() {
  return (
    <section id="demo" className="px-6 py-16 sm:px-10">
      <Reveal className="relative mx-auto max-w-[980px]">
        <Link
          to="/home"
          className="lp-btn absolute -top-4 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 shadow-float"
          style={{ backgroundColor: 'var(--surface)', border: `1px solid ${LINE}` }}
        >
          <span
            className="grid h-5 w-5 place-items-center rounded-full"
            style={{ backgroundColor: LP.chrome }}
          >
            <Play size={10} style={{ color: LP.chromeFg }} />
          </span>
          <span className="text-[12px] text-ink">进去看看</span>
        </Link>
        <AppWindow />
        <span className="mt-4 block text-center text-[12px] text-ink-faint">
          房间、物品，还有那些怕忘记的小事，都先替你放在这里。
        </span>
      </Reveal>
    </section>
  );
}

function AppWindow() {
  const chips = ['lavender', 'peach', 'sage', 'pink'];
  const rooms = ['lavender', 'peach', 'sage', 'mist', 'pink'];
  return (
    <div
      className="relative isolate overflow-hidden rounded-[14px]"
      style={{
        border: `1px solid ${LINE}`,
        backgroundColor: 'var(--surface)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-9 z-0 h-16 overflow-hidden">
        <PatternField
          variant="ticks"
          opacity={0.16}
          mask="linear-gradient(to right, transparent, #000 18%, #000 82%, transparent)"
        />
      </div>
      <div
        className="relative z-10 flex h-9 items-center gap-2 px-4"
        style={{ backgroundColor: 'var(--surface-secondary)', borderBottom: `1px solid ${LINE}` }}
      >
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--danger)' }} />
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--warning)' }} />
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
        <span className="mx-auto text-[12px] text-ink-soft">滴茶 — 我的小窝</span>
      </div>
      <div className="relative z-10 flex h-[360px] sm:h-[420px]">
        <div
          className="hidden w-[68px] shrink-0 flex-col items-center gap-4 py-5 sm:flex"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          <span
            className="grid h-8 w-8 place-items-center rounded-md"
            style={{ backgroundColor: LP.chrome, color: LP.chromeFg }}
          >
            <BrandMark className="h-4 w-6" />
          </span>
          {[0, 1, 2, 3].map((k) => (
            <span
              key={k}
              className="h-7 w-7 rounded-lg"
              style={{ backgroundColor: 'color-mix(in oklab, var(--accent-foreground) 6%, transparent)' }}
            />
          ))}
        </div>
        <div className="flex-1 overflow-hidden p-7">
          <div className="text-[16px] font-semibold font-serif text-ink">早，Serena。</div>
          <span className="mt-0.5 block text-[11px] text-ink-faint">
            东西归位了，心里也静下来了。
          </span>
          <div className="mt-6 grid grid-cols-4 gap-3">
            {chips.map((c, i) => (
              <div
                key={i}
                className="rounded-xl p-3"
                style={{ border: `1px solid var(--border)`, backgroundColor: 'var(--surface)' }}
              >
                <span
                  className="mb-2 block h-6 w-6 rounded-full"
                  style={{ backgroundColor: chipColor(c) }}
                />
                <span
                  className="block h-2.5 w-8 rounded"
                  style={{ backgroundColor: accentColor(c) }}
                />
                <span
                  className="mt-1.5 block h-1.5 w-10 rounded"
                  style={{ backgroundColor: 'var(--border)' }}
                />
              </div>
            ))}
          </div>
          <span className="mt-6 block text-[11px] text-ink-faint">我的收纳空间</span>
          <div className="mt-2.5 flex gap-3">
            {rooms.map((c, i) => (
              <div
                key={i}
                className="h-24 w-[96px] shrink-0 rounded-xl"
                style={{ backgroundColor: chipColor(c), border: `1px solid var(--border)` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 规格读数 ──────────────────────────────────────────────────────────────────

function SpecPanel() {
  return (
    <section className="relative isolate flex flex-wrap overflow-hidden">
      <PatternField
        variant="ledger"
        opacity={0.14}
        mask="linear-gradient(to right, #000, transparent 72%)"
      />
      {SPECS.map((s, i) => (
        <div key={s.k} className="relative z-10 min-w-[150px] flex-1 px-7 py-7">
          {i !== 0 && (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 border-l border-dashed"
              style={{ borderColor: LINE }}
            />
          )}
          <span className="text-[11px] tracking-wider text-ink-faint">{s.k}</span>
          <span className="mt-2 block text-[18px] font-semibold text-ink">{s.v}</span>
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
          <span className="text-[12px] text-lp-brand">房间</span>
          <h2 className="mt-1.5 text-[clamp(1.6rem,3.6vw,2.6rem)] font-semibold text-ink">
            每样东西，都有能安放的地方。
          </h2>
        </div>
        <span className="hidden text-[12px] text-ink-faint sm:block">06 间</span>
      </div>
      <HRule />
      <div className="grid grid-cols-2 lg:grid-cols-3">
        {ROOMS.map((r, i) => (
          <RoomCell key={r.id} room={r} index={i} />
        ))}
      </div>
    </section>
  );
}

function RoomCell({ room: r, index }: { room: (typeof ROOMS)[number]; index: number }) {
  const Icon = r.icon;
  const isMore = r.id === 'more';
  return (
    <Reveal
      as="article"
      delay={(index % 3) * 60}
      className="group relative px-8 py-9 transition-colors hover:bg-surface-alt"
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 border-r border-dashed"
        style={{ borderColor: LINE }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 border-b border-dashed"
        style={{ borderColor: LINE }}
      />
      <div className="flex items-start justify-between">
        <span
          className="grid h-11 w-11 place-items-center rounded-xl"
          style={{
            backgroundColor: isMore ? 'transparent' : chipColor(r.tint),
            border: isMore ? `1px dashed ${LINE}` : 'none',
          }}
        >
          <Icon
            size={20}
            style={{ color: isMore ? 'var(--field-placeholder)' : accentColor(r.tint) }}
          />
        </span>
        <span className="text-[12px] text-ink-faint">{r.no}</span>
      </div>
      <h3 className="mt-4 text-[18px] font-semibold text-ink">{r.label}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{r.caption}</p>
      {!isMore && (
        <span className="mt-4 inline-flex items-center text-ink-soft transition-colors group-hover:text-ink">
          <span className="text-[12px]">进入</span>
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
      <div
        className="grid grid-cols-1 gap-px lg:grid-cols-3 lg:grid-rows-2"
        style={{ backgroundColor: LINE }}
      >
        {/* 大金句卡（左列跨两行）*/}
        <Reveal className="bg-surface relative isolate overflow-hidden p-8 sm:p-10 lg:col-span-2 lg:row-span-2">
          <GridPattern />
          <span className="text-[12px] text-lp-brand">为什么</span>
          <p
            className="mt-5 font-serif leading-[1.55] text-ink"
            style={{ fontSize: 'clamp(1.15rem,2.2vw,1.6rem)' }}
          >
            像滴茶一样，一点一点地，把日子放好。
          </p>
          <p
            className="mt-5 font-serif leading-[1.55] text-ink"
            style={{ fontSize: 'clamp(1.55rem,3.2vw,2.65rem)' }}
          >
            东西不是数字，也不该只是清单上的一行字。你放进一件衬衫，它会变成衣橱里
            <Mark tint="lavender">一抹蓝</Mark>
            ，挂在那里，连着某一天的心情；那本三年没翻的书，边上真的<Mark tint="mist">落了灰</Mark>
            ，摸得到，也不用急着解释为什么还留着。
          </p>
          <p className="mt-6 max-w-[40ch] text-[13px] leading-relaxed text-ink-soft">
            没有人催你把一切整理得完美。日子本来就会有一点凌乱。
          </p>
          <p className="mt-2 max-w-[40ch] text-[13px] leading-relaxed text-ink-soft">
            它只是<Mark tint="peach">替你记得</Mark>，也给这些东西留一个慢慢住下来的地方。
          </p>
        </Reveal>

        {/* 四个原则小格 */}
        {PRINCIPLES.map((p, i) => (
          <Reveal as="article" key={p.t} delay={i * 50} className="bg-surface relative p-7">
            <span className="text-[11px] text-ink-faint">0{i + 1}</span>
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
    <div
      aria-hidden
      className="bg-surface relative isolate hidden min-h-[120px] overflow-hidden lg:block"
    >
      <PatternField
        variant="weave"
        opacity={0.18}
        mask="linear-gradient(to bottom, #000, transparent 92%)"
      />
      <svg className="absolute inset-0 z-0 size-full" style={{ opacity: 0.28, color: RULE }}>
        <defs>
          <pattern
            id={id}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <span
        className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border"
        style={{ borderColor: LINE, backgroundColor: 'var(--surface)' }}
      />
    </div>
  );
}

// ─── 细节台账（清单式，区别于前面的网格）─────────────────────────────────────────

function Extras() {
  return (
    <section className="relative isolate overflow-hidden">
      <PatternField
        variant="ledger"
        opacity={0.1}
        mask="linear-gradient(to bottom, #000, transparent 86%)"
      />
      <div className="relative z-10 px-8 py-9">
        <span className="text-[12px] text-lp-brand">细节台账</span>
        <h2 className="mt-1.5 text-[clamp(1.6rem,3.6vw,2.6rem)] font-semibold text-ink">
          小事不用悬在心上。
        </h2>
      </div>
      <HRule />
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2">
        {EXTRAS.map((e, i) => (
          <Reveal
            as="article"
            key={e.t}
            delay={(i % 2) * 50}
            className="relative flex items-baseline gap-3 px-8 py-5"
          >
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 border-b border-dashed"
              style={{ borderColor: LINE }}
            />
            {i % 2 === 0 && (
              <div
                className="pointer-events-none absolute inset-y-0 right-0 hidden border-r border-dashed lg:block"
                style={{ borderColor: LINE }}
              />
            )}
            <span className="shrink-0 size-1.5 rotate-45 border" style={{ borderColor: LINE }} />
            <span className="shrink-0 text-[15px] font-semibold text-ink">{e.t}</span>
            <span
              aria-hidden
              className="mx-1 flex-1 border-b border-dotted"
              style={{ borderColor: LINE, transform: 'translateY(-3px)' }}
            />
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
      <div className="relative isolate overflow-hidden px-8 py-12 lg:col-span-4">
        <PatternField
          variant="weave"
          opacity={0.16}
          mask="linear-gradient(to right, #000, transparent 82%)"
        />
        <span className="relative z-10 text-[12px] text-lp-brand">来自作者</span>
        <div className="relative z-10 mt-6 flex items-center gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl"
            style={{ backgroundColor: 'color-mix(in oklab, var(--success) 16%, var(--surface) 84%)' }}
          >
            <MessageSquareText size={22} style={{ color: 'var(--success)' }} />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-ink">齐默默</div>
            <span className="text-[11px] text-ink-faint">引导者 · 作者</span>
          </div>
        </div>
      </div>
      <Reveal className="relative isolate overflow-hidden px-8 py-12 lg:col-span-8">
        <PatternField
          variant="ticks"
          opacity={0.09}
          mask="linear-gradient(to left, #000, transparent 76%)"
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 hidden border-l border-dashed lg:block"
          style={{ borderColor: LINE }}
        />
        <blockquote className="relative z-10 text-[clamp(1.15rem,2.2vw,1.5rem)] font-serif leading-loose text-ink">
          <p>
            「有时候收拾，有时候乱着。很少问自己：<Mark tint="mist">这些东西，为什么还留着？</Mark>
            」
          </p>
          <p className="mt-5">
            「滴茶不是要你更自律。它就是一个<Mark tint="lavender">安静的角落</Mark>
            。东西有地方放了，你也就慢慢，住下来了。」
          </p>
        </blockquote>
        <span className="relative z-10 mt-8 block text-[13px] text-ink-soft">
          —— 齐默默，写于滴茶的第一个清晨
        </span>
      </Reveal>
    </section>
  );
}

// ─── 收尾 CTA ──────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="relative px-8 py-24 text-center">
      <Reveal>
        <h2
          className="font-medium font-serif leading-tight text-ink"
          style={{ fontSize: 'clamp(2.2rem,5.5vw,3.8rem)' }}
        >
          推开门，进来坐坐。
        </h2>
        <p
          className="mx-auto mt-4 max-w-[36ch] text-[15px] text-ink-soft"
          style={{ textWrap: 'balance' }}
        >
          在忙忙碌碌的日子里，给自己留一个安静的、住得下来的地方。
        </p>
        <div className="mt-9 flex items-center justify-center gap-3">
          <Link
            to="/home"
            className="lp-btn lp-btn-primary inline-flex items-center rounded-md px-5 py-3"
          >
            <span className="text-[15px] font-medium">开始入住</span>
            <Key onDark>D</Key>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

// ─── 页脚 ──────────────────────────────────────────────────────────────────────

const FOOT_COLS: { h: string; items: { label: string; ext?: boolean }[] }[] = [
  {
    h: '产品',
    items: [{ label: '功能' }, { label: '房间' }, { label: '齐默默' }, { label: '更新日志' }],
  },
  {
    h: '资源',
    items: [{ label: '使用指南' }, { label: '常见问题' }, { label: '开源' }, { label: '反馈' }],
  },
  {
    h: '公司',
    items: [{ label: '理念' }, { label: '团队' }, { label: '博客' }, { label: '联系我们' }],
  },
  {
    h: '社交',
    items: [
      { label: '微博', ext: true },
      { label: '小红书', ext: true },
      { label: 'GitHub', ext: true },
      { label: 'X', ext: true },
    ],
  },
];

/** 页脚底部装饰带：border-t + 45° 斜纹 + 渐隐水平刻线 + 低透明 logo mark
    （负 margin 伸出 container，由父级 overflow-clip 裁掉下缘；移动端少裁切）。 */
function FooterBand() {
  const id = useId().replace(/:/g, '');
  return (
    <div
      className="lp-footer-band relative col-span-full flex w-full justify-center border-t"
      style={{ borderColor: LP.footHair }}
    >
      <svg
        aria-hidden
        className="lp-footer-band-slash pointer-events-none absolute inset-0 size-full opacity-30"
      >
        <defs>
          <pattern
            id={id}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <div aria-hidden className="lp-footer-band-ticks pointer-events-none absolute inset-0" />
      <BrandMark className="lp-footer-wordmark select-none" />
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
        <Ruler
          side="right"
          color={LP.footRail}
          segs={[{ f: 2.2 }, { f: 3.4, dash: true }, { f: 1.8 }]}
        />
      </span>
      <span className="relative z-[1] hidden flex-1 lg:block">
        <Ruler
          side="right"
          color={LP.footRail}
          segs={[{ f: 3.1 }, { f: 2.2, dash: true }, { f: 2.8 }]}
        />
      </span>

      <div className="lp-container-max-w relative z-[1] max-md:min-w-0 flex-1 [--node-horizontal-offset:-3.5px]">
        <Node pos="top-left" className="hidden lg:block" />
        <Node pos="top-right" className="hidden lg:block" />
        <div className="lp-footer-clip relative isolate size-full overflow-clip">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4 lg:grid-cols-6 lg:gap-6 lg:divide-x lg:divide-[var(--lp-footer-divide)]">
            {/* 第 1 列：品牌 + 短 hr + 法务 */}
            <div className="flex flex-col px-5 py-8 sm:col-span-2 lg:py-10 lg:pl-6">
              <div className="flex items-center gap-2">
                <BrandMark className="h-5 w-[30px]" style={{ color: LP.chromeFg }} />
                <span
                  className="text-[16px] font-semibold font-serif"
                  style={{ color: LP.chromeFg }}
                >
                  滴茶
                </span>
              </div>
              <BrandMark
                className="mt-4 h-9 w-[54px] opacity-[0.65]"
                style={{ color: LP.footMuted }}
              />
              <span className="mt-2 block text-[12px]" style={{ color: LP.footMuted }}>
                dicha © 2026
              </span>
              <hr className="my-3 w-20 border-t" style={{ borderColor: LP.footHair }} />
              <Link to="/home" className="lp-foot-link w-fit">
                <span className="text-[12px]">已有账号？登录</span>
              </Link>
              <span className="mt-3 block text-[11px]" style={{ color: LP.footFaint }}>
                服务条款 · 隐私政策
              </span>
            </div>
            {FOOT_COLS.map((c) => (
              <div key={c.h} className="flex flex-col gap-4 px-5 py-4 md:py-8 lg:py-10">
                <span className="text-[12px] font-semibold" style={{ color: LP.chromeFg }}>
                  {c.h}
                </span>
                <ul className="flex flex-col gap-3">
                  {c.items.map((it) => (
                    <li key={it.label}>
                      <a href="#about" className="lp-foot-link">
                        <span className="text-[12px]">{it.label}</span>
                        {it.ext && (
                          <span
                            aria-hidden
                            className="ml-2 text-[12px]"
                            style={{ color: LP.footFaint }}
                          >
                            ↗
                          </span>
                        )}
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
        <Ruler
          side="left"
          color={LP.footRail}
          segs={[{ f: 1.9, dash: true }, { f: 3.6 }, { f: 2.4 }]}
        />
      </span>
      <span className="relative z-[1] w-4 shrink-0 sm:w-6 md:w-12">
        <Ruler
          side="left"
          color={LP.footRail}
          segs={[{ f: 2.7 }, { f: 1.6 }, { f: 3.9, dash: true }]}
        />
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
