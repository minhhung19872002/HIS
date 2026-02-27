import api from './client';

export interface NotificationDto {
  id: string;
  title: string;
  content: string;
  notificationType: string; // Info, Warning, Error, Success
  module?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export const getMyNotifications = (limit = 50) =>
  api.get<NotificationDto[]>(`/notification/my?limit=${limit}`);

export const getUnreadCount = () =>
  api.get<{ count: number }>('/notification/unread-count');

export const markAsRead = (id: string) =>
  api.put(`/notification/${id}/read`);

export const markAllAsRead = () =>
  api.put<{ count: number }>('/notification/read-all');

export const sendTestNotification = () =>
  api.post<{ id: string }>('/notification/test');
