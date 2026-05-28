import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../../constants/hospital';
import { PRINT_STYLES_BASE, PRINT_STYLES_DIGITAL_SIG } from '../../constants/printStyles';
import { DigitalSignatureStamp } from '../EMRPrintTemplates';
import type { SignatureStampInfo } from '../EMRPrintTemplates';

export const printStyles = PRINT_STYLES_BASE + PRINT_STYLES_DIGITAL_SIG;

export const PrintHeader: React.FC<{ formNumber?: string }> = ({ formNumber }) => (
  <div className="header">
    <div className="ministry">BO Y TE</div>
    <div className="hospital-name">{HOSPITAL_NAME}</div>
    <div style={{ fontSize: 11 }}>{HOSPITAL_ADDRESS} - DT: {HOSPITAL_PHONE}</div>
    {formNumber && <div className="form-number">Mau so: {formNumber}</div>}
  </div>
);

export const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="field">
    <span className="field-label">{label}: </span>
    <span className="field-value">{value ?? '...........................'}</span>
  </div>
);

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
        <div className="sig-date">(Ky, ghi ro ho ten)</div>
      )}
    </div>
    <div className="sig">
      <div className="sig-date">
        {date ? `Ngay ${dayjs(date).format('DD')} thang ${dayjs(date).format('MM')} nam ${dayjs(date).format('YYYY')}` : ''}
      </div>
      <div className="sig-title">{rightTitle}</div>
      {rightStamp ? (
        <DigitalSignatureStamp stamp={rightStamp} />
      ) : (
        <div className="sig-date">(Ky, ghi ro ho ten)</div>
      )}
    </div>
  </div>
);

/** Shared patient header block */
export const PatientBlock: React.FC<{ d: Record<string, any> }> = ({ d }) => (
  <div className="section">
    <div className="row">
      <div className="col"><Field label="Ho va ten" value={d.patientName} /></div>
      <div className="col"><Field label="Gioi tinh" value={d.gender} /></div>
      <div className="col"><Field label="Tuoi" value={d.age} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Ma BN" value={d.patientCode} /></div>
      <div className="col"><Field label="Ma HSBA" value={d.medicalRecordCode} /></div>
    </div>
    <Field label="Dia chi" value={d.address} />
    <div className="row">
      <div className="col"><Field label="Nghe nghiep" value={d.occupation} /></div>
      <div className="col"><Field label="Dan toc" value={d.ethnicity} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Ngay vao vien" value={d.admissionDate ? dayjs(d.admissionDate).format('DD/MM/YYYY') : undefined} /></div>
      <div className="col"><Field label="Khoa" value={d.departmentName} /></div>
    </div>
  </div>
);

/** Dotted area for free text */
export const DottedArea: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <div style={{ minHeight: lines * 22, borderBottom: '1px dotted #999', marginBottom: 4 }}>&nbsp;</div>
);

// ============================================================
// 1. BA Noi khoa (MS:01/BV1)
// ============================================================
