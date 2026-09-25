import { apiClient } from '../../../services/apiClient';

// ---- Types ----

export interface Vaccination {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  dateOfBirth: string;
  gender: number;
  /** Age in years from BE (ImmunizationListDto.PatientAge) — gender is not returned by the BE. */
  patientAge?: number;
  vaccineName: string;
  vaccineCode: string;
  lotNumber: string;
  doseNumber: number;
  totalDoses: number;
  vaccinationDate: string;
  nextDueDate?: string;
  site: string; // injection site
  route: string; // IM, SC, ID, Oral
  administeredBy: string;
  status: number; // 0=scheduled, 1=completed, 2=missed, 3=deferred
  notes?: string;
  adverseEvent?: string;
}

export interface VaccinationSchedule {
  vaccineCode: string;
  vaccineName: string;
  doses: {
    doseNumber: number;
    ageMonths: number;
    ageLabel: string;
    status: string;
    scheduledDate?: string;
    completedDate?: string;
  }[];
}

export interface Campaign {
  id: string;
  code?: string;
  name: string;
  vaccineCode: string;
  vaccineName: string;
  startDate: string;
  endDate: string;
  targetPopulation: number;
  completedCount: number;
  status: number; // 0=planned, 1=active, 2=completed, 3=cancelled
  area: string;
  description?: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalVaccinated: number;
  coveragePercent: number;
}

export interface AefiReport {
  id: string;
  patientName: string;
  vaccineName: string;
  vaccinationDate: string;
  reactionDate: string;
  severity: number; // BE VaccinationRecord.AefiSeverity: 0=none, 1=mild, 2=moderate, 3=severe
  symptoms: string;
  outcome: string;
  reportedBy: string;
  status: number; // 0=reported, 1=investigating, 2=closed
}

type ImmunizationRecordDto = {
  id: string;
  patientId: string;
  patientName?: string | null;
  patientCode?: string | null;
  patientAge?: number | null;
  vaccineName: string;
  vaccineCode?: string | null;
  lotNumber?: string | null;
  doseNumber: number;
  vaccinationDate: string;
  injectionSite?: string | null;
  route?: string | null;
  nextDoseDate?: string | null;
  aefiReport?: string | null;
  aefiSeverity?: number | null;
  status: number;
  administeredBy?: string | null;
  notes?: string | null;
};

type ImmunizationPagedResultDto = {
  items: ImmunizationRecordDto[];
  totalCount: number;
};

type ImmunizationStatisticsDto = {
  totalRecords: number;
  completedCount: number;
  scheduledCount: number;
  missedCount: number;
  aefiCount: number;
};

const mapVaccination = (dto: ImmunizationRecordDto): Vaccination => ({
  id: dto.id,
  patientId: dto.patientId,
  patientName: dto.patientName || '',
  patientCode: dto.patientCode || '',
  dateOfBirth: '',
  gender: 0,
  patientAge: dto.patientAge ?? undefined,
  vaccineName: dto.vaccineName,
  vaccineCode: dto.vaccineCode || '',
  lotNumber: dto.lotNumber || '',
  doseNumber: dto.doseNumber,
  totalDoses: Math.max(dto.doseNumber, 1),
  vaccinationDate: dto.vaccinationDate,
  nextDueDate: dto.nextDoseDate || undefined,
  site: dto.injectionSite || '',
  route: dto.route || '',
  administeredBy: dto.administeredBy || '',
  status: dto.status,
  notes: dto.notes || undefined,
  adverseEvent: dto.aefiReport || undefined,
});

const mapAefiReport = (dto: ImmunizationRecordDto): AefiReport | null => {
  if (!dto.aefiReport) return null;
  return {
    id: dto.id,
    patientName: dto.patientName || '',
    vaccineName: dto.vaccineName,
    vaccinationDate: dto.vaccinationDate,
    reactionDate: dto.vaccinationDate,
    severity: dto.aefiSeverity ?? 0,
    symptoms: dto.aefiReport,
    // QA-R11: "Da xu tri" was derived from the VACCINATION status (every administered dose → "treated"); the BE keeps
    // no AEFI follow-up/outcome, so show what was actually recorded (notes) instead of a fabricated outcome.
    outcome: dto.notes || '',
    reportedBy: dto.administeredBy || '',
    status: dto.status === 1 ? 2 : 0,
  };
};

// ---- API Functions ----

export const searchVaccinations = async (params?: {
  keyword?: string;
  vaccineCode?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
}) => {
  try {
    const response = await apiClient.get<ImmunizationPagedResultDto>('/immunization', {
      params: {
        keyword: params?.keyword,
        status: params?.status,
        vaccineName: params?.vaccineCode,
        dateFrom: params?.fromDate,
        dateTo: params?.toDate,
        pageIndex: 0,
        pageSize: 200,
      },
    });
    return (response.data?.items || []).map(mapVaccination);
  } catch {
    console.warn('Failed to fetch vaccinations');
    return [];
  }
};

export const getVaccinationById = async (id: string) => {
  const records = await searchVaccinations();
  const record = records.find((item) => item.id === id);
  if (!record) {
    throw new Error('Vaccination record not found');
  }
  return record;
};

