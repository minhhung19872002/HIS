import axios from 'axios';
import { API_URL } from '../config/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 = lỗi XÁC THỰC (token thiếu / hết hạn / không hợp lệ). Backend trả 403 cho lỗi
    // PHÂN QUYỀN, nên gặp 401 nghĩa là phiên đã hết hiệu lực → xoá phiên + đưa về /login.
    // Trước đây chỉ redirect khi không còn token trong localStorage, nên token hết hạn (JWT
    // sống 60 phút, không có refresh) khiến mọi call nền 401 bị nuốt → các trang im lặng rỗng
    // dữ liệu (vd Tiếp đón báo "Không có phòng khám khả dụng") mà không bắt đăng nhập lại.
    if (error.response?.status === 401) {
      // /inspector-portal là cổng standalone (login riêng của giám định viên BHXH);
      // không redirect về /login chính kể cả khi call nền (notification poll) bị 401.
      const onInspectorPortal = window.location.pathname.startsWith('/inspector-portal');
      if (!onInspectorPortal) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
