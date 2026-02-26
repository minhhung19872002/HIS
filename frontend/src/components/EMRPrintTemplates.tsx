import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';
import type {
  MedicalRecordFullDto, TreatmentSheetDto, ConsultationRecordDto, NursingCareSheetDto,
} from '../api/examination';

// Shared print styles
const printStyles = `
@media print {
  body * { visibility: hidden; }
  .emr-print-container, .emr-print-container * { visibility: visible; }
  .emr-print-container { position: absolute; left: 0; top: 0; width: 210mm; }
  @page { size: A4; margin: 15mm 20mm; }
}
.emr-print-container {
  font-family: 'Times New Roman', serif;
  font-size: 13px;
  line-height: 1.6;
  color: #000;
  max-width: 210mm;
  margin: 0 auto;
}
.emr-print-container h2 { text-align: center; font-size: 16px; margin: 8px 0; text-transform: uppercase; }
.emr-print-container h3 { font-size: 14px; margin: 6px 0; }
.emr-print-container .header { text-align: center; margin-bottom: 16px; border-bottom: 1px solid #000; padding-bottom: 8px; }
.emr-print-container .header .hospital-name { font-weight: bold; font-size: 15px; text-transform: uppercase; }
.emr-print-container .header .ministry { font-size: 12px; }
.emr-print-container .field { margin: 4px 0; }
.emr-print-container .field-label { font-weight: bold; display: inline; }
.emr-print-container .field-value { display: inline; border-bottom: 1px dotted #999; min-width: 100px; padding: 0 4px; }
.emr-print-container .row { display: flex; gap: 16px; }
.emr-print-container .row .col { flex: 1; }
.emr-print-container .section { margin: 12px 0; }
.emr-print-container .section-title { font-weight: bold; font-size: 13px; border-bottom: 1px solid #ccc; margin-bottom: 6px; padding-bottom: 2px; }
.emr-print-container table { width: 100%; border-collapse: collapse; margin: 8px 0; }
.emr-print-container table th, .emr-print-container table td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 12px; }
.emr-print-container table th { background: #f0f0f0; font-weight: bold; text-align: center; }
.emr-print-container .signature-row { display: flex; justify-content: space-between; margin-top: 32px; text-align: center; }
.emr-print-container .signature-row .sig { width: 45%; }
.emr-print-container .signature-row .sig-title { font-weight: bold; font-size: 13px; }
.emr-print-container .signature-row .sig-date { font-style: italic; font-size: 12px; margin-bottom: 40px; }
.emr-print-container .form-number { text-align: right; font-size: 11px; font-style: italic; }
`;

// Print Header
const PrintHeader: React.FC<{ formNumber?: string }> = ({ formNumber }) => (
  <div className="header">
    <div className="ministry">BỘ Y TẾ</div>
    <div className="hospital-name">{HOSPITAL_NAME}</div>
    <div style={{ fontSize: 11 }}>{HOSPITAL_ADDRESS} - ĐT: {HOSPITAL_PHONE}</div>
    {formNumber && <div className="form-number">Mẫu số: {formNumber}</div>}
  </div>
);

// Signature Block
const SignatureBlock: React.FC<{ leftTitle: string; rightTitle: string; date?: Date }> = ({ leftTitle, rightTitle, date }) => (
  <div className="signature-row">
    <div className="sig">
      <div className="sig-title">{leftTitle}</div>
      <div className="sig-date">(Ký, ghi rõ họ tên)</div>
    </div>
    <div className="sig">
      <div className="sig-date">
        {date ? `Ngày ${dayjs(date).format('DD')} tháng ${dayjs(date).format('MM')} năm ${dayjs(date).format('YYYY')}` : ''}
      </div>
      <div className="sig-title">{rightTitle}</div>
      <div className="sig-date">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>
);

// Field row
const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="field">
    <span className="field-label">{label}: </span>
    <span className="field-value">{value ?? '...........................'}</span>
  </div>
);

// ===========================
// 1. TOM TAT BENH AN (Medical Record Summary)
// ===========================
interface MedicalRecordSummaryProps {
  record: MedicalRecordFullDto;
  admissionDate?: string;
  dischargeDate?: string;
  departmentName?: string;
  doctorName?: string;
  treatmentSummary?: string;
  proceduresSummary?: string;
  dischargeCondition?: string;
  followUpInstructions?: string;
}

export const MedicalRecordSummaryPrint = forwardRef<HTMLDivElement, MedicalRecordSummaryProps>(
  ({ record, admissionDate, dischargeDate, departmentName, doctorName, treatmentSummary, proceduresSummary, dischargeCondition, followUpInstructions }, ref) => {
    const p = record.patient;
    const vs = record.vitalSigns;
    const iv = record.interview;
    const pe = record.physicalExam;
    const primaryDiag = record.diagnoses?.find(d => d.diagnosisType === 1);

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 01/BV" />
        <h2>TÓM TẮT BỆNH ÁN</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Giới tính" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã bệnh nhân" value={p?.patientCode} /></div>
            <div className="col"><Field label="Mã hồ sơ" value={record.medicalRecordCode} /></div>
          </div>
          <Field label="Địa chỉ" value={p?.address} />
          <div className="row">
            <div className="col"><Field label="Nghề nghiệp" value={p?.occupation} /></div>
            <div className="col"><Field label="Số điện thoại" value={p?.phoneNumber} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Ngày vào viện" value={admissionDate ? dayjs(admissionDate).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Ngày ra viện" value={dischargeDate ? dayjs(dischargeDate).format('DD/MM/YYYY') : undefined} /></div>
          </div>
          <Field label="Khoa điều trị" value={departmentName} />
        </div>

        <div className="section">
          <div className="section-title">I. QUÁ TRÌNH BỆNH LÝ VÀ DIỄN BIẾN LÂM SÀNG</div>
          <Field label="1. Lý do vào viện" value={iv?.chiefComplaint} />
          <Field label="2. Quá trình bệnh lý" value={iv?.historyOfPresentIllness} />
          <Field label="3. Tiền sử bản thân" value={iv?.pastMedicalHistory} />
          <Field label="4. Tiền sử gia đình" value={iv?.familyHistory} />
        </div>

        <div className="section">
          <div className="section-title">II. KHÁM LÂM SÀNG</div>
          {vs && (
            <div className="row">
              <div className="col"><Field label="Mạch" value={vs.pulse ? `${vs.pulse} l/ph` : undefined} /></div>
              <div className="col"><Field label="Nhiệt độ" value={vs.temperature ? `${vs.temperature}°C` : undefined} /></div>
              <div className="col"><Field label="HA" value={vs.systolicBp ? `${vs.systolicBp}/${vs.diastolicBp} mmHg` : undefined} /></div>
              <div className="col"><Field label="Cân nặng" value={vs.weight ? `${vs.weight} kg` : undefined} /></div>
            </div>
          )}
          {pe?.general && <Field label="Toàn thân" value={pe.general} />}
          {pe?.cardiovascular && <Field label="Tim mạch" value={pe.cardiovascular} />}
          {pe?.respiratory && <Field label="Hô hấp" value={pe.respiratory} />}
          {pe?.gastrointestinal && <Field label="Tiêu hóa" value={pe.gastrointestinal} />}
          {pe?.neurological && <Field label="Thần kinh" value={pe.neurological} />}
          {pe?.musculoskeletal && <Field label="Cơ xương khớp" value={pe.musculoskeletal} />}
        </div>

        <div className="section">
          <div className="section-title">III. CHẨN ĐOÁN</div>
          <Field label="Chẩn đoán chính" value={primaryDiag ? `${primaryDiag.icdCode} - ${primaryDiag.icdName}` : undefined} />
          {record.diagnoses?.filter(d => d.diagnosisType !== 1).length > 0 && (
            <Field label="Chẩn đoán phụ" value={record.diagnoses.filter(d => d.diagnosisType !== 1).map(d => `${d.icdCode} - ${d.icdName}`).join('; ')} />
          )}
        </div>

        <div className="section">
          <div className="section-title">IV. PHƯƠNG PHÁP ĐIỀU TRỊ</div>
          <div style={{ minHeight: 60, padding: 4 }}>{treatmentSummary ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">V. THỦ THUẬT / PHẪU THUẬT</div>
          <div style={{ minHeight: 40, padding: 4 }}>{proceduresSummary ?? 'Không'}</div>
        </div>

        <div className="section">
          <div className="section-title">VI. TÌNH TRẠNG RA VIỆN</div>
          <Field label="Tình trạng" value={dischargeCondition} />
          <Field label="Hướng điều trị tiếp" value={followUpInstructions} />
        </div>

        <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={new Date()} />
      </div>
    );
  }
);
MedicalRecordSummaryPrint.displayName = 'MedicalRecordSummaryPrint';

