import { apiClient } from './client';

export interface SmsBalanceDto {
  balance: number;
  currency?: string;
  provider?: string;
  isEnabled: boolean;
}

export interface SmsLogDto {
  id: string;
  phoneNumber: string;
  message: string;
  messageType: string;
  provider: string;
  status: number; // 0=Sent, 1=Failed, 2=DevMode
  errorMessage?: string;
  patientName?: string;
  relatedEntityType?: string;
  createdAt: string;
}

export interface SmsLogSearchDto {
  messageType?: string;
  status?: number;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface SmsLogPagedResult {
  items: SmsLogDto[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

export interface SmsStatsByType {
  messageType: string;
  sent: number;
  failed: number;
  devMode: number;
  total: number;
}

export interface SmsStatsByDay {
  date: string;
  sent: number;
  failed: number;
  total: number;
}

export interface SmsStatsDto {
  totalSent: number;
  totalFailed: number;
  totalDevMode: number;
  successRate: number;
  byType: SmsStatsByType[];
  byDay: SmsStatsByDay[];
}

export const getSmsBalance = () =>
  apiClient.get<SmsBalanceDto>('/sms/balance');

export const testSmsConnection = () =>
  apiClient.post<{ success: boolean }>('/sms/test');

export const sendTestSms = (phoneNumber: string, message?: string) =>
  apiClient.post<{ success: boolean; phone: string }>('/sms/send-test', { phoneNumber, message });

export const getSmsLogs = (params: SmsLogSearchDto) =>
  apiClient.get<SmsLogPagedResult>('/sms/logs', { params });

export const getSmsStats = (fromDate?: string, toDate?: string) =>
  apiClient.get<SmsStatsDto>('/sms/stats', { params: { fromDate, toDate } });
