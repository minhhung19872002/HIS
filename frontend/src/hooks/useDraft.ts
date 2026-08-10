import { useCallback, useEffect, useRef } from 'react';

/**
 * useDraft — auto-save bản nháp form vào localStorage (#467 P2-11).
 * Dùng cho form nhập dài (ghi chú lâm sàng, báo cáo…): save() debounce mặc định 1.5s,
 * load() khi mở form tạo-mới, clear() sau submit thành công. Nháp quá hạn tự bỏ.
 *
 * KHÔNG tự động wire vào mọi form — prefill dữ liệu cũ trên form y khoa phải là
 * quyết định có chủ đích của từng màn hình (CrudModal nhận opt-in `draftKey`).
 */
const PREFIX = 'his.draft.';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface DraftEnvelope<T> { t: number; v: T }

export function useDraft<T>(key: string | undefined, opts?: { debounceMs?: number; ttlMs?: number }): {
  load: () => T | null;
  save: (v: T) => void;
  clear: () => void;
} {
  const debounceMs = opts?.debounceMs ?? 1500;
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = key ? PREFIX + key : undefined;

  const load = useCallback((): T | null => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const env = JSON.parse(raw) as DraftEnvelope<T>;
      if (!env || typeof env.t !== 'number' || Date.now() - env.t > ttlMs) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return env.v;
    } catch { return null; }
  }, [storageKey, ttlMs]);

  const save = useCallback((v: T) => {
    if (!storageKey) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ t: Date.now(), v } satisfies DraftEnvelope<T>));
      } catch { /* quota/private-mode */ }
    }, debounceMs);
  }, [storageKey, debounceMs]);

  const clear = useCallback(() => {
    if (!storageKey) return;
    if (timer.current) clearTimeout(timer.current);
    try { localStorage.removeItem(storageKey); } catch { /* private-mode */ }
  }, [storageKey]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { load, save, clear };
}
