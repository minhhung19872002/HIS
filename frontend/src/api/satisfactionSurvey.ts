import apiClient from './client';

// Khảo sát hài lòng người bệnh. Tách call ra api layer (không gọi axios/client trong component).

// ==================== INTERFACES ====================

export interface Campaign {
  id: string;
  campaignCode: string;
  name: string;
  description?: string;
  targetGroup?: string;
  startDate: string;
  endDate: string;
  templateId?: string;
  templateName?: string;
  status: number; // 0=Draft, 1=Active, 2=Closed, 3=Archived
  targetCount: number;
  actualCount: number;
  notes?: string;
}

export interface CreateCampaignDto {
  name: string;
  description?: string;
  targetGroup?: string;
  startDate: string;
  endDate: string;
  templateId?: string;
  templateName?: string;
  targetCount?: number;
  notes?: string;
}

export interface ContactCallbackDto {
  surveyResultId?: string;
  campaignId?: string;
  patientName?: string;
  patientPhone?: string;
  patientCode?: string;
  issueDescription?: string;
  contactedByName?: string;
  resolution?: string;
}

// ==================== API FUNCTIONS ====================

/** Kết quả khảo sát hài lòng. */
export const getSurveyResults = () => apiClient.get('/satisfaction-survey/results');

/** Thống kê tổng hợp khảo sát. */
export const getSurveyStats = () => apiClient.get('/satisfaction-survey/stats');

/** Phân tích xu hướng khảo sát (90 ngày). */
export const getSurveyAnalysis = () => apiClient.get('/satisfaction-survey/analysis');

// Campaigns

/** Danh sách chiến dịch khảo sát. */
export const getCampaigns = (status?: number) =>
  apiClient.get<Campaign[]>('/satisfaction-survey/campaigns', { params: status != null ? { status } : undefined });

/** Tạo chiến dịch khảo sát mới. */
export const createCampaign = (dto: CreateCampaignDto) =>
  apiClient.post('/satisfaction-survey/campaigns', dto);

// Feedback Callbacks

/** Danh sách phản hồi cần liên hệ lại. */
export const getCallbacks = (status?: number) =>
  apiClient.get('/satisfaction-survey/callbacks', { params: status != null ? { status } : undefined });

/** Ghi nhận liên hệ lại bệnh nhân (contactCallback). */
export const contactCallback = (dto: ContactCallbackDto) =>
  apiClient.post('/satisfaction-survey/callbacks', dto);

/** Xác nhận đã tiếp nhận phản hồi (acknowledgeFeedback). */
export const acknowledgeFeedback = (id: string, note?: string) =>
  apiClient.post(`/satisfaction-survey/callbacks/${id}/acknowledge`, { note });

// Export

/** Xuất dữ liệu khảo sát CSV. */
export const exportSurveys = (params?: { from?: string; to?: string; campaignId?: string }) =>
  apiClient.get('/satisfaction-survey/export', { params, responseType: 'blob' });

export default {
  getSurveyResults,
  getSurveyStats,
  getSurveyAnalysis,
  getCampaigns,
  createCampaign,
  getCallbacks,
  contactCallback,
  acknowledgeFeedback,
  exportSurveys,
};
