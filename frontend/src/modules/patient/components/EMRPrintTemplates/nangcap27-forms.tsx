import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { printStyles, PrintHeader, Field, SignatureBlock } from './_shared';

/* ──────────────────────────────────────────────────────────────────────────
   NangCap27 — biểu mẫu in còn thiếu so với HSMT BV Tâm thần Quảng Ngãi:
   · 18.3.21  — Phiếu theo dõi ôxy liệu pháp
   · 13.1.96  — Biên bản thanh lý thuốc, hóa chất, VTYT tiêu hao
   · 13.1.95  — Biên bản xác nhận thuốc/hóa chất/VTYT mất, hỏng, vỡ
   · 13.1.27  — Phiếu xét nghiệm huyết - tủy đồ
   · 13.1.29  — Phiếu xét nghiệm sinh thiết tủy xương
   · 13.1.30  — Phiếu xét nghiệm nước dịch
   · 13.1.58  — Bệnh án phá thai
   · 13.1.59  — Bệnh án bệnh tay chân miệng
   Các mẫu này in để ekip/khoa Dược điền tay phần chuyên môn — chỉ bind sẵn
   phần hành chính, giống cách NangCap26 làm với phiếu đếm gạc.
   ────────────────────────────────────────────────────────────────────────── */

// ── Kiểu dùng chung cho phần hành chính người bệnh ──
interface PatientHeaderProps {
  patientName?: string;
  patientCode?: string;
  age?: number | string;
  gender?: number;
  departmentName?: string;
  roomBed?: string;
  diagnosis?: string;
  recordCode?: string;
}

const genderLabel = (gender?: number) =>
  gender === 1 ? 'Nam' : gender === 2 ? 'Nữ' : '';

const PatientAdminSection: React.FC<PatientHeaderProps> = (p) => (
  <div className="section">
    <div className="row">
      <div className="col"><Field label="Họ tên người bệnh" value={p.patientName} /></div>
      <div className="col"><Field label="Mã BN" value={p.patientCode} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Tuổi" value={p.age} /></div>
      <div className="col"><Field label="Giới" value={genderLabel(p.gender)} /></div>
      <div className="col"><Field label="Khoa" value={p.departmentName} /></div>
      <div className="col"><Field label="Phòng/Giường" value={p.roomBed} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Số bệnh án" value={p.recordCode} /></div>
      <div className="col"><Field label="Chẩn đoán" value={p.diagnosis} /></div>
    </div>
  </div>
);

/** Số dòng trống để điền tay — đủ 1 trang A4 cho từng loại phiếu. */
const blankRows = (count: number) => Array.from({ length: count }, (_, i) => i);

// ══════════════════════════════════════════════════════════════════════════
// 1. HSMT 18.3.21 — Phiếu theo dõi ôxy liệu pháp
// ══════════════════════════════════════════════════════════════════════════

export interface OxygenTherapyRow {
  time?: string;
  /** Phương pháp: gọng kính, mask, mask túi, CPAP, thở máy… */
  method?: string;
  /** Lưu lượng (lít/phút) */
  flowRate?: number | string;
  /** FiO2 (%) */
  fio2?: number | string;
  spo2?: number | string;
  pulse?: number | string;
  respiratoryRate?: number | string;
  note?: string;
  nurseName?: string;
}

export interface OxygenTherapyMonitorProps extends PatientHeaderProps {
  startedAt?: string;
  indication?: string;
  rows?: OxygenTherapyRow[];
}

/**
 * Phiếu theo dõi ôxy liệu pháp — HSMT 18.3.21 (khoa/phòng cấp cứu).
 * Điều dưỡng ghi từng lần theo dõi: phương pháp thở, lưu lượng, FiO2, SpO2, mạch, nhịp thở.
 */
