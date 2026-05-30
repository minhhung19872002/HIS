/**
 * Pharmacy dispensing slip — Phiếu xuất thuốc.
 *
 * Extracted khỏi pages/Pharmacy.tsx (K18 Batch 2).
 */
import dayjs from 'dayjs';
import { HOSPITAL_NAME } from '../../constants/hospital';
import type { PendingPrescription, MedicationItem } from './types';

export const buildDispensingSlipHtml = (
  selectedPrescription: PendingPrescription,
  medicationItems: MedicationItem[],
): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu xuất thuốc - ${selectedPrescription.prescriptionCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 12px; line-height: 1.4; padding: 15px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 50%; }
          .title { font-size: 16px; font-weight: bold; text-align: center; margin: 10px 0; text-transform: uppercase; }
          .info-row { margin: 4px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 80px; display: inline-block; padding: 0 3px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
          table th, table td { border: 1px solid #000; padding: 4px; text-align: left; }
          table th { background-color: #f0f0f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; background-color: #f0f5ff; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 25px; text-align: center; font-size: 11px; }
          .signature-col { width: 30%; }
          .instructions { font-size: 10px; border: 1px dashed #999; padding: 8px; margin-top: 10px; }
          @media print { body { padding: 5px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div><strong>${HOSPITAL_NAME}</strong></div>
            <div>Khoa Dược</div>
          </div>
          <div style="text-align: right;">
            <div><strong>MS: 05/BV-02</strong></div>
            <div>Số: ${selectedPrescription.prescriptionCode}</div>
          </div>
        </div>

        <div class="title">PHIẾU XUẤT THUỐC</div>
        <div style="text-align: center; margin-bottom: 10px;">Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>

        <div class="info-row">Mã BN: <span class="field">${selectedPrescription.patientCode}</span> Họ tên: <span class="field" style="width: 200px;"><strong>${selectedPrescription.patientName}</strong></span></div>
        <div class="info-row">Khoa/Phòng: <span class="field">${selectedPrescription.department}</span> Bác sĩ kê: <span class="field">${selectedPrescription.doctorName}</span></div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 30px;">STT</th>
              <th>Tên thuốc</th>
              <th class="text-center" style="width: 50px;">ĐVT</th>
              <th class="text-center" style="width: 40px;">SL</th>
              <th style="width: 80px;">Số lô</th>
              <th style="width: 65px;">Hạn SD</th>
              <th style="width: 100px;">Cách dùng</th>
            </tr>
          </thead>
          <tbody>
            ${medicationItems.filter(item => item.dispensedQuantity > 0).map((item, index) => {
              const batch = item.batches?.find(b => b.batchNumber === item.selectedBatch) || item.batches?.[0];
              return `
                <tr>
                  <td class="text-center">${index + 1}</td>
                  <td><strong>${item.medicationName}</strong></td>
                  <td class="text-center">${item.unit}</td>
                  <td class="text-center">${item.dispensedQuantity}</td>
                  <td>${batch?.batchNumber || 'N/A'}</td>
                  <td>${batch?.expiryDate ? dayjs(batch.expiryDate).format('DD/MM/YY') : 'N/A'}</td>
                  <td style="font-size: 10px;">${item.dosage}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="instructions">
          <strong>Hướng dẫn sử dụng:</strong>
          <ul style="margin-left: 15px; margin-top: 5px;">
            ${medicationItems.filter(item => item.dispensedQuantity > 0 && item.instruction).map(item =>
              `<li><strong>${item.medicationName}:</strong> ${item.instruction}</li>`
            ).join('')}
          </ul>
        </div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>NGƯỜI NHẬN</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>DƯỢC SĨ PHÁT</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>TRƯỞNG KHOA</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </body>
      </html>
`;
