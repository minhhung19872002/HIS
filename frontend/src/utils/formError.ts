import type { FormInstance } from 'antd';
import type { AxiosError } from 'axios';

// Backend trả lỗi validate dạng `{errors: {Field: [msg]}}` (ASP.NET ModelState)
// hoặc `{field, message}` (DomainExceptionFilter). FE cần ánh xạ về đúng field
// Antd Form + cuộn/focus tới field lỗi đầu tiên để UX rõ ràng.
export interface ServerValidationError {
  errors?: Record<string, string[] | string>;
  field?: string;
  message?: string;
}

/**
 * Ánh xạ lỗi validate từ BACKEND (authoritative) lên Antd Form.
 * Trả `true` nếu đã set được ít nhất 1 field lỗi → caller không cần toast tổng.
 */
export function applyServerErrors(form: FormInstance, e: unknown): boolean {
  const ax = e as AxiosError<ServerValidationError>;
  const d = ax?.response?.data;
  if (!d) return false;
  const raw: Record<string, string[] | string> | null =
    d.errors || (d.field ? { [d.field]: [d.message || 'Không hợp lệ'] } : null);
  if (raw && typeof raw === 'object') {
    const fields = Object.entries(raw)
      .filter(([k]) => k && k.toLowerCase() !== 'dto')
      .map(([k, v]) => ({
        name: k.charAt(0).toLowerCase() + k.slice(1),
        errors: (Array.isArray(v) ? v : [String(v)]) as string[],
      }));
    if (fields.length) {
      form.setFields(fields);
      try { form.scrollToField(fields[0].name); } catch { /* ignore */ }
      return true;
    }
  }
  return false;
}
