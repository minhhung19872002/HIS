import apiClient from '../../../services/apiClient';

// HSBA chuyên khoa (TT 32/2023). Tách call ra api layer (không gọi axios/client trong component).

/** Tìm kiếm HSBA chuyên khoa — BE SpecialtyEmrSearchDto hỗ trợ keyword/specialtyType/fromDate/toDate + phân trang. */
export const searchSpecialtyRecords = (params: {
  pageIndex?: number; pageSize?: number; keyword?: string;
  specialtyType?: string; fromDate?: string; toDate?: string;
} = {}) =>
  apiClient.get('/specialty-emr/search', {
    params: {
      pageIndex: params.pageIndex ?? 0,
      pageSize: params.pageSize ?? 200,
      keyword: params.keyword || undefined,
      specialtyType: params.specialtyType || undefined,
      fromDate: params.fromDate || undefined,
      toDate: params.toDate || undefined,
    },
  });

/** Chi tiết 1 HSBA chuyên khoa. */
export const getSpecialtyRecord = (id: string) => apiClient.get(`/specialty-emr/${id}`);

/** Tạo / cập nhật HSBA chuyên khoa. */
export const saveSpecialtyRecord = (payload: unknown) => apiClient.post('/specialty-emr', payload);

/** Xoá HSBA chuyên khoa. */
export const deleteSpecialtyRecord = (id: string) => apiClient.delete(`/specialty-emr/${id}`);

/** Tải bản in (HTML/PDF) HSBA chuyên khoa. */
export const getSpecialtyRecordPdf = (id: string) =>
  apiClient.get(`/specialty-emr/${id}/pdf`, { responseType: 'blob' });

/** Tải file XML HSBA chuyên khoa. */
export const getSpecialtyRecordXml = (id: string) =>
  apiClient.get(`/specialty-emr/${id}/xml`, { responseType: 'blob' });
