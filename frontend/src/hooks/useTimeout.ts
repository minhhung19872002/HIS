import { useEffect, useRef } from 'react';

/**
 * useTimeout — chạy `callback` MỘT LẦN sau `delay`ms. #hooks-consolidation
 *
 * Như useInterval nhưng one-shot: callback ref (không stale) + tự `clearTimeout` khi
 * unmount/đổi delay (→ không setState sau unmount). `delay = null` → không chạy.
 *
 * Dùng cho delayed-action gắn với vòng đời component. KHÔNG dùng cho one-shot trong
 * event-handler (vd `print()` sau khi mở window) — chỗ đó `setTimeout` thẳng là đúng.
 */
export function useTimeout(callback: () => void, delay: number | null): void {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => saved.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}