export const OxygenTherapyMonitorPrint = forwardRef<HTMLDivElement, OxygenTherapyMonitorProps>((props, ref) => {
  const rows = props.rows?.length ? props.rows : blankRows(18).map(() => ({} as OxygenTherapyRow));

  return (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="NC27-01" />
      <h2>PHIẾU THEO DÕI ÔXY LIỆU PHÁP</h2>

      <PatientAdminSection {...props} />

      <div className="section">
        <div className="row">
          <div className="col">
            <Field
              label="Bắt đầu thở ôxy lúc"
              value={props.startedAt ? dayjs(props.startedAt).format('HH:mm DD/MM/YYYY') : ''}
            />
          </div>
          <div className="col"><Field label="Chỉ định của bác sĩ" value={props.indication} /></div>
        </div>
      </div>

      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {/* Vùng in ngang chỉ 170mm ⇒ siết các cột số, dành chỗ cho cột ghi tay "Diễn biến / Xử trí". */}
            <th style={{ width: 46 }}>Giờ</th>
            <th style={{ width: 92 }}>Phương pháp thở</th>
            <th style={{ width: 52 }}>Lưu lượng<br />(l/ph)</th>
            <th style={{ width: 42 }}>FiO2<br />(%)</th>
            <th style={{ width: 42 }}>SpO2<br />(%)</th>
            <th style={{ width: 42 }}>Mạch</th>
            <th style={{ width: 46 }}>Nhịp thở</th>
            <th>Diễn biến / Xử trí</th>
            <th style={{ width: 76 }}>Điều dưỡng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ height: 26 }}>
              <td style={{ textAlign: 'center' }}>{r.time ?? ''}</td>
              <td>{r.method ?? ''}</td>
              <td style={{ textAlign: 'center' }}>{r.flowRate ?? ''}</td>
              <td style={{ textAlign: 'center' }}>{r.fio2 ?? ''}</td>
              <td style={{ textAlign: 'center' }}>{r.spo2 ?? ''}</td>
              <td style={{ textAlign: 'center' }}>{r.pulse ?? ''}</td>
              <td style={{ textAlign: 'center' }}>{r.respiratoryRate ?? ''}</td>
              <td>{r.note ?? ''}</td>
              <td>{r.nurseName ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SignatureBlock leftTitle="Điều dưỡng theo dõi" rightTitle="Bác sĩ điều trị" date={new Date()} />
    </div>
  );
});
OxygenTherapyMonitorPrint.displayName = 'OxygenTherapyMonitorPrint';

// ══════════════════════════════════════════════════════════════════════════
// 2. HSMT 13.1.96 — Biên bản thanh lý thuốc, hóa chất, VTYT tiêu hao
// ══════════════════════════════════════════════════════════════════════════

export interface PharmacyStockItemRow {
  code?: string;
  name: string;
  unit?: string;
  lotNumber?: string;
  expiryDate?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  amount?: number | string;
  reason?: string;
}

export interface PharmacyMinutesProps {
  minutesCode?: string;
  minutesDate?: string;
  warehouseName?: string;
  /** Thành phần hội đồng — mỗi phần tử 1 dòng "Chức danh - Họ tên" */
  councilMembers?: string[];
  items?: PharmacyStockItemRow[];
  conclusion?: string;
}

const councilSection = (members?: string[]) => (
  <div className="section">
    <p style={{ fontWeight: 700, marginBottom: 4 }}>Thành phần hội đồng:</p>
    {(members?.length ? members : blankRows(4).map(() => '')).map((m, i) => (
      <div key={i}><Field label={`${i + 1}`} value={m || undefined} /></div>
    ))}
  </div>
);

