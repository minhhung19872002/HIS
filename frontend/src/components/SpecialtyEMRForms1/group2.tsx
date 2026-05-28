import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../../constants/hospital';
import { printStyles, PrintHeader, SignatureBlock, Field, Checkbox, DottedLines, PatientInfoBlock } from './_shared';
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
