import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const queryClient = new QueryClient();

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '未知错误';
}

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultErrorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center bg-canvas p-6 text-ink">
      <div className="w-full max-w-md rounded-md border border-hairline bg-surface p-6">
        <p className="text-sm font-semibold">页面加载失败</p>
        <p className="mt-2 text-sm text-ink-soft">{getErrorMessage(error)}</p>
      </div>
    </div>
  ),
  defaultNotFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center bg-canvas p-6 text-ink">
      <div className="w-full max-w-md rounded-md border border-hairline bg-surface p-6">
        <p className="text-sm font-semibold">页面不存在</p>
        <p className="mt-2 text-sm text-ink-soft">请从左侧导航重新进入管理模块。</p>
      </div>
    </div>
  ),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
