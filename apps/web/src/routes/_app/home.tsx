import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Sun,
  ShieldCheck,
  AlarmClock,
  Flame,
  Smile,
  Shirt,
  BookOpen,
  Package,
  Refrigerator,
  Pill,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashCard, DashCardHeader, DashCardSlash } from '@/components/DashCard';
import { ScrollArea } from '@/components/ScrollArea';
import { useTheme } from '@/lib/hooks/useTheme';

// ─── Unsplash 占位图（暖调极简实拍；真实摄影管线独立跟进）──────────────────────
// 全部 URL 已 curl -I 验证 200。直链格式（不用已废弃的 source.unsplash.com）。
const UNSPLASH = (id: string, w = 400) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export const Route = createFileRoute('/_app/home')({
  component: DashboardPage,
});

// ─── Hardcoded dev mock data for M1 skeleton ──────────────────────────────────
const DEV_NAME = 'Serena';

type Tint = 'lavender' | 'peach' | 'sage' | 'pink' | 'mist';

// A2 — 今天概览 widgets
type Widget = {
  key: string;
  icon: LucideIcon;
  tint: Tint;
  label: string;
  value: string;
  unit?: string;
  sub: string;
};
const WIDGETS: Widget[] = [
  {
    key: 'record',
    icon: ShieldCheck,
    tint: 'lavender',
    label: '记录物品',
    value: '12',
    unit: '件',
    sub: '比昨天 +5',
  },
  {
    key: 'reminder',
    icon: AlarmClock,
    tint: 'peach',
    label: '待处理提醒',
    value: '8',
    unit: '件',
    sub: '有 2 件今天到期',
  },
  {
    key: 'streak',
    icon: Flame,
    tint: 'sage',
    label: '连续记录',
    value: '23',
    unit: '天',
    sub: '继续保持！',
  },
  {
    key: 'mood',
    icon: Smile,
    tint: 'pink',
    label: '心情',
    value: '平静',
    sub: '记录此刻心情 →',
  },
];

// A3 — 我的收纳空间
type SpaceTo = '/wardrobe' | '/library' | '/storage-room';
type Space = {
  key: string;
  label: string;
  count: string;
  icon: LucideIcon; // 左上 frosted 圆片 + 图未加载时的 fallback
  tint: Tint;
  img: string; // 生活照（封面整图）
  to: SpaceTo | null;
};
const SPACES: Space[] = [
  { key: 'wardrobe', label: '衣橱', count: '298 件物品', icon: Shirt, tint: 'lavender', img: UNSPLASH('1558997519-83ea9252edf8'), to: '/wardrobe' },
  { key: 'library', label: '书房', count: '156 件', icon: BookOpen, tint: 'peach', img: UNSPLASH('1507842217343-583bb7270b66'), to: '/library' },
  { key: 'storage', label: '杂物间', count: '89 件', icon: Package, tint: 'sage', img: UNSPLASH('1493934558415-9d19f0b2b4d2'), to: '/storage-room' },
  { key: 'kitchen', label: '厨房·冰箱', count: '64 件', icon: Refrigerator, tint: 'mist', img: UNSPLASH('1571175443880-49e1d25b2bc5'), to: null },
  { key: 'meds', label: '药盒', count: '27 件', icon: Pill, tint: 'pink', img: UNSPLASH('1584308666744-24d5c474f2ae'), to: null },
];

// A4 — 最近添加
type RecentItem = {
  key: string;
  name: string;
  tag: string;
  time: string;
  tint: Tint; // 图未加载时的 fallback 底色
  img: string;
};
const RECENT_ITEMS: RecentItem[] = [
  { key: 'aesop', name: 'Aesop 香水 Hwyl', tag: '衣橱·饰品', time: '2 小时前', tint: 'peach', img: UNSPLASH('1541643600914-78b084683601') },
  { key: 'kinfolk', name: '《KINFOLK》', tag: '书房·书籍', time: '昨天', tint: 'lavender', img: UNSPLASH('1544716278-ca5e3f4abd8c') },
  { key: 'pourover', name: '手冲咖啡杯', tag: '厨房·器具', time: '昨天', tint: 'mist', img: UNSPLASH('1495474472287-4d71bcdd2085') },
  { key: 'linen', name: '亚麻四件套', tag: '衣橱·床品', time: '2 天前', tint: 'sage', img: UNSPLASH('1522771739844-6a9f6d5f14af') },
  { key: 'leica', name: 'Leica M6', tag: '书房·收藏', time: '2 天前', tint: 'pink', img: UNSPLASH('1452780212940-6f5c0d14d848') },
];

// A5/2 — 在读书籍封面
const READING_COVER = UNSPLASH('1512820790803-83ca734da794', 200);

