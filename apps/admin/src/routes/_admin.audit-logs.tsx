import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FileClock, Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { adminAuditLogsQueryOptions, type AdminAuditLogsQueryInput } from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';

const PAGE_SIZE = 50;

export const Route = createFileRoute('/_admin/audit-logs')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      adminAuditLogsQueryOptions({ page: 1, pageSize: PAGE_SIZE }),
    ),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [window, setWindow] = useState<NonNullable<AdminAuditLogsQueryInput['window']>>('7d');
  const [result, setResult] = useState<AdminAuditLogsQueryInput['result'] | ''>('');
  const query = useMemo<AdminAuditLogsQueryInput>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      window,
      result: result || undefined,
      search: search || undefined,
    }),
    [page, result, search, window],
  );
  const logs = useQuery(adminAuditLogsQueryOptions(query));

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Audit Trail"
        title="审计日志"
        description="查看超级管理员在后台执行的关键操作、对象、结果和安全摘要。"
        action={
          <form onSubmit={submitSearch} className="flex w-full flex-wrap gap-2 lg:w-[560px]">
            <label className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="搜索操作者、资源 ID 或摘要"
                className="h-10 w-full rounded-md border border-hairline bg-surface px-9 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink-soft"
              />
            </label>
            <select
              value={window}
              onChange={(event) => {
                setWindow(event.target.value as typeof window);
                setPage(1);
              }}
              className="h-10 rounded-md border border-hairline bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-ink-soft"
            >
              <option value="24h">近 24 小时</option>
              <option value="7d">近 7 天</option>
              <option value="30d">近 30 天</option>
              <option value="90d">近 90 天</option>
              <option value="all">全部</option>
            </select>
            <select
              value={result}
              onChange={(event) => {
                setResult(event.target.value as AdminAuditLogsQueryInput['result'] | '');
                setPage(1);
              }}
              className="h-10 rounded-md border border-hairline bg-surface px-3 text-sm text-ink outline-none transition-colors focus:border-ink-soft"
            >
              <option value="">全部结果</option>
              <option value="success">成功</option>
              <option value="failure">失败</option>
            </select>
            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-sidebar-bg px-4 text-sm text-sidebar-ink transition-opacity hover:opacity-90"
            >
              搜索
            </button>
          </form>
        }
      />

      <div className="p-5 lg:p-8">
        <section className="rounded-md border border-hairline bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-hairline p-4">
            <div>
              <p className="text-sm font-semibold text-ink">操作记录</p>
              <p className="mt-1 text-xs text-ink-soft">
                {logs.data
                  ? `共 ${formatNumber(logs.data.total)} 条，当前第 ${logs.data.page} 页`
                  : '正在加载审计日志'}
              </p>
            </div>
            <FileClock className="size-4 text-mist" strokeWidth={1.8} />
          </div>

          {logs.isPending ? (
            <div className="p-6 text-sm text-ink-soft">正在加载审计日志</div>
          ) : logs.isError ? (
            <div className="p-6 text-sm text-pink">审计日志加载失败</div>
          ) : logs.data.logs.length === 0 ? (
            <div className="p-6 text-sm text-ink-soft">当前筛选下暂无审计记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-collapse text-left text-sm">
                <thead className="border-b border-hairline bg-surface-alt text-xs text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-medium">时间</th>
                    <th className="px-4 py-3 font-medium">操作者</th>
                    <th className="px-4 py-3 font-medium">动作</th>
                    <th className="px-4 py-3 font-medium">资源</th>
                    <th className="px-4 py-3 font-medium">结果</th>
                    <th className="px-4 py-3 font-medium">摘要</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {logs.data.logs.map((log) => (
                    <tr key={log.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-soft">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="max-w-[180px] px-4 py-3">
                        <p className="truncate text-xs font-medium text-ink">
                          {log.actorName || log.actorEmail || '未知管理员'}
                        </p>
                        <p className="mt-1 truncate text-[11px] text-ink-soft">
                          {log.ipAddress || '未知 IP'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md border border-hairline bg-surface-alt px-2 py-1 text-xs text-ink-soft">
                          {log.action}
                        </span>
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-xs text-ink-soft">
                        <p className="truncate text-ink">{log.resourceType}</p>
                        <p className="mt-1 truncate">{log.resourceId || '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-1 text-xs ${
                            log.result === 'success'
                              ? 'bg-chip-sage text-sage'
                              : 'bg-chip-pink text-pink'
                          }`}
                        >
                          {log.result === 'success' ? '成功' : '失败'}
                        </span>
                      </td>
                      <td className="max-w-[300px] px-4 py-3 text-xs text-ink-soft">
                        <p className="line-clamp-2">{log.summary}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-hairline p-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-xs text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              上一页
            </button>
            <p className="text-xs text-ink-soft">
              {logs.data ? `${logs.data.page} / ${Math.max(logs.data.totalPages, 1)}` : '-'}
            </p>
            <button
              type="button"
              disabled={!logs.data || page >= logs.data.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-xs text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
