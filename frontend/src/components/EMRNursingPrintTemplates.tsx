import React, { forwardRef } from 'react';
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';
import type { MedicalRecordFullDto } from '../api/examination';

// Reuse same print styles
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
`;

const PrintHeader: React.FC<{ formNumber?: string }> = ({ formNumber }) => (
  <div className="header">
    <div className="ministry">BỘ Y TẾ</div>
    <div className="hospital-name">{HOSPITAL_NAME}</div>
    <div style={{ fontSize: 11 }}>{HOSPITAL_ADDRESS} - ĐT: {HOSPITAL_PHONE}</div>
    {formNumber && <div className="form-number">Mẫu số: {formNumber}</div>}
  </div>
);

const SignatureBlock: React.FC<{ leftTitle: string; rightTitle: string; date?: Date }> = ({ leftTitle, rightTitle, date }) => (
  <div className="signature-row">
    <div className="sig">
      <div className="sig-title">{leftTitle}</div>
      <div className="sig-date">(Ký, ghi rõ họ tên)</div>
    </div>
    <div className="sig">
      <div className="sig-date">
        {date ? `Ngày ${dayjs(date).format('DD')} tháng ${dayjs(date).format('MM')} năm ${dayjs(date).format('YYYY')}` : ''}
      </div>
      <div className="sig-title">{rightTitle}</div>
      <div className="sig-date">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>
);

const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="field">
    <span className="field-label">{label}: </span>
    <span className="field-value">{value ?? '...........................'}</span>
  </div>
);

// Helper: patient info block used in most nursing forms
const PatientInfoBlock: React.FC<{ record?: MedicalRecordFullDto | null }> = ({ record }) => {
  const p = record?.patient;
  return (
    <div className="section">
      <div className="row"><div className="col"><Field label="Họ tên" value={p?.fullName} /></div><div className="col"><Field label="Tuổi" value={p?.dateOfBirth ? dayjs().diff(dayjs(p.dateOfBirth), 'year') + '' : undefined} /></div><div className="col"><Field label="Giới" value={p?.gender === 1 ? 'Nam' : p?.gender === 2 ? 'Nữ' : undefined} /></div></div>
      <div className="row"><div className="col"><Field label="Mã BN" value={p?.patientCode} /></div><div className="col"><Field label="Khoa" value={record?.departmentName} /></div><div className="col"><Field label="Buồng/Giường" /></div></div>
      <Field label="Chẩn đoán" value={record?.mainDiagnosis} />
    </div>
  );
};

// Helper: empty table rows
const emptyRows = (cols: number, rows = 8) =>
  Array.from({ length: rows }, (_, i) => (
    <tr key={i}>{Array.from({ length: cols }, (_, j) => <td key={j} style={{ height: 24 }}></td>)}</tr>
  ));

interface NursingProps { record?: MedicalRecordFullDto | null; }

// ============================================================
// DD. 01 - Phiếu kế hoạch chăm sóc (Nursing Care Plan)
// ============================================================
export const NursingCarePlanPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 01/BV" />
      <h2>PHIẾU KẾ HOẠCH CHĂM SÓC ĐIỀU DƯỠNG</h2>
      <PatientInfoBlock record={record} />
      <table>
        <thead><tr><th>STT</th><th>Vấn đề chăm sóc</th><th>Mục tiêu</th><th>Can thiệp điều dưỡng</th><th>Đánh giá kết quả</th><th>Ngày</th><th>ĐD thực hiện</th></tr></thead>
        <tbody>{emptyRows(7)}</tbody>
      </table>
      <SignatureBlock leftTitle="ĐIỀU DƯỠNG TRƯỞNG" rightTitle="ĐIỀU DƯỠNG CHĂM SÓC" date={new Date()} />
    </div>
  )
);
NursingCarePlanPrint.displayName = 'NursingCarePlanPrint';

// ============================================================
// DD. 02 - Phiếu kế hoạch chăm sóc HSCC (ICU Nursing Care Plan)
// ============================================================
export const ICUNursingCarePlanPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 02/BV" />
      <h2>PHIẾU KẾ HOẠCH CHĂM SÓC HSCC</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="section-title">ĐÁNH GIÁ MỨC ĐỘ NẶNG</div>
        <div className="row"><div className="col"><Field label="APACHE II" /></div><div className="col"><Field label="SOFA" /></div><div className="col"><Field label="GCS" /></div></div>
      </div>
      <table>
        <thead><tr><th>Giờ</th><th>Tri giác</th><th>Mạch</th><th>HA</th><th>Nhiệt độ</th><th>SpO2</th><th>Thở máy</th><th>Dịch vào</th><th>Dịch ra</th><th>Thuốc vận mạch</th><th>ĐD</th></tr></thead>
        <tbody>{emptyRows(11, 12)}</tbody>
      </table>
      <div className="section">
        <Field label="Nhận xét cuối ca" />
        <Field label="Vấn đề cần theo dõi" />
      </div>
      <SignatureBlock leftTitle="ĐD CA TRƯỚC" rightTitle="ĐD CA SAU" date={new Date()} />
    </div>
  )
);
ICUNursingCarePlanPrint.displayName = 'ICUNursingCarePlanPrint';

// ============================================================
// DD. 03 - Phiếu nhận định điều dưỡng (Nursing Assessment)
// ============================================================
export const NursingAssessmentPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 03/BV" />
      <h2>PHIẾU NHẬN ĐỊNH ĐIỀU DƯỠNG</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="section-title">I. NHẬN ĐỊNH BAN ĐẦU</div>
        <div className="row"><div className="col"><Field label="Ngày nhập viện" /></div><div className="col"><Field label="Lý do nhập viện" /></div></div>
        <Field label="Tiền sử bệnh" /><Field label="Dị ứng" value={record?.allergies} />
        <Field label="Thuốc đang dùng" />
      </div>
      <div className="section">
        <div className="section-title">II. ĐÁNH GIÁ CHỨC NĂNG</div>
        <div className="row"><div className="col"><Field label="Hô hấp" /></div><div className="col"><Field label="Tuần hoàn" /></div></div>
        <div className="row"><div className="col"><Field label="Thần kinh" /></div><div className="col"><Field label="Tiêu hoá" /></div></div>
        <div className="row"><div className="col"><Field label="Tiết niệu" /></div><div className="col"><Field label="Vận động" /></div></div>
        <Field label="Da / Niêm mạc" />
        <Field label="Dinh dưỡng (BMI)" />
      </div>
      <div className="section">
        <div className="section-title">III. ĐÁNH GIÁ NGUY CƠ</div>
        <div style={{ margin: '4px 0' }}>□ Ngã &nbsp; □ Loét tỳ đè (Braden: ......) &nbsp; □ Suy dinh dưỡng &nbsp; □ Đau (VAS: ......) &nbsp; □ Tự gây hại</div>
      </div>
      <div className="section">
        <div className="section-title">IV. NHU CẦU CHĂM SÓC ĐẶC BIỆT</div>
        <div style={{ margin: '4px 0' }}>□ Hỗ trợ hô hấp &nbsp; □ Theo dõi monitor &nbsp; □ Chăm sóc vết thương &nbsp; □ Phục hồi chức năng &nbsp; □ Tâm lý &nbsp; □ Khác: ............</div>
      </div>
      <SignatureBlock leftTitle="ĐIỀU DƯỠNG TRƯỞNG" rightTitle="ĐIỀU DƯỠNG NHẬN ĐỊNH" date={new Date()} />
    </div>
  )
);
NursingAssessmentPrint.displayName = 'NursingAssessmentPrint';

// ============================================================
// DD. 04 - Phiếu theo dõi chăm sóc (Daily Nursing Care)
// ============================================================
export const DailyNursingCarePrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 04/BV" />
      <h2>PHIẾU THEO DÕI CHĂM SÓC</h2>
      <PatientInfoBlock record={record} />
      <table>
        <thead><tr><th>Ngày</th><th>Ca</th><th>Tình trạng BN</th><th>Nhận định ĐD</th><th>Can thiệp</th><th>Đáp ứng</th><th>ĐD ký</th></tr></thead>
        <tbody>{emptyRows(7, 10)}</tbody>
      </table>
      <SignatureBlock leftTitle="ĐIỀU DƯỠNG TRƯỞNG" rightTitle="ĐIỀU DƯỠNG CHĂM SÓC" date={new Date()} />
    </div>
  )
);
DailyNursingCarePrint.displayName = 'DailyNursingCarePrint';

// ============================================================
// DD. 05 - Phiếu theo dõi truyền dịch (Infusion Monitoring)
// ============================================================
export const InfusionMonitoringPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 05/BV" />
      <h2>PHIẾU THEO DÕI TRUYỀN DỊCH</h2>
      <PatientInfoBlock record={record} />
      <table>
        <thead><tr><th>STT</th><th>Loại dịch</th><th>Thể tích (ml)</th><th>Tốc độ (g/ph)</th><th>Giờ bắt đầu</th><th>Giờ kết thúc</th><th>Phản ứng</th><th>ĐD thực hiện</th></tr></thead>
        <tbody>{emptyRows(8)}</tbody>
      </table>
      <div className="section">
        <div className="section-title">THEO DÕI DẤU HIỆU SINH TỒN TRONG TRUYỀN</div>
        <table>
          <thead><tr><th>Giờ</th><th>Mạch</th><th>HA</th><th>Nhiệt độ</th><th>Nhịp thở</th><th>SpO2</th><th>Phản ứng bất thường</th><th>Xử trí</th></tr></thead>
          <tbody>{emptyRows(8, 6)}</tbody>
        </table>
      </div>
      <SignatureBlock leftTitle="BS CHỈ ĐỊNH" rightTitle="ĐD THỰC HIỆN" date={new Date()} />
    </div>
  )
);
InfusionMonitoringPrint.displayName = 'InfusionMonitoringPrint';

// ============================================================
// DD. 06 - Phiếu theo dõi truyền máu - XN (Blood Transfusion Lab)
// ============================================================
export const BloodTransfusionLabPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 06/BV" />
      <h2>PHIẾU THEO DÕI TRUYỀN MÁU (XÉT NGHIỆM)</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="section-title">THÔNG TIN MÁU / CHẾ PHẨM</div>
        <div className="row"><div className="col"><Field label="Nhóm máu BN" /></div><div className="col"><Field label="Rh" /></div></div>
        <div className="row"><div className="col"><Field label="Loại chế phẩm" /></div><div className="col"><Field label="Mã đơn vị máu" /></div></div>
        <div className="row"><div className="col"><Field label="Thể tích (ml)" /></div><div className="col"><Field label="Ngày hết hạn" /></div></div>
        <Field label="Kết quả phản ứng chéo" />
      </div>
      <div className="section">
        <div className="section-title">THEO DÕI TRUYỀN MÁU</div>
        <table>
          <thead><tr><th>Thời gian</th><th>Mạch</th><th>HA</th><th>Nhiệt độ</th><th>Nhịp thở</th><th>Biểu hiện</th><th>Xử trí</th><th>ĐD</th></tr></thead>
          <tbody>
            <tr><td>Trước truyền</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>15 phút</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>30 phút</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>1 giờ</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>2 giờ</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>Kết thúc</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>
      <SignatureBlock leftTitle="BS CHỈ ĐỊNH" rightTitle="ĐD THỰC HIỆN" date={new Date()} />
    </div>
  )
);
BloodTransfusionLabPrint.displayName = 'BloodTransfusionLabPrint';

// ============================================================
// DD. 07 - Phiếu theo dõi truyền máu - LS (Blood Transfusion Clinical)
// ============================================================
export const BloodTransfusionClinicalPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 07/BV" />
      <h2>PHIẾU THEO DÕI TRUYỀN MÁU (LÂM SÀNG)</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="section-title">PHẢN ỨNG TRUYỀN MÁU</div>
        <div style={{ margin: '4px 0' }}>□ Không có phản ứng &nbsp; □ Sốt &nbsp; □ Rét run &nbsp; □ Mày đay &nbsp; □ Khó thở &nbsp; □ Đau ngực &nbsp; □ Tụt HA &nbsp; □ Tan máu &nbsp; □ Sốc phản vệ</div>
        <Field label="Mô tả chi tiết phản ứng" />
        <Field label="Thời điểm xuất hiện" />
        <Field label="Xử trí" />
        <Field label="Kết quả sau xử trí" />
      </div>
      <div className="section">
        <div className="section-title">THEO DÕI SAU TRUYỀN 24 GIỜ</div>
        <table>
          <thead><tr><th>Giờ</th><th>Mạch</th><th>HA</th><th>Nhiệt độ</th><th>Nước tiểu (ml)</th><th>Biểu hiện</th><th>ĐD</th></tr></thead>
          <tbody>{emptyRows(7, 6)}</tbody>
        </table>
      </div>
      <SignatureBlock leftTitle="BS ĐIỀU TRỊ" rightTitle="ĐD THEO DÕI" date={new Date()} />
    </div>
  )
);
BloodTransfusionClinicalPrint.displayName = 'BloodTransfusionClinicalPrint';

// ============================================================
// DD. 08 - Phiếu theo dõi chức năng sống (Vital Signs Monitoring)
// ============================================================
export const VitalSignsMonitoringPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 08/BV" />
      <h2>PHIẾU THEO DÕI CHỨC NĂNG SỐNG</h2>
      <PatientInfoBlock record={record} />
      <table>
        <thead>
          <tr><th rowSpan={2}>Ngày</th><th rowSpan={2}>Giờ</th><th colSpan={2}>Nhiệt độ</th><th colSpan={2}>Mạch</th><th colSpan={2}>Huyết áp</th><th rowSpan={2}>Nhịp thở</th><th rowSpan={2}>SpO2</th><th rowSpan={2}>Cân nặng</th><th rowSpan={2}>ĐD</th></tr>
          <tr><th>°C</th><th>Đồ thị</th><th>l/ph</th><th>Đồ thị</th><th>TT</th><th>TTr</th></tr>
        </thead>
        <tbody>{emptyRows(12, 16)}</tbody>
      </table>
      <SignatureBlock leftTitle="ĐIỀU DƯỠNG TRƯỞNG" rightTitle="ĐIỀU DƯỠNG THEO DÕI" date={new Date()} />
    </div>
  )
);
VitalSignsMonitoringPrint.displayName = 'VitalSignsMonitoringPrint';

// ============================================================
// DD. 09 - Phiếu công khai thuốc (Medicine Disclosure)
// ============================================================
export const MedicineDisclosurePrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 09/BV" />
      <h2>PHIẾU CÔNG KHAI THUỐC</h2>
      <PatientInfoBlock record={record} />
      <table>
        <thead><tr><th>STT</th><th>Tên thuốc</th><th>ĐVT</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th><th>BHYT chi trả</th><th>BN chi trả</th></tr></thead>
        <tbody>{emptyRows(8, 12)}</tbody>
        <tfoot><tr><th colSpan={5}>TỔNG CỘNG</th><th></th><th></th><th></th></tr></tfoot>
      </table>
      <div className="section">
        <Field label="Tổng số tiền (bằng chữ)" />
      </div>
      <div className="signature-row">
        <div className="sig"><div className="sig-title">NGƯỜI BỆNH/NGƯỜI NHÀ</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
        <div className="sig"><div className="sig-title">ĐIỀU DƯỠNG</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
        <div className="sig"><div className="sig-title">TRƯỞNG KHOA</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
      </div>
    </div>
  )
);
MedicineDisclosurePrint.displayName = 'MedicineDisclosurePrint';

// ============================================================
// DD. 10 - Phiếu chuẩn bị trước phẫu thuật (Pre-Op Preparation)
// ============================================================
export const PreOpPreparationPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 10/BV" />
      <h2>PHIẾU CHUẨN BỊ TRƯỚC PHẪU THUẬT</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="section-title">I. KIỂM TRA TRƯỚC MỔ</div>
        <div style={{ margin: '4px 0' }}>□ Nhịn ăn từ: .......... giờ &nbsp; □ Đã tắm/vệ sinh &nbsp; □ Cạo lông vùng mổ &nbsp; □ Tháo trang sức/răng giả</div>
        <div style={{ margin: '4px 0' }}>□ Đã thụt tháo &nbsp; □ Đặt sonde tiểu &nbsp; □ Đặt sonde dạ dày &nbsp; □ Đường truyền TM</div>
        <div style={{ margin: '4px 0' }}>□ XN máu đầy đủ &nbsp; □ XQ/CT scan &nbsp; □ ECG &nbsp; □ Nhóm máu &nbsp; □ Máu dự trữ: ...... ĐV</div>
      </div>
      <div className="section">
        <div className="section-title">II. DẤU HIỆU SINH TỒN TRƯỚC MỔ</div>
        <div className="row"><div className="col"><Field label="Mạch" /></div><div className="col"><Field label="HA" /></div><div className="col"><Field label="Nhiệt độ" /></div><div className="col"><Field label="SpO2" /></div></div>
      </div>
      <div className="section">
        <div className="section-title">III. THUỐC TIỀN MÊ</div>
        <Field label="Thuốc đã cho" /><Field label="Giờ cho thuốc" /><Field label="Đường dùng" />
      </div>
      <div className="section">
        <div className="section-title">IV. HỒ SƠ GỬI PHÒNG MỔ</div>
        <div style={{ margin: '4px 0' }}>□ Bệnh án &nbsp; □ Phiếu mổ &nbsp; □ Cam kết PT &nbsp; □ XN &nbsp; □ Phim ảnh &nbsp; □ Máu dự trữ</div>
      </div>
      <SignatureBlock leftTitle="ĐD KHOA GỬI" rightTitle="ĐD PHÒNG MỔ NHẬN" date={new Date()} />
    </div>
  )
);
PreOpPreparationPrint.displayName = 'PreOpPreparationPrint';

// ============================================================
// DD. 11 - Tiêu chuẩn chuyển khỏi phòng hồi sức (ICU Transfer Criteria)
// ============================================================
export const ICUTransferCriteriaPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 11/BV" />
      <h2>PHIẾU ĐÁNH GIÁ TIÊU CHUẨN CHUYỂN KHỎI HỒI SỨC</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="section-title">THANG ĐIỂM ALDRETE (Modified Aldrete Score)</div>
        <table>
          <thead><tr><th>Tiêu chí</th><th>0 điểm</th><th>1 điểm</th><th>2 điểm</th><th>Điểm</th></tr></thead>
          <tbody>
            <tr><td><b>Vận động</b></td><td>Không cử động</td><td>Cử động 2 chi</td><td>Cử động 4 chi</td><td></td></tr>
            <tr><td><b>Hô hấp</b></td><td>Ngưng thở</td><td>Khó thở</td><td>Thở sâu, ho được</td><td></td></tr>
            <tr><td><b>Tuần hoàn</b></td><td>HA ± &gt;50% trước mổ</td><td>HA ± 20-50%</td><td>HA ± &lt;20%</td><td></td></tr>
            <tr><td><b>Tri giác</b></td><td>Không đáp ứng</td><td>Gọi tỉnh</td><td>Tỉnh hoàn toàn</td><td></td></tr>
            <tr><td><b>SpO2</b></td><td>&lt;90% có O2</td><td>90-92% có O2</td><td>&gt;92% thở khí trời</td><td></td></tr>
            <tr><td colSpan={4}><b>TỔNG ĐIỂM (≥ 9: đủ tiêu chuẩn chuyển)</b></td><td></td></tr>
          </tbody>
        </table>
      </div>
      <div className="section">
        <div style={{ margin: '4px 0' }}>Kết luận: □ Đủ tiêu chuẩn chuyển khỏi hồi sức &nbsp; □ Chưa đủ - tiếp tục theo dõi</div>
        <Field label="Ghi chú" />
      </div>
      <SignatureBlock leftTitle="BS HỒI SỨC" rightTitle="ĐD HỒI SỨC" date={new Date()} />
    </div>
  )
);
ICUTransferCriteriaPrint.displayName = 'ICUTransferCriteriaPrint';

// ============================================================
// DD. 12 - Phiếu bàn giao BN chuyển khoa ĐD (Nursing Dept Transfer)
// ============================================================
export const NursingDeptTransferPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 12/BV" />
      <h2>PHIẾU BÀN GIAO NGƯỜI BỆNH (ĐIỀU DƯỠNG)</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="section-title">NỘI DUNG BÀN GIAO</div>
        <div className="row"><div className="col"><Field label="Dấu hiệu sinh tồn" /></div><div className="col"><Field label="Tri giác" /></div></div>
        <Field label="Tình trạng da / vết thương" />
        <Field label="Ống dẫn lưu / Sonde" />
        <Field label="Đường truyền TM" />
        <Field label="Thuốc đang dùng" />
        <Field label="Chế độ ăn" />
        <Field label="Lưu ý đặc biệt" />
      </div>
      <div className="section">
        <div className="section-title">VẬT DỤNG BÀN GIAO</div>
        <div style={{ margin: '4px 0' }}>□ Hồ sơ &nbsp; □ Phim ảnh &nbsp; □ Thuốc &nbsp; □ Dụng cụ y tế &nbsp; □ Tư trang &nbsp; □ Khác: ............</div>
      </div>
      <div className="signature-row">
        <div className="sig"><div className="sig-title">ĐD BÀN GIAO</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
        <div className="sig"><div className="sig-title">ĐD TIẾP NHẬN</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
        <div className="sig"><div className="sig-title">NGƯỜI VẬN CHUYỂN</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
      </div>
    </div>
  )
);
NursingDeptTransferPrint.displayName = 'NursingDeptTransferPrint';

// ============================================================
// DD. 13 - Bảng theo dõi tiền sản giật nặng (Severe Pre-eclampsia)
// ============================================================
export const PreEclampsiaPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 13/BV" />
      <h2>BẢNG THEO DÕI TIỀN SẢN GIẬT NẶNG</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="row"><div className="col"><Field label="Tuổi thai (tuần)" /></div><div className="col"><Field label="PARA" /></div></div>
        <Field label="Protein niệu" /><Field label="MgSO4 liều" />
      </div>
      <table>
        <thead><tr><th>Giờ</th><th>HA</th><th>Mạch</th><th>Nhịp thở</th><th>Phản xạ gối</th><th>Nước tiểu (ml/h)</th><th>Tim thai</th><th>Co TC</th><th>Triệu chứng</th><th>ĐD</th></tr></thead>
        <tbody>{emptyRows(10, 12)}</tbody>
      </table>
      <div className="section">
        <div style={{ margin: '4px 0', fontWeight: 'bold' }}>Dấu hiệu nguy hiểm cần báo BS ngay: HA ≥ 160/110, nhịp thở &lt; 16, phản xạ gối mất, nước tiểu &lt; 30ml/h, đau đầu dữ dội, nhìn mờ</div>
      </div>
      <SignatureBlock leftTitle="BS SẢN KHOA" rightTitle="ĐD/NHS THEO DÕI" date={new Date()} />
    </div>
  )
);
PreEclampsiaPrint.displayName = 'PreEclampsiaPrint';

// ============================================================
// DD. 14 - Bảng kiểm bàn giao BN nội trú (IPD Handover Checklist)
// ============================================================
export const IPDHandoverChecklistPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 14/BV" />
      <h2>BẢNG KIỂM BÀN GIAO BỆNH NHÂN NỘI TRÚ</h2>
      <PatientInfoBlock record={record} />
      <table>
        <thead><tr><th>STT</th><th>Nội dung kiểm tra</th><th>Có</th><th>Không</th><th>Ghi chú</th></tr></thead>
        <tbody>
          {['Xác nhận đúng người bệnh (họ tên, mã BN)', 'Hồ sơ bệnh án đầy đủ', 'Y lệnh điều trị hiện tại', 'Dấu hiệu sinh tồn gần nhất', 'Thuốc đang dùng + giờ dùng cuối', 'Dị ứng / cảnh báo', 'Đường truyền TM / Ống dẫn lưu', 'Tình trạng da / vết thương / băng', 'Chế độ ăn / dinh dưỡng', 'Kết quả XN / CLS cần theo dõi', 'Tư trang cá nhân', 'Thông tin người nhà / liên hệ', 'Hướng dẫn cho ca sau'].map((item, i) => (
            <tr key={i}><td>{i + 1}</td><td>{item}</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td></td></tr>
          ))}
        </tbody>
      </table>
      <SignatureBlock leftTitle="ĐD BÀN GIAO" rightTitle="ĐD TIẾP NHẬN" date={new Date()} />
    </div>
  )
);
IPDHandoverChecklistPrint.displayName = 'IPDHandoverChecklistPrint';

// ============================================================
// DD. 15 - Bảng kiểm bàn giao BN chuyển mổ (OR Handover Checklist)
// ============================================================
export const ORHandoverChecklistPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 15/BV" />
      <h2>BẢNG KIỂM BÀN GIAO NGƯỜI BỆNH CHUYỂN MỔ</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="section-title">TRƯỚC KHI VÀO PHÒNG MỔ (Sign In)</div>
        <table>
          <tbody>
            {['Xác nhận đúng người bệnh', 'Đúng vị trí phẫu thuật (đã đánh dấu)', 'Giấy cam kết PT đã ký', 'Nhịn ăn đủ thời gian', 'Dị ứng đã ghi nhận', 'Đường truyền TM hoạt động', 'Kết quả XN / Nhóm máu / Máu dự trữ', 'Phim ảnh / CLS đã mang theo'].map((item, i) => (
              <tr key={i}><td style={{width:30}}>{i + 1}</td><td>{item}</td><td style={{width:40,textAlign:'center'}}>□ Có</td><td style={{width:60,textAlign:'center'}}>□ Không</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="section-title">TRƯỚC KHI RẠCH DA (Time Out)</div>
        <div style={{ margin: '4px 0' }}>□ Xác nhận: Tên BN - Vị trí PT - Tên PT &nbsp; □ Kháng sinh dự phòng (&lt;60ph) &nbsp; □ Dự kiến biến cố</div>
      </div>
      <div className="section">
        <div className="section-title">TRƯỚC KHI RỜI PHÒNG MỔ (Sign Out)</div>
        <div style={{ margin: '4px 0' }}>□ Đếm dụng cụ/gạc đủ &nbsp; □ Bệnh phẩm đã dán nhãn &nbsp; □ Vấn đề hồi sức &nbsp; □ Y lệnh sau mổ</div>
      </div>
      <div className="signature-row">
        <div className="sig"><div className="sig-title">ĐD KHOA GỬI</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
        <div className="sig"><div className="sig-title">ĐD PHÒNG MỔ</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
        <div className="sig"><div className="sig-title">PTV CHÍNH</div><div className="sig-date">(Ký, ghi rõ họ tên)</div></div>
      </div>
    </div>
  )
);
ORHandoverChecklistPrint.displayName = 'ORHandoverChecklistPrint';

// ============================================================
// DD. 16 - Bảng kiểm an toàn phẫu thuật (Surgical Safety Checklist)
// ============================================================
export const SurgicalSafetyChecklistPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 16/BV" />
      <h2>BẢNG KIỂM AN TOÀN PHẪU THUẬT / THỦ THUẬT</h2>
      <div style={{ textAlign: 'center', fontSize: 11, fontStyle: 'italic', marginBottom: 8 }}>(Theo khuyến cáo WHO - Surgical Safety Checklist)</div>
      <PatientInfoBlock record={record} />
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: 8 }}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000', marginBottom: 6 }}>SIGN IN<br />(Trước gây mê)</div>
          <div style={{ fontSize: 12 }}>
            □ Xác nhận đúng BN, vị trí, PT<br />□ Đánh dấu vị trí mổ<br />□ Kiểm tra máy gây mê<br />□ SpO2 hoạt động<br />□ Dị ứng đã ghi nhận<br />□ Nguy cơ đường thở<br />□ Nguy cơ mất máu &gt;500ml<br />&nbsp;&nbsp;→ Máu dự trữ: □ Có □ Không
          </div>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: 8 }}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000', marginBottom: 6 }}>TIME OUT<br />(Trước rạch da)</div>
          <div style={{ fontSize: 12 }}>
            □ Mọi TV giới thiệu tên, vai trò<br />□ Xác nhận: BN - Vị trí - PT<br />□ KS dự phòng &lt;60 phút<br />□ Dự kiến biến cố:<br />&nbsp;&nbsp;PTV: ..................<br />&nbsp;&nbsp;BS GM: ..................<br />&nbsp;&nbsp;ĐD: ..................<br />□ Hình ảnh cần thiết đã treo
          </div>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: 8 }}>
          <div style={{ fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #000', marginBottom: 6 }}>SIGN OUT<br />(Trước rời PM)</div>
          <div style={{ fontSize: 12 }}>
            □ Xác nhận tên PT đã thực hiện<br />□ Đếm dụng cụ/gạc/kim đủ<br />□ Bệnh phẩm dán nhãn đúng<br />□ Vấn đề thiết bị cần xử lý<br />□ PTV/GM/ĐD xem xét:<br />&nbsp;&nbsp;- Hồi sức BN<br />&nbsp;&nbsp;- Kế hoạch hậu phẫu<br />&nbsp;&nbsp;- Phòng biến chứng
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16 }} className="signature-row">
        <div className="sig"><div className="sig-title">PTV CHÍNH</div><div className="sig-date">(Ký)</div></div>
        <div className="sig"><div className="sig-title">BS GÂY MÊ</div><div className="sig-date">(Ký)</div></div>
        <div className="sig"><div className="sig-title">ĐD DỤNG CỤ</div><div className="sig-date">(Ký)</div></div>
      </div>
    </div>
  )
);
SurgicalSafetyChecklistPrint.displayName = 'SurgicalSafetyChecklistPrint';

// ============================================================
// DD. 17 - Bảng theo dõi đường huyết (Glucose Monitoring)
// ============================================================
export const GlucoseMonitoringPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 17/BV" />
      <h2>BẢNG THEO DÕI ĐƯỜNG HUYẾT TRONG NGÀY</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="row"><div className="col"><Field label="Loại ĐTĐ" /></div><div className="col"><Field label="HbA1c gần nhất" /></div></div>
        <Field label="Phác đồ insulin hiện tại" />
      </div>
      <table>
        <thead>
          <tr><th rowSpan={2}>Ngày</th><th colSpan={2}>Sáng</th><th colSpan={2}>Trưa</th><th colSpan={2}>Chiều</th><th colSpan={2}>Tối</th><th rowSpan={2}>Ghi chú</th><th rowSpan={2}>ĐD</th></tr>
          <tr><th>Trước ăn</th><th>Sau ăn</th><th>Trước ăn</th><th>Sau ăn</th><th>Trước ăn</th><th>Sau ăn</th><th>22h</th><th>2h</th></tr>
        </thead>
        <tbody>{emptyRows(11, 7)}</tbody>
      </table>
      <div className="section">
        <div style={{ fontSize: 11, fontStyle: 'italic' }}>Mục tiêu: Trước ăn 4.4 - 7.2 mmol/L | Sau ăn 2h &lt; 10.0 mmol/L | Hạ ĐH &lt; 3.9 mmol/L → báo BS ngay</div>
      </div>
      <SignatureBlock leftTitle="BS ĐIỀU TRỊ" rightTitle="ĐD THEO DÕI" date={new Date()} />
    </div>
  )
);
GlucoseMonitoringPrint.displayName = 'GlucoseMonitoringPrint';

// ============================================================
// DD. 18 - Bảng phân loại thai kỳ nguy cơ (Pregnancy Risk)
// ============================================================
export const PregnancyRiskPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 18/BV" />
      <h2>BẢNG PHÂN LOẠI THAI KỲ NGUY CƠ</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="row"><div className="col"><Field label="PARA" /></div><div className="col"><Field label="Tuổi thai (tuần)" /></div><div className="col"><Field label="Ngày dự sinh" /></div></div>
      </div>
      <div className="section">
        <div className="section-title">ĐÁNH GIÁ YẾU TỐ NGUY CƠ</div>
        <table>
          <thead><tr><th>STT</th><th>Yếu tố nguy cơ</th><th>Có</th><th>Không</th><th>Điểm</th></tr></thead>
          <tbody>
            {[
              ['Tuổi mẹ ≥ 35 hoặc ≤ 17', '1'],
              ['Tiền sử sảy thai/thai lưu ≥ 2 lần', '2'],
              ['Tiền sử mổ lấy thai', '2'],
              ['Tiền sử tiền sản giật/sản giật', '3'],
              ['Đa thai', '2'],
              ['Đái tháo đường thai kỳ', '2'],
              ['Tăng huyết áp mãn', '2'],
              ['Bệnh tim / thận / gan', '3'],
              ['Thiếu máu nặng (Hb < 7g/dL)', '2'],
              ['Nhau tiền đạo / nhau bong non', '3'],
              ['Ối vỡ non', '2'],
              ['Thai chậm tăng trưởng', '2'],
            ].map(([item, score], i) => (
              <tr key={i}><td>{i + 1}</td><td>{item}</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>{score}</td></tr>
            ))}
            <tr><td colSpan={4}><b>TỔNG ĐIỂM</b></td><td></td></tr>
          </tbody>
        </table>
      </div>
      <div className="section">
        <div style={{ margin: '4px 0' }}>Phân loại: □ Nguy cơ thấp (0-3 điểm) &nbsp; □ Nguy cơ trung bình (4-6) &nbsp; □ Nguy cơ cao (≥ 7)</div>
        <Field label="Kế hoạch theo dõi" />
      </div>
      <SignatureBlock leftTitle="BS SẢN KHOA" rightTitle="ĐD/NHS ĐÁNH GIÁ" date={new Date()} />
    </div>
  )
);
PregnancyRiskPrint.displayName = 'PregnancyRiskPrint';

// ============================================================
// DD. 19 - Phiếu đánh giá nuốt (Swallowing Assessment)
// ============================================================
export const SwallowingAssessmentPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 19/BV" />
      <h2>PHIẾU ĐÁNH GIÁ CHỨC NĂNG NUỐT</h2>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="section-title">I. SÀNG LỌC BAN ĐẦU</div>
        <div style={{ margin: '4px 0' }}>Bệnh nhân có bất kỳ dấu hiệu nào sau đây không?</div>
        <div style={{ margin: '4px 0' }}>□ Rối loạn tri giác (GCS &lt; 13) &nbsp; □ Đột quỵ &nbsp; □ Bệnh thần kinh cơ &nbsp; □ Đặt NKQ/mở khí quản</div>
        <div style={{ margin: '4px 0' }}>□ Khó nuốt trước đó &nbsp; □ Giọng nói thay đổi &nbsp; □ Ho khi ăn/uống &nbsp; □ Chảy nước dãi</div>
        <div style={{ margin: '4px 0' }}>Nếu CÓ bất kỳ dấu hiệu nào → Thực hiện test nuốt nước</div>
      </div>
      <div className="section">
        <div className="section-title">II. TEST NUỐT NƯỚC (Water Swallow Test)</div>
        <div style={{ margin: '4px 0' }}>Cho BN ngồi 90°, uống 5ml nước x 3 lần, sau đó 60ml liên tục</div>
        <table>
          <thead><tr><th>Lần</th><th>Thể tích</th><th>Ho</th><th>Thay đổi giọng</th><th>Sặc</th><th>Nuốt lại</th><th>Kết quả</th></tr></thead>
          <tbody>
            <tr><td>1</td><td>5 ml</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td></td></tr>
            <tr><td>2</td><td>5 ml</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td></td></tr>
            <tr><td>3</td><td>5 ml</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td></td></tr>
            <tr><td>4</td><td>60 ml</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td></td></tr>
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="section-title">III. KẾT LUẬN</div>
        <div style={{ margin: '4px 0' }}>□ Nuốt bình thường - ăn đường miệng &nbsp; □ Rối loạn nuốt nhẹ - ăn mềm/lỏng &nbsp; □ Rối loạn nuốt nặng - nuôi ăn qua sonde</div>
        <Field label="Chế độ ăn chỉ định" />
        <Field label="Ngày tái đánh giá" />
      </div>
      <SignatureBlock leftTitle="BS ĐIỀU TRỊ" rightTitle="ĐD ĐÁNH GIÁ" date={new Date()} />
    </div>
  )
);
SwallowingAssessmentPrint.displayName = 'SwallowingAssessmentPrint';

// ============================================================
// DD. 20 - Phiếu scan tài liệu (Document Scan Form)
// ============================================================
export const DocumentScanPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 20/BV" />
      <h2>PHIẾU QUẢN LÝ TÀI LIỆU SCAN</h2>
      <PatientInfoBlock record={record} />
      <table>
        <thead><tr><th>STT</th><th>Loại tài liệu</th><th>Số trang</th><th>Ngày scan</th><th>Người scan</th><th>Đã kiểm tra</th><th>Ghi chú</th></tr></thead>
        <tbody>
          {['Giấy chuyển viện', 'Kết quả XN ngoài', 'Phim X-quang/CT/MRI', 'Giấy BHYT', 'CMND/CCCD', 'Giấy cam kết', 'Đơn thuốc ngoại trú', 'Sổ khám bệnh', 'Khác'].map((doc, i) => (
            <tr key={i}><td>{i + 1}</td><td>{doc}</td><td></td><td></td><td></td><td style={{textAlign:'center'}}>□</td><td></td></tr>
          ))}
        </tbody>
      </table>
      <div className="section">
        <Field label="Tổng số trang đã scan" />
        <Field label="Ghi chú chung" />
      </div>
      <SignatureBlock leftTitle="NGƯỜI SCAN" rightTitle="ĐIỀU DƯỠNG XÁC NHẬN" date={new Date()} />
    </div>
  )
);
DocumentScanPrint.displayName = 'DocumentScanPrint';

// ============================================================
// DD. 21 - Phiếu theo dõi viêm phổi thở máy (VAP Monitoring)
// ============================================================
export const VAPMonitoringPrint = forwardRef<HTMLDivElement, NursingProps>(
  ({ record }, ref) => (
    <div ref={ref} className="emr-print-container">
      <style>{printStyles}</style>
      <PrintHeader formNumber="DD. 21/BV" />
      <h2>PHIẾU THEO DÕI PHÒNG NGỪA VIÊM PHỔI THỞ MÁY</h2>
      <div style={{ textAlign: 'center', fontSize: 11, fontStyle: 'italic', marginBottom: 8 }}>(VAP Bundle - Ventilator-Associated Pneumonia Prevention)</div>
      <PatientInfoBlock record={record} />
      <div className="section">
        <div className="row"><div className="col"><Field label="Ngày đặt NKQ/MKQ" /></div><div className="col"><Field label="Ngày thở máy" /></div></div>
        <Field label="Mode thở máy hiện tại" />
      </div>
      <table>
        <thead>
          <tr><th rowSpan={2}>Ngày</th><th rowSpan={2}>Ca</th><th colSpan={6}>VAP Bundle</th><th rowSpan={2}>ĐD ký</th></tr>
          <tr><th>Nâng đầu 30-45°</th><th>Vệ sinh răng miệng Chlorhexidine</th><th>Hút đờm kín</th><th>Đánh giá an thần/ngừng</th><th>Dự phòng loét DD</th><th>Dự phòng DVT</th></tr>
        </thead>
        <tbody>{Array.from({ length: 14 }, (_, i) => (
          <tr key={i}><td style={{height:24}}></td><td></td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td style={{textAlign:'center'}}>□</td><td></td></tr>
        ))}</tbody>
      </table>
      <div className="section">
        <Field label="Biến chứng ghi nhận" />
        <Field label="Kết quả cấy đờm" />
      </div>
      <SignatureBlock leftTitle="BS HỒI SỨC" rightTitle="ĐD HỒI SỨC" date={new Date()} />
    </div>
  )
);
VAPMonitoringPrint.displayName = 'VAPMonitoringPrint';
