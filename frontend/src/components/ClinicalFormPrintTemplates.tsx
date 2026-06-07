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

// G-37: phieu XN dong mau (XN-05) — bo thong so co dinh, doc record[key]
export const CoagulationReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="XN-05" formTitle="PHIEU KET QUA DONG MAU" />
    <PatientInfo record={record} />
    <Field label="Loai mau" value={record?.sampleType as string} inline />
    <Field label="Ngay lay mau" value={record?.sampleDate as string} inline />
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
          {[
            { k: 'pt', l: 'PT (Prothrombin)', u: 'giay', n: '11-14' },
            { k: 'ptpercent', l: 'PT %', u: '%', n: '70-140' },
            { k: 'inr', l: 'INR', u: '', n: '0.8-1.2' },
            { k: 'aptt', l: 'APTT', u: 'giay', n: '25-35' },
            { k: 'apttratio', l: 'APTT ratio', u: '', n: '0.8-1.2' },
            { k: 'fibrinogen', l: 'Fibrinogen', u: 'g/L', n: '2-4' },
            { k: 'tt', l: 'TT (Thrombin)', u: 'giay', n: '14-21' },
            { k: 'ddimer', l: 'D-dimer', u: 'mg/L FEU', n: '< 0.5' },
          ].map((p) => (
            <tr key={p.k}>
              <td style={{ border: '1px solid #999', padding: 4, fontWeight: 'bold' }}>{p.l}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{(record?.[p.k] as string) || '...'}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{p.u}</td>
              <td style={{ border: '1px solid #999', padding: 4 }}>{p.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si huyet hoc']} />
  </div>
);

// G-37: phieu XN nuoc tieu (XN-06) — 10 thong so que thu + cap lang
export const UrinalysisReportPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="XN-06" formTitle="PHIEU KET QUA XET NGHIEM NUOC TIEU" />
    <PatientInfo record={record} />
    <Field label="Ngay lay mau" value={record?.sampleDate as string} inline />
    <div style={{ marginTop: 12, fontWeight: 'bold' }}>Tong phan tich nuoc tieu (10 thong so):</div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 4 }}>
      <thead>
        <tr>
          <th style={{ border: '1px solid #999', padding: 4 }}>Thong so</th>
          <th style={{ border: '1px solid #999', padding: 4 }}>Ket qua</th>
          <th style={{ border: '1px solid #999', padding: 4 }}>Binh thuong</th>
        </tr>
      </thead>
      <tbody>
        {[
          { k: 'sg', l: 'Ty trong (SG)', n: '1.003-1.030' },
          { k: 'ph', l: 'pH', n: '4.5-8.0' },
          { k: 'protein', l: 'Protein (PRO)', n: 'Am tinh' },
          { k: 'glucose', l: 'Glucose (GLU)', n: 'Am tinh' },
          { k: 'ketone', l: 'Ceton (KET)', n: 'Am tinh' },
          { k: 'blood', l: 'Hong cau (BLD)', n: 'Am tinh' },
          { k: 'leukocyte', l: 'Bach cau (LEU)', n: 'Am tinh' },
          { k: 'nitrite', l: 'Nitrit (NIT)', n: 'Am tinh' },
          { k: 'urobilinogen', l: 'Urobilinogen (URO)', n: 'Binh thuong' },
          { k: 'bilirubin', l: 'Bilirubin (BIL)', n: 'Am tinh' },
        ].map((p) => (
          <tr key={p.k}>
            <td style={{ border: '1px solid #999', padding: 4, fontWeight: 'bold' }}>{p.l}</td>
            <td style={{ border: '1px solid #999', padding: 4 }}>{(record?.[p.k] as string) || '...'}</td>
            <td style={{ border: '1px solid #999', padding: 4 }}>{p.n}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 'bold' }}>Cap lang nuoc tieu:</div>
      <div style={{ minHeight: 36, border: '1px dashed #ccc', padding: 8 }}>{(record?.sediment as string) || ''}</div>
    </div>
    <SignatureBlock titles={['Ky thuat vien', 'Bac si XN']} />
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

// ============ 5 Missing Forms (G-37 audit 2026-06-05) ============

// LS-04: Phieu phan loai benh nhan cap cuu (Triage ED) — Manchester Triage adapted VN
export const TriagePrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="LS-04" formTitle="PHIEU PHAN LOAI BENH NHAN CAP CUU (TRIAGE)" />
    <PatientInfo record={record} />
    <Field label="Gio tiep nhan" value={record?.triageTime as string} inline />
    <Field label="Nhan vien triage" value={record?.triageNurse as string} inline />
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Mau triage (danh dau):</div>
      {(['Do — Cap cuu ngay (0-10 phat)', 'Da cam — Cap cuu (10-30 phat)', 'Vang — Can theo doi (30-60 phat)', 'Xanh la — Nhe (60-120 phat)', 'Den/Xam — Pho thac/Khong can cap cuu'] as const).map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 4, gap: 8 }}>
          <div style={{ width: 16, height: 16, border: '1px solid #333', flexShrink: 0 }}>{record?.triageColor === ['red', 'orange', 'yellow', 'green', 'black'][i] ? '✓' : ''}</div>
          <span>{label}</span>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 'bold' }}>Ly do den cap cuu / Trieu chung chinh:</div>
      <div style={{ minHeight: 48, border: '1px dashed #ccc', padding: 8 }}>{(record?.chiefComplaint as string) || ''}</div>
    </div>
    <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
      <Field label="Mach (l/p)" value={record?.pulse as string} />
      <Field label="Huyet ap (mmHg)" value={record?.bloodPressure as string} />
      <Field label="Nhiet do (°C)" value={record?.temperature as string} />
      <Field label="SpO2 (%)" value={record?.spo2 as string} />
      <Field label="GCS" value={record?.gcs as string} />
    </div>
    <div style={{ marginTop: 8 }}>
      <Field label="Dau (VAS 0-10)" value={record?.painScore as string} inline />
      <Field label="AVPU" value={record?.avpu as string} inline />
    </div>
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 'bold' }}>Xu tri ban dau:</div>
      <div style={{ minHeight: 40, border: '1px dashed #ccc', padding: 8 }}>{(record?.initialManagement as string) || ''}</div>
    </div>
    <Field label="Buong dieu tri" value={record?.room as string} inline />
    <Field label="Bac si nhan benh" value={record?.receivingDoctor as string} inline />
    <SignatureBlock titles={['Dieu duong Triage', 'Bac si Cap cuu']} />
  </div>
);

