import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP: Record<string, number> = { sm: 16, md: 24, lg: 36 };

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const px = SIZE_MAP[size];
  return (
    <span
      className={`ab-spinner ${className || ''}`}
      role="status"
      aria-label="Đang tải…"
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        border: `2px solid currentColor`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'ab-spin 0.6s linear infinite',
      }}
    />
  );
};
