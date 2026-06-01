export const INCIDENT_TYPES = [
  { value: 'MedicationError', label: 'Sai sót thuốc' },
  { value: 'Fall', label: 'Té ngã' },
  { value: 'HAI', label: 'Nhiễm khuẩn' },
  { value: 'PatientSafety', label: 'Sai định danh' },
  { value: 'Equipment', label: 'Thiết bị hỏng' },
  { value: 'Other', label: 'Khác' },
];

export const SEVERITY_LEVELS = [
  { value: 1, label: 'Suýt xảy ra', color: 'blue' },
  { value: 2, label: 'Không tổn thương', color: 'cyan' },
  { value: 3, label: 'Nhẹ', color: 'green' },
  { value: 4, label: 'Vừa', color: 'orange' },
  { value: 5, label: 'Nặng', color: 'red' },
  { value: 6, label: 'Trọng yếu', color: 'volcano' },
];
