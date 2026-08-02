import { describe, expect, it } from 'vitest';
import apiClient from './apiClient';
import type { AxiosResponse, AxiosInterceptorManager } from 'axios';

// #212: test envelope-unwrap qua chính fulfilled-handler của response interceptor
// (không đổi code sản phẩm — lấy handler thật từ axios instance).

type Handler = { fulfilled: (r: AxiosResponse) => AxiosResponse };
const getUnwrapHandler = (): Handler['fulfilled'] => {
  const mgr = apiClient.interceptors.response as AxiosInterceptorManager<AxiosResponse> & {
    handlers?: Handler[];
  };
  const h = mgr.handlers?.[0]?.fulfilled;
  if (!h) throw new Error('response interceptor không tồn tại — apiClient đã đổi cấu trúc?');
  return h;
};

const fakeResponse = (data: unknown): AxiosResponse =>
  ({ data, status: 200, statusText: 'OK', headers: {}, config: {} }) as AxiosResponse;

describe('apiClient envelope auto-unwrap', () => {
  it('unwrap {success,data} → caller nhận thẳng data', () => {
    const h = getUnwrapHandler();
    const r = h(fakeResponse({ success: true, data: { id: 7 }, message: null }));
    expect(r.data).toEqual({ id: 7 });
  });

  it('unwrap cả khi success=false (giữ hành vi hiện tại)', () => {
    const h = getUnwrapHandler();
    const r = h(fakeResponse({ success: false, data: null, message: 'err' }));
    expect(r.data).toBeNull();
  });

  it('payload KHÔNG có envelope → giữ nguyên (mảng thô)', () => {
    const h = getUnwrapHandler();
    const r = h(fakeResponse([1, 2, 3]));
    expect(r.data).toEqual([1, 2, 3]);
  });

  it('object thiếu 1 trong 2 khóa success/data → không unwrap', () => {
    const h = getUnwrapHandler();
    expect(h(fakeResponse({ success: true })).data).toEqual({ success: true });
    expect(h(fakeResponse({ data: 1 })).data).toEqual({ data: 1 });
  });

  it('primitive/null giữ nguyên', () => {
    const h = getUnwrapHandler();
    expect(h(fakeResponse('plain')).data).toBe('plain');
    expect(h(fakeResponse(null)).data).toBeNull();
  });
});
