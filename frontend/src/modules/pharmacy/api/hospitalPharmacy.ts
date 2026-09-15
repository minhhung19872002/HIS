import { apiClient } from '../../../services/apiClient';

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
    medicineName?: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
  }[];
}

// QA0915: backend (HospitalPharmacyController / RetailSale*Dto) uses patientName/phoneNumber,
// a STRING paymentMethod ("Cash"...), a STRING status ("Completed"/"Cancelled") and paidAmount.
// Sending the numeric paymentMethod made every POS sale fail with 400, and the list rendered
// blank customer / 0đ / "—" status. Map both directions here so the page keeps its own shape.
const PAYMENT_METHODS = ['Cash', 'Card', 'Transfer'] as const;
const SALE_STATUS: Record<string, number> = { Pending: 0, Completed: 1, Cancelled: 2 };

const normalizeSale = (raw: Record<string, unknown>): RetailSaleDto => {
  if (typeof raw.status === 'number') return raw as unknown as RetailSaleDto;
  const pm = PAYMENT_METHODS.indexOf(String(raw.paymentMethod ?? 'Cash') as (typeof PAYMENT_METHODS)[number]);
  return {
    ...(raw as unknown as RetailSaleDto),
    customerName: (raw.customerName ?? raw.patientName) as string | undefined,
    customerPhone: (raw.customerPhone ?? raw.phoneNumber) as string | undefined,
    finalAmount: Number(raw.finalAmount ?? raw.paidAmount ?? raw.totalAmount ?? 0),
    paymentMethod: pm >= 0 ? pm : 0,
    status: SALE_STATUS[String(raw.status)] ?? 0,
    saleDate: String(raw.saleDate ?? raw.createdAt ?? ''),
    items: (raw.items as RetailSaleItemDto[] | undefined) ?? [],
  };
};

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
    const response = await apiClient.get<RetailSaleDto[] | { items: RetailSaleDto[]; totalCount: number }>('/hospital-pharmacy/sales', { params });
    const d = response.data;
    const norm = (rows: RetailSaleDto[]) => rows.map((r) => normalizeSale(r as unknown as Record<string, unknown>));
    if (Array.isArray(d)) return { items: norm(d), totalCount: d.length };
    return d ? { items: norm(d.items || []), totalCount: d.totalCount } : { items: [], totalCount: 0 };
  } catch {
    console.warn('Failed to fetch retail sales');
    return { items: [], totalCount: 0 };
  }
};

export const createRetailSale = async (data: RetailSaleCreateDto) => {
  const response = await apiClient.post<RetailSaleDto>('/hospital-pharmacy/sales', {
    patientName: data.customerName,
    phoneNumber: data.customerPhone,
    paymentMethod: PAYMENT_METHODS[data.paymentMethod] ?? 'Cash',
    discountAmount: data.discountAmount ?? 0,
    items: data.items.map((i) => ({
      medicineId: i.medicineId,
      medicineName: i.medicineName ?? '',
      unit: i.unit,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })),
  });
  return normalizeSale(response.data as unknown as Record<string, unknown>);
};

// QA0915: the endpoint binds a required [FromBody] CancelSaleDto — a PUT with no body returned 415.
export const cancelRetailSale = async (id: string, reason = 'Hủy hóa đơn tại quầy') => {
  const response = await apiClient.put(`/hospital-pharmacy/sales/${id}/cancel`, { reason });
  return response.data;
};

