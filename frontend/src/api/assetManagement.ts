import { apiClient } from './client';

// ---- Types ----

export interface TenderDto {
  id: string;
  tenderCode: string;
  tenderName: string;
  tenderType: number;
  publishDate?: string;
  closingDate?: string;
  budgetAmount: number;
  status: number;
  winnerSupplierId?: string;
  winnerSupplierName?: string;
  contractNumber?: string;
  notes?: string;
  itemCount: number;
  totalItemValue: number;
  createdAt: string;
}

export interface TenderItemDto {
  id: string;
  tenderId: string;
  itemName: string;
  itemType: number;
  quantity: number;
  unitPrice: number;
  specification?: string;
  supplierId?: string;
  supplierName?: string;
}

export interface FixedAssetDto {
  id: string;
  assetCode: string;
  assetName: string;
  assetGroupId?: string;
  originalValue: number;
  currentValue: number;
  purchaseDate: string;
  depreciationMethod: number;
  usefulLifeMonths: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  departmentId?: string;
  departmentName?: string;
  locationDescription?: string;
  status: number;
  qrCode?: string;
  serialNumber?: string;
  tenderId?: string;
  tenderName?: string;
  notes?: string;
  createdAt: string;
}

export interface AssetHandoverDto {
  id: string;
  fixedAssetId: string;
  assetCode?: string;
  assetName?: string;
  handoverType: number;
  fromDepartmentId?: string;
  fromDepartmentName?: string;
  toDepartmentId?: string;
  toDepartmentName?: string;
  handoverDate: string;
  handoverById?: string;
  handoverByName?: string;
  receivedById?: string;
  receivedByName?: string;
  notes?: string;
  status: number;
  createdAt: string;
}

export interface AssetDisposalDto {
  id: string;
  fixedAssetId: string;
  assetCode?: string;
  assetName?: string;
  originalValue: number;
  disposalType: number;
  proposalDate: string;
  approvalDate?: string;
  disposalDate?: string;
  approvedById?: string;
  approvedByName?: string;
  disposalValue: number;
  residualValue: number;
  reason?: string;
  status: number;
  createdAt: string;
}

export interface DepreciationReportDto {
  fixedAssetId: string;
  assetCode: string;
  assetName: string;
  departmentName?: string;
  month: number;
  year: number;
  openingValue: number;
  depreciationAmount: number;
  closingValue: number;
  calculatedAt: string;
}

export interface AssetDashboardDto {
  totalAssets: number;
  totalOriginalValue: number;
  totalCurrentValue: number;
  inUseCount: number;
  brokenCount: number;
  underRepairCount: number;
  pendingDisposalCount: number;
  disposedCount: number;
  transferredCount: number;
  pendingHandovers: number;
  activeTenders: number;
  monthlyDepreciationTotal: number;
  statusBreakdown: { status: number; statusName: string; count: number; totalValue: number }[];
  depreciationTrends: { month: number; year: number; amount: number }[];
}

export interface AssetHistoryDto {
  eventType: string;
  eventDate: string;
  description: string;
  performedBy?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
}

// ---- API Functions ----

// Tenders
export const getTenders = async (params?: Record<string, unknown>): Promise<PagedResult<TenderDto>> => {
  try {
    const response = await apiClient.get<PagedResult<TenderDto>>('/asset-management/tenders', { params });
    return response.data || { items: [], totalCount: 0, pageIndex: 0, pageSize: 20 };
  } catch {
    console.warn('Failed to fetch tenders');
    return { items: [], totalCount: 0, pageIndex: 0, pageSize: 20 };
  }
};

export const getTenderById = async (id: string) => {
  const response = await apiClient.get<TenderDto>(`/asset-management/tenders/${id}`);
  return response.data;
};

export const saveTender = async (data: Partial<TenderDto>) => {
  const response = await apiClient.post<TenderDto>('/asset-management/tenders', data);
  return response.data;
};