// ===========================
// 2. PHIEU DIEU TRI (Treatment Sheet)
// ===========================
interface TreatmentSheetPrintProps {
  record: MedicalRecordFullDto;
  sheets: TreatmentSheetDto[];
}

export const TreatmentSheetPrint = forwardRef<HTMLDivElement, TreatmentSheetPrintProps>(
  ({ record, sheets }, ref) => {
    const p = record.patient;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 02/BV" />
        <h2>TỜ ĐIỀU TRỊ</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã BN" value={p?.patientCode} /></div>
            <div className="col"><Field label="Mã HSBA" value={record.medicalRecordCode} /></div>
          </div>
          <Field label="Chẩn đoán" value={record.diagnoses?.[0] ? `${record.diagnoses[0].icdCode} - ${record.diagnoses[0].icdName}` : undefined} />
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>Ngày thứ</th>
              <th style={{ width: 90 }}>Ngày</th>
              <th>Diễn biến bệnh</th>
              <th>Y lệnh điều trị</th>
              <th style={{ width: 100 }}>BS điều trị</th>
            </tr>
          </thead>
          <tbody>
            {sheets.length > 0 ? sheets.map(s => (
              <tr key={s.id}>
                <td style={{ textAlign: 'center' }}>{s.dayNumber}</td>
                <td>{dayjs(s.treatmentDate).format('DD/MM/YYYY')}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.dailyProgress ?? ''}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.treatmentOrders ?? ''}</td>
                <td>{s.doctorName ?? ''}</td>
              </tr>
            )) : (
              <tr><td colSpan={5} style={{ height: 200, verticalAlign: 'top' }}>&nbsp;</td></tr>
            )}
          </tbody>
        </table>

        <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={new Date()} />
      </div>
    );
  }
);
TreatmentSheetPrint.displayName = 'TreatmentSheetPrint';

// ===========================
// 3. BIEN BAN HOI CHAN (Consultation Minutes)
// ===========================
interface ConsultationPrintProps {
  record: MedicalRecordFullDto;
  consultation: ConsultationRecordDto;
}

export const ConsultationPrint = forwardRef<HTMLDivElement, ConsultationPrintProps>(
  ({ record, consultation }, ref) => {
    const p = record.patient;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 03/BV" />
        <h2>BIÊN BẢN HỘI CHẨN</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên BN" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã BN" value={p?.patientCode} /></div>
            <div className="col"><Field label="Ngày hội chẩn" value={dayjs(consultation.consultationDate).format('DD/MM/YYYY')} /></div>
          </div>
        </div>

        <div className="section">
          <h3>I. LÝ DO HỘI CHẨN</h3>
          <div style={{ padding: '4px 0', minHeight: 40 }}>{consultation.reason}</div>
        </div>

        <div className="section">
          <h3>II. TÓM TẮT BỆNH ÁN</h3>
          <div style={{ padding: '4px 0', minHeight: 80 }}>{consultation.summary}</div>
        </div>

        <div className="section">
          <h3>III. KẾT LUẬN HỘI CHẨN</h3>
          <div style={{ padding: '4px 0', minHeight: 60 }}>{consultation.conclusion}</div>
        </div>

        <div className="section">
          <h3>IV. HƯỚNG XỬ TRÍ</h3>
          <div style={{ padding: '4px 0', minHeight: 60 }}>{consultation.recommendations}</div>
        </div>

        {consultation.consultants?.length > 0 && (
          <div className="section">
            <h3>V. THÀNH PHẦN THAM DỰ</h3>
            <table>
              <thead>
                <tr><th>STT</th><th>Họ tên</th><th>Chức danh</th></tr>
              </thead>
              <tbody>
                {consultation.consultants.map((c, i) => (
                  <tr key={c.doctorId}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>{c.doctorName}</td>
                    <td>{c.specialty ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="signature-row" style={{ marginTop: 32 }}>
          <div className="sig">
            <div className="sig-title">THƯ KÝ</div>
            <div className="sig-date">(Ký, ghi rõ họ tên)</div>
            <div style={{ marginTop: 40 }}>{consultation.secretary ?? ''}</div>
          </div>
          <div className="sig">
            <div className="sig-title">CHỦ TỌA HỘI CHẨN</div>
            <div className="sig-date">(Ký, ghi rõ họ tên)</div>
            <div style={{ marginTop: 40 }}>{consultation.chairman ?? ''}</div>
          </div>
        </div>
      </div>
    );
  }
);
ConsultationPrint.displayName = 'ConsultationPrint';

// ===========================
// 4. GIAY RA VIEN (Discharge Certificate)
// ===========================
interface DischargeCertificateProps {
  patientName: string;
  patientCode: string;
  gender: number;
  age: number;
  address?: string;
  admissionDate: string;
  dischargeDate: string;
  departmentName: string;
  doctorName: string;
  admissionDiagnosis?: string;
  dischargeDiagnosis?: string;
  treatmentSummary?: string;
  dischargeCondition: string;
  dischargeInstructions?: string;
  followUpDate?: string;
  daysOfStay: number;
}

export const DischargeCertificatePrint = forwardRef<HTMLDivElement, DischargeCertificateProps>(
  (props, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS. 04/BV" />
      <h2>GIẤY RA VIỆN</h2>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={props.patientName} /></div>
          <div className="col"><Field label="Tuổi" value={props.age} /></div>
          <div className="col"><Field label="Giới" value={props.gender === 1 ? 'Nam' : 'Nữ'} /></div>
        </div>
        <Field label="Mã bệnh nhân" value={props.patientCode} />
        <Field label="Địa chỉ" value={props.address} />
      </div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Ngày vào viện" value={dayjs(props.admissionDate).format('DD/MM/YYYY')} /></div>
          <div className="col"><Field label="Ngày ra viện" value={dayjs(props.dischargeDate).format('DD/MM/YYYY')} /></div>
          <div className="col"><Field label="Số ngày điều trị" value={props.daysOfStay} /></div>
        </div>
        <Field label="Khoa điều trị" value={props.departmentName} />
        <Field label="Bác sĩ điều trị" value={props.doctorName} />
      </div>

      <div className="section">
        <h3>CHẨN ĐOÁN</h3>
        <Field label="Khi vào viện" value={props.admissionDiagnosis} />
        <Field label="Khi ra viện" value={props.dischargeDiagnosis} />
      </div>

      <div className="section">
        <h3>PHƯƠNG PHÁP ĐIỀU TRỊ</h3>
        <div style={{ minHeight: 60, padding: 4 }}>{props.treatmentSummary ?? '...'}</div>
      </div>

      <div className="section">
        <h3>TÌNH TRẠNG NGƯỜI BỆNH RA VIỆN</h3>
        <Field label="Tình trạng" value={props.dischargeCondition} />
      </div>

      <div className="section">
        <h3>HƯỚNG ĐIỀU TRỊ VÀ CÁC CHẾ ĐỘ TIẾP THEO</h3>
        <div style={{ minHeight: 40, padding: 4 }}>{props.dischargeInstructions ?? '...'}</div>
        {props.followUpDate && <Field label="Ngày tái khám" value={dayjs(props.followUpDate).format('DD/MM/YYYY')} />}
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={new Date()} />
    </div>
  )
);
DischargeCertificatePrint.displayName = 'DischargeCertificatePrint';

// ===========================
// 5. PHIEU CHAM SOC (Nursing Care Sheet)
// ===========================
interface NursingCarePrintProps {
  record: MedicalRecordFullDto;
  sheets: NursingCareSheetDto[];
}

export const NursingCarePrint = forwardRef<HTMLDivElement, NursingCarePrintProps>(
  ({ record, sheets }, ref) => {
    const p = record.patient;
    const shiftName = (s: number) => s === 1 ? 'Sáng' : s === 2 ? 'Chiều' : 'Đêm';

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 05/BV" />
        <h2>PHIẾU CHĂM SÓC ĐIỀU DƯỠNG</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <Field label="Mã BN" value={p?.patientCode} />
          <Field label="Chẩn đoán" value={record.diagnoses?.[0] ? `${record.diagnoses[0].icdCode} - ${record.diagnoses[0].icdName}` : undefined} />
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 90 }}>Ngày</th>
              <th style={{ width: 50 }}>Ca</th>
              <th>Tình trạng BN</th>
              <th>Nhận định ĐD</th>
              <th>Can thiệp ĐD</th>
              <th>Đáp ứng BN</th>
              <th style={{ width: 80 }}>ĐD thực hiện</th>
            </tr>
          </thead>
          <tbody>
            {sheets.length > 0 ? sheets.map(s => (
              <tr key={s.id}>
                <td>{dayjs(s.careDate).format('DD/MM/YYYY')}</td>
                <td style={{ textAlign: 'center' }}>{shiftName(s.shift)}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.patientCondition ?? ''}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.nursingAssessment ?? ''}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.nursingInterventions ?? ''}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.patientResponse ?? ''}</td>
                <td>{s.nurseName ?? ''}</td>
              </tr>
            )) : (
              <tr><td colSpan={7} style={{ height: 200, verticalAlign: 'top' }}>&nbsp;</td></tr>
            )}
          </tbody>
        </table>

        <SignatureBlock leftTitle="ĐIỀU DƯỠNG TRƯỞNG" rightTitle="ĐIỀU DƯỠNG THỰC HIỆN" date={new Date()} />
      </div>
    );
  }
);
NursingCarePrint.displayName = 'NursingCarePrint';

