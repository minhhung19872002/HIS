import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';

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
.emr-print-container .checkbox-row { display: flex; gap: 24px; margin: 4px 0; flex-wrap: wrap; }
.emr-print-container .checkbox-item { display: flex; align-items: center; gap: 4px; }
.emr-print-container .checkbox-box { width: 14px; height: 14px; border: 1px solid #000; display: inline-block; text-align: center; line-height: 14px; font-size: 11px; }
.emr-print-container .dotted-line { border-bottom: 1px dotted #999; min-height: 22px; margin: 2px 0; }
.emr-print-container .dotted-lines-block { margin: 4px 0; }
.emr-print-container .dotted-lines-block .dotted-line { margin: 6px 0; }
`;

const PrintHeader: React.FC<{ formNumber?: string }> = ({ formNumber }) => (
  <div className="header">
    <div className="ministry">BỘ Y TẾ</div>
    <div className="hospital-name">{HOSPITAL_NAME}</div>
    <div style={{ fontSize: 11 }}>{HOSPITAL_ADDRESS} - ĐT: {HOSPITAL_PHONE}</div>
    {formNumber && <div className="form-number">Mẫu số: {formNumber}</div>}
  </div>
);

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

const Field: React.FC<{ label: string; value?: string | number | null; wide?: boolean }> = ({ label, value, wide }) => (
  <div className="field">
    <span className="field-label">{label}: </span>
    <span className="field-value" style={wide ? { minWidth: 300 } : undefined}>{value ?? '...........................'}</span>
  </div>
);

const Checkbox: React.FC<{ label: string; checked?: boolean }> = ({ label, checked }) => (
  <span className="checkbox-item">
    <span className="checkbox-box">{checked ? '✓' : ''}</span>
    <span>{label}</span>
  </span>
);

const DottedLines: React.FC<{ count?: number; content?: string }> = ({ count = 3, content }) => (
  <div className="dotted-lines-block">
    {content ? (
      <div style={{ borderBottom: '1px dotted #999', padding: '2px 0', whiteSpace: 'pre-wrap' }}>{content}</div>
    ) : (
      Array.from({ length: count }).map((_, i) => <div key={i} className="dotted-line" />)
    )}
  </div>
);

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
// 16. BA YHCT NGOẠI TRÚ (Outpatient Traditional Medicine)
// =====================================================================
export const YHCTNgoaiTruBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 16/BV1" />
      <h2>BỆNH ÁN Y HỌC CỔ TRUYỀN NGOẠI TRÚ</h2>
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
        <div className="section-title">II. TỨ CHẨN</div>
        <h3>1. Vọng chẩn</h3>
        <Field label="Thần sắc" value={data?.spirit} />
        <Field label="Lưỡi (chất lưỡi, rêu)" value={data?.tongue} />

        <h3>2. Văn chẩn</h3>
        <Field label="Giọng nói, hơi thở" value={data?.voiceBreathing} />

        <h3>3. Vấn chẩn</h3>
        <Field label="Hàn nhiệt" value={data?.coldHeat} />
        <Field label="Mồ hôi" value={data?.sweating} />
        <Field label="Đau" value={data?.pain} />
        <Field label="Ăn uống" value={data?.diet} />
        <Field label="Đại/tiểu tiện" value={data?.excretion} />
        <Field label="Ngủ" value={data?.sleep} />

        <h3>4. Thiết chẩn</h3>
        <Field label="Mạch" value={data?.pulseCharacter} />
        <Field label="Xúc chẩn" value={data?.palpation} />
      </div>

      <div className="section">
        <div className="section-title">III. KHÁM YHHĐ</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} l/p` : undefined} /></div>
          <div className="col"><Field label="HA" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
        </div>
        <DottedLines content={data?.westernExam} count={2} />
      </div>

      <div className="section">
        <div className="section-title">IV. CHẨN ĐOÁN</div>
        <Field label="Bệnh danh YHCT" value={data?.tcmDiagnosis} />
        <Field label="Bát cương" value={data?.eightPrinciples} />
        <Field label="Chẩn đoán YHHĐ" value={data?.westernDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">V. PHÁP TRỊ VÀ ĐIỀU TRỊ</div>
        <Field label="Pháp trị" value={data?.treatmentPrinciple} />
        <Field label="Bài thuốc" value={data?.herbalFormula} />
        <DottedLines content={data?.prescription} count={4} />
        <Field label="Châm cứu / xoa bóp" value={data?.acupunctureMassage} />
        <Field label="Hẹn tái khám" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="BÁC SĨ YHCT" date={data?.examDate} />
    </div>
  )
);
YHCTNgoaiTruBAPrint.displayName = 'YHCTNgoaiTruBAPrint';

