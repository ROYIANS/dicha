import { env } from '@/lib/env';

export type UmamiConfig = {
  scriptUrl: string;
  websiteId: string;
};

declare global {
  interface Window {
    umami?: {
      track: (
        event?: string | ((props: Record<string, unknown>) => Record<string, unknown>),
        data?: Record<string, unknown>,
      ) => void;
    };
  }
}

/** 两项 env 均配置时启用 Umami；缺任一则静默关闭。 */
export function getUmamiConfig(): UmamiConfig | null {
  const scriptUrl = env.VITE_UMAMI_SCRIPT_URL?.trim();
  const websiteId = env.VITE_UMAMI_WEBSITE_ID?.trim();
  if (!scriptUrl || !websiteId) return null;

  try {
    // 构建期校验 script URL，避免注入无效地址
    new URL(scriptUrl);
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[umami] VITE_UMAMI_SCRIPT_URL is not a valid URL — analytics disabled');
    }
    return null;
  }

  return { scriptUrl, websiteId };
}

export function isUmamiEnabled(): boolean {
  return getUmamiConfig() !== null;
}

/** 自定义事件（需 Umami 已加载）。 */
export function trackUmamiEvent(name: string, data?: Record<string, unknown>) {
  window.umami?.track(name, data);
}

/** SPA 路由切换后上报 pageview（跳过首次，由 script 自动采集）。 */
export function trackUmamiPageView(url: string) {
  window.umami?.track((props) => ({
    ...props,
    url,
  }));
}
