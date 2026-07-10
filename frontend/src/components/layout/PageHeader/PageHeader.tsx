import React from 'react';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions, className }) => (
  <div className={`ab-page-header ${className || ''}`} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
    <div style={{ flex: 1 }}>
      <div className="ab-page-title" style={{ fontWeight: 600, fontSize: 16 }}>{title}</div>
      {subtitle && <div className="ab-page-subtitle" style={{ fontSize: 12, opacity: 0.65 }}>{subtitle}</div>}
    </div>
    {actions && <div className="ab-page-header-actions" style={{ display: 'flex', gap: 8 }}>{actions}</div>}
  </div>
);
