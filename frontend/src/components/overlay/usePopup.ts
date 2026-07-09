import React from 'react';

// Esc-to-close + body scroll lock while a popup is open.
// Nội bộ overlay/ (DrawerShell + ModalShell) — KHÔNG re-export qua _v2kit (giữ surface cũ).
export function usePopup(open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
}
