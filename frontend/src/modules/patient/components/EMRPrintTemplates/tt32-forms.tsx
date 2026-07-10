/**
 * TT32/2023 supplementary print forms — biểu mẫu bổ sung theo TT 32/2023/TT-BYT
 *
 * Các mẫu trong file này:
 *  - SurgeryCertificatePrint  (ls-surgery-cert)   MS. 18/BV — Giấy chứng nhận PTTT
 *  - DeathReviewFormPrint     (ls-death-review)    MS. 19/BV — Biên bản kiểm thảo tử vong
 *  - TriageAssessmentPrint    (ls-triage-assess)   MS. 20/BV — Phiếu nhận định phân loại cấp cứu
 *  - DeptTransferDocPrint     (ls-dept-transfer-doc)   MS. 21/BV — Phiếu bàn giao chuyển khoa (BS)
 *  - DeptTransferNursePrint   (ls-dept-transfer-nurse) DD. 22   — Phiếu bàn giao chuyển khoa (ĐD)
 *
 * Pattern: dùng PrintHeader/SignatureBlock/Field từ ./_shared để nhất quán với 38+ form hiện có.
 */
import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { printStyles, PrintHeader, SignatureBlock, Field } from './_shared';

// Checkbox helper for this file
const Chk: React.FC<{ label: string; checked?: boolean | unknown }> = ({ label, checked }) => (
  <span style={{ marginRight: 16, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span style={{ width: 14, height: 14, border: '1px solid #333', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
      {checked ? '✓' : ''}
    </span>
    {label}
  </span>
);

// Dotted blank lines for free-text sections
const Lines: React.FC<{ count?: number; content?: unknown }> = ({ count = 3, content }) => (
  <div>
    {content
      ? <div style={{ minHeight: count * 20, padding: '4px 0', whiteSpace: 'pre-wrap' }}>{String(content)}</div>
      : Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ borderBottom: '1px dashed #aaa', minHeight: 22, marginBottom: 4 }} />
      ))
    }
  </div>
);

type Rec = Record<string, unknown> | undefined;

