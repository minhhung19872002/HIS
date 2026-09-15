import dayjs from 'dayjs';
import * as labApi from '../api/laboratory';
import type { LabTestItem } from '../api/laboratory';
import type { StatusTab } from '@/_v2kit';

// ─── Types cho Panel Tiện ích ────────────────────────────────
export interface WarehouseStock {
  id: string; itemCode: string; itemName: string; itemTypeName: string;
  unit: string; quantity: number; availableQuantity: number;
  warehouseName: string; warehouseId?: string; warehouseType?: number;
  batchNumber?: string; expiryDate?: string; daysToExpiry?: number;
}
export interface LabChemicalItem {
  id: string; serviceName?: string; supplyName?: string; supplyCode?: string;
  quantityPerTest: number; unit?: string; objectType: string; isActive: boolean; note?: string;
}

// WarehouseType=5 là Tủ trực (IsCabinet=true)
export const WAREHOUSE_TYPE_CABINET = 5;

/** Mở phiếu kết quả XN (PDF blob) ở tab mới. Throw nếu lỗi để caller xử lý. */
export const printLabResultBlob = async (orderId: string): Promise<void> => {
  const blob = await labApi.printTestResultReport(orderId);
  const url = URL.createObjectURL(blob as Blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export type StatusKey = 'ordered' | 'collected' | 'running' | 'verified' | 'rejected';

export const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'ordered',   l: 'Đã chỉ định', tone: 'info' },
  { v: 'collected', l: 'Đã lấy mẫu',  tone: 'warn' },
  { v: 'running',   l: 'Đang chạy',   tone: 'warn' },
  { v: 'verified',  l: 'Đã duyệt',    tone: 'ok' },
  { v: 'rejected',  l: 'Từ chối mẫu', tone: 'crit' },
];

// Backend Status mapping (LisModel1Map.ComputeOrderStatus):
// 0 Pending(ordered) | 1 Collected | 2 Partial results | 3 All results, NOT approved yet
// | 4 Preliminary approved (KTV) | 5 Final approved (BS)
// Status 3 used to fall into 'verified' → unapproved results showed a green "Đã duyệt" badge.
export const statusKey = (s: number): StatusKey => {
  if (s === 0) return 'ordered';
  if (s === 1) return 'collected';
  if (s === 2 || s === 3) return 'running';
  if (s >= 4) return 'verified';
  return 'ordered';
};
export const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

export const PRIO_LABEL: Record<number, string> = { 0: 'ROUTINE', 1: 'URGENT', 2: 'STAT' };
export const PRIO_TONE: Record<number, 'ok' | 'warn' | 'crit'> = { 0: 'ok', 1: 'warn', 2: 'crit' };

const FLAG_SEVERITY: Record<string, number> = { HH: 4, LL: 3, H: 2, L: 1 };

export const flagFor = (test: LabTestItem): '' | 'H' | 'L' | 'HH' | 'LL' => {
  // Panel tests (CBC…): result is a summary string ("HGB 155; PLT 45") that never parses —
  // the backend already flags each parameter, so surface the worst parameter flag.
  if (test.parameters && test.parameters.length > 0) {
    let worst: '' | 'H' | 'L' | 'HH' | 'LL' = '';
    for (const p of test.parameters) {
      const f = (p.flag ?? '').toUpperCase();
      if ((FLAG_SEVERITY[f] ?? 0) > (FLAG_SEVERITY[worst] ?? 0)) worst = f as 'H' | 'L' | 'HH' | 'LL';
    }
    return worst;
  }
  if (!test.result) return '';
  const v = parseFloat(test.result.replace(',', '.')); // VN decimal comma "5,6"
  if (Number.isNaN(v)) return '';
  if (typeof test.criticalHigh === 'number' && v >= test.criticalHigh) return 'HH';
  if (typeof test.criticalLow === 'number' && v <= test.criticalLow) return 'LL';
  if (typeof test.normalMax === 'number' && v > test.normalMax) return 'H';
  if (typeof test.normalMin === 'number' && v < test.normalMin) return 'L';
  return '';
};

// Màu cờ theo tài liệu nghiệp vụ: cao → ĐỎ (HH đậm hơn), thấp → XANH (LL đậm hơn).
export const FLAG_COLOR: Record<string, string> = {
  HH: 'var(--s-crit-tx)', H: 'var(--s-crit)', LL: '#1e40af', L: 'var(--a-cy)',
};
export const abnormalCount = (tests?: LabTestItem[]): number =>
  (tests || []).filter((t) => flagFor(t) !== '').length;

export const fmtHM = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM HH:mm') : '—';
