import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
};

const FADE = '28px';

/**
 * 跨 feature 复用的滚动容器 —— 全局滚动条已隐藏（见 index.css），内容仍可滚。
 * horizontal 时把鼠标滚轮的纵向滚动转成横向滚动（列表/卡片排横向浏览）。
 *
 * 边缘渐隐：仅在该侧还有未露出内容时，把内容在该侧淡出到透明（柔和过渡），
 * 滚到头则该侧不淡出，避免首/尾卡片被无谓裁淡。用 maskImage 实现。
 *
 * 横向滚轮需 preventDefault，而 React 的 onWheel 默认 passive 无法 preventDefault，
 * 故用非被动（passive:false）的原生 wheel 监听。契约见 design-system.md §8。
 */
export function ScrollArea({ children, className = '', orientation = 'vertical' }: ScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState<boolean>(true);
  const [atEnd, setAtEnd] = useState<boolean>(true);

  const recompute = useCallback((el: HTMLDivElement) => {
    if (orientation === 'horizontal') {
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    } else {
      setAtStart(el.scrollTop <= 1);
      setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 1);
    }
  }, [orientation]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    recompute(el);

    const onScroll = () => recompute(el);
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => recompute(el));
    ro.observe(el);

    const onWheel = (e: WheelEvent) => {
      if (orientation !== 'horizontal') return;
      if (el.scrollWidth <= el.clientWidth) return; // 无可横向滚则放过
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY; // 纵向滚轮量转横向
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('wheel', onWheel);
      ro.disconnect();
    };
  }, [orientation, recompute]);

  const dir = orientation === 'horizontal' ? 'to right' : 'to bottom';
  const from = atStart ? '#000 0' : `transparent 0, #000 ${FADE}`;
  const to = atEnd ? '#000 100%' : `#000 calc(100% - ${FADE}), transparent 100%`;
  const mask = `linear-gradient(${dir}, ${from}, ${to})`;

  const overflow =
    orientation === 'horizontal' ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto';
  const cls = ['no-scrollbar', overflow, className].filter(Boolean).join(' ');

  const style: CSSProperties = { maskImage: mask, WebkitMaskImage: mask };

  return (
    <div ref={ref} className={cls} style={style}>
      {children}
    </div>
  );
}
