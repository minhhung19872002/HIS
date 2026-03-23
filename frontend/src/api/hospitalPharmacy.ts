import { apiClient } from './client';

// ---- Types ----

export interface RetailSaleDto {
  id: string;
  saleCode: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: number; // 0=cash, 1=card, 2=transfer
  status: number; // 0=pending, 1=completed, 2=cancelled
  saleDate: string;
  createdByName?: string;
  items: RetailSaleItemDto[];
}

export interface RetailSaleItemDto {
  id: string;
  medicineId: string;
  medicineName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface MedicineSearchResultDto {
  id: string;
  medicineCode: string;
  medicineName: string;
  activeIngredient?: string;
  unit: string;
  unitPrice: number;
  stockQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface RetailSaleCreateDto {
  customerName?: string;
  customerPhone?: string;
  paymentMethod: number;
  discountAmount?: number;
  items: {
    medicineId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface PharmacyRevenueDto {
  date: string;
  totalSales: number;
  totalAmount: number;
  totalDiscount: number;
  netRevenue: number;
}

export interface PharmacyDashboardDto {
  todayRevenue: number;
  todaySaleCount: number;
  lowStockCount: number;
}

// ---- API Functions ----

export const getRetailSales = async (params?: {
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  status?: number;
  page?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<{ items: RetailSaleDto[]; totalCount: number }>('/hospital-pharmacy/sales', { params });
    return response.data || { items: [], totalCount: 0 };
  } catch {
    console.warn('Failed to fetch retail sales');
    return { items: [], totalCount: 0 };
  }
};

export const createRetailSale = async (data: RetailSaleCreateDto) => {
  const response = await apiClient.post<RetailSaleDto>('/hospital-pharmacy/sales', data);
  return response.data;
};

export const cancelRetailSale = async (id: string) => {
  const response = await apiClient.put(`/hospital-pharmacy/sales/${id}/cancel`);
  return response.data;
};

export const searchMedicines = async (keyword: string) => {
  try {
    const response = await apiClient.get<MedicineSearchResultDto[]>('/hospital-pharmacy/medicines/search', {
      params: { keyword },
    });
    return response.data || [];
  } catch {
    console.warn('Failed to search medicines');
    return [];
  }
};

export const getPharmacyStock = async (params?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<{ items: MedicineSearchResultDto[]; totalCount: number }>('/hospital-pharmacy/stock', { params });
    return response.data || { items: [], totalCount: 0 };
  } catch {
    console.warn('Failed to fetch pharmacy stock');
    return { items: [], totalCount: 0 };
  }
};

export const getPharmacyRevenue = async (fromDate: string, toDate: string) => {
  try {
    const response = await apiClient.get<PharmacyRevenueDto[]>('/hospital-pharmacy/revenue', {
      params: { fromDate, toDate },
    });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch pharmacy revenue');
    return [];
  }
};

export const getPharmacyDashboard = async (): Promise<PharmacyDashboardDto> => {
  try {
    const response = await apiClient.get<PharmacyDashboardDto>('/hospital-pharmacy/dashboard');
    return response.data;
  } catch {
    console.warn('Failed to fetch pharmacy dashboard');
    return { todayRevenue: 0, todaySaleCount: 0, lowStockCount: 0 };
  }
};

export default {
  getRetailSales,
  createRetailSale,
  cancelRetailSale,
  searchMedicines,
  getPharmacyStock,
  getPharmacyRevenue,
  getPharmacyDashboard,
};