// ===========================
// 6. PHIEU KHAM TIEN ME (Pre-Anesthetic Examination)
// ===========================
interface PreAnestheticExamProps {
  record: MedicalRecordFullDto;
  asaClassification?: number;
  mallampatiScore?: number;
  airwayAssessment?: string;
  anesthesiaType?: string;
  anesthesiaPlan?: string;
  risks?: string;
  preOpInstructions?: string;
  anesthesiologistName?: string;
}

export const PreAnestheticExamPrint = forwardRef<HTMLDivElement, PreAnestheticExamProps>(
  ({ record, asaClassification, mallampatiScore, airwayAssessment, anesthesiaType, anesthesiaPlan, risks, preOpInstructions, anesthesiologistName }, ref) => {
    const p = record.patient;
    const vs = record.vitalSigns;
    const iv = record.interview;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 06/BV" />
        <h2>PHIẾU KHÁM TIỀN MÊ</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã BN" value={p?.patientCode} /></div>
            <div className="col"><Field label="Mã HSBA" value={record.medicalRecordCode} /></div>
          </div>
          <Field label="Chẩn đoán" value={record.diagnoses?.[0] ? `${record.diagnoses[0].icdCode} - ${record.diagnoses[0].icdName}` : undefined} />
        </div>

        <div className="section">
          <div className="section-title">I. TIỀN SỬ</div>
          <Field label="Tiền sử bệnh" value={iv?.pastMedicalHistory} />
          <Field label="Tiền sử dị ứng" value={record.allergies?.map(a => a.allergenName).join(', ') || 'Không'} />
          <Field label="Tiền sử phẫu thuật / gây mê" value={iv?.surgicalHistory} />
          <Field label="Thuốc đang dùng" value={iv?.currentMedications} />
        </div>

        <div className="section">
          <div className="section-title">II. KHÁM HIỆN TẠI</div>
          {vs && (
            <>
              <div className="row">
                <div className="col"><Field label="Mạch" value={vs.pulse ? `${vs.pulse} l/ph` : undefined} /></div>
                <div className="col"><Field label="HA" value={vs.systolicBp ? `${vs.systolicBp}/${vs.diastolicBp} mmHg` : undefined} /></div>
                <div className="col"><Field label="Nhiệt độ" value={vs.temperature ? `${vs.temperature}°C` : undefined} /></div>
              </div>
              <div className="row">
                <div className="col"><Field label="Cân nặng" value={vs.weight ? `${vs.weight} kg` : undefined} /></div>
                <div className="col"><Field label="Chiều cao" value={vs.height ? `${vs.height} cm` : undefined} /></div>
                <div className="col"><Field label="SpO2" value={vs.spo2 ? `${vs.spo2}%` : undefined} /></div>
              </div>
            </>
          )}
        </div>

        <div className="section">
          <div className="section-title">III. ĐÁNH GIÁ GÂY MÊ</div>
          <Field label="Phân loại ASA" value={asaClassification ? `ASA ${asaClassification}` : undefined} />
          <Field label="Mallampati" value={mallampatiScore ? `Độ ${mallampatiScore}` : undefined} />
          <Field label="Đánh giá đường thở" value={airwayAssessment} />
        </div>

        <div className="section">
          <div className="section-title">IV. KẾ HOẠCH GÂY MÊ</div>
          <Field label="Phương pháp vô cảm" value={anesthesiaType} />
          <Field label="Kế hoạch gây mê" value={anesthesiaPlan} />
          <Field label="Nguy cơ" value={risks} />
        </div>

        <div className="section">
          <div className="section-title">V. CHỈ DẪN TRƯỚC MỔ</div>
          <div style={{ minHeight: 60, padding: 4 }}>{preOpInstructions ?? 'Nhịn ăn uống trước mổ 6-8 giờ. Tháo trang sức, răng giả. Thụt tháo nếu cần.'}</div>
        </div>

        <SignatureBlock leftTitle="BÁC SĨ GÂY MÊ" rightTitle="TRƯỞNG KHOA GÂY MÊ" date={new Date()} />
      </div>
    );
  }
);
PreAnestheticExamPrint.displayName = 'PreAnestheticExamPrint';

