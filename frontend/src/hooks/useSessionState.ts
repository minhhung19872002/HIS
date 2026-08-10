import { useCallback, useState } from 'react';

/**
 * useSessionState — useState mirror vào sessionStorage (#467 P1-8).
 * Giữ từ khóa tìm kiếm / bộ lọc / tab / trang khi điều hướng đi-về trong cùng tab
 * trình duyệt; đóng tab là sạch (đúng ngữ nghĩa "phiên làm việc" — không dùng
 * localStorage để tránh filter cũ dính vĩnh viễn giữa các ca trực).
 *
 * key nên có prefix route, vd `v2:/v2/reception:search`.
 */
export function useSessionState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch { /* parse fail / private-mode → dùng initial */ }
    return initial;
  });
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try { sessionStorage.setItem(key, JSON.stringify(next)); } catch { /* quota/private-mode */ }
      return next;
    });
  }, [key]);
  return [state, set];
}

/** Xóa mọi state đã lưu của một trang (gọi khi "Bỏ lọc"). */
export function clearSessionState(prefix: string): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefix)) doomed.push(k);
    }
    doomed.forEach((k) => sessionStorage.removeItem(k));
  } catch { /* private-mode */ }
}
