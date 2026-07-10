import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => (
  <div className={`ab ${className || ''}`}>{children}</div>
);
