import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';

// Create axios instance
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5106/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.warn('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data;
    // Normalize response format: wrap raw data in { success: true, data: ... } if needed
    if (data && typeof data === 'object' && !Array.isArray(data) && 'success' in data) {
      // Already in ApiResponse format
      return data;
    }
    // Raw data from API - wrap in standard format
    return { success: true, data: data };
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          message.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          break;
        case 403:
          message.error('Bạn không có quyền thực hiện thao tác này.');
          break;
        case 404:
          message.error('Không tìm thấy tài nguyên yêu cầu.');
          break;
        case 422:
          // Validation error
          if (data?.errors) {
            const errorMessages = Object.values(data.errors).flat().join(', ');
            message.error(errorMessages);
          } else {
            message.error(data?.message || 'Dữ liệu không hợp lệ.');
          }
          break;
        case 500:
          message.error('Lỗi máy chủ. Vui lòng thử lại sau.');
          break;
        default:
          message.error(data?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } else if (error.request) {
      message.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
    } else {
      message.error('Đã xảy ra lỗi. Vui lòng thử lại.');
    }

    return Promise.reject(error);
  }
);

// Helper methods
export const get = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return request.get(url, config);
};

export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return request.post(url, data, config);
};

export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return request.put(url, data, config);
};

export const patch = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return request.patch(url, data, config);
};

export const del = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return request.delete(url, config);
};

// Export default instance
export default request;
