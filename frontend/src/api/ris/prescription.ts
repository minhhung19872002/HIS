/**
 * RIS API — Prescriptions, service norm, search items, check stock.
 */

import apiClient from '../client';

// #region Interfaces

export interface RadiologyPrescriptionDto {
  id: string;
  orderItemId: string;
  orderCode: string;
  patientId: string;
  patientName: string;
  serviceName: string;
  prescriptionDate: string;
  items: RadiologyPrescriptionItemDto[];
  doctorName?: string;
  status: string;
  totalAmount: number;
}

export interface RadiologyPrescriptionItemDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  unit: string;
  quantity: number;
  price: number;
  insurancePrice: number;
  amount: number;
  lotNumber?: string;
  expiryDate?: string;
  warehouseName?: string;
  note?: string;
}

export interface CreateRadiologyPrescriptionDto {
  orderItemId: string;
  warehouseId: string;
  items: CreateRadiologyPrescriptionItemDto[];
}

export interface CreateRadiologyPrescriptionItemDto {
  itemId: string;
  quantity: number;
  note?: string;
}

export interface UpdateRadiologyPrescriptionDto {
  items: CreateRadiologyPrescriptionItemDto[];
}

export interface RadiologyServiceNormDto {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  items: RadiologyNormItemDto[];
}

export interface RadiologyNormItemDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  quantity: number;
  unit: string;
  isRequired: boolean;
}

export interface UpdateNormItemDto {
  id?: string;
  itemId: string;
  quantity: number;
  unit: string;
  isRequired: boolean;
}

export interface ItemSearchResultDto {
  id: string;
  code: string;
  name: string;
  itemType: string;
  unit: string;
  price: number;
  insurancePrice: number;
  stockQuantity: number;
  lotNumber?: string;
  expiryDate?: string;
}

export interface ItemStockDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  totalStock: number;
  availableStock: number;
  byLot: ItemStockByLotDto[];
}

export interface ItemStockByLotDto {
  lotNumber: string;
  expiryDate?: string;
  quantity: number;
}

// #endregion

// #region 8.4 Prescription APIs

export const getRadiologyPrescriptions = (orderItemId: string) =>
  apiClient.get<RadiologyPrescriptionDto[]>(`/RISComplete/order-items/${orderItemId}/prescriptions`);

export const createRadiologyPrescription = (data: CreateRadiologyPrescriptionDto) =>
  apiClient.post<RadiologyPrescriptionDto>('/RISComplete/prescriptions', data);

export const updateRadiologyPrescription = (prescriptionId: string, data: UpdateRadiologyPrescriptionDto) =>
  apiClient.put<RadiologyPrescriptionDto>(`/RISComplete/prescriptions/${prescriptionId}`, data);

export const deleteRadiologyPrescription = (prescriptionId: string) =>
  apiClient.delete(`/RISComplete/prescriptions/${prescriptionId}`);

export const createPrescriptionFromNorm = (orderItemId: string, warehouseId: string) =>
  apiClient.post<RadiologyPrescriptionDto>(
    `/RISComplete/order-items/${orderItemId}/prescription-from-norm`,
    null,
    { params: { warehouseId } }
  );

export const getServiceNorm = (serviceId: string) =>
  apiClient.get<RadiologyServiceNormDto>(`/RISComplete/services/${serviceId}/norm`);

export const updateServiceNorm = (serviceId: string, items: UpdateNormItemDto[]) =>
  apiClient.put(`/RISComplete/services/${serviceId}/norm`, items);

export const searchItems = (keyword: string, warehouseId: string, itemType?: string) =>
  apiClient.get<ItemSearchResultDto[]>('/RISComplete/items/search', {
    params: { keyword, warehouseId, itemType }
  });

export const checkItemStock = (itemId: string, warehouseId: string) =>
  apiClient.get<ItemStockDto>(`/RISComplete/items/${itemId}/stock`, {
    params: { warehouseId }
  });

// #endregion
