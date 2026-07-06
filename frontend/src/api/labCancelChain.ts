import apiClient from '../services/apiClient';

export interface CancelChainResponse {
  success: boolean;
  newStatus: number;
  newStatusLabel: string;
  message: string;
}

// FLOW-3 #14a: cancel-chain nay thao tác trên ServiceRequestDetail (model 1). Field gửi đổi
// sang serviceRequestDetailId (id của ServiceRequestDetail hoặc ServiceRequest cha — BE dual-lookup).
async function post(path: string, serviceRequestDetailId: string, reason: string) {
  const { data } = await apiClient.post<CancelChainResponse>(
    `/laboratory/cancel-chain/${path}`,
    { serviceRequestDetailId, reason }
  );
  return data;
}

export const cancelApproval = (id: string, reason: string) => post('cancel-approval', id, reason);
export const cancelResult = (id: string, reason: string) => post('cancel-result', id, reason);
export const cancelCollection = (id: string, reason: string) => post('cancel-collection', id, reason);
