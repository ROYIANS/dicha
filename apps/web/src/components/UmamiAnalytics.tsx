import { useEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { getUmamiConfig, trackUmamiPageView } from '@/lib/analytics/umami';

const umamiConfig = getUmamiConfig();

function UmamiPageViews() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const skipInitial = useRef(true);

  useEffect(() => {
    if (skipInitial.current) {
      skipInitial.current = false;
      return;
    }
    trackUmamiPageView(`${pathname}${search}`);
  }, [pathname, search]);

  return null;
}

/**
 * 注入 Umami tracker script，并在 TanStack Router 导航时补发 pageview。
 * 未配置 VITE_UMAMI_* 时不渲染、不请求。
 */
export function UmamiAnalytics() {
  useEffect(() => {
    if (!umamiConfig) return;

    const selector = `script[data-website-id="${umamiConfig.websiteId}"]`;
    if (document.querySelector(selector)) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = umamiConfig.scriptUrl;
    script.setAttribute('data-website-id', umamiConfig.websiteId);
    script.setAttribute('data-auto-track', 'true');
    document.head.appendChild(script);
  }, []);

  if (!umamiConfig) return null;

  return <UmamiPageViews />;
}