// =====================================================================
// 17. BA NHI YHCT (Pediatric Traditional Medicine)
// =====================================================================
export const NhiYHCTBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 17/BV1" />
      <h2>BỆNH ÁN NHI Y HỌC CỔ TRUYỀN</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên bệnh nhi" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Ngày sinh" value={data?.dateOfBirth ? dayjs(data.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
        </div>
        <Field label="Họ tên bố/mẹ" value={data?.parentName} />
        <Field label="Địa chỉ" value={data?.address} />
        <div className="row">
          <div className="col"><Field label="SĐT" value={data?.phoneNumber} /></div>
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
          <div className="col"><Field label="Số BHYT" value={data?.insuranceNumber} /></div>
        </div>
        <Field label="Ngày vào viện" value={data?.admissionDate ? dayjs(data.admissionDate).format('DD/MM/YYYY HH:mm') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. TIỀN SỬ</div>
        <Field label="Thai kỳ, sinh" value={data?.birthHistory} />
        <Field label="Phát triển" value={data?.developmentHistory} />
        <Field label="Tiêm chủng" value={data?.vaccinationHistory} />
        <Field label="Dinh dưỡng (bú mẹ/sữa công thức)" value={data?.nutritionHistory} />
        <Field label="Bệnh đã mắc" value={data?.pastIllness} />
        <Field label="Gia đình" value={data?.familyHistory} />
      </div>

      <div className="section">
        <div className="section-title">III. BỆNH SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={4} />
      </div>

      <div className="section">
        <div className="section-title">IV. TỨ CHẨN TRẺ EM</div>

        <h3>1. Vọng chẩn</h3>
        <Field label="Thần sắc, tinh thần" value={data?.spiritAppearance} />
        <Field label="Sắc mặt" value={data?.complexion} />
        <Field label="Hình thể" value={data?.bodyShape} />
        <Field label="Chỉ tay (trẻ &lt; 3 tuổi)" value={data?.fingerVein} />
        <Field label="Lưỡi" value={data?.tongue} />
        <Field label="Rêu lưỡi" value={data?.tongueCoating} />

        <h3>2. Văn chẩn</h3>
        <Field label="Tiếng khóc" value={data?.cryingSound} />
        <Field label="Tiếng ho" value={data?.coughSound} />
        <Field label="Hơi thở" value={data?.breathingSound} />
        <Field label="Mùi" value={data?.bodyOdor} />

        <h3>3. Vấn chẩn (hỏi bố/mẹ)</h3>
        <Field label="Sốt/rét" value={data?.feverChills} />
        <Field label="Mồ hôi" value={data?.sweating} />
        <Field label="Ăn/bú" value={data?.feeding} />
        <Field label="Nôn/trớ" value={data?.vomiting} />
        <Field label="Đại tiện" value={data?.bowelMovement} />
        <Field label="Tiểu tiện" value={data?.urination} />
        <Field label="Ngủ" value={data?.sleep} />

        <h3>4. Thiết chẩn</h3>
        <Field label="Sờ da (nóng/lạnh/ẩm)" value={data?.skinPalpation} />
        <Field label="Sờ bụng" value={data?.abdominalPalpation} />
        <Field label="Thóp (trẻ nhỏ)" value={data?.fontanelle} />
      </div>

      <div className="section">
        <div className="section-title">V. KHÁM YHHĐ</div>
        <div className="row">
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
          <div className="col"><Field label="Chiều cao" value={data?.height ? `${data.height} cm` : undefined} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} l/p` : undefined} /></div>
          <div className="col"><Field label="Nhịp thở" value={data?.respiratoryRate ? `${data.respiratoryRate} l/p` : undefined} /></div>
        </div>
        <DottedLines content={data?.westernExam} count={2} />
      </div>

      <div className="section">
        <div className="section-title">VI. CHẨN ĐOÁN</div>
        <Field label="Bệnh danh YHCT" value={data?.tcmDiagnosis} />
        <Field label="Bát cương" value={data?.eightPrinciples} />
        <Field label="Chẩn đoán YHHĐ" value={data?.westernDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">VII. ĐIỀU TRỊ</div>
        <Field label="Pháp trị" value={data?.treatmentPrinciple} />
        <Field label="Bài thuốc (liều trẻ em)" value={data?.herbalFormula} />
        <DottedLines content={data?.prescription} count={3} />
        <Field label="Châm cứu / xoa bóp nhi khoa" value={data?.pediatricTreatment} />
        <Field label="Dặn dò bố/mẹ" value={data?.parentInstructions} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
NhiYHCTBAPrint.displayName = 'NhiYHCTBAPrint';

// =====================================================================
// 18. BA MẮT CHUNG (General Ophthalmology)
// =====================================================================
export const MatBenhAnPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 18/BV1" />
      <h2>BỆNH ÁN MẮT</h2>
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
        <Field label="Mắt" value={data?.eyeHistory} />
        <Field label="Nội/ngoại khoa" value={data?.pastMedicalHistory} />
        <Field label="Gia đình (mắt)" value={data?.familyEyeHistory} />
      </div>

      <div className="section">
        <div className="section-title">IV. THỊ LỰC</div>
        <table>
          <thead>
            <tr><th></th><th>Mắt phải (MP)</th><th>Mắt trái (MT)</th></tr>
          </thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Thị lực không kính</td><td>{data?.vaRightUncorrected || '...'}</td><td>{data?.vaLeftUncorrected || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Thị lực có kính</td><td>{data?.vaRightCorrected || '...'}</td><td>{data?.vaLeftCorrected || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Thị lực lỗ kim</td><td>{data?.vaRightPinhole || '...'}</td><td>{data?.vaLeftPinhole || '...'}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">V. NHÃN ÁP</div>
        <div className="row">
          <div className="col"><Field label="Mắt phải" value={data?.iopRight ? `${data.iopRight} mmHg` : undefined} /></div>
          <div className="col"><Field label="Mắt trái" value={data?.iopLeft ? `${data.iopLeft} mmHg` : undefined} /></div>
          <div className="col"><Field label="Phương pháp" value={data?.iopMethod} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">VI. KHÁM MẮT</div>
        <h3>Mắt phải</h3>
        <Field label="Mi mắt" value={data?.rightEyelid} />
        <Field label="Kết mạc" value={data?.rightConjunctiva} />
        <Field label="Giác mạc" value={data?.rightCornea} />
        <Field label="Tiền phòng" value={data?.rightAnteriorChamber} />
        <Field label="Mống mắt" value={data?.rightIris} />
        <Field label="Đồng tử" value={data?.rightPupil} />
        <Field label="Thể thủy tinh" value={data?.rightLens} />

        <h3>Mắt trái</h3>
        <Field label="Mi mắt" value={data?.leftEyelid} />
        <Field label="Kết mạc" value={data?.leftConjunctiva} />
        <Field label="Giác mạc" value={data?.leftCornea} />
        <Field label="Tiền phòng" value={data?.leftAnteriorChamber} />
        <Field label="Mống mắt" value={data?.leftIris} />
        <Field label="Đồng tử" value={data?.leftPupil} />
        <Field label="Thể thủy tinh" value={data?.leftLens} />
      </div>

      <div className="section">
        <div className="section-title">VII. SOI ĐÁY MẮT</div>
        <h3>Mắt phải</h3>
        <Field label="Gai thị" value={data?.rightOpticDisc} />
        <Field label="Mạch máu võng mạc" value={data?.rightRetinalVessels} />
        <Field label="Hoàng điểm" value={data?.rightMacula} />
        <Field label="Võng mạc ngoại vi" value={data?.rightPeripheralRetina} />

        <h3>Mắt trái</h3>
        <Field label="Gai thị" value={data?.leftOpticDisc} />
        <Field label="Mạch máu võng mạc" value={data?.leftRetinalVessels} />
        <Field label="Hoàng điểm" value={data?.leftMacula} />
        <Field label="Võng mạc ngoại vi" value={data?.leftPeripheralRetina} />
      </div>

      <div className="section">
        <div className="section-title">VIII. SINH HIỂN VI (Slit-lamp)</div>
        <DottedLines content={data?.slitLampExam} count={3} />
      </div>

      <div className="section">
        <div className="section-title">IX. CẬN LÂM SÀNG</div>
        <Field label="OCT" value={data?.oct} />
        <Field label="Siêu âm mắt" value={data?.eyeUltrasound} />
        <Field label="Chụp huỳnh quang (FA)" value={data?.fluoresceinAngio} />
        <Field label="Thị trường" value={data?.visualField} />
        <Field label="Xét nghiệm khác" value={data?.otherTests} />
      </div>

      <div className="section">
        <div className="section-title">X. CHẨN ĐOÁN</div>
        <Field label="Mắt phải" value={data?.diagnosisRight} />
        <Field label="Mắt trái" value={data?.diagnosisLeft} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">XI. HƯỚNG ĐIỀU TRỊ</div>
        <DottedLines content={data?.treatmentPlan} count={4} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
MatBenhAnPrint.displayName = 'MatBenhAnPrint';

// =====================================================================
// 19. MẮT GLAUCOMA
// =====================================================================
export const MatGlaucomaPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 19/BV1" />
      <h2>BỆNH ÁN MẮT - GLAUCOMA</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ VÀ TIỀN SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={3} />
        <Field label="Tiền sử glaucoma gia đình" value={data?.familyGlaucomaHistory} />
        <Field label="Thuốc hạ nhãn áp đang dùng" value={data?.currentGlaucomaMeds} />
        <Field label="Phẫu thuật mắt trước" value={data?.previousEyeSurgery} />
      </div>

      <div className="section">
        <div className="section-title">III. THỊ LỰC</div>
        <div className="row">
          <div className="col"><Field label="MP (không kính)" value={data?.vaRightUncorrected} /></div>
          <div className="col"><Field label="MT (không kính)" value={data?.vaLeftUncorrected} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="MP (có kính)" value={data?.vaRightCorrected} /></div>
          <div className="col"><Field label="MT (có kính)" value={data?.vaLeftCorrected} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">IV. NHÃN ÁP</div>
        <table>
          <thead>
            <tr><th>Thời điểm</th><th>MP (mmHg)</th><th>MT (mmHg)</th><th>Phương pháp</th></tr>
          </thead>
          <tbody>
            <tr><td>Lần 1</td><td>{data?.iopRight1 || '...'}</td><td>{data?.iopLeft1 || '...'}</td><td>{data?.iopMethod1 || 'Goldmann'}</td></tr>
            <tr><td>Lần 2</td><td>{data?.iopRight2 || '...'}</td><td>{data?.iopLeft2 || '...'}</td><td>{data?.iopMethod2 || ''}</td></tr>
            <tr><td>Lần 3</td><td>{data?.iopRight3 || '...'}</td><td>{data?.iopLeft3 || '...'}</td><td>{data?.iopMethod3 || ''}</td></tr>
          </tbody>
        </table>
        <Field label="Nhãn áp đích (target IOP)" value={data?.targetIop} />
      </div>

      <div className="section">
        <div className="section-title">V. GONIOSCOPY (Soi góc tiền phòng)</div>
        <table>
          <thead>
            <tr><th>Góc</th><th>MP (Shaffer)</th><th>MT (Shaffer)</th></tr>
          </thead>
          <tbody>
            <tr><td>Trên</td><td>{data?.gonioRightSuperior || '...'}</td><td>{data?.gonioLeftSuperior || '...'}</td></tr>
            <tr><td>Dưới</td><td>{data?.gonioRightInferior || '...'}</td><td>{data?.gonioLeftInferior || '...'}</td></tr>
            <tr><td>Mũi</td><td>{data?.gonioRightNasal || '...'}</td><td>{data?.gonioLeftNasal || '...'}</td></tr>
            <tr><td>Thái dương</td><td>{data?.gonioRightTemporal || '...'}</td><td>{data?.gonioLeftTemporal || '...'}</td></tr>
          </tbody>
        </table>
        <Field label="Dính góc (PAS)" value={data?.peripheralAnteriorSynechiae} />
        <Field label="Sắc tố" value={data?.pigmentation} />
      </div>

      <div className="section">
        <div className="section-title">VI. THỊ TRƯỜNG</div>
        <div className="row">
          <div className="col"><Field label="MP - MD" value={data?.vfRightMD} /></div>
          <div className="col"><Field label="MP - PSD" value={data?.vfRightPSD} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="MT - MD" value={data?.vfLeftMD} /></div>
          <div className="col"><Field label="MT - PSD" value={data?.vfLeftPSD} /></div>
        </div>
        <Field label="Phân loại tổn thương thị trường" value={data?.vfClassification} />
        <Field label="Ghi chú" value={data?.vfNotes} />
      </div>

      <div className="section">
        <div className="section-title">VII. OCT DÂY THẦN KINH THỊ GIÁC</div>
        <div className="row">
          <div className="col"><Field label="MP - RNFL trung bình" value={data?.octRightRnfl} /></div>
          <div className="col"><Field label="MT - RNFL trung bình" value={data?.octLeftRnfl} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="MP - C/D ratio" value={data?.octRightCdRatio} /></div>
          <div className="col"><Field label="MT - C/D ratio" value={data?.octLeftCdRatio} /></div>
        </div>
        <Field label="Nhận xét OCT" value={data?.octNotes} />
      </div>

      <div className="section">
        <div className="section-title">VIII. CHẨN ĐOÁN</div>
        <Field label="Loại glaucoma" value={data?.glaucomaType} />
        <div className="checkbox-row">
          <Checkbox label="Góc mở nguyên phát" checked={data?.typeOpenAngle} />
          <Checkbox label="Góc đóng nguyên phát" checked={data?.typeClosedAngle} />
          <Checkbox label="Thứ phát" checked={data?.typeSecondary} />
          <Checkbox label="Bẩm sinh" checked={data?.typeCongenital} />
        </div>
        <Field label="Giai đoạn (sớm/trung bình/nặng)" value={data?.stage} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">IX. HƯỚNG ĐIỀU TRỊ</div>
        <Field label="Thuốc hạ nhãn áp" value={data?.medications} />
        <Field label="Laser (SLT/LPI)" value={data?.laserTreatment} />
        <Field label="Phẫu thuật" value={data?.surgicalPlan} />
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
MatGlaucomaPrint.displayName = 'MatGlaucomaPrint';

// =====================================================================
// 20. MẮT ĐỤC THỂ THỦY TINH (Cataract)
// =====================================================================
export const MatDucTTTPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 20/BV1" />
      <h2>BỆNH ÁN MẮT - ĐỤC THỂ THỦY TINH</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ VÀ TIỀN SỬ</div>
        <Field label="Thời gian mờ mắt" value={data?.blurDuration} />
        <Field label="Tiến triển" value={data?.progression} />
        <Field label="Tiền sử mắt" value={data?.eyeHistory} />
        <Field label="Bệnh toàn thân (đái tháo đường, corticoid)" value={data?.systemicHistory} />
      </div>

      <div className="section">
        <div className="section-title">III. THỊ LỰC</div>
        <table>
          <thead>
            <tr><th></th><th>Mắt phải</th><th>Mắt trái</th></tr>
          </thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Không kính</td><td>{data?.vaRightUncorrected || '...'}</td><td>{data?.vaLeftUncorrected || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Có kính</td><td>{data?.vaRightCorrected || '...'}</td><td>{data?.vaLeftCorrected || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Nhãn áp (mmHg)</td><td>{data?.iopRight || '...'}</td><td>{data?.iopLeft || '...'}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">IV. PHÂN LOẠI ĐỤC TTT</div>
        <div className="row">
          <div className="col">
            <h3>Mắt phải</h3>
            <Field label="Nhân (Nuclear)" value={data?.rightNuclear} />
            <Field label="Vỏ (Cortical)" value={data?.rightCortical} />
            <Field label="Bao sau (PSC)" value={data?.rightPSC} />
            <Field label="LOCS III grade" value={data?.rightLocsGrade} />
          </div>
          <div className="col">
            <h3>Mắt trái</h3>
            <Field label="Nhân (Nuclear)" value={data?.leftNuclear} />
            <Field label="Vỏ (Cortical)" value={data?.leftCortical} />
            <Field label="Bao sau (PSC)" value={data?.leftPSC} />
            <Field label="LOCS III grade" value={data?.leftLocsGrade} />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">V. BIOMETRY (Đo sinh trắc)</div>
        <table>
          <thead>
            <tr><th></th><th>Mắt phải</th><th>Mắt trái</th></tr>
          </thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Chiều dài trục nhãn cầu (AL)</td><td>{data?.axialLengthRight || '...'} mm</td><td>{data?.axialLengthLeft || '...'} mm</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Keratometry K1</td><td>{data?.k1Right || '...'} D</td><td>{data?.k1Left || '...'} D</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Keratometry K2</td><td>{data?.k2Right || '...'} D</td><td>{data?.k2Left || '...'} D</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Độ sâu tiền phòng (ACD)</td><td>{data?.acdRight || '...'} mm</td><td>{data?.acdLeft || '...'} mm</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">VI. IOL CALCULATION (Tính công suất kính nội nhãn)</div>
        <Field label="Công thức tính" value={data?.iolFormula || 'SRK/T'} />
        <div className="row">
          <div className="col"><Field label="IOL MP" value={data?.iolPowerRight ? `${data.iolPowerRight} D` : undefined} /></div>
          <div className="col"><Field label="IOL MT" value={data?.iolPowerLeft ? `${data.iolPowerLeft} D` : undefined} /></div>
        </div>
        <Field label="Loại IOL" value={data?.iolType} />
        <Field label="Khúc xạ mục tiêu" value={data?.targetRefraction} />
      </div>

      <div className="section">
        <div className="section-title">VII. PHƯƠNG PHÁP PHẪU THUẬT</div>
        <div className="checkbox-row">
          <Checkbox label="Phaco" checked={data?.methodPhaco} />
          <Checkbox label="ECCE" checked={data?.methodECCE} />
          <Checkbox label="ICCE" checked={data?.methodICCE} />
          <Checkbox label="SICS" checked={data?.methodSICS} />
        </div>
        <Field label="Mắt mổ" value={data?.operativeEye} />
        <Field label="Gây tê" value={data?.anesthesia} />
      </div>

      <div className="section">
        <div className="section-title">VIII. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">IX. KẾ HOẠCH ĐIỀU TRỊ</div>
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="PHẪU THUẬT VIÊN" date={data?.createdDate} />
    </div>
  )
);
MatDucTTTPrint.displayName = 'MatDucTTTPrint';

// =====================================================================
// 21. MẮT LÉ (Strabismus)
// =====================================================================
export const MatLeoPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 21/BV1" />
      <h2>BỆNH ÁN MẮT - LÉ</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ VÀ TIỀN SỬ</div>
        <Field label="Tuổi khởi phát lé" value={data?.strabismusOnsetAge} />
        <Field label="Loại lé phát hiện" value={data?.strabismusType} />
        <Field label="Lé liên tục hay từng lúc" value={data?.frequency} />
        <Field label="Phẫu thuật lé trước đó" value={data?.previousSurgery} />
        <Field label="Đeo kính / che mắt" value={data?.glassesOcclusion} />
        <Field label="Tiền sử sinh, phát triển" value={data?.birthDevelopmentHistory} />
      </div>

      <div className="section">
        <div className="section-title">III. THỊ LỰC</div>
        <table>
          <thead><tr><th></th><th>Mắt phải</th><th>Mắt trái</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Không kính</td><td>{data?.vaRightUncorrected || '...'}</td><td>{data?.vaLeftUncorrected || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Có kính</td><td>{data?.vaRightCorrected || '...'}</td><td>{data?.vaLeftCorrected || '...'}</td></tr>
          </tbody>
        </table>
        <Field label="Nhược thị" value={data?.amblyopia} />
      </div>

      <div className="section">
        <div className="section-title">IV. ĐỘ LÉ</div>
        <table>
          <thead><tr><th>Vị trí nhìn</th><th>Nhìn xa (6m)</th><th>Nhìn gần (33cm)</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Không kính</td><td>{data?.deviationDistNoGlasses || '...'} PD</td><td>{data?.deviationNearNoGlasses || '...'} PD</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Có kính</td><td>{data?.deviationDistWithGlasses || '...'} PD</td><td>{data?.deviationNearWithGlasses || '...'} PD</td></tr>
          </tbody>
        </table>
        <Field label="Loại lé" value={data?.strabismusClassification} />
        <div className="checkbox-row">
          <Checkbox label="Lé trong (esotropia)" checked={data?.esotropia} />
          <Checkbox label="Lé ngoài (exotropia)" checked={data?.exotropia} />
          <Checkbox label="Lé trên (hypertropia)" checked={data?.hypertropia} />
          <Checkbox label="Lé dưới (hypotropia)" checked={data?.hypotropia} />
        </div>
      </div>

      <div className="section">
        <div className="section-title">V. TEST COVER</div>
        <Field label="Cover test nhìn xa" value={data?.coverTestDistance} />
        <Field label="Cover test nhìn gần" value={data?.coverTestNear} />
        <Field label="Alternate cover test" value={data?.alternateCoverTest} />
        <Field label="Mắt cố định" value={data?.fixatingEye} />
      </div>

      <div className="section">
        <div className="section-title">VI. WORTH 4-DOT TEST</div>
        <Field label="Nhìn xa" value={data?.worth4DotDistance} />
        <Field label="Nhìn gần" value={data?.worth4DotNear} />
        <Field label="Kết luận (hợp thị / ức chế / song thị)" value={data?.worth4DotConclusion} />
      </div>

      <div className="section">
        <div className="section-title">VII. VẬN NHÃN</div>
        <Field label="Vận nhãn 9 hướng nhìn" value={data?.ductionsVersions} />
        <Field label="Quá hoạt / yếu cơ" value={data?.overactionUnderaction} />
        <Field label="A/V pattern" value={data?.avPattern} />
      </div>

      <div className="section">
        <div className="section-title">VIII. KHÚC XẠ (sau liệt điều tiết)</div>
        <div className="row">
          <div className="col"><Field label="MP" value={data?.cycloRefractionRight} /></div>
          <div className="col"><Field label="MT" value={data?.cycloRefractionLeft} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">IX. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">X. HƯỚNG ĐIỀU TRỊ</div>
        <div className="checkbox-row">
          <Checkbox label="Kính" checked={data?.planGlasses} />
          <Checkbox label="Che mắt" checked={data?.planOcclusion} />
          <Checkbox label="Phẫu thuật" checked={data?.planSurgery} />
          <Checkbox label="Tiêm botox" checked={data?.planBotox} />
        </div>
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
MatLeoPrint.displayName = 'MatLeoPrint';

// =====================================================================
// 22. MẮT VÕNG MẠC - CHÁNH BỆNH (Retina - Choroid)
// =====================================================================
export const MatVMCBPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 22/BV1" />
      <h2>BỆNH ÁN MẮT - VÕNG MẠC DỊCH KÍNH</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ VÀ TIỀN SỬ</div>
        <DottedLines content={data?.historyOfPresentIllness} count={3} />
        <Field label="Bệnh toàn thân (ĐTĐ, THA)" value={data?.systemicDisease} />
        <Field label="HbA1c gần nhất" value={data?.hba1c} />
        <Field label="Tiền sử laser/tiêm nội nhãn" value={data?.previousRetinalTreatment} />
      </div>

      <div className="section">
        <div className="section-title">III. THỊ LỰC VÀ NHÃN ÁP</div>
        <table>
          <thead><tr><th></th><th>Mắt phải</th><th>Mắt trái</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Thị lực (có kính tốt nhất)</td><td>{data?.bcvaRight || '...'}</td><td>{data?.bcvaLeft || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Nhãn áp (mmHg)</td><td>{data?.iopRight || '...'}</td><td>{data?.iopLeft || '...'}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">IV. SOI ĐÁY MẮT</div>
        <h3>Mắt phải</h3>
        <Field label="Dịch kính" value={data?.rightVitreous} />
        <Field label="Gai thị" value={data?.rightOpticDisc} />
        <Field label="Mạch máu" value={data?.rightVessels} />
        <Field label="Hoàng điểm" value={data?.rightMacula} />
        <Field label="Võng mạc ngoại vi" value={data?.rightPeriphery} />
        <Field label="Tân mạch" value={data?.rightNeovascularization} />

        <h3>Mắt trái</h3>
        <Field label="Dịch kính" value={data?.leftVitreous} />
        <Field label="Gai thị" value={data?.leftOpticDisc} />
        <Field label="Mạch máu" value={data?.leftVessels} />
        <Field label="Hoàng điểm" value={data?.leftMacula} />
        <Field label="Võng mạc ngoại vi" value={data?.leftPeriphery} />
        <Field label="Tân mạch" value={data?.leftNeovascularization} />
      </div>

      <div className="section">
        <div className="section-title">V. CHỤP HUỲNH QUANG (FA/ICG)</div>
        <Field label="FA mắt phải" value={data?.faRight} />
        <Field label="FA mắt trái" value={data?.faLeft} />
        <Field label="ICG" value={data?.icg} />
        <Field label="Vùng thiếu máu" value={data?.ischemicArea} />
        <Field label="Rò huỳnh quang" value={data?.fluoresceinLeakage} />
      </div>

      <div className="section">
        <div className="section-title">VI. OCT HOÀNG ĐIỂM</div>
        <div className="row">
          <div className="col"><Field label="MP - CMT" value={data?.cmtRight ? `${data.cmtRight} µm` : undefined} /></div>
          <div className="col"><Field label="MT - CMT" value={data?.cmtLeft ? `${data.cmtLeft} µm` : undefined} /></div>
        </div>
        <Field label="Mô tả OCT MP" value={data?.octDescriptionRight} />
        <Field label="Mô tả OCT MT" value={data?.octDescriptionLeft} />
        <Field label="Phù hoàng điểm" value={data?.maculaEdema} />
        <Field label="Bong thanh dịch" value={data?.srd} />
      </div>

      <div className="section">
        <div className="section-title">VII. CHẨN ĐOÁN</div>
        <Field label="Mắt phải" value={data?.diagnosisRight} />
        <Field label="Mắt trái" value={data?.diagnosisLeft} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Phân loại (nếu BVMĐTĐ)" value={data?.drClassification} />
      </div>

      <div className="section">
        <div className="section-title">VIII. HƯỚNG ĐIỀU TRỊ</div>
        <div className="checkbox-row">
          <Checkbox label="Laser quang đông" checked={data?.planLaser} />
          <Checkbox label="Tiêm nội nhãn anti-VEGF" checked={data?.planAntiVEGF} />
          <Checkbox label="Tiêm nội nhãn corticoid" checked={data?.planIntravitealSteroid} />
          <Checkbox label="Phẫu thuật cắt dịch kính" checked={data?.planVitrectomy} />
        </div>
        <Field label="Thuốc tiêm" value={data?.injectionDrug} />
        <Field label="Lịch tiêm" value={data?.injectionSchedule} />
        <DottedLines content={data?.treatmentPlan} count={3} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={data?.createdDate} />
    </div>
  )
);
MatVMCBPrint.displayName = 'MatVMCBPrint';

// =====================================================================
// 23. MẮT KHÚC XẠ - THỂ THỦY TINH (Refraction)
// =====================================================================
export const MatKXTPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 23/BV1" />
      <h2>BỆNH ÁN MẮT - KHÚC XẠ</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO KHÁM</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. TIỀN SỬ</div>
        <Field label="Đeo kính từ năm" value={data?.glassesStartYear} />
        <Field label="Số kính đang đeo" value={data?.currentGlasses} />
        <Field label="Kính tiếp xúc" value={data?.contactLens} />
        <Field label="Phẫu thuật khúc xạ trước" value={data?.previousRefractiveSurgery} />
      </div>

      <div className="section">
        <div className="section-title">III. ĐO KHÚC XẠ</div>
        <table>
          <thead><tr><th></th><th>Mắt phải</th><th>Mắt trái</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>Tự động khúc xạ kế (AR)</td><td>{data?.arRight || '...'}</td><td>{data?.arLeft || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Khúc xạ chủ quan (manifest)</td><td>{data?.manifestRight || '...'}</td><td>{data?.manifestLeft || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>Khúc xạ sau liệt ĐT (cyclo)</td><td>{data?.cycloRight || '...'}</td><td>{data?.cycloLeft || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>BCVA</td><td>{data?.bcvaRight || '...'}</td><td>{data?.bcvaLeft || '...'}</td></tr>
          </tbody>
        </table>
        <Field label="PD (khoảng cách đồng tử)" value={data?.pd ? `${data.pd} mm` : undefined} />
      </div>

      <div className="section">
        <div className="section-title">IV. TOPOGRAPHY GIÁC MẠC</div>
        <div className="row">
          <div className="col">
            <h3>Mắt phải</h3>
            <Field label="SimK steep" value={data?.topoRightSteep} />
            <Field label="SimK flat" value={data?.topoRightFlat} />
            <Field label="Pachymetry" value={data?.pachyRight ? `${data.pachyRight} µm` : undefined} />
          </div>
          <div className="col">
            <h3>Mắt trái</h3>
            <Field label="SimK steep" value={data?.topoLeftSteep} />
            <Field label="SimK flat" value={data?.topoLeftFlat} />
            <Field label="Pachymetry" value={data?.pachyLeft ? `${data.pachyLeft} µm` : undefined} />
          </div>
        </div>
        <Field label="Bản đồ giác mạc" value={data?.topographyNotes} />
      </div>

      <div className="section">
        <div className="section-title">V. CHẨN ĐOÁN</div>
        <Field label="Mắt phải" value={data?.diagnosisRight} />
        <Field label="Mắt trái" value={data?.diagnosisLeft} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <div className="checkbox-row">
          <Checkbox label="Cận thị" checked={data?.myopia} />
          <Checkbox label="Viễn thị" checked={data?.hyperopia} />
          <Checkbox label="Loạn thị" checked={data?.astigmatism} />
          <Checkbox label="Lão thị" checked={data?.presbyopia} />
        </div>
      </div>

      <div className="section">
        <div className="section-title">VI. KÊ KÍNH</div>
        <table>
          <thead><tr><th></th><th>Cầu (Sph)</th><th>Trụ (Cyl)</th><th>Trục (Axis)</th><th>Add</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 'bold' }}>MP</td><td>{data?.rxRightSph || '...'}</td><td>{data?.rxRightCyl || '...'}</td><td>{data?.rxRightAxis || '...'}</td><td>{data?.rxRightAdd || '...'}</td></tr>
            <tr><td style={{ fontWeight: 'bold' }}>MT</td><td>{data?.rxLeftSph || '...'}</td><td>{data?.rxLeftCyl || '...'}</td><td>{data?.rxLeftAxis || '...'}</td><td>{data?.rxLeftAdd || '...'}</td></tr>
          </tbody>
        </table>
        <Field label="Loại kính" value={data?.lensType} />
        <Field label="Lời dặn" value={data?.instructions} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="BÁC SĨ KHÁM" date={data?.createdDate} />
    </div>
  )
);
MatKXTPrint.displayName = 'MatKXTPrint';

// =====================================================================
// 24. BA PHCN (Rehabilitation)
// =====================================================================
export const PHCNBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 24/BV1" />
      <h2>BỆNH ÁN PHỤC HỒI CHỨC NĂNG</h2>
      <PatientInfoBlock data={data} />

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ</div>
        <Field label="Ngày khởi phát / chấn thương" value={data?.onsetDate ? dayjs(data.onsetDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Chẩn đoán gốc" value={data?.originalDiagnosis} />
        <DottedLines content={data?.historyOfPresentIllness} count={3} />
        <Field label="Điều trị PHCN trước đó" value={data?.previousRehab} />
      </div>

      <div className="section">
        <div className="section-title">III. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} l/p` : undefined} /></div>
          <div className="col"><Field label="HA" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
        </div>
        <Field label="Toàn trạng" value={data?.generalCondition} />
        <Field label="Thần kinh" value={data?.neuroExam} />
        <Field label="Cơ xương khớp" value={data?.mskExam} />
      </div>

      <div className="section">
        <div className="section-title">IV. ĐÁNH GIÁ CHỨC NĂNG</div>

        <h3>1. FIM (Functional Independence Measure)</h3>
        <table>
          <thead><tr><th>Lĩnh vực</th><th>Điểm vào</th><th>Mục tiêu</th></tr></thead>
          <tbody>
            <tr><td>Tự chăm sóc</td><td>{data?.fimSelfCareAdmit || '...'}</td><td>{data?.fimSelfCareGoal || '...'}</td></tr>
            <tr><td>Kiểm soát cơ vòng</td><td>{data?.fimSphincterAdmit || '...'}</td><td>{data?.fimSphincterGoal || '...'}</td></tr>
            <tr><td>Di chuyển</td><td>{data?.fimTransferAdmit || '...'}</td><td>{data?.fimTransferGoal || '...'}</td></tr>
            <tr><td>Vận động</td><td>{data?.fimLocomotionAdmit || '...'}</td><td>{data?.fimLocomotionGoal || '...'}</td></tr>
            <tr><td>Giao tiếp</td><td>{data?.fimCommunicationAdmit || '...'}</td><td>{data?.fimCommunicationGoal || '...'}</td></tr>
            <tr><td>Nhận thức xã hội</td><td>{data?.fimSocialCognitionAdmit || '...'}</td><td>{data?.fimSocialCognitionGoal || '...'}</td></tr>
            <tr style={{ fontWeight: 'bold' }}><td>TỔNG FIM</td><td>{data?.fimTotalAdmit || '...'}/126</td><td>{data?.fimTotalGoal || '...'}/126</td></tr>
          </tbody>
        </table>

        <h3>2. Barthel Index</h3>
        <Field label="Điểm Barthel vào viện" value={data?.barthelAdmit ? `${data.barthelAdmit}/100` : undefined} />
        <Field label="Mục tiêu" value={data?.barthelGoal ? `${data.barthelGoal}/100` : undefined} />

        <h3>3. Đánh giá bổ sung</h3>
        <Field label="Tầm vận động khớp (ROM)" value={data?.rom} />
        <Field label="Sức cơ (MMT)" value={data?.mmt} />
        <Field label="Trương lực cơ (Ashworth)" value={data?.ashworth} />
        <Field label="Thăng bằng (Berg)" value={data?.bergBalance} />
        <Field label="Đi bộ (6MWT / 10MWT)" value={data?.walkTest} />
        <Field label="Đau (VAS)" value={data?.painVas} />
      </div>

      <div className="section">
        <div className="section-title">V. CHẨN ĐOÁN PHCN</div>
        <Field label="Chẩn đoán bệnh" value={data?.medicalDiagnosis} />
        <Field label="Chẩn đoán chức năng" value={data?.functionalDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Mức độ khuyết tật" value={data?.disabilityLevel} />
      </div>

      <div className="section">
        <div className="section-title">VI. MỤC TIÊU PHCN</div>
        <Field label="Mục tiêu ngắn hạn (2 tuần)" value={data?.shortTermGoal} />
        <Field label="Mục tiêu dài hạn (3-6 tháng)" value={data?.longTermGoal} />
      </div>

      <div className="section">
        <div className="section-title">VII. CHƯƠNG TRÌNH TẬP</div>
        <div className="checkbox-row">
          <Checkbox label="Vật lý trị liệu" checked={data?.physicalTherapy} />
          <Checkbox label="Hoạt động trị liệu" checked={data?.occupationalTherapy} />
          <Checkbox label="Ngôn ngữ trị liệu" checked={data?.speechTherapy} />
          <Checkbox label="Dụng cụ chỉnh hình" checked={data?.orthotics} />
        </div>
        <DottedLines content={data?.rehabProgram} count={5} />
        <Field label="Tần suất" value={data?.frequency} />
        <Field label="Thời gian mỗi buổi" value={data?.sessionDuration} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" middleTitle="KTV PHCN" rightTitle="BÁC SĨ PHCN" date={data?.createdDate} />
    </div>
  )
);
PHCNBAPrint.displayName = 'PHCNBAPrint';

