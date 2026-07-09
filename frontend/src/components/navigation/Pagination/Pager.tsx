import React from 'react';

// ─────────────────────────── Pager ───────────────────────────

export const Pager: React.FC<{
  page: number;
  totalPages: number;
  setPage: (next: number | ((p: number) => number)) => void;
  total: number;
  perPage: number;
}> = ({ page, totalPages, setPage, total, perPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-8)',
      padding: '10px 14px', borderTop: '1px solid var(--line)',
      background: 'var(--d-2)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)', flexShrink: 0,
    }}>
      <span>
        Hiển thị <b style={{ color: 'var(--t-0)' }}>
          {page * perPage + 1}–{Math.min((page + 1) * perPage, total)}
        </b> / {total}
      </span>
      <span style={{ flex: 1 }} />
      <button type="button" className="ab-btn ghost sm" onClick={() => setPage(0)} disabled={page === 0}>«</button>
      <button type="button" className="ab-btn ghost sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{page + 1}/{totalPages}</span>
      <button type="button" className="ab-btn ghost sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
      <button type="button" className="ab-btn ghost sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>»</button>
    </div>
  );
};
