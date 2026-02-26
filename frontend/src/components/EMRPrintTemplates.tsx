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
