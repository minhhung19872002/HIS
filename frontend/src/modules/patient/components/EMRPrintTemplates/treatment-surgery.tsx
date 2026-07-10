import { forwardRef } from 'react';
import dayjs from 'dayjs';
import type { MedicalRecordFullDto, NursingCareSheetDto } from '../../../../api/examination';
import { printStyles, PrintHeader, SignatureBlock, Field } from './_shared';
interface NursingCarePrintProps {
  record: MedicalRecordFullDto;
  sheets: NursingCareSheetDto[];
}

export const NursingCarePrint = forwardRef<HTMLDivElement, NursingCarePrintProps>(
  ({ record, sheets }, ref) => {
    const p = record.patient;
    const shiftName = (s: number) => s === 1 ? 'Sáng' : s === 2 ? 'Chiều' : 'Đêm';

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 05/BV" />
        <h2>PHIẾU CHĂM SÓC ĐIỀU DƯỠNG</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <Field label="Mã BN" value={p?.patientCode} />
          <Field label="Chẩn đoán" value={record.diagnoses?.[0] ? `${record.diagnoses[0].icdCode} - ${record.diagnoses[0].icdName}` : undefined} />
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: 90 }}>Ngày</th>
              <th style={{ width: 50 }}>Ca</th>
              <th>Tình trạng BN</th>
              <th>Nhận định ĐD</th>
              <th>Can thiệp ĐD</th>
              <th>Đáp ứng BN</th>
              <th style={{ width: 80 }}>ĐD thực hiện</th>
            </tr>
          </thead>
          <tbody>
            {sheets.length > 0 ? sheets.map(s => (
              <tr key={s.id}>
                <td>{dayjs(s.careDate).format('DD/MM/YYYY')}</td>
                <td style={{ textAlign: 'center' }}>{shiftName(s.shift)}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.patientCondition ?? ''}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.nursingAssessment ?? ''}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.nursingInterventions ?? ''}</td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{s.patientResponse ?? ''}</td>
                <td>{s.nurseName ?? ''}</td>
              </tr>
            )) : (
              <tr><td colSpan={7} style={{ height: 200, verticalAlign: 'top' }}>&nbsp;</td></tr>
            )}
          </tbody>
        </table>

        <SignatureBlock leftTitle="ĐIỀU DƯỠNG TRƯỞNG" rightTitle="ĐIỀU DƯỠNG THỰC HIỆN" date={new Date()} />
      </div>
    );
  }
);
NursingCarePrint.displayName = 'NursingCarePrint';

// ===========================
// 6. PHIEU KHAM TIEN ME (Pre-Anesthetic Examination)
// ===========================
interface PreAnestheticExamProps {
  record: MedicalRecordFullDto;
  asaClassification?: number;
  mallampatiScore?: number;
  airwayAssessment?: string;
  anesthesiaType?: string;
  anesthesiaPlan?: string;
  risks?: string;
  preOpInstructions?: string;
  anesthesiologistName?: string;
}

