import {
  createFileRoute,
} from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  RotateCcw,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  adminUserDetailQueryOptions,
  adminUsersQueryOptions,
  revokeAdminUserSessions,
  type AdminUsersQueryInput,
  updateAdminUserStatus,
} from '@/api/admin';
import { HeroButton, HeroSelect, HeroTextInput } from '@/components/HeroControls';
import { PageHeader } from '@/components/PageHeader';
import type { AdminUserDetail, AdminUserSummary } from '@dicha/shared';

const PAGE_SIZE = 12;

export const Route = createFileRoute('/_admin/basic')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(adminUsersQueryOptions({ page: 1, pageSize: PAGE_SIZE })),
  component: BasicPage,
});

function BasicPage() {
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AdminUsersQueryInput['status'] | ''>('');
  const [emailVerified, setEmailVerified] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const usersQuery = useMemo<AdminUsersQueryInput>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      status: status || undefined,
      emailVerified: emailVerified === 'all' ? undefined : emailVerified === 'true',
    }),
    [emailVerified, page, search, status],
  );
  const users = useQuery(adminUsersQueryOptions(usersQuery));
  const visibleUsers = users.data?.users ?? [];
  const effectiveSelectedUserId =
    selectedUserId && visibleUsers.some((user) => user.id === selectedUserId)
      ? selectedUserId
      : (visibleUsers[0]?.id ?? null);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPage(1);
    setSelectedUserId(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Basic Management"
        title="用户管理"
        description="查看平台用户的基础资料、认证状态和登录信息。首版只读，不提供删除或封禁等高风险操作。"
        action={
          <form onSubmit={submitSearch} className="flex w-full gap-2 lg:w-[360px]">
            <HeroTextInput
              value={searchDraft}
              onChange={setSearchDraft}
              placeholder="搜索姓名、邮箱、城市或小屋名"
              className="min-w-0 flex-1"
            />
            <HeroSelect
              value={status ?? ''}
              onChange={(nextStatus) => {
                setStatus(nextStatus as AdminUsersQueryInput['status'] | '');
                setPage(1);
                setSelectedUserId(null);
              }}
              className="min-w-28"
              emptyLabel="全部状态"
              options={[
                { value: 'active', label: '正常' },
                { value: 'disabled', label: '已禁用' },
              ]}
            />
            <HeroSelect
              value={emailVerified}
              onChange={(nextVerified) => {
                setEmailVerified(nextVerified as 'all' | 'true' | 'false');
                setPage(1);
                setSelectedUserId(null);
              }}
              className="min-w-28"
              options={[
                { value: 'all', label: '全部邮箱' },
                { value: 'true', label: '已验证' },
                { value: 'false', label: '未验证' },
              ]}
            />
            <HeroButton
              type="submit"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-sidebar-bg px-4 text-sm text-sidebar-ink transition-opacity hover:opacity-90"
            >
              搜索
            </HeroButton>
          </form>
        }
      />

      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
        <section className="min-w-0 rounded-md border border-hairline bg-surface">
          <div className="flex flex-col gap-2 border-b border-hairline p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">用户列表</p>
              <p className="mt-1 text-xs text-ink-soft">
                {users.data
                  ? `共 ${formatNumber(users.data.total)} 个用户，当前第 ${users.data.page} 页`
                  : '正在加载用户'}
              </p>
            </div>
            {search || status || emailVerified !== 'all' ? (
              <HeroButton
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchDraft('');
                  setStatus('');
                  setEmailVerified('all');
                  setPage(1);
                  setSelectedUserId(null);
                }}
                className="self-start rounded-md border border-hairline bg-surface-alt px-3 py-1.5 text-xs text-ink-soft transition-colors hover:bg-canvas sm:self-auto"
              >
                清除搜索
              </HeroButton>
            ) : null}
          </div>

          {users.isPending ? (
            <div className="p-6 text-sm text-ink-soft">正在加载用户列表</div>
          ) : users.isError ? (
            <div className="p-6 text-sm text-pink">用户列表加载失败</div>
          ) : users.data.users.length === 0 ? (
            <div className="p-6 text-sm text-ink-soft">没有匹配的用户</div>
          ) : (
            <div className="divide-y divide-hairline">
              {users.data.users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  selected={user.id === effectiveSelectedUserId}
                  onSelect={() => setSelectedUserId(user.id)}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-hairline p-4">
            <HeroButton
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-xs text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
              上一页
            </HeroButton>
            <p className="text-xs text-ink-soft">
              {users.data ? `${users.data.page} / ${Math.max(users.data.totalPages, 1)}` : '-'}
            </p>
            <HeroButton
              type="button"
              disabled={!users.data || page >= users.data.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-xs text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
              <ChevronRight className="size-3.5" />
            </HeroButton>
          </div>
        </section>

        <UserDetailPanel userId={effectiveSelectedUserId} />
      </div>
    </div>
  );
}

function UserRow({
  user,
  selected,
  onSelect,
}: {
  user: AdminUserSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <HeroButton
      type="button"
      onClick={onSelect}
      className={`grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-alt md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1fr)] ${
        selected ? 'bg-surface-alt shadow-[inset_3px_0_0_var(--color-mist)]' : ''
      }`}
      aria-pressed={selected}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-chip-mist text-mist">
          <UserRound className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user.displayName || user.name}</p>
          <p className="mt-1 truncate text-xs text-ink-soft">{user.email}</p>
        </div>
      </div>
      <div className="min-w-0 text-xs text-ink-soft">
        <p className={user.status === 'active' ? 'text-sage' : 'text-pink'}>
          {user.status === 'active' ? '账户正常' : '账户已禁用'}
        </p>
        <p className={user.emailVerified ? 'mt-1 text-sage' : 'mt-1 text-peach'}>
          {user.emailVerified ? '邮箱已验证' : '邮箱未验证'}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-ink-soft">
        <MiniCount label="活跃" value={user.activeSessionCount} />
        <MiniCount label="绑定" value={user.counts.accounts} />
        <MiniCount label="密钥" value={user.counts.passkeys} />
      </div>
    </HeroButton>
  );
}

function UserDetailPanel({ userId }: { userId: string | null }) {
  if (!userId) {
    return (
      <aside className="rounded-md border border-hairline bg-surface p-5 text-sm text-ink-soft">
        选择一个用户查看详情
      </aside>
    );
  }

  return <LoadedUserDetailPanel userId={userId} />;
}

function LoadedUserDetailPanel({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const detail = useQuery(adminUserDetailQueryOptions(userId));
  const invalidateUserData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] }),
    ]);
  };
  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: 'active' | 'disabled'; reason?: string }) =>
      updateAdminUserStatus(userId, { status, reason }),
    onSuccess: invalidateUserData,
  });
  const revokeMutation = useMutation({
    mutationFn: () => revokeAdminUserSessions(userId),
    onSuccess: invalidateUserData,
  });

  if (detail.isPending) {
    return (
      <aside className="rounded-md border border-hairline bg-surface p-5 text-sm text-ink-soft">
        正在加载用户详情
      </aside>
    );
  }

  if (detail.isError) {
    return (
      <aside className="rounded-md border border-hairline bg-surface p-5 text-sm text-pink">
        用户详情加载失败
      </aside>
    );
  }

  return (
    <UserDetailContent
      user={detail.data}
      actionPending={statusMutation.isPending || revokeMutation.isPending}
      onToggleStatus={() => {
        if (detail.data.status === 'active') {
          const reason = window.prompt('请输入禁用原因（可选）')?.trim();
          statusMutation.mutate({ status: 'disabled', reason: reason || undefined });
          return;
        }
        if (window.confirm('确认重新启用这个用户？')) {
          statusMutation.mutate({ status: 'active' });
        }
      }}
      onRevokeSessions={() => {
        if (window.confirm('确认强制退出这个用户的所有会话？')) {
          revokeMutation.mutate();
        }
      }}
    />
  );
}

