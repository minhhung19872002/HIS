import { useEffect, useState } from 'react';

/**
 * useDebounce — trả về `value` sau khi nó ngừng thay đổi `delay`ms. #hooks-consolidation
 *
 * Dùng cho ô tìm kiếm / filter để giảm số lần gọi API. Thay cho pattern
 * setTimeout+clearTimeout viết tay rải rác ở nhiều trang.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
