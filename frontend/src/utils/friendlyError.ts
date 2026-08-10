/**
 * friendlyError — chuyển lỗi kỹ thuật (axios/Error) thành thông báo tiếng Việt thân thiện
 * cho toast/banner (#467 P0-5). Log kỹ thuật giữ riêng qua console.warn (lỗi mong đợi —
 * convention dự án: console.warn cho expected failures, không console.error).
 *
 * Ưu tiên: message nghiệp vụ backend trả về (data.message) → registry HTTP tiếng Việt
 * (httpErrorMessage) → network/timeout → fallback chung. KHÔNG bao giờ lộ stack/status
 * code trần cho người dùng.
 */
import { httpErrorMessage } from '../components/shared/HttpError';

interface AxiosLikeError {
  response?: { status?: number; data?: { message?: unknown; error?: unknown } };
  request?: unknown;
  code?: string;
  message?: string;
}

const isAxiosLike = (e: unknown): e is AxiosLikeError =>
  !!e && typeof e === 'object' && ('response' in e || 'request' in e || 'code' in e);

export function friendlyErrorMessage(
  e: unknown,
  fallback = 'Đã xảy ra lỗi. Vui lòng thử lại hoặc liên hệ quản trị viên.',
): string {
  console.warn('[his] operation failed:', e); // log kỹ thuật riêng — không hiển thị cho user
  if (isAxiosLike(e)) {
    if (e.response) {
      const m = e.response.data?.message ?? e.response.data?.error;
      // message nghiệp vụ từ BE (vd "Số thẻ BHYT không hợp lệ") — dùng thẳng nếu là chuỗi ngắn gọn
      if (typeof m === 'string' && m.trim() && m.length <= 300) return m;
      if (e.response.status) return httpErrorMessage(e.response.status);
      return fallback;
    }
    if (e.code === 'ECONNABORTED') return 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.';
    if (e.request) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
  }
  return fallback;
}
