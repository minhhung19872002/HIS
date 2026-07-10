import React, { useState } from 'react';

export interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, label, className }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => undefined);
  };
  return (
    <button type="button" className={`ab-btn ghost sm ${className || ''}`} onClick={copy}>
      {copied ? 'Đã sao chép ✓' : (label ?? 'Sao chép')}
    </button>
  );
};
