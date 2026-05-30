import { forwardRef } from 'react';
import dayjs from 'dayjs';
import { printStyles, PrintHeader, SignatureBlock, Field, Checkbox, DottedLines, PatientInfoBlock, type SpecialtyEMRPrintData } from './_shared';
export const TMHBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
export const NgoaiTruChungBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
        {Array.isArray(data?.prescriptions) && data.prescriptions.length > 0 ? (
          <table>
            <thead>
              <tr><th>STT</th><th>Tên thuốc</th><th>ĐVT</th><th>SL</th><th>Cách dùng</th></tr>
            </thead>
            <tbody>
              {(data.prescriptions as unknown as Array<{ id?: string; medicineName?: string; unit?: string; quantity?: number | string; dosageInstruction?: string }>).map((rx, i) => (
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
export const NgoaiTruRHMBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
export const TuyenXaBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
export const YHCTNoiTruBAPrint = forwardRef<HTMLDivElement, { data: SpecialtyEMRPrintData }>(
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
        {Array.isArray(data?.herbs) && data.herbs.length > 0 ? (
          <table>
            <thead>
              <tr><th>STT</th><th>Vị thuốc</th><th>Liều lượng (g)</th><th>Ghi chú</th></tr>
            </thead>
            <tbody>
              {(data.herbs as unknown as Array<{ id?: string; name?: string; dosage?: number | string; note?: string }>).map((herb, i) => (
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
