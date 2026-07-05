import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { adminPermissionSummaryQueryOptions } from '@/api/admin';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/roles')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminPermissionSummaryQueryOptions()),
  component: RolesPage,
});

function RolesPage() {
  const summary = useQuery(adminPermissionSummaryQueryOptions());

  return (
    <div>
      <PageHeader
        eyebrow="Access Control"
        title="角色与权限"
        description="当前阶段采用普通用户与超级管理员两级权限。多角色和权限矩阵会在真正需要运营分工时再引入。"
      />

      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:p-8">
        <section className="rounded-md border border-hairline bg-surface">
          <div className="border-b border-hairline p-4">
            <p className="text-sm font-semibold text-ink">权限模型</p>
            <p className="mt-1 text-xs text-ink-soft">
              所有后台接口仍由服务端 `AuthGuard + SuperAdminGuard` 保护。
            </p>
          </div>

          {summary.isPending ? (
            <div className="p-5 text-sm text-ink-soft">正在加载权限摘要</div>
          ) : summary.isError ? (
            <div className="p-5 text-sm text-pink">权限摘要加载失败</div>
          ) : (
            <div className="divide-y divide-hairline">
              {summary.data.roles.map((role) => (
                <article
                  key={role.id}
                  className="grid gap-4 p-4 md:grid-cols-[220px_minmax(0,1fr)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-md bg-chip-mist text-mist">
                        <ShieldCheck className="size-4" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{role.name}</p>
                        <p className="mt-1 truncate text-xs text-ink-soft">{role.source}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-ink-soft">{role.description}</p>
                  </div>
                  <div className="flex flex-wrap content-start gap-2">
                    {role.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded-md border border-hairline bg-surface-alt px-2.5 py-1 text-xs text-ink-soft"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-md border border-hairline bg-surface p-5">
          <p className="text-sm font-semibold text-ink">当前管理员</p>
          {summary.data ? (
            <div className="mt-4 space-y-3 text-xs">
              <InfoRow label="邮箱" value={summary.data.currentAdmin.email} />
              <InfoRow label="角色" value="超级管理员" />
              <InfoRow
                label="权限数"
                value={String(summary.data.currentAdmin.permissions.length)}
              />
            </div>
          ) : (
            <p className="mt-4 text-xs text-ink-soft">等待权限摘要加载</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0">
      <span className="text-ink-soft">{label}</span>
      <span className="min-w-0 truncate text-right text-ink">{value}</span>
    </div>
  );
}