// ===========================
// 7. CAM KET PHAU THUAT (Surgery Consent Form)
// ===========================
interface SurgeryConsentProps {
  patientName: string;
  patientCode: string;
  gender: number;
  age: number;
  address?: string;
  diagnosisName?: string;
  procedureName?: string;
  surgeonName?: string;
  anesthesiaType?: string;
  risksExplained?: string;
  alternatives?: string;
  familyName?: string;
  familyRelationship?: string;
}

export const SurgeryConsentPrint = forwardRef<HTMLDivElement, SurgeryConsentProps>(
  (props, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS. 07/BV" />
      <h2>GIẤY CAM KẾT PHẪU THUẬT / THỦ THUẬT</h2>

      <div className="section" style={{ lineHeight: 2 }}>
        <p>Tôi tên là: <span className="field-value">{props.familyName ?? '...........................'}</span></p>
        <p>Quan hệ với người bệnh: <span className="field-value">{props.familyRelationship ?? '...........................'}</span></p>
        <p>Là thân nhân của người bệnh: <span className="field-value">{props.patientName}</span></p>
        <div className="row">
          <div className="col"><Field label="Tuổi" value={props.age} /></div>
          <div className="col"><Field label="Giới" value={props.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          <div className="col"><Field label="Mã BN" value={props.patientCode} /></div>
        </div>
        <Field label="Địa chỉ" value={props.address} />
      </div>

      <div className="section" style={{ lineHeight: 2 }}>
        <p>Sau khi được Bác sĩ <span className="field-value">{props.surgeonName ?? '...........................'}</span> giải thích rõ về:</p>
        <p><strong>1. Chẩn đoán bệnh:</strong> <span className="field-value">{props.diagnosisName ?? '...........................'}</span></p>
        <p><strong>2. Phương pháp phẫu thuật/thủ thuật:</strong> <span className="field-value">{props.procedureName ?? '...........................'}</span></p>
        <p><strong>3. Phương pháp vô cảm:</strong> <span className="field-value">{props.anesthesiaType ?? '...........................'}</span></p>
        <p><strong>4. Các nguy cơ, tai biến có thể xảy ra:</strong></p>
        <div style={{ minHeight: 60, padding: '0 16px' }}>{props.risksExplained ?? '- Chảy máu trong và sau mổ\n- Nhiễm trùng vết mổ\n- Tai biến do gây mê/tê\n- Các biến chứng khác liên quan'}</div>
        <p><strong>5. Các phương pháp điều trị thay thế:</strong></p>
        <div style={{ minHeight: 40, padding: '0 16px' }}>{props.alternatives ?? '...'}</div>
      </div>

      <div className="section" style={{ lineHeight: 2 }}>
        <p>Tôi đã hiểu rõ và đồng ý cho người bệnh được phẫu thuật/thủ thuật theo phương pháp nêu trên.</p>
        <p>Tôi cam kết sẽ phối hợp và thực hiện đúng theo hướng dẫn của bác sĩ trong quá trình điều trị.</p>
      </div>

      <div className="signature-row" style={{ marginTop: 24 }}>
        <div className="sig">
          <div className="sig-title">NGƯỜI BỆNH / THÂN NHÂN</div>
          <div className="sig-date">(Ký, ghi rõ họ tên)</div>
        </div>
        <div className="sig">
          <div className="sig-date">
            Ngày {dayjs().format('DD')} tháng {dayjs().format('MM')} năm {dayjs().format('YYYY')}
          </div>
          <div className="sig-title">BÁC SĨ GIẢI THÍCH</div>
          <div className="sig-date">(Ký, ghi rõ họ tên)</div>
        </div>
      </div>
    </div>
  )
);
SurgeryConsentPrint.displayName = 'SurgeryConsentPrint';

// ===========================
// 8. PHIEU SO KET 15 NGAY DIEU TRI (Treatment Progress Note)
// ===========================
interface TreatmentProgressNoteProps {
  record: MedicalRecordFullDto;
  periodFrom?: string;
  periodTo?: string;
  dayCount?: number;
  admissionDate?: string;
  departmentName?: string;
  clinicalProgress?: string;
  labResults?: string;
  imagingResults?: string;
  currentTreatment?: string;
  treatmentResponse?: string;
  currentCondition?: string;
  nextPlan?: string;
  prognosis?: string;
  doctorName?: string;
}

export const TreatmentProgressNotePrint = forwardRef<HTMLDivElement, TreatmentProgressNoteProps>(
  ({ record, periodFrom, periodTo, dayCount, admissionDate, departmentName, clinicalProgress, labResults, imagingResults, currentTreatment, treatmentResponse, currentCondition, nextPlan, prognosis, doctorName }, ref) => {
    const p = record.patient;
    const vs = record.vitalSigns;
    const primaryDiag = record.diagnoses?.find(d => d.diagnosisType === 1);

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 08/BV" />
        <h2>PHIẾU SƠ KẾT 15 NGÀY ĐIỀU TRỊ</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã BN" value={p?.patientCode} /></div>
            <div className="col"><Field label="Khoa" value={departmentName} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Ngày vào viện" value={admissionDate ? dayjs(admissionDate).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Ngày điều trị thứ" value={dayCount} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Từ ngày" value={periodFrom ? dayjs(periodFrom).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Đến ngày" value={periodTo ? dayjs(periodTo).format('DD/MM/YYYY') : undefined} /></div>
          </div>
          <Field label="Chẩn đoán" value={primaryDiag ? `${primaryDiag.icdCode} - ${primaryDiag.icdName}` : undefined} />
        </div>

        <div className="section">
          <div className="section-title">I. DIỄN BIẾN LÂM SÀNG</div>
          {vs && (
            <div className="row" style={{ marginBottom: 8 }}>
              <div className="col"><Field label="Mạch" value={vs.pulse ? `${vs.pulse} l/ph` : undefined} /></div>
              <div className="col"><Field label="HA" value={vs.systolicBp ? `${vs.systolicBp}/${vs.diastolicBp}` : undefined} /></div>
              <div className="col"><Field label="Nhiệt độ" value={vs.temperature ? `${vs.temperature}°C` : undefined} /></div>
            </div>
          )}
          <div style={{ minHeight: 80, padding: 4 }}>{clinicalProgress ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">II. KẾT QUẢ CẬN LÂM SÀNG</div>
          <Field label="Xét nghiệm" value={labResults} />
          <Field label="Chẩn đoán hình ảnh" value={imagingResults} />
        </div>

        <div className="section">
          <div className="section-title">III. ĐIỀU TRỊ ĐÃ THỰC HIỆN</div>
          <div style={{ minHeight: 60, padding: 4 }}>{currentTreatment ?? '...'}</div>
          <Field label="Đáp ứng điều trị" value={treatmentResponse} />
        </div>

        <div className="section">
          <div className="section-title">IV. TÌNH TRẠNG HIỆN TẠI</div>
          <div style={{ minHeight: 40, padding: 4 }}>{currentCondition ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">V. HƯỚNG ĐIỀU TRỊ TIẾP</div>
          <div style={{ minHeight: 40, padding: 4 }}>{nextPlan ?? '...'}</div>
          <Field label="Tiên lượng" value={prognosis} />
        </div>

        <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={new Date()} />
      </div>
    );
  }
);
TreatmentProgressNotePrint.displayName = 'TreatmentProgressNotePrint';

// ===========================
// 9. PHIEU TU VAN (Counseling / Advisory Form)
// ===========================
interface CounselingFormProps {
  record: MedicalRecordFullDto;
  counselingTopic?: string;
  counselingContent?: string;
  patientQuestions?: string;
  patientUnderstanding?: string;
  counselorName?: string;
  counselorTitle?: string;
}

export const CounselingFormPrint = forwardRef<HTMLDivElement, CounselingFormProps>(
  ({ record, counselingTopic, counselingContent, patientQuestions, patientUnderstanding, counselorName, counselorTitle }, ref) => {
    const p = record.patient;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 09/BV" />
        <h2>PHIẾU TƯ VẤN NGƯỜI BỆNH</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã BN" value={p?.patientCode} /></div>
            <div className="col"><Field label="Mã HSBA" value={record.medicalRecordCode} /></div>
          </div>
          <Field label="Chẩn đoán" value={record.diagnoses?.[0] ? `${record.diagnoses[0].icdCode} - ${record.diagnoses[0].icdName}` : undefined} />
        </div>

        <div className="section">
          <div className="section-title">I. NỘI DUNG TƯ VẤN</div>
          <Field label="Chủ đề tư vấn" value={counselingTopic} />
          <div style={{ minHeight: 120, padding: 4, marginTop: 8 }}>{counselingContent ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">II. CÂU HỎI CỦA NGƯỜI BỆNH / THÂN NHÂN</div>
          <div style={{ minHeight: 60, padding: 4 }}>{patientQuestions ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">III. MỨC ĐỘ HIỂU BIẾT CỦA NGƯỜI BỆNH</div>
          <div style={{ padding: 4 }}>
            {patientUnderstanding ?? (
              <>
                <div>☐ Hiểu rõ hoàn toàn</div>
                <div>☐ Hiểu cơ bản</div>
                <div>☐ Cần tư vấn thêm</div>
                <div>☐ Không hiểu / cần phiên dịch</div>
              </>
            )}
          </div>
        </div>

        <div className="signature-row" style={{ marginTop: 24 }}>
          <div className="sig">
            <div className="sig-title">NGƯỜI BỆNH / THÂN NHÂN</div>
            <div className="sig-date">(Ký, ghi rõ họ tên)</div>
          </div>
          <div className="sig">
            <div className="sig-date">
              Ngày {dayjs().format('DD')} tháng {dayjs().format('MM')} năm {dayjs().format('YYYY')}
            </div>
            <div className="sig-title">NGƯỜI TƯ VẤN</div>
            <div className="sig-date">{counselorTitle ?? '(Ký, ghi rõ họ tên, chức danh)'}</div>
          </div>
        </div>
      </div>
    );
  }
);
CounselingFormPrint.displayName = 'CounselingFormPrint';

// ===========================
// 10. KIEM DIEM TU VONG (Death Review Form)
// ===========================
interface DeathReviewProps {
  record: MedicalRecordFullDto;
  admissionDate?: string;
  deathDate?: string;
  departmentName?: string;
  admissionDiagnosis?: string;
  finalDiagnosis?: string;
  causeOfDeath?: string;
  treatmentTimeline?: string;
  reviewFindings?: string;
  lessonsLearned?: string;
  preventionMeasures?: string;
  committeeMembers?: Array<{ name: string; title: string }>;
  chairmanName?: string;
}

export const DeathReviewPrint = forwardRef<HTMLDivElement, DeathReviewProps>(
  ({ record, admissionDate, deathDate, departmentName, admissionDiagnosis, finalDiagnosis, causeOfDeath, treatmentTimeline, reviewFindings, lessonsLearned, preventionMeasures, committeeMembers, chairmanName }, ref) => {
    const p = record.patient;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 10/BV" />
        <h2>BIÊN BẢN KIỂM ĐIỂM TỬ VONG</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên BN" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã BN" value={p?.patientCode} /></div>
            <div className="col"><Field label="Khoa" value={departmentName} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Ngày vào viện" value={admissionDate ? dayjs(admissionDate).format('DD/MM/YYYY HH:mm') : undefined} /></div>
            <div className="col"><Field label="Ngày tử vong" value={deathDate ? dayjs(deathDate).format('DD/MM/YYYY HH:mm') : undefined} /></div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">I. CHẨN ĐOÁN</div>
          <Field label="Chẩn đoán lúc vào viện" value={admissionDiagnosis} />
          <Field label="Chẩn đoán cuối cùng" value={finalDiagnosis ?? record.diagnoses?.[0]?.icdName} />
          <Field label="Nguyên nhân tử vong" value={causeOfDeath} />
        </div>

        <div className="section">
          <div className="section-title">II. TÓM TẮT QUÁ TRÌNH ĐIỀU TRỊ</div>
          <div style={{ minHeight: 100, padding: 4 }}>{treatmentTimeline ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">III. NHẬN XÉT</div>
          <div style={{ minHeight: 80, padding: 4 }}>{reviewFindings ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">IV. BÀI HỌC KINH NGHIỆM</div>
          <div style={{ minHeight: 60, padding: 4 }}>{lessonsLearned ?? '...'}</div>
          <Field label="Biện pháp phòng tránh" value={preventionMeasures} />
        </div>

        {committeeMembers && committeeMembers.length > 0 && (
          <div className="section">
            <div className="section-title">V. THÀNH PHẦN THAM DỰ</div>
            <table>
              <thead>
                <tr><th>STT</th><th>Họ tên</th><th>Chức danh</th><th>Ký tên</th></tr>
              </thead>
              <tbody>
                {committeeMembers.map((m, i) => (
                  <tr key={m.name}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>{m.name}</td>
                    <td>{m.title}</td>
                    <td style={{ width: 120 }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <SignatureBlock leftTitle="THƯ KÝ" rightTitle="CHỦ TỌA HỘI ĐỒNG" date={new Date()} />
      </div>
    );
  }
);
DeathReviewPrint.displayName = 'DeathReviewPrint';

// ===========================
// 11. TONG KET HO SO BENH AN (Medical Record Final Summary)
// ===========================
interface MedicalRecordFinalSummaryProps {
  record: MedicalRecordFullDto;
  admissionDate?: string;
  dischargeDate?: string;
  departmentName?: string;
  bedNumber?: string;
  admissionDiagnosis?: string;
  treatmentHistory?: string;
  surgeryHistory?: string;
  labSummary?: string;
  imagingSummary?: string;
  treatmentPlan?: string;
  treatmentResult?: 'Khỏi' | 'Đỡ, giảm' | 'Không thay đổi' | 'Nặng hơn' | 'Tử vong';
  dischargeCondition?: string;
  dischargeInstructions?: string;
  followUpDate?: string;
  attendingDoctorName?: string;
  headOfDepartmentName?: string;
}

export const MedicalRecordFinalSummaryPrint = forwardRef<HTMLDivElement, MedicalRecordFinalSummaryProps>(
  ({ record, admissionDate, dischargeDate, departmentName, bedNumber, admissionDiagnosis, treatmentHistory, surgeryHistory, labSummary, imagingSummary, treatmentPlan, treatmentResult, dischargeCondition, dischargeInstructions, followUpDate, attendingDoctorName, headOfDepartmentName }, ref) => {
    const p = record.patient;
    const vs = record.vitalSigns;
    const iv = record.interview;
    const pe = record.physicalExam;
    const primaryDiag = record.diagnoses?.find(d => d.diagnosisType === 1);
    const resultOptions = ['Khỏi', 'Đỡ, giảm', 'Không thay đổi', 'Nặng hơn', 'Tử vong'];

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 11/BV" />
        <h2>TỔNG KẾT HỒ SƠ BỆNH ÁN</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã BN" value={p?.patientCode} /></div>
            <div className="col"><Field label="Mã HSBA" value={record.medicalRecordCode} /></div>
          </div>
          <Field label="Địa chỉ" value={p?.address} />
          <div className="row">
            <div className="col"><Field label="Ngày vào viện" value={admissionDate ? dayjs(admissionDate).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Ngày ra viện" value={dischargeDate ? dayjs(dischargeDate).format('DD/MM/YYYY') : undefined} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Khoa" value={departmentName} /></div>
            <div className="col"><Field label="Giường" value={bedNumber} /></div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">I. CHẨN ĐOÁN</div>
          <Field label="Khi vào viện" value={admissionDiagnosis} />
          <Field label="Khi ra viện" value={primaryDiag ? `${primaryDiag.icdCode} - ${primaryDiag.icdName}` : undefined} />
          {record.diagnoses?.filter(d => d.diagnosisType !== 1).length > 0 && (
            <Field label="Bệnh kèm theo" value={record.diagnoses.filter(d => d.diagnosisType !== 1).map(d => `${d.icdCode} - ${d.icdName}`).join('; ')} />
          )}
        </div>

        <div className="section">
          <div className="section-title">II. QUÁ TRÌNH BỆNH LÝ VÀ DIỄN BIẾN LÂM SÀNG</div>
          <Field label="Lý do vào viện" value={iv?.chiefComplaint} />
          <Field label="Quá trình bệnh lý" value={iv?.historyOfPresentIllness} />
          <Field label="Tiền sử" value={iv?.pastMedicalHistory} />
          {vs && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 12 }}>Khám lúc vào viện:</strong>
              <div className="row">
                <div className="col"><Field label="Mạch" value={vs.pulse ? `${vs.pulse} l/ph` : undefined} /></div>
                <div className="col"><Field label="HA" value={vs.systolicBp ? `${vs.systolicBp}/${vs.diastolicBp}` : undefined} /></div>
                <div className="col"><Field label="Nhiệt độ" value={vs.temperature ? `${vs.temperature}°C` : undefined} /></div>
                <div className="col"><Field label="CN" value={vs.weight ? `${vs.weight}kg` : undefined} /></div>
              </div>
            </div>
          )}
          {pe?.general && <Field label="Khám toàn thân" value={pe.general} />}
        </div>

        <div className="section">
          <div className="section-title">III. KẾT QUẢ CẬN LÂM SÀNG CHỦ YẾU</div>
          <Field label="Xét nghiệm" value={labSummary} />
          <Field label="Chẩn đoán hình ảnh" value={imagingSummary} />
        </div>

        <div className="section">
          <div className="section-title">IV. PHƯƠNG PHÁP ĐIỀU TRỊ</div>
          <div style={{ minHeight: 60, padding: 4 }}>{treatmentPlan ?? '...'}</div>
          {surgeryHistory && <Field label="Phẫu thuật / thủ thuật" value={surgeryHistory} />}
        </div>

        <div className="section">
          <div className="section-title">V. TÌNH TRẠNG NGƯỜI BỆNH RA VIỆN</div>
          <div style={{ padding: '4px 0' }}>
            <strong>Kết quả điều trị: </strong>
            {resultOptions.map(opt => (
              <span key={opt} style={{ marginRight: 16 }}>
                {treatmentResult === opt ? '☑' : '☐'} {opt}
              </span>
            ))}
          </div>
          <Field label="Tình trạng ra viện" value={dischargeCondition} />
        </div>

        <div className="section">
          <div className="section-title">VI. HƯỚNG ĐIỀU TRỊ VÀ CÁC CHẾ ĐỘ TIẾP THEO</div>
          <div style={{ minHeight: 40, padding: 4 }}>{dischargeInstructions ?? '...'}</div>
          {followUpDate && <Field label="Hẹn tái khám" value={dayjs(followUpDate).format('DD/MM/YYYY')} />}
        </div>

        <div className="signature-row" style={{ marginTop: 24 }}>
          <div className="sig">
            <div className="sig-title">TRƯỞNG KHOA</div>
            <div className="sig-date">(Ký, ghi rõ họ tên)</div>
            <div style={{ marginTop: 40 }}>{headOfDepartmentName ?? ''}</div>
          </div>
          <div className="sig">
            <div className="sig-date">
              Ngày {dayjs().format('DD')} tháng {dayjs().format('MM')} năm {dayjs().format('YYYY')}
            </div>
            <div className="sig-title">BÁC SĨ ĐIỀU TRỊ</div>
            <div className="sig-date">(Ký, ghi rõ họ tên)</div>
            <div style={{ marginTop: 40 }}>{attendingDoctorName ?? ''}</div>
          </div>
        </div>
      </div>
    );
  }
);
MedicalRecordFinalSummaryPrint.displayName = 'MedicalRecordFinalSummaryPrint';

// ============================================================
// MS. 12/BV - Phiếu khám dinh dưỡng (Nutrition Examination)
// ============================================================
interface NutritionExamProps { record?: MedicalRecordFullDto | null; }
export const NutritionExamPrint = forwardRef<HTMLDivElement, NutritionExamProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 12/BV" />
        <h2>PHIẾU KHÁM DINH DƯỠNG</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Khoa" value={record?.departmentName} /></div><div className="col"><Field label="Buồng" /></div><div className="col"><Field label="Giường" /></div></div>
          <Field label="Chẩn đoán" value={record?.mainDiagnosis} />
        </div>
        <div className="section">
          <div className="section-title">I. ĐÁNH GIÁ DINH DƯỠNG</div>
          <div className="row"><div className="col"><Field label="Chiều cao (cm)" /></div><div className="col"><Field label="Cân nặng (kg)" /></div><div className="col"><Field label="BMI" /></div></div>
          <Field label="Tình trạng dinh dưỡng" />
          <div style={{ margin: '4px 0' }}>□ Bình thường &nbsp; □ Suy dinh dưỡng nhẹ &nbsp; □ Suy dinh dưỡng vừa &nbsp; □ Suy dinh dưỡng nặng &nbsp; □ Thừa cân/Béo phì</div>
          <Field label="Albumin máu (g/dL)" />
          <Field label="Tiền sử ăn uống" />
          <Field label="Dị ứng thức ăn" />
          <Field label="Bệnh lý liên quan dinh dưỡng" />
        </div>
        <div className="section">
          <div className="section-title">II. NHU CẦU DINH DƯỠNG</div>
          <div className="row"><div className="col"><Field label="Năng lượng (kcal/ngày)" /></div><div className="col"><Field label="Protein (g/ngày)" /></div></div>
          <div className="row"><div className="col"><Field label="Lipid (g/ngày)" /></div><div className="col"><Field label="Glucid (g/ngày)" /></div></div>
          <Field label="Nước (ml/ngày)" />
          <Field label="Chế độ ăn chỉ định" />
          <div style={{ margin: '4px 0' }}>□ Ăn thường &nbsp; □ Ăn mềm &nbsp; □ Ăn lỏng &nbsp; □ Ăn qua sonde &nbsp; □ Nuôi dưỡng tĩnh mạch &nbsp; □ Khác: ............</div>
        </div>
        <div className="section">
          <div className="section-title">III. KẾ HOẠCH DINH DƯỠNG</div>
          <Field label="Mục tiêu" />
          <Field label="Thực đơn gợi ý" />
          <Field label="Lưu ý đặc biệt" />
          <Field label="Ngày tái đánh giá" />
        </div>
        <SignatureBlock leftTitle="ĐIỀU DƯỠNG DINH DƯỠNG" rightTitle="BÁC SĨ DINH DƯỠNG" date={new Date()} />
      </div>
    );
  }
);
NutritionExamPrint.displayName = 'NutritionExamPrint';

// ============================================================
// MS. 13/BV - Phiếu phẫu thuật / thủ thuật (Surgery Record)
// ============================================================
interface SurgeryRecordProps { record?: MedicalRecordFullDto | null; }
export const SurgeryRecordPrint = forwardRef<HTMLDivElement, SurgeryRecordProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 13/BV" />
        <h2>PHIẾU PHẪU THUẬT / THỦ THUẬT</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Mã BN" value={p?.patientCode} /></div><div className="col"><Field label="Khoa" value={record?.departmentName} /></div></div>
          <Field label="Chẩn đoán trước mổ" value={record?.mainDiagnosis} />
          <Field label="Chẩn đoán sau mổ" />
        </div>
        <div className="section">
          <div className="section-title">I. THÔNG TIN PHẪU THUẬT</div>
          <Field label="Tên phẫu thuật/thủ thuật" />
          <div className="row"><div className="col"><Field label="Ngày giờ bắt đầu" /></div><div className="col"><Field label="Ngày giờ kết thúc" /></div></div>
          <div className="row"><div className="col"><Field label="Phương pháp vô cảm" /></div><div className="col"><Field label="Loại PT" /></div></div>
          <div style={{ margin: '4px 0' }}>Phân loại: □ Cấp cứu &nbsp; □ Phiên &nbsp; | &nbsp; □ Đặc biệt &nbsp; □ Loại I &nbsp; □ Loại II &nbsp; □ Loại III</div>
        </div>
        <div className="section">
          <div className="section-title">II. KÍP PHẪU THUẬT</div>
          <div className="row"><div className="col"><Field label="Phẫu thuật viên chính" /></div><div className="col"><Field label="Phụ mổ 1" /></div></div>
          <div className="row"><div className="col"><Field label="Phụ mổ 2" /></div><div className="col"><Field label="Bác sĩ gây mê" /></div></div>
          <div className="row"><div className="col"><Field label="Dụng cụ viên" /></div><div className="col"><Field label="Chạy ngoài" /></div></div>
        </div>
        <div className="section">
          <div className="section-title">III. MÔ TẢ PHẪU THUẬT</div>
          <Field label="Tư thế bệnh nhân" />
          <Field label="Đường mổ" />
          <Field label="Mô tả tổn thương" />
          <Field label="Cách thức phẫu thuật" />
          <div style={{ minHeight: 80, border: '1px dotted #999', margin: '4px 0', padding: 4 }} />
          <Field label="Dẫn lưu" />
          <Field label="Bệnh phẩm gửi GPB" />
          <Field label="Lượng máu mất (ml)" />
          <Field label="Lượng máu truyền (ml)" />
        </div>
        <div className="section">
          <div className="section-title">IV. THEO DÕI SAU MỔ</div>
          <Field label="Huyết áp" /><Field label="Mạch" /><Field label="SpO2" />
          <Field label="Tình trạng sau mổ" />
          <Field label="Y lệnh sau mổ" />
        </div>
        <SignatureBlock leftTitle="PHẪU THUẬT VIÊN CHÍNH" rightTitle="BÁC SĨ GÂY MÊ" date={new Date()} />
      </div>
    );
  }
);
SurgeryRecordPrint.displayName = 'SurgeryRecordPrint';

// ============================================================
// MS. 14/BV - Phiếu duyệt phẫu thuật (Surgery Approval)
// ============================================================
interface SurgeryApprovalProps { record?: MedicalRecordFullDto | null; }
export const SurgeryApprovalPrint = forwardRef<HTMLDivElement, SurgeryApprovalProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 14/BV" />
        <h2>PHIẾU DUYỆT PHẪU THUẬT / THỦ THUẬT</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Mã BN" value={p?.patientCode} /></div><div className="col"><Field label="Khoa" value={record?.departmentName} /></div></div>
          <Field label="Chẩn đoán" value={record?.mainDiagnosis} />
        </div>
        <div className="section">
          <div className="section-title">I. ĐỀ NGHỊ PHẪU THUẬT</div>
          <Field label="Phẫu thuật viên đề nghị" />
          <Field label="Tên phẫu thuật/thủ thuật dự kiến" />
          <div style={{ margin: '4px 0' }}>Phân loại: □ Cấp cứu &nbsp; □ Phiên &nbsp; | &nbsp; □ Đặc biệt &nbsp; □ Loại I &nbsp; □ Loại II &nbsp; □ Loại III</div>
          <Field label="Phương pháp vô cảm dự kiến" />
          <Field label="Lý do phẫu thuật" />
          <Field label="Tình trạng bệnh nhân hiện tại" />
          <Field label="Kết quả CLS liên quan" />
        </div>
        <div className="section">
          <div className="section-title">II. Ý KIẾN HỘI CHẨN (nếu có)</div>
          <Field label="Ngày hội chẩn" />
          <Field label="Kết luận hội chẩn" />
        </div>
        <div className="section">
          <div className="section-title">III. DUYỆT PHẪU THUẬT</div>
          <div style={{ margin: '4px 0' }}>□ Đồng ý phẫu thuật/thủ thuật &nbsp; □ Không đồng ý</div>
          <Field label="Ý kiến" />
          <Field label="Yêu cầu bổ sung" />
        </div>
        <div className="signature-row">
          <div className="sig"><div className="sig-title">BS ĐỀ NGHỊ</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
          <div className="sig"><div className="sig-title">TRƯỞNG KHOA</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
          <div className="sig">
            <div className="sig-date">Ngày {dayjs().format('DD')} tháng {dayjs().format('MM')} năm {dayjs().format('YYYY')}</div>
            <div className="sig-title">GIÁM ĐỐC/PHÓ GĐ</div><div className="sig-date">(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </div>
    );
  }
);
SurgeryApprovalPrint.displayName = 'SurgeryApprovalPrint';

