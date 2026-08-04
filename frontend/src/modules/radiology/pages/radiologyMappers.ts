import type { RadiologyOrderItemDto } from '../api/ris';

export type StatusKey = 'scheduled' | 'imaging' | 'reading' | 'reported' | 'cancelled';
export type ModalityCode = 'XR' | 'CT' | 'MRI' | 'US' | 'MAM';

export const MODALITIES: { v: ModalityCode; l: string; color: string }[] = [
  { v: 'XR', l: 'X-Quang', color: '#0891b2' },
  { v: 'CT', l: 'CT-Scanner', color: 'var(--s-mag)' },
  { v: 'MRI', l: 'Cộng hưởng từ', color: '#db2777' },
  { v: 'US', l: 'Siêu âm', color: 'var(--s-ok)' },
  { v: 'MAM', l: 'Nhũ ảnh', color: '#ea580c' },
];

const MODALITY_BY_CODE = Object.fromEntries(
  MODALITIES.map(({ v, color }) => [v, { v, color }]),
) as Record<ModalityCode, { v: ModalityCode; color: string }>;

const normalizeLookupText = (value?: string): string => (value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim();

const modalityFromText = (value?: string): ModalityCode | null => {
  const normalized = normalizeLookupText(value);
  if (!normalized) return null;

  const words = new Set(normalized.split(' '));
  if (words.has('MAM') || words.has('MAMMO') || normalized.includes('NHU ANH')) return 'MAM';
  if (words.has('MRI') || words.has('CHT') || normalized.includes('CONG HUONG')) return 'MRI';
  if (words.has('CT') || normalized.includes('CT SCAN')) return 'CT';
  if (words.has('US') || words.has('SA') || normalized.includes('SIEU AM') || normalized.includes('ULTRASOUND')) return 'US';
  if (words.has('XR') || words.has('XRAY') || words.has('XQ') || normalized.includes('X QUANG')) return 'XR';
  return null;
};

export const detectModality = (item?: RadiologyOrderItemDto): { v: ModalityCode; color: string } => {
  // Mã/tên dịch vụ mô tả kỹ thuật cụ thể hơn serviceType. Một số API cũ trả
  // serviceType=3 (nhóm CĐHA) dưới nhãn MRI, nên ưu tiên catalog trước.
  const code = modalityFromText(item?.serviceCode);
  const name = modalityFromText(item?.serviceName);
  const type = modalityFromText(item?.serviceType);
  return MODALITY_BY_CODE[code ?? name ?? type ?? 'XR'];
};

export const statusKey = (status: string): StatusKey => {
  const normalized = normalizeLookupText(status).toLowerCase();
  const compact = normalized.replace(/\s+/g, '');

  if (normalized.includes('huy') || compact.includes('cancel')) return 'cancelled';
  if (normalized.includes('dang thuc hien') || normalized.includes('dang chup') || normalized.includes('chay')
    || compact.includes('inprogress') || compact.includes('imaging')) return 'imaging';
  if (normalized.includes('cho doc') || normalized.includes('da thuc hien')
    || compact === 'reading' || compact.includes('completed')) return 'reading';
  if (normalized.includes('da tra ket qua') || normalized.includes('da duyet') || normalized.includes('xong')
    || compact === 'read' || compact.includes('reported') || compact.includes('approved')) return 'reported';
  return 'scheduled';
};
