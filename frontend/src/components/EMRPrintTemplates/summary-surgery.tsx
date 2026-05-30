import { forwardRef } from 'react';
import dayjs from 'dayjs';
import type { MedicalRecordFullDto } from '../../api/examination';
import { printStyles, PrintHeader, SignatureBlock, Field } from './_shared';
interface DeathReviewProps {
  record: MedicalRecordFullDto;
  admissionDate?: string;
  deathDate?: string;
  departmentName?: string;
  admissionDiagnosis?: string;
  finalDiagnosis?: string;
  causeOfDeath?: string;
  treatmentTimeline?: string;
  reviewFindings?: string;
  lessonsLearned?: string;
  preventionMeasures?: string;
  committeeMembers?: Array<{ name: string; title: string }>;
  chairmanName?: string;
}

export const DeathReviewPrint = forwardRef<HTMLDivElement, DeathReviewProps>(
  ({ record, admissionDate, deathDate, departmentName, admissionDiagnosis, finalDiagnosis, causeOfDeath, treatmentTimeline, reviewFindings, lessonsLearned, preventionMeasures, committeeMembers, chairmanName: _chairmanName }, ref) => {
    const p = record.patient;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 10/BV" />
        <h2>BIÊN BẢN KIỂM ĐIỂM TỬ VONG</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên BN" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã BN" value={p?.patientCode} /></div>
            <div className="col"><Field label="Khoa" value={departmentName} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Ngày vào viện" value={admissionDate ? dayjs(admissionDate).format('DD/MM/YYYY HH:mm') : undefined} /></div>
            <div className="col"><Field label="Ngày tử vong" value={deathDate ? dayjs(deathDate).format('DD/MM/YYYY HH:mm') : undefined} /></div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">I. CHẨN ĐOÁN</div>
          <Field label="Chẩn đoán lúc vào viện" value={admissionDiagnosis} />
          <Field label="Chẩn đoán cuối cùng" value={finalDiagnosis ?? record.diagnoses?.[0]?.icdName} />
          <Field label="Nguyên nhân tử vong" value={causeOfDeath} />
        </div>

        <div className="section">
          <div className="section-title">II. TÓM TẮT QUÁ TRÌNH ĐIỀU TRỊ</div>
          <div style={{ minHeight: 100, padding: 4 }}>{treatmentTimeline ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">III. NHẬN XÉT</div>
          <div style={{ minHeight: 80, padding: 4 }}>{reviewFindings ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">IV. BÀI HỌC KINH NGHIỆM</div>
          <div style={{ minHeight: 60, padding: 4 }}>{lessonsLearned ?? '...'}</div>
          <Field label="Biện pháp phòng tránh" value={preventionMeasures} />
        </div>

        {committeeMembers && committeeMembers.length > 0 && (
          <div className="section">
            <div className="section-title">V. THÀNH PHẦN THAM DỰ</div>
            <table>
              <thead>
                <tr><th>STT</th><th>Họ tên</th><th>Chức danh</th><th>Ký tên</th></tr>
              </thead>
              <tbody>
                {committeeMembers.map((m, i) => (
                  <tr key={m.name}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>{m.name}</td>
                    <td>{m.title}</td>
                    <td style={{ width: 120 }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <SignatureBlock leftTitle="THƯ KÝ" rightTitle="CHỦ TỌA HỘI ĐỒNG" date={new Date()} />
      </div>
    );
  }
);
DeathReviewPrint.displayName = 'DeathReviewPrint';

// ===========================
// 11. TONG KET HO SO BENH AN (Medical Record Final Summary)
// ===========================
interface MedicalRecordFinalSummaryProps {
  record: MedicalRecordFullDto;
  admissionDate?: string;
  dischargeDate?: string;
  departmentName?: string;
  bedNumber?: string;
  admissionDiagnosis?: string;
  treatmentHistory?: string;
  surgeryHistory?: string;
  labSummary?: string;
  imagingSummary?: string;
  treatmentPlan?: string;
  treatmentResult?: 'Khỏi' | 'Đỡ, giảm' | 'Không thay đổi' | 'Nặng hơn' | 'Tử vong';
  dischargeCondition?: string;
  dischargeInstructions?: string;
  followUpDate?: string;
  attendingDoctorName?: string;
  headOfDepartmentName?: string;
}

export const MedicalRecordFinalSummaryPrint = forwardRef<HTMLDivElement, MedicalRecordFinalSummaryProps>(
  ({ record, admissionDate, dischargeDate, departmentName, bedNumber, admissionDiagnosis, treatmentHistory: _treatmentHistory, surgeryHistory, labSummary, imagingSummary, treatmentPlan, treatmentResult, dischargeCondition, dischargeInstructions, followUpDate, attendingDoctorName, headOfDepartmentName }, ref) => {
    const p = record.patient;
    const vs = record.vitalSigns;
    const iv = record.interview;
    const pe = record.physicalExam;
    const primaryDiag = record.diagnoses?.find(d => d.diagnosisType === 1);
    const resultOptions = ['Khỏi', 'Đỡ, giảm', 'Không thay đổi', 'Nặng hơn', 'Tử vong'];

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 11/BV" />
        <h2>TỔNG KẾT HỒ SƠ BỆNH ÁN</h2>

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
          <Field label="Địa chỉ" value={p?.address} />
          <div className="row">
            <div className="col"><Field label="Ngày vào viện" value={admissionDate ? dayjs(admissionDate).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Ngày ra viện" value={dischargeDate ? dayjs(dischargeDate).format('DD/MM/YYYY') : undefined} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Khoa" value={departmentName} /></div>
            <div className="col"><Field label="Giường" value={bedNumber} /></div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">I. CHẨN ĐOÁN</div>
          <Field label="Khi vào viện" value={admissionDiagnosis} />
          <Field label="Khi ra viện" value={primaryDiag ? `${primaryDiag.icdCode} - ${primaryDiag.icdName}` : undefined} />
          {record.diagnoses?.filter(d => d.diagnosisType !== 1).length > 0 && (
            <Field label="Bệnh kèm theo" value={record.diagnoses.filter(d => d.diagnosisType !== 1).map(d => `${d.icdCode} - ${d.icdName}`).join('; ')} />
          )}
        </div>

        <div className="section">
          <div className="section-title">II. QUÁ TRÌNH BỆNH LÝ VÀ DIỄN BIẾN LÂM SÀNG</div>
          <Field label="Lý do vào viện" value={iv?.chiefComplaint} />
          <Field label="Quá trình bệnh lý" value={iv?.historyOfPresentIllness} />
          <Field label="Tiền sử" value={iv?.pastMedicalHistory} />
          {vs && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 12 }}>Khám lúc vào viện:</strong>
              <div className="row">
                <div className="col"><Field label="Mạch" value={vs.pulse ? `${vs.pulse} l/ph` : undefined} /></div>
                <div className="col"><Field label="HA" value={vs.systolicBP ? `${vs.systolicBP}/${vs.diastolicBP}` : undefined} /></div>
                <div className="col"><Field label="Nhiệt độ" value={vs.temperature ? `${vs.temperature}°C` : undefined} /></div>
                <div className="col"><Field label="CN" value={vs.weight ? `${vs.weight}kg` : undefined} /></div>
              </div>
            </div>
          )}
          {pe?.generalAppearance && <Field label="Khám toàn thân" value={pe.generalAppearance} />}
        </div>

        <div className="section">
          <div className="section-title">III. KẾT QUẢ CẬN LÂM SÀNG CHỦ YẾU</div>
          <Field label="Xét nghiệm" value={labSummary} />
          <Field label="Chẩn đoán hình ảnh" value={imagingSummary} />
        </div>

        <div className="section">
          <div className="section-title">IV. PHƯƠNG PHÁP ĐIỀU TRỊ</div>
          <div style={{ minHeight: 60, padding: 4 }}>{treatmentPlan ?? '...'}</div>
          {surgeryHistory && <Field label="Phẫu thuật / thủ thuật" value={surgeryHistory} />}
        </div>

        <div className="section">
          <div className="section-title">V. TÌNH TRẠNG NGƯỜI BỆNH RA VIỆN</div>
          <div style={{ padding: '4px 0' }}>
            <strong>Kết quả điều trị: </strong>
            {resultOptions.map(opt => (
              <span key={opt} style={{ marginRight: 16 }}>
                {treatmentResult === opt ? '☑' : '☐'} {opt}
              </span>
            ))}
          </div>
          <Field label="Tình trạng ra viện" value={dischargeCondition} />
        </div>

        <div className="section">
          <div className="section-title">VI. HƯỚNG ĐIỀU TRỊ VÀ CÁC CHẾ ĐỘ TIẾP THEO</div>
          <div style={{ minHeight: 40, padding: 4 }}>{dischargeInstructions ?? '...'}</div>
          {followUpDate && <Field label="Hẹn tái khám" value={dayjs(followUpDate).format('DD/MM/YYYY')} />}
        </div>

        <div className="signature-row" style={{ marginTop: 24 }}>
          <div className="sig">
            <div className="sig-title">TRƯỞNG KHOA</div>
            <div className="sig-date">(Ký, ghi rõ họ tên)</div>
            <div style={{ marginTop: 40 }}>{headOfDepartmentName ?? ''}</div>
          </div>
          <div className="sig">
            <div className="sig-date">
              Ngày {dayjs().format('DD')} tháng {dayjs().format('MM')} năm {dayjs().format('YYYY')}
            </div>
            <div className="sig-title">BÁC SĨ ĐIỀU TRỊ</div>
            <div className="sig-date">(Ký, ghi rõ họ tên)</div>
            <div style={{ marginTop: 40 }}>{attendingDoctorName ?? ''}</div>
          </div>
        </div>
      </div>
    );
  }
);
MedicalRecordFinalSummaryPrint.displayName = 'MedicalRecordFinalSummaryPrint';

// ============================================================
// MS. 12/BV - Phiếu khám dinh dưỡng (Nutrition Examination)
// ============================================================
interface NutritionExamProps { record?: MedicalRecordFullDto | null; }
export const NutritionExamPrint = forwardRef<HTMLDivElement, NutritionExamProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 12/BV" />
        <h2>PHIẾU KHÁM DINH DƯỠNG</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Khoa" value={(record as MedicalRecordFullDto & { departmentName?: string })?.departmentName} /></div><div className="col"><Field label="Buồng" /></div><div className="col"><Field label="Giường" /></div></div>
          <Field label="Chẩn đoán" value={record?.diagnoses?.[0]?.icdName} />
        </div>
        <div className="section">
          <div className="section-title">I. ĐÁNH GIÁ DINH DƯỠNG</div>
          <div className="row"><div className="col"><Field label="Chiều cao (cm)" /></div><div className="col"><Field label="Cân nặng (kg)" /></div><div className="col"><Field label="BMI" /></div></div>
          <Field label="Tình trạng dinh dưỡng" />
          <div style={{ margin: '4px 0' }}>□ Bình thường &nbsp; □ Suy dinh dưỡng nhẹ &nbsp; □ Suy dinh dưỡng vừa &nbsp; □ Suy dinh dưỡng nặng &nbsp; □ Thừa cân/Béo phì</div>
          <Field label="Albumin máu (g/dL)" />
          <Field label="Tiền sử ăn uống" />
          <Field label="Dị ứng thức ăn" />
          <Field label="Bệnh lý liên quan dinh dưỡng" />
        </div>
        <div className="section">
          <div className="section-title">II. NHU CẦU DINH DƯỠNG</div>
          <div className="row"><div className="col"><Field label="Năng lượng (kcal/ngày)" /></div><div className="col"><Field label="Protein (g/ngày)" /></div></div>
          <div className="row"><div className="col"><Field label="Lipid (g/ngày)" /></div><div className="col"><Field label="Glucid (g/ngày)" /></div></div>
          <Field label="Nước (ml/ngày)" />
          <Field label="Chế độ ăn chỉ định" />
          <div style={{ margin: '4px 0' }}>□ Ăn thường &nbsp; □ Ăn mềm &nbsp; □ Ăn lỏng &nbsp; □ Ăn qua sonde &nbsp; □ Nuôi dưỡng tĩnh mạch &nbsp; □ Khác: ............</div>
        </div>
        <div className="section">
          <div className="section-title">III. KẾ HOẠCH DINH DƯỠNG</div>
          <Field label="Mục tiêu" />
          <Field label="Thực đơn gợi ý" />
          <Field label="Lưu ý đặc biệt" />
          <Field label="Ngày tái đánh giá" />
        </div>
        <SignatureBlock leftTitle="ĐIỀU DƯỠNG DINH DƯỠNG" rightTitle="BÁC SĨ DINH DƯỠNG" date={new Date()} />
      </div>
    );
  }
);
NutritionExamPrint.displayName = 'NutritionExamPrint';

// ============================================================
// MS. 13/BV - Phiếu phẫu thuật / thủ thuật (Surgery Record)
// ============================================================
interface SurgeryRecordProps { record?: MedicalRecordFullDto | null; }
export const SurgeryRecordPrint = forwardRef<HTMLDivElement, SurgeryRecordProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 13/BV" />
        <h2>PHIẾU PHẪU THUẬT / THỦ THUẬT</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Mã BN" value={p?.patientCode} /></div><div className="col"><Field label="Khoa" value={(record as MedicalRecordFullDto & { departmentName?: string })?.departmentName} /></div></div>
          <Field label="Chẩn đoán trước mổ" value={record?.diagnoses?.[0]?.icdName} />
          <Field label="Chẩn đoán sau mổ" />
        </div>
        <div className="section">
          <div className="section-title">I. THÔNG TIN PHẪU THUẬT</div>
          <Field label="Tên phẫu thuật/thủ thuật" />
          <div className="row"><div className="col"><Field label="Ngày giờ bắt đầu" /></div><div className="col"><Field label="Ngày giờ kết thúc" /></div></div>
          <div className="row"><div className="col"><Field label="Phương pháp vô cảm" /></div><div className="col"><Field label="Loại PT" /></div></div>
          <div style={{ margin: '4px 0' }}>Phân loại: □ Cấp cứu &nbsp; □ Phiên &nbsp; | &nbsp; □ Đặc biệt &nbsp; □ Loại I &nbsp; □ Loại II &nbsp; □ Loại III</div>
        </div>
        <div className="section">
          <div className="section-title">II. KÍP PHẪU THUẬT</div>
          <div className="row"><div className="col"><Field label="Phẫu thuật viên chính" /></div><div className="col"><Field label="Phụ mổ 1" /></div></div>
          <div className="row"><div className="col"><Field label="Phụ mổ 2" /></div><div className="col"><Field label="Bác sĩ gây mê" /></div></div>
          <div className="row"><div className="col"><Field label="Dụng cụ viên" /></div><div className="col"><Field label="Chạy ngoài" /></div></div>
        </div>
        <div className="section">
          <div className="section-title">III. MÔ TẢ PHẪU THUẬT</div>
          <Field label="Tư thế bệnh nhân" />
          <Field label="Đường mổ" />
          <Field label="Mô tả tổn thương" />
          <Field label="Cách thức phẫu thuật" />
          <div style={{ minHeight: 80, border: '1px dotted #999', margin: '4px 0', padding: 4 }} />
          <Field label="Dẫn lưu" />
          <Field label="Bệnh phẩm gửi GPB" />
          <Field label="Lượng máu mất (ml)" />
          <Field label="Lượng máu truyền (ml)" />
        </div>
        <div className="section">
          <div className="section-title">IV. THEO DÕI SAU MỔ</div>
          <Field label="Huyết áp" /><Field label="Mạch" /><Field label="SpO2" />
          <Field label="Tình trạng sau mổ" />
          <Field label="Y lệnh sau mổ" />
        </div>
        <SignatureBlock leftTitle="PHẪU THUẬT VIÊN CHÍNH" rightTitle="BÁC SĨ GÂY MÊ" date={new Date()} />
      </div>
    );
  }
);
SurgeryRecordPrint.displayName = 'SurgeryRecordPrint';