// ============================================================
// MS. 15/BV - Sơ kết phẫu thuật (Surgery Summary)
// ============================================================
interface SurgerySummaryProps { record?: MedicalRecordFullDto | null; }
export const SurgerySummaryPrint = forwardRef<HTMLDivElement, SurgerySummaryProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 15/BV" />
        <h2>SƠ KẾT PHẪU THUẬT / THỦ THUẬT</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Mã BN" value={p?.patientCode} /></div><div className="col"><Field label="Khoa" value={record?.departmentName} /></div></div>
          <Field label="Chẩn đoán trước mổ" value={record?.mainDiagnosis} />
        </div>
        <div className="section">
          <div className="section-title">I. TÓM TẮT PHẪU THUẬT</div>
          <Field label="Tên phẫu thuật đã thực hiện" />
          <div className="row"><div className="col"><Field label="Ngày mổ" /></div><div className="col"><Field label="Thời gian mổ (phút)" /></div></div>
          <Field label="Phẫu thuật viên chính" />
          <Field label="Phương pháp vô cảm" />
          <Field label="Chẩn đoán sau mổ" />
        </div>
        <div className="section">
          <div className="section-title">II. DIỄN BIẾN SAU MỔ</div>
          <table><thead><tr><th>Ngày</th><th>Thể trạng</th><th>Vết mổ</th><th>Dẫn lưu</th><th>Biến chứng</th><th>Xử trí</th></tr></thead>
          <tbody>{[1,2,3,4,5].map(i => <tr key={i}><td style={{height:24}}></td><td></td><td></td><td></td><td></td><td></td></tr>)}</tbody></table>
        </div>
        <div className="section">
          <div className="section-title">III. ĐÁNH GIÁ KẾT QUẢ</div>
          <div style={{ margin: '4px 0' }}>□ Tốt &nbsp; □ Khá &nbsp; □ Trung bình &nbsp; □ Xấu</div>
          <Field label="Nhận xét" />
          <Field label="Hướng điều trị tiếp theo" />
          <Field label="Bài học kinh nghiệm" />
        </div>
        <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="PHẪU THUẬT VIÊN CHÍNH" date={new Date()} />
      </div>
    );
  }
);
SurgerySummaryPrint.displayName = 'SurgerySummaryPrint';

