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
import { Surface } from '@/components/Surface';
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

/** 功能性柔彩图标圆片 — 强调色只在这里出现。 */
function IconChip({ tint, children }: { tint: Tint; children: React.ReactNode }) {
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center mb-3"
      style={{ backgroundColor: `var(--chip-${tint})`, color: `var(--accent-${tint})` }}
    >
      {children}
    </div>
  );
}

// ─── A1 — 问候 header 区块（约 300px 高，留白让 hero 完整露出）───────────────────
function TopBar() {
  return (
    <header className="relative z-10 min-h-[300px] px-8 pt-8">
      <div className="flex items-center gap-2">
        <Sun size={20} className="text-peach" />
        <h1 className="text-xl font-bold text-ink">早安，{DEV_NAME}</h1>
      </div>
      <p className="text-sm text-ink-soft mt-0.5 pl-7">有序的空间，安定的心。今天也很棒</p>
      <div className="text-sm text-ink-soft mt-1.5 pl-7">
        5月 20日 · 星期二 · 22°C 多云转晴
      </div>
    </header>
  );
}

// ─── A2 ───────────────────────────────────────────────────────────────────────
function TodayOverview() {
  const { t } = useTranslation();
  return (
    <section className="px-8">
      <h2 className="text-sm font-semibold text-ink-soft mb-3">{t('dashboard.todayOverview')}</h2>
      <div className="grid grid-cols-4 gap-4">
        {WIDGETS.map((w) => {
          const Icon = w.icon;
          return (
            <Surface key={w.key} variant="card" className="p-4">
              <IconChip tint={w.tint}>
                <Icon size={18} />
              </IconChip>
              <div className="text-xs font-semibold text-ink-soft mb-1">{w.label}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-ink">{w.value}</span>
                {w.unit ? <span className="text-xs text-ink-faint">{w.unit}</span> : null}
              </div>
              <div className="text-xs text-ink-faint mt-1">{w.sub}</div>
            </Surface>
          );
        })}
      </div>
    </section>
  );
}

// ─── A3 ───────────────────────────────────────────────────────────────────────
function SpaceCard({ space }: { space: Space }) {
  const Icon = space.icon;
  // 整图卡：生活照绝对铺满 + 底部 scrim 压字 + 左上 frosted 图标圆片。
  const inner = (
    <Surface
      variant="card"
      className="relative w-[150px] h-[180px] shrink-0 overflow-hidden"
    >
      {/* fallback 底色（图未加载/失败时不空） */}
      <div className="absolute inset-0" style={{ backgroundColor: `var(--chip-${space.tint})` }} />
      <img
        src={space.img}
        alt={space.label}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* 底部暖色 scrim 保证白字可读 */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
      {/* 左上分类图标圆片 — chip 底 + accent 图标色（柔面哑光，无玻璃模糊） */}
      <div
        className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `var(--chip-${space.tint})` }}
      >
        <Icon size={14} style={{ color: `var(--accent-${space.tint})` }} />
      </div>
      {/* 底部白字 */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="text-white text-sm font-semibold truncate">{space.label}</div>
        <div className="text-white/80 text-xs mt-0.5">{space.count}</div>
      </div>
    </Surface>
  );

  if (space.to === '/wardrobe' || space.to === '/library') {
    // disabled / coming soon → toast
    return (
      <button type="button" onClick={() => toast.info('即将开放')} className="text-left">
        {inner}
      </button>
    );
  }
  if (space.to) {
    return (
      <Link to={space.to} className="block">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => toast.info('即将开放')} className="text-left">
      {inner}
    </button>
  );
}

function MySpaces() {
  const { t } = useTranslation();
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-soft mb-3 px-8">我的收纳空间</h2>
      <ScrollArea orientation="horizontal" className="flex gap-3 px-8 pb-1">
        {SPACES.map((space) => (
          <SpaceCard key={space.key} space={space} />
        ))}
        <button
          type="button"
          onClick={stub}
          className="w-[150px] h-[180px] shrink-0 rounded-card border border-dashed border-hairline flex flex-col items-center justify-center text-ink-faint hover:bg-surface-alt transition-colors"
        >
          <Plus size={20} />
          <span className="text-xs mt-1">{t('dashboard.addSpace')}</span>
        </button>
      </ScrollArea>
    </section>
  );
}

