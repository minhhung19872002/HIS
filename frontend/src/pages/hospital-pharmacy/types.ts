/**
 * HospitalPharmacy v1 types + constants — extracted khỏi
 * pages/HospitalPharmacy.tsx (K33 Batch 1).
 */

export const PAYMENT_LABELS: Record<number, string> = {
  0: 'Tiền mặt',
  1: 'Thẻ',
  2: 'Chuyển khoản',
};

export const PAYMENT_COLORS: Record<number, string> = {
  0: 'green',
  1: 'blue',
  2: 'purple',
};

export interface CartItem {
  medicineId: string;
  medicineName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}
