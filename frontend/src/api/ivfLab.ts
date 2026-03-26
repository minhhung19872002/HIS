import { apiClient } from './client';

// ---- Types ----

export interface IvfCouple {
  id: string;
  wifePatientId: string;
  wifeName?: string;
  wifeCode?: string;
  wifeDob?: string;
  husbandPatientId: string;
  husbandName?: string;
  husbandCode?: string;
  husbandDob?: string;
  infertilityDurationMonths: number;
  infertilityCause?: string;
  marriageDate?: string;
  notes?: string;
  cycleCount: number;
}

export interface IvfCoupleDetail extends IvfCouple {
  cycles: IvfCycle[];
}

export interface IvfCycle {
  id: string;
  coupleId: string;
  cycleNumber: number;
  startDate?: string;
  status: number;
  statusName?: string;
  protocol?: string;
  doctorId?: string;
  doctorName?: string;
  notes?: string;
  embryoCount: number;
  transferCount: number;
}

export interface IvfCycleDetail extends IvfCycle {
  ovumPickup?: IvfOvumPickup;
  embryos: IvfEmbryo[];
  transfers: IvfTransfer[];
  biopsies: IvfBiopsy[];
}

export interface IvfOvumPickup {
  id: string;
  cycleId: string;
  pickupDate?: string;
  totalOvums: number;
  matureOvums: number;
  immatureOvums: number;
  degeneratedOvums: number;
  performedById?: string;
  performedByName?: string;
  notes?: string;
}

export interface IvfEmbryo {
  id: string;
  cycleId: string;
  embryoCode: string;
  day2Grade?: string;
  day3Grade?: string;
  day5Grade?: string;
  day6Grade?: string;
  day7Grade?: string;
  status: number;
  statusName?: string;
  freezeDate?: string;
  thawDate?: string;
  strawCode?: string;
  strawColor?: string;
  boxCode?: string;
  tankCode?: string;
  rackPosition?: string;
  notes?: string;
  imageUrl?: string;
}

export interface IvfTransfer {
  id: string;
  cycleId: string;
  transferDate?: string;
  transferType: number;
  transferTypeName?: string;
  embryoCount: number;
  doctorId?: string;
  doctorName?: string;
  embryologistId?: string;
  embryologistName?: string;
  notes?: string;
  resultStatus: number;
  resultStatusName?: string;
}

export interface IvfSpermSample {
  id: string;
  patientId: string;
  patientName?: string;
  patientCode?: string;
  sampleCode: string;
  collectionDate?: string;
  volume?: number;
  concentration?: number;
  motility?: number;
  morphology?: number;
  strawCount: number;
  tankCode?: string;
  rackPosition?: string;
  boxCode?: string;
  status: number;
  statusName?: string;
  expiryDate?: string;
  storageFee: number;
  notes?: string;
}

export interface IvfBiopsy {
  id: string;
  cycleId: string;
  patientId?: string;
  patientName?: string;
  biopsyLab?: string;
  sentDate?: string;
  resultDate?: string;
  result?: string;
  notes?: string;
}

export interface IvfDashboard {
  activeCycles: number;
  frozenEmbryos: number;
  spermSamples: number;
  transfersThisMonth: number;
  successRate: number;
  totalCouples: number;
  completedCycles: number;
}

export interface IvfDailyReport {
  date?: string;
  items: { activityType: string; count: number; details?: string }[];
}

// ---- API Functions ----

