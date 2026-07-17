/**
 * Hospital configuration constants
 * Used across print templates and reports
 *
 * #421: đọc từ env (Vercel/hosting đặt VITE_HOSPITAL_NAME per deployment).
 * KHÔNG hardcode placeholder — form pháp lý (MS03/BV-02, MS06…) khi chưa cấu hình
 * sẽ in TRỐNG (điền tay như v1), không in tên bệnh viện giả.
 */
export const HOSPITAL_NAME = (import.meta.env.VITE_HOSPITAL_NAME as string | undefined) || '';
export const HOSPITAL_ADDRESS = (import.meta.env.VITE_HOSPITAL_ADDRESS as string | undefined) || '';
export const HOSPITAL_PHONE = (import.meta.env.VITE_HOSPITAL_PHONE as string | undefined) || '';
