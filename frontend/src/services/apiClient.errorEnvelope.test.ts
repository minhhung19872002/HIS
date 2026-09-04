import { describe, expect, it, vi, afterEach } from 'vitest';
import apiClient from './apiClient';
import type { AxiosResponse, AxiosInterceptorManager } from 'axios';

/**
 * #219 (T4) — đường LỖI của response interceptor.
 *
 * `apiClient.envelope.test.ts` đã phủ đường thành công (bóc `{success,data}`). Đây là nửa còn lại,
 * và là chỗ mà cả đợt sửa 2026-09-04 dựa vào: sau khi cấp thân chuẩn `{error, message}` cho 95 chỗ
 * trước đây trả thân rỗng, mọi lỗi đường ghi chỉ có một hình dạng — nhưng điều đó **chỉ có ích nếu
 * interceptor giao nguyên thân đó cho người gọi**. Nếu nó bóc, nuốt, hay đổi hình dạng thì phía
 * giao diện lại phải đoán.
 *
 * Hai thứ được neo ở đây:
 *   1. `error.response.data` giữ NGUYÊN `{error, message}` — không bị luật bóc envelope của đường
 *      thành công đụng vào (đường thành công bóc khi có ĐỦ `success` và `data`; thân lỗi không có
 *      hai khóa đó nên phải đi qua nguyên vẹn).
 *   2. `error.response.status` còn nguyên — `AuthContext.login` phân biệt 401 / 429 / phần còn lại
 *      dựa đúng vào con số này để không báo nhầm "sai mật khẩu" khi người dùng chỉ bị chặn tần suất.
 */

type RejectedHandler = (e: unknown) => Promise<unknown>;
const getRejectedHandler = (): RejectedHandler => {
  const mgr = apiClient.interceptors.response as AxiosInterceptorManager<AxiosResponse> & {
    handlers?: { rejected?: RejectedHandler }[];
  };
  const h = mgr.handlers?.[0]?.rejected;
  if (!h) throw new Error('rejected-handler không tồn tại — apiClient đã đổi cấu trúc?');
  return h;
};

const httpError = (status: number, data: unknown) => ({
  isAxiosError: true,
  config: { url: '/api/thu-nghiem' },
  response: { status, data, statusText: '', headers: {}, config: {} },
});

/** Handler trả về một Promise bị từ chối; lấy ra lỗi bên trong để soi. */
async function rejectionOf(status: number, data: unknown): Promise<any> {
  try {
    await getRejectedHandler()(httpError(status, data));
    throw new Error(`handler phải từ chối, nhưng lại resolve (HTTP ${status})`);
  } catch (e) {
    return e;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiClient — thân lỗi tới được người gọi', () => {
  // 401 và 503 KHÔNG có ở đây: hai mã đó có xử lý riêng (401 auto-refresh rồi mới đá về /login,
  // 503 phát sự kiện bảo trì) và chạm vào window.location — thuộc phạm vi đo của e2e, không phải
  // của test đơn vị này.
  it.each([
    [400, { error: 'VALIDATION_FAILED', message: 'Dữ liệu không hợp lệ.' }],
    [404, { error: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu.' }],
    [409, { error: 'CONCURRENT_UPDATE', message: 'Quầy khác vừa cập nhật.' }],
    [500, { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ.' }],
  ])('HTTP %i — giữ nguyên cả mã lẫn thân {error, message}', async (status, body) => {
    const err = await rejectionOf(status, body);
    expect(err.response.status).toBe(status);
    expect(err.response.data).toEqual(body);
  });

  it('thân lỗi KHÔNG bị luật bóc envelope của đường thành công đụng vào', async () => {
    // Ca hiểm: thân lỗi tình cờ mang đủ hai khóa `success` và `data`. Đường thành công sẽ bóc,
    // đường lỗi thì không được — người gọi cần cả `message` bên ngoài.
    const body = { success: false, data: null, error: 'VALIDATION_FAILED', message: 'Thiếu mã thẻ.' };
    const err = await rejectionOf(400, body);
    expect(err.response.data).toEqual(body);
    expect(err.response.data.message).toBe('Thiếu mã thẻ.');
  });

  it('lỗi validate của model-binding thêm `field` vẫn là siêu tập, không mất `message`', async () => {
    const body = { error: 'VALIDATION_FAILED', field: 'examinationId', message: 'Sai định dạng.' };
    const err = await rejectionOf(400, body);
    expect(err.response.data.error).toBe('VALIDATION_FAILED');
    expect(err.response.data.message).toBe('Sai định dạng.');
    expect(err.response.data.field).toBe('examinationId');
  });

  it('429 giữ nguyên mã — AuthContext dựa vào đúng con số này', async () => {
    // Nếu mã 429 bị nuốt hoặc đổi, `AuthContext.login` rơi về nhánh chung và `Login.tsx` lại báo
    // "sai mật khẩu" cho một người chỉ đang bị chặn tần suất — đúng lỗi vừa sửa ở #219.
    const err = await rejectionOf(429, {});
    expect(err.response.status).toBe(429);
  });

  it('lỗi KHÔNG có phản hồi (mất mạng) vẫn được ném lại, không bị nuốt thành công', async () => {
    const netErr = { isAxiosError: true, message: 'Network Error', config: { url: '/api/x' } };
    let rejected = false;
    try {
      await getRejectedHandler()(netErr);
    } catch (e) {
      rejected = true;
      expect(e).toBe(netErr);
    }
    expect(rejected, 'mất mạng mà handler resolve thì người gọi tưởng đã thành công').toBe(true);
  });

  it('thân lỗi rỗng vẫn giữ mã — không được ném ra lỗi khác che mất mã gốc', async () => {
    // Trước đợt sửa, 95 chỗ trả `NotFound()` không thân nên ASP.NET tự dựng ProblemDetails.
    // Nay đã hết, nhưng người gọi vẫn phải sống được với thân rỗng từ tầng hạ tầng (proxy, gateway).
    const err = await rejectionOf(502, '');
    expect(err.response.status).toBe(502);
  });
});
