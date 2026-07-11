import { forwardRef } from 'react';
import dayjs from 'dayjs';
import type { MedicalRecordFullDto } from '../../../opd/api/examination';
import type { CreateMaternityLeaveDto } from '../../../opd/api/examination';
import { printStyles, PrintHeader, SignatureBlock, Field } from './_shared';

// ===========================
// F1.5 — GIAY NGHI DUONG THAI (Maternity Leave Certificate)
// Mau so: MS. DT/BV — Giay nghi duong thai theo Luat BHXH dieu 31
// ===========================

interface MaternityLeavePrintProps {
  record: MedicalRecordFullDto;
  dto: CreateMaternityLeaveDto;
}

export const MaternityLeavePrint = forwardRef<HTMLDivElement, MaternityLeavePrintProps>(
  ({ record, dto }, ref) => {
    const p = record.patient;
    const primaryDiag = record.diagnoses?.find(d => d.diagnosisType === 1) ?? record.diagnoses?.[0];
    const today = new Date();

    const diagText = primaryDiag
      ? `${primaryDiag.icdCode ? `${primaryDiag.icdCode} - ` : ''}${primaryDiag.icdName ?? primaryDiag.customDiagnosis ?? ''}`
      : undefined;

    return (
      <div ref={ref} className="emr-print-container">
        <style>{printStyles}</style>
        <PrintHeader formNumber="MS. DT/BV" />
        <h2>GIẤY NGHỈ DƯỠNG THAI</h2>
        <div style={{ textAlign: 'center', fontStyle: 'italic', marginBottom: 12, fontSize: 12 }}>
          (Theo Điều 31 Luật Bảo hiểm xã hội)
        </div>

        <div className="section" style={{ marginTop: 16, lineHeight: 2 }}>
          <Field label="Họ và tên" value={p?.fullName} />
          <div className="row">
            <div className="col"><Field label="Ngày sinh" value={p?.dateOfBirth ? dayjs(p.dateOfBirth).format('DD/MM/YYYY') : undefined} /></div>
            <div className="col"><Field label="Giới tính" value={p?.gender === 1 ? 'Nam' : 'Nữ'} /></div>
          </div>
          <Field label="Địa chỉ" value={p?.address} />
          <Field label="Nghề nghiệp / Đơn vị công tác" value={p?.occupation} />
        </div>

        <div className="section">
          <h3>CHẨN ĐOÁN</h3>
          <Field label="Chẩn đoán" value={diagText} />
          <Field label="Tuần thai" value={dto.gestationalWeeks != null ? `${dto.gestationalWeeks} tuần` : undefined} />
          <Field label="Lý do nghỉ dưỡng thai" value={dto.reason} />
        </div>

        <div className="section">
          <h3>THỜI GIAN NGHỈ</h3>
          <div className="row">
            <div className="col">
              <Field
                label="Từ ngày"
                value={dto.fromDate ? dayjs(dto.fromDate).format('DD/MM/YYYY') : undefined}
              />
            </div>
            <div className="col">
              <Field
                label="Đến ngày"
                value={dto.toDate ? dayjs(dto.toDate).format('DD/MM/YYYY') : undefined}
              />
            </div>
          </div>
          <Field label="Số ngày nghỉ" value={dto.days ? `${dto.days} ngày` : undefined} />
        </div>

        <div className="section">
          <p style={{ fontStyle: 'italic', fontSize: 12 }}>
            Giấy này có giá trị để hưởng chế độ nghỉ dưỡng thai theo quy định của pháp luật về bảo hiểm xã hội.
          </p>
        </div>

        <SignatureBlock
          leftTitle="TRƯỞNG KHOA"
          rightTitle="GIÁM ĐỐC BỆNH VIỆN"
          date={today}
        />
      </div>
    );
  }
);
MaternityLeavePrint.displayName = 'MaternityLeavePrint';
