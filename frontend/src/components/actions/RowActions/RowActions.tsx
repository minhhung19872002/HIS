import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from 'antd';
import TermIcon from '../../layout/terminal/Icon';

// ─────────────────────────── RowActions — cột Action chuẩn hóa (#467) ───────────────────────────
// Quy tắc hiển thị:
//   • ≤2 action → icon trực tiếp (kể cả danger — tô đỏ + confirm).
//   • ≥3 action → tối đa 2 icon trực tiếp (ưu tiên `primary`, sau đó theo thứ tự mảng,
//     bỏ qua danger) + nút ⋯ More mở dropdown chứa phần còn lại; action danger LUÔN
//     nằm cuối menu, có divider + màu đỏ.
//   • Mọi action đều có tooltip (title + aria-label). Danger mặc định bắt confirm
//     (`confirm: false` để tắt, string để đổi câu hỏi).
//   • Ẩn theo quyền: caller set `hidden` (item bị loại hẳn — không để khoảng trắng).
//   • Không đổi chiều cao dòng: nút cùng kích thước .ab-iconbtn (26px).

export interface RowAction {
  key: string;
  icon: string;                 // tên TermIcon
  label: string;                // tooltip + nhãn trong menu More
  onClick: () => void;
  /** danger → cuối menu / đỏ / confirm mặc định. warn → tô vàng khi hover. */
  tone?: 'danger' | 'warn';
  /** false = danger không cần confirm; string = câu hỏi tùy biến. */
  confirm?: string | false;
  hidden?: boolean;             // ẩn theo quyền — loại hẳn khỏi UI
  disabled?: boolean;
  /** ưu tiên hiển thị trực tiếp (View/Edit thường đặt primary) */
  primary?: boolean;
}

const runAction = (a: RowAction): void => {
  const needConfirm = a.confirm !== false && (a.tone === 'danger' || typeof a.confirm === 'string');
  if (!needConfirm) { a.onClick(); return; }
  Modal.confirm({
    title: 'Xác nhận',
    content: typeof a.confirm === 'string' ? a.confirm : `Bạn có chắc muốn ${a.label.toLowerCase()}?`,
    okText: a.label,
    cancelText: 'Hủy',
    okType: a.tone === 'danger' ? 'danger' : 'primary',
    onOk: () => a.onClick(),
  });
};

const IconBtn: React.FC<{ action: RowAction }> = ({ action }) => (
  <button
    type="button"
    className={`ab-iconbtn${action.tone === 'danger' ? ' crit' : action.tone === 'warn' ? ' warn' : ''}`}
    title={action.label}
    aria-label={action.label}
    disabled={action.disabled}
    style={action.tone === 'danger' ? { color: 'var(--s-crit)' } : undefined}
    onClick={(e) => { e.stopPropagation(); runAction(action); }}
  >
    <TermIcon name={action.icon} size={12} />
  </button>
);

/** Dropdown ⋯ render qua portal (tránh bị .ab-tbl-wrap overflow clip). */
const MoreMenu: React.FC<{ items: RowAction[] }> = ({ items }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuW = 180;
    // canh phải theo nút, lật lên trên nếu chạm đáy viewport
    const left = Math.max(8, Math.min(r.right - menuW, window.innerWidth - menuW - 8));
    const estH = items.length * 30 + 12;
    const top = r.bottom + estH > window.innerHeight - 8 ? r.top - estH - 4 : r.bottom + 4;
    setPos({ top, left });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  const dangers = items.filter((a) => a.tone === 'danger');
  const normals = items.filter((a) => a.tone !== 'danger');

  const renderItem = (a: RowAction) => (
    <button
      key={a.key}
      type="button"
      className={`ab-rowmenu-item${a.tone === 'danger' ? ' danger' : ''}`}
      disabled={a.disabled}
      onClick={(e) => { e.stopPropagation(); close(); runAction(a); }}
    >
      <TermIcon name={a.icon} size={12} />
      <span>{a.label}</span>
    </button>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`ab-iconbtn${open ? ' on' : ''}`}
        title="Thao tác khác"
        aria-label="Thao tác khác"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
      >
        <TermIcon name="more-h" size={12} />
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} className="ab-rowmenu" role="menu" style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}>
          {normals.map(renderItem)}
          {dangers.length > 0 && normals.length > 0 && <div className="ab-rowmenu-sep" />}
          {dangers.map(renderItem)}
        </div>,
        document.body,
      )}
    </>
  );
};

export const RowActions: React.FC<{ actions: RowAction[]; max?: number }> = ({ actions, max = 2 }) => {
  const visible = actions.filter((a) => !a.hidden);
  if (visible.length === 0) return null;

  if (visible.length <= max) {
    return <>{visible.map((a) => <IconBtn key={a.key} action={a} />)}</>;
  }

  // ≥3: chọn tối đa `max` action trực tiếp — primary trước, rồi theo thứ tự mảng; danger không trực tiếp
  const directPool = visible.filter((a) => a.tone !== 'danger');
  const direct = [
    ...directPool.filter((a) => a.primary),
    ...directPool.filter((a) => !a.primary),
  ].slice(0, max);
  const rest = visible.filter((a) => !direct.includes(a));

  return (
    <>
      {direct.map((a) => <IconBtn key={a.key} action={a} />)}
      <MoreMenu items={rest} />
    </>
  );
};