const stockItemsTable = (items: PharmacyStockItemRow[], amountHeader: string) => (
  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        {/* Vùng in ngang 170mm — siết cột cố định để cột tên thuốc + lý do còn đọc được. */}
        <th style={{ width: 28 }}>TT</th>
        <th style={{ width: 58 }}>Mã</th>
        <th>Tên thuốc / hóa chất / VTYT</th>
        <th style={{ width: 42 }}>ĐVT</th>
        <th style={{ width: 56 }}>Số lô</th>
        <th style={{ width: 62 }}>Hạn dùng</th>
        <th style={{ width: 50 }}>Số lượng</th>
        <th style={{ width: 66 }}>Đơn giá</th>
        <th style={{ width: 72 }}>{amountHeader}</th>
        <th>Lý do</th>
      </tr>
    </thead>
    <tbody>
      {items.map((r, i) => (
        <tr key={i} style={{ height: 24 }}>
          <td style={{ textAlign: 'center' }}>{r.name ? i + 1 : ''}</td>
          <td>{r.code ?? ''}</td>
          <td>{r.name ?? ''}</td>
          <td style={{ textAlign: 'center' }}>{r.unit ?? ''}</td>
          <td style={{ textAlign: 'center' }}>{r.lotNumber ?? ''}</td>
          <td style={{ textAlign: 'center' }}>
            {r.expiryDate ? dayjs(r.expiryDate).format('DD/MM/YYYY') : ''}
          </td>
          <td style={{ textAlign: 'center' }}>{r.quantity ?? ''}</td>
          <td style={{ textAlign: 'right' }}>{r.unitPrice ?? ''}</td>
          <td style={{ textAlign: 'right' }}>{r.amount ?? ''}</td>
          <td>{r.reason ?? ''}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/**
 * Biên bản thanh lý thuốc, hóa chất, vật tư y tế tiêu hao — HSMT 13.1.96 / 13.2.22.
 */
export const PharmacyDisposalMinutesPrint = forwardRef<HTMLDivElement, PharmacyMinutesProps>((props, ref) => {
  const items = props.items?.length
    ? props.items
    : blankRows(12).map(() => ({ name: '' } as PharmacyStockItemRow));

  return (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="NC27-02" />
      <h2>BIÊN BẢN THANH LÝ THUỐC, HÓA CHẤT, VẬT TƯ Y TẾ TIÊU HAO</h2>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Số biên bản" value={props.minutesCode} /></div>
          <div className="col">
            <Field
              label="Ngày lập"
              value={props.minutesDate ? dayjs(props.minutesDate).format('DD/MM/YYYY') : ''}
            />
          </div>
          <div className="col"><Field label="Kho" value={props.warehouseName} /></div>
        </div>
      </div>

      {councilSection(props.councilMembers)}

      <p style={{ fontWeight: 700, margin: '8px 0 4px' }}>
        Danh mục thuốc, hóa chất, vật tư y tế đề nghị thanh lý:
      </p>
      {stockItemsTable(items, 'Thành tiền')}

      <div className="section" style={{ marginTop: 12 }}>
        <Field label="Kết luận của hội đồng" value={props.conclusion} />
      </div>

      <SignatureBlock leftTitle="Thủ kho" rightTitle="Chủ tịch hội đồng" date={new Date()} />
    </div>
  );
});
PharmacyDisposalMinutesPrint.displayName = 'PharmacyDisposalMinutesPrint';

/**
 * Biên bản xác nhận thuốc / hóa chất / VTYT mất, hỏng, vỡ — HSMT 13.1.95.
 */
export const PharmacyDamageMinutesPrint = forwardRef<HTMLDivElement, PharmacyMinutesProps>((props, ref) => {
  const items = props.items?.length
    ? props.items
    : blankRows(10).map(() => ({ name: '' } as PharmacyStockItemRow));

  return (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="NC27-03" />
      <h2>BIÊN BẢN XÁC NHẬN THUỐC, HÓA CHẤT, VẬT TƯ Y TẾ MẤT / HỎNG / VỠ</h2>

      <div className="section">
        <div className="row">
          <div className="col"><Field label="Số biên bản" value={props.minutesCode} /></div>
          <div className="col">
            <Field
              label="Ngày lập"
              value={props.minutesDate ? dayjs(props.minutesDate).format('DD/MM/YYYY') : ''}
            />
          </div>
          <div className="col"><Field label="Kho" value={props.warehouseName} /></div>
        </div>
      </div>

      {councilSection(props.councilMembers)}

      <p style={{ fontWeight: 700, margin: '8px 0 4px' }}>
        Danh mục thuốc, hóa chất, vật tư y tế bị mất / hỏng / vỡ:
      </p>
      {stockItemsTable(items, 'Giá trị thiệt hại')}

      <div className="section" style={{ marginTop: 12 }}>
        <Field label="Nguyên nhân và kết luận" value={props.conclusion} />
        <Field label="Đề nghị xử lý trách nhiệm" value={undefined} />
      </div>

      <SignatureBlock leftTitle="Người làm mất/hỏng" rightTitle="Trưởng khoa Dược" date={new Date()} />
    </div>
  );
});
PharmacyDamageMinutesPrint.displayName = 'PharmacyDamageMinutesPrint';

// ══════════════════════════════════════════════════════════════════════════
// 3. HSMT 13.1.27 / 13.1.29 / 13.1.30 — 3 phiếu xét nghiệm chuyên khoa
// ══════════════════════════════════════════════════════════════════════════

export interface LabRequestFormProps extends PatientHeaderProps {
  requestCode?: string;
  requestDate?: string;
  doctorName?: string;
  clinicalSummary?: string;
  /** Yêu cầu xét nghiệm cụ thể (bác sĩ ghi thêm) */
  requestedTests?: string;
  /** Vị trí lấy mẫu — dùng cho sinh thiết tủy / chọc dò dịch */
  sampleSite?: string;
}

/** Khung phiếu XN dùng chung cho 3 mẫu chuyên khoa (huyết-tủy đồ, sinh thiết tủy, nước dịch). */
const LabRequestFrame: React.FC<
  LabRequestFormProps & {
    formNumber: string;
    title: string;
    resultHeading: string;
    resultLines: number;
    extraFields?: React.ReactNode;
  }
> = ({ formNumber, title, resultHeading, resultLines, extraFields, ...props }) => (
  <>
    <style>{printStyles}</style>
    <PrintHeader formNumber={formNumber} />
    <h2>{title}</h2>

    <PatientAdminSection {...props} />

    <div className="section">
      <div className="row">
        <div className="col"><Field label="Số phiếu" value={props.requestCode} /></div>
        <div className="col">
          <Field
            label="Ngày chỉ định"
            value={props.requestDate ? dayjs(props.requestDate).format('DD/MM/YYYY HH:mm') : ''}
          />
        </div>
        <div className="col"><Field label="Bác sĩ chỉ định" value={props.doctorName} /></div>
      </div>
      {extraFields}
      <Field label="Tóm tắt lâm sàng" value={props.clinicalSummary} />
      <Field label="Yêu cầu xét nghiệm" value={props.requestedTests} />
    </div>

    <p style={{ fontWeight: 700, margin: '10px 0 4px' }}>{resultHeading}</p>
    <div style={{ border: '1px solid #000', minHeight: 40 }}>
      {blankRows(resultLines).map(i => (
        <div key={i} style={{ borderBottom: '1px dotted #999', height: 24 }} />
      ))}
    </div>

    <div className="section" style={{ marginTop: 10 }}>
      <Field label="Kết luận" value={undefined} />
    </div>

    <SignatureBlock leftTitle="Bác sĩ chỉ định" rightTitle="Người thực hiện xét nghiệm" date={new Date()} />
  </>
);

/** Phiếu xét nghiệm huyết - tủy đồ — HSMT 13.1.27. */
export const MyelogramLabPrint = forwardRef<HTMLDivElement, LabRequestFormProps>((props, ref) => (
  <div ref={ref} className="emr-print-container">
    <LabRequestFrame
      {...props}
      formNumber="NC27-04"
      title="PHIẾU XÉT NGHIỆM HUYẾT - TỦY ĐỒ"
      resultHeading="Kết quả huyết đồ / tủy đồ (dòng hồng cầu, bạch cầu, mẫu tiểu cầu, tỷ lệ % các dòng tế bào):"
      resultLines={14}
      extraFields={
        <div className="row">
          <div className="col"><Field label="Vị trí chọc hút tủy" value={props.sampleSite} /></div>
        </div>
      }
    />
  </div>
));
MyelogramLabPrint.displayName = 'MyelogramLabPrint';

/** Phiếu xét nghiệm sinh thiết tủy xương — HSMT 13.1.29. */
export const BoneMarrowBiopsyLabPrint = forwardRef<HTMLDivElement, LabRequestFormProps>((props, ref) => (
  <div ref={ref} className="emr-print-container">
    <LabRequestFrame
      {...props}
      formNumber="NC27-05"
      title="PHIẾU XÉT NGHIỆM SINH THIẾT TỦY XƯƠNG"
      resultHeading="Mô tả đại thể / vi thể mảnh sinh thiết:"
      resultLines={14}
      extraFields={
        <div className="row">
          <div className="col"><Field label="Vị trí sinh thiết" value={props.sampleSite} /></div>
          <div className="col"><Field label="Số mảnh sinh thiết" value={undefined} /></div>
        </div>
      }
    />
  </div>
));
BoneMarrowBiopsyLabPrint.displayName = 'BoneMarrowBiopsyLabPrint';

/** Phiếu xét nghiệm nước dịch (dịch màng phổi, màng bụng, dịch não tủy…) — HSMT 13.1.30. */
export const BodyFluidLabPrint = forwardRef<HTMLDivElement, LabRequestFormProps>((props, ref) => (
  <div ref={ref} className="emr-print-container">
    <LabRequestFrame
      {...props}
      formNumber="NC27-06"
      title="PHIẾU XÉT NGHIỆM NƯỚC DỊCH"
      resultHeading="Kết quả (màu sắc, độ trong, Rivalta, protein, tế bào, sinh hóa, vi sinh):"
      resultLines={13}
      extraFields={
        <div className="row">
          <div className="col"><Field label="Loại dịch" value={props.sampleSite} /></div>
          <div className="col"><Field label="Thể tích gửi" value={undefined} /></div>
        </div>
      }
    />
  </div>
));
BodyFluidLabPrint.displayName = 'BodyFluidLabPrint';

// ══════════════════════════════════════════════════════════════════════════
// 4. HSMT 13.1.58 / 13.1.59 — 2 mẫu bệnh án chuyên khoa còn thiếu
// ══════════════════════════════════════════════════════════════════════════

export interface SpecialtyRecordPrintProps extends PatientHeaderProps {
  admissionDate?: string;
  address?: string;
  occupation?: string;
  ethnicity?: string;
  phoneNumber?: string;
  insuranceNumber?: string;
  doctorName?: string;
}

/** Khối hành chính đầy đủ dùng cho mẫu bệnh án (nhiều trường hơn phiếu lẻ). */
const RecordAdminBlock: React.FC<SpecialtyRecordPrintProps> = (p) => (
  <div className="section">
    <div className="row">
      <div className="col"><Field label="Họ tên" value={p.patientName} /></div>
      <div className="col"><Field label="Tuổi" value={p.age} /></div>
      <div className="col"><Field label="Giới" value={genderLabel(p.gender)} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Mã BN" value={p.patientCode} /></div>
      <div className="col"><Field label="Số bệnh án" value={p.recordCode} /></div>
      <div className="col"><Field label="Số thẻ BHYT" value={p.insuranceNumber} /></div>
    </div>
    <div className="row">
      <div className="col"><Field label="Nghề nghiệp" value={p.occupation} /></div>
      <div className="col"><Field label="Dân tộc" value={p.ethnicity} /></div>
      <div className="col"><Field label="Điện thoại" value={p.phoneNumber} /></div>
    </div>
    <Field label="Địa chỉ" value={p.address} />
    <div className="row">
      <div className="col"><Field label="Khoa" value={p.departmentName} /></div>
      <div className="col"><Field label="Phòng/Giường" value={p.roomBed} /></div>
      <div className="col">
        <Field
          label="Ngày vào viện"
          value={p.admissionDate ? dayjs(p.admissionDate).format('HH:mm DD/MM/YYYY') : ''}
        />
      </div>
    </div>
  </div>
);

/** Khối nội dung dạng tiêu đề + N dòng kẻ để bác sĩ ghi tay. */
const WriteBlock: React.FC<{ heading: string; lines: number }> = ({ heading, lines }) => (
  <div className="section" style={{ marginTop: 8 }}>
    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{heading}</p>
    {blankRows(lines).map(i => (
      <div key={i} style={{ borderBottom: '1px dotted #999', height: 22 }} />
    ))}
  </div>
);

/** Bệnh án phá thai — HSMT 13.1.58. */
export const AbortionMedicalRecordPrint = forwardRef<HTMLDivElement, SpecialtyRecordPrintProps>((props, ref) => (
  <div ref={ref} className="emr-print-container">
    <style>{printStyles}</style>
    <PrintHeader formNumber="NC27-07" />
    <h2>BỆNH ÁN PHÁ THAI</h2>

    <RecordAdminBlock {...props} />

    <WriteBlock heading="I. LÝ DO VÀO VIỆN" lines={2} />
    <WriteBlock heading="II. TIỀN SỬ SẢN KHOA (PARA, số lần sinh - sảy - nạo hút)" lines={3} />
    <WriteBlock heading="III. KINH CUỐI - TUỔI THAI - PHƯƠNG PHÁP XÁC ĐỊNH" lines={3} />
    <WriteBlock heading="IV. KHÁM LÂM SÀNG (toàn thân, khám phụ khoa)" lines={5} />
    <WriteBlock heading="V. CẬN LÂM SÀNG (siêu âm, xét nghiệm)" lines={4} />
    <WriteBlock heading="VI. CHẨN ĐOÁN" lines={2} />
    <WriteBlock heading="VII. PHƯƠNG PHÁP ĐÌNH CHỈ THAI - THUỐC/THỦ THUẬT SỬ DỤNG" lines={4} />
    <WriteBlock heading="VIII. TAI BIẾN - XỬ TRÍ" lines={3} />
    <WriteBlock heading="IX. TƯ VẤN BIỆN PHÁP TRÁNH THAI SAU THỦ THUẬT" lines={3} />
    <WriteBlock heading="X. TÌNH TRẠNG RA VIỆN - HẸN KHÁM LẠI" lines={3} />

    <SignatureBlock leftTitle="Người bệnh / Người nhà" rightTitle="Bác sĩ điều trị" date={new Date()} />
  </div>
));
AbortionMedicalRecordPrint.displayName = 'AbortionMedicalRecordPrint';

/** Bệnh án bệnh tay chân miệng — HSMT 13.1.59. */
export const HandFootMouthMedicalRecordPrint = forwardRef<HTMLDivElement, SpecialtyRecordPrintProps>((props, ref) => (
  <div ref={ref} className="emr-print-container">
    <style>{printStyles}</style>
    <PrintHeader formNumber="NC27-08" />
    <h2>BỆNH ÁN BỆNH TAY CHÂN MIỆNG</h2>

    <RecordAdminBlock {...props} />

    <WriteBlock heading="I. LÝ DO VÀO VIỆN" lines={2} />
    <WriteBlock heading="II. BỆNH SỬ (ngày khởi bệnh, sốt, nôn, giật mình, đi loạng choạng)" lines={4} />
    <WriteBlock heading="III. DỊCH TỄ (tiếp xúc ca bệnh, nhà trẻ/trường học)" lines={2} />
    <WriteBlock heading="IV. KHÁM LÂM SÀNG (ban phỏng nước lòng bàn tay/chân, loét miệng, dấu thần kinh)" lines={5} />
    <WriteBlock heading="V. PHÂN ĐỘ LÂM SÀNG (độ 1, 2a, 2b nhóm 1/2, 3, 4)" lines={2} />
    <WriteBlock heading="VI. CẬN LÂM SÀNG (CTM, CRP, đường huyết, PCR EV71, dịch não tủy)" lines={4} />
    <WriteBlock heading="VII. CHẨN ĐOÁN" lines={2} />
    <WriteBlock heading="VIII. ĐIỀU TRỊ (hạ sốt, IVIG, Phenobarbital, Milrinone, hỗ trợ hô hấp)" lines={5} />
    <WriteBlock heading="IX. DIỄN BIẾN - BIẾN CHỨNG" lines={4} />
    <WriteBlock heading="X. KẾT QUẢ ĐIỀU TRỊ - HƯỚNG DẪN PHÒNG LÂY NHIỄM" lines={3} />

    <SignatureBlock leftTitle="Điều dưỡng" rightTitle="Bác sĩ điều trị" date={new Date()} />
  </div>
));
HandFootMouthMedicalRecordPrint.displayName = 'HandFootMouthMedicalRecordPrint';
