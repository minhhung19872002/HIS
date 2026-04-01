import { apiClient } from './client';

// ---- Types ----

export interface Vaccination {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  dateOfBirth: string;
  gender: number;
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
  severity: number; // 1=mild, 2=moderate, 3=severe, 4=serious
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
    severity: dto.aefiSeverity ?? 1,
    symptoms: dto.aefiReport,
    outcome: dto.status === 1 ? 'Da xu tri' : 'Dang theo doi',
    reportedBy: dto.administeredBy || 'N/A',
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

export const searchCampaigns = async (params?: {
  keyword?: string;
  status?: number;
}) => {
  try {
    void params;
    return [];
  } catch {
    console.warn('Failed to fetch campaigns');
    return [];
  }
};

export const createCampaign = async (data: Partial<Campaign>) => {
  void data;
  throw new Error('Campaign API is not supported by the current backend');
};

export const getCampaignStats = async (): Promise<CampaignStats> => {
  try {
    const response = await apiClient.get<ImmunizationStatisticsDto>('/immunization/statistics');
    return {
      totalCampaigns: 0,
      activeCampaigns: 0,
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
  getCampaignStats,
  getAefiReports,
};
