import type { AdmissionDto } from '../api/reception';

export type OpdStatusKey = 'waiting' | 'inProgress' | 'waitingResult' | 'completed' | 'cancelled';

export const opdStatusKey = (status: number | string): OpdStatusKey => {
  if (typeof status === 'number') {
    if (status === 1) return 'inProgress';
    if (status === 2 || status === 3) return 'waitingResult';
    if (status === 4) return 'completed';
    if (status === 5) return 'cancelled';
    return 'waiting';
  }

  switch (status.trim().toLowerCase()) {
    case 'inprogress': return 'inProgress';
    case 'waitingresult':
    case 'pendingcls':
    case 'waitingconclusion': return 'waitingResult';
    case 'completed':
    case 'paid': return 'completed';
    case 'cancelled':
    case 'canceled': return 'cancelled';
    default: return 'waiting';
  }
};

type OpdLinkSource = Pick<AdmissionDto, 'patientId' | 'roomId' | 'examinationId'>;

const query = (values: Record<string, string | undefined>): string => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
};

export const opdLinks = (row: OpdLinkSource) => ({
  examination: row.examinationId
    ? `/v2/opd/edit?${query({ examId: row.examinationId, roomId: row.roomId, start: '1' })}`
    : null,
  emr: `/v2/emr/edit?${query({ patientId: row.patientId })}`,
  prescription: row.examinationId
    ? `/v2/prescription/edit?${query({ examId: row.examinationId })}`
    : null,
});

export const canPrescribeFromOpd = (row: Pick<AdmissionDto, 'status' | 'examinationId'>): boolean => {
  if (!row.examinationId) return false;
  const status = opdStatusKey(row.status);
  return status !== 'cancelled';
};