// =========================================================
// MS. 18/BV — Giấy chứng nhận phẫu thuật / thủ thuật
// =========================================================
export const SurgeryCertificatePrint = forwardRef<HTMLDivElement, { record?: Rec }>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS. 18/BV" />
      <h2>GIẤY CHỨNG NHẬN PHẪU THUẬT / THỦ THUẬT</h2>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={record?.patientName as string} /></div>
          <div className="col"><Field label="Tuổi" value={record?.age as string} /></div>
          <div className="col"><Field label="Giới" value={record?.gender === 1 ? 'Nam' : record?.gender === 2 ? 'Nữ' : record?.genderText as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={record?.patientCode as string} /></div>
          <div className="col"><Field label="Số BA/HSBA" value={record?.medicalRecordCode as string} /></div>
        </div>
        <Field label="Địa chỉ" value={record?.address as string} />
        <Field label="Số BHYT" value={record?.insuranceNumber as string} />
        <div className="row">
          <div className="col"><Field label="Khoa điều trị" value={record?.departmentName as string} /></div>
          <div className="col"><Field label="Ngày vào viện" value={record?.admissionDate ? dayjs(record.admissionDate as string).format('DD/MM/YYYY') : undefined} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">I. CHẨN ĐOÁN TRƯỚC PHẪU THUẬT / THỦ THUẬT</div>
        <Field label="Chẩn đoán" value={record?.preOpDiagnosis as string} />
        <Field label="Mã ICD-10" value={record?.icdCode as string} />
      </div>

      <div className="section">
        <div className="section-title">II. THÔNG TIN PHẪU THUẬT / THỦ THUẬT</div>
        <Field label="Tên phẫu thuật / thủ thuật" value={record?.surgeryName as string} />
        <div className="row">
          <div className="col"><Field label="Ngày thực hiện" value={record?.surgeryDate ? dayjs(record.surgeryDate as string).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Giờ bắt đầu" value={record?.startTime as string} /></div>
          <div className="col"><Field label="Giờ kết thúc" value={record?.endTime as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Phòng mổ" value={record?.orRoom as string} /></div>
          <div className="col">
            <span style={{ fontWeight: 'bold' }}>Loại PT/TT: </span>
            <Chk label="Phẫu thuật" checked={record?.isSurgery} />
            <Chk label="Thủ thuật" checked={!record?.isSurgery} />
          </div>
        </div>
        <div className="row">
          <div className="col">
            <span style={{ fontWeight: 'bold' }}>Phân loại PT: </span>
            <Chk label="Loại I" checked={record?.surgeryClass === 1} />
            <Chk label="Loại II" checked={record?.surgeryClass === 2} />
            <Chk label="Loại III" checked={record?.surgeryClass === 3} />
            <Chk label="Loại IV" checked={record?.surgeryClass === 4} />
          </div>
        </div>
        <div className="row">
          <div className="col">
            <span style={{ fontWeight: 'bold' }}>Gây mê / Gây tê: </span>
            <Chk label="Gây mê toàn thân" checked={record?.anesthesia === 'general'} />
            <Chk label="Gây tê tủy sống" checked={record?.anesthesia === 'spinal'} />
            <Chk label="Gây tê tại chỗ" checked={record?.anesthesia === 'local'} />
          </div>
        </div>
        <Field label="Bác sĩ phẫu thuật chính" value={record?.leadSurgeon as string} />
        <Field label="Bác sĩ phụ mổ" value={record?.assistantSurgeon as string} />
        <Field label="Bác sĩ gây mê" value={record?.anesthesiologist as string} />
        <Field label="Dụng cụ viên" value={record?.scrubNurse as string} />
      </div>

      <div className="section">
        <div className="section-title">III. PHƯƠNG PHÁP PHẪU THUẬT / THỦ THUẬT</div>
        <Lines content={record?.technique} count={4} />
      </div>

      <div className="section">
        <div className="section-title">IV. CHẨN ĐOÁN SAU PHẪU THUẬT / THỦ THUẬT</div>
        <Field label="Chẩn đoán sau PT" value={record?.postOpDiagnosis as string} />
        <Field label="Mẫu bệnh phẩm gửi GPB" value={record?.specimenSent as string} />
      </div>

      <div className="section">
        <div className="section-title">V. TAI BIẾN / BIẾN CHỨNG (nếu có)</div>
        <Chk label="Không có" checked={!record?.complications} />
        <Chk label="Có (ghi rõ)" checked={!!record?.complications} />
        <Lines content={record?.complications} count={2} />
      </div>

      <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ PHẪU THUẬT" date={record?.surgeryDate ? new Date(record.surgeryDate as string) : new Date()} />
    </div>
  )
);
SurgeryCertificatePrint.displayName = 'SurgeryCertificatePrint';

// =========================================================
// MS. 19/BV — Biên bản kiểm thảo tử vong
// =========================================================
export const DeathReviewFormPrint = forwardRef<HTMLDivElement, { record?: Rec }>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS. 19/BV" />
      <h2>BIÊN BẢN KIỂM THẢO TỬ VONG</h2>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên bệnh nhân" value={record?.patientName as string} /></div>
          <div className="col"><Field label="Tuổi" value={record?.age as string} /></div>
          <div className="col"><Field label="Giới" value={record?.gender === 1 ? 'Nam' : record?.gender === 2 ? 'Nữ' : record?.genderText as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={record?.patientCode as string} /></div>
          <div className="col"><Field label="Số BA" value={record?.medicalRecordCode as string} /></div>
        </div>
        <Field label="Địa chỉ" value={record?.address as string} />
        <div className="row">
          <div className="col"><Field label="Khoa điều trị" value={record?.departmentName as string} /></div>
          <div className="col"><Field label="Ngày vào viện" value={record?.admissionDate ? dayjs(record.admissionDate as string).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Ngày tử vong" value={record?.deathDate ? dayjs(record.deathDate as string).format('DD/MM/YYYY HH:mm') : undefined} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">I. THÔNG TIN BUỔI KIỂM THẢO</div>
        <div className="row">
          <div className="col"><Field label="Ngày họp kiểm thảo" value={record?.reviewDate ? dayjs(record.reviewDate as string).format('DD/MM/YYYY') : undefined} /></div>
          <div className="col"><Field label="Địa điểm" value={record?.reviewLocation as string} /></div>
        </div>
        <Field label="Chủ trì" value={record?.chairman as string} />
        <Field label="Thư ký" value={record?.secretary as string} />
        <Field label="Thành phần tham dự" value={record?.participants as string} />
      </div>

      <div className="section">
        <div className="section-title">II. TÓM TẮT QUÁ TRÌNH BỆNH LÝ</div>
        <Field label="Chẩn đoán vào viện" value={record?.admissionDiagnosis as string} />
        <Field label="Chẩn đoán ra viện / tử vong" value={record?.dischargeDiagnosis as string} />
        <Field label="Mã ICD-10" value={record?.icdCode as string} />
        <div className="section-title" style={{ fontSize: 12, fontStyle: 'italic' }}>Tóm tắt diễn biến lâm sàng:</div>
        <Lines content={record?.clinicalSummary} count={5} />
      </div>

      <div className="section">
        <div className="section-title">III. KẾT LUẬN NGUYÊN NHÂN TỬ VONG</div>
        <Field label="Nguyên nhân trực tiếp" value={record?.directCause as string} />
        <Field label="Nguyên nhân gián tiếp" value={record?.indirectCause as string} />
        <div className="row">
          <div className="col">
            <span style={{ fontWeight: 'bold' }}>Phân loại: </span>
            <Chk label="Tất yếu" checked={record?.deathClass === 'inevitable'} />
            <Chk label="Có thể tránh" checked={record?.deathClass === 'avoidable'} />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">IV. NHẬN XÉT VỀ QUÁ TRÌNH CHẨN ĐOÁN VÀ ĐIỀU TRỊ</div>
        <div className="row">
          <div className="col">
            <span style={{ fontWeight: 'bold' }}>Chẩn đoán: </span>
            <Chk label="Đúng" checked={record?.diagnosisCorrect === true} />
            <Chk label="Chưa đủ" checked={record?.diagnosisCorrect === false} />
          </div>
          <div className="col">
            <span style={{ fontWeight: 'bold' }}>Điều trị: </span>
            <Chk label="Đúng phác đồ" checked={record?.treatmentCorrect === true} />
            <Chk label="Có sai sót" checked={record?.treatmentCorrect === false} />
          </div>
        </div>
        <Lines content={record?.reviewComments} count={4} />
      </div>

      <div className="section">
        <div className="section-title">V. BÀI HỌC KINH NGHIỆM VÀ KIẾN NGHỊ</div>
        <Lines content={record?.lessons} count={3} />
      </div>

      <SignatureBlock leftTitle="THƯ KÝ" rightTitle="CHỦ TỌA KIỂM THẢO" date={record?.reviewDate ? new Date(record.reviewDate as string) : new Date()} />
    </div>
  )
);
DeathReviewFormPrint.displayName = 'DeathReviewFormPrint';

// =========================================================
// MS. 20/BV — Phiếu nhận định phân loại cấp cứu (Triage Assessment TT32)
// =========================================================
export const TriageAssessmentPrint = forwardRef<HTMLDivElement, { record?: Rec }>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS. 20/BV" />
      <h2>PHIẾU NHẬN ĐỊNH PHÂN LOẠI CẤP CỨU</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>
        (Theo TT 32/2023/TT-BYT — Thông tư quy định thống nhất biểu mẫu HSBA)
      </div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên" value={record?.patientName as string} /></div>
          <div className="col"><Field label="Tuổi" value={record?.age as string} /></div>
          <div className="col"><Field label="Giới" value={record?.gender === 1 ? 'Nam' : record?.gender === 2 ? 'Nữ' : record?.genderText as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={record?.patientCode as string} /></div>
          <div className="col"><Field label="Ngày giờ tiếp nhận" value={record?.triageTime ? dayjs(record.triageTime as string).format('DD/MM/YYYY HH:mm') : undefined} /></div>
        </div>
        <Field label="Đến bằng phương tiện" value={record?.transportMode as string} />
        <Field label="Người đưa đến / Người thân" value={record?.accompaniedBy as string} />
      </div>

      <div className="section">
        <div className="section-title">I. PHÂN LOẠI MÀU (MÃ MÀU CẤP CỨU)</div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>Chọn</th>
              <th>Màu</th>
              <th>Mức độ</th>
              <th>Thời gian can thiệp</th>
            </tr>
          </thead>
          <tbody>
            {([
              { color: 'red',    level: 'Đỏ',      desc: 'Nguy kịch — Cấp cứu ngay',     time: '0–10 phút',   key: 'red' },
              { color: 'orange', level: 'Cam',      desc: 'Rất nặng — Ưu tiên cao',        time: '10–30 phút',  key: 'orange' },
              { color: 'yellow', level: 'Vàng',     desc: 'Nặng — Theo dõi sát',           time: '30–60 phút',  key: 'yellow' },
              { color: 'green',  level: 'Xanh lá',  desc: 'Nhẹ — Theo hàng đợi thông thường', time: '60–120 phút', key: 'green' },
              { color: 'black',  level: 'Đen/Xám',  desc: 'Phổ thác / Không cần cấp cứu', time: '—',           key: 'black' },
            ] as const).map((row) => (
              <tr key={row.key}>
                <td style={{ textAlign: 'center' }}>{record?.triageColor === row.key ? '✓' : ''}</td>
                <td><span style={{ fontWeight: 'bold', color: row.color === 'yellow' ? '#d48806' : row.color }}>{row.level}</span></td>
                <td>{row.desc}</td>
                <td>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <div className="section-title">II. ĐÁNH GIÁ LÂM SÀNG BAN ĐẦU</div>
        <div className="row">
          <div className="col"><Field label="Mạch (l/p)" value={record?.pulse as string} /></div>
          <div className="col"><Field label="HA (mmHg)" value={record?.bloodPressure as string} /></div>
          <div className="col"><Field label="Nhịp thở (l/p)" value={record?.respiratoryRate as string} /></div>
          <div className="col"><Field label="SpO2 (%)" value={record?.spo2 as string} /></div>
          <div className="col"><Field label="Nhiệt độ (°C)" value={record?.temperature as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="GCS" value={record?.gcs as string} /></div>
          <div className="col"><Field label="Đau (VAS 0-10)" value={record?.painScore as string} /></div>
          <div className="col">
            <span style={{ fontWeight: 'bold' }}>AVPU: </span>
            <Chk label="A" checked={record?.avpu === 'A'} />
            <Chk label="V" checked={record?.avpu === 'V'} />
            <Chk label="P" checked={record?.avpu === 'P'} />
            <Chk label="U" checked={record?.avpu === 'U'} />
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">III. LÝ DO ĐẾN CẤP CỨU / TRIỆU CHỨNG CHÍNH</div>
        <Lines content={record?.chiefComplaint} count={3} />
      </div>

      <div className="section">
        <div className="section-title">IV. XỬ TRÍ BAN ĐẦU</div>
        <div className="row">
          <div className="col">
            <Chk label="Thở oxy" checked={record?.oxygenGiven} />
            <Chk label="Truyền dịch" checked={record?.ivFluid} />
            <Chk label="Monitor" checked={record?.monitoring} />
          </div>
          <div className="col">
            <Chk label="Đặt NKQ" checked={record?.intubation} />
            <Chk label="CPR" checked={record?.cpr} />
            <Chk label="Thuốc cấp cứu" checked={record?.emergencyMeds} />
          </div>
        </div>
        <Lines content={record?.initialManagement} count={2} />
      </div>

      <div className="section">
        <div className="section-title">V. PHÂN LUỒNG</div>
        <div className="row">
          <div className="col">
            <Chk label="Phòng cấp cứu" checked={record?.dispositionER} />
            <Chk label="Nhập viện" checked={record?.dispositionAdmit} />
            <Chk label="Chuyển viện" checked={record?.dispositionTransfer} />
            <Chk label="Về nhà" checked={record?.dispositionHome} />
          </div>
        </div>
        <Field label="Khoa tiếp nhận" value={record?.receivingDepartment as string} />
        <Field label="Bác sĩ nhận bệnh" value={record?.receivingDoctor as string} />
      </div>

      <SignatureBlock leftTitle="ĐIỀU DƯỠNG TRIAGE" rightTitle="BÁC SĨ CẤP CỨU" date={record?.triageTime ? new Date(record.triageTime as string) : new Date()} />
    </div>
  )
);
TriageAssessmentPrint.displayName = 'TriageAssessmentPrint';

// =========================================================
// MS. 21/BV — Phiếu bàn giao chuyển khoa (Bác sĩ)
// =========================================================
export const DeptTransferDocPrint = forwardRef<HTMLDivElement, { record?: Rec }>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS. 21/BV" />
      <h2>PHIẾU BÀN GIAO CHUYỂN KHOA</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>(Bác sĩ)</div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên BN" value={record?.patientName as string} /></div>
          <div className="col"><Field label="Tuổi" value={record?.age as string} /></div>
          <div className="col"><Field label="Giới" value={record?.gender === 1 ? 'Nam' : record?.gender === 2 ? 'Nữ' : record?.genderText as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={record?.patientCode as string} /></div>
          <div className="col"><Field label="Số BA" value={record?.medicalRecordCode as string} /></div>
          <div className="col"><Field label="Số BHYT" value={record?.insuranceNumber as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Ngày giờ chuyển" value={record?.transferDateTime ? dayjs(record.transferDateTime as string).format('DD/MM/YYYY HH:mm') : undefined} /></div>
          <div className="col"><Field label="Khoa giao" value={record?.fromDepartment as string} /></div>
          <div className="col"><Field label="Khoa nhận" value={record?.toDepartment as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Buồng/Giường hiện tại" value={record?.currentBed as string} /></div>
          <div className="col"><Field label="Buồng/Giường tiếp nhận" value={record?.newBed as string} /></div>
        </div>
      </div>

      <div className="section">
        <div className="section-title">I. CHẨN ĐOÁN</div>
        <Field label="Chẩn đoán hiện tại" value={record?.currentDiagnosis as string} />
        <Field label="Mã ICD-10" value={record?.icdCode as string} />
        <Field label="Chẩn đoán kèm theo" value={record?.comorbidities as string} />
      </div>

      <div className="section">
        <div className="section-title">II. TÓM TẮT BỆNH SỬ VÀ DIỄN BIẾN</div>
        <Lines content={record?.clinicalSummary} count={4} />
      </div>

      <div className="section">
        <div className="section-title">III. DẤU HIỆU SINH TỒN LÚC CHUYỂN</div>
        <div className="row">
          <div className="col"><Field label="Mạch (l/p)" value={record?.pulse as string} /></div>
          <div className="col"><Field label="HA (mmHg)" value={record?.bloodPressure as string} /></div>
          <div className="col"><Field label="Nhiệt độ (°C)" value={record?.temperature as string} /></div>
          <div className="col"><Field label="SpO2 (%)" value={record?.spo2 as string} /></div>
          <div className="col"><Field label="GCS" value={record?.gcs as string} /></div>
        </div>
        <Field label="Tình trạng lúc chuyển" value={record?.conditionOnTransfer as string} />
      </div>

      <div className="section">
        <div className="section-title">IV. THUỐC ĐANG DÙNG / Y LỆNH ĐANG THI HÀNH</div>
        <Lines content={record?.currentMedications} count={3} />
        <Lines content={record?.activeOrders} count={2} />
      </div>

      <div className="section">
        <div className="section-title">V. KẾT QUẢ CLS QUAN TRỌNG</div>
        <Lines content={record?.keyLabResults} count={3} />
      </div>

      <div className="section">
        <div className="section-title">VI. LÝ DO CHUYỂN KHOA</div>
        <Lines content={record?.transferReason} count={2} />
      </div>

      <div className="section">
        <div className="section-title">VII. DẶN DÒ / Y LỆNH TIẾP THEO</div>
        <Lines content={record?.handoverInstructions} count={3} />
      </div>

      <SignatureBlock
        leftTitle="BÁC SĨ KHOA GIAO"
        rightTitle="BÁC SĨ KHOA NHẬN"
        date={record?.transferDateTime ? new Date(record.transferDateTime as string) : new Date()}
      />
    </div>
  )
);
DeptTransferDocPrint.displayName = 'DeptTransferDocPrint';

// =========================================================
// DD. 22 — Phiếu bàn giao chuyển khoa (Điều dưỡng)
// =========================================================
export const DeptTransferNursePrint = forwardRef<HTMLDivElement, { record?: Rec }>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 22" />
      <h2>PHIẾU BÀN GIAO CHUYỂN KHOA</h2>
      <div style={{ textAlign: 'center', fontSize: 12, fontStyle: 'italic', marginBottom: 8 }}>(Điều dưỡng)</div>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Họ và tên BN" value={record?.patientName as string} /></div>
          <div className="col"><Field label="Tuổi" value={record?.age as string} /></div>
          <div className="col"><Field label="Giới" value={record?.gender === 1 ? 'Nam' : record?.gender === 2 ? 'Nữ' : record?.genderText as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Mã BN" value={record?.patientCode as string} /></div>
          <div className="col"><Field label="Số BA" value={record?.medicalRecordCode as string} /></div>
        </div>
        <div className="row">
          <div className="col"><Field label="Ngày giờ chuyển" value={record?.transferDateTime ? dayjs(record.transferDateTime as string).format('DD/MM/YYYY HH:mm') : undefined} /></div>
          <div className="col"><Field label="Khoa giao" value={record?.fromDepartment as string} /></div>
          <div className="col"><Field label="Khoa nhận" value={record?.toDepartment as string} /></div>
        </div>
        <Field label="Chẩn đoán" value={record?.currentDiagnosis as string} />
      </div>

      <div className="section">
        <div className="section-title">I. SINH HIỆU LÚC BÀN GIAO</div>
        <div className="row">
          <div className="col"><Field label="Mạch (l/p)" value={record?.pulse as string} /></div>
          <div className="col"><Field label="HA (mmHg)" value={record?.bloodPressure as string} /></div>
          <div className="col"><Field label="Nhiệt độ (°C)" value={record?.temperature as string} /></div>
          <div className="col"><Field label="SpO2 (%)" value={record?.spo2 as string} /></div>
          <div className="col"><Field label="GCS" value={record?.gcs as string} /></div>
        </div>
        <Field label="Cân nặng (kg)" value={record?.weight as string} />
      </div>

      <div className="section">
        <div className="section-title">II. NHẬN ĐỊNH ĐIỀU DƯỠNG LÚC BÀN GIAO</div>
        <div className="row">
          <div className="col"><Field label="Ý thức" value={record?.consciousness as string} /></div>
          <div className="col"><Field label="Đau (VAS)" value={record?.painScore as string} /></div>
        </div>
        <div className="row">
          <div className="col">
            <span style={{ fontWeight: 'bold' }}>Tình trạng da: </span>
            <Chk label="Bình thường" checked={record?.skinNormal === true} />
            <Chk label="Có vết loét" checked={record?.skinNormal === false} />
          </div>
          <div className="col">
            <span style={{ fontWeight: 'bold' }}>Nguy cơ té ngã: </span>
            <Chk label="Thấp" checked={record?.fallRisk === 'low'} />
            <Chk label="Trung bình" checked={record?.fallRisk === 'medium'} />
            <Chk label="Cao" checked={record?.fallRisk === 'high'} />
          </div>
        </div>
        <Field label="Đường truyền / Catheter" value={record?.ivLines as string} />
        <Field label="Dẫn lưu / Sonde" value={record?.drains as string} />
        <Field label="Vết thương / Vết mổ" value={record?.wounds as string} />
      </div>

      <div className="section">
        <div className="section-title">III. THUỐC VÀ Y LỆNH ĐIỀU DƯỠNG ĐANG THỰC HIỆN</div>
        <Lines content={record?.currentMedications} count={3} />
      </div>

      <div className="section">
        <div className="section-title">IV. TÀI SẢN VÀ ĐỒ DÙNG CÁ NHÂN</div>
        <div className="row">
          <div className="col">
            <Chk label="Quần áo" checked={record?.personalBelongings} />
            <Chk label="Điện thoại" checked={record?.hasPhone} />
            <Chk label="Tiền mặt" checked={record?.hasCash} />
          </div>
          <div className="col">
            <Chk label="Tư trang" checked={record?.hasValuables} />
            <Chk label="CCCD/BHYT" checked={record?.hasDocuments} />
          </div>
        </div>
        <Field label="Ghi chú tài sản" value={record?.belongingsNote as string} />
      </div>

      <div className="section">
        <div className="section-title">V. DẶN DÒ ĐẶC BIỆT</div>
        <Lines content={record?.specialInstructions} count={2} />
      </div>

      <SignatureBlock
        leftTitle="ĐD KHOA GIAO"
        rightTitle="ĐD KHOA NHẬN"
        date={record?.transferDateTime ? new Date(record.transferDateTime as string) : new Date()}
      />
    </div>
  )
);
DeptTransferNursePrint.displayName = 'DeptTransferNursePrint';
