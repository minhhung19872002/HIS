import client from './client';

// Partograph (Biểu đồ chuyển dạ)
export const partographApi = {
  getRecords: (admissionId: string, params?: { fromDate?: string; toDate?: string }) =>
    client.get('/clinical-records/partograph', { params: { admissionId, ...params } })
      .then(r => r.data?.data ?? r.data ?? []).catch(() => []),

  save: (data: Record<string, unknown>) =>
    client.post('/clinical-records/partograph', data)
      .then(r => r.data).catch(() => null),

  delete: (id: string) =>
    client.delete(`/clinical-records/partograph/${id}`)
      .then(r => r.data).catch(() => null),
};

// Anesthesia (Gây mê hồi sức)
export const anesthesiaApi = {
  getRecords: (params?: { surgeryId?: string; patientId?: string }) =>
    client.get('/clinical-records/anesthesia', { params })
      .then(r => r.data?.data ?? r.data ?? []).catch(() => []),

  getById: (id: string) =>
    client.get(`/clinical-records/anesthesia/${id}`)
      .then(r => r.data?.data ?? r.data).catch(() => null),

  save: (data: Record<string, unknown>) =>
    client.post('/clinical-records/anesthesia', data)
      .then(r => r.data).catch(() => null),

  delete: (id: string) =>
    client.delete(`/clinical-records/anesthesia/${id}`)
      .then(r => r.data).catch(() => null),
};
