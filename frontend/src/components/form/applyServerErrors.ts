// ─────────────────────────── CRUD (validate + focus + lỗi BE) ───────────────────────────
// Map lỗi validate BACKEND (authoritative) về đúng field Antd Form + cuộn/focus field lỗi.
// Hỗ trợ ModelState `{errors:{Field:[msg]}}` lẫn custom `{field,message}`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyServerErrors(form: any, e: any): boolean {
  const d = e?.response?.data;
  if (!d) return false;
  const raw = d.errors || (d.field ? { [d.field]: [d.message || 'Không hợp lệ'] } : null);
  if (raw && typeof raw === 'object') {
    const fields = Object.entries(raw).filter(([k]) => k && k.toLowerCase() !== 'dto')
      .map(([k, v]) => ({ name: k.charAt(0).toLowerCase() + k.slice(1), errors: (Array.isArray(v) ? v : [String(v)]) as string[] }));
    if (fields.length) { form.setFields(fields); try { form.scrollToField(fields[0].name); } catch { /* ignore */ } return true; }
  }
  return false;
}
