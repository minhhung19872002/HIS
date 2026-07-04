import { ABBREVIATION_SCOPES } from '../../api/abbreviation';

/* ==========================================================================
   Shared types + consts + helper for the OpdEditor sub-components.
   Extracted from OpdEditor.tsx (#205 FE-2 god-component split, Phase 1) —
   pure move, behavior-preserving.
   ========================================================================== */

export interface Vitals { pulse?: number; temperature?: number; systolicBP?: number; diastolicBP?: number; respiratoryRate?: number; spO2?: number; weight?: number; height?: number; }
export interface DxRow { icdCode: string; icdName: string; isPrimary: boolean; }
export interface OrderRow { serviceId: string; code: string; name: string; qty: number; unitPrice: number; }

// Viết tắt (F2-style macro): bung ở bệnh sử / khám LS / kết luận — gõ code + space
export const OPD_ABBR_SCOPES = [ABBREVIATION_SCOPES.GENERAL, ABBREVIATION_SCOPES.DIAGNOSIS] as const;

export const SEVERITY_LABEL: Record<number, string> = { 1: 'Nhẹ', 2: 'Vừa', 3: 'Nặng', 4: 'Phản vệ' };

export const VITAL_FIELDS: { k: keyof Vitals; l: string; unit: string }[] = [
  { k: 'pulse', l: 'Mạch', unit: 'l/p' },
  { k: 'temperature', l: 'Nhiệt', unit: '°C' },
  { k: 'systolicBP', l: 'HA tâm thu', unit: 'mmHg' },
  { k: 'diastolicBP', l: 'HA tâm trương', unit: 'mmHg' },
  { k: 'respiratoryRate', l: 'Nhịp thở', unit: 'l/p' },
  { k: 'spO2', l: 'SpO₂', unit: '%' },
  { k: 'weight', l: 'Cân', unit: 'kg' },
  { k: 'height', l: 'Cao', unit: 'cm' },
];

// Mở PDF blob ở tab mới (dùng chung cho các nút in)
export const openPdfBlob = (data: Blob) => {
  const url = URL.createObjectURL(data);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