function UserDetailContent({
  user,
  actionPending,
  onToggleStatus,
  onRevokeSessions,
}: {
  user: AdminUserDetail;
  actionPending: boolean;
  onToggleStatus: () => void;
  onRevokeSessions: () => void;
}) {
  return (
    <aside className="rounded-md border border-hairline bg-surface">
      <div className="border-b border-hairline p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-chip-lavender text-lavender">
            <UserRound className="size-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">
              {user.displayName || user.name}
            </p>
            <p className="mt-1 truncate text-xs text-ink-soft">{user.email}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <DetailStat icon={MonitorSmartphone} label="活跃会话" value={user.activeSessionCount} />
          <DetailStat icon={UserRound} label="绑定账号" value={user.counts.accounts} />
          <DetailStat icon={KeyRound} label="Passkey" value={user.counts.passkeys} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <HeroButton
            type="button"
            disabled={actionPending}
            onClick={onToggleStatus}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-xs text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            {user.status === 'active' ? (
              <Ban className="size-3.5 text-pink" strokeWidth={1.8} />
            ) : (
              <RotateCcw className="size-3.5 text-sage" strokeWidth={1.8} />
            )}
            {user.status === 'active' ? '禁用用户' : '启用用户'}
          </HeroButton>
          <HeroButton
            type="button"
            disabled={actionPending}
            onClick={onRevokeSessions}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-xs text-ink transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="size-3.5 text-mist" strokeWidth={1.8} />
            强制退出
          </HeroButton>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <DetailSection title="账户资料">
          <InfoRow label="账户状态" value={user.status === 'active' ? '正常' : '已禁用'} />
          {user.disabledAt ? (
            <InfoRow label="禁用时间" value={formatDateTime(user.disabledAt)} />
          ) : null}
          {user.disabledReason ? <InfoRow label="禁用原因" value={user.disabledReason} /> : null}
          <InfoRow label="注册时间" value={formatDateTime(user.createdAt)} />
          <InfoRow label="更新时间" value={formatDateTime(user.updatedAt)} />
          <InfoRow
            label="最近会话"
            value={user.lastSessionAt ? formatDateTime(user.lastSessionAt) : '暂无'}
          />
          <InfoRow label="邮箱状态" value={user.emailVerified ? '已验证' : '未验证'} />
          <InfoRow label="城市" value={user.city ?? '未填写'} />
          <InfoRow label="小屋名" value={user.homeName ?? '未填写'} />
        </DetailSection>

        <DetailSection title="绑定方式">
          {user.accounts.length === 0 ? (
            <p className="text-xs text-ink-soft">暂无绑定账号</p>
          ) : (
            <div className="space-y-2">
              {user.accounts.map((account) => (
                <div
                  key={account.id}
                  className="rounded-md border border-hairline bg-surface-alt p-3"
                >
                  <p className="text-sm font-medium text-ink">{account.providerId}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    绑定于 {formatDateTime(account.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title="最近会话">
          {user.sessions.length === 0 ? (
            <p className="text-xs text-ink-soft">暂无会话</p>
          ) : (
            <div className="space-y-2">
              {user.sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-md border border-hairline bg-surface-alt p-3"
                >
                  <p className="truncate text-xs text-ink">
                    {session.ipAddress ?? '未知 IP'} · 过期 {formatDateTime(session.expiresAt)}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-soft">
                    {session.userAgent ?? '未知设备'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DetailSection>

        <DetailSection title="Passkey 登录方式">
          {user.passkeys.length === 0 ? (
            <p className="text-xs text-ink-soft">暂无 Passkey</p>
          ) : (
            <div className="space-y-2">
              {user.passkeys.map((passkey) => (
                <div
                  key={passkey.id}
                  className="rounded-md border border-hairline bg-surface-alt p-3"
                >
                  <p className="text-sm font-medium text-ink">{passkey.deviceType}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {passkey.backedUp ? '已备份' : '未备份'} · {formatDateTime(passkey.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      </div>
    </aside>
  );
}

function MiniCount({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-md bg-surface-alt px-2 py-1">
      {label} {formatNumber(value)}
    </span>
  );
}

function DetailStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface-alt p-3">
      <Icon className="size-4 text-mist" strokeWidth={1.8} />
      <p className="mt-2 text-lg font-semibold text-ink">{formatNumber(value)}</p>
      <p className="text-xs text-ink-soft">{label}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline py-2 text-xs last:border-b-0">
      <span className="text-ink-soft">{label}</span>
      <span className="min-w-0 truncate text-right text-ink">{value}</span>
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
