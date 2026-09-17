import client from '../../../services/apiClient';

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

  // Errors propagate: callers show "saved" after the await, so a swallowed failure read as success (QA-R6).
  save: (data: Record<string, unknown>) =>
    client.post('/clinical-records/anesthesia', data)
      .then(r => r.data),

  delete: (id: string) =>
    client.delete(`/clinical-records/anesthesia/${id}`)
      .then(r => r.data),
};

/**
 * The anesthesia save REPLACES every field and child list of the record, while the pre-anesthesia,
 * intra-op monitor and post-anesthesia modals each edit only their own part of the same record — the
 * monitor save reset ASA/Mallampati/allergies, the pre/post saves wiped the monitors and drugs (QA-R6).
 * Each modal spreads this (the record as loaded) under its own fields.
 */
export const anesthesiaBasePayload = (existing: Record<string, unknown> | null | undefined): Record<string, unknown> =>
  existing
    ? {
        asaClass: existing.asaClass,
        mallampatiScore: existing.mallampatiScore,
        allergies: existing.allergies ?? undefined,
        npoStatus: existing.npoStatus ?? undefined,
        anesthesiaType: existing.anesthesiaType,
        airwayPlan: existing.airwayPlan ?? undefined,
        preOpAssessment: existing.preOpAssessment ?? undefined,
        psychologicalAssessment: existing.psychologicalAssessment ?? undefined,
        recoveryNotes: existing.recoveryNotes ?? undefined,
        postSurgeryPlan: existing.postSurgeryPlan ?? undefined,
        status: existing.status,
        monitors: existing.monitors ?? [],
        drugs: existing.drugs ?? [],
        fluids: existing.fluids ?? [],
      }
    : {};
