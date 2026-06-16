import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../constants/hospital';
import type { HemodialysisSessionDto } from '../api/inpatient';

export interface HemodialysisPrintHeader {
  patientName?: string;
  patientCode?: string;
  departmentName?: string;
  roomBed?: string;
  diagnosis?: string;
}

const esc = (s?: string | null) => (s == null ? '' : String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c)));
const fmtTime = (t?: string) => (t ? t.slice(0, 5) : '');
const num = (n?: number) => (n == null ? '' : String(n));

/**
 * Print a hemodialysis monitoring sheet (Phiếu theo dõi chạy thận nhân tạo) in a popup window.
 * Same print-in-popup pattern as BirthCertificatePrint.tsx (#148).
 */
export const printHemodialysisSheet = (s: HemodialysisSessionDto, h: HemodialysisPrintHeader): boolean => {
  const w = window.open('', '_blank');
  if (!w) return false;

  const sessionDate = s.sessionDate ? dayjs(s.sessionDate) : dayjs();
  const pressure = [
    s.arterialPressure != null ? `ĐM: ${s.arterialPressure}` : null,
    s.venousPressure != null ? `TM: ${s.venousPressure}` : null,
  ].filter(Boolean).join(' / ') || '..........';

  const row = (label: string, value: string) => `
    <tr><td class="lbl">${label}</td><td class="val">${value || '..........'}</td></tr>`;

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Phiếu theo dõi chạy thận nhân tạo</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.5; padding: 20mm; max-width: 210mm; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .header-left { width: 55%; text-align: center; }
        .header-right { width: 40%; text-align: center; }
        .hospital { font-size: 13px; font-weight: bold; text-transform: uppercase; }
        .country { font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .slogan { font-size: 11px; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 2px; }
        .title { font-size: 18px; font-weight: bold; text-align: center; text-transform: uppercase; margin: 18px 0 4px 0; }
        .subtitle { text-align: center; font-style: italic; margin-bottom: 12px; font-size: 12px; }
        .pt-info { margin: 10px 0; }
        .pt-info .row { margin: 3px 0; }
        .field { border-bottom: 1px dotted #000; display: inline-block; padding: 0 5px; min-width: 120px; }
        table.sheet { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.sheet td { border: 1px solid #000; padding: 5px 8px; vertical-align: top; }
        table.sheet td.lbl { width: 38%; font-weight: bold; background: #f5f5f5; }
        .section-h { font-weight: bold; text-transform: uppercase; margin: 14px 0 4px 0; font-size: 13px; }
        .signature-section { display: flex; justify-content: space-between; margin-top: 36px; }
        .signature-box { text-align: center; width: 220px; }
        .signature-title { font-weight: bold; margin-bottom: 5px; }
        .signature-hint { font-style: italic; font-size: 11px; margin-bottom: 50px; }
        @media print { body { padding: 15mm; } @page { size: A4; margin: 15mm 20mm; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <div class="hospital">${esc(HOSPITAL_NAME)}</div>
          <div style="font-size: 11px;">${esc(HOSPITAL_ADDRESS)}</div>
          <div style="font-size: 11px;">ĐT: ${esc(HOSPITAL_PHONE)}</div>
        </div>
        <div class="header-right">
          <div class="country">Cộng hòa Xã hội Chủ nghĩa Việt Nam</div>
          <div class="slogan">Độc lập - Tự do - Hạnh phúc</div>
        </div>
      </div>

      <div class="title">Phiếu Theo Dõi Chạy Thận Nhân Tạo</div>
      <div class="subtitle">Buổi lọc số ${num(s.sessionNumber)} &bull; Ngày ${sessionDate.format('DD/MM/YYYY')}</div>

      <div class="pt-info">
        <div class="row">Họ tên người bệnh: <span class="field" style="min-width: 240px;">${esc(h.patientName)}</span>
          &nbsp;&nbsp; Mã BN: <span class="field">${esc(h.patientCode)}</span></div>
        <div class="row">Khoa: <span class="field" style="min-width: 180px;">${esc(h.departmentName)}</span>
          &nbsp;&nbsp; Phòng/Giường: <span class="field">${esc(h.roomBed)}</span></div>
        <div class="row">Chẩn đoán: <span class="field" style="min-width: 380px;">${esc(h.diagnosis)}</span></div>
        <div class="row">Thời gian: từ <span class="field" style="min-width:70px;">${fmtTime(s.startTime)}</span>
          đến <span class="field" style="min-width:70px;">${fmtTime(s.endTime)}</span>
          &nbsp;&nbsp; Loại quả lọc: <span class="field">${esc(s.dialyzerType)}</span></div>
      </div>

      <div class="section-h">I. Cân nặng &amp; Dấu hiệu sinh tồn</div>
      <table class="sheet">
        ${row('Cân nặng trước lọc (kg)', num(s.weightPre))}
        ${row('Cân nặng sau lọc (kg)', num(s.weightPost))}
        ${row('Mạch (lần/phút)', num(s.pulse))}
        ${row('Huyết áp nằm (mmHg)', esc(s.bloodPressureLying))}
        ${row('Huyết áp đứng (mmHg)', esc(s.bloodPressureStanding))}
        ${row('Nhiệt độ (°C)', num(s.temperature))}
        ${row('Nhịp thở (lần/phút)', num(s.respiratoryRate))}
      </table>

      <div class="section-h">II. Thông số máy lọc</div>
      <table class="sheet">
        ${row('Tốc độ máu (ml/phút)', num(s.bloodFlowRate))}
        ${row('Áp lực (mmHg)', pressure)}
        ${row('PTM / TMP (mmHg)', num(s.tmp))}
        ${row('Tái dịch (lít)', num(s.replacementFluid))}
      </table>

      <div class="section-h">III. Thuốc &amp; Biến chứng</div>
      <table class="sheet">
        ${row('Thuốc sử dụng', esc(s.medications))}
        ${row('Biến chứng', esc(s.complications))}
        ${row('Ghi chú', esc(s.notes))}
      </table>

      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-title">ĐIỀU DƯỠNG THỰC HIỆN</div>
          <div class="signature-hint">(Ký, ghi rõ họ tên)</div>
        </div>
        <div class="signature-box">
          <div style="font-style: italic; font-size: 12px;">
            Ngày ${sessionDate.format('DD')} tháng ${sessionDate.format('MM')} năm ${sessionDate.format('YYYY')}
          </div>
          <div class="signature-title">BÁC SĨ ĐIỀU TRỊ</div>
          <div class="signature-hint">(Ký, ghi rõ họ tên)</div>
        </div>
      </div>
    </body>
    </html>
  `);

  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
  return true;
};
