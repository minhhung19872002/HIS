import { forwardRef, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import type { MedicalRecordFullDto, InjuryInfoDto } from '../../../opd/api/examination';
import { getInjuryInfo } from '../../../opd/api/examination';
import { printStyles, PrintHeader, SignatureBlock, Field } from './_shared';

// ===========================
// F8.11 — GIAY XAC NHAN DANG DIEU TRI (Treatment Confirmation)
// Mau so: MS. TC/BV — Giay xac nhan BN dang dieu tri / nam vien
// ===========================
interface TreatmentConfirmationProps {
  record: MedicalRecordFullDto;
  admissionDate?: string;
  departmentName?: string;
  doctorName?: string;
}

export const TreatmentConfirmationPrint = forwardRef<HTMLDivElement, TreatmentConfirmationProps>(
  ({ record, admissionDate, departmentName, doctorName }, ref) => {
    const p = record.patient;
    const primaryDiag = record.diagnoses?.find(d => d.diagnosisType === 1) ?? record.diagnoses?.[0];
    const today = new Date();

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. TC/BV" />
        <h2>GIẤY XÁC NHẬN ĐANG ĐIỀU TRỊ TẠI BỆNH VIỆN</h2>

        <div className="section" style={{ marginTop: 16, lineHeight: 2 }}>
          <p>
            Bệnh viện xác nhận: Ông/Bà{' '}
            <strong>{p?.fullName ?? '...........................'}</strong>
          </p>
          <div className="row">
            <div className="col"><Field label="Năm sinh" value={p?.dateOfBirth ? dayjs(p.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới tính" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <Field label="Mã bệnh nhân" value={p?.patientCode} />
          <Field label="Địa chỉ" value={p?.address} />
          <Field label="Số điện thoại" value={p?.phoneNumber} />
          <Field label="Nghề nghiệp" value={p?.occupation} />
        </div>

        <div className="section">
          <p>
            Hiện đang được khám và điều trị tại bệnh viện này kể từ ngày{' '}
            <strong>
              {admissionDate ? dayjs(admissionDate).format('DD/MM/YYYY') : '...../....../..........'}
            </strong>
            .
          </p>
          <div className="row">
            <div className="col"><Field label="Mã hồ sơ bệnh án" value={record.medicalRecordCode} /></div>
            <div className="col"><Field label="Khoa điều trị" value={departmentName} /></div>
          </div>
          <Field label="Bác sĩ điều trị" value={doctorName} />
        </div>

        <div className="section">
          <h3>CHẨN ĐOÁN HIỆN TẠI</h3>
          {primaryDiag ? (
            <Field
              label="Chẩn đoán"
              value={`${primaryDiag.icdCode ? `${primaryDiag.icdCode} - ` : ''}${primaryDiag.icdName ?? primaryDiag.customDiagnosis ?? ''}`}
            />
          ) : (
            <Field label="Chẩn đoán" value={undefined} />
          )}
          {record.diagnoses?.filter(d => d !== primaryDiag).length > 0 && (
            <Field
              label="Chẩn đoán phụ"
              value={record.diagnoses
                .filter(d => d !== primaryDiag)
                .map(d => `${d.icdCode ? `${d.icdCode} - ` : ''}${d.icdName ?? d.customDiagnosis ?? ''}`)
                .join('; ')}
            />
          )}
        </div>

        <div className="section">
          <p>
            Giấy xác nhận này được cấp theo yêu cầu của bệnh nhân/gia đình để làm thủ tục{' '}
            <span style={{ fontStyle: 'italic' }}>.....................................................</span>
          </p>
        </div>

        <SignatureBlock
          leftTitle="TRƯỞNG KHOA"
          rightTitle="GIÁM ĐỐC BỆNH VIỆN"
          date={today}
        />
      </div>
    );
  }
);
TreatmentConfirmationPrint.displayName = 'TreatmentConfirmationPrint';

// ===========================
// F8.10 — GIAY CHUNG NHAN THUONG TICH (Injury Certificate)
// Mau phap y BYT — dung cho TNGT/TNLD/TNSH
// ===========================
const INJURY_TYPE_LABELS: Record<number, string> = {
  1: 'Tai nạn giao thông (TNGT)',
  2: 'Tai nạn lao động (TNLD)',
  3: 'Tai nạn sinh hoạt (TNSH)',
  4: 'Khác',
};

interface InjuryCertificateProps {
  record: MedicalRecordFullDto;
  injuryInfo?: InjuryInfoDto | null;
  admissionDate?: string;
  departmentName?: string;
  doctorName?: string;
}

export const InjuryCertificatePrint = forwardRef<HTMLDivElement, InjuryCertificateProps>(
  ({ record, injuryInfo, admissionDate, departmentName, doctorName }, ref) => {
    const p = record.patient;
    const primaryDiag = record.diagnoses?.find(d => d.diagnosisType === 1) ?? record.diagnoses?.[0];
    const vs = record.vitalSigns;
    const pe = record.physicalExam;
    const today = new Date();

    const injuryTypeLabel = injuryInfo?.injuryType
      ? INJURY_TYPE_LABELS[injuryInfo.injuryType] ?? 'Khác'
      : undefined;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. TT/BV" />
        <h2>GIẤY CHỨNG NHẬN THƯƠNG TÍCH</h2>
        <div style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: 12, fontSize: 12 }}>
          (Theo mẫu pháp y Bộ Y tế)
        </div>

        <div className="section">
          <h3>I. THÔNG TIN BỆNH NHÂN</h3>
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới tính" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã bệnh nhân" value={p?.patientCode} /></div>
            <div className="col"><Field label="Mã hồ sơ BA" value={record.medicalRecordCode} /></div>
          </div>
          <Field label="Địa chỉ" value={p?.address} />
          <div className="row">
            <div className="col"><Field label="Nghề nghiệp" value={p?.occupation} /></div>
            <div className="col"><Field label="Số điện thoại" value={p?.phoneNumber} /></div>
          </div>
        </div>

        <div className="section">
          <h3>II. THÔNG TIN THƯƠNG TÍCH</h3>
          <Field label="Loại tai nạn" value={injuryTypeLabel} />
          <Field
            label="Thời điểm xảy ra tai nạn"
            value={
              injuryInfo?.injuryTime
                ? dayjs(injuryInfo.injuryTime).format('HH:mm DD/MM/YYYY')
                : undefined
            }
          />
          <Field label="Địa điểm xảy ra" value={injuryInfo?.injuryLocation} />
          <div className="section" style={{ paddingLeft: 0 }}>
            <div className="field">
              <span className="field-label">Mô tả thương tích: </span>
            </div>
            <div style={{ minHeight: 60, padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginTop: 4 }}>
              {injuryInfo?.injuryDescription ?? '...'}
            </div>
          </div>
          {injuryInfo?.witness && <Field label="Người chứng kiến" value={injuryInfo.witness} />}
          <div className="row">
            <div className="col">
              <Field
                label="Có báo cáo cơ quan công an"
                value={injuryInfo?.hasPoliceReport ? 'Có' : 'Không'}
              />
            </div>
            {injuryInfo?.hasPoliceReport && injuryInfo.policeReportNumber && (
              <div className="col">
                <Field label="Số biên bản" value={injuryInfo.policeReportNumber} />
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <h3>III. TÌNH TRẠNG KHI VÀO VIỆN</h3>
          <Field
            label="Ngày vào viện"
            value={admissionDate ? dayjs(admissionDate).format('DD/MM/YYYY HH:mm') : undefined}
          />
          <Field label="Khoa tiếp nhận" value={departmentName} />
          {vs && (
            <div className="row">
              <div className="col"><Field label="Mạch" value={vs.pulse ? `${vs.pulse} l/ph` : undefined} /></div>
              <div className="col"><Field label="Nhiệt độ" value={vs.temperature ? `${vs.temperature}°C` : undefined} /></div>
              <div className="col"><Field label="HA" value={vs.systolicBP ? `${vs.systolicBP}/${vs.diastolicBP} mmHg` : undefined} /></div>
              <div className="col"><Field label="SpO2" value={vs.spO2 ? `${vs.spO2}%` : undefined} /></div>
            </div>
          )}
          {pe && (
            <>
              {pe.generalAppearance && <Field label="Toàn thân" value={pe.generalAppearance} />}
              {pe.musculoskeletal && <Field label="Cơ xương khớp / Thương tổn" value={pe.musculoskeletal} />}
              {pe.neurological && <Field label="Thần kinh" value={pe.neurological} />}
              {pe.otherFindings && <Field label="Khác" value={pe.otherFindings} />}
            </>
          )}
        </div>

        <div className="section">
          <h3>IV. CHẨN ĐOÁN</h3>
          {primaryDiag ? (
            <Field
              label="Chẩn đoán chính"
              value={`${primaryDiag.icdCode ? `${primaryDiag.icdCode} - ` : ''}${primaryDiag.icdName ?? primaryDiag.customDiagnosis ?? ''}`}
            />
          ) : (
            <Field label="Chẩn đoán chính" value={undefined} />
          )}
          {record.diagnoses?.filter(d => d !== primaryDiag).length > 0 && (
            <Field
              label="Chẩn đoán phụ"
              value={record.diagnoses
                .filter(d => d !== primaryDiag)
                .map(d => `${d.icdCode ? `${d.icdCode} - ` : ''}${d.icdName ?? d.customDiagnosis ?? ''}`)
                .join('; ')}
            />
          )}
        </div>

        <div className="section">
          <h3>V. PHƯƠNG PHÁP ĐIỀU TRỊ</h3>
          <div style={{ minHeight: 60, padding: 4 }}>{record.conclusion?.conclusionNotes ?? '...'}</div>
        </div>

        <div className="section">
          <Field label="Bác sĩ điều trị" value={doctorName} />
          <p style={{ fontStyle: 'italic', fontSize: 12, marginTop: 8 }}>
            Giấy này có giá trị kể từ ngày{' '}
            {dayjs(today).format('DD')} tháng {dayjs(today).format('MM')} năm {dayjs(today).format('YYYY')}.
          </p>
        </div>

        <SignatureBlock
          leftTitle="TRƯỞNG KHOA"
          rightTitle="GIÁM ĐỐC BỆNH VIỆN"
          date={today}
        />
      </div>
    );
  }
);
InjuryCertificatePrint.displayName = 'InjuryCertificatePrint';

// ===========================
// InjuryCertificatePrintLoader — wrapper tu fetch InjuryInfo truoc khi render
// Dung khi PrintTemplateRenderer can lay InjuryInfo tu examinationId
// ===========================
interface InjuryCertificateLoaderProps {
  record: MedicalRecordFullDto;
  /** examinationId — ID của lượt khám (khác record.id là medicalRecordId).
   *  Dùng để gọi getInjuryInfo(examinationId). Nếu không có, fallback sang record.id. */
  examinationId?: string;
  admissionDate?: string;
  departmentName?: string;
  doctorName?: string;
}

export const InjuryCertificatePrintLoader = forwardRef<HTMLDivElement, InjuryCertificateLoaderProps>(
  ({ record, examinationId, admissionDate, departmentName, doctorName }, ref) => {
    const [injuryInfo, setInjuryInfo] = useState<InjuryInfoDto | null>(null);

    // Ưu tiên examinationId được truyền vào; fallback record.id (có thể là exam.id tuỳ caller)
    const examId = examinationId ?? record?.id;

    useEffect(() => {
      if (!examId) return;
      getInjuryInfo(examId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((res: any) => setInjuryInfo(res?.data ?? res ?? null))
        .catch(() => setInjuryInfo(null));
    }, [examId]);

    return (
      <InjuryCertificatePrint
        ref={ref}
        record={record}
        injuryInfo={injuryInfo}
        admissionDate={admissionDate}
        departmentName={departmentName}
        doctorName={doctorName}
      />
    );
  }
);
InjuryCertificatePrintLoader.displayName = 'InjuryCertificatePrintLoader';