// ============================================================
// MS. 16/BV - Phiếu bàn giao BN chuyển khoa (Department Transfer)
// ============================================================
interface DeptTransferProps { record?: MedicalRecordFullDto | null; }
export const DepartmentTransferPrint = forwardRef<HTMLDivElement, DeptTransferProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 16/BV" />
        <h2>PHIẾU BÀN GIAO NGƯỜI BỆNH CHUYỂN KHOA</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Mã BN" value={p?.patientCode} /></div><div className="col"><Field label="Số BHYT" value={p?.insuranceNumber} /></div></div>
          <div className="row"><div className="col"><Field label="Khoa chuyển" value={record?.departmentName} /></div><div className="col"><Field label="Khoa nhận" /></div></div>
          <div className="row"><div className="col"><Field label="Ngày giờ chuyển" /></div><div className="col"><Field label="Ngày giờ nhận" /></div></div>
        </div>
        <div className="section">
          <div className="section-title">I. TÌNH TRẠNG NGƯỜI BỆNH KHI CHUYỂN</div>
          <Field label="Chẩn đoán" value={record?.mainDiagnosis} />
          <Field label="Tóm tắt diễn biến bệnh" />
          <Field label="Điều trị đã thực hiện" />
          <div className="row"><div className="col"><Field label="Tri giác" /></div><div className="col"><Field label="Mạch" /></div><div className="col"><Field label="Huyết áp" /></div></div>
          <div className="row"><div className="col"><Field label="Nhiệt độ" /></div><div className="col"><Field label="Nhịp thở" /></div><div className="col"><Field label="SpO2" /></div></div>
          <Field label="Tình trạng đặc biệt cần lưu ý" />
        </div>
        <div className="section">
          <div className="section-title">II. CÁC VẬT DỤNG BÀN GIAO</div>
          <div style={{ margin: '4px 0' }}>□ Hồ sơ bệnh án &nbsp; □ Phim X-quang/CT &nbsp; □ Kết quả XN &nbsp; □ Thuốc đang dùng &nbsp; □ Dịch truyền &nbsp; □ Tư trang cá nhân</div>
          <Field label="Khác" />
        </div>
        <div className="section">
          <div className="section-title">III. LÝ DO CHUYỂN KHOA</div>
          <Field label="Lý do" />
          <Field label="Yêu cầu khoa nhận" />
        </div>
        <div className="signature-row">
          <div className="sig"><div className="sig-title">BÊN GIAO</div><div className="sig-date">BS: ............................</div><div className="sig-date">ĐD: ............................</div></div>
          <div className="sig"><div className="sig-title">BÊN NHẬN</div><div className="sig-date">BS: ............................</div><div className="sig-date">ĐD: ............................</div></div>
          <div className="sig"><div className="sig-title">NGƯỜI VẬN CHUYỂN</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
        </div>
      </div>
    );
  }
);
DepartmentTransferPrint.displayName = 'DepartmentTransferPrint';

