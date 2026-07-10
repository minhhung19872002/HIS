import React from 'react';

export interface PageToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export const PageToolbar: React.FC<PageToolbarProps> = ({ children, className }) => (
  <div className={`ab-tools ${className || ''}`}>{children}</div>
);