// ============================================================
// MS. 14/BV - Phiếu duyệt phẫu thuật (Surgery Approval)
// ============================================================
interface SurgeryApprovalProps { record?: MedicalRecordFullDto | null; }
export const SurgeryApprovalPrint = forwardRef<HTMLDivElement, SurgeryApprovalProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 14/BV" />
        <h2>PHIẾU DUYỆT PHẪU THUẬT / THỦ THUẬT</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Mã BN" value={p?.patientCode} /></div><div className="col"><Field label="Khoa" value={(record as MedicalRecordFullDto & { departmentName?: string })?.departmentName} /></div></div>
          <Field label="Chẩn đoán" value={record?.diagnoses?.[0]?.icdName} />
        </div>
        <div className="section">
          <div className="section-title">I. ĐỀ NGHỊ PHẪU THUẬT</div>
          <Field label="Phẫu thuật viên đề nghị" />
          <Field label="Tên phẫu thuật/thủ thuật dự kiến" />
          <div style={{ margin: '4px 0' }}>Phân loại: □ Cấp cứu &nbsp; □ Phiên &nbsp; | &nbsp; □ Đặc biệt &nbsp; □ Loại I &nbsp; □ Loại II &nbsp; □ Loại III</div>
          <Field label="Phương pháp vô cảm dự kiến" />
          <Field label="Lý do phẫu thuật" />
          <Field label="Tình trạng bệnh nhân hiện tại" />
          <Field label="Kết quả CLS liên quan" />
        </div>
        <div className="section">
          <div className="section-title">II. Ý KIẾN HỘI CHẨN (nếu có)</div>
          <Field label="Ngày hội chẩn" />
          <Field label="Kết luận hội chẩn" />
        </div>
        <div className="section">
          <div className="section-title">III. DUYỆT PHẪU THUẬT</div>
          <div style={{ margin: '4px 0' }}>□ Đồng ý phẫu thuật/thủ thuật &nbsp; □ Không đồng ý</div>
          <Field label="Ý kiến" />
          <Field label="Yêu cầu bổ sung" />
        </div>
        <div className="signature-row">
          <div className="sig"><div className="sig-title">BS ĐỀ NGHỊ</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
          <div className="sig"><div className="sig-title">TRƯỞNG KHOA</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
          <div className="sig">
            <div className="sig-date">Ngày {dayjs().format('DD')} tháng {dayjs().format('MM')} năm {dayjs().format('YYYY')}</div>
            <div className="sig-title">GIÁM ĐỐC/PHÓ GĐ</div><div className="sig-date">(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </div>
    );
  }
);
SurgeryApprovalPrint.displayName = 'SurgeryApprovalPrint';

