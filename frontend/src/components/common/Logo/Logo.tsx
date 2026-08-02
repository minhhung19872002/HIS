import React from 'react';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import { APP_NAME } from '../../../config/app.config';

export interface LogoProps {
  showName?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ showName = true, className }) => (
  <div className={`ab-logo ${className || ''}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: 1 }}>⚕</span>
    {showName && <span style={{ fontWeight: 600, fontSize: 15 }}>{HOSPITAL_NAME || APP_NAME}</span>}
  </div>
);
