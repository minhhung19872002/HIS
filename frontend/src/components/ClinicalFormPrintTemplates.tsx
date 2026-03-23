import React from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS } from '../constants/hospital';
import type { SignatureStampInfo } from './EMRPrintTemplates';

// Shared print header
const PrintHeader: React.FC<{ formCode?: string; formTitle: string }> = ({ formCode, formTitle }) => (
  <div style={{ textAlign: 'center', marginBottom: 16 }}>
    <div style={{ fontSize: 11, fontWeight: 'bold' }}>BO Y TE</div>
    <div style={{ fontSize: 13, fontWeight: 'bold' }}>{HOSPITAL_NAME}</div>
    <div style={{ fontSize: 10 }}>{HOSPITAL_ADDRESS}</div>
    <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 12 }}>{formTitle}</div>
    {formCode && <div style={{ fontSize: 10, fontStyle: 'italic' }}>(Mau so: {formCode})</div>}
  </div>
);

const Field: React.FC<{ label: string; value?: string | number | null; inline?: boolean }> = ({ label, value, inline }) => (
  <div style={inline ? { display: 'inline-block', marginRight: 24 } : { marginBottom: 4 }}>
    <span style={{ fontWeight: 'bold' }}>{label}: </span>
    <span>{value ?? '...........'}</span>
  </div>
);

/** Green checkmark SVG for digital signature stamp */
const CheckMarkSvg = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28 }}>
    <circle cx="12" cy="12" r="11" fill="#4caf50" opacity="0.15" />
    <path d="M6 12.5L10 16.5L18 8.5" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DigitalStamp: React.FC<{ stamp?: SignatureStampInfo }> = ({ stamp }) => {
  if (!stamp) return null;
  return (
    <div style={{ border: '2px solid #52c41a', borderRadius: 4, padding: '8px 12px', display: 'inline-block', textAlign: 'left', fontSize: 11, lineHeight: 1.5, marginTop: 4, position: 'relative', background: '#fff' }}>
      <div style={{ position: 'absolute', top: -8, right: -8 }}><CheckMarkSvg /></div>
      <div style={{ fontWeight: 'bold', fontStyle: 'italic', color: '#333', marginBottom: 4 }}>Signature Valid</div>
      {stamp.organizationName && <div style={{ paddingLeft: 8, color: '#cf1322' }}>Ký bởi: {stamp.organizationName}</div>}
      {stamp.signerName && !stamp.organizationName && <div style={{ paddingLeft: 8, color: '#cf1322' }}>Ký bởi: {stamp.signerName}</div>}
      {stamp.signedAt && <div style={{ paddingLeft: 8, color: '#cf1322' }}>Ký ngày: {dayjs(stamp.signedAt).format('DD- MM- YYYY')}</div>}
    </div>
  );
};

const SignatureBlock: React.FC<{ titles: string[]; stamps?: (SignatureStampInfo | undefined)[] }> = ({ titles, stamps }) => (
  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 32 }}>
    {titles.map((t, i) => (
      <div key={i} style={{ textAlign: 'center', minWidth: 150 }}>
        <div style={{ fontWeight: 'bold' }}>{t}</div>
        {stamps?.[i] ? (
          <DigitalStamp stamp={stamps[i]} />
        ) : (
          <>
            <div style={{ fontStyle: 'italic', fontSize: 10 }}>(Ky, ghi ro ho ten)</div>
            <div style={{ height: 60 }} />
          </>
        )}
      </div>
    ))}
  </div>
);

const PatientInfo: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ marginBottom: 12, borderBottom: '1px solid #999', paddingBottom: 8 }}>
    <Field label="Ho va ten" value={record?.patientName as string} inline />
    <Field label="Gioi tinh" value={record?.gender as string} inline />
    <Field label="Tuoi" value={record?.age as string} inline />
    <Field label="Ma benh nhan" value={record?.patientCode as string} inline />
    <Field label="Khoa" value={record?.departmentName as string} inline />
    <Field label="Giuong" value={record?.bedName as string} inline />
    <Field label="Chan doan" value={record?.diagnosis as string} />
  </div>
);