// =====================================================================
// 25. BA PHCN NHI (Pediatric Rehabilitation)
// =====================================================================
export const PHCNNhiBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 25/BV1" />
      <h2>BỆNH ÁN PHỤC HỒI CHỨC NĂNG NHI</h2>
      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ tên bệnh nhi" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Ngày sinh" value={data?.dateOfBirth ? dayjs(data.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
        </div>
        <Field label="Họ tên bố/mẹ" value={data?.parentName} />
        <Field label="Địa chỉ" value={data?.address} />
        <Field label="SĐT" value={data?.phoneNumber} />
      </div>

      <div className="section">
        <div className="section-title">I. LÝ DO VÀO VIỆN</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. TIỀN SỬ SẢN KHOA VÀ PHÁT TRIỂN</div>
        <Field label="Thai kỳ" value={data?.pregnancyHistory} />
        <Field label="Sinh (tuần, cân nặng, cách sinh)" value={data?.birthHistory} />
        <Field label="Ngạt lúc sinh" value={data?.birthAsphyxia} />
        <Field label="Vàng da sơ sinh" value={data?.neonatalJaundice} />
        <Field label="Lật" value={data?.rollingAge} />
        <Field label="Ngồi" value={data?.sittingAge} />
        <Field label="Đứng" value={data?.standingAge} />
        <Field label="Đi" value={data?.walkingAge} />
        <Field label="Nói" value={data?.speakingAge} />
      </div>

      <div className="section">
        <div className="section-title">III. ĐÁNH GIÁ PHÁT TRIỂN</div>

        <h3>Denver Test II</h3>
        <table>
          <thead><tr><th>Lĩnh vực</th><th>Kết quả</th><th>Tương đương tuổi</th></tr></thead>
          <tbody>
            <tr><td>Vận động thô</td><td>{data?.denverGrossMotor || '...'}</td><td>{data?.denverGrossMotorAge || '...'}</td></tr>
            <tr><td>Vận động tinh - thích ứng</td><td>{data?.denverFineMotor || '...'}</td><td>{data?.denverFineMotorAge || '...'}</td></tr>
            <tr><td>Ngôn ngữ</td><td>{data?.denverLanguage || '...'}</td><td>{data?.denverLanguageAge || '...'}</td></tr>
            <tr><td>Cá nhân - xã hội</td><td>{data?.denverPersonalSocial || '...'}</td><td>{data?.denverPersonalSocialAge || '...'}</td></tr>
          </tbody>
        </table>

        <h3>GMFCS (Bại não) nếu có</h3>
        <Field label="Mức GMFCS (I-V)" value={data?.gmfcsLevel} />
        <Field label="MACS (chức năng tay)" value={data?.macsLevel} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
          <div className="col"><Field label="Chiều cao" value={data?.height ? `${data.height} cm` : undefined} /></div>
          <div className="col"><Field label="Vòng đầu" value={data?.headCircumference ? `${data.headCircumference} cm` : undefined} /></div>
        </div>
        <Field label="Trương lực cơ" value={data?.muscleTone} />
        <Field label="Phản xạ nguyên thủy" value={data?.primitiveReflexes} />
        <Field label="Biến dạng xương khớp" value={data?.deformities} />
        <Field label="Thị giác" value={data?.vision} />
        <Field label="Thính giác" value={data?.hearing} />
      </div>

      <div className="section">
        <div className="section-title">V. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán bệnh" value={data?.medicalDiagnosis} />
        <Field label="Chẩn đoán chức năng" value={data?.functionalDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
      </div>

      <div className="section">
        <div className="section-title">VI. CAN THIỆP SỚM</div>
        <div className="checkbox-row">
          <Checkbox label="Vật lý trị liệu" checked={data?.pt} />
          <Checkbox label="Hoạt động trị liệu" checked={data?.ot} />
          <Checkbox label="Ngôn ngữ trị liệu" checked={data?.st} />
          <Checkbox label="Giáo dục đặc biệt" checked={data?.specialEducation} />
          <Checkbox label="Tâm lý" checked={data?.psychology} />
        </div>
        <Field label="Mục tiêu ngắn hạn" value={data?.shortTermGoal} />
        <Field label="Mục tiêu dài hạn" value={data?.longTermGoal} />
        <DottedLines content={data?.interventionProgram} count={4} />
        <Field label="Hướng dẫn gia đình" value={data?.familyGuidance} />
      </div>

      <SignatureBlock leftTitle="PHỤ HUYNH" middleTitle="KTV PHCN" rightTitle="BÁC SĨ PHCN" date={data?.createdDate} />
    </div>
  )
);
PHCNNhiBAPrint.displayName = 'PHCNNhiBAPrint';

// =====================================================================
// 26. BA PHCN NGOẠI TRÚ (Outpatient Rehabilitation)
// =====================================================================
export const NgoaiTruPHCNBAPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 26/BV1" />
      <h2>BỆNH ÁN PHCN NGOẠI TRÚ</h2>
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
        <div className="section-title">II. CHẨN ĐOÁN GỐC</div>
        <Field label="Chẩn đoán" value={data?.originalDiagnosis} />
        <Field label="Ngày khởi phát" value={data?.onsetDate ? dayjs(data.onsetDate).format('DD/MM/YYYY') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">III. ĐÁNH GIÁ CHỨC NĂNG</div>
        <Field label="Barthel" value={data?.barthel ? `${data.barthel}/100` : undefined} />
        <Field label="VAS đau" value={data?.painVas ? `${data.painVas}/10` : undefined} />
        <Field label="ROM" value={data?.rom} />
        <Field label="Sức cơ" value={data?.muscleStrength} />
        <Field label="Thăng bằng" value={data?.balance} />
        <Field label="Đi bộ" value={data?.ambulation} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">IV. KẾ HOẠCH PHCN</div>
        <Field label="Mục tiêu" value={data?.goal} />
        <div className="checkbox-row">
          <Checkbox label="Vật lý trị liệu" checked={data?.pt} />
          <Checkbox label="Hoạt động trị liệu" checked={data?.ot} />
          <Checkbox label="Ngôn ngữ trị liệu" checked={data?.st} />
          <Checkbox label="Điện trị liệu" checked={data?.electrotherapy} />
          <Checkbox label="Thủy trị liệu" checked={data?.hydrotherapy} />
        </div>
        <DottedLines content={data?.rehabPlan} count={4} />
        <Field label="Số buổi / tuần" value={data?.sessionsPerWeek} />
        <Field label="Tổng số buổi dự kiến" value={data?.totalSessions} />
      </div>

      <div className="section">
        <div className="section-title">V. ĐƠN THUỐC (nếu có)</div>
        <DottedLines content={data?.prescription} count={3} />
      </div>

      <div className="section">
        <Field label="Hẹn tái khám" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Dặn dò tập tại nhà" value={data?.homeExerciseInstructions} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="BÁC SĨ PHCN" date={data?.examDate} />
    </div>
  )
);
NgoaiTruPHCNBAPrint.displayName = 'NgoaiTruPHCNBAPrint';

