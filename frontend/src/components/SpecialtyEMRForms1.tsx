import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';

// Shared print styles (same as EMRPrintTemplates)
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
.emr-print-container .checkbox-row { display: flex; gap: 24px; margin: 4px 0; }
.emr-print-container .checkbox-item { display: flex; align-items: center; gap: 4px; }
.emr-print-container .checkbox-box { width: 14px; height: 14px; border: 1px solid #000; display: inline-block; text-align: center; line-height: 14px; font-size: 11px; }
.emr-print-container .dotted-line { border-bottom: 1px dotted #999; min-height: 22px; margin: 2px 0; }
.emr-print-container .dotted-lines-block { margin: 4px 0; }
.emr-print-container .dotted-lines-block .dotted-line { margin: 6px 0; }
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
const SignatureBlock: React.FC<{
  leftTitle: string;
  rightTitle: string;
  date?: string;
  middleTitle?: string;
}> = ({ leftTitle, rightTitle, date, middleTitle }) => (
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
        {date ? `Ngày ${dayjs(date).format('DD')} tháng ${dayjs(date).format('MM')} năm ${dayjs(date).format('YYYY')}` : 'Ngày ..... tháng ..... năm 20.....'}
      </div>
      <div className="sig-title">{rightTitle}</div>
      <div className="sig-date">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>
);

// Field row
const Field: React.FC<{ label: string; value?: string | number | null; wide?: boolean }> = ({ label, value, wide }) => (
  <div className="field">
    <span className="field-label">{label}: </span>
    <span className="field-value" style={wide ? { minWidth: 300 } : undefined}>{value ?? '...........................'}</span>
  </div>
);

// Checkbox helper
const Checkbox: React.FC<{ label: string; checked?: boolean }> = ({ label, checked }) => (
  <span className="checkbox-item">
    <span className="checkbox-box">{checked ? '✓' : ''}</span>
    <span>{label}</span>
  </span>
);

// Dotted lines for free text areas
const DottedLines: React.FC<{ count?: number; content?: string }> = ({ count = 3, content }) => (
  <div className="dotted-lines-block">
    {content ? (
      <div style={{ borderBottom: '1px dotted #999', padding: '2px 0', whiteSpace: 'pre-wrap' }}>{content}</div>
    ) : (
      Array.from({ length: count }).map((_, i) => <div key={i} className="dotted-line" />)
    )}
  </div>
);

// Patient info block (reused across all forms)
const PatientInfoBlock: React.FC<{ data: any }> = ({ data }) => (
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
export const NoiKhoaBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 01/BV1" />
      <h2>BỆNH ÁN NỘI KHOA</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <Field label="Quá trình bệnh lý" value={null} />
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
        <Field label="Đã điều trị ở đâu, kết quả" value={data?.previousTreatment} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="Bản thân" value={data?.pastMedicalHistory} />
        <DottedLines content={data?.personalHistory} count={2} />
        <Field label="Gia đình" value={data?.familyHistory} />
        <DottedLines content={data?.familyHistoryDetail} count={2} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM TOÀN THÂN</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Nhịp thở" value={data?.respiratoryRate ? `${data.respiratoryRate} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
          <div className="col"><Field label="Chiều cao" value={data?.height ? `${data.height} cm` : undefined} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
        <DottedLines content={data?.generalExam} count={2} />
        <div className="row">
          <div className="col"><Field label="Da, niêm mạc" value={data?.skinMucosa} /></div>
          <div className="col"><Field label="Hạch ngoại vi" value={data?.lymphNodes} /></div>
        </div>
        <Field label="Tuyến giáp" value={data?.thyroid} />
        <Field label="Phù" value={data?.edema} />
      </div>

      <div className="section">
        <div className="section-title">V. KHÁM CƠ QUAN</div>

        <h3>1. Tuần hoàn</h3>
        <Field label="Nhịp tim" value={data?.heartRate} />
        <Field label="Tiếng tim" value={data?.heartSounds} />
        <Field label="Tiếng thổi" value={data?.murmurs} />
        <DottedLines content={data?.cardiovascularExam} count={2} />

        <h3>2. Hô hấp</h3>
        <Field label="Lồng ngực" value={data?.chestShape} />
        <Field label="Rì rào phế nang" value={data?.breathSounds} />
        <Field label="Ran" value={data?.rales} />
        <DottedLines content={data?.respiratoryExam} count={2} />

        <h3>3. Tiêu hóa</h3>
        <Field label="Bụng" value={data?.abdomen} />
        <Field label="Gan" value={data?.liver} />
        <Field label="Lách" value={data?.spleen} />
        <DottedLines content={data?.digestiveExam} count={2} />

        <h3>4. Thận - Tiết niệu</h3>
        <Field label="Chạm thận" value={data?.kidneyPalpation} />
        <Field label="Bập bềnh thận" value={data?.kidneyBallottement} />
        <DottedLines content={data?.urinaryExam} count={2} />

        <h3>5. Thần kinh</h3>
        <Field label="Tri giác" value={data?.consciousness} />
        <Field label="Glasgow" value={data?.glasgowScore} />
        <Field label="Dấu hiệu thần kinh khu trú" value={data?.focalNeuroSigns} />
        <DottedLines content={data?.neuroExam} count={2} />

        <h3>6. Cơ - xương - khớp</h3>
        <Field label="Cột sống" value={data?.spine} />
        <Field label="Các khớp" value={data?.joints} />
        <DottedLines content={data?.musculoskeletalExam} count={2} />
      </div>

      <div className="section">
        <div className="section-title">VI. CẬN LÂM SÀNG</div>
        <Field label="Xét nghiệm máu" value={data?.bloodTests} />
        <Field label="Xét nghiệm nước tiểu" value={data?.urineTests} />
        <Field label="X-quang" value={data?.xray} />
        <Field label="Siêu âm" value={data?.ultrasound} />
        <Field label="Điện tim" value={data?.ecg} />
        <Field label="Xét nghiệm khác" value={data?.otherTests} />
        <DottedLines count={3} />
      </div>

      <div className="section">
        <div className="section-title">VII. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán chính" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.primaryIcdCode} />
        <Field label="Chẩn đoán phụ" value={data?.secondaryDiagnosis} />
        <Field label="Biến chứng" value={data?.complications} />
        <Field label="Chẩn đoán phân biệt" value={data?.differentialDiagnosis} />
      </div>

      <div className="section">
        <div className="section-title">VIII. HƯỚNG ĐIỀU TRỊ</div>
        <DottedLines content={data?.treatmentPlan} count={4} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
NoiKhoaBAPrint.displayName = 'NoiKhoaBAPrint';

// =====================================================================
// 2. BA TRUYỀN NHIỄM (Infectious Disease Medical Record)
// =====================================================================
export const TruyenNhiemBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 02/BV1" />
      <h2>BỆNH ÁN TRUYỀN NHIỄM</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. DỊCH TỄ</div>
        <Field label="Tiếp xúc nguồn lây" value={data?.exposureSource} />
        <Field label="Ổ dịch" value={data?.outbreakInfo} />
        <Field label="Tiền sử tiêm chủng" value={data?.vaccinationHistory} />
        <Field label="Nơi ở/làm việc (14 ngày qua)" value={data?.recentLocation} />
        <Field label="Du lịch/di chuyển" value={data?.travelHistory} />
        <Field label="Tiếp xúc động vật" value={data?.animalContact} />
        <Field label="Thực phẩm nghi ngờ" value={data?.suspectedFood} />
      </div>

      <div className="section">
        <div className="section-title">III. BỆNH SỬ</div>
        <Field label="Ngày khởi phát" value={data?.onsetDate ? dayjs(data.onsetDate).format('DD/MM/YYYY') : undefined} />
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
      </div>

      <div className="section">
        <div className="section-title">IV. TIỀN SỬ</div>
        <Field label="Bản thân (bệnh truyền nhiễm đã mắc)" value={data?.pastInfectiousHistory} />
        <Field label="Tiêm chủng" value={data?.immunizationRecord} />
        <Field label="Gia đình (bệnh truyền nhiễm)" value={data?.familyInfectiousHistory} />
      </div>

      <div className="section">
        <div className="section-title">V. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Nhịp thở" value={data?.respiratoryRate ? `${data.respiratoryRate} lần/phút` : undefined} /></div>
          <div className="col"><Field label="SpO2" value={data?.spo2 ? `${data.spo2}%` : undefined} /></div>
        </div>

        <h3>Diễn biến sốt</h3>
        <Field label="Kiểu sốt" value={data?.feverPattern} />
        <Field label="Thời gian sốt" value={data?.feverDuration} />
        <Field label="Nhiệt độ cao nhất" value={data?.maxTemperature ? `${data.maxTemperature}°C` : undefined} />

        <h3>Phát ban</h3>
        <Field label="Kiểu ban" value={data?.rashType} />
        <Field label="Vị trí" value={data?.rashLocation} />
        <Field label="Thời gian xuất hiện" value={data?.rashOnset} />

        <h3>Triệu chứng hệ thống</h3>
        <Field label="Hô hấp" value={data?.respiratorySymptoms} />
        <Field label="Tiêu hóa" value={data?.giSymptoms} />
        <Field label="Thần kinh" value={data?.neuroSymptoms} />
        <Field label="Da, niêm mạc" value={data?.skinFindings} />
        <Field label="Hạch" value={data?.lymphNodeFindings} />
      </div>

      <div className="section">
        <div className="section-title">VI. BIẾN CHỨNG NHIỄM TRÙNG</div>
        <DottedLines content={data?.infectiousComplications} count={3} />
      </div>

      <div className="section">
        <div className="section-title">VII. CẬN LÂM SÀNG</div>
        <Field label="Công thức máu" value={data?.cbc} />
        <Field label="CRP / PCT" value={data?.crpPct} />
        <Field label="Cấy máu" value={data?.bloodCulture} />
        <Field label="Test nhanh" value={data?.rapidTest} />
        <Field label="PCR" value={data?.pcrResult} />
        <Field label="Huyết thanh học" value={data?.serology} />
        <Field label="X-quang phổi" value={data?.chestXray} />
        <Field label="Xét nghiệm khác" value={data?.otherTests} />
      </div>

      <div className="section">
        <div className="section-title">VIII. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán xác định" value={data?.confirmedDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Phân loại mức độ" value={data?.severityClassification} />
        <Field label="Biến chứng" value={data?.complications} />
      </div>

      <div className="section">
        <div className="section-title">IX. HƯỚNG ĐIỀU TRỊ</div>
        <Field label="Cách ly" value={data?.isolationMeasures} />
        <Field label="Kháng sinh/kháng virus" value={data?.antimicrobialTherapy} />
        <Field label="Điều trị triệu chứng" value={data?.symptomaticTreatment} />
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
TruyenNhiemBAPrint.displayName = 'TruyenNhiemBAPrint';

// =====================================================================
// 3. BA PHỤ KHOA (Gynecology Medical Record)
// =====================================================================
export const PhuKhoaBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 03/BV1" />
      <h2>BỆNH ÁN PHỤ KHOA</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. TIỀN SỬ KINH NGUYỆT</div>
        <div className="row">
          <div className="col"><Field label="Tuổi bắt đầu hành kinh" value={data?.menarcheAge} /></div>
          <div className="col"><Field label="Chu kỳ" value={data?.menstrualCycle ? `${data.menstrualCycle} ngày` : undefined} /></div>
          <div className="col"><Field label="Số ngày hành kinh" value={data?.menstrualDuration ? `${data.menstrualDuration} ngày` : undefined} /></div>
        </div>
        <Field label="Kinh nguyệt cuối" value={data?.lastMenstrualPeriod ? dayjs(data.lastMenstrualPeriod).format('DD/MM/YYYY') : undefined} />
        <Field label="Đặc điểm kinh nguyệt" value={data?.menstrualCharacteristics} />
        <Field label="Rối loạn kinh nguyệt" value={data?.menstrualDisorders} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ SẢN KHOA</div>
        <div className="row">
          <div className="col"><Field label="PARA" value={data?.para} /></div>
          <div className="col"><Field label="Số con sống" value={data?.livingChildren} /></div>
        </div>
        <Field label="Tiền sử sản khoa chi tiết" value={data?.obstetricHistory} />
        <Field label="Biện pháp tránh thai" value={data?.contraception} />
      </div>

      <div className="section">
        <div className="section-title">IV. TIỀN SỬ BỆNH</div>
        <Field label="Bản thân (phụ khoa)" value={data?.gynecologicalHistory} />
        <Field label="Bản thân (nội/ngoại khoa)" value={data?.pastMedicalHistory} />
        <Field label="Gia đình" value={data?.familyHistory} />
      </div>

      <div className="section">
        <div className="section-title">V. BỆNH SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
      </div>

      <div className="section">
        <div className="section-title">VI. KHÁM TOÀN THÂN</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
        <Field label="Vú" value={data?.breastExam} />
      </div>

      <div className="section">
        <div className="section-title">VII. KHÁM PHỤ KHOA</div>
        <h3>1. Khám ngoài</h3>
        <Field label="Âm hộ" value={data?.vulva} />
        <Field label="Tầng sinh môn" value={data?.perineum} />

        <h3>2. Khám âm đạo</h3>
        <Field label="Âm đạo" value={data?.vagina} />
        <Field label="Dịch âm đạo" value={data?.vaginalDischarge} />

        <h3>3. Cổ tử cung</h3>
        <Field label="Cổ tử cung" value={data?.cervix} />
        <Field label="Soi CTC" value={data?.colposcopy} />

        <h3>4. Tử cung</h3>
        <Field label="Kích thước" value={data?.uterusSize} />
        <Field label="Hình dạng" value={data?.uterusShape} />
        <Field label="Mật độ" value={data?.uterusConsistency} />
        <Field label="Di động" value={data?.uterusMobility} />

        <h3>5. Phần phụ</h3>
        <Field label="Phần phụ phải" value={data?.rightAdnexa} />
        <Field label="Phần phụ trái" value={data?.leftAdnexa} />
        <Field label="Cùng đồ Douglas" value={data?.douglasPouch} />
      </div>

      <div className="section">
        <div className="section-title">VIII. CẬN LÂM SÀNG</div>
        <Field label="Siêu âm phụ khoa" value={data?.gynecologicalUltrasound} />
        <Field label="Xét nghiệm Pap smear" value={data?.papSmear} />
        <Field label="Xét nghiệm HPV" value={data?.hpvTest} />
        <Field label="Xét nghiệm đặc thù" value={data?.specialTests} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">IX. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán chính" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Chẩn đoán phụ" value={data?.secondaryDiagnosis} />
      </div>

      <div className="section">
        <div className="section-title">X. HƯỚNG ĐIỀU TRỊ</div>
        <DottedLines content={data?.treatmentPlan} count={4} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
PhuKhoaBAPrint.displayName = 'PhuKhoaBAPrint';

// =====================================================================
// 4. BA TÂM THẦN (Psychiatry Medical Record)
// =====================================================================
export const TamThanBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 04/BV1" />
      <h2>BỆNH ÁN TÂM THẦN</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. TIỀN SỬ TÂM THẦN GIA ĐÌNH</div>
        <Field label="Bố/mẹ" value={data?.familyPsychHistory} />
        <Field label="Anh chị em ruột" value={data?.siblingPsychHistory} />
        <Field label="Họ hàng" value={data?.relativePsychHistory} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ BẢN THÂN</div>
        <Field label="Phát triển tâm thần - vận động" value={data?.developmentalHistory} />
        <Field label="Học tập" value={data?.educationalHistory} />
        <Field label="Nghề nghiệp" value={data?.occupationalHistory} />
        <Field label="Hôn nhân" value={data?.maritalHistory} />
        <Field label="Sử dụng chất (rượu, ma túy)" value={data?.substanceUseHistory} />
        <Field label="Bệnh tâm thần đã mắc" value={data?.pastPsychiatricHistory} />
        <Field label="Bệnh nội/ngoại khoa" value={data?.pastMedicalHistory} />
      </div>

      <div className="section">
        <div className="section-title">IV. BỆNH SỬ</div>
        <Field label="Hoàn cảnh khởi phát" value={data?.onsetCircumstances} />
        <Field label="Ngày khởi phát" value={data?.onsetDate ? dayjs(data.onsetDate).format('DD/MM/YYYY') : undefined} />
        <DottedLines content={data?.historyOfPresentIllness} count={5} />
      </div>

      <div className="section">
        <div className="section-title">V. KHÁM TÂM THẦN</div>

        <h3>1. Biểu hiện chung</h3>
        <Field label="Ý thức" value={data?.consciousness} />
        <Field label="Tiếp xúc" value={data?.rapport} />
        <Field label="Diện mạo, trang phục" value={data?.appearance} />
        <Field label="Hành vi tâm thần vận động" value={data?.psychomotorBehavior} />

        <h3>2. Tri giác</h3>
        <Field label="Ảo giác (thị, thính, xúc, vị, khứu)" value={data?.hallucinations} />
        <Field label="Ảo tưởng" value={data?.illusions} />

        <h3>3. Tư duy</h3>
        <Field label="Hình thức tư duy" value={data?.thoughtForm} />
        <Field label="Nội dung tư duy" value={data?.thoughtContent} />
        <Field label="Hoang tưởng (bị hại, bị theo dõi, tự cao, ghen tuông...)" value={data?.delusions} />

        <h3>4. Cảm xúc</h3>
        <Field label="Khí sắc" value={data?.mood} />
        <Field label="Cảm xúc" value={data?.affect} />
        <Field label="Ý tưởng tự sát" value={data?.suicidalIdeation} />

        <h3>5. Trí nhớ</h3>
        <Field label="Trí nhớ gần" value={data?.recentMemory} />
        <Field label="Trí nhớ xa" value={data?.remoteMemory} />
        <Field label="Trí nhớ tức thì" value={data?.immediateMemory} />

        <h3>6. Trí năng</h3>
        <Field label="Định hướng (thời gian, không gian, bản thân)" value={data?.orientation} />
        <Field label="Chú ý" value={data?.attention} />
        <Field label="Phán đoán, nhận thức bệnh" value={data?.judgment} />
      </div>

      <div className="section">
        <div className="section-title">VI. TEST TÂM LÝ</div>
        <Field label="MMSE" value={data?.mmseScore} />
        <Field label="DASS-21" value={data?.dass21Score} />
        <Field label="PHQ-9" value={data?.phq9Score} />
        <Field label="GAF" value={data?.gafScore} />
        <Field label="Test khác" value={data?.otherPsychTests} />
      </div>

      <div className="section">
        <div className="section-title">VII. KHÁM CƠ THỂ</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
        </div>
        <Field label="Thần kinh" value={data?.neuroExam} />
        <Field label="Nội khoa" value={data?.internalExam} />
      </div>

      <div className="section">
        <div className="section-title">VIII. CẬN LÂM SÀNG</div>
        <Field label="Xét nghiệm máu" value={data?.bloodTests} />
        <Field label="Độc chất học" value={data?.toxicology} />
        <Field label="EEG" value={data?.eeg} />
        <Field label="CT/MRI sọ" value={data?.brainImaging} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">IX. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán theo DSM-5" value={data?.dsm5Diagnosis} />
        <Field label="Chẩn đoán theo ICD-10" value={data?.icd10Diagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Chẩn đoán phân biệt" value={data?.differentialDiagnosis} />
      </div>

      <div className="section">
        <div className="section-title">X. HƯỚNG ĐIỀU TRỊ</div>
        <Field label="Thuốc" value={data?.pharmacotherapy} />
        <Field label="Liệu pháp tâm lý" value={data?.psychotherapy} />
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
TamThanBAPrint.displayName = 'TamThanBAPrint';

// =====================================================================
// 5. BA DA LIỄU (Dermatology Medical Record)
// =====================================================================
export const DaLieuBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 05/BV1" />
      <h2>BỆNH ÁN DA LIỄU</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <Field label="Thời gian khởi phát" value={data?.onsetDuration} />
        <Field label="Vị trí ban đầu" value={data?.initialLocation} />
        <Field label="Diễn biến" value={data?.progression} />
        <Field label="Triệu chứng cơ năng (ngứa, đau, rát)" value={data?.functionalSymptoms} />
        <Field label="Yếu tố khởi phát/làm nặng" value={data?.aggravatingFactors} />
        <Field label="Điều trị trước đó" value={data?.previousTreatment} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="Bản thân (da liễu)" value={data?.dermatologicalHistory} />
        <Field label="Dị ứng" value={data?.allergyHistory} />
        <Field label="Nội/ngoại khoa" value={data?.pastMedicalHistory} />
        <Field label="Gia đình (da liễu)" value={data?.familyDermatologicalHistory} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM TOÀN THÂN</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
        <Field label="Hạch ngoại vi" value={data?.lymphNodes} />
      </div>

      <div className="section">
        <div className="section-title">V. MÔ TẢ TỔN THƯƠNG DA</div>

        <h3>Tổn thương 1</h3>
        <div className="row">
          <div className="col"><Field label="Vị trí" value={data?.lesion1Location} /></div>
          <div className="col"><Field label="Kích thước" value={data?.lesion1Size} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Hình thái (dát, sẩn, mụn nước, bọng nước, mụn mủ, cục, nốt, vảy, vết trợt, loét)" value={data?.lesion1Morphology} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Màu sắc" value={data?.lesion1Color} /></div>
          <div className="col"><Field label="Ranh giới" value={data?.lesion1Border} /></div>
        </div>
        <Field label="Bề mặt" value={data?.lesion1Surface} />
        <Field label="Phân bố" value={data?.lesion1Distribution} />

        <h3>Tổn thương 2 (nếu có)</h3>
        <div className="row">
          <div className="col"><Field label="Vị trí" value={data?.lesion2Location} /></div>
          <div className="col"><Field label="Hình thái" value={data?.lesion2Morphology} /></div>
          <div className="col"><Field label="Kích thước" value={data?.lesion2Size} /></div>
        </div>
        <DottedLines count={2} />

        <h3>Tổn thương niêm mạc (nếu có)</h3>
        <Field label="Niêm mạc miệng" value={data?.oralMucosa} />
        <Field label="Niêm mạc sinh dục" value={data?.genitalMucosa} />

        <h3>Phần phụ da</h3>
        <Field label="Tóc" value={data?.hair} />
        <Field label="Móng" value={data?.nails} />
      </div>

      <div className="section">
        <div className="section-title">VI. CẬN LÂM SÀNG</div>
        <Field label="Sinh thiết da" value={data?.skinBiopsy} />
        <Field label="Soi tươi nấm (KOH)" value={data?.kohTest} />
        <Field label="Dermatoscopy" value={data?.dermatoscopy} />
        <Field label="Wood lamp" value={data?.woodLamp} />
        <Field label="Patch test" value={data?.patchTest} />
        <Field label="Xét nghiệm máu" value={data?.bloodTests} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">VII. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán xác định" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Chẩn đoán phân biệt" value={data?.differentialDiagnosis} />
      </div>

      <div className="section">
        <div className="section-title">VIII. HƯỚNG ĐIỀU TRỊ</div>
        <Field label="Tại chỗ" value={data?.topicalTreatment} />
        <Field label="Toàn thân" value={data?.systemicTreatment} />
        <Field label="Thủ thuật" value={data?.procedureTreatment} />
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
DaLieuBAPrint.displayName = 'DaLieuBAPrint';

// =====================================================================
// 6. BA HUYẾT HỌC (Hematology Medical Record)
// =====================================================================
export const HuyetHocBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 06/BV1" />
      <h2>BỆNH ÁN HUYẾT HỌC</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="Bản thân (huyết học)" value={data?.hematologicalHistory} />
        <Field label="Truyền máu trước đó" value={data?.transfusionHistory} />
        <Field label="Nội/ngoại khoa" value={data?.pastMedicalHistory} />
        <Field label="Gia đình (bệnh huyết học)" value={data?.familyHematologicalHistory} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <Field label="Da, niêm mạc (thiếu máu, xuất huyết, vàng da)" value={data?.skinMucosa} />
        <Field label="Hạch ngoại vi" value={data?.lymphNodes} />
        <Field label="Gan" value={data?.liver} />
        <Field label="Lách" value={data?.spleen} />
        <Field label="Xương (đau xương)" value={data?.boneExam} />
        <Field label="Xuất huyết (vị trí, mức độ)" value={data?.bleedingFindings} />
      </div>

      <div className="section">
        <div className="section-title">V. TỔNG PHÂN TÍCH MÁU</div>
        <table>
          <thead>
            <tr>
              <th>Chỉ số</th><th>Kết quả</th><th>Đơn vị</th><th>Giá trị BT</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Hồng cầu (RBC)</td><td>{data?.rbc || '...'}</td><td>T/L</td><td>4.0-5.5</td></tr>
            <tr><td>Hemoglobin (Hb)</td><td>{data?.hemoglobin || '...'}</td><td>g/L</td><td>120-160</td></tr>
            <tr><td>Hematocrit (Hct)</td><td>{data?.hematocrit || '...'}</td><td>%</td><td>36-48</td></tr>
            <tr><td>MCV</td><td>{data?.mcv || '...'}</td><td>fL</td><td>80-100</td></tr>
            <tr><td>MCH</td><td>{data?.mch || '...'}</td><td>pg</td><td>27-33</td></tr>
            <tr><td>MCHC</td><td>{data?.mchc || '...'}</td><td>g/L</td><td>320-360</td></tr>
            <tr><td>Bạch cầu (WBC)</td><td>{data?.wbc || '...'}</td><td>G/L</td><td>4.0-10.0</td></tr>
            <tr><td>Tiểu cầu (PLT)</td><td>{data?.platelets || '...'}</td><td>G/L</td><td>150-400</td></tr>
          </tbody>
        </table>
        <Field label="Hồng cầu lưới" value={data?.reticulocytes} />
        <Field label="Lam máu ngoại vi" value={data?.peripheralSmear} />
      </div>

      <div className="section">
        <div className="section-title">VI. TỦY ĐỒ</div>
        <Field label="Ngày chọc tủy" value={data?.bonemarrowDate ? dayjs(data.bonemarrowDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Mật độ tế bào" value={data?.cellularity} />
        <Field label="Dòng hồng cầu" value={data?.erythroidSeries} />
        <Field label="Dòng bạch cầu hạt" value={data?.myeloidSeries} />
        <Field label="Dòng mẫu tiểu cầu" value={data?.megakaryocytes} />
        <Field label="Tỷ lệ M:E" value={data?.meRatio} />
        <Field label="Blast" value={data?.blastPercentage} />
        <Field label="Kết luận" value={data?.bonemarrowConclusion} />
      </div>

      <div className="section">
        <div className="section-title">VII. SINH THIẾT TỦY XƯƠNG</div>
        <Field label="Kết quả" value={data?.boneBiopsy} />
      </div>

      <div className="section">
        <div className="section-title">VIII. MIỄN DỊCH TẾ BÀO (Flow Cytometry)</div>
        <Field label="Immunophenotyping" value={data?.flowCytometry} />
        <Field label="CD markers" value={data?.cdMarkers} />
      </div>

      <div className="section">
        <div className="section-title">IX. ĐÔNG MÁU TOÀN BỘ</div>
        <div className="row">
          <div className="col"><Field label="PT" value={data?.pt} /></div>
          <div className="col"><Field label="INR" value={data?.inr} /></div>
          <div className="col"><Field label="aPTT" value={data?.aptt} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Fibrinogen" value={data?.fibrinogen} /></div>
          <div className="col"><Field label="D-Dimer" value={data?.dDimer} /></div>
        </div>
        <Field label="Nhóm máu" value={data?.bloodGroup} />
      </div>

      <div className="section">
        <div className="section-title">X. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán chính" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Phân loại (WHO/FAB)" value={data?.classification} />
        <Field label="Giai đoạn" value={data?.stage} />
      </div>

      <div className="section">
        <div className="section-title">XI. HƯỚNG ĐIỀU TRỊ</div>
        <DottedLines content={data?.treatmentPlan} count={4} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
HuyetHocBAPrint.displayName = 'HuyetHocBAPrint';

// =====================================================================
// 7. BA NGOẠI KHOA (Surgery Medical Record)
// =====================================================================
export const NgoaiKhoaBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 07/BV1" />
      <h2>BỆNH ÁN NGOẠI KHOA</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="Bản thân (phẫu thuật trước đó)" value={data?.surgicalHistory} />
        <Field label="Nội khoa" value={data?.pastMedicalHistory} />
        <Field label="Dị ứng (thuốc, gây mê)" value={data?.allergyHistory} />
        <Field label="Gia đình" value={data?.familyHistory} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Nhịp thở" value={data?.respiratoryRate ? `${data.respiratoryRate} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
        <Field label="Khám vùng bệnh lý" value={data?.localExam} />
        <DottedLines content={data?.localExamDetail} count={3} />
        <Field label="Khám bụng" value={data?.abdominalExam} />
        <Field label="Thăm trực tràng" value={data?.rectalExam} />
      </div>

      <div className="section">
        <div className="section-title">V. CẬN LÂM SÀNG</div>
        <Field label="Xét nghiệm máu" value={data?.bloodTests} />
        <Field label="Đông máu" value={data?.coagulation} />
        <Field label="Nhóm máu" value={data?.bloodGroup} />
        <Field label="X-quang" value={data?.xray} />
        <Field label="Siêu âm" value={data?.ultrasound} />
        <Field label="CT Scanner" value={data?.ctScan} />
        <Field label="MRI" value={data?.mri} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">VI. CHẨN ĐOÁN TRƯỚC MỔ</div>
        <Field label="Chẩn đoán" value={data?.preOpDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">VII. CHỈ ĐỊNH PHẪU THUẬT</div>
        <Field label="Chỉ định mổ" value={data?.surgicalIndication} />
        <Field label="Loại phẫu thuật" value={data?.surgeryType} />
        <div className="checkbox-row">
          <Checkbox label="Mổ phiên" checked={data?.isElective} />
          <Checkbox label="Mổ cấp cứu" checked={data?.isEmergency} />
        </div>
      </div>

      <div className="section">
        <div className="section-title">VIII. PHƯƠNG PHÁP PHẪU THUẬT</div>
        <Field label="Phương pháp mổ" value={data?.surgicalMethod} />
        <Field label="Phương pháp vô cảm" value={data?.anesthesiaMethod} />
        <div className="checkbox-row">
          <Checkbox label="Gây mê NKQ" checked={data?.generalAnesthesia} />
          <Checkbox label="Tê tủy sống" checked={data?.spinalAnesthesia} />
          <Checkbox label="Tê ngoài màng cứng" checked={data?.epiduralAnesthesia} />
          <Checkbox label="Tê tại chỗ" checked={data?.localAnesthesia} />
        </div>
        <Field label="Kíp mổ" value={data?.surgicalTeam} />
        <Field label="BS gây mê" value={data?.anesthesiologist} />
      </div>

      <div className="section">
        <div className="section-title">IX. DIỄN BIẾN PHẪU THUẬT</div>
        <DottedLines content={data?.operativeFindings} count={4} />
        <Field label="Chẩn đoán sau mổ" value={data?.postOpDiagnosis} />
      </div>

      <div className="section">
        <div className="section-title">X. BIẾN CHỨNG</div>
        <Field label="Trong mổ" value={data?.intraOpComplications} />
        <Field label="Sau mổ" value={data?.postOpComplications} />
      </div>

      <div className="section">
        <div className="section-title">XI. HẬU PHẪU</div>
        <Field label="Diễn biến sau mổ" value={data?.postOpCourse} />
        <Field label="Thuốc sau mổ" value={data?.postOpMedication} />
        <Field label="Chăm sóc vết mổ" value={data?.woundCare} />
        <DottedLines content={data?.postOpPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" middleTitle="PHẪU THUẬT VIÊN" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
NgoaiKhoaBAPrint.displayName = 'NgoaiKhoaBAPrint';

// =====================================================================
// 8. BA BỎNG (Burns Medical Record)
// =====================================================================
export const BongBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 08/BV1" />
      <h2>BỆNH ÁN BỎNG</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. HOÀN CẢNH BỊ BỎNG</div>
        <Field label="Ngày giờ bị bỏng" value={data?.burnDateTime ? dayjs(data.burnDateTime).format('DD/MM/YYYY HH:mm') : undefined} />
        <Field label="Nguyên nhân bỏng" value={data?.burnCause} />
        <Field label="Tác nhân gây bỏng" value={data?.burnAgent} />
        <div className="checkbox-row">
          <Checkbox label="Nhiệt (lửa)" checked={data?.agentFire} />
          <Checkbox label="Nhiệt (nước sôi)" checked={data?.agentScald} />
          <Checkbox label="Hóa chất" checked={data?.agentChemical} />
          <Checkbox label="Điện" checked={data?.agentElectrical} />
          <Checkbox label="Bức xạ" checked={data?.agentRadiation} />
        </div>
        <Field label="Hoàn cảnh xảy ra" value={data?.burnCircumstances} />
        <Field label="Sơ cứu ban đầu" value={data?.firstAid} />
      </div>

      <div className="section">
        <div className="section-title">III. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
        <Field label="Bỏng hô hấp" value={data?.inhalationInjury} />
      </div>

      <div className="section">
        <div className="section-title">IV. DIỆN TÍCH BỎNG</div>
        <Field label="Tổng diện tích bỏng (%)" value={data?.totalBurnArea ? `${data.totalBurnArea}%` : undefined} />

        <table>
          <thead>
            <tr>
              <th>Vùng cơ thể</th><th>Độ I (%)</th><th>Độ II nông (%)</th><th>Độ II sâu (%)</th><th>Độ III (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Đầu - mặt - cổ</td><td>{data?.headDeg1 || ''}</td><td>{data?.headDeg2s || ''}</td><td>{data?.headDeg2d || ''}</td><td>{data?.headDeg3 || ''}</td></tr>
            <tr><td>Thân trước</td><td>{data?.anteriorTrunkDeg1 || ''}</td><td>{data?.anteriorTrunkDeg2s || ''}</td><td>{data?.anteriorTrunkDeg2d || ''}</td><td>{data?.anteriorTrunkDeg3 || ''}</td></tr>
            <tr><td>Thân sau</td><td>{data?.posteriorTrunkDeg1 || ''}</td><td>{data?.posteriorTrunkDeg2s || ''}</td><td>{data?.posteriorTrunkDeg2d || ''}</td><td>{data?.posteriorTrunkDeg3 || ''}</td></tr>
            <tr><td>Chi trên phải</td><td>{data?.rightArmDeg1 || ''}</td><td>{data?.rightArmDeg2s || ''}</td><td>{data?.rightArmDeg2d || ''}</td><td>{data?.rightArmDeg3 || ''}</td></tr>
            <tr><td>Chi trên trái</td><td>{data?.leftArmDeg1 || ''}</td><td>{data?.leftArmDeg2s || ''}</td><td>{data?.leftArmDeg2d || ''}</td><td>{data?.leftArmDeg3 || ''}</td></tr>
            <tr><td>Chi dưới phải</td><td>{data?.rightLegDeg1 || ''}</td><td>{data?.rightLegDeg2s || ''}</td><td>{data?.rightLegDeg2d || ''}</td><td>{data?.rightLegDeg3 || ''}</td></tr>
            <tr><td>Chi dưới trái</td><td>{data?.leftLegDeg1 || ''}</td><td>{data?.leftLegDeg2s || ''}</td><td>{data?.leftLegDeg2d || ''}</td><td>{data?.leftLegDeg3 || ''}</td></tr>
            <tr><td>Tầng sinh môn</td><td>{data?.perineumDeg1 || ''}</td><td>{data?.perineumDeg2s || ''}</td><td>{data?.perineumDeg2d || ''}</td><td>{data?.perineumDeg3 || ''}</td></tr>
            <tr style={{ fontWeight: 'bold' }}><td>TỔNG</td><td>{data?.totalDeg1 || ''}</td><td>{data?.totalDeg2s || ''}</td><td>{data?.totalDeg2d || ''}</td><td>{data?.totalDeg3 || ''}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">V. CHỈ SỐ BAUX</div>
        <div className="row">
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
          <div className="col"><Field label="% Bỏng sâu" value={data?.deepBurnPercent} /></div>
          <div className="col"><Field label="Chỉ số Baux" value={data?.bauxIndex} /></div>
        </div>
        <Field label="Phân loại" value={data?.bauxClassification} />
      </div>

      <div className="section">
        <div className="section-title">VI. CẬN LÂM SÀNG</div>
        <Field label="Xét nghiệm máu" value={data?.bloodTests} />
        <Field label="Điện giải đồ" value={data?.electrolytes} />
        <Field label="Khí máu" value={data?.bloodGas} />
        <Field label="Cấy dịch vết bỏng" value={data?.woundCulture} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">VII. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Mức độ" value={data?.severity} />
      </div>

      <div className="section">
        <div className="section-title">VIII. HƯỚNG ĐIỀU TRỊ</div>
        <Field label="Bù dịch (Parkland)" value={data?.fluidResuscitation} />
        <Field label="Giảm đau" value={data?.painManagement} />
        <Field label="Chăm sóc vết bỏng" value={data?.woundCare} />
        <Field label="Phẫu thuật (cắt lọc, ghép da)" value={data?.surgicalPlan} />
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
BongBAPrint.displayName = 'BongBAPrint';

// =====================================================================
// 9. BA UNG BƯỚU (Oncology Medical Record)
// =====================================================================
export const UngBuouBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 09/BV1" />
      <h2>BỆNH ÁN UNG BƯỚU</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <Field label="Thời gian phát hiện bệnh" value={data?.diagnosisDate ? dayjs(data.diagnosisDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Triệu chứng đầu tiên" value={data?.firstSymptom} />
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
        <Field label="Đã điều trị ở đâu" value={data?.previousTreatment} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="Bản thân (ung thư trước đó)" value={data?.previousCancerHistory} />
        <Field label="Gia đình (ung thư)" value={data?.familyCancerHistory} />
        <Field label="Hút thuốc" value={data?.smokingHistory} />
        <Field label="Rượu" value={data?.alcoholHistory} />
        <Field label="Tiếp xúc nghề nghiệp" value={data?.occupationalExposure} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
          <div className="col"><Field label="ECOG PS" value={data?.ecogPS} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
        <Field label="Khám u (vị trí, kích thước, mật độ, di động)" value={data?.tumorExam} />
        <Field label="Hạch vùng" value={data?.regionalLymphNodes} />
        <Field label="Di căn xa" value={data?.distantMetastasis} />
      </div>

      <div className="section">
        <div className="section-title">V. PHÂN LOẠI TNM</div>
        <div className="row">
          <div className="col"><Field label="T (u nguyên phát)" value={data?.tnmT} /></div>
          <div className="col"><Field label="N (hạch)" value={data?.tnmN} /></div>
          <div className="col"><Field label="M (di căn)" value={data?.tnmM} /></div>
        </div>
        <Field label="Giai đoạn" value={data?.stage} />
        <div className="checkbox-row">
          <Checkbox label="GĐ I" checked={data?.stage === 'I'} />
          <Checkbox label="GĐ II" checked={data?.stage === 'II'} />
          <Checkbox label="GĐ III" checked={data?.stage === 'III'} />
          <Checkbox label="GĐ IV" checked={data?.stage === 'IV'} />
        </div>
      </div>

      <div className="section">
        <div className="section-title">VI. MÔ BỆNH HỌC</div>
        <Field label="Mã số GPB" value={data?.pathologyCode} />
        <Field label="Loại mô bệnh học" value={data?.histologicalType} />
        <Field label="Độ biệt hóa (Grade)" value={data?.grade} />
        <Field label="Hóa mô miễn dịch" value={data?.immunohistochemistry} />
        <Field label="Đột biến gen" value={data?.geneMutations} />
      </div>

      <div className="section">
        <div className="section-title">VII. CẬN LÂM SÀNG</div>
        <Field label="Xét nghiệm máu" value={data?.bloodTests} />
        <Field label="Marker ung thư" value={data?.tumorMarkers} />
        <Field label="X-quang/CT/MRI" value={data?.imaging} />
        <Field label="PET-CT" value={data?.petCt} />
        <Field label="Nội soi" value={data?.endoscopy} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">VIII. HÓA TRỊ</div>
        <Field label="Phác đồ" value={data?.chemotherapyRegimen} />
        <Field label="Chu kỳ hiện tại / tổng số" value={data?.currentCycle} />
        <Field label="Ngày bắt đầu hóa trị" value={data?.chemoStartDate ? dayjs(data.chemoStartDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Đáp ứng" value={data?.chemoResponse} />
        <Field label="Tác dụng phụ" value={data?.chemoSideEffects} />
      </div>

      <div className="section">
        <div className="section-title">IX. XẠ TRỊ</div>
        <Field label="Vùng chiếu xạ" value={data?.radiationField} />
        <Field label="Tổng liều" value={data?.totalRadiationDose} />
        <Field label="Số buổi / đã chiếu" value={data?.radiationFractions} />
        <Field label="Kỹ thuật" value={data?.radiationTechnique} />
        <Field label="Tác dụng phụ" value={data?.radiationSideEffects} />
      </div>

      <div className="section">
        <div className="section-title">X. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">XI. KẾ HOẠCH ĐIỀU TRỊ</div>
        <div className="checkbox-row">
          <Checkbox label="Phẫu thuật" checked={data?.planSurgery} />
          <Checkbox label="Hóa trị" checked={data?.planChemo} />
          <Checkbox label="Xạ trị" checked={data?.planRadiation} />
          <Checkbox label="Miễn dịch" checked={data?.planImmunotherapy} />
          <Checkbox label="Nội tiết" checked={data?.planHormonal} />
          <Checkbox label="Chăm sóc giảm nhẹ" checked={data?.planPalliative} />
        </div>
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
UngBuouBAPrint.displayName = 'UngBuouBAPrint';

// =====================================================================
// 10. BA RĂNG HÀM MẶT (Dentistry / Maxillofacial Medical Record)
// =====================================================================
export const RHMBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 10/BV1" />
      <h2>BỆNH ÁN RĂNG HÀM MẶT</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="Răng miệng" value={data?.dentalHistory} />
        <Field label="Nội/ngoại khoa" value={data?.pastMedicalHistory} />
        <Field label="Dị ứng" value={data?.allergyHistory} />
        <Field label="Gia đình" value={data?.familyHistory} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM NGOÀI MẶT</div>
        <Field label="Khuôn mặt" value={data?.facialExam} />
        <Field label="Khớp thái dương hàm" value={data?.tmjExam} />
        <Field label="Hạch cổ" value={data?.cervicalLymphNodes} />
        <Field label="Há miệng" value={data?.mouthOpening} />
      </div>

      <div className="section">
        <div className="section-title">V. SƠ ĐỒ RĂNG</div>
        <div style={{ textAlign: 'center', margin: '8px 0', fontFamily: 'monospace', fontSize: '14px' }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 'bold' }}>HÀM TRÊN (Phải) </span>
            {'18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28'}
            <span style={{ fontWeight: 'bold' }}> (Trái)</span>
          </div>
          <div style={{ borderBottom: '2px solid #000', margin: '4px 40px' }} />
          <div>
            <span style={{ fontWeight: 'bold' }}>HÀM DƯỚI (Phải) </span>
            {'48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38'}
            <span style={{ fontWeight: 'bold' }}> (Trái)</span>
          </div>
        </div>
        <Field label="Ghi chú sơ đồ răng" value={data?.dentalChartNotes} />
      </div>

      <div className="section">
        <div className="section-title">VI. TÌNH TRẠNG NHA CHU</div>
        <Field label="Nướu (lợi)" value={data?.gingiva} />
        <Field label="Túi nha chu" value={data?.periodontalPockets} />
        <Field label="Lung lay răng" value={data?.toothMobility} />
        <Field label="Vôi răng" value={data?.calculus} />
        <Field label="Chỉ số nha chu (CPI)" value={data?.cpiIndex} />
      </div>

      <div className="section">
        <div className="section-title">VII. KHÁM TRONG MIỆNG</div>
        <Field label="Niêm mạc miệng" value={data?.oralMucosa} />
        <Field label="Lưỡi" value={data?.tongue} />
        <Field label="Sàn miệng" value={data?.floorOfMouth} />
        <Field label="Vòm miệng" value={data?.palate} />
        <Field label="Khớp cắn" value={data?.occlusion} />
      </div>

      <div className="section">
        <div className="section-title">VIII. CẬN LÂM SÀNG</div>
        <Field label="X-quang toàn cảnh (Panorama)" value={data?.panoramicXray} />
        <Field label="X-quang cận chóp" value={data?.periapicalXray} />
        <Field label="CBCT" value={data?.cbct} />
        <Field label="Xét nghiệm" value={data?.labTests} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">IX. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán chính" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Chẩn đoán phụ" value={data?.secondaryDiagnosis} />
      </div>

      <div className="section">
        <div className="section-title">X. KẾ HOẠCH ĐIỀU TRỊ</div>
        <DottedLines content={data?.treatmentPlan} count={4} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
RHMBAPrint.displayName = 'RHMBAPrint';

// =====================================================================
// 11. BA TAI MŨI HỌNG (ENT Medical Record)
// =====================================================================
export const TMHBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 11/BV1" />
      <h2>BỆNH ÁN TAI MŨI HỌNG</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="TMH" value={data?.entHistory} />
        <Field label="Nội/ngoại khoa" value={data?.pastMedicalHistory} />
        <Field label="Dị ứng" value={data?.allergyHistory} />
        <Field label="Gia đình" value={data?.familyHistory} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM TOÀN THÂN</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
      </div>

      <div className="section">
        <div className="section-title">V. KHÁM TAI</div>
        <h3>Tai phải</h3>
        <Field label="Vành tai" value={data?.rightPinna} />
        <Field label="Ống tai ngoài" value={data?.rightEarCanal} />
        <Field label="Màng nhĩ" value={data?.rightTympanicMembrane} />
        <Field label="Dịch tai" value={data?.rightEarDischarge} />

        <h3>Tai trái</h3>
        <Field label="Vành tai" value={data?.leftPinna} />
        <Field label="Ống tai ngoài" value={data?.leftEarCanal} />
        <Field label="Màng nhĩ" value={data?.leftTympanicMembrane} />
        <Field label="Dịch tai" value={data?.leftEarDischarge} />

        <h3>Thính lực</h3>
        <Field label="Thính lực đồ" value={data?.audiogram} />
        <Field label="Nghiệm pháp Weber" value={data?.weberTest} />
        <Field label="Nghiệm pháp Rinne" value={data?.rinneTest} />
        <Field label="Nhĩ lượng đồ (Tympanogram)" value={data?.tympanogram} />
      </div>

      <div className="section">
        <div className="section-title">VI. KHÁM MŨI</div>
        <Field label="Tháp mũi" value={data?.nasal} />
        <Field label="Niêm mạc mũi" value={data?.nasalMucosa} />
        <Field label="Vách ngăn" value={data?.nasalSeptum} />
        <Field label="Cuốn mũi" value={data?.turbinates} />
        <Field label="Khe mũi" value={data?.nasalMeatus} />
        <Field label="Dịch mũi" value={data?.nasalDischarge} />
        <Field label="Nội soi mũi xoang" value={data?.nasalEndoscopy} />
      </div>

      <div className="section">
        <div className="section-title">VII. KHÁM HỌNG - THANH QUẢN</div>
        <Field label="Hầu họng" value={data?.pharynx} />
        <Field label="Amidan" value={data?.tonsils} />
        <Field label="VA (trẻ em)" value={data?.adenoids} />
        <Field label="Hạ họng" value={data?.hypopharynx} />
        <Field label="Thanh quản" value={data?.larynx} />
        <Field label="Dây thanh" value={data?.vocalCords} />
        <Field label="Nội soi thanh quản" value={data?.laryngoscopy} />
      </div>

      <div className="section">
        <div className="section-title">VIII. CẬN LÂM SÀNG</div>
        <Field label="CT xoang" value={data?.sinusCt} />
        <Field label="CT xương thái dương" value={data?.temporalBoneCt} />
        <Field label="X-quang" value={data?.xray} />
        <Field label="Xét nghiệm máu" value={data?.bloodTests} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">IX. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán chính" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Chẩn đoán phụ" value={data?.secondaryDiagnosis} />
      </div>

      <div className="section">
        <div className="section-title">X. HƯỚNG ĐIỀU TRỊ</div>
        <DottedLines content={data?.treatmentPlan} count={4} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
TMHBAPrint.displayName = 'TMHBAPrint';

// =====================================================================
// 12. BA NGOẠI TRÚ CHUNG (General Outpatient Medical Record)
// =====================================================================
export const NgoaiTruChungBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 12/BV1" />
      <h2>BỆNH ÁN NGOẠI TRÚ</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
          <div className="col"><Field label="Số BHYT" value={data?.insuranceNumber} /></div>
        </div>
        <Field label="Địa chỉ" value={data?.address} />
        <div className="row">
          <div className="col"><Field label="SĐT" value={data?.phoneNumber} /></div>
          <div className="col"><Field label="Nghề nghiệp" value={data?.occupation} /></div>
        </div>
        <Field label="Ngày khám" value={data?.examDate ? dayjs(data.examDate).format('DD/MM/YYYY HH:mm') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">I. LÝ DO KHÁM</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="HA" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Nhịp thở" value={data?.respiratoryRate ? `${data.respiratoryRate} l/p` : undefined} /></div>
        </div>
        <Field label="Khám lâm sàng" value={data?.clinicalExam} />
        <DottedLines content={data?.clinicalExamDetail} count={4} />
      </div>

      <div className="section">
        <div className="section-title">III. CẬN LÂM SÀNG TÓM TẮT</div>
        <DottedLines content={data?.labSummary} count={3} />
      </div>

      <div className="section">
        <div className="section-title">IV. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">V. ĐƠN THUỐC</div>
        {data?.prescriptions?.length > 0 ? (
          <table>
            <thead>
              <tr><th>STT</th><th>Tên thuốc</th><th>ĐVT</th><th>SL</th><th>Cách dùng</th></tr>
            </thead>
            <tbody>
              {data.prescriptions.map((rx: any, i: number) => (
                <tr key={rx.id || i}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td>{rx.medicineName}</td>
                  <td>{rx.unit}</td>
                  <td style={{ textAlign: 'center' }}>{rx.quantity}</td>
                  <td>{rx.dosageInstruction}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <DottedLines count={4} />
        )}
      </div>

      <div className="section">
        <div className="section-title">VI. HẸN TÁI KHÁM</div>
        <Field label="Ngày tái khám" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Lời dặn" value={data?.followUpInstructions} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="BÁC SĨ KHÁM" date={data?.examDate} />
    </div>
  )
);
NgoaiTruChungBAPrint.displayName = 'NgoaiTruChungBAPrint';

// =====================================================================
// 13. BA NGOẠI TRÚ RĂNG HÀM MẶT (Outpatient Dental Record)
// =====================================================================
export const NgoaiTruRHMBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 13/BV1" />
      <h2>BỆNH ÁN NGOẠI TRÚ RĂNG HÀM MẶT</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
          <div className="col"><Field label="Số BHYT" value={data?.insuranceNumber} /></div>
          <div className="col"><Field label="SĐT" value={data?.phoneNumber} /></div>
        </div>
        <Field label="Địa chỉ" value={data?.address} />
        <Field label="Ngày khám" value={data?.examDate ? dayjs(data.examDate).format('DD/MM/YYYY') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">I. LÝ DO KHÁM</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. TIỀN SỬ RĂNG MIỆNG</div>
        <Field label="Tiền sử nha khoa" value={data?.dentalHistory} />
        <Field label="Dị ứng" value={data?.allergyHistory} />
        <Field label="Bệnh toàn thân" value={data?.systemicDisease} />
      </div>

      <div className="section">
        <div className="section-title">III. KHÁM NGOÀI MẶT</div>
        <Field label="Khuôn mặt" value={data?.facialExam} />
        <Field label="TMJ" value={data?.tmjExam} />
        <Field label="Hạch" value={data?.lymphNodes} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM TRONG MIỆNG</div>
        <Field label="Niêm mạc" value={data?.oralMucosa} />
        <Field label="Nướu" value={data?.gingiva} />
        <Field label="Lưỡi" value={data?.tongue} />
        <Field label="Khớp cắn" value={data?.occlusion} />
      </div>

      <div className="section">
        <div className="section-title">V. SƠ ĐỒ RĂNG</div>
        <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', margin: '8px 0' }}>
          <div>{'18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28'}</div>
          <div style={{ borderBottom: '2px solid #000', margin: '4px 60px' }} />
          <div>{'48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38'}</div>
        </div>
        <Field label="Tình trạng răng" value={data?.dentalStatus} />
      </div>

      <div className="section">
        <div className="section-title">VI. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">VII. ĐIỀU TRỊ THỰC HIỆN</div>
        <DottedLines content={data?.treatmentPerformed} count={4} />
      </div>

      <div className="section">
        <div className="section-title">VIII. ĐƠN THUỐC VÀ DẶN DÒ</div>
        <DottedLines content={data?.prescription} count={3} />
        <Field label="Hẹn tái khám" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.examDate} />
    </div>
  )
);
NgoaiTruRHMBAPrint.displayName = 'NgoaiTruRHMBAPrint';

// =====================================================================
// 14. BA TUYẾN XÃ (Commune Health Station Medical Record)
// =====================================================================
export const TuyenXaBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 14/BV1" />
      <h2>BỆNH ÁN TUYẾN XÃ</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 12 }}>
        (Mẫu đơn giản hóa dùng cho trạm y tế xã/phường)
      </div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
        </div>
        <Field label="Địa chỉ" value={data?.address} />
        <div className="row">
          <div className="col"><Field label="SĐT" value={data?.phoneNumber} /></div>
          <div className="col"><Field label="Số BHYT" value={data?.insuranceNumber} /></div>
        </div>
        <Field label="Ngày đến khám" value={data?.examDate ? dayjs(data.examDate).format('DD/MM/YYYY HH:mm') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">1. LÝ DO ĐẾN KHÁM</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">2. BỆNH SỬ TÓM TẮT</div>
        <DottedLines content={data?.briefHistory} count={3} />
      </div>

      <div className="section">
        <div className="section-title">3. TIỀN SỬ</div>
        <Field label="Bệnh đã mắc" value={data?.pastHistory} />
        <Field label="Dị ứng" value={data?.allergy} />
      </div>

      <div className="section">
        <div className="section-title">4. KHÁM</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature} /></div>
          <div className="col"><Field label="HA" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Cân nặng" value={data?.weight} /></div>
        </div>
        <Field label="Khám lâm sàng" value={data?.clinicalExam} />
        <DottedLines content={data?.examFindings} count={3} />
      </div>

      <div className="section">
        <div className="section-title">5. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán" value={data?.diagnosis} />
      </div>

      <div className="section">
        <div className="section-title">6. XỬ TRÍ</div>
        <div className="checkbox-row">
          <Checkbox label="Điều trị tại chỗ" checked={data?.treatLocally} />
          <Checkbox label="Chuyển tuyến trên" checked={data?.referUp} />
        </div>
        <DottedLines content={data?.treatment} count={3} />
      </div>

      <div className="section">
        <div className="section-title">7. ĐƠN THUỐC</div>
        <DottedLines content={data?.prescription} count={4} />
      </div>

      <div className="section">
        <Field label="Hẹn khám lại" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Dặn dò" value={data?.instructions} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="Y/BÁC SĨ KHÁM" date={data?.examDate} />
    </div>
  )
);
TuyenXaBAPrint.displayName = 'TuyenXaBAPrint';

// =====================================================================
// 15. BA YHCT NỘI TRÚ (Inpatient Traditional Medicine Medical Record)
// =====================================================================
export const YHCTNoiTruBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 15/BV1" />
      <h2>BỆNH ÁN Y HỌC CỔ TRUYỀN NỘI TRÚ</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="Bản thân" value={data?.pastMedicalHistory} />
        <Field label="Gia đình" value={data?.familyHistory} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM Y HỌC HIỆN ĐẠI</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} lần/phút` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
          <div className="col"><Field label="Huyết áp" value={data?.bloodPressure} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
        <Field label="Các cơ quan" value={data?.systemicExam} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">V. TỨ CHẨN (Bốn phương pháp chẩn đoán YHCT)</div>

        <h3>1. VỌNG CHẨN (Nhìn)</h3>
        <Field label="Thần sắc" value={data?.spirit} />
        <Field label="Hình thái" value={data?.bodyShape} />
        <Field label="Sắc mặt" value={data?.complexion} />
        <Field label="Lưỡi (chất lưỡi)" value={data?.tongueBody} />
        <Field label="Rêu lưỡi" value={data?.tongueCoating} />
        <Field label="Da, niêm mạc" value={data?.skinMucosa} />

        <h3>2. VĂN CHẨN (Nghe - Ngửi)</h3>
        <Field label="Giọng nói, tiếng thở" value={data?.voiceBreathing} />
        <Field label="Ho" value={data?.cough} />
        <Field label="Mùi (miệng, cơ thể, phân)" value={data?.bodyOdor} />

        <h3>3. VẤN CHẨN (Hỏi)</h3>
        <Field label="Hàn nhiệt (sợ nóng/sợ lạnh)" value={data?.coldHeat} />
        <Field label="Mồ hôi" value={data?.sweating} />
        <Field label="Đau (vị trí, tính chất)" value={data?.pain} />
        <Field label="Ăn uống, vị giác" value={data?.dietTaste} />
        <Field label="Đại tiện" value={data?.bowelMovement} />
        <Field label="Tiểu tiện" value={data?.urination} />
        <Field label="Ngủ" value={data?.sleep} />
        <Field label="Kinh nguyệt (nữ)" value={data?.menstruation} />

        <h3>4. THIẾT CHẨN (Sờ nắn)</h3>
        <Field label="Mạch (tay trái)" value={data?.leftPulse} />
        <Field label="Mạch (tay phải)" value={data?.rightPulse} />
        <Field label="Tính chất mạch (phù/trầm/sác/trì/hoạt/sáp...)" value={data?.pulseCharacter} />
        <Field label="Bụng" value={data?.abdominalPalpation} />
        <Field label="Huyệt đau" value={data?.tenderPoints} />
      </div>

      <div className="section">
        <div className="section-title">VI. BIỆN CHỨNG LUẬN TRỊ</div>
        <Field label="Bát cương (Biểu/Lý, Hàn/Nhiệt, Hư/Thực, Âm/Dương)" value={data?.eightPrinciples} />
        <Field label="Tạng phủ bệnh" value={data?.affectedOrgan} />
        <Field label="Chẩn đoán YHCT (bệnh danh)" value={data?.tcmDiagnosis} />
        <Field label="Chẩn đoán YHHĐ" value={data?.westernDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Pháp trị" value={data?.treatmentPrinciple} />
      </div>

      <div className="section">
        <div className="section-title">VII. PHƯƠNG PHÁP ĐIỀU TRỊ</div>

        <h3>1. Thuốc YHCT</h3>
        <Field label="Bài thuốc" value={data?.herbalFormula} />
        {data?.herbs?.length > 0 ? (
          <table>
            <thead>
              <tr><th>STT</th><th>Vị thuốc</th><th>Liều lượng (g)</th><th>Ghi chú</th></tr>
            </thead>
            <tbody>
              {data.herbs.map((herb: any, i: number) => (
                <tr key={herb.id || i}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td>{herb.name}</td>
                  <td style={{ textAlign: 'center' }}>{herb.dosage}</td>
                  <td>{herb.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <DottedLines count={4} />
        )}
        <Field label="Cách sắc/uống" value={data?.herbalPreparation} />

        <h3>2. Châm cứu</h3>
        <Field label="Phương huyệt" value={data?.acupuncturePoints} />
        <Field label="Kỹ thuật (hào châm, điện châm, cứu ngải)" value={data?.acupunctureTechnique} />
        <Field label="Thời gian mỗi lần" value={data?.acupunctureDuration} />
        <Field label="Số buổi/tuần" value={data?.acupunctureFrequency} />

        <h3>3. Xoa bóp bấm huyệt</h3>
        <Field label="Vùng xoa bóp" value={data?.massageArea} />
        <Field label="Kỹ thuật" value={data?.massageTechnique} />
        <Field label="Thời gian" value={data?.massageDuration} />

        <h3>4. Phương pháp khác</h3>
        <div className="checkbox-row">
          <Checkbox label="Giác hơi" checked={data?.cupping} />
          <Checkbox label="Thuỷ châm" checked={data?.pharmacopuncture} />
          <Checkbox label="Cấy chỉ" checked={data?.threadEmbedding} />
          <Checkbox label="Khí công" checked={data?.qigong} />
          <Checkbox label="Xông hơi thuốc" checked={data?.herbalSteam} />
        </div>
        <DottedLines content={data?.otherTreatment} count={2} />
      </div>

      <div className="section">
        <div className="section-title">VIII. CẬN LÂM SÀNG</div>
        <DottedLines content={data?.labResults} count={3} />
      </div>

      <div className="section">
        <div className="section-title">IX. TIÊN LƯỢNG</div>
        <DottedLines content={data?.prognosis} count={2} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
YHCTNoiTruBAPrint.displayName = 'YHCTNoiTruBAPrint';