export const recordVaccination = async (data: Partial<Vaccination>) => {
  const response = await apiClient.post<ImmunizationRecordDto>('/immunization/administer', {
    patientId: data.patientId,
    vaccineName: data.vaccineName,
    vaccineCode: data.vaccineCode,
    lotNumber: data.lotNumber,
    doseNumber: data.doseNumber,
    vaccinationDate: data.vaccinationDate,
    injectionSite: data.site,
    route: data.route,
    nextDoseDate: data.nextDueDate,
    notes: data.notes,
  });
  return mapVaccination(response.data);
};

export const getVaccinationSchedule = async (patientId: string): Promise<VaccinationSchedule[]> => {
  try {
    const response = await apiClient.get<{ scheduleItems?: Array<{
      vaccineName: string;
      doseNumber: number;
      scheduledDate?: string;
      actualDate?: string;
      status?: number;
      statusName?: string;
    }> }>(`/immunization/patient/${patientId}/schedule`);
    const grouped = new Map<string, VaccinationSchedule>();
    for (const item of response.data?.scheduleItems || []) {
      const existing = grouped.get(item.vaccineName) || {
        vaccineCode: item.vaccineName,
        vaccineName: item.vaccineName,
        doses: [],
      };
      existing.doses.push({
        doseNumber: item.doseNumber,
        ageMonths: 0,
        ageLabel: item.statusName || '',
        status: item.statusName || String(item.status ?? ''),
        scheduledDate: item.scheduledDate,
        completedDate: item.actualDate,
      });
      grouped.set(item.vaccineName, existing);
    }
    return Array.from(grouped.values());
  } catch {
    console.warn('Failed to fetch vaccination schedule');
    return [];
  }
};

// QA-R11: campaigns were a literal [] and "create" threw, although BE PublicHealthController already serves
// GET/POST /public-health/vaccinations/campaigns (VaccinationCampaigns table).
type VaccinationCampaignDto = {
  id: string; campaignCode: string; campaignName: string; vaccineName: string;
  startDate: string; endDate: string; targetGroup?: string | null; targetCount: number;
  completedCount: number; status: number; description?: string | null; areas?: string | null;
};

const mapCampaign = (c: VaccinationCampaignDto): Campaign => ({
  id: c.id, code: c.campaignCode, name: c.campaignName, vaccineCode: '', vaccineName: c.vaccineName,
  startDate: c.startDate, endDate: c.endDate, targetPopulation: c.targetCount || 0,
  completedCount: c.completedCount || 0, status: c.status, area: c.areas || c.targetGroup || '',
  description: c.description || undefined,
});

export const searchCampaigns = async (params?: {
  keyword?: string;
  status?: number;
}): Promise<Campaign[]> => {
  const response = await apiClient.get<VaccinationCampaignDto[]>('/public-health/vaccinations/campaigns');
  const list = (Array.isArray(response.data) ? response.data : []).map(mapCampaign);
  const kw = params?.keyword?.trim().toLowerCase();
  return list.filter((c) => (params?.status == null || c.status === params.status)
    && (!kw || c.name.toLowerCase().includes(kw) || (c.code || '').toLowerCase().includes(kw)));
};

export const createCampaign = async (data: Partial<Campaign>) => {
  const response = await apiClient.post<VaccinationCampaignDto>('/public-health/vaccinations/campaigns', {
    campaignCode: data.code,
    campaignName: data.name,
    vaccineName: data.vaccineName,
    startDate: data.startDate,
    endDate: data.endDate,
    targetCount: data.targetPopulation ?? 0,
    areas: data.area,
    description: data.description,
  });
  return mapCampaign(response.data);
};

/** Ghi nhận phản ứng sau tiêm (AEFI) — BE PUT /immunization/{id}/reaction (severity 0–3). */
export const recordReaction = async (id: string, dto: { aefiReport: string; aefiSeverity: number; notes?: string }) => {
  const response = await apiClient.put<ImmunizationRecordDto>(`/immunization/${id}/reaction`, dto);
  return mapVaccination(response.data);
};

export const getCampaignStats = async (): Promise<CampaignStats> => {
  try {
    const [response, campaigns] = await Promise.all([
      apiClient.get<ImmunizationStatisticsDto>('/immunization/statistics'),
      searchCampaigns().catch(() => [] as Campaign[]),
    ]);
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === 1).length,
      totalVaccinated: response.data?.completedCount || 0,
      coveragePercent: response.data?.totalRecords
        ? Math.round(((response.data.completedCount || 0) / response.data.totalRecords) * 1000) / 10
        : 0,
    };
  } catch {
    console.warn('Failed to fetch campaign statistics');
    return { totalCampaigns: 0, activeCampaigns: 0, totalVaccinated: 0, coveragePercent: 0 };
  }
};

export const getAefiReports = async (params?: {
  keyword?: string;
  severity?: number;
  status?: number;
}) => {
  try {
    const response = await apiClient.get<ImmunizationPagedResultDto>('/immunization', {
      params: {
        keyword: params?.keyword,
        status: params?.status,
        pageIndex: 0,
        pageSize: 200,
      },
    });
    return (response.data?.items || []).map(mapAefiReport).filter((item): item is AefiReport => Boolean(item));
  } catch {
    console.warn('Failed to fetch AEFI reports');
    return [];
  }
};

export default {
  searchVaccinations,
  getVaccinationById,
  recordVaccination,
  getVaccinationSchedule,
  searchCampaigns,
  createCampaign,
  recordReaction,
  getCampaignStats,
  getAefiReports,
};