export const PreAnestheticExamPrint = forwardRef<HTMLDivElement, PreAnestheticExamProps>(
  ({ record, asaClassification, mallampatiScore, airwayAssessment, anesthesiaType, anesthesiaPlan, risks, preOpInstructions, anesthesiologistName: _anesthesiologistName }, ref) => {
    const p = record.patient;
    const vs = record.vitalSigns;
    const iv = record.interview;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 06/BV" />
        <h2>PHIẾU KHÁM TIỀN MÊ</h2>

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

        <div className="section">
          <div className="section-title">I. TIỀN SỬ</div>
          <Field label="Tiền sử bệnh" value={iv?.pastMedicalHistory} />
          <Field label="Tiền sử dị ứng" value={record.allergies?.map(a => a.allergenName).join(', ') || 'Không'} />
          <Field label="Tiền sử phẫu thuật / gây mê" value={iv?.surgicalHistory} />
          <Field label="Thuốc đang dùng" value={iv?.medicationHistory} />
        </div>

        <div className="section">
          <div className="section-title">II. KHÁM HIỆN TẠI</div>
          {vs && (
            <>
              <div className="row">
                <div className="col"><Field label="Mạch" value={vs.pulse ? `${vs.pulse} l/ph` : undefined} /></div>
                <div className="col"><Field label="HA" value={vs.systolicBP ? `${vs.systolicBP}/${vs.diastolicBP} mmHg` : undefined} /></div>
                <div className="col"><Field label="Nhiệt độ" value={vs.temperature ? `${vs.temperature}°C` : undefined} /></div>
              </div>
              <div className="row">
                <div className="col"><Field label="Cân nặng" value={vs.weight ? `${vs.weight} kg` : undefined} /></div>
                <div className="col"><Field label="Chiều cao" value={vs.height ? `${vs.height} cm` : undefined} /></div>
                <div className="col"><Field label="SpO2" value={vs.spO2 ? `${vs.spO2}%` : undefined} /></div>
              </div>
            </>
          )}
        </div>

        <div className="section">
          <div className="section-title">III. ĐÁNH GIÁ GÂY MÊ</div>
          <Field label="Phân loại ASA" value={asaClassification ? `ASA ${asaClassification}` : undefined} />
          <Field label="Mallampati" value={mallampatiScore ? `Độ ${mallampatiScore}` : undefined} />
          <Field label="Đánh giá đường thở" value={airwayAssessment} />
        </div>

        <div className="section">
          <div className="section-title">IV. KẾ HOẠCH GÂY MÊ</div>
          <Field label="Phương pháp vô cảm" value={anesthesiaType} />
          <Field label="Kế hoạch gây mê" value={anesthesiaPlan} />
          <Field label="Nguy cơ" value={risks} />
        </div>

        <div className="section">
          <div className="section-title">V. CHỈ DẪN TRƯỚC MỔ</div>
          <div style={{ minHeight: 60, padding: 4 }}>{preOpInstructions ?? 'Nhịn ăn uống trước mổ 6-8 giờ. Tháo trang sức, răng giả. Thụt tháo nếu cần.'}</div>
        </div>

        <SignatureBlock leftTitle="BÁC SĨ GÂY MÊ" rightTitle="TRƯỞNG KHOA GÂY MÊ" date={new Date()} />
      </div>
    );
  }
);
PreAnestheticExamPrint.displayName = 'PreAnestheticExamPrint';

// ===========================
// 7. CAM KET PHAU THUAT (Surgery Consent Form)
// ===========================
interface SurgeryConsentProps {
  patientName: string;
  patientCode: string;
  gender: number;
  age: number;
  address?: string;
  diagnosisName?: string;
  procedureName?: string;
  surgeonName?: string;
  anesthesiaType?: string;
  risksExplained?: string;
  alternatives?: string;
  familyName?: string;
  familyRelationship?: string;
}