export const getTenderItems = async (tenderId: string) => {
  try {
    const response = await apiClient.get<TenderItemDto[]>(`/asset-management/tenders/${tenderId}/items`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch tender items');
    return [];
  }
};

export const saveTenderItem = async (data: Partial<TenderItemDto>) => {
  const response = await apiClient.post<TenderItemDto>('/asset-management/tender-items', data);
  return response.data;
};

export const awardTender = async (data: { tenderId: string; winnerSupplierId: string; contractNumber?: string }) => {
  const response = await apiClient.post<TenderDto>('/asset-management/tenders/award', data);
  return response.data;
};

// Fixed Assets
export const getAssets = async (params?: Record<string, unknown>): Promise<PagedResult<FixedAssetDto>> => {
  try {
    const response = await apiClient.get<PagedResult<FixedAssetDto>>('/asset-management/assets', { params });
    return response.data || { items: [], totalCount: 0, pageIndex: 0, pageSize: 20 };
  } catch {
    console.warn('Failed to fetch assets');
    return { items: [], totalCount: 0, pageIndex: 0, pageSize: 20 };
  }
};

export const getAssetById = async (id: string) => {
  const response = await apiClient.get<FixedAssetDto>(`/asset-management/assets/${id}`);
  return response.data;
};

export const saveAsset = async (data: Partial<FixedAssetDto>) => {
  const response = await apiClient.post<FixedAssetDto>('/asset-management/assets', data);
  return response.data;
};

export const generateQrCode = async (assetId: string) => {
  const response = await apiClient.post<string>(`/asset-management/assets/${assetId}/qr-code`);
  return response.data;
};

export const getAssetHistory = async (assetId: string) => {
  try {
    const response = await apiClient.get<AssetHistoryDto[]>(`/asset-management/assets/${assetId}/history`);
    return response.data || [];
  } catch {
    console.warn('Failed to fetch asset history');
    return [];
  }
};

// Handovers
export const getHandovers = async (params?: Record<string, unknown>): Promise<PagedResult<AssetHandoverDto>> => {
  try {
    const response = await apiClient.get<PagedResult<AssetHandoverDto>>('/asset-management/handovers', { params });
    return response.data || { items: [], totalCount: 0, pageIndex: 0, pageSize: 20 };
  } catch {
    console.warn('Failed to fetch handovers');
    return { items: [], totalCount: 0, pageIndex: 0, pageSize: 20 };
  }
};

export const saveHandover = async (data: Record<string, unknown>) => {
  const response = await apiClient.post<AssetHandoverDto>('/asset-management/handovers', data);
  return response.data;
};

export const confirmHandover = async (id: string) => {
  const response = await apiClient.put<AssetHandoverDto>(`/asset-management/handovers/${id}/confirm`);
  return response.data;
};

// Disposals
export const getDisposals = async (params?: Record<string, unknown>): Promise<PagedResult<AssetDisposalDto>> => {
  try {
    const response = await apiClient.get<PagedResult<AssetDisposalDto>>('/asset-management/disposals', { params });
    return response.data || { items: [], totalCount: 0, pageIndex: 0, pageSize: 20 };
  } catch {
    console.warn('Failed to fetch disposals');
    return { items: [], totalCount: 0, pageIndex: 0, pageSize: 20 };
  }
};

export const proposeDisposal = async (data: Record<string, unknown>) => {
  const response = await apiClient.post<AssetDisposalDto>('/asset-management/disposals', data);
  return response.data;
};

export const approveDisposal = async (id: string) => {
  const response = await apiClient.put<AssetDisposalDto>(`/asset-management/disposals/${id}/approve`);
  return response.data;
};

export const completeDisposal = async (id: string) => {
  const response = await apiClient.put<AssetDisposalDto>(`/asset-management/disposals/${id}/complete`);
  return response.data;
};

// Depreciation
export const calculateDepreciation = async (month: number, year: number) => {
  const response = await apiClient.post<{ processedCount: number; month: number; year: number }>('/asset-management/depreciation/calculate', null, { params: { month, year } });
  return response.data;
};

export const getDepreciationReport = async (params?: Record<string, unknown>): Promise<PagedResult<DepreciationReportDto>> => {
  try {
    const response = await apiClient.get<PagedResult<DepreciationReportDto>>('/asset-management/depreciation/report', { params });
    return response.data || { items: [], totalCount: 0, pageIndex: 0, pageSize: 50 };
  } catch {
    console.warn('Failed to fetch depreciation report');
    return { items: [], totalCount: 0, pageIndex: 0, pageSize: 50 };
  }
};

// Reports
export interface AssetReportTypeDto {
  code: number;
  name: string;
  description: string;
  category: string;
}

export interface AssetQrCodeDto {
  assetId: string;
  assetCode: string;
  assetName: string;
  departmentName?: string;
  originalValue: number;
  serialNumber?: string;
  locationDescription?: string;
  qrContent: string;
}

export const getAssetReportTypes = async (): Promise<AssetReportTypeDto[]> => {
  try {
    const response = await apiClient.get<AssetReportTypeDto[]>('/asset-management/reports/types');
    return response.data || [];
  } catch {
    console.warn('Failed to fetch report types');
    return [];
  }
};

export const generateAssetReport = async (reportType: number, filter?: Record<string, unknown>): Promise<void> => {
  try {
    const params = { reportType, ...filter };
    const response = await apiClient.get('/asset-management/reports/generate', {
      params,
      responseType: 'text',
    });
    const html = response.data as string;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  } catch {
    console.warn('Failed to generate report');
  }
};

export const getAssetQrCode = async (assetId: string): Promise<AssetQrCodeDto | null> => {
  try {
    const response = await apiClient.get<AssetQrCodeDto>(`/asset-management/assets/${assetId}/qrcode`);
    return response.data;
  } catch {
    console.warn('Failed to fetch QR code data');
    return null;
  }
};

// Dashboard
export const getAssetDashboard = async (): Promise<AssetDashboardDto> => {
  try {
    const response = await apiClient.get<AssetDashboardDto>('/asset-management/dashboard');
    return response.data;
  } catch {
    console.warn('Failed to fetch asset dashboard');
    return {
      totalAssets: 0, totalOriginalValue: 0, totalCurrentValue: 0,
      inUseCount: 0, brokenCount: 0, underRepairCount: 0,
      pendingDisposalCount: 0, disposedCount: 0, transferredCount: 0,
      pendingHandovers: 0, activeTenders: 0, monthlyDepreciationTotal: 0,
      statusBreakdown: [], depreciationTrends: [],
    };
  }
};
