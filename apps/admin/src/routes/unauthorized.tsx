import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ArrowLeft, LogOut, ShieldAlert } from 'lucide-react';
import { logout } from '@/api/auth';

export const Route = createFileRoute('/unauthorized')({
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    await router.navigate({ to: '/login' });
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-5">
      <div className="w-full max-w-md rounded-card border border-hairline bg-surface p-6 shadow-raised">
        <span className="grid size-11 place-items-center rounded-md bg-chip-pink text-pink">
          <ShieldAlert className="size-5" strokeWidth={1.8} />
        </span>
        <h1 className="mt-5 text-xl font-semibold text-ink">没有管理员权限</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          当前账号不是环境变量中配置的超级管理员，因此不能访问管理系统。
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <a
            href="/"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 py-2 text-sm text-ink transition-colors hover:bg-canvas"
          >
            <ArrowLeft className="size-4" strokeWidth={1.8} />
            返回主站
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-sidebar-bg px-3 py-2 text-sm text-sidebar-ink transition-colors hover:opacity-90"
          >
            <LogOut className="size-4" strokeWidth={1.8} />
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
