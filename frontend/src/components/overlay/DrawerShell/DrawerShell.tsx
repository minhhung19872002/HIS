import React from 'react';
import { createPortal } from 'react-dom';
import TermIcon from '../../layout/terminal/Icon';
import { usePopup } from '../usePopup';

// ─────────────────────────── Drawer section / field ───────────────────────────

export const DrSec: React.FC<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <section style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-soft)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-10)' }}>
      <h4 style={{
        margin: 0, fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t-2)',
      }}>{title}</h4>
      {action}
    </div>
    {children}
  </section>
);

/** Một dòng nhãn/giá trị trong drawer. `required` + `error` là ADDITIVE (mọi call-site cũ
 *  `<DrField lbl="…">` giữ nguyên hành vi) — dùng CHUNG một quy tắc với `components/form/Field`:
 *  dấu `*` đỏ cạnh nhãn, lỗi hiện ngay tại trường, viền đỏ qua class `.hui-field.is-invalid`.
 *  Nhiều form nhập liệu của HIS nằm trong drawer chứ không phải modal, nên chúng phải
 *  trông và cư xử giống hệt modal. Layout lưới 2 cột giữ nguyên, không đổi bố cục. */
export const DrField: React.FC<{
  lbl: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ lbl, required, error, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 'var(--space-10)', padding: '4px 0', fontSize: 12.5 }}>
    <div style={{ color: 'var(--t-2)' }}>
      {lbl}
      {required && <span className="hui-req" aria-hidden="true">*</span>}
    </div>
    <div className={`hui-field${error ? ' is-invalid' : ''}`} style={{ color: 'var(--t-0)' }}>
      {children}
      {error && <span className="hui-field-err" role="alert">{error}</span>}
    </div>
  </div>
);

// ─────────────────────────── Drawer shell ───────────────────────────
// Terminal-style popup (hui-drawer) matching the Claude design mock. Rendered
// via portal to <body> with a backdrop, Esc-to-close and body scroll-lock.
// CSS lives in layouts/terminal/ab-module.css.

const DRAWER_WIDTH: Record<NonNullable<DrawerShellProps['size']>, number> = {
  sm: 360, md: 480, lg: 640, xl: 820, '2xl': 1040,
};

export interface DrawerShellProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const DrawerShell: React.FC<DrawerShellProps> = ({
  open, onClose, title, sub, size = 'lg', footer, children,
}) => {
  usePopup(open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <div className="hui-drawer-backdrop" onClick={onClose} />
      <div className="hui-drawer-wrap">
        <div className="hui-drawer" style={{ width: DRAWER_WIDTH[size] }}>
          <header className="hui-drawer-h">
            <div className="t">
              <div className="tt">{title}</div>
              {sub && <div className="sub">{sub}</div>}
            </div>
            <button type="button" className="hui-x" onClick={onClose} title="Đóng (Esc)">
              <TermIcon name="x" size={14} />
            </button>
          </header>
          <div className="hui-drawer-b">{children}</div>
          {footer && <footer className="hui-drawer-f">{footer}</footer>}
        </div>
      </div>
    </>,
    document.body,
  );
};
