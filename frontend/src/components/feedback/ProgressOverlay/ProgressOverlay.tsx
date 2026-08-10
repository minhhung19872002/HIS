import React from 'react';
import { createPortal } from 'react-dom';
import TermIcon from '../../layout/terminal/Icon';

// ─────────────────────────── ProgressOverlay — tác vụ chạy dài (#467 P1-10) ───────────────────────────
// Overlay chặn thao tác cho import/export Excel, đồng bộ, tạo báo cáo. `percent` undefined →
// thanh indeterminate; có số → determinate + hiện %. `status` mô tả bước hiện tại.

export interface ProgressOverlayProps {
  open: boolean;
  title: string;
  /** 0–100; bỏ trống = indeterminate */
  percent?: number;
  /** dòng trạng thái, vd "Đang xử lý dòng 120/500…" */
  status?: string;
  onCancel?: () => void;
}

export const ProgressOverlay: React.FC<ProgressOverlayProps> = ({ open, title, percent, status, onCancel }) => {
  if (!open) return null;
  const pct = percent != null ? Math.max(0, Math.min(100, percent)) : undefined;
  return createPortal(
    <div className="ab-progress-backdrop" role="dialog" aria-modal aria-label={title}>
      <div className="ab-progress-card">
        <div className="ab-progress-title">{title}</div>
        <div className={`ab-progress-track${pct == null ? ' indet' : ''}`}>
          <div className="ab-progress-fill" style={pct != null ? { width: `${pct}%` } : undefined} />
        </div>
        <div className="ab-progress-meta">
          <span>{status || 'Đang xử lý…'}</span>
          {pct != null && <span className="pct">{Math.round(pct)}%</span>}
        </div>
        {onCancel && (
          <button type="button" className="ab-btn ghost sm" onClick={onCancel}>
            <TermIcon name="x" size={12} /> Hủy
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
};
