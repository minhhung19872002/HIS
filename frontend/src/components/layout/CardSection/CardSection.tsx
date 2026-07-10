import React from 'react';

export interface CardSectionProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const CardSection: React.FC<CardSectionProps> = ({ children, title, actions, className }) => (
  <div className={`ab-card ${className || ''}`}>
    {(title || actions) && (
      <div className="ab-card-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {title && <div className="ab-card-title" style={{ flex: 1, fontWeight: 600 }}>{title}</div>}
        {actions && <div className="ab-card-actions">{actions}</div>}
      </div>
    )}
    <div className="ab-card-body">{children}</div>
  </div>
);
