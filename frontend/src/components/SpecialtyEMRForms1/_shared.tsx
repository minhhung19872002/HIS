import React from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../../constants/hospital';
import { PRINT_STYLES_BASE, PRINT_STYLES_CHECKBOX } from '../../constants/printStyles';

export const printStyles = PRINT_STYLES_BASE + PRINT_STYLES_CHECKBOX;

// Print Header
export const PrintHeader: React.FC<{ formNumber?: string }> = ({ formNumber }) => (
  <div className="header">
    <div className="ministry">BỘ Y TẾ</div>
    <div className="hospital-name">{HOSPITAL_NAME}</div>
    <div style={{ fontSize: 11 }}>{HOSPITAL_ADDRESS} - ĐT: {HOSPITAL_PHONE}</div>
    {formNumber && <div className="form-number">Mẫu số: {formNumber}</div>}
  </div>
);

// Signature Block — date: unknown để chấp nhận field từ DTO chưa khai báo strict.
export const SignatureBlock: React.FC<{
  leftTitle: string;
  rightTitle: string;
  date?: unknown;
  middleTitle?: string;
}> = ({ leftTitle, rightTitle, date, middleTitle }) => {
  const d = (typeof date === 'string' || date instanceof Date) ? dayjs(date as string | Date) : null;
  return (
    <div className="signature-row" style={middleTitle ? { justifyContent: 'space-around' } : undefined}>
      <div className="sig">
        <div className="sig-title">{leftTitle}</div>
        <div className="sig-date">(Ký, ghi rõ họ tên)</div>
      </div>
      {middleTitle && (
        <div className="sig">
          <div className="sig-title">{middleTitle}</div>
          <div className="sig-date">(Ký, ghi rõ họ tên)</div>
        </div>
      )}
      <div className="sig">
        <div className="sig-date">
          {d && d.isValid() ? `Ngày ${d.format('DD')} tháng ${d.format('MM')} năm ${d.format('YYYY')}` : 'Ngày ..... tháng ..... năm 20.....'}
        </div>
        <div className="sig-title">{rightTitle}</div>
        <div className="sig-date">(Ký, ghi rõ họ tên)</div>
      </div>
    </div>
  );
};

// Field row
// value type là `unknown` để các print template (mỗi BA chuyên khoa ~50-100 trường
// chuyên biệt từ DTO chưa khai báo strict) gọi `Field value={data?.xyz}` không bị
// TS chặn. Stringify trong render — null/undefined/'' rơi vào dotted-line placeholder.
export const Field: React.FC<{ label: string; value?: unknown; wide?: boolean }> = ({ label, value, wide }) => {
  const display = value === null || value === undefined || value === '' ? '...........................' : (value as React.ReactNode);
  return (
    <div className="field">
      <span className="field-label">{label}: </span>
      <span className="field-value" style={wide ? { minWidth: 300 } : undefined}>{display}</span>
    </div>
  );
};

// Checkbox helper — checked: unknown để chấp nhận field từ DTO chưa khai báo strict.
// Truthy → tick; falsy/null/undefined → blank.
export const Checkbox: React.FC<{ label: string; checked?: unknown }> = ({ label, checked }) => (
  <span className="checkbox-item">
    <span className="checkbox-box">{checked ? '✓' : ''}</span>
    <span>{label}</span>
  </span>
);

// Dotted lines for free text areas — content widen unknown để giống Field (xem chú thích trên).
export const DottedLines: React.FC<{ count?: number; content?: unknown }> = ({ count = 3, content }) => (
  <div className="dotted-lines-block">
    {content !== null && content !== undefined && content !== '' ? (
      <div style={{ borderBottom: '1px dotted #999', padding: '2px 0', whiteSpace: 'pre-wrap' }}>{content as React.ReactNode}</div>
    ) : (
      Array.from({ length: count }).map((_, i) => <div key={i} className="dotted-line" />)
    )}
  </div>
);

// Shape của patient/record data bind vào print form.
// Trộn nhiều DTO khác nhau (Patient + MedicalRecord + Admission) nên tất cả optional.
export interface SpecialtyEMRPatientData {
  fullName?: string;
  patientName?: string;
  gender?: number;
  genderText?: string;
  age?: number | string;
  patientCode?: string;
  medicalRecordCode?: string;
  recordCode?: string;
  recordNumber?: string;
  address?: string;
  occupation?: string;
  ethnicity?: string;
  nationality?: string;
  dateOfBirth?: string;
  insuranceNumber?: string;
  admissionDate?: string;
  departmentName?: string;
  bedInfo?: string;
  roomName?: string;
  bedName?: string;
}

// Mỗi BA chuyên khoa có ~50-100 trường chuyên biệt (TMH, YHCT, mắt...). Định nghĩa
// kiệt liệt từng trường không thực tế cho deliverable này; dùng kiểu rộng kế thừa
// PatientData + index-signature value unknown. Truy cập `data?.someField` rồi cast
// về string/number tại điểm dùng (`Field` accept string|number|null|undefined).
// Print template render `{data?.X || '...'}` thẳng vào JSX — index value chỉ là
// primitive (string|number|null|undefined) để assignable vào ReactNode. Các field
// dạng array (prescriptions[], herbs[], vitalSignsRecords[]) cast tại điểm dùng
// (`data.prescriptions as Array<...>`) — xem ví dụ ở group3.tsx. Vẫn an toàn hơn `any`.
export type SpecialtyEMRPrintData = SpecialtyEMRPatientData & {
  [k: string]: string | number | null | undefined;
};

// Patient info block (reused across all forms)
export const PatientInfoBlock: React.FC<{ data?: SpecialtyEMRPatientData | null }> = ({ data }) => (
  <div className="section">
    <div className="row">
      <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
      <div className="col"><Field label="Giới tính" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
      <div className="col"><Field label="Tuổi" value={data?.age} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
      <div className="col"><Field label="Mã BA" value={data?.medicalRecordCode || data?.recordCode} /></div>
      <div className="col"><Field label="Số BA" value={data?.recordNumber} /></div>
    </div>
    <Field label="Địa chỉ" value={data?.address} />
    <div className="row">
      <div className="col"><Field label="Nghề nghiệp" value={data?.occupation} /></div>
      <div className="col"><Field label="Dân tộc" value={data?.ethnicity} /></div>
      <div className="col"><Field label="Quốc tịch" value={data?.nationality || 'Việt Nam'} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Ngày sinh" value={data?.dateOfBirth ? dayjs(data.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
      <div className="col"><Field label="Số BHYT" value={data?.insuranceNumber} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Ngày vào viện" value={data?.admissionDate ? dayjs(data.admissionDate).format('DD/MM/YYYY HH:mm') : undefined} /></div>
      <div className="col"><Field label="Khoa" value={data?.departmentName} /></div>
      <div className="col"><Field label="Buồng/Giường" value={data?.bedInfo || `${data?.roomName || '...'} / ${data?.bedName || '...'}`} /></div>
    </div>
  </div>
);

// =====================================================================
// 1. BA NỘI KHOA (Internal Medicine Medical Record)
// =====================================================================
