import { useEffect, useRef } from 'react';

/**
 * useInterval — chạy `callback` mỗi `delay`ms. #hooks-consolidation
 *
 * Giải quyết TRIỆT ĐỂ 3 vấn đề của `setInterval` viết tay:
 *  1. **Stale-closure**: callback lưu trong ref (cập nhật mỗi render) → luôn thấy
 *     state/props MỚI NHẤT, không "đông cứng" tại lúc mount như `setInterval(fn, d)` trong useEffect([]).
 *  2. **Teardown/sync**: tự `clearInterval` khi unmount HOẶC khi `delay` đổi → không leak,
 *     không setState sau unmount, không chạy 2 interval chồng nhau.
 *  3. **Pause/resume**: `delay = null` → dừng (không tạo interval).
 *
 * Dùng: `useInterval(() => refetch(), isPolling ? 30_000 : null)`.
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