// ============================================================
// MS. 17/BV - Phiếu khám vào viện (Admission Examination)
// ============================================================
interface AdmissionExamProps { record?: MedicalRecordFullDto | null; }
export const AdmissionExamPrint = forwardRef<HTMLDivElement, AdmissionExamProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 17/BV" />
        <h2>PHIẾU KHÁM VÀO VIỆN</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Nghề nghiệp" /></div><div className="col"><Field label="Dân tộc" /></div></div>
          <Field label="Địa chỉ" value={p?.address} />
          <div className="row"><div className="col"><Field label="Nơi giới thiệu" /></div><div className="col"><Field label="Ngày vào viện" /></div></div>
        </div>
        <div className="section">
          <div className="section-title">I. LÝ DO VÀO VIỆN</div>
          <Field label="Lý do" />
        </div>
        <div className="section">
          <div className="section-title">II. BỆNH SỬ</div>
          <Field label="Quá trình bệnh lý" />
          <div style={{ minHeight: 60, border: '1px dotted #999', margin: '4px 0', padding: 4 }} />
        </div>
        <div className="section">
          <div className="section-title">III. TIỀN SỬ</div>
          <Field label="Bản thân" />
          <Field label="Gia đình" />
          <Field label="Dị ứng" value={record?.allergies} />
        </div>
        <div className="section">
          <div className="section-title">IV. KHÁM LÂM SÀNG</div>
          <div className="row"><div className="col"><Field label="Mạch" /></div><div className="col"><Field label="Nhiệt độ" /></div><div className="col"><Field label="Huyết áp" /></div><div className="col"><Field label="Nhịp thở" /></div></div>
          <div className="row"><div className="col"><Field label="Chiều cao" /></div><div className="col"><Field label="Cân nặng" /></div><div className="col"><Field label="BMI" /></div></div>
          <h3>Khám các cơ quan:</h3>
          <Field label="Toàn thân" />
          <Field label="Tuần hoàn" />
          <Field label="Hô hấp" />
          <Field label="Tiêu hoá" />
          <Field label="Thận - Tiết niệu" />
          <Field label="Thần kinh" />
          <Field label="Cơ xương khớp" />
          <Field label="Tai mũi họng" />
          <Field label="Mắt" />
          <Field label="Răng hàm mặt" />
          <Field label="Khác" />
        </div>
        <div className="section">
          <div className="section-title">V. TÓM TẮT KẾT QUẢ CẬN LÂM SÀNG</div>
          <div style={{ minHeight: 40, border: '1px dotted #999', margin: '4px 0', padding: 4 }} />
        </div>
        <div className="section">
          <div className="section-title">VI. CHẨN ĐOÁN</div>
          <Field label="Chẩn đoán sơ bộ" value={record?.mainDiagnosis} />
          <Field label="Chẩn đoán phân biệt" />
          <Field label="Hướng điều trị" />
        </div>
        <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ KHÁM" date={new Date()} />
      </div>
    );
  }
);
AdmissionExamPrint.displayName = 'AdmissionExamPrint';
