import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { printStyles, PrintHeader, SignatureBlock, Field, DottedLines, PatientInfoBlock, type SpecialtyEMRPrintData } from './_shared';
export const NoiKhoaBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
export const TruyenNhiemBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
        <Field label="Ngày khởi phát" value={data?.onsetDate ? dayjs(data.onsetDate as string).format('DD/MM/YYYY') : undefined} />
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
export const PhuKhoaBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
        <Field label="Kinh nguyệt cuối" value={data?.lastMenstrualPeriod ? dayjs(data.lastMenstrualPeriod as string).format('DD/MM/YYYY') : undefined} />
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
export const TamThanBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
        <Field label="Ngày khởi phát" value={data?.onsetDate ? dayjs(data.onsetDate as string).format('DD/MM/YYYY') : undefined} />
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
export const DaLieuBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
