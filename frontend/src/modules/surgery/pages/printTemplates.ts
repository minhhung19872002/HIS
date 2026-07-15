/**
 * Surgery print template — Phiếu phẫu thuật/thủ thuật MS 06/BV-02.
 *
 * Copied VERBATIM from `pages/surgery/printTemplates.ts` (K23 Batch 2) per #409
 * relocation rule: modules/* must not import from pages/ (v1). HTML output is
 * byte-identical to v1; only the signature is typed (v1 took `Record<string, any>`
 * + full `SurgerySchedule` while only `requestCode` is read).
 */
import dayjs from 'dayjs';

export interface SurgeryRecordPrintValues {
  hospitalName?: string;
  patientName?: string;
  age?: string | number;
  gender?: string;
  departmentName?: string;
  roomName?: string;
  bedName?: string;
  admissionTime?: string;
  surgeryTime?: string;
  preOpDiagnosis?: string;
  postOpDiagnosis?: string;
  surgeryMethod?: string;
  surgeryType?: string;
  anesthesiaMethod?: string;
  surgeonName?: string;
  anesthesiologistName?: string;
  /** Raw HTML injected into the "Lược đồ phẫu thuật/thủ thuật" box (e.g. an <img> of the drawn diagram). */
  surgeryDiagram?: string;
  drainInfo?: string;
  packingInfo?: string;
  removalDate?: string;
  stitchRemovalDate?: string;
  notes?: string;
  surgeryDescription?: string;
}

export const buildSurgeryRecordHtml = (
  formValues: SurgeryRecordPrintValues,
  selectedSchedule: { requestCode?: string } | null,
): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu phẫu thuật/thủ thuật - MS: 06/BV-02</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.5; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .header-left { width: 30%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 16px; font-weight: bold; text-align: center; margin: 15px 0 20px; text-decoration: underline; }
          .row { margin: 8px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; padding: 2px 5px; margin-top: 3px; }
          .section { margin: 15px 0; }
          .section-title { font-weight: bold; margin: 15px 0 10px 0; text-decoration: underline; }
          .two-col { display: flex; justify-content: space-between; }
          .signature { text-align: center; margin-top: 40px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div>Sở Y tế: <span class="field">..........................</span></div>
            <div>BV: <span class="field">${formValues.hospitalName || ''}</span></div>
          </div>
          <div style="text-align: right;">
            <div><strong>MS: 06/BV-02</strong></div>
            <div>Số vào viện: <span class="field">${selectedSchedule?.requestCode || ''}</span></div>
          </div>
        </div>

        <div class="title">Phiếu phẫu thuật/thủ thuật</div>

        <div class="row">
          - Họ tên người bệnh: <span class="field">${formValues.patientName || ''}</span>
          Tuổi: <span class="field">${formValues.age || ''}</span>
          ${formValues.gender || 'Nam/Nữ'}
        </div>
        <div class="row">
          - Khoa: <span class="field">${formValues.departmentName || ''}</span>
          Buồng: <span class="field">${formValues.roomName || ''}</span>
          Giường: <span class="field">${formValues.bedName || ''}</span>
        </div>
        <div class="row">
          - Vào viện lúc: <span class="field">${formValues.admissionTime || '......... giờ ....... phút'}</span>
          ngày <span class="field">........ tháng ........ năm ........</span>
        </div>
        <div class="row">
          - Phẫu thuật/thủ thuật lúc: <span class="field">${formValues.surgeryTime || ''}</span>
        </div>

        <div class="section">
          <div class="row">- Chẩn đoán:</div>
          <div class="row" style="margin-left: 20px;">
            . Trước phẫu thuật/thủ thuật: <span class="field-long">${formValues.preOpDiagnosis || ''}</span>
          </div>
          <div class="row" style="margin-left: 20px;">
            . Sau phẫu thuật/thủ thuật: <span class="field-long">${formValues.postOpDiagnosis || ''}</span>
          </div>
        </div>

        <div class="row">
          - Phương pháp phẫu thuật/thủ thuật: <span class="field-long">${formValues.surgeryMethod || ''}</span>
        </div>
        <div class="row">
          - Loại phẫu thuật/thủ thuật: <span class="field">${formValues.surgeryType || ''}</span>
        </div>
        <div class="row">
          - Phương pháp vô cảm: <span class="field">${formValues.anesthesiaMethod || ''}</span>
        </div>
        <div class="row">
          - Bác sĩ phẫu thuật/thủ thuật: <span class="field">${formValues.surgeonName || ''}</span>
        </div>
        <div class="row">
          - Bác sĩ gây mê hồi sức: <span class="field">${formValues.anesthesiologistName || ''}</span>
        </div>

        <div class="section-title">Lược đồ phẫu thuật/thủ thuật</div>
        <div style="border: 1px solid #ccc; min-height: 150px; padding: 10px; margin: 10px 0;">
          ${formValues.surgeryDiagram || ''}
        </div>

        <div class="row">- Dẫn lưu: <span class="field">${formValues.drainInfo || ''}</span></div>
        <div class="row">- Bấc: <span class="field">${formValues.packingInfo || ''}</span></div>
        <div class="row">- Ngày rút: <span class="field">${formValues.removalDate || ''}</span></div>
        <div class="row">- Ngày cắt chỉ: <span class="field">${formValues.stitchRemovalDate || ''}</span></div>
        <div class="row">- Khác: <span class="field">${formValues.notes || ''}</span></div>

        <div class="section-title">Trình tự phẫu thuật/thủ thuật</div>
        <div style="border: 1px solid #ccc; min-height: 200px; padding: 10px; margin: 10px 0; white-space: pre-wrap;">
          ${formValues.surgeryDescription || ''}
        </div>

        <div class="signature">
          <div>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>
          <div style="margin-top: 10px;"><strong>Phẫu thuật/thủ thuật viên</strong></div>
          <div style="margin-top: 50px;">Họ tên: ${formValues.surgeonName || '..................................'}</div>
        </div>
      </body>
      </html>
`;