// LS-05: Giay cung cap thong tin va cam ket nhap vien
export const AdmissionConsentPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="LS-05" formTitle="GIAY CAM KET NHAP VIEN VA CUNG CAP THONG TIN" />
    <PatientInfo record={record} />
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Nguoi benh / Nguoi giam ho:</div>
      <Field label="Ho ten" value={record?.representativeName as string} inline />
      <Field label="Quan he" value={record?.relationship as string} inline />
      <Field label="CCCD/CMND" value={record?.representativeId as string} inline />
      <Field label="SDT" value={record?.representativePhone as string} />
    </div>
    <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.8 }}>
      <p>Toi da duoc bac si giai thich ro rang ve:</p>
      <p>1. Tinh trang benh ly hien tai, cac phuong phap dieu tri du kien va nhung rui ro co the gap phai.</p>
      <p>2. Quyen loi va nghia vu cua nguoi benh trong qua trinh nam vien.</p>
      <p>3. Noi quy benh vien va chi phi dieu tri uoc tinh.</p>
      <p>Toi DONG Y nhap vien va dong y cho phep co so y te thuc hien cac thu thuat can thiet trong khuon kho dieu tri, dong thoi cam ket:</p>
      <ul style={{ marginLeft: 20 }}>
        <li>Tuan thu noi quy, quy che benh vien.</li>
        <li>Cung cap day du, trung thuc lich su benh ly va thong tin ca nhan.</li>
        <li>Thanh toan cac chi phi theo quy dinh.</li>
        <li>Khong mang theo tien mat, tu trang co gia tri; co so y te khong chiu trach nhiem neu mat mat.</li>
      </ul>
      <div style={{ marginTop: 8 }}>
        <Field label="Chan doan nhap vien" value={record?.admissionDiagnosis as string} />
        <Field label="Khoa nhap vien" value={record?.departmentName as string} inline />
        <Field label="Ngay nhap vien" value={record?.admissionDate as string} inline />
      </div>
    </div>
    <SignatureBlock titles={['Nguoi benh / Nguoi giam ho', 'Bac si lam thu tuc', 'Truong khoa']} />
  </div>
);