// QA-R2: the route is GET /hospital-pharmacy/medicines (".../search" 404'd, so POS search was always
// empty) and MedicineForSaleDto names price/stock retailPrice/availableStock — map to the FE shape.
export const searchMedicines = async (keyword: string): Promise<MedicineSearchResultDto[]> => {
  try {
    const response = await apiClient.get<Array<MedicineSearchResultDto & { retailPrice?: number; availableStock?: number }>>(
      '/hospital-pharmacy/medicines', { params: { keyword } },
    );
    return (response.data || []).map((m) => ({
      ...m,
      unitPrice: m.unitPrice ?? m.retailPrice ?? 0,
      stockQuantity: m.stockQuantity ?? m.availableStock ?? 0,
    }));
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
    const response = await apiClient.get<MedicineSearchResultDto[] | { items: MedicineSearchResultDto[]; totalCount: number }>('/hospital-pharmacy/stock', { params });
    const d = response.data;
    if (Array.isArray(d)) return { items: d, totalCount: d.length };
    return d || { items: [], totalCount: 0 };
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

// ====== NangCap17 Module C: Enhanced Pharmacy Types ======

export interface PharmacyCustomerDto {
  id: string;
  customerCode: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: number;
  customerType: number;
  cardNumber?: string;
  totalPoints: number;
  totalPurchaseAmount: number;
  totalPurchaseCount: number;
  lastPurchaseDate?: string;
  notes?: string;
}

export interface SavePharmacyCustomerDto {
  id?: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: number;
  customerType: number;
  cardNumber?: string;
  notes?: string;
}

export interface PharmacyPointTransactionDto {
  id: string;
  customerId: string;
  transactionType: number;
  points: number;
  saleId?: string;
  description?: string;
  createdAt?: string;
}

export interface PharmacyShiftDto {
  id: string;
  shiftCode: string;
  cashierId: string;
  cashierName?: string;
  startTime?: string;
  endTime?: string;
  openingCash: number;
  closingCash: number;
  totalSales: number;
  totalRefunds: number;
  status: number;
  notes?: string;
}

export interface PharmacyGppRecordDto {
  id: string;
  recordType: number;
  recordDate?: string;
  description?: string;
  medicineName?: string;
  batchNumber?: string;
  temperature?: number;
  humidity?: number;
  actionTaken?: string;
  recordedByName?: string;
}

export interface SavePharmacyGppRecordDto {
  id?: string;
  recordType: number;
  recordDate?: string;
  description?: string;
  medicineName?: string;
  batchNumber?: string;
  temperature?: number;
  humidity?: number;
  actionTaken?: string;
}

export interface PharmacyCommissionDto {
  id: string;
  doctorName?: string;
  saleDate?: string;
  medicineName?: string;
  quantity: number;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: number;
  paidDate?: string;
}

export interface SavePharmacyCommissionDto {
  id?: string;
  doctorId?: string;
  doctorName?: string;
  saleId?: string;
  saleDate?: string;
  medicineName?: string;
  quantity: number;
  saleAmount: number;
  commissionRate: number;
}

export interface PharmacyEnhancedDashboardDto {
  todayRevenue: number;
  todaySaleCount: number;
  lowStockCount: number;
  totalCustomers: number;
  vipCustomers: number;
  openShiftCount: number;
  todayGppRecords: number;
  pendingCommission: number;
}

// ====== NangCap17 Module C: Enhanced Pharmacy API Functions ======

// --- Customers ---
export const getCustomers = async (params?: {
  keyword?: string;
  customerType?: number;
  pageIndex?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<PharmacyCustomerDto[]>('/hospital-pharmacy/customers', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch pharmacy customers');
    return [];
  }
};

export const getCustomerById = async (id: string) => {
  const response = await apiClient.get<PharmacyCustomerDto>(`/hospital-pharmacy/customers/${id}`);
  return response.data;
};

export const saveCustomer = async (data: SavePharmacyCustomerDto) => {
  const response = await apiClient.post<PharmacyCustomerDto>('/hospital-pharmacy/customers', data);
  return response.data;
};

export const addPoints = async (data: { customerId: string; points: number; saleId?: string; description?: string }) => {
  const response = await apiClient.post<PharmacyPointTransactionDto>('/hospital-pharmacy/customers/add-points', data);
  return response.data;
};

export const redeemPoints = async (data: { customerId: string; points: number; description?: string }) => {
  const response = await apiClient.post<PharmacyPointTransactionDto>('/hospital-pharmacy/customers/redeem-points', data);
  return response.data;
};

// --- Shifts ---
export const getShifts = async (params?: {
  fromDate?: string;
  toDate?: string;
  cashierId?: string;
  status?: number;
  pageIndex?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<PharmacyShiftDto[]>('/hospital-pharmacy/shifts', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch pharmacy shifts');
    return [];
  }
};

export const openShift = async (data: { openingCash: number; notes?: string }) => {
  const response = await apiClient.post<PharmacyShiftDto>('/hospital-pharmacy/shifts/open', data);
  return response.data;
};

export const closeShift = async (data: { shiftId: string; closingCash: number; notes?: string }) => {
  const response = await apiClient.post<PharmacyShiftDto>('/hospital-pharmacy/shifts/close', data);
  return response.data;
};

export const getCurrentShift = async () => {
  try {
    const response = await apiClient.get<PharmacyShiftDto>('/hospital-pharmacy/shifts/current');
    return response.data;
  } catch {
    console.warn('Failed to fetch current shift');
    return null;
  }
};

// --- GPP Records ---
export const getGppRecords = async (params?: {
  keyword?: string;
  recordType?: number;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<PharmacyGppRecordDto[]>('/hospital-pharmacy/gpp-records', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch GPP records');
    return [];
  }
};

export const saveGppRecord = async (data: SavePharmacyGppRecordDto) => {
  const response = await apiClient.post<PharmacyGppRecordDto>('/hospital-pharmacy/gpp-records', data);
  return response.data;
};

// --- Commissions ---
export const getCommissions = async (params?: {
  keyword?: string;
  status?: number;
  fromDate?: string;
  toDate?: string;
  pageIndex?: number;
  pageSize?: number;
}) => {
  try {
    const response = await apiClient.get<PharmacyCommissionDto[]>('/hospital-pharmacy/commissions', { params });
    return response.data || [];
  } catch {
    console.warn('Failed to fetch pharmacy commissions');
    return [];
  }
};

export const saveCommission = async (data: SavePharmacyCommissionDto) => {
  const response = await apiClient.post<PharmacyCommissionDto>('/hospital-pharmacy/commissions', data);
  return response.data;
};

export const payCommissions = async (commissionIds: string[]) => {
  const response = await apiClient.post('/hospital-pharmacy/commissions/pay', { commissionIds });
  return response.data;
};

// --- Enhanced Dashboard ---
export const getEnhancedDashboard = async (): Promise<PharmacyEnhancedDashboardDto> => {
  try {
    const response = await apiClient.get<PharmacyEnhancedDashboardDto>('/hospital-pharmacy/enhanced-dashboard');
    return response.data;
  } catch {
    console.warn('Failed to fetch enhanced pharmacy dashboard');
    return { todayRevenue: 0, todaySaleCount: 0, lowStockCount: 0, totalCustomers: 0, vipCustomers: 0, openShiftCount: 0, todayGppRecords: 0, pendingCommission: 0 };
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
  getCustomers,
  getCustomerById,
  saveCustomer,
  addPoints,
  redeemPoints,
  getShifts,
  openShift,
  closeShift,
  getCurrentShift,
  getGppRecords,
  saveGppRecord,
  getCommissions,
  saveCommission,
  payCommissions,
  getEnhancedDashboard,
};
