import React from 'react';
import TermIcon from '../../layout/terminal/Icon';

// ─────────────────────────── Async UI states (loading / empty / error) ───────────────────────────
// UI-AUDIT #164 — primitive CHUNG cho 4 state data-driven. Dựng trên `.ab-empty` (token-based →
// tự flip dark-mode). Dùng được cả trong ô bảng (`DataTable.empty`) lẫn block độc lập.
// Khi viết page v2 mới: success = data; rỗng = <EmptyState>; đang tải = <LoadingState>;
// lỗi = <ErrorState onRetry={reload}> (ĐỪNG nuốt lỗi thành "rỗng"). Toast (tk/ti/tw/te) = feedback hành động.

export const EmptyState: React.FC<{ message?: string; icon?: string; action?: React.ReactNode }> = ({
  message = 'Không có dữ liệu', icon = 'search', action,
}) => (
  <div className="ab-empty">
    <TermIcon name={icon} size={20} />
    <div>{message}</div>
    {action}
  </div>
);
