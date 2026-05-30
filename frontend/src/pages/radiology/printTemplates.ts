/**
 * Radiology print HTML template — Phiếu kết quả CĐHA.
 *
 * Extracted khỏi pages/Radiology.tsx (K14 Batch 4). Pure function build HTML
 * string từ RadiologyReport. Logic preserve 100%.
 */
import dayjs from 'dayjs';
import { HOSPITAL_NAME } from '../../constants/hospital';
import type { RadiologyReport } from './types';

export const buildRadiologyReportHtml = (report: RadiologyReport): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kết quả Chẩn đoán Hình ảnh - ${report.requestCode}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.5; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 15px; }
          .header-left { width: 50%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; text-transform: uppercase; }
          .subtitle { text-align: center; margin-bottom: 15px; font-size: 14px; }
          .patient-info { border: 1px solid #000; padding: 10px; margin-bottom: 15px; }
          .info-row { margin: 5px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          .section { margin: 15px 0; }
          .section-title { font-weight: bold; font-size: 14px; margin-bottom: 8px; text-decoration: underline; }
          .section-content { border: 1px solid #ddd; padding: 10px; min-height: 80px; background-color: #fafafa; }
          .conclusion { border: 2px solid #000; padding: 15px; margin: 15px 0; background-color: #f0f5ff; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
          .signature-col { width: 45%; }
          .footer { margin-top: 20px; font-size: 11px; text-align: center; color: #666; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div><strong>SỞ Y TẾ TP.HCM</strong></div>
            <div><strong>${HOSPITAL_NAME}</strong></div>
            <div>Khoa: Chẩn đoán Hình ảnh</div>
          </div>
          <div class="header-right">
            <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
            <div><em>Độc lập - Tự do - Hạnh phúc</em></div>
          </div>
        </div>

        <div class="title">PHIẾU KẾT QUẢ CHẨN ĐOÁN HÌNH ẢNH</div>
        <div class="subtitle">Số phiếu: ${report.requestCode}</div>

        <div class="patient-info">
          <div class="info-row">Họ và tên: <span class="field" style="width: 250px;"><strong>${report.patientName}</strong></span> Mã BN: <span class="field">${report.patientCode}</span></div>
          <div class="info-row">Loại chụp: <span class="field" style="width: 400px;">${report.serviceName}</span></div>
          <div class="info-row">Ngày thực hiện: <span class="field">${report.reportDate ? dayjs(report.reportDate).format('DD/MM/YYYY HH:mm') : ''}</span></div>
        </div>

        <div class="section">
          <div class="section-title">1. MÔ TẢ HÌNH ẢNH:</div>
          <div class="section-content">${report.findings || 'Không có mô tả.'}</div>
        </div>

        <div class="conclusion">
          <div class="section-title">2. KẾT LUẬN:</div>
          <div style="font-size: 14px; margin-top: 10px;">${report.impression || 'Không có kết luận.'}</div>
        </div>

        ${report.recommendations ? `
        <div class="section">
          <div class="section-title">3. ĐỀ NGHỊ:</div>
          <div class="section-content">${report.recommendations}</div>
        </div>
        ` : ''}

        <div class="signature-row">
          <div class="signature-col">
            <div>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>
            <div><strong>BÁC SĨ ĐỌC KẾT QUẢ</strong></div>
            <div style="margin-top: 50px;">${report.radiologistName || ''}</div>
          </div>
          <div class="signature-col">
            ${report.approvedBy ? `
            <div>Ngày ${report.approvedAt ? dayjs(report.approvedAt).format('DD') : dayjs().format('DD')} tháng ${report.approvedAt ? dayjs(report.approvedAt).format('MM') : dayjs().format('MM')} năm ${report.approvedAt ? dayjs(report.approvedAt).format('YYYY') : dayjs().format('YYYY')}</div>
            <div><strong>TRƯỞNG KHOA</strong></div>
            <div style="margin-top: 50px;">${report.approvedBy}</div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <em>Phiếu này chỉ có giá trị khi có chữ ký và dấu của Bệnh viện</em>
        </div>
      </body>
      </html>
`;
