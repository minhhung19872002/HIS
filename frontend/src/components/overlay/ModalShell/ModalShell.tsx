import React from 'react';
import { createPortal } from 'react-dom';
import TermIcon from '../../layout/terminal/Icon';
import { usePopup } from '../usePopup';

// ─────────────────────────── Modal shell ───────────────────────────
// Terminal-style popup (hui-modal) matching the Claude design mock. Rendered
// via portal to <body> with a backdrop, Esc-to-close and body scroll-lock.
// CSS lives in layouts/terminal/ab-module.css.

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: 'danger';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
  open, onClose, title, sub, size = 'md', tone, footer, children,
}) => {
  usePopup(open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <div className="hui-backdrop" onClick={onClose} />
      <div className="hui-modal-wrap" onClick={onClose}>
        <div
          className={`hui-modal hui-size-${size}${tone ? ' hui-tone-' + tone : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="hui-modal-h">
            <div className="t">
              <div className="tt">{title}</div>
              {sub && <div className="sub">{sub}</div>}
            </div>
            <button type="button" className="hui-x" onClick={onClose} title="Đóng (Esc)">
              <TermIcon name="x" size={14} />
            </button>
          </header>
          <div className="hui-modal-b">{children}</div>
          {footer && <footer className="hui-modal-f">{footer}</footer>}
        </div>
      </div>
    </>,
    document.body,
  );
};
