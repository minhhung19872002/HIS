import React from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../../../../constants/hospital';
import { PRINT_STYLES_BASE, PRINT_STYLES_DIGITAL_SIG } from '../../../../constants/printStyles';
import type { DocumentSignatureDto } from '../../../../api/digitalSignature';

/** Digital signature stamp matching Vietnamese USB Token format */
export interface SignatureStampInfo {
  organizationName?: string;
  taxCode?: string;
  signedAt?: string;
  signerName?: string;
}

export const printStyles = PRINT_STYLES_BASE + PRINT_STYLES_DIGITAL_SIG;

// Print Header
export const PrintHeader: React.FC<{ formNumber?: string }> = ({ formNumber }) => (
  <div className="header">
    <div className="ministry">BỘ Y TẾ</div>
    <div className="hospital-name">{HOSPITAL_NAME}</div>
    <div style={{ fontSize: 11 }}>{HOSPITAL_ADDRESS} - ĐT: {HOSPITAL_PHONE}</div>
    {formNumber && <div className="form-number">Mẫu số: {formNumber}</div>}
  </div>
);

/** Green checkmark SVG icon for digital signature stamp */
export const CheckMarkSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="#4caf50" opacity="0.15" />
    <path d="M6 12.5L10 16.5L18 8.5" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Reusable digital signature stamp - matches Vietnamese USB Token CKS format */
export const DigitalSignatureStamp: React.FC<{ stamp?: SignatureStampInfo }> = ({ stamp }) => {
  if (!stamp) return null;
  return (
    <div className="digital-sig-stamp" style={{ border: '2px solid #52c41a' }}>
      <div className="sig-stamp-check"><CheckMarkSvg /></div>
      <div className="sig-stamp-header" style={{ fontWeight: 'bold', fontStyle: 'italic' }}>Signature Valid</div>
      {stamp.organizationName && (
        <div className="sig-stamp-field" style={{ color: '#cf1322' }}>Ký bởi: {stamp.organizationName}</div>
      )}
      {stamp.signerName && !stamp.organizationName && (
        <div className="sig-stamp-field" style={{ color: '#cf1322' }}>Ký bởi: {stamp.signerName}</div>
      )}
      {stamp.signedAt && (
        <div className="sig-stamp-field" style={{ color: '#cf1322' }}>Ký ngày: {dayjs(stamp.signedAt).format('DD- MM- YYYY')}</div>
      )}
    </div>
  );
};

/** Parse DocumentSignatureDto to SignatureStampInfo */
export function toSignatureStamp(sig?: DocumentSignatureDto | null): SignatureStampInfo | undefined {
  if (!sig) return undefined;
  // Parse organizationName from certificateSubject (CN=..., O=..., OID.x.x=MST:...)
  let orgName = sig.organizationName;
  let taxCode = sig.taxCode;
  if (!orgName && sig.certificateSubject) {
    const oMatch = sig.certificateSubject.match(/O\s*=\s*([^,]+)/i);
    if (oMatch) orgName = oMatch[1].trim();
  }
  if (!taxCode && sig.certificateSubject) {
    const taxMatch = sig.certificateSubject.match(/(?:OID\.\d[\d.]*|SERIALNUMBER)\s*=\s*(?:MST:?)?\s*(\d+)/i);
    if (taxMatch) taxCode = taxMatch[1].trim();
  }
  return {
    organizationName: orgName,
    taxCode: taxCode,
    signedAt: sig.signedAt,
    signerName: sig.signerName,
  };
}

// Signature Block
export const SignatureBlock: React.FC<{
  leftTitle: string;
  rightTitle: string;
  date?: Date;
  leftStamp?: SignatureStampInfo;
  rightStamp?: SignatureStampInfo;
}> = ({ leftTitle, rightTitle, date, leftStamp, rightStamp }) => (
  <div className="signature-row">
    <div className="sig">
      <div className="sig-title">{leftTitle}</div>
      {leftStamp ? (
        <DigitalSignatureStamp stamp={leftStamp} />
      ) : (
        <div className="sig-date">(Ký, ghi rõ họ tên)</div>
      )}
    </div>
    <div className="sig">
      <div className="sig-date">
        {date ? `Ngày ${dayjs(date).format('DD')} tháng ${dayjs(date).format('MM')} năm ${dayjs(date).format('YYYY')}` : ''}
      </div>
      <div className="sig-title">{rightTitle}</div>
      {rightStamp ? (
        <DigitalSignatureStamp stamp={rightStamp} />
      ) : (
        <div className="sig-date">(Ký, ghi rõ họ tên)</div>
      )}
    </div>
  </div>
);

// Field row
export const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="field">
    <span className="field-label">{label}: </span>
    <span className="field-value">{value ?? '...........................'}</span>
  </div>
);

// ===========================
// 1. TOM TAT BENH AN (Medical Record Summary)
// ===========================