// LS-06: Giay cam ket tu choi dich vu / thu thuat
export const RefusalConsentPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="LS-06" formTitle="GIAY CAM KET TU CHOI DICH VU Y TE" />
    <PatientInfo record={record} />
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Nguoi benh / Nguoi giam ho:</div>
      <Field label="Ho ten" value={record?.representativeName as string} inline />
      <Field label="Quan he" value={record?.relationship as string} inline />
      <Field label="CCCD/CMND" value={record?.representativeId as string} inline />
      <Field label="SDT" value={record?.representativePhone as string} />
    </div>
    <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.8 }}>
      <p>Sau khi duoc bac si giai thich day du ve sự can thiet cua:</p>
      <div style={{ minHeight: 40, border: '1px dashed #ccc', padding: 8, marginBottom: 8 }}>{(record?.refusedService as string) || ''}</div>
      <p>Va cac rui ro co the xay ra neu khong thuc hien dich vu tren:</p>
      <div style={{ minHeight: 40, border: '1px dashed #ccc', padding: 8, marginBottom: 8 }}>{(record?.risks as string) || ''}</div>
      <p>Toi hieu ro nhung rui ro tren, tuy nhien TOI TU CHOI thuc hien dich vu noi tren va hoan toan chiu trach nhiem truoc phap luat ve quyet dinh nay. Co so y te khong chiu trach nhiem ve nhung hau qua co the xay ra do tu choi dich vu.</p>
    </div>
    <Field label="Ngay" value={record?.refusalDate ? dayjs(record.refusalDate as string).format('DD/MM/YYYY') : undefined} />
    <SignatureBlock titles={['Nguoi benh / Nguoi giam ho', 'Nguoi chung kien', 'Bac si tu van']} />
  </div>
);

// LS-07: Giay cam ket chuyen co so dieu tri (theo yeu cau nguoi benh)
export const TransferConsentPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="LS-07" formTitle="GIAY CAM KET CHUYEN CO SO DIEU TRI THEO YEU CAU" />
    <PatientInfo record={record} />
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Nguoi benh / Nguoi giam ho:</div>
      <Field label="Ho ten" value={record?.representativeName as string} inline />
      <Field label="Quan he" value={record?.relationship as string} inline />
      <Field label="CCCD/CMND" value={record?.representativeId as string} inline />
      <Field label="SDT" value={record?.representativePhone as string} />
    </div>
    <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.8 }}>
      <p>Sau khi duoc bac si thong bao ve tinh trang benh ly hien tai va khuyen nghi tiep tuc dieu tri tai co so nay, toi van YÊU CAU chuyen toi:</p>
      <Field label="Co so nhan chuyen" value={record?.destinationHospital as string} />
      <p style={{ marginTop: 8 }}>Ly do yeu cau chuyen:</p>
      <div style={{ minHeight: 40, border: '1px dashed #ccc', padding: 8, marginBottom: 8 }}>{(record?.transferReason as string) || ''}</div>
      <p>Toi hieu rang viec chuyen vien trong tinh trang benh ly hien tai co the gay ra nhung rui ro sau:</p>
      <div style={{ minHeight: 40, border: '1px dashed #ccc', padding: 8, marginBottom: 8 }}>{(record?.risks as string) || ''}</div>
      <p>Toi hoan toan DONG Y va chiu trach nhiem ve nhung rui ro co the xay ra trong qua trinh van chuyen va sau chuyen vien theo yeu cau cua ban than.</p>
    </div>
    <Field label="Ngay" value={record?.transferDate ? dayjs(record.transferDate as string).format('DD/MM/YYYY') : undefined} />
    <SignatureBlock titles={['Nguoi benh / Nguoi giam ho', 'Nguoi chung kien', 'Bac si phu trach']} />
  </div>
);

// LS-08: Giay cam ket ra vien trai chi dinh (AMA — Against Medical Advice)
export const AMADischargePrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => (
  <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
    <PrintHeader formCode="LS-08" formTitle="GIAY CAM KET XIN RA VIEN TRAI CHI DINH" />
    <PatientInfo record={record} />
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Nguoi benh / Nguoi giam ho:</div>
      <Field label="Ho ten" value={record?.representativeName as string} inline />
      <Field label="Quan he" value={record?.relationship as string} inline />
      <Field label="CCCD/CMND" value={record?.representativeId as string} inline />
      <Field label="SDT" value={record?.representativePhone as string} />
    </div>
    <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.8 }}>
      <p>Sau khi duoc bac si thong bao day du ve tinh trang benh ly hien tai:</p>
      <Field label="Chan doan hien tai" value={record?.currentDiagnosis as string} />
      <p style={{ marginTop: 8 }}>Va khuyen nghi cua bac si la tiep tuc dieu tri tai co so vi:</p>
      <div style={{ minHeight: 40, border: '1px dashed #ccc', padding: 8, marginBottom: 8 }}>{(record?.doctorRecommendation as string) || ''}</div>
      <p>Toi da hieu ro tinh trang benh cua ban than / nguoi than va cac rui ro NGHIEM TRONG co the xay ra khi ra vien som, bao gom:</p>
      <div style={{ minHeight: 40, border: '1px dashed #ccc', padding: 8, marginBottom: 8 }}>{(record?.risks as string) || ''}</div>
      <p>Tuy nhien toi van quyet dinh XIN RA VIEN va hoan toan TU CHIU TRACH NHIEM truoc phap luat ve nhung hau qua co the xay ra. Co so y te khong chiu trach nhiem ve viec cham dut dieu tri noi tren.</p>
      <p>Toi da duoc tu van va nhan don thuoc (neu co) de tiep tuc dieu tri ngoai tru.</p>
    </div>
    <Field label="Ngay xin ra vien" value={record?.amaDate ? dayjs(record.amaDate as string).format('DD/MM/YYYY HH:mm') : undefined} />
    <SignatureBlock titles={['Nguoi benh / Nguoi giam ho', 'Nguoi chung kien', 'Bac si phu trach']} />
  </div>
);

