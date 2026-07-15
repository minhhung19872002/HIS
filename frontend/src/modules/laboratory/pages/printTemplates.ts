/**
 * Lab v2 print templates — nhãn barcode dán mẫu.
 * Copy verbatim từ v1 `pages/laboratory/printTemplates.ts` (port rule: KHÔNG import từ pages/).
 * v2 in phiếu kết quả qua API blob (`printTestResultReport`) nên chỉ cần nhãn barcode ở đây.
 */
import dayjs from 'dayjs';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import type { LabRequest } from '../api/laboratory';

/** Nhãn barcode dán mẫu — local fallback khi API printBarcode lỗi. */
export const buildBarcodeLabelHtml = (record: LabRequest, barcode: string): string => `
        <!DOCTYPE html>
        <html><head><title>Nhãn Barcode - ${barcode}</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
          .label { border: 2px solid #000; padding: 15px; display: inline-block; min-width: 250px; }
          .barcode { font-size: 32px; font-weight: bold; margin: 15px 0; letter-spacing: 5px; font-family: monospace; }
          .code { font-size: 14px; margin-top: 5px; }
          .patient { font-size: 12px; margin-top: 10px; color: #333; }
          @media print { body { padding: 0; } }
        </style></head>
        <body>
          <div class="label">
            <div style="font-weight: bold; font-size: 11px;">${HOSPITAL_NAME}</div>
            <div class="barcode">||||| ${barcode} |||||</div>
            <div class="code"><strong>${barcode}</strong></div>
            <div class="patient">${record.patientName} - ${record.patientCode}</div>
            <div class="patient">${record.requestedTests?.join(', ') || ''}</div>
            <div class="patient">${dayjs().format('DD/MM/YYYY HH:mm')}</div>
          </div>
        </body></html>
`;
