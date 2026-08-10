import { useLayoutEffect, type RefObject } from 'react';

/**
 * useScrollRestore — khôi phục vị trí scroll của một container theo key (#467 P2-12).
 * Wire MỘT LẦN ở TerminalLayout trên `.his-main` với key = pathname → mọi trang v2
 * quay lại danh sách đều giữ nguyên vị trí, không trang nào phải tự lo.
 *
 * Lưu vào sessionStorage (map key→scrollTop) qua listener scroll passive; restore
 * sau paint đầu tiên của key mới. Trang chưa từng thăm → giữ 0 (top).
 */
const STORE = 'v2:scroll';

const readMap = (): Record<string, number> => {
  try { return JSON.parse(sessionStorage.getItem(STORE) || '{}') as Record<string, number>; }
  catch { return {}; }
};

export function useScrollRestore(ref: RefObject<HTMLElement | null>, key: string): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const saved = readMap()[key];
    // restore sau khi nội dung trang mới paint (2 frame — chờ data-less first render xong)
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => { el.scrollTop = saved ?? 0; });
    });
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        try {
          const map = readMap();
          map[key] = el.scrollTop;
          sessionStorage.setItem(STORE, JSON.stringify(map));
        } catch { /* quota/private-mode */ }
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
    };
  }, [ref, key]);
}
