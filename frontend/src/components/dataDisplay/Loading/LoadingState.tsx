import React from 'react';
import TermIcon from '../../layout/terminal/Icon';

// Async UI state — xem chú thích đầy đủ (UI-AUDIT #164) tại `../EmptyState/EmptyState.tsx`.

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Đang tải…' }) => (
  <div className="ab-empty">
    <span className="ab-btn-spin"><TermIcon name="refresh" size={20} /></span>
    <div>{message}</div>
  </div>
);
