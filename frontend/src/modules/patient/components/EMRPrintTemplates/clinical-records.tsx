import { forwardRef } from 'react';
import dayjs from 'dayjs';
import type { MedicalRecordFullDto, TreatmentSheetDto, ConsultationRecordDto } from '../../../../api/examination';
import { printStyles, PrintHeader, SignatureBlock, Field } from './_shared';
import type { SignatureStampInfo } from './_shared';
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
  ({ record, admissionDate, dischargeDate, departmentName, doctorName: _doctorName, treatmentSummary, proceduresSummary, dischargeCondition, followUpInstructions }, ref) => {
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
              <div className="col"><Field label="HA" value={vs.systolicBP ? `${vs.systolicBP}/${vs.diastolicBP} mmHg` : undefined} /></div>
              <div className="col"><Field label="Cân nặng" value={vs.weight ? `${vs.weight} kg` : undefined} /></div>
            </div>
          )}
          {pe?.generalAppearance && <Field label="Toàn thân" value={pe.generalAppearance} />}
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
// 4b. GIAY CHUYEN VIEN (Referral / Transfer Certificate — BV01)
// Mẫu số 01/BV-01 theo TT 14/2014/TT-BYT và 40/2015/TT-BYT
// ===========================
export interface ReferralCertificateProps {
  // Hospital issuing
  issuingHospitalName?: string;
  issuingHospitalAddress?: string;
  issuingHospitalLevel?: string; // Hạng/tuyến
  // Destination
  destinationHospital: string;
  destinationReason?: string; // vượt khả năng / theo yêu cầu
  // Patient
  patientName: string;
  age?: number;
  gender: number;
  patientCode?: string;
  address?: string;
  ethnicity?: string;
  occupation?: string;
  phoneNumber?: string;
  insuranceNumber?: string;
  insuranceValidFrom?: string;
  insuranceValidTo?: string;
  // Clinical
  admissionDate?: string;
  chiefComplaint?: string;
  medicalHistory?: string;
  physicalExam?: string;
  vitalSigns?: string;
  labResults?: string;
  imagingResults?: string;
  diagnosis: string;
  icdCode?: string;
  treatmentGiven?: string;
  patientConditionBeforeTransfer?: string;
  transportMethod?: string; // xe cứu thương / xe nhà / tự túc
  accompaniedBy?: string;   // đi cùng BN
  doctorName?: string;
  transferDate?: string;
  stamp?: SignatureStampInfo;
}

export const ReferralCertificatePrint = forwardRef<HTMLDivElement, ReferralCertificateProps>(
  (props, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="01/BV-01" />
      <h2>GIẤY CHUYỂN VIỆN</h2>

      <div className="section">
        <Field label="Kính gửi" value={props.destinationHospital} />
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={props.patientName} /></div>
          <div className="col"><Field label="Tuổi" value={props.age} /></div>
          <div className="col"><Field label="Giới" value={props.gender === 1 ? 'Nam' : 'Nữ'} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={props.patientCode} /></div>
          <div className="col"><Field label="Dân tộc" value={props.ethnicity} /></div>
          <div className="col"><Field label="Nghề nghiệp" value={props.occupation} /></div>
        </div>
        <Field label="Địa chỉ" value={props.address} />
        <div className="row">
          <div className="col"><Field label="Số thẻ BHYT" value={props.insuranceNumber} /></div>
          <div className="col"><Field label="Giá trị từ" value={props.insuranceValidFrom ? dayjs(props.insuranceValidFrom).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Đến" value={props.insuranceValidTo ? dayjs(props.insuranceValidTo).format('DD/MM/YYYY') : undefined} /></div>
        </div>
      </div>

      <div className="section">
        <Field label="Đã được điều trị, khám và/hoặc điều trị tại" value={props.issuingHospitalName} />
        <Field label="Địa chỉ" value={props.issuingHospitalAddress} />
        <div className="row">
          <div className="col"><Field label="Hạng BV" value={props.issuingHospitalLevel} /></div>
          <div className="col"><Field label="Từ ngày" value={props.admissionDate ? dayjs(props.admissionDate).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Đến ngày" value={props.transferDate ? dayjs(props.transferDate).format('DD/MM/YYYY') : undefined} /></div>
        </div>
      </div>

      <div className="section">
        <h3>TÓM TẮT BỆNH ÁN</h3>
        <Field label="Dấu hiệu lâm sàng chính" value={props.chiefComplaint} />
        <Field label="Tiền sử bệnh" value={props.medicalHistory} />
        <Field label="Khám lâm sàng" value={props.physicalExam} />
        <Field label="Dấu hiệu sinh tồn" value={props.vitalSigns} />
        <Field label="Kết quả xét nghiệm" value={props.labResults} />
        <Field label="Kết quả chẩn đoán hình ảnh" value={props.imagingResults} />
      </div>

      <div className="section">
        <h3>CHẨN ĐOÁN</h3>
        <Field label="Chẩn đoán" value={props.diagnosis} />
        <Field label="Mã ICD-10" value={props.icdCode} />
      </div>

      <div className="section">
        <h3>ĐÃ ĐIỀU TRỊ</h3>
        <div style={{ minHeight: 60, padding: 4 }}>{props.treatmentGiven ?? '...'}</div>
      </div>

      <div className="section">
        <h3>TÌNH TRẠNG BN LÚC CHUYỂN VIỆN</h3>
        <div style={{ minHeight: 40, padding: 4 }}>{props.patientConditionBeforeTransfer ?? '...'}</div>
      </div>

      <div className="section">
        <h3>LÝ DO CHUYỂN VIỆN</h3>
        <Field label="Lý do" value={props.destinationReason} />
        <Field label="Chuyển đến" value={props.destinationHospital} />
        <div className="row">
          <div className="col"><Field label="Phương tiện vận chuyển" value={props.transportMethod} /></div>
          <div className="col"><Field label="Người đi cùng" value={props.accompaniedBy} /></div>
        </div>
      </div>

      <SignatureBlock
        leftTitle="BÁC SĨ KHÁM/ĐIỀU TRỊ"
        rightTitle="GIÁM ĐỐC / PHÓ GIÁM ĐỐC BỆNH VIỆN"
        date={props.transferDate ? new Date(props.transferDate) : new Date()}
        rightStamp={props.stamp}
      />
    </div>
  )
);
ReferralCertificatePrint.displayName = 'ReferralCertificatePrint';

// ===========================
// 5. PHIEU CHAM SOC (Nursing Care Sheet)
// ===========================
