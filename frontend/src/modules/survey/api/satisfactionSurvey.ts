import apiClient from '../../../services/apiClient';

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

export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'rating' | 'yesno' | 'text' | 'multiple_choice';
  required: boolean;
  options?: string[];
}

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  targetGroup: string;
  questions: SurveyQuestion[];
  status: string;
  createdAt: string;
}

export interface SurveyConfig {
  autoSend: boolean;
  sendDelayHours: number;
  channels: string[];
  reminderEnabled: boolean;
  reminderAfterHours: number;
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

// Templates (mẫu khảo sát + question builder)

/** Danh sách mẫu khảo sát. */
export const getTemplates = () => apiClient.get<SurveyTemplate[]>('/satisfaction-survey/templates');

/** Tạo mẫu khảo sát mới. */
export const createTemplate = (payload: Partial<SurveyTemplate>) =>
  apiClient.post('/satisfaction-survey/templates', payload);

/** Cập nhật mẫu khảo sát. */
export const updateTemplate = (id: string, payload: Partial<SurveyTemplate>) =>
  apiClient.put(`/satisfaction-survey/templates/${id}`, payload);

/** Xóa mẫu khảo sát. */
export const deleteTemplate = (id: string) =>
  apiClient.delete(`/satisfaction-survey/templates/${id}`);

// Config

/** Cấu hình gửi khảo sát (auto-send, kênh, nhắc lại). */
export const getConfig = () => apiClient.get<SurveyConfig>('/satisfaction-survey/config');

/** Lưu cấu hình gửi khảo sát. */
export const updateConfig = (config: SurveyConfig) =>
  apiClient.put('/satisfaction-survey/config', config);

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
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getConfig,
  updateConfig,
  getCallbacks,
  contactCallback,
  acknowledgeFeedback,
  exportSurveys,
};
