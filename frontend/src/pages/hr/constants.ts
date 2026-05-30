/**
 * HR constants — extracted khỏi pages/HR.tsx (K31 Batch 1).
 */

export const POSITIONS = [
  { value: 'Doctor', label: 'Bác sĩ' },
  { value: 'Nurse', label: 'Điều dưỡng' },
  { value: 'Technician', label: 'Kỹ thuật viên' },
  { value: 'Allied', label: 'Dược sĩ' },
  { value: 'Admin', label: 'Hành chính' },
  { value: 'Support', label: 'Hỗ trợ' },
];

export const CATALOG_TYPES = [
  { value: 'Position', label: 'Chức vụ' },
  { value: 'JobTitle', label: 'Chức danh' },
  { value: 'CivilServantRank', label: 'Ngạch công chức' },
  { value: 'SalaryGrade', label: 'Bậc lương' },
  { value: 'ContractType', label: 'Loại hợp đồng' },
  { value: 'InsuranceType', label: 'Loại bảo hiểm' },
  { value: 'EducationLevel', label: 'Trình độ học vấn' },
  { value: 'AwardType', label: 'Loại khen thưởng' },
  { value: 'DisciplineType', label: 'Loại kỷ luật' },
  { value: 'LeaveType', label: 'Loại nghỉ phép' },
  { value: 'ShiftType', label: 'Ca trực' },
  { value: 'CertificateType', label: 'Loại chứng chỉ' },
  { value: 'Ethnicity', label: 'Dân tộc' },
  { value: 'Religion', label: 'Tôn giáo' },
  { value: 'Nationality', label: 'Quốc tịch' },
];

export const LEAVE_STATUS_NAMES: Record<number, { color: string; text: string }> = {
  0: { color: 'gold', text: 'Chờ duyệt' },
  1: { color: 'green', text: 'Đã duyệt' },
  2: { color: 'red', text: 'Từ chối' },
  3: { color: 'default', text: 'Đã hủy' },
};
