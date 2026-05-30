/**
 * Constants cho Inpatient v1 module — extracted khỏi pages/Inpatient.tsx
 * (K15 Batch 1).
 */

/** 24 loại bệnh án nội trú theo Bộ Y tế (mã `XX/BV-01`). */
export const MEDICAL_RECORD_TYPES = [
  { value: 'noi_khoa', label: 'Bệnh án Nội khoa', code: '01/BV-01' },
  { value: 'nhi_khoa', label: 'Bệnh án Nhi khoa', code: '02/BV-01' },
  { value: 'truyen_nhiem', label: 'Bệnh án Truyền nhiễm', code: '03/BV-01' },
  { value: 'phu_khoa', label: 'Bệnh án Phụ khoa', code: '04/BV-01' },
  { value: 'san_khoa', label: 'Bệnh án Sản khoa', code: '05/BV-01' },
  { value: 'so_sinh', label: 'Bệnh án Sơ sinh', code: '06/BV-01' },
  { value: 'tam_than', label: 'Bệnh án Tâm thần', code: '07/BV-01' },
  { value: 'da_lieu', label: 'Bệnh án Da liễu', code: '08/BV-01' },
  { value: 'huyet_hoc', label: 'Bệnh án Huyết học - Truyền máu', code: '09/BV-01' },
  { value: 'ngoai_khoa', label: 'Bệnh án Ngoại khoa', code: '10/BV-01' },
  { value: 'bong', label: 'Bệnh án Bỏng', code: '11/BV-01' },
  { value: 'ung_buou', label: 'Bệnh án Ung bướu', code: '12/BV-01' },
  { value: 'rhm', label: 'Bệnh án Răng hàm mặt', code: '13/BV-01' },
  { value: 'tmh', label: 'Bệnh án Tai mũi họng', code: '14/BV-01' },
  { value: 'yhct', label: 'Bệnh án YHCT nội trú', code: '18/BV-01' },
  { value: 'yhct_nhi', label: 'Bệnh án YHCT Nhi nội trú', code: '20/BV-01' },
  { value: 'mat_chan_thuong', label: 'Bệnh án Mắt chấn thương', code: '21/BV-01' },
  { value: 'mat_ban_phan_truoc', label: 'Bệnh án Mắt bán phần trước', code: '22/BV-01' },
  { value: 'mat_day_mat', label: 'Bệnh án Mắt đáy mắt', code: '23/BV-01' },
  { value: 'mat_glocom', label: 'Bệnh án Mắt Glocom', code: '24/BV-01' },
  { value: 'mat_sup_mi', label: 'Bệnh án Mắt sụp mi, lác', code: '25/BV-01' },
  { value: 'mat_tre_em', label: 'Bệnh án Mắt trẻ em', code: '26/BV-01' },
  { value: 'phcn', label: 'Bệnh án Phục hồi chức năng', code: '27/BV-01' },
  { value: 'phcn_nhi', label: 'Bệnh án PHCN Nhi', code: '28/BV-01' },
] as const;

/** localStorage key cho NangCap4 supply order template. */
export const SUPPLY_TEMPLATE_KEY = 'inpatient_supply_order_templates';
