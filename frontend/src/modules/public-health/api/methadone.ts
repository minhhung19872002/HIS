import dayjs from 'dayjs';
import { apiClient } from '../../../services/apiClient';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';

// Backend contract (QA-R2): the old client posted to /methadone/patients, /methadone/doses and
// /methadone/urine-tests, none of which exist (405/404) — enroll, dispensing, urine tests and edits
// never saved. Real routes:
//   GET  /methadone/patients                       (MethadoneListDto, paged)
//   POST /methadone/enroll                         (CreateMethadoneDto2)
//   GET  /public-health/methadone/patients/{id}
//   PUT  /public-health/methadone/patients/{id}    (UpdateMethadonePatientDto)
//   POST /public-health/methadone/dosing           (CreateMethadoneDosingDto — has takeHome)
//   GET  /public-health/methadone/patients/{id}/dosing-history
//   POST /methadone/urine-screening                (CreateScreeningDto — BE derives overall result)
//   GET  /methadone/patient/{id}/screenings
//   GET  /methadone/dashboard

// ---- Types ----

export interface MethadonePatient {
  id: string;
  /** HIS patient id (Patients.Id) — required to enroll. */
  patientId?: string;
  patientName: string;
  patientCode: string;
  gender: number;
  dateOfBirth: string;
  address: string;
  phone: string;
  enrollmentDate: string;
  phase: string; // induction, stabilization, maintenance, tapering (seed data: "1".."4")
  currentDose: number; // mg
  doseType: string; // witnessed, takeHome
  attendingDoctor: string;
  status: number; // 0=active, 1=suspended, 2=completed, 3=transferred, 4=dropped
  lastDoseDate?: string;
  missedDoses: number;
  urineTestDate?: string;
  notes?: string;
}

export interface DoseRecord {
  id: string;
  patientId: string;
  patientName: string;
  doseDate: string;
  doseAmount: number; // mg
  doseType: string; // witnessed, takeHome
  administeredBy: string;
  witnessedBy?: string;
  notes?: string;
  status: number; // BE: 0=given, 1=missed, 2=refused, 3=holiday
}

export interface UrineTest {
  id: string;
  patientId: string;
  patientName: string;
  testDate: string;
  morphine: string; // positive, negative
  amphetamine: string;
  thc: string;
  benzodiazepine: string;
  methadone: string;
  otherSubstances?: string;
  collectedBy: string;
  notes?: string;
}

export interface MethadoneStats {
  activePatients: number;
  todayDoses: number;
  monthlyUrineTests: number;
  missedDoses: number;
}

type MethadoneListDto = {
  id: string;
  patientId: string;
  patientName?: string | null;
  patientCode?: string | null;
  enrollmentDate: string;
  currentDoseMg: number;
  phase?: string | null;
  status: number;
  lastDosingDate?: string | null;
  missedDoseCount: number;
  notes?: string | null;
};

type DosingRecordDto = {
  id: string;
  methadonePatientId: string;
  dosingDate: string;
  doseMg: number;
  witnessed: boolean;
  takeHome: boolean;
  administeredBy?: string | null;
  notes?: string | null;
  status: number;
};

type ScreeningDto = {
  id: string;
  methadonePatientId: string;
  screeningDate: string;
  morphine?: string | null;
  amphetamine?: string | null;
  thc?: string | null;
  benzodiazepine?: string | null;
  methadoneResult?: string | null;
  notes?: string | null;
};

/** VN wall-clock without "Z": BE compares DosingDate against the VN calendar day (one dose per day). */
const vnNow = () => dayjs().format('YYYY-MM-DDTHH:mm:ss');

const mapPatient = (d: MethadoneListDto): MethadonePatient => ({
  id: d.id,
  patientId: d.patientId,
  patientName: d.patientName || '',
  patientCode: d.patientCode || '',
  gender: 0,
  dateOfBirth: '',
  address: '',
  phone: '',
  enrollmentDate: d.enrollmentDate,
  phase: d.phase || '',
  currentDose: d.currentDoseMg ?? 0,
  doseType: '',
  attendingDoctor: '',
  status: d.status,
  lastDoseDate: d.lastDosingDate || undefined,
  missedDoses: d.missedDoseCount ?? 0,
  notes: d.notes || undefined,
});

// ---- API Functions ----

export const searchMethadonePatients = async (params?: {
  keyword?: string;
  phase?: string;
  status?: number;
}): Promise<MethadonePatient[]> => {
  try {
    // BE pages with a default pageSize of 20 — ask for the whole program list (page filters client-side).
    const response = await apiClient.get<unknown>('/methadone/patients', {
      params: { ...params, pageIndex: 0, pageSize: 1000 },
    });
    return normalizeArrayResponse<MethadoneListDto>(response.data).map(mapPatient);
  } catch {
    console.warn('Failed to fetch methadone patients');
    return [];
  }
};

