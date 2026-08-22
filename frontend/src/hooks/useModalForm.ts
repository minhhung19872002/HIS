import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useModalForm — quy tắc CHUNG cho validate trường bắt buộc trong modal tự chế
 * (modal dùng chung lẫn modal riêng của từng chức năng). `CrudModal` đã có Antd Form
 * lo phần này; hook là bản tương đương cho modal không dùng Antd Form.
 *
 * Hợp đồng hành vi — giống hệt nhau ở mọi nơi:
 *  1. Modal vừa mở: `errors` rỗng → không viền đỏ, không chữ đỏ, KHÔNG Alert.
 *  2. Chỉ khi bấm Lưu/Tạo (`validate()`) mới kiểm tra; trường bắt buộc còn trống →
 *     lỗi hiện NGAY TẠI trường (qua `<Field error=…>`) và hàm trả `false` để chặn lưu.
 *  3. Sau lần bấm đầu, sửa trường nào thì lỗi của trường đó tự mất (`clear`) —
 *     người dùng thấy phản hồi tức thì thay vì phải bấm Lưu lại mới biết đã đủ chưa.
 *  4. `open` đổi → reset sạch, mở lại lần sau không dính lỗi cũ.
 *
 * Nút Lưu KHÔNG được `disabled` theo trường rỗng: phải bấm được thì mới thấy lỗi.
 */

/** Rỗng theo nghĩa nhập liệu: chuỗi trắng, null/undefined, mảng rỗng. */
const isBlank = (v: unknown): boolean =>
  v == null
  || (typeof v === 'string' && v.trim() === '')
  || (Array.isArray(v) && v.length === 0);

export interface FieldRule {
  /** Bắt buộc nhập. Thiếu → "Vui lòng nhập <label>". */
  required?: boolean;
  /** Nhãn dùng trong thông báo mặc định. */
  label?: string;
  /** Thông báo riêng khi bỏ trống. */
  message?: string;
  /** Kiểm tra thêm (định dạng, khoảng giá trị…). Trả chuỗi = lỗi, trả rỗng/undefined = hợp lệ. */
  validate?: (value: unknown) => string | undefined;
}

export type FieldRules<K extends string = string> = Partial<Record<K, FieldRule>>;

export interface ModalFormApi<K extends string = string> {
  /** Lỗi hiện tại theo từng trường — truyền vào `<Field error={errors.x}>`. */
  errors: Partial<Record<K, string>>;
  /** Chạy khi bấm Lưu/Tạo. `true` = hợp lệ, `false` = đã hiện lỗi và phải chặn lưu. */
  validate: (values: Partial<Record<K, unknown>>) => boolean;
  /** Xoá lỗi của một trường (gọi trong onChange sau khi người dùng đã bấm Lưu ít nhất 1 lần). */
  clear: (key: K) => void;
  /** Xoá toàn bộ lỗi. */
  reset: () => void;
  /** Gắn lỗi do backend trả về cho đúng trường. */
  setError: (key: K, message: string) => void;
  /** Người dùng đã bấm Lưu/Tạo lần nào chưa. */
  submitted: boolean;
}

export function useModalForm<K extends string = string>(
  rules: FieldRules<K>,
  /** Trạng thái mở của modal — đổi giá trị thì reset lỗi. */
  open?: boolean,
): ModalFormApi<K> {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  // Giữ rules mới nhất mà không làm `validate` đổi định danh mỗi lần render.
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  useEffect(() => { setErrors({}); setSubmitted(false); }, [open]);

  const validate = useCallback((values: Partial<Record<K, unknown>>) => {
    const next: Partial<Record<K, string>> = {};
    (Object.keys(rulesRef.current) as K[]).forEach((key) => {
      const rule = rulesRef.current[key];
      if (!rule) return;
      const value = values[key];
      if (rule.required && isBlank(value)) {
        next[key] = rule.message ?? `Vui lòng nhập ${rule.label ?? key}`;
        return;
      }
      const custom = rule.validate?.(value);
      if (custom) next[key] = custom;
    });
    setSubmitted(true);
    setErrors(next);
    return Object.keys(next).length === 0;
  }, []);

  const clear = useCallback((key: K) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const reset = useCallback(() => { setErrors({}); setSubmitted(false); }, []);

  const setError = useCallback((key: K, msg: string) => {
    setErrors((prev) => ({ ...prev, [key]: msg }));
  }, []);

  return { errors, validate, clear, reset, setError, submitted };
}