// ─── A4 ───────────────────────────────────────────────────────────────────────
function RecentAdded() {
  const { t } = useTranslation();
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-soft mb-3 px-8">{t('dashboard.recentAdded')}</h2>
      <ScrollArea orientation="horizontal" className="flex gap-3 px-8 pb-1">
        {RECENT_ITEMS.map((item) => (
          <Surface key={item.key} variant="card" className="w-[150px] shrink-0 overflow-hidden">
            <div className="relative h-28" style={{ backgroundColor: `var(--chip-${item.tint})` }}>
              <img
                src={item.img}
                alt={item.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <div className="text-sm font-semibold text-ink truncate">{item.name}</div>
              <div className="text-xs text-ink-faint mt-0.5">{item.tag}</div>
              <div className="text-xs text-ink-faint">{item.time}</div>
            </div>
          </Surface>
        ))}
        <button
          type="button"
          onClick={stub}
          className="w-[150px] shrink-0 rounded-card border border-dashed border-hairline flex flex-col items-center justify-center text-ink-faint hover:bg-surface-alt transition-colors min-h-[120px]"
        >
          <Plus size={20} />
          <span className="text-xs mt-1">{t('dashboard.recordNew')}</span>
        </button>
      </ScrollArea>
    </section>
  );
}

// ─── A5/1 ─────────────────────────────────────────────────────────────────────
function Reminders() {
  const { t } = useTranslation();
  return (
    <Surface variant="card" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-ink-soft">{t('dashboard.reminders')}</div>
        <button type="button" onClick={stub} className="text-xs text-ink-faint hover:text-ink-soft">
          {t('dashboard.viewAll')}
        </button>
      </div>
      <div className="space-y-2.5">
        {REMINDERS.map((r) => (
          <div key={r.key} className="flex items-start gap-2.5">
            <span className="mt-0.5 w-4 h-4 shrink-0 rounded border border-hairline" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-ink">{r.text}</div>
              <div className={`text-xs ${r.urgent ? 'text-pink' : 'text-ink-faint'}`}>{r.due}</div>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

// ─── A5/2 ─────────────────────────────────────────────────────────────────────
function Reading() {
  const { t } = useTranslation();
  return (
    <Surface variant="card" className="p-4">
      <div className="text-xs font-semibold text-ink-soft mb-3">{t('dashboard.reading')}</div>
      <div className="flex gap-3">
        <img
          src={READING_COVER}
          alt="《最好的告别》封面"
          loading="lazy"
          className="w-12 h-16 rounded object-cover bg-surface-alt shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">《最好的告别》</div>
          <div className="text-xs text-ink-faint mt-0.5">阿图·葛文德</div>
          <div className="mt-2 h-1.5 rounded-full bg-chip-peach overflow-hidden">
            <div className="h-full w-[68%] rounded-full bg-peach" />
          </div>
          <div className="text-xs text-ink-faint mt-1">68%</div>
        </div>
      </div>
      <button
        type="button"
        onClick={stub}
        className="mt-3 w-full py-2 rounded-lg border border-hairline text-sm text-ink hover:bg-surface-alt transition-colors"
      >
        {t('dashboard.continueReading')}
      </button>
    </Surface>
  );
}

// ─── A5/3 ─────────────────────────────────────────────────────────────────────
function SpaceUsage() {
  const { t } = useTranslation();
  // conic-gradient 累积分段
  const segments: string[] = [];
  let acc = 0;
  for (const u of USAGE) {
    const start = acc;
    acc += u.pct;
    segments.push(`var(--accent-${u.tint}) ${start}% ${acc}%`);
  }
  const conic = `conic-gradient(${segments.join(', ')})`;

  return (
    <Surface variant="card" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-ink-soft">{t('dashboard.spaceUsage')}</div>
        <button type="button" onClick={stub} className="text-xs text-ink-faint hover:text-ink-soft">
          {t('dashboard.viewAll')}
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="relative w-28 h-28 rounded-full shrink-0"
          style={{ background: conic }}
        >
          <div className="absolute inset-[14px] rounded-full bg-surface flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-ink leading-none">{USAGE_TOTAL}</span>
            <span className="text-xs text-ink-faint mt-0.5">件物品</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {USAGE.map((u) => (
            <div key={u.key} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: `var(--accent-${u.tint})` }}
              />
              <span className="text-ink flex-1 truncate">{u.label}</span>
              <span className="text-ink-faint">{u.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </Surface>
  );
}

function RightPanel() {
  return (
    <aside className="w-72 shrink-0 flex flex-col gap-4 p-4 overflow-y-auto">
      <Reminders />
      <Reading />
      <SpaceUsage />
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
      className="pointer-events-none absolute top-0 right-0 w-[560px] h-[300px] z-0 bg-no-repeat bg-cover bg-right-top"
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
    <div className="flex h-full min-h-0">
      {/* Main scrollable content */}
      <main className="relative flex-1 overflow-y-auto">
        <HeroDecoration />
        <TopBar />
        <div className="relative z-10 space-y-8 pb-8">
          <TodayOverview />
          <MySpaces />
          <RecentAdded />
        </div>
      </main>

      {/* Right fixed panel */}
      <RightPanel />
    </div>
  );
}