// ============ 5 Radiology Forms ============

export const XRayReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="CDHA-01" formTitle="KET QUA CHUP X-QUANG" />
    <PatientInfo record={record} />
    <Field label="Vung chup" value={record?.bodyPart as string} />
    <Field label="Tu the" value={record?.position as string} />
    <Field label="Ky thuat" value={record?.technique as string} />
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Mo ta hinh anh:</div>
      <div style={{ minHeight: 100, border: '1px dashed #ccc', padding: 8 }}>{(record?.findings as string) || ''}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket luan:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.conclusion as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si doc ket qua']} />
  </div>
);

export const CTScanReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="CDHA-02" formTitle="KET QUA CHUP CT SCANNER" />
    <PatientInfo record={record} />
    <Field label="Vung chup" value={record?.bodyPart as string} />
    <Field label="Thuoc can quang" value={record?.contrastAgent as string} inline />
    <Field label="Lieu luong" value={record?.contrastDose as string} inline />
    <Field label="Ky thuat" value={record?.technique as string} />
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Mo ta hinh anh:</div>
      <div style={{ minHeight: 120, border: '1px dashed #ccc', padding: 8 }}>{(record?.findings as string) || ''}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket luan:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.conclusion as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si CDHA']} />
  </div>
);

export const MRIReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="CDHA-03" formTitle="KET QUA CHUP CONG HUONG TU (MRI)" />
    <PatientInfo record={record} />
    <Field label="Vung chup" value={record?.bodyPart as string} />
    <Field label="Tu truong" value={record?.fieldStrength as string} inline />
    <Field label="Thuoc doi quang" value={record?.contrastAgent as string} inline />
    <Field label="Chuoi xung" value={record?.sequences as string} />
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Mo ta hinh anh:</div>
      <div style={{ minHeight: 120, border: '1px dashed #ccc', padding: 8 }}>{(record?.findings as string) || ''}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket luan:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.conclusion as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si CDHA']} />
  </div>
);

export const UltrasoundReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="CDHA-04" formTitle="KET QUA SIEU AM" />
    <PatientInfo record={record} />
    <Field label="Vung sieu am" value={record?.bodyPart as string} />
    <Field label="Loai dau do" value={record?.probeType as string} />
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Mo ta:</div>
      <div style={{ minHeight: 100, border: '1px dashed #ccc', padding: 8 }}>{(record?.findings as string) || ''}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket luan:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.conclusion as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Bac si sieu am']} />
  </div>
);

