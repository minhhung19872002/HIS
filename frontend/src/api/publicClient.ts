import axios from 'axios';
import { API_URL } from '../config/api.config';

export const publicClient = axios.create({ baseURL: API_URL });

// Response interceptor — auto-unwrap ApiResponse envelope.
// Backend bọc MỌI 2xx ObjectResult vào {success,data} qua ApiResponseWrapperFilter
// (HIS.API/Filters/ApiResponseWrapperFilter.cs, đăng ký global ở Program.cs). `apiClient`
// đã unwrap từ lâu, còn `publicClient` thì chưa → mọi caller đọc `res.data` nhận nguyên
// cái envelope thay vì payload: dropdown khoa/bác sĩ ở modal sửa lịch hẹn rỗng (Select
// rơi về hiện GUID thô), kiosk `/reception/rooms/overview` ra mảng rỗng vì
// `Array.isArray(envelope)` = false, bảng điện tử hàng đợi hiện sai.
// Tolerant 2 shape (envelope/bare) giống AuthContext, commit 92d35a2 — chỉ unwrap khi có
// ĐỦ cả `success` lẫn `data`.
publicClient.interceptors.response.use((response) => {
  const body = response.data;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    response.data = (body as { data: unknown }).data;
  }
  return response;
});