// A5/1 — 近期提醒
type Reminder = { key: string; text: string; due: string; urgent?: boolean };
const REMINDERS: Reminder[] = [
  { key: 'vitd', text: '药品：维生素 D 需补充', due: '今天到期', urgent: true },
  { key: 'milk', text: '冰箱：牛奶 还有 2 天过期', due: '5月22' },
  { key: 'book', text: '图书馆借阅书籍 归还', due: '5月25' },
  { key: 'airpods', text: 'AirPods Pro 2 清洁保养', due: '5月27' },
];

// A5/3 — 空间使用情况
type UsageSlice = { key: string; label: string; pct: number; tint: Tint };
const USAGE: UsageSlice[] = [
  { key: 'wardrobe', label: '衣橱', pct: 47, tint: 'lavender' },
  { key: 'library', label: '书房', pct: 25, tint: 'peach' },
  { key: 'storage', label: '杂物间', pct: 14, tint: 'mist' },
  { key: 'kitchen', label: '厨房·冰箱', pct: 10, tint: 'sage' },
  { key: 'meds', label: '药盒', pct: 4, tint: 'pink' },
];
const USAGE_TOTAL = 634;

// ─── helpers ─────────────────────────────────────────────────────────────────
const stub = () => toast.info('录入功能即将开放');

function DashSectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="app-dash-section mb-3">{children}</h2>;
}

/** 功能性柔彩图标圆片 */
function IconChip({ tint, children, className = '' }: { tint: Tint; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`dash-card-chip ${className}`}
      style={{ backgroundColor: `var(--chip-${tint})`, color: `var(--accent-${tint})` }}
    >
      {children}
    </span>
  );
}

// ─── A1 — 问候 header 区块 ────────────────────────────────────────────────────
function TopBar() {
  return (
    <header className="app-dash-pad relative z-10 min-h-[128px] pt-4 sm:min-h-[200px] sm:pt-6 lg:min-h-[260px] lg:pt-7">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[min(100%,300px)] bg-gradient-to-r from-canvas from-55% via-canvas/88 to-transparent sm:from-45%"
      />
      <div className="relative max-w-xl">
        <p className="app-mono text-[11px] uppercase tracking-wider text-ink-faint">Dashboard</p>
        <div className="mt-2 flex items-center gap-2">
          <Sun size={18} className="shrink-0 text-peach" />
          <h1 className="text-lg font-bold tracking-tight text-ink sm:text-xl">早安，{DEV_NAME}</h1>
        </div>
        <p className="app-mono mt-1 pl-6 text-[13px] leading-snug text-ink-soft">有序的空间，安定的心。今天也很棒</p>
        <p className="app-mono mt-1 pl-6 text-[12px] leading-snug text-ink-faint">5月 20日 · 星期二 · 22°C 多云转晴</p>
      </div>
    </header>
  );
}

// ─── A2 ───────────────────────────────────────────────────────────────────────
function TodayOverview() {
  const { t } = useTranslation();
  return (
    <section className="app-dash-pad">
      <DashSectionTitle>{t('dashboard.todayOverview')}</DashSectionTitle>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-2.5 lg:grid-cols-4 lg:gap-3">
        {WIDGETS.map((w) => {
          const Icon = w.icon;
          return (
            <DashCard key={w.key} variant="stat">
              <div className="dash-card-stat-row">
                <div className="min-w-0 flex-1">
                  <div className="app-mono mb-2 text-[10px] uppercase tracking-wide text-ink-soft sm:text-[11px]">
                    {w.label}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="dash-card-stat-value text-xl font-bold text-ink sm:text-2xl">{w.value}</span>
                    {w.unit ? <span className="app-mono text-[10px] text-ink-faint sm:text-[11px]">{w.unit}</span> : null}
                  </div>
                  <div className="app-mono mt-1.5 text-[10px] leading-snug text-ink-faint sm:text-[11px]">{w.sub}</div>
                </div>
                <IconChip tint={w.tint}>
                  <Icon size={15} />
                </IconChip>
              </div>
            </DashCard>
          );
        })}
      </div>
    </section>
  );
}