export const SurgeryConsentPrint = forwardRef<HTMLDivElement, SurgeryConsentProps>(
  (props, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="MS. 07/BV" />
      <h2>GIẤY CAM KẾT PHẪU THUẬT / THỦ THUẬT</h2>

      <div className="section" style={{ lineHeight: 2 }}>
        <p>Tôi tên là: <span className="field-value">{props.familyName ?? '...........................'}</span></p>
        <p>Quan hệ với người bệnh: <span className="field-value">{props.familyRelationship ?? '...........................'}</span></p>
        <p>Là thân nhân của người bệnh: <span className="field-value">{props.patientName}</span></p>
        <div className="row">
          <div className="col"><Field label="Tuổi" value={props.age} /></div>
          <div className="col"><Field label="Giới" value={props.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          <div className="col"><Field label="Mã BN" value={props.patientCode} /></div>
        </div>
        <Field label="Địa chỉ" value={props.address} />
      </div>

      <div className="section" style={{ lineHeight: 2 }}>
        <p>Sau khi được Bác sĩ <span className="field-value">{props.surgeonName ?? '...........................'}</span> giải thích rõ về:</p>
        <p><strong>1. Chẩn đoán bệnh:</strong> <span className="field-value">{props.diagnosisName ?? '...........................'}</span></p>
        <p><strong>2. Phương pháp phẫu thuật/thủ thuật:</strong> <span className="field-value">{props.procedureName ?? '...........................'}</span></p>
        <p><strong>3. Phương pháp vô cảm:</strong> <span className="field-value">{props.anesthesiaType ?? '...........................'}</span></p>
        <p><strong>4. Các nguy cơ, tai biến có thể xảy ra:</strong></p>
        <div style={{ minHeight: 60, padding: '0 16px' }}>{props.risksExplained ?? '- Chảy máu trong và sau mổ\n- Nhiễm trùng vết mổ\n- Tai biến do gây mê/tê\n- Các biến chứng khác liên quan'}</div>
        <p><strong>5. Các phương pháp điều trị thay thế:</strong></p>
        <div style={{ minHeight: 40, padding: '0 16px' }}>{props.alternatives ?? '...'}</div>
      </div>

      <div className="section" style={{ lineHeight: 2 }}>
        <p>Tôi đã hiểu rõ và đồng ý cho người bệnh được phẫu thuật/thủ thuật theo phương pháp nêu trên.</p>
        <p>Tôi cam kết sẽ phối hợp và thực hiện đúng theo hướng dẫn của bác sĩ trong quá trình điều trị.</p>
      </div>

      <div className="signature-row" style={{ marginTop: 24 }}>
        <div className="sig">
          <div className="sig-title">NGƯỜI BỆNH / THÂN NHÂN</div>
          <div className="sig-date">(Ký, ghi rõ họ tên)</div>
        </div>
        <div className="sig">
          <div className="sig-date">
            Ngày {dayjs().format('DD')} tháng {dayjs().format('MM')} năm {dayjs().format('YYYY')}
          </div>
          <div className="sig-title">BÁC SĨ GIẢI THÍCH</div>
          <div className="sig-date">(Ký, ghi rõ họ tên)</div>
        </div>
      </div>
    </div>
  )
);
SurgeryConsentPrint.displayName = 'SurgeryConsentPrint';

// ===========================
// 8. PHIEU SO KET 15 NGAY DIEU TRI (Treatment Progress Note)
// ===========================
interface TreatmentProgressNoteProps {
  record: MedicalRecordFullDto;
  periodFrom?: string;
  periodTo?: string;
  dayCount?: number;
  admissionDate?: string;
  departmentName?: string;
  clinicalProgress?: string;
  labResults?: string;
  imagingResults?: string;
  currentTreatment?: string;
  treatmentResponse?: string;
  currentCondition?: string;
  nextPlan?: string;
  prognosis?: string;
  doctorName?: string;
}

export const TreatmentProgressNotePrint = forwardRef<HTMLDivElement, TreatmentProgressNoteProps>(
  ({ record, periodFrom, periodTo, dayCount, admissionDate, departmentName, clinicalProgress, labResults, imagingResults, currentTreatment, treatmentResponse, currentCondition, nextPlan, prognosis, doctorName: _doctorName }, ref) => {
    const p = record.patient;
    const vs = record.vitalSigns;
    const primaryDiag = record.diagnoses?.find(d => d.diagnosisType === 1);

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 08/BV" />
        <h2>PHIẾU SƠ KẾT 15 NGÀY ĐIỀU TRỊ</h2>

        <div className="section">
          <div className="row">
            <div className="col"><Field label="Họ và tên" value={p?.fullName} /></div>
            <div className="col"><Field label="Tuổi" value={p?.age} /></div>
            <div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Mã BN" value={p?.patientCode} /></div>
            <div className="col"><Field label="Khoa" value={departmentName} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Ngày vào viện" value={admissionDate ? dayjs(admissionDate).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Ngày điều trị thứ" value={dayCount} /></div>
          </div>
          <div className="row">
            <div className="col"><Field label="Từ ngày" value={periodFrom ? dayjs(periodFrom).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Đến ngày" value={periodTo ? dayjs(periodTo).format('DD/MM/YYYY') : undefined} /></div>
          </div>
          <Field label="Chẩn đoán" value={primaryDiag ? `${primaryDiag.icdCode} - ${primaryDiag.icdName}` : undefined} />
        </div>

        <div className="section">
          <div className="section-title">I. DIỄN BIẾN LÂM SÀNG</div>
          {vs && (
            <div className="row" style={{ marginBottom: 8 }}>
              <div className="col"><Field label="Mạch" value={vs.pulse ? `${vs.pulse} l/ph` : undefined} /></div>
              <div className="col"><Field label="HA" value={vs.systolicBP ? `${vs.systolicBP}/${vs.diastolicBP}` : undefined} /></div>
              <div className="col"><Field label="Nhiệt độ" value={vs.temperature ? `${vs.temperature}°C` : undefined} /></div>
            </div>
          )}
          <div style={{ minHeight: 80, padding: 4 }}>{clinicalProgress ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">II. KẾT QUẢ CẬN LÂM SÀNG</div>
          <Field label="Xét nghiệm" value={labResults} />
          <Field label="Chẩn đoán hình ảnh" value={imagingResults} />
        </div>

        <div className="section">
          <div className="section-title">III. ĐIỀU TRỊ ĐÃ THỰC HIỆN</div>
          <div style={{ minHeight: 60, padding: 4 }}>{currentTreatment ?? '...'}</div>
          <Field label="Đáp ứng điều trị" value={treatmentResponse} />
        </div>

        <div className="section">
          <div className="section-title">IV. TÌNH TRẠNG HIỆN TẠI</div>
          <div style={{ minHeight: 40, padding: 4 }}>{currentCondition ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">V. HƯỚNG ĐIỀU TRỊ TIẾP</div>
          <div style={{ minHeight: 40, padding: 4 }}>{nextPlan ?? '...'}</div>
          <Field label="Tiên lượng" value={prognosis} />
        </div>

        <SignatureBlock leftTitle="TRƯỞNG KHOA" rightTitle="BÁC SĨ ĐIỀU TRỊ" date={new Date()} />
      </div>
    );
  }
);
TreatmentProgressNotePrint.displayName = 'TreatmentProgressNotePrint';

// ===========================
// 9. PHIEU TU VAN (Counseling / Advisory Form)
// ===========================
interface CounselingFormProps {
  record: MedicalRecordFullDto;
  counselingTopic?: string;
  counselingContent?: string;
  patientQuestions?: string;
  patientUnderstanding?: string;
  counselorName?: string;
  counselorTitle?: string;
}

export const CounselingFormPrint = forwardRef<HTMLDivElement, CounselingFormProps>(
  ({ record, counselingTopic, counselingContent, patientQuestions, patientUnderstanding, counselorName: _counselorName, counselorTitle }, ref) => {
    const p = record.patient;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. 09/BV" />
        <h2>PHIẾU TƯ VẤN NGƯỜI BỆNH</h2>

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

        <div className="section">
          <div className="section-title">I. NỘI DUNG TƯ VẤN</div>
          <Field label="Chủ đề tư vấn" value={counselingTopic} />
          <div style={{ minHeight: 120, padding: 4, marginTop: 8 }}>{counselingContent ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">II. CÂU HỎI CỦA NGƯỜI BỆNH / THÂN NHÂN</div>
          <div style={{ minHeight: 60, padding: 4 }}>{patientQuestions ?? '...'}</div>
        </div>

        <div className="section">
          <div className="section-title">III. MỨC ĐỘ HIỂU BIẾT CỦA NGƯỜI BỆNH</div>
          <div style={{ padding: 4 }}>
            {patientUnderstanding ?? (
              <>
                <div>☐ Hiểu rõ hoàn toàn</div>
                <div>☐ Hiểu cơ bản</div>
                <div>☐ Cần tư vấn thêm</div>
                <div>☐ Không hiểu / cần phiên dịch</div>
              </>
            )}
          </div>
        </div>

        <div className="signature-row" style={{ marginTop: 24 }}>
          <div className="sig">
            <div className="sig-title">NGƯỜI BỆNH / THÂN NHÂN</div>
            <div className="sig-date">(Ký, ghi rõ họ tên)</div>
          </div>
          <div className="sig">
            <div className="sig-date">
              Ngày {dayjs().format('DD')} tháng {dayjs().format('MM')} năm {dayjs().format('YYYY')}
            </div>
            <div className="sig-title">NGƯỜI TƯ VẤN</div>
            <div className="sig-date">{counselorTitle ?? '(Ký, ghi rõ họ tên, chức danh)'}</div>
          </div>
        </div>
      </div>
    );
  }
);
CounselingFormPrint.displayName = 'CounselingFormPrint';

// ===========================
// 10. KIEM DIEM TU VONG (Death Review Form)
// ===========================