// =====================================================================
// 27. PHIẾU KHÁM THEO YÊU CẦU (VIP / Service Exam)
// =====================================================================
export const KhamTheoYCPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 27/BV2" />
      <h2>PHIẾU KHÁM THEO YÊU CẦU</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
        (Khám dịch vụ / VIP)
      </div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="CCCD/CMND" value={data?.idNumber} /></div>
          <div className="col"><Field label="SĐT" value={data?.phoneNumber} /></div>
        </div>
        <Field label="Địa chỉ" value={data?.address} />
        <div className="row">
          <div className="col"><Field label="Nghề nghiệp" value={data?.occupation} /></div>
          <div className="col"><Field label="Đơn vị công tác" value={data?.company} /></div>
        </div>
        <Field label="Ngày khám" value={data?.examDate ? dayjs(data.examDate).format('DD/MM/YYYY HH:mm') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">I. GÓI KHÁM</div>
        <Field label="Gói khám" value={data?.packageName} />
        <Field label="Yêu cầu bổ sung" value={data?.additionalRequests} />
      </div>

      <div className="section">
        <div className="section-title">II. LÝ DO KHÁM / TRIỆU CHỨNG</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ</div>
        <Field label="Bệnh đã mắc" value={data?.pastHistory} />
        <Field label="Dị ứng" value={data?.allergy} />
        <Field label="Gia đình" value={data?.familyHistory} />
        <Field label="Thuốc đang dùng" value={data?.currentMedications} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} l/p` : undefined} /></div>
          <div className="col"><Field label="HA" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Cân nặng" value={data?.weight ? `${data.weight} kg` : undefined} /></div>
          <div className="col"><Field label="Chiều cao" value={data?.height ? `${data.height} cm` : undefined} /></div>
          <div className="col"><Field label="BMI" value={data?.bmi} /></div>
        </div>
        <Field label="Nội khoa" value={data?.internalExam} />
        <Field label="Ngoại khoa" value={data?.surgicalExam} />
        <Field label="Mắt" value={data?.eyeExam} />
        <Field label="TMH" value={data?.entExam} />
        <Field label="RHM" value={data?.dentalExam} />
        <Field label="Da liễu" value={data?.skinExam} />
        <Field label="Phụ khoa (nữ)" value={data?.gynecologicalExam} />
        <DottedLines count={2} />
      </div>

      <div className="section">
        <div className="section-title">V. CẬN LÂM SÀNG</div>
        <Field label="Xét nghiệm máu" value={data?.bloodTests} />
        <Field label="Xét nghiệm nước tiểu" value={data?.urineTests} />
        <Field label="X-quang" value={data?.xray} />
        <Field label="Siêu âm" value={data?.ultrasound} />
        <Field label="Điện tim" value={data?.ecg} />
        <Field label="Xét nghiệm khác" value={data?.otherTests} />
      </div>

      <div className="section">
        <div className="section-title">VI. KẾT LUẬN</div>
        <Field label="Phân loại sức khỏe" value={data?.healthClassification} />
        <Field label="Chẩn đoán (nếu có)" value={data?.diagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <DottedLines content={data?.conclusion} count={3} />
      </div>

      <div className="section">
        <div className="section-title">VII. LỜI KHUYÊN</div>
        <DottedLines content={data?.advice} count={3} />
        <Field label="Hẹn tái khám" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
      </div>

      <SignatureBlock leftTitle="NGƯỜI KHÁM" rightTitle="BÁC SĨ KHÁM" date={data?.examDate} />
    </div>
  )
);
KhamTheoYCPrint.displayName = 'KhamTheoYCPrint';

// =====================================================================
// 28. PHIẾU KHÁM CHUYÊN KHOA (Specialty Outpatient Exam)
// =====================================================================
export const KhamCKPrint = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 28/BV2" />
      <h2>PHIẾU KHÁM CHUYÊN KHOA NGOẠI TRÚ</h2>

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
          <div className="col"><Field label="Ngày khám" value={data?.examDate ? dayjs(data.examDate).format('DD/MM/YYYY HH:mm') : undefined} /></div>
          <div className="col"><Field label="Chuyên khoa" value={data?.specialtyName} /></div>
        </div>
        <Field label="Nơi giới thiệu" value={data?.referralSource} />
      </div>

      <div className="section">
        <div className="section-title">I. LÝ DO KHÁM</div>
        <DottedLines content={data?.chiefComplaint} count={2} />
      </div>

      <div className="section">
        <div className="section-title">II. BỆNH SỬ TÓM TẮT</div>
        <DottedLines content={data?.historyOfPresentIllness} count={3} />
      </div>

      <div className="section">
        <div className="section-title">III. TIỀN SỬ LIÊN QUAN</div>
        <Field label="Bệnh đã mắc" value={data?.pastHistory} />
        <Field label="Dị ứng" value={data?.allergy} />
        <Field label="Phẫu thuật" value={data?.surgicalHistory} />
        <Field label="Thuốc đang dùng" value={data?.currentMedications} />
      </div>

      <div className="section">
        <div className="section-title">IV. KHÁM LÂM SÀNG</div>
        <div className="row">
          <div className="col"><Field label="Mạch" value={data?.pulse ? `${data.pulse} l/p` : undefined} /></div>
          <div className="col"><Field label="HA" value={data?.bloodPressure} /></div>
          <div className="col"><Field label="Nhiệt độ" value={data?.temperature ? `${data.temperature}°C` : undefined} /></div>
        </div>
        <Field label="Khám toàn thân" value={data?.generalExam} />
        <Field label="Khám chuyên khoa" value={data?.specialtyExam} />
        <DottedLines content={data?.specialtyExamDetail} count={5} />
      </div>

      <div className="section">
        <div className="section-title">V. CẬN LÂM SÀNG</div>
        <DottedLines content={data?.labResults} count={3} />
      </div>

      <div className="section">
        <div className="section-title">VI. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán chính" value={data?.primaryDiagnosis} />
        <Field label="Mã ICD" value={data?.icdCode} />
        <Field label="Chẩn đoán phụ" value={data?.secondaryDiagnosis} />
      </div>

      <div className="section">
        <div className="section-title">VII. XỬ TRÍ</div>
        <DottedLines content={data?.treatment} count={4} />
      </div>

      <div className="section">
        <div className="section-title">VIII. ĐƠN THUỐC</div>
        {data?.prescriptions?.length > 0 ? (
          <table>
            <thead><tr><th>STT</th><th>Tên thuốc</th><th>ĐVT</th><th>SL</th><th>Cách dùng</th></tr></thead>
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
        <Field label="Hẹn tái khám" value={data?.followUpDate ? dayjs(data.followUpDate).format('DD/MM/YYYY') : undefined} />
        <Field label="Dặn dò" value={data?.instructions} />
      </div>

      <SignatureBlock leftTitle="BỆNH NHÂN" rightTitle="BÁC SĨ CHUYÊN KHOA" date={data?.examDate} />
    </div>
  )
);
KhamCKPrint.displayName = 'KhamCKPrint';

// =====================================================================
// 29. PHIẾU CHĂM SÓC CẤP 1 (Level 1 Nursing Care - Critical)
// =====================================================================
export const CSCap1Print = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 29/BV2" />
      <h2>PHIẾU CHĂM SÓC CẤP 1</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
        (Bệnh nhân nặng - Theo dõi liên tục 15-30 phút)
      </div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
          <div className="col"><Field label="Khoa" value={data?.departmentName} /></div>
          <div className="col"><Field label="Giường" value={data?.bedName} /></div>
        </div>
        <Field label="Chẩn đoán" value={data?.diagnosis} />
        <Field label="Ngày" value={data?.date ? dayjs(data.date).format('DD/MM/YYYY') : undefined} />
      </div>

      <div className="section">
        <div className="section-title">I. THEO DÕI SINH HIỆU LIÊN TỤC</div>
        <table>
          <thead>
            <tr>
              <th>Giờ</th>
              <th>Mạch (l/p)</th>
              <th>HA (mmHg)</th>
              <th>Nhịp thở (l/p)</th>
              <th>SpO2 (%)</th>
              <th>Nhiệt độ (°C)</th>
              <th>GCS</th>
              <th>Nước tiểu (ml)</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {(data?.vitalSignsRecords?.length > 0 ? data.vitalSignsRecords : Array.from({ length: 12 })).map((record: any, i: number) => (
              <tr key={record?.id || i}>
                <td style={{ textAlign: 'center' }}>{record?.time || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.pulse || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.bloodPressure || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.respiratoryRate || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.spo2 || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.temperature || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.gcs || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.urineOutput || ''}</td>
                <td>{record?.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">II. THEO DÕI DỊCH TRUYỀN</div>
        <table>
          <thead>
            <tr><th>Giờ bắt đầu</th><th>Loại dịch</th><th>Thể tích (ml)</th><th>Tốc độ (gtts/p)</th><th>Giờ kết thúc</th><th>Phản ứng</th></tr>
          </thead>
          <tbody>
            {(data?.infusionRecords?.length > 0 ? data.infusionRecords : Array.from({ length: 4 })).map((record: any, i: number) => (
              <tr key={record?.id || i}>
                <td>{record?.startTime || ''}</td>
                <td>{record?.fluidType || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.volume || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.rate || ''}</td>
                <td>{record?.endTime || ''}</td>
                <td>{record?.reaction || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">III. THEO DÕI THUỐC</div>
        <table>
          <thead>
            <tr><th>Giờ</th><th>Tên thuốc</th><th>Liều</th><th>Đường dùng</th><th>Phản ứng</th><th>ĐD thực hiện</th></tr>
          </thead>
          <tbody>
            {(data?.medicationRecords?.length > 0 ? data.medicationRecords : Array.from({ length: 6 })).map((record: any, i: number) => (
              <tr key={record?.id || i}>
                <td>{record?.time || ''}</td>
                <td>{record?.drugName || ''}</td>
                <td>{record?.dose || ''}</td>
                <td>{record?.route || ''}</td>
                <td>{record?.reaction || ''}</td>
                <td>{record?.nurseName || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">IV. NHẬN ĐỊNH ĐIỀU DƯỠNG</div>
        <Field label="Tình trạng bệnh nhân" value={data?.patientCondition} />
        <Field label="Ý thức" value={data?.consciousness} />
        <Field label="Đau (VAS)" value={data?.painScore} />
        <Field label="Da, niêm mạc" value={data?.skinStatus} />
        <Field label="Loét tỳ đè (Braden)" value={data?.bradenScore} />
        <Field label="Nguy cơ té ngã" value={data?.fallRisk} />
      </div>

      <div className="section">
        <div className="section-title">V. CAN THIỆP ĐIỀU DƯỠNG</div>
        <DottedLines content={data?.nursingInterventions} count={4} />
      </div>

      <div className="section">
        <div className="section-title">VI. DIỄN BIẾN ĐẶC BIỆT</div>
        <DottedLines content={data?.specialEvents} count={3} />
      </div>

      <div className="section">
        <div className="section-title">VII. TỔNG KẾT CA TRỰC</div>
        <div className="row">
          <div className="col"><Field label="Tổng dịch vào (ml)" value={data?.totalIntake} /></div>
          <div className="col"><Field label="Tổng nước tiểu (ml)" value={data?.totalUrineOutput} /></div>
          <div className="col"><Field label="Cân bằng (ml)" value={data?.fluidBalance} /></div>
        </div>
      </div>

      <SignatureBlock leftTitle="ĐIỀU DƯỠNG TRỰC" middleTitle="ĐIỀU DƯỠNG TRƯỞNG" rightTitle="BÁC SĨ TRỰC" date={data?.date} />
    </div>
  )
);
CSCap1Print.displayName = 'CSCap1Print';

// =====================================================================
// 30. PHIẾU CHĂM SÓC CẤP 2 (Level 2 Nursing Care - Intermediate)
// =====================================================================
export const CSCap2Print = forwardRef<HTMLDivElement, { data: any }>(
  ({ data }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS: 30/BV2" />
      <h2>PHIẾU CHĂM SÓC CẤP 2</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
        (Bệnh nhân trung bình - Theo dõi 1-2 giờ)
      </div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={data?.fullName || data?.patientName} /></div>
          <div className="col"><Field label="Tuổi" value={data?.age} /></div>
          <div className="col"><Field label="Giới" value={data?.gender === 1 ? 'Nam' : data?.gender === 2 ? 'Nữ' : data?.genderText} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={data?.patientCode} /></div>
          <div className="col"><Field label="Khoa" value={data?.departmentName} /></div>
          <div className="col"><Field label="Giường" value={data?.bedName} /></div>
        </div>
        <Field label="Chẩn đoán" value={data?.diagnosis} />
        <div className="row">
          <div className="col"><Field label="Ngày" value={data?.date ? dayjs(data.date).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Ca trực" value={data?.shift} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">I. SINH HIỆU (Theo dõi mỗi 1-2 giờ)</div>
        <table>
          <thead>
            <tr>
              <th>Giờ</th>
              <th>Mạch (l/p)</th>
              <th>HA (mmHg)</th>
              <th>Nhịp thở (l/p)</th>
              <th>Nhiệt độ (°C)</th>
              <th>SpO2 (%)</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {(data?.vitalSignsRecords?.length > 0 ? data.vitalSignsRecords : Array.from({ length: 8 })).map((record: any, i: number) => (
              <tr key={record?.id || i}>
                <td style={{ textAlign: 'center' }}>{record?.time || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.pulse || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.bloodPressure || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.respiratoryRate || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.temperature || ''}</td>
                <td style={{ textAlign: 'center' }}>{record?.spo2 || ''}</td>
                <td>{record?.note || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">II. NHẬN ĐỊNH TÌNH TRẠNG BỆNH NHÂN</div>
        <Field label="Ý thức" value={data?.consciousness} />
        <Field label="Đau" value={data?.pain} />
        <Field label="Ăn uống" value={data?.nutrition} />
        <Field label="Vận động" value={data?.mobility} />
        <Field label="Vệ sinh cá nhân" value={data?.hygiene} />
        <Field label="Giấc ngủ" value={data?.sleep} />
        <Field label="Tình trạng da, vết mổ" value={data?.skinWound} />
        <Field label="Đại/tiểu tiện" value={data?.elimination} />
      </div>

      <div className="section">
        <div className="section-title">III. THỰC HIỆN Y LỆNH</div>
        <table>
          <thead>
            <tr><th>Giờ</th><th>Y lệnh</th><th>Thực hiện</th><th>Kết quả</th><th>ĐD ký</th></tr>
          </thead>
          <tbody>
            {(data?.orderRecords?.length > 0 ? data.orderRecords : Array.from({ length: 6 })).map((record: any, i: number) => (
              <tr key={record?.id || i}>
                <td>{record?.time || ''}</td>
                <td>{record?.order || ''}</td>
                <td>{record?.execution || ''}</td>
                <td>{record?.result || ''}</td>
                <td>{record?.nurseSig || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">IV. CHĂM SÓC ĐIỀU DƯỠNG</div>
        <div className="checkbox-row">
          <Checkbox label="Vệ sinh thân thể" checked={data?.bodyHygiene} />
          <Checkbox label="Thay ga, quần áo" checked={data?.linenChange} />
          <Checkbox label="Xoay trở" checked={data?.positioning} />
          <Checkbox label="Hỗ trợ ăn uống" checked={data?.feedingAssist} />
        </div>
        <div className="checkbox-row">
          <Checkbox label="Hướng dẫn tập vận động" checked={data?.exerciseGuidance} />
          <Checkbox label="Giáo dục sức khỏe" checked={data?.healthEducation} />
          <Checkbox label="Tư vấn dinh dưỡng" checked={data?.nutritionCounseling} />
          <Checkbox label="Hỗ trợ tâm lý" checked={data?.psychologicalSupport} />
        </div>
        <DottedLines content={data?.additionalCare} count={3} />
      </div>

      <div className="section">
        <div className="section-title">V. ĐÁNH GIÁ</div>
        <Field label="Tình trạng so với đầu ca" value={data?.progressAssessment} />
        <div className="checkbox-row">
          <Checkbox label="Ổn định" checked={data?.stable} />
          <Checkbox label="Tiến triển tốt" checked={data?.improving} />
          <Checkbox label="Nặng hơn" checked={data?.worsening} />
        </div>
        <Field label="Vấn đề cần lưu ý ca sau" value={data?.handoverNotes} />
      </div>

      <div className="section">
        <div className="section-title">VI. BÀN GIAO CA</div>
        <div className="row">
          <div className="col"><Field label="Ca trực giao" value={data?.handoverFromShift} /></div>
          <div className="col"><Field label="Ca trực nhận" value={data?.handoverToShift} /></div>
        </div>
        <Field label="Nội dung bàn giao" value={data?.handoverContent} />
      </div>

      <SignatureBlock leftTitle="ĐD GIAO CA" middleTitle="ĐD NHẬN CA" rightTitle="ĐD TRƯỞNG KHOA" date={data?.date} />
    </div>
  )
);
CSCap2Print.displayName = 'CSCap2Print';