export const ECGReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="CDHA-05" formTitle="KET QUA DIEN TAM DO (ECG)" />
    <PatientInfo record={record} />
    <Field label="Nhip tim" value={record?.heartRate as string} inline />
    <Field label="Truc dien" value={record?.axis as string} inline />
    <Field label="Nhip" value={record?.rhythm as string} />
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Phan tich song:</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <tbody>
          {['Song P', 'Khoang PR', 'Phuc bo QRS', 'Doan ST', 'Song T'].map(item => (
            <tr key={item}>
              <td style={{ border: '1px solid #999', padding: 4, width: '30%', fontWeight: 'bold' }}>{item}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{(record?.[item.toLowerCase().replace(/ /g, '')] as string) || '...'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket luan:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.conclusion as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si doc ECG']} />
  </div>
);

// ============ 3 Diagnostic Forms ============

export const EEGReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="TDCN-01" formTitle="KET QUA DIEN NAO DO (EEG)" />
    <PatientInfo record={record} />
    <Field label="Thoi gian ghi" value={record?.duration as string} inline />
    <Field label="Tinh trang BN" value={record?.patientCondition as string} />
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Mo ta:</div>
      <div style={{ minHeight: 100, border: '1px dashed #ccc', padding: 8 }}>{(record?.findings as string) || ''}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket luan:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.conclusion as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si doc EEG']} />
  </div>
);

export const EndoscopyReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="TDCN-02" formTitle="KET QUA NOI SOI" />
    <PatientInfo record={record} />
    <Field label="Loai noi soi" value={record?.endoscopyType as string} />
    <Field label="Tien me" value={record?.sedation as string} inline />
    <Field label="May noi soi" value={record?.equipment as string} inline />
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Mo ta:</div>
      <div style={{ minHeight: 120, border: '1px dashed #ccc', padding: 8 }}>{(record?.findings as string) || ''}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Sinh thiet:</div>
      <div>{(record?.biopsyTaken as string) || 'Khong'}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket luan:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.conclusion as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Bac si noi soi']} />
  </div>
);

export const PFTReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="TDCN-03" formTitle="KET QUA DO CHUC NANG HO HAP (PFT)" />
    <PatientInfo record={record} />
    <Field label="Chieu cao" value={record?.height as string} inline />
    <Field label="Can nang" value={record?.weight as string} inline />
    <div style={{ marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: 4 }}>Thong so</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Gia tri do</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>% du kien</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Nhan xet</th>
          </tr>
        </thead>
        <tbody>
          {['FVC', 'FEV1', 'FEV1/FVC', 'PEF', 'FEF25-75'].map(param => (
            <tr key={param}>
              <td style={{ border: '1px solid #999', padding: 4, fontWeight: 'bold' }}>{param}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{(record?.[param.toLowerCase()] as string) || '...'}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{(record?.[`${param.toLowerCase()}Pct`] as string) || '...'}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket luan:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.conclusion as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si CNHH']} />
  </div>
);

// ============ 4 Lab Report Forms ============

export const GeneralLabReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="XN-01" formTitle="PHIEU KET QUA XET NGHIEM" />
    <PatientInfo record={record} />
    <Field label="Loai mau" value={record?.sampleType as string} inline />
    <Field label="Ngay lay mau" value={record?.sampleDate as string} inline />
    <div style={{ marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: 4 }}>STT</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Ten xet nghiem</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Ket qua</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Don vi</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Binh thuong</th>
          </tr>
        </thead>
        <tbody>
          {((record?.results as Array<Record<string, string>>) || []).map((r, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #999', padding: 4, textAlign: 'center' }}>{i + 1}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{r.testName}</td>
              <td style={{ border: '1px solid #999', padding: 4, fontWeight: 'bold' }}>{r.result}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{r.unit}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{r.normalRange}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si XN', 'Truong khoa XN']} />
  </div>
);

export const HematologyReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="XN-02" formTitle="PHIEU KET QUA HUYET HOC" />
    <PatientInfo record={record} />
    <div style={{ marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: 4 }}>Thong so</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Ket qua</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Binh thuong</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Co/Flag</th>
          </tr>
        </thead>
        <tbody>
          {['WBC', 'RBC', 'HGB', 'HCT', 'PLT', 'MCV', 'MCH', 'MCHC', 'NEU%', 'LYM%', 'MONO%', 'EOS%', 'BASO%'].map(p => (
            <tr key={p}>
              <td style={{ border: '1px solid #999', padding: 4, fontWeight: 'bold' }}>{p}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{(record?.[p.toLowerCase()] as string) || '...'}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}></td>
              <td style={{ border: '1px solid #999', padding: 4 }}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si huyet hoc']} />
  </div>
);

export const BiochemistryReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="XN-03" formTitle="PHIEU KET QUA SINH HOA" />
    <PatientInfo record={record} />
    <div style={{ marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: 4 }}>Thong so</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Ket qua</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Don vi</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Binh thuong</th>
          </tr>
        </thead>
        <tbody>
          {['Glucose', 'Ure', 'Creatinine', 'AST (GOT)', 'ALT (GPT)', 'Cholesterol', 'Triglyceride', 'Bilirubin TP', 'Protein TP', 'Albumin', 'Na+', 'K+', 'Cl-', 'Ca++'].map(p => (
            <tr key={p}>
              <td style={{ border: '1px solid #999', padding: 4, fontWeight: 'bold' }}>{p}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{(record?.[p.toLowerCase().replace(/[^a-z]/g, '')] as string) || '...'}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}></td>
              <td style={{ border: '1px solid #999', padding: 4 }}></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si sinh hoa']} />
  </div>
);

export const MicrobiologyReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="XN-04" formTitle="PHIEU KET QUA VI SINH" />
    <PatientInfo record={record} />
    <Field label="Loai benh pham" value={record?.specimenType as string} />
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket qua nhuom soi:</div>
      <div style={{ minHeight: 40, border: '1px dashed #ccc', padding: 8 }}>{(record?.gramStain as string) || ''}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Ket qua cay:</div>
      <Field label="Vi khuan phan lap" value={record?.organism as string} />
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Khang sinh do (AST):</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 4 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: 4 }}>Khang sinh</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>MIC</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Ket qua</th>
          </tr>
        </thead>
        <tbody>
          {((record?.astResults as Array<Record<string, string>>) || []).map((a, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #999', padding: 4 }}>{a.antibiotic}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{a.mic}</td>
              <td style={{ border: '1px solid #999', padding: 4, fontWeight: 'bold', color: a.result === 'R' ? 'red' : a.result === 'S' ? 'green' : 'orange' }}>{a.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si vi sinh']} />
  </div>
);

// ============ 3 Clinical Forms ============

export const AllergyFormPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="LS-01" formTitle="PHIEU GHI NHAN DI UNG" />
    <PatientInfo record={record} />
    <div style={{ marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: 4 }}>STT</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Chat gay di ung</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Loai</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Muc do</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Bieu hien</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Ngay phat hien</th>
          </tr>
        </thead>
        <tbody>
          {((record?.allergies as Array<Record<string, string>>) || []).map((a, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #999', padding: 4, textAlign: 'center' }}>{i + 1}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{a.allergen}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{a.type}</td>
              <td style={{ border: '1px solid #999', padding: 4, fontWeight: 'bold', color: a.severity === 'Nang' ? 'red' : 'inherit' }}>{a.severity}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{a.reaction}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{a.dateDetected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <SignatureBlock titles={['Dieu duong', 'Bac si']} />
  </div>
);

export const PostOpNotePrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="LS-02" formTitle="PHIEU THEO DOI SAU PHAU THUAT" />
    <PatientInfo record={record} />
    <Field label="Phau thuat" value={record?.surgeryName as string} />
    <Field label="Ngay phau thuat" value={record?.surgeryDate as string} />
    <Field label="Phuong phap vo cam" value={record?.anesthesiaType as string} />
    <div style={{ marginTop: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #999', padding: 4 }}>Gio</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Mach</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>HA</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Nhiet do</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>SpO2</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Dau (VAS)</th>
            <th style={{ border: '1px solid #999', padding: 4 }}>Dien bien</th>
          </tr>
        </thead>
        <tbody>
          {((record?.monitorEntries as Array<Record<string, string>>) || []).map((e, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #999', padding: 4 }}>{e.time}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{e.pulse}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{e.bp}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{e.temp}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{e.spo2}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{e.painScore}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{e.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <SignatureBlock titles={['Dieu duong', 'Bac si dieu tri']} />
  </div>
);

export const ICUInfoSheetPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="LS-03" formTitle="PHIEU THONG TIN BENH NHAN HSCC/ICU" />
    <PatientInfo record={record} />
    <Field label="Ngay vao ICU" value={record?.icuAdmitDate as string} inline />
    <Field label="Ly do vao ICU" value={record?.icuReason as string} />
    <Field label="Diem APACHE II" value={record?.apacheScore as string} inline />
    <Field label="Diem SOFA" value={record?.sofaScore as string} inline />
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Tinh trang hien tai:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.currentCondition as string) || ''}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Thiet bi/Mon:</div>
      <div style={{ minHeight: 40, border: '1px dashed #ccc', padding: 8 }}>{(record?.devices as string) || ''}</div>
    </div>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Y lenh:</div>
      <div style={{ minHeight: 60, border: '1px dashed #ccc', padding: 8 }}>{(record?.orders as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Dieu duong HSCC', 'Bac si HSCC']} />
  </div>
);