// ============ Bieu do chuyen da (Partograph) ============
// Template in theo TT52/2017. Data chi tiet duoc ghi tu tab "Bieu do chuyen da".
export const PartographPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => {
  const p = record?.patient as Record<string, unknown> | undefined;
  return (
    <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
      <PrintHeader formCode="LS-PG" formTitle="BIEU DO CHUYEN DA (PARTOGRAPH)" />
      <PatientInfo record={record} />

      <div style={{ marginBottom: 12 }}>
        <Field label="Ho va ten me" value={p?.fullName as string} inline />
        <Field label="Ma benh nhan" value={p?.patientCode as string} inline />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            {['Gio ghi', 'Do mo CTC (cm)', 'Tu the ngoi thai', 'Tim thai (l/ph)', 'Con co (so lan/10ph)', 'HA me (mmHg)', 'Mach me', 'Ghi chu'].map((h) => (
              <th key={h} style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4].map((i) => (
            <tr key={i}>
              {Array(8).fill(null).map((_, j) => (
                <td key={j} style={{ border: '1px solid #ccc', padding: '6px', height: 24 }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 10, color: '#666', marginBottom: 12 }}>
        * Du lieu chi tiet duoc ghi trong tab "Bieu do chuyen da" tren he thong EMR.
        Mau so tham khao theo TT52/2017 - Bo Y te.
      </div>

      <SignatureBlock titles={['Ho sinh phu trach', 'Bac si san khoa', 'Giam sat']} />
    </div>
  );
};

// ============ Thu phan ung thuoc (Drug Reaction Test) ============
// Hien thi du lieu di ung da ghi nhan trong MedicalRecordFullDto.allergies.
export const DrugReactionPrint: React.FC<{ record?: Record<string, unknown> }> = ({ record }) => {
  const p = record?.patient as Record<string, unknown> | undefined;
  const allergies = (record?.allergies as Array<Record<string, unknown>> | undefined) ?? [];
  return (
    <div style={{ fontFamily: 'Times New Roman', padding: 20, maxWidth: 800 }}>
      <PrintHeader formCode="LS-DR" formTitle="PHIEU THU PHAN UNG THUOC" />
      <PatientInfo record={record} />

      <div style={{ marginBottom: 12 }}>
        <Field label="Ho va ten" value={p?.fullName as string} inline />
        <Field label="Ma BN" value={p?.patientCode as string} inline />
        <Field label="Tuoi" value={p?.age as string} inline />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 16 }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            {['STT', 'Ten thuoc', 'Ham luong / Duong dung', 'Ket qua thu', 'Phan ung (neu co)', 'Xu tri', 'Ghi chu'].map((h) => (
              <th key={h} style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allergies.length > 0
            ? allergies.map((a, i) => (
                <tr key={String(a.id ?? i)}>
                  <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{String(a.allergenName ?? '')}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{String(a.dosage ?? '')}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 6px', textAlign: 'center' }}>
                    {a.severity === 3 ? 'Duong tinh nang' : a.severity === 2 ? 'Duong tinh vua' : 'Am tinh / nhe'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{String(a.reaction ?? '')}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}>{String(a.treatment ?? '')}</td>
                  <td style={{ border: '1px solid #ccc', padding: '4px 6px' }}></td>
                </tr>
              ))
            : [1, 2, 3].map((i) => (
                <tr key={i}>
                  {Array(7).fill(null).map((_, j) => (
                    <td key={j} style={{ border: '1px solid #ccc', padding: '6px', height: 24 }} />
                  ))}
                </tr>
              ))}
        </tbody>
      </table>

      <div style={{ fontSize: 10, color: '#666', marginBottom: 12 }}>
        * Ket qua thu phan ung thuoc ghi nhan trong vong 20-30 phut sau khi thu.
        Mau so tham khao theo TT52/2017 - Bo Y te.
      </div>

      <SignatureBlock titles={['Dieu duong thu thuoc', 'Bac si chi dinh', 'Nguoi benh / Nguoi giam ho']} />
    </div>
  );
};
