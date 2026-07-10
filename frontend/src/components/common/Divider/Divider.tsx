import React from 'react';

export interface DividerProps {
  vertical?: boolean;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ vertical, className }) => (
  <div
    role="separator"
    aria-hidden
    style={{
      background: 'var(--ab-border, #e0e0e0)',
      ...(vertical
        ? { width: 1, alignSelf: 'stretch', margin: '0 8px' }
        : { height: 1, margin: '12px 0' }),
    }}
    className={className}
  />
);