export const getCouples = async (params?: { keyword?: string; pageIndex?: number; pageSize?: number }) => {
  try {
    const response = await apiClient.get<IvfCouple[]>('/ivf-lab/couples', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch IVF couples');
    return [];
  }
};

export const getCoupleById = async (id: string) => {
  try {
    const response = await apiClient.get<IvfCoupleDetail>(`/ivf-lab/couples/${id}`);
    return response.data;
  } catch {
    console.warn('Failed to fetch IVF couple detail');
    return null;
  }
};

export const saveCouple = async (data: Partial<IvfCouple>) => {
  const response = await apiClient.post<IvfCouple>('/ivf-lab/couples', data);
  return response.data;
};

export const getCycles = async (coupleId: string) => {
  try {
    const response = await apiClient.get<IvfCycle[]>('/ivf-lab/cycles', { params: { coupleId } });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch IVF cycles');
    return [];
  }
};

export const getCycleById = async (id: string) => {
  try {
    const response = await apiClient.get<IvfCycleDetail>(`/ivf-lab/cycles/${id}`);
    return response.data;
  } catch {
    console.warn('Failed to fetch IVF cycle detail');
    return null;
  }
};

export const saveCycle = async (data: Partial<IvfCycle>) => {
  const response = await apiClient.post<IvfCycle>('/ivf-lab/cycles', data);
  return response.data;
};

export const updateCycleStatus = async (id: string, status: number) => {
  await apiClient.put(`/ivf-lab/cycles/${id}/status`, { status });
};

export const saveOvumPickup = async (data: Partial<IvfOvumPickup>) => {
  const response = await apiClient.post<IvfOvumPickup>('/ivf-lab/ovum-pickup', data);
  return response.data;
};

export const getOvumPickup = async (cycleId: string) => {
  try {
    const response = await apiClient.get<IvfOvumPickup>('/ivf-lab/ovum-pickup', { params: { cycleId } });
    return response.data;
  } catch {
    console.warn('Failed to fetch ovum pickup');
    return null;
  }
};

export const getEmbryos = async (cycleId: string) => {
  try {
    const response = await apiClient.get<IvfEmbryo[]>('/ivf-lab/embryos', { params: { cycleId } });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch embryos');
    return [];
  }
};

export const saveEmbryo = async (data: Partial<IvfEmbryo>) => {
  const response = await apiClient.post<IvfEmbryo>('/ivf-lab/embryos', data);
  return response.data;
};

export const updateEmbryoStatus = async (id: string, status: number) => {
  await apiClient.put(`/ivf-lab/embryos/${id}/status`, { status });
};

export const freezeEmbryo = async (id: string, data: { freezeDate?: string; strawCode?: string; strawColor?: string; boxCode?: string; tankCode?: string; rackPosition?: string }) => {
  await apiClient.put(`/ivf-lab/embryos/${id}/freeze`, data);
};

export const thawEmbryo = async (id: string, data: { thawDate?: string }) => {
  await apiClient.put(`/ivf-lab/embryos/${id}/thaw`, data);
};

export const getTransfers = async (cycleId: string) => {
  try {
    const response = await apiClient.get<IvfTransfer[]>('/ivf-lab/transfers', { params: { cycleId } });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch transfers');
    return [];
  }
};

export const saveTransfer = async (data: Partial<IvfTransfer>) => {
  const response = await apiClient.post<IvfTransfer>('/ivf-lab/transfers', data);
  return response.data;
};

export const updateTransferResult = async (id: string, resultStatus: number) => {
  await apiClient.put(`/ivf-lab/transfers/${id}/result`, { resultStatus });
};

export const getSpermSamples = async (params?: { keyword?: string; status?: number; pageIndex?: number; pageSize?: number }) => {
  try {
    const response = await apiClient.get<IvfSpermSample[]>('/ivf-lab/sperm-bank', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch sperm samples');
    return [];
  }
};

export const saveSpermSample = async (data: Partial<IvfSpermSample>) => {
  const response = await apiClient.post<IvfSpermSample>('/ivf-lab/sperm-bank', data);
  return response.data;
};

export const updateSpermStatus = async (id: string, status: number) => {
  await apiClient.put(`/ivf-lab/sperm-bank/${id}/status`, { status });
};

export const getExpiringStorage = async (daysAhead = 30) => {
  try {
    const response = await apiClient.get<IvfSpermSample[]>('/ivf-lab/sperm-bank/expiring', { params: { daysAhead } });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch expiring storage');
    return [];
  }
};

export const getBiopsies = async (params?: { cycleId?: string; patientId?: string }) => {
  try {
    const response = await apiClient.get<IvfBiopsy[]>('/ivf-lab/biopsies', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch biopsies');
    return [];
  }
};

export const saveBiopsy = async (data: Partial<IvfBiopsy>) => {
  const response = await apiClient.post<IvfBiopsy>('/ivf-lab/biopsies', data);
  return response.data;
};

export const getIvfDashboard = async (): Promise<IvfDashboard> => {
  try {
    const response = await apiClient.get<IvfDashboard>('/ivf-lab/dashboard');
    return response.data;
  } catch {
    console.warn('Failed to fetch IVF dashboard');
    return { activeCycles: 0, frozenEmbryos: 0, spermSamples: 0, transfersThisMonth: 0, successRate: 0, totalCouples: 0, completedCycles: 0 };
  }
};

export const getDailyReport = async (date?: string): Promise<IvfDailyReport> => {
  try {
    const response = await apiClient.get<IvfDailyReport>('/ivf-lab/daily-report', { params: { date } });
    return response.data;
  } catch {
    console.warn('Failed to fetch IVF daily report');
    return { date, items: [] };
  }
};
