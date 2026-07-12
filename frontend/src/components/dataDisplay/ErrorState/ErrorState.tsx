import React from 'react';
import TermIcon from '../../layout/terminal/Icon';

// Async UI state — xem chú thích đầy đủ (UI-AUDIT #164) tại `../EmptyState/EmptyState.tsx`.

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Không tải được dữ liệu', onRetry,
}) => (
  <div className="ab-empty">
    <span style={{ color: 'var(--s-crit)' }}><TermIcon name="alert" size={20} /></span>
    <div>{message}</div>
    {onRetry && (
      <button type="button" className="ab-btn ghost sm" onClick={onRetry}>
        <TermIcon name="refresh" size={12} /> Thử lại
      </button>
    )}
  </div>
);