// ============================================================
// MS. 15/BV - Sơ kết phẫu thuật (Surgery Summary)
// ============================================================
interface SurgerySummaryProps { record?: MedicalRecordFullDto | null; }
export const SurgerySummaryPrint = forwardRef<HTMLDivElement, SurgerySummaryProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 15/BV" />
        <h2>SƠ KẾT PHẪU THUẬT / THỦ THUẬT</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Mã BN" value={p?.patientCode} /></div><div className="col"><Field label="Khoa" value={(record as MedicalRecordFullDto & { departmentName?: string })?.departmentName} /></div></div>
          <Field label="Chẩn đoán trước mổ" value={record?.diagnoses?.[0]?.icdName} />
        </div>
        <div className="section">
          <div className="section-title">I. TÓM TẮT PHẪU THUẬT</div>
          <Field label="Tên phẫu thuật đã thực hiện" />
          <div className="row"><div className="col"><Field label="Ngày mổ" /></div><div className="col"><Field label="Thời gian mổ (phút)" /></div></div>
          <Field label="Phẫu thuật viên chính" />
          <Field label="Phương pháp vô cảm" />
          <Field label="Chẩn đoán sau mổ" />
        </div>
        <div className="section">
          <div className="section-title">II. DIỄN BIẾN SAU MỔ</div>
          <table><thead><tr><th>Ngày</th><th>Thể trạng</th><th>Vết mổ</th><th>Dẫn lưu</th><th>Biến chứng</th><th>Xử trí</th></tr></thead>
          <tbody>{[1,2,3,4,5].map(i => <tr key={i}><td style={{height:24}}></td><td></td><td></td><td></td><td></td><td></td></tr>)}</tbody></table>
        </div>
        <div className="section">
          <div className="section-title">III. ĐÁNH GIÁ KẾT QUẢ</div>
          <div style={{ margin: '4px 0' }}>□ Tốt &nbsp; □ Khá &nbsp; □ Trung bình &nbsp; □ Xấu</div>
          <Field label="Nhận xét" />
          <Field label="Hướng điều trị tiếp theo" />
          <Field label="Bài học kinh nghiệm" />
        </div>
        <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="PHẪU THUẬT VIÊN CHÍNH" date={new Date()} />
      </div>
    );
  }
);
SurgerySummaryPrint.displayName = 'SurgerySummaryPrint';

