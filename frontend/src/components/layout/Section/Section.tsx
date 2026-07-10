import React from 'react';

export interface SectionProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({ children, title, className }) => (
  <section className={`ab-section ${className || ''}`}>
    {title && <div className="ab-section-title" style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>}
    {children}
  </section>
);
