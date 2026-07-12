import React from 'react';
import TermIcon from '../../layout/terminal/Icon';

// ─────────────────────────── Btn — chuẩn hoá nút ab-btn (raw <button>) ───────────────────────────
// Giữ NGUYÊN style ab-* (terminal design): chỉ componentize, không đổi class/CSS.
// Variant thực tế trong codebase: default | primary | ghost | ok | crit.
export type BtnVariant = 'default' | 'primary' | 'ghost' | 'ok' | 'crit';
export const Btn: React.FC<{
  variant?: BtnVariant;
  size?: 'sm';
  icon?: string;            // tên TermIcon (bên trái)
  iconRight?: string;       // tên TermIcon (bên phải)
  loading?: boolean;
  disabled?: boolean;
  active?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ variant = 'default', size, icon, iconRight, loading, disabled, active, title, type = 'button', onClick, className, style, children }) => {
  const cls = ['ab-btn', variant !== 'default' ? variant : '', size === 'sm' ? 'sm' : '', active ? 'active' : '', className || '']
    .filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} title={title} disabled={disabled || loading} style={style} onClick={onClick}>
      {loading ? <span className="ab-btn-spin"><TermIcon name="refresh" size={12} /></span>
        : icon ? <TermIcon name={icon} size={12} /> : null}
      {children}
      {iconRight && !loading ? <TermIcon name={iconRight} size={12} /> : null}
    </button>
  );
};
