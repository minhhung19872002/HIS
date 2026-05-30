/**
 * Constants cho OPD module — extracted khỏi pages/OPD.tsx (K13 Batch 1).
 */

/** Danh sách các loại bệnh án ngoại trú theo Bộ Y tế. */
export const OPD_RECORD_TYPES = [
  { value: 'ngoai_tru_chung', label: 'Bệnh án ngoại trú chung', code: '15/BV-01' },
  { value: 'ngoai_tru_rhm', label: 'Bệnh án ngoại trú Răng hàm mặt', code: '16/BV-01' },
  { value: 'tuyen_xa_phuong', label: 'Bệnh án dành cho tuyến xã phường', code: '17/BV-01' },
  { value: 'ngoai_tru_yhct', label: 'Bệnh án ngoại trú YHCT', code: '19/BV-01' },
  { value: 'ngoai_tru_phcn', label: 'Bệnh án ngoại trú Phục hồi chức năng', code: '29/BV-01' },
] as const;
