import apiClient from './client';

// Khảo sát hài lòng người bệnh. Tách call ra api layer (không gọi axios/client trong component).

/** Kết quả khảo sát hài lòng. */
export const getSurveyResults = () => apiClient.get('/satisfaction-survey/results');
