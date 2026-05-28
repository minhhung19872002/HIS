import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../../constants/hospital';
import { printStyles, PrintHeader, SignatureBlock, Field, Checkbox, DottedLines, PatientInfoBlock } from './_shared';
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
