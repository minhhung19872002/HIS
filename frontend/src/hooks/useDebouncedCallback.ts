import { useCallback, useEffect, useRef } from 'react';

/**
 * useDebouncedCallback — trả về 1 hàm; hàm này chỉ thực sự gọi `fn` sau khi NGỪNG gọi
 * `delay`ms. #hooks-consolidation
 *
 * Thay pattern `setTimeout` + `clearTimeout` (kèm useRef timer) viết tay rải rác ở ~9
 * ô tìm kiếm/filter. Tự clear timeout cũ mỗi lần gọi + clear khi unmount (không leak,
 * không gọi sau unmount). `fn` lưu ref → luôn dùng bản mới nhất.
 *
 * Khác `useDebounce(value, delay)` (debounce GIÁ TRỊ): cái này debounce HÀNH ĐỘNG
 * (vd `onChange={debounced}` gọi API).
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 300,
): (...args: A) => void {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => saved.current(...args), delay);
    },
    [delay],
  );
}
