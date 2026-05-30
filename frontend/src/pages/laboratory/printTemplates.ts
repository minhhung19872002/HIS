/**
 * Laboratory print templates — Barcode label + Phiếu kết quả XN.
 * Extracted khỏi pages/Laboratory.tsx (K26 Batch 1).
 */
import dayjs from 'dayjs';
import { HOSPITAL_NAME } from '../../constants/hospital';
import type { LabRequest, TestResult, TestParameter } from '../../api/laboratory';

const getParameterStatus = (param: TestParameter): 'normal' | 'high' | 'low' | 'critical' | null => {
  if (param.value === null || param.value === '') return null;
  const numValue = typeof param.value === 'number' ? param.value : parseFloat(param.value as string);
  if (isNaN(numValue)) return null;
  if (param.criticalLow !== undefined && numValue < param.criticalLow) return 'critical';
  if (param.criticalHigh !== undefined && numValue > param.criticalHigh) return 'critical';
  if (param.normalMin !== undefined && numValue < param.normalMin) return 'low';
  if (param.normalMax !== undefined && numValue > param.normalMax) return 'high';
  return 'normal';
};

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

/** Phiếu kết quả xét nghiệm. */
export const buildLabResultHtml = (result: TestResult): string => `
      <!DOCTYPE html>
      <html><head><title>Kết quả xét nghiệm - ${result.requestCode}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 13px; padding: 20px; }
        .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
        .info { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #000; padding: 5px; text-align: left; }
        th { background: #f0f0f0; }
        .text-right { text-align: right; }
        .abnormal { color: red; font-weight: bold; }
        .signature-row { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
        .signature-col { width: 30%; }
        @media print { body { padding: 10px; } }
      </style></head><body>
        <div style="text-align: center;"><strong>${HOSPITAL_NAME}</strong></div>
        <div class="title">KẾT QUẢ XÉT NGHIỆM</div>
        <div class="info">Mã phiếu: <strong>${result.requestCode}</strong></div>
        <div class="info">Mã BN: <strong>${result.patientCode}</strong> - Họ tên: <strong>${result.patientName}</strong></div>
        <div class="info">Xét nghiệm: <strong>${result.testName}</strong></div>
        ${result.enteredBy ? `<div class="info">Người nhập: ${result.enteredBy} - ${result.enteredTime ? dayjs(result.enteredTime).format('DD/MM/YYYY HH:mm') : ''}</div>` : ''}
        ${result.approvedBy ? `<div class="info">Người duyệt: ${result.approvedBy} - ${result.approvedTime ? dayjs(result.approvedTime).format('DD/MM/YYYY HH:mm') : ''}</div>` : ''}
        <table>
          <thead><tr><th>Chỉ số</th><th>Giá trị</th><th>Đơn vị</th><th>Giá trị tham chiếu</th><th>Trạng thái</th></tr></thead>
          <tbody>
            ${(result.parameters || []).map(p => {
              const status = getParameterStatus(p);
              const isAbnormal = status === 'high' || status === 'low' || status === 'critical';
              return `<tr>
                <td>${p.name}</td>
                <td class="${isAbnormal ? 'abnormal' : ''}">${p.value ?? '-'}</td>
                <td>${p.unit}</td>
                <td>${p.referenceRange}</td>
                <td class="${isAbnormal ? 'abnormal' : ''}">${status === 'normal' ? 'Bình thường' : status === 'high' ? 'Cao' : status === 'low' ? 'Thấp' : status === 'critical' ? 'Nguy hiểm' : '-'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
        ${result.notes ? `<div class="info">Ghi chú: ${result.notes}</div>` : ''}
        <div class="signature-row">
          <div class="signature-col"><div><strong>Người thực hiện</strong></div><div style="margin-top: 50px;">${result.enteredBy || ''}</div></div>
          <div class="signature-col"><div><strong>Trưởng khoa</strong></div><div style="margin-top: 50px;">${result.approvedBy || ''}</div></div>
        </div>
      </body></html>
`;
