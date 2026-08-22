import React from 'react';

// ─────────────────────────── Field — nhãn + bắt buộc + lỗi (QUY TẮC CHUNG) ───────────────────────────
// Bọc MỘT trường nhập liệu trong modal (dùng chung lẫn riêng của từng chức năng).
// Trước đây mỗi màn tự viết dấu `*` với màu riêng (57 file, có chỗ dùng biến CSS không
// tồn tại nên `*` không hề đỏ) và tự bày chỗ hiện lỗi → đây là nơi DUY NHẤT quy định:
//   · trường bắt buộc = dấu `*` đỏ ngay cạnh tên trường;
//   · lỗi hiển thị NGAY TẠI trường (không dùng Alert, không dùng toast);
//   · chưa bấm Lưu/Tạo thì `error` rỗng → không viền đỏ, không chữ đỏ.
// Style ở `layout/terminal/ab-module.css` (.hui-field / .hui-req / .hui-field-err).

export interface FieldProps {
  label: React.ReactNode;
  required?: boolean;
  /** Thông báo lỗi. Rỗng/undefined = trường bình thường (modal vừa mở luôn ở trạng thái này). */
  error?: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label, required, error, htmlFor, hint, className, style, children,
}) => (
  <div
    className={['hui-field', error ? 'is-invalid' : '', className || ''].filter(Boolean).join(' ')}
    style={style}
    data-field-error={error ? '1' : undefined}
  >
    <label htmlFor={htmlFor}>
      {label}
      {required && <span className="hui-req" aria-hidden="true">*</span>}
    </label>
    {children}
    {hint && !error && <span className="hui-field-err" style={{ color: 'var(--t-2)' }}>{hint}</span>}
    {error && <span className="hui-field-err" role="alert">{error}</span>}
  </div>
);
