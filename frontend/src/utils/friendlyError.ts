/**
 * friendlyError — chuyển lỗi kỹ thuật (axios/Error) thành thông báo tiếng Việt thân thiện
 * cho toast/banner (#467 P0-5). Log kỹ thuật giữ riêng qua console.warn (lỗi mong đợi —
 * convention dự án: console.warn cho expected failures, không console.error).
 *
 * Ưu tiên: message nghiệp vụ backend trả về (data.message) → ngữ cảnh nghiệp vụ do caller
 * truyền (fallback) HOẶC registry HTTP tiếng Việt (httpErrorMessage) tuỳ status →
 * network/timeout → fallback chung. KHÔNG bao giờ lộ stack/status code trần cho người dùng.
 */
import { httpErrorMessage } from '../components/shared/HttpError';

const DEFAULT_FALLBACK = 'Đã xảy ra lỗi. Vui lòng thử lại hoặc liên hệ quản trị viên.';

/**
 * Những status mà thông điệp-theo-status HỮU ÍCH HƠN ngữ cảnh nghiệp vụ của caller,
 * vì người dùng phải hành động khác hẳn (đăng nhập lại · xin quyền · chờ bảo trì · giảm cỡ tệp…).
 * Các status còn lại (400/500/502/…) có thông điệp chung chung, lúc đó ngữ cảnh của caller
 * ("Xoá thất bại", "Duyệt phiếu thất bại"…) mới là thứ người dùng cần — vd DELETE trả 400
 * không kèm body mà báo "Dữ liệu gửi lên không hợp lệ" là sai, người dùng có gửi dữ liệu gì đâu.
 */
const STATUS_BEATS_CONTEXT = new Set([401, 403, 404, 405, 408, 409, 410, 413, 415, 429, 503, 504]);

interface AxiosLikeError {
  response?: { status?: number; data?: { message?: unknown; error?: unknown } };
  request?: unknown;
  code?: string;
  message?: string;
}

const isAxiosLike = (e: unknown): e is AxiosLikeError =>
  !!e && typeof e === 'object' && ('response' in e || 'request' in e || 'code' in e);

export function friendlyErrorMessage(e: unknown, fallback = DEFAULT_FALLBACK): string {
  console.warn('[his] operation failed:', e); // log kỹ thuật riêng — không hiển thị cho user
  const hasContext = fallback !== DEFAULT_FALLBACK; // caller có nêu rõ thao tác nào hỏng không
  if (isAxiosLike(e)) {
    if (e.response) {
      const m = e.response.data?.message ?? e.response.data?.error;
      // message nghiệp vụ từ BE (vd "Số thẻ BHYT không hợp lệ") — dùng thẳng nếu là chuỗi ngắn gọn
      if (typeof m === 'string' && m.trim() && m.length <= 300) return m;
      const status = e.response.status;
      if (status && (!hasContext || STATUS_BEATS_CONTEXT.has(status))) return httpErrorMessage(status);
      return fallback;
    }
    if (e.code === 'ECONNABORTED') return 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
    if (e.request) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
  }
  return fallback;
}