export const getMethadonePatientById = async (id: string) => {
  const response = await apiClient.get<MethadoneListDto>(`/public-health/methadone/patients/${id}`);
  return mapPatient(response.data);
};

export const enrollPatient = async (data: Partial<MethadonePatient>) => {
  if (!data.patientId) throw new Error('Chưa chọn bệnh nhân');
  const response = await apiClient.post('/methadone/enroll', {
    patientId: data.patientId,
    enrollmentDate: data.enrollmentDate,
    currentDose: data.currentDose,
    notes: data.notes,
  });
  return response.data;
};

export const updatePatient = async (id: string, data: Partial<MethadonePatient>) => {
  const response = await apiClient.put(`/public-health/methadone/patients/${id}`, {
    status: data.status,
    currentDoseMg: data.currentDose,
    notes: data.notes,
  });
  return response.data;
};

export const recordDose = async (data: Partial<DoseRecord>) => {
  const response = await apiClient.post('/public-health/methadone/dosing', {
    methadonePatientId: data.patientId,
    dosingDate: data.doseDate || vnNow(),
    doseMg: data.doseAmount,
    witnessed: data.doseType !== 'takeHome',
    takeHome: data.doseType === 'takeHome',
    administeredBy: data.administeredBy,
    status: data.status ?? 0,
    notes: data.notes,
  });
  return response.data;
};

export const getDosingHistory = async (params?: {
  patientId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<DoseRecord[]> => {
  try {
    if (params?.patientId) {
      const response = await apiClient.get<unknown>(`/public-health/methadone/patients/${params.patientId}/dosing-history`);
      return normalizeArrayResponse<DosingRecordDto>(response.data).map((d) => ({
        id: d.id,
        patientId: d.methadonePatientId,
        patientName: '',
        doseDate: d.dosingDate,
        doseAmount: d.doseMg,
        doseType: d.takeHome ? 'takeHome' : 'witnessed',
        administeredBy: d.administeredBy || '',
        notes: d.notes || undefined,
        status: d.status,
      }));
    }
    return [];
  } catch {
    console.warn('Failed to fetch dosing history');
    return [];
  }
};

export const recordUrineTest = async (data: Partial<UrineTest>) => {
  const response = await apiClient.post('/methadone/urine-screening', {
    methadonePatientId: data.patientId,
    screeningDate: data.testDate || vnNow(),
    morphine: data.morphine,
    amphetamine: data.amphetamine,
    thc: data.thc,
    benzodiazepine: data.benzodiazepine,
    methadoneResult: data.methadone,
    notes: data.notes,
  });
  return response.data;
};

export const getUrineTests = async (params?: {
  patientId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<UrineTest[]> => {
  try {
    if (params?.patientId) {
      const response = await apiClient.get<unknown>(`/methadone/patient/${params.patientId}/screenings`);
      return normalizeArrayResponse<ScreeningDto>(response.data).map((u) => ({
        id: u.id,
        patientId: u.methadonePatientId,
        patientName: '',
        testDate: u.screeningDate,
        morphine: u.morphine || '',
        amphetamine: u.amphetamine || '',
        thc: u.thc || '',
        benzodiazepine: u.benzodiazepine || '',
        methadone: u.methadoneResult || '',
        collectedBy: '',
        notes: u.notes || undefined,
      }));
    }
    return [];
  } catch {
    console.warn('Failed to fetch urine tests');
    return [];
  }
};

export const getMethadoneStats = async (): Promise<MethadoneStats> => {
  try {
    const response = await apiClient.get<{
      totalActive: number; dosedToday: number; missedToday: number; totalUrineThisMonth: number;
    }>('/methadone/dashboard');
    return {
      activePatients: response.data?.totalActive ?? 0,
      todayDoses: response.data?.dosedToday ?? 0,
      monthlyUrineTests: response.data?.totalUrineThisMonth ?? 0,
      missedDoses: response.data?.missedToday ?? 0,
    };
  } catch {
    console.warn('Failed to fetch methadone statistics');
    return { activePatients: 0, todayDoses: 0, monthlyUrineTests: 0, missedDoses: 0 };
  }
};

export default {
  searchMethadonePatients,
  getMethadonePatientById,
  enrollPatient,
  updatePatient,
  recordDose,
  getDosingHistory,
  recordUrineTest,
  getUrineTests,
  getMethadoneStats,
};