// ─── A3 ───────────────────────────────────────────────────────────────────────
function SpaceCard({ space }: { space: Space }) {
  const Icon = space.icon;
  const cardClass = 'dash-card-scroll-item dash-card-scroll-item--space h-full';
  const body = (
    <>
      <div className="dash-card-media-img">
        <div className="absolute inset-0" style={{ backgroundColor: `var(--chip-${space.tint})` }} />
        <img src={space.img} alt={space.label} loading="lazy" className="absolute inset-0 size-full object-cover" />
        <div className="dash-card-space-overlay absolute inset-x-0 bottom-0 top-1/3" />
        <span
          className="dash-card-chip absolute left-2 top-2"
          style={{ backgroundColor: `var(--chip-${space.tint})`, color: `var(--accent-${space.tint})` }}
        >
          <Icon size={13} />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
          <div className="app-mono truncate text-[13px] font-semibold text-white">{space.label}</div>
          <div className="app-mono mt-0.5 text-[10px] text-white/75 sm:text-[11px]">{space.count}</div>
        </div>
      </div>
    </>
  );

  if (space.to === '/wardrobe' || space.to === '/library') {
    return (
      <DashCard
        as="button"
        type="button"
        variant="media"
        className={cardClass}
        interactive
        onClick={() => toast.info('即将开放')}
      >
        {body}
      </DashCard>
    );
  }
  if (space.to) {
    return (
      <DashCard as={Link} to={space.to} variant="media" className={cardClass} interactive>
        {body}
      </DashCard>
    );
  }
  return (
    <DashCard as="button" type="button" variant="media" className={cardClass} interactive onClick={() => toast.info('即将开放')}>
      {body}
    </DashCard>
  );
}

function MySpaces() {
  const { t } = useTranslation();
  return (
    <section>
      <div className="app-dash-pad mb-3">
        <DashSectionTitle>我的收纳空间</DashSectionTitle>
      </div>
      <ScrollArea orientation="horizontal" className="app-dash-pad flex gap-2 pb-1 sm:gap-2.5">
        {SPACES.map((space) => (
          <SpaceCard key={space.key} space={space} />
        ))}
        <DashCard
          as="button"
          type="button"
          variant="dashed"
          interactive
          className="dash-card-scroll-item dash-card-scroll-item--space dash-card-scroll-item--dashed flex min-h-[168px] flex-col items-center justify-center sm:min-h-[195px]"
          onClick={stub}
        >
          <Plus size={18} className="text-ink-faint" />
          <span className="app-mono mt-1.5 text-[10px] text-ink-faint sm:text-[11px]">{t('dashboard.addSpace')}</span>
        </DashCard>
      </ScrollArea>
    </section>
  );
}

// ─── A4 ───────────────────────────────────────────────────────────────────────
function RecentAdded() {
  const { t } = useTranslation();
  return (
    <section>
      <div className="app-dash-pad">
        <DashSectionTitle>{t('dashboard.recentAdded')}</DashSectionTitle>
      </div>
      <ScrollArea orientation="horizontal" className="app-dash-pad flex gap-2 pb-1 sm:gap-2.5">
        {RECENT_ITEMS.map((item) => (
          <DashCard key={item.key} variant="media" className="dash-card-scroll-item" interactive>
            <div className="dash-card-media-img max-h-[108px] sm:max-h-[120px]" style={{ aspectRatio: 'auto' }}>
              <div className="absolute inset-0" style={{ backgroundColor: `var(--chip-${item.tint})` }} />
              <img src={item.img} alt={item.name} loading="lazy" className="absolute inset-0 size-full object-cover" />
            </div>
            <div className="dash-card-media-body">
              <div className="truncate text-[13px] font-semibold text-ink">{item.name}</div>
              <div className="app-mono mt-0.5 truncate text-[10px] text-ink-faint sm:text-[11px]">{item.tag}</div>
              <div className="app-mono mt-0.5 text-[10px] text-ink-faint">{item.time}</div>
            </div>
          </DashCard>
        ))}
        <DashCard
          as="button"
          type="button"
          variant="dashed"
          interactive
          className="dash-card-scroll-item dash-card-scroll-item--dashed flex min-h-[148px] flex-col items-center justify-center sm:min-h-[168px]"
          onClick={stub}
        >
          <Plus size={18} className="text-ink-faint" />
          <span className="app-mono mt-1.5 text-[10px] text-ink-faint sm:text-[11px]">{t('dashboard.recordNew')}</span>
        </DashCard>
      </ScrollArea>
    </section>
  );
}

// ─── A5/1 ─────────────────────────────────────────────────────────────────────
function Reminders() {
  const { t } = useTranslation();
  return (
    <DashCard variant="panel">
      <DashCardSlash />
      <DashCardHeader
        title={t('dashboard.reminders')}
        action={
          <button type="button" onClick={stub} className="dash-card-action">
            {t('dashboard.viewAll')}
          </button>
        }
      />
      <div className="space-y-2.5">
        {REMINDERS.map((r) => (
          <div key={r.key} className="flex items-start gap-2.5">
            <span className="dash-card-check" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] leading-snug text-ink">{r.text}</div>
              <div className={`app-mono mt-0.5 text-[11px] ${r.urgent ? 'text-pink' : 'text-ink-faint'}`}>{r.due}</div>
            </div>
          </div>
        ))}
      </div>
    </DashCard>
  );
}

