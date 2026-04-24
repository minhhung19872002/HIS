import apiClient from './client';

export interface CancelChainResponse {
  success: boolean;
  newStatus: number;
  newStatusLabel: string;
  message: string;
}

async function post(path: string, labRequestItemId: string, reason: string) {
  const { data } = await apiClient.post<CancelChainResponse>(
    `/laboratory/cancel-chain/${path}`,
    { labRequestItemId, reason }
  );
  return data;
}

export const cancelApproval = (itemId: string, reason: string) => post('cancel-approval', itemId, reason);
export const cancelResult = (itemId: string, reason: string) => post('cancel-result', itemId, reason);
export const cancelCollection = (itemId: string, reason: string) => post('cancel-collection', itemId, reason);
