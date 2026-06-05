import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Bell, ChevronRight, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { GlassPanel } from '@/components/GlassPanel';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

type SpaceTo = '/wardrobe' | '/library' | '/storage-room';

type SpaceItem = {
  key: string;
  label: string;
  count: string;
  to: SpaceTo | null;
};

// ─── Hardcoded dev data for M1 skeleton ────────────────────────────────────
const DEV_NAME = 'Royians';
const SPACES: SpaceItem[] = [
  { key: 'wardrobe', label: '衣橱', count: '248 件物品', to: '/wardrobe' },
  { key: 'library', label: '书房', count: '67 本', to: '/library' },
  { key: 'storage', label: '杂物间', count: '156 件物品', to: '/storage-room' },
  { key: 'report', label: '月度报告', count: '查看本月', to: null },
];

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日'] as const;
const CHECKED_DAYS = new Set([1, 3, 5]); // Mon Wed Fri

function TopBar() {
  const { t } = useTranslation();
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`;

  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-4">
      <div>
        <div className="flex items-center gap-2">
          <Sun size={20} className="text-amber-500" />
          <h1 className="text-xl font-bold text-gray-800">
            {t('dashboard.greeting', { name: DEV_NAME })}
          </h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5 pl-7">{t('dashboard.subtitle')}</p>
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>{t('dashboard.weather')}</span>
        <span>{dateStr}</span>
        <button
          onClick={() => toast.info('通知功能即将开放')}
          className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <Bell size={16} />
        </button>
      </div>
    </div>
  );
}

function WidgetRow() {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-3 gap-4 px-6">
      <GlassPanel variant="subtle" className="p-4">
        <div className="text-xs font-semibold text-gray-500 mb-2">{t('dashboard.todayRecord')}</div>
        <div className="text-2xl font-bold text-gray-800">0</div>
        <div className="text-xs text-gray-400 mt-1">{t('dashboard.itemCount', { count: 0 })}</div>
      </GlassPanel>
      <GlassPanel variant="subtle" className="p-4">
        <div className="text-xs font-semibold text-gray-500 mb-2">{t('dashboard.recentReading')}</div>
        <div className="text-2xl font-bold text-gray-300">{t('dashboard.emptyReading')}</div>
        <div className="text-xs text-gray-400 mt-1">暂无记录</div>
      </GlassPanel>
      <GlassPanel variant="subtle" className="p-4">
        <div className="text-xs font-semibold text-gray-500 mb-2">{t('dashboard.wardrobeReminder')}</div>
        <div className="text-2xl font-bold text-gray-800">0</div>
        <div className="text-xs text-gray-400 mt-1">条提醒</div>
      </GlassPanel>
    </div>
  );
}

function MySpaceGrid() {
  const { t } = useTranslation();
  const handleStub = () => toast.info('录入功能即将开放');

  return (
    <div className="px-6">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">{t('dashboard.mySpace')}</h2>
      <div className="grid grid-cols-2 gap-3">
        {SPACES.map((space) => (
          <GlassPanel key={space.key} variant="subtle" className="p-4">
            {space.to ? (
              <Link to={space.to} className="block">
                <SpaceCardContent label={space.label} count={space.count} />
              </Link>
            ) : (
              <button onClick={handleStub} className="block w-full text-left">
                <SpaceCardContent label={space.label} count={space.count} />
              </button>
            )}
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

function SpaceCardContent({ label, count }: { label: string; count: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-gray-700">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{count}</div>
      </div>
      <ChevronRight size={14} className="text-gray-400" />
    </div>
  );
}

function RecentItems() {
  const { t } = useTranslation();
  return (
    <div className="px-6">
      <h2 className="text-sm font-semibold text-gray-600 mb-3">{t('dashboard.recentItems')}</h2>
      <GlassPanel variant="subtle" className="p-6 text-center">
        <p className="text-sm text-gray-400">{t('dashboard.emptyItems')}</p>
      </GlassPanel>
    </div>
  );
}

function RightPanel() {
  const { t } = useTranslation();

  return (
    <aside className="w-72 shrink-0 flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Enter nest card */}
      <GlassPanel variant="default" className="overflow-hidden">
        {/* Isometric room placeholder */}
        <div
          className="h-40 w-full"
          style={{
            background:
              'linear-gradient(135deg, oklch(75% 0.12 280) 0%, oklch(65% 0.18 320) 50%, oklch(55% 0.14 260) 100%)',
          }}
        />
        <div className="p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            {t('dashboard.enterNest')}
          </div>
          <Link
            to="/world"
            className="block w-full text-center py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t('dashboard.enterWorld')}
          </Link>
        </div>
      </GlassPanel>

      {/* Mood */}
      <GlassPanel variant="subtle" className="p-4">
        <div className="text-xs font-semibold text-gray-500 mb-2">{t('dashboard.moodScore')}</div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-violet-600">92</span>
          <span className="text-sm text-gray-400">/100</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/40 overflow-hidden">
          <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-violet-400 to-purple-500" />
        </div>
      </GlassPanel>

      {/* Weekly check-in */}
      <GlassPanel variant="subtle" className="p-4">
        <div className="text-xs font-semibold text-gray-500 mb-2">{t('dashboard.weeklyCheckin')}</div>
        <div className="text-sm font-bold text-gray-700 mb-3">
          {t('dashboard.days', { count: 3 })}
        </div>
        <div className="flex gap-1.5">
          {WEEK_DAYS.map((day, idx) => (
            <div
              key={day}
              className={`flex-1 h-8 rounded flex items-center justify-center text-xs font-medium transition-colors ${
                CHECKED_DAYS.has(idx)
                  ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                  : 'bg-white/30 text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
      </GlassPanel>
    </aside>
  );
}

function DashboardPage() {
  return (
    <div className="flex h-full min-h-0">
      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto">
        <TopBar />
        <div className="space-y-6 pb-6">
          <WidgetRow />
          <MySpaceGrid />
          <RecentItems />
        </div>
      </main>

      {/* Right fixed panel */}
      <RightPanel />
    </div>
  );
}