// ============================================================
// MS. 16/BV - Phiếu bàn giao BN chuyển khoa (Department Transfer)
// ============================================================
interface DeptTransferProps { record?: MedicalRecordFullDto | null; }
export const DepartmentTransferPrint = forwardRef<HTMLDivElement, DeptTransferProps>(
  ({ record }, ref) => {
    const p = record?.patient;
    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 16/BV" />
        <h2>PHIẾU BÀN GIAO NGƯỜI BỆNH CHUYỂN KHOA</h2>
        <div className="section">
          <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
          <div className="row"><div className="col"><Field label="Mã BN" value={p?.patientCode} /></div><div className="col"><Field label="Số BHYT" value={(p as (typeof p) & { insuranceNumber?: string })?.insuranceNumber} /></div></div>
          <div className="row"><div className="col"><Field label="Khoa chuyển" value={(record as MedicalRecordFullDto & { departmentName?: string })?.departmentName} /></div><div className="col"><Field label="Khoa nhận" /></div></div>
          <div className="row"><div className="col"><Field label="Ngày giờ chuyển" /></div><div className="col"><Field label="Ngày giờ nhận" /></div></div>
        </div>
        <div className="section">
          <div className="section-title">I. TÌNH TRẠNG NGƯỜI BỆNH KHI CHUYỂN</div>
          <Field label="Chẩn đoán" value={record?.diagnoses?.[0]?.icdName} />
          <Field label="Tóm tắt diễn biến bệnh" />
          <Field label="Điều trị đã thực hiện" />
          <div className="row"><div className="col"><Field label="Tri giác" /></div><div className="col"><Field label="Mạch" /></div><div className="col"><Field label="Huyết áp" /></div></div>
          <div className="row"><div className="col"><Field label="Nhiệt độ" /></div><div className="col"><Field label="Nhịp thở" /></div><div className="col"><Field label="SpO2" /></div></div>
          <Field label="Tình trạng đặc biệt cần lưu ý" />
        </div>
        <div className="section">
          <div className="section-title">II. CÁC VẬT DỤNG BÀN GIAO</div>
          <div style={{ margin: '4px 0' }}>□ Hồ sơ bệnh án &nbsp; □ Phim X-quang/CT &nbsp; □ Kết quả XN &nbsp; □ Thuốc đang dùng &nbsp; □ Dịch truyền &nbsp; □ Tư trang cá nhân</div>
          <Field label="Khác" />
        </div>
        <div className="section">
          <div className="section-title">III. LÝ DO CHUYỂN KHOA</div>
          <Field label="Lý do" />
          <Field label="Yêu cầu khoa nhận" />
        </div>
        <div className="signature-row">
          <div className="sig"><div className="sig-title">BÊN GIAO</div><div className="sig-date">BS: ............................</div><div className="sig-date">ĐD: ............................</div></div>
          <div className="sig"><div className="sig-title">BÊN NHẬN</div><div className="sig-date">BS: ............................</div><div className="sig-date">ĐD: ............................</div></div>
          <div className="sig"><div className="sig-title">NGƯỜI VẬN CHUYỂN</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
        </div>
      </div>
    );
  }
);
DepartmentTransferPrint.displayName = 'DepartmentTransferPrint';

// ============================================================
// MS. 17/BV - Phiếu khám vào viện (Admission Examination)
// ============================================================