function Reading() {
  const { t } = useTranslation();
  return (
    <DashCard variant="panel">
      <DashCardSlash />
      <DashCardHeader title={t('dashboard.reading')} />
      <div className="flex gap-3">
        <img
          src={READING_COVER}
          alt="《最好的告别》封面"
          loading="lazy"
          className="h-16 w-12 shrink-0 rounded-sm border border-hairline object-cover bg-surface-alt"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink">《最好的告别》</div>
          <div className="app-mono mt-0.5 text-[11px] text-ink-faint">阿图·葛文德</div>
          <div className="dash-card-progress mt-2.5 bg-chip-peach">
            <div className="w-[68%] bg-peach" />
          </div>
          <div className="app-mono mt-1 text-[11px] text-ink-faint">68%</div>
        </div>
      </div>
      <button type="button" onClick={stub} className="lp-btn lp-btn-ghost app-mono mt-3 w-full rounded-md py-2 text-[12px] text-ink">
        {t('dashboard.continueReading')}
      </button>
    </DashCard>
  );
}

function SpaceUsage() {
  const { t } = useTranslation();
  const segments: string[] = [];
  let acc = 0;
  for (const u of USAGE) {
    const start = acc;
    acc += u.pct;
    segments.push(`var(--accent-${u.tint}) ${start}% ${acc}%`);
  }
  const conic = `conic-gradient(${segments.join(', ')})`;

  return (
    <DashCard variant="panel">
      <DashCardSlash />
      <DashCardHeader
        title={t('dashboard.spaceUsage')}
        action={
          <button type="button" onClick={stub} className="dash-card-action">
            {t('dashboard.viewAll')}
          </button>
        }
      />
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative size-[5.5rem] shrink-0 rounded-full sm:size-28" style={{ background: conic }}>
          <div className="absolute inset-[12px] flex flex-col items-center justify-center rounded-full border border-hairline bg-surface sm:inset-[14px]">
            <span className="dash-card-stat-value text-lg font-bold leading-none text-ink">{USAGE_TOTAL}</span>
            <span className="app-mono mt-0.5 text-[10px] text-ink-faint">件物品</span>
          </div>
        </div>
        <div className="w-full flex-1 space-y-1.5 sm:w-auto">
          {USAGE.map((u) => (
            <div key={u.key} className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: `var(--accent-${u.tint})` }} />
              <span className="app-mono min-w-0 flex-1 truncate text-[11px] text-ink">{u.label}</span>
              <span className="app-mono text-[11px] tabular-nums text-ink-faint">{u.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </DashCard>
  );
}

function RightPanelStack({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-2.5 sm:gap-3 ${className}`}>
      <Reminders />
      <Reading />
      <SpaceUsage />
    </div>
  );
}

function RightPanel() {
  return (
    <aside className="hidden w-80 shrink-0 flex-col gap-2.5 overflow-y-auto border-l border-hairline bg-surface-alt/30 p-5 xl:flex">
      <RightPanelStack />
    </aside>
  );
}

// ─── B — hero decoration layer ────────────────────────────────────────────────
// 四条边线性渐隐 + 取交集合成，保证四周都真正柔化（union 会让整块不透明）。
// 左侧（朝问候文字一侧）淡出 ~18%、底部淡出 ~30%、上/右仅轻淡 ~8%，右上实物保持清晰。
const HERO_MASK =
  'linear-gradient(to right, transparent 0%, #000 18%),' +
  'linear-gradient(to left, transparent 0%, #000 8%),' +
  'linear-gradient(to bottom, transparent 0%, #000 8%),' +
  'linear-gradient(to top, transparent 0%, #000 30%)';

function HeroDecoration() {
  const { theme } = useTheme();
  const heroSrc = theme === 'dark'
    ? '/assets/dashboard-hero-dark.png'
    : '/assets/dashboard-hero.png';

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-0 right-0 z-0 h-[160px] w-[min(100%,320px)] bg-right-top bg-no-repeat bg-cover sm:h-[220px] sm:w-[min(100%,420px)] lg:h-[300px] lg:w-[560px]"
      style={{
        backgroundImage: `url(${heroSrc})`,
        WebkitMaskImage: HERO_MASK,
        WebkitMaskComposite: 'source-in',
        maskImage: HERO_MASK,
        maskComposite: 'intersect',
      }}
    />
  );
}

function DashboardPage() {
  return (
    <div className="flex min-h-0 flex-col xl:h-full xl:flex-row">
      <main className="relative min-h-0 flex-1 xl:overflow-y-auto">
        <HeroDecoration />
        <TopBar />
        <div className="relative z-10 space-y-6 pb-6 sm:space-y-8 sm:pb-8">
          <TodayOverview />
          <MySpaces />
          <RecentAdded />
          <section className="app-dash-pad border-t border-hairline pt-6 xl:hidden">
            <RightPanelStack />
          </section>
        </div>
      </main>

      <RightPanel />
    </div>
  );
}
