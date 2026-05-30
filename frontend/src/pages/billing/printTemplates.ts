/**
 * Billing print HTML template — 3 form: Phiếu thu / Phiếu tạm ứng / Phiếu hoàn tiền.
 *
 * Extracted khỏi pages/Billing.tsx (K16 Batch 3). Pure function build HTML
 * string. Logic preserve 100% — chỉ di chuyển template literal, KHÔNG đổi
 * structure/CSS/field reference.
 */
import dayjs from 'dayjs';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS, HOSPITAL_PHONE } from '../../constants/hospital';
import { numberToWords } from './numberToWords';
import type { Patient, UnpaidService, Deposit, RefundRecord } from './types';

interface ReceiptTotals {
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
}

/** Phiếu thu tiền (MS 04/BV-02) — selected services + totals. */
export const buildReceiptHtml = (
  selectedPatient: Patient,
  selectedItems: UnpaidService[],
  totals: ReceiptTotals,
): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu thu tiền - MS: 04/BV-02</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 50%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0 10px; }
          .subtitle { text-align: center; margin-bottom: 20px; }
          .info-row { margin: 5px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          table th, table td { border: 1px solid #000; padding: 6px; text-align: left; }
          table th { background-color: #f5f5f5; text-align: center; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; background-color: #f0f5ff; }
          .amount-words { font-style: italic; margin: 10px 0; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
          .signature-col { width: 30%; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div><strong>${HOSPITAL_NAME}</strong></div>
            <div>Địa chỉ: ${HOSPITAL_ADDRESS}</div>
            <div>ĐT: ${HOSPITAL_PHONE}</div>
          </div>
          <div class="header-right">
            <div><strong>MS: 04/BV-02</strong></div>
            <div>Số: HD-${dayjs().format('YYYYMMDD')}-${String(selectedPatient?.id || '').slice(-3).padStart(3, '0')}</div>
          </div>
        </div>

        <div class="title">PHIẾU THU TIỀN</div>
        <div class="subtitle">Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>

        <div class="info-row">Mã bệnh nhân: <span class="field">${selectedPatient.code}</span></div>
        <div class="info-row">Họ và tên: <span class="field" style="width: 300px;">${selectedPatient.name}</span> Giới tính: <span class="field">${selectedPatient.gender === 1 ? 'Nam' : selectedPatient.gender === 2 ? 'Nữ' : '-'}</span></div>
        <div class="info-row">Ngày sinh: <span class="field">${selectedPatient.dateOfBirth ? dayjs(selectedPatient.dateOfBirth).format('DD/MM/YYYY') : ''}</span> SĐT: <span class="field">${selectedPatient.phoneNumber || ''}</span></div>
        <div class="info-row">Số thẻ BHYT: <span class="field" style="width: 200px;">${selectedPatient.insuranceNumber || 'Không có'}</span></div>
        <div class="info-row">Đối tượng: <span class="field">${selectedPatient.insuranceNumber ? 'BHYT' : 'Viện phí'}</span></div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">STT</th>
              <th>Mã DV</th>
              <th>Tên dịch vụ</th>
              <th class="text-center">SL</th>
              <th class="text-right">Đơn giá</th>
              <th class="text-right">Thành tiền</th>
              <th class="text-right">BHYT trả</th>
              <th class="text-right">BN trả</th>
            </tr>
          </thead>
          <tbody>
            ${selectedItems.map((item, index) => `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td>${item.serviceCode}</td>
                <td>${item.serviceName}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">${item.unitPrice.toLocaleString('vi-VN')}</td>
                <td class="text-right">${item.totalPrice.toLocaleString('vi-VN')}</td>
                <td class="text-right">${item.insuranceAmount.toLocaleString('vi-VN')}</td>
                <td class="text-right">${item.patientAmount.toLocaleString('vi-VN')}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5" class="text-right">TỔNG CỘNG:</td>
              <td class="text-right">${totals.totalAmount.toLocaleString('vi-VN')} đ</td>
              <td class="text-right">${totals.insuranceAmount.toLocaleString('vi-VN')} đ</td>
              <td class="text-right">${totals.patientAmount.toLocaleString('vi-VN')} đ</td>
            </tr>
          </tbody>
        </table>

        <div class="amount-words">Số tiền bằng chữ: <strong>${numberToWords(totals.patientAmount)}</strong></div>
        <div class="info-row">Phương thức thanh toán: <span class="field">Tiền mặt / Chuyển khoản / Thẻ</span></div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>Người nộp tiền</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
            <div style="margin-top: 60px;"></div>
          </div>
          <div class="signature-col">
            <div><strong>Kế toán</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
            <div style="margin-top: 60px;"></div>
          </div>
          <div class="signature-col">
            <div><strong>Thu ngân</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
            <div style="margin-top: 60px;"></div>
          </div>
        </div>
      </body>
      </html>
`;

/** Phiếu tạm ứng — deposit. */
export const buildDepositHtml = (deposit: Deposit): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu tạm ứng</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.5; padding: 30px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: bold; margin: 20px 0; }
          .info { margin: 10px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .amount-box { border: 2px solid #000; padding: 15px; margin: 20px 0; text-align: center; font-size: 18px; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
          .signature-col { width: 45%; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div><strong>${HOSPITAL_NAME}</strong></div>
          <div>${HOSPITAL_ADDRESS} - ĐT: ${HOSPITAL_PHONE}</div>
        </div>

        <div class="title" style="text-align: center;">PHIẾU TẠM ỨNG</div>
        <div style="text-align: center; margin-bottom: 20px;">Ngày ${dayjs(deposit.depositDate).format('DD')} tháng ${dayjs(deposit.depositDate).format('MM')} năm ${dayjs(deposit.depositDate).format('YYYY')}</div>

        <div class="info">Mã bệnh nhân: <span class="field">${deposit.patientCode}</span></div>
        <div class="info">Họ và tên: <span class="field" style="width: 350px;">${deposit.patientName}</span></div>

        <div class="amount-box">
          <div>Số tiền tạm ứng:</div>
          <div style="font-size: 24px; font-weight: bold; color: #1890ff;">${deposit.amount.toLocaleString('vi-VN')} VNĐ</div>
          <div style="font-style: italic;">(${numberToWords(deposit.amount)})</div>
        </div>

        <div class="info">Ghi chú: <span class="field" style="width: 80%;">${deposit.note || ''}</span></div>
        <div class="info">Thu ngân: <span class="field">${deposit.cashier}</span></div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>Người nộp tiền</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>Thu ngân</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </body>
      </html>
`;

/** Phiếu hoàn tiền — refund. */
export const buildRefundHtml = (refund: RefundRecord): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu hoàn tiền</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.5; padding: 30px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: bold; margin: 20px 0; color: #f5222d; }
          .info { margin: 10px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .amount-box { border: 2px solid #f5222d; padding: 15px; margin: 20px 0; text-align: center; font-size: 18px; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; }
          .signature-col { width: 30%; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div><strong>${HOSPITAL_NAME}</strong></div>
          <div>${HOSPITAL_ADDRESS} - ĐT: ${HOSPITAL_PHONE}</div>
        </div>

        <div class="title" style="text-align: center;">PHIẾU HOÀN TIỀN</div>
        <div style="text-align: center; margin-bottom: 20px;">Ngày ${dayjs(refund.refundDate).format('DD')} tháng ${dayjs(refund.refundDate).format('MM')} năm ${dayjs(refund.refundDate).format('YYYY')}</div>

        <div class="info">Mã bệnh nhân: <span class="field">${refund.patientCode}</span></div>
        <div class="info">Họ và tên: <span class="field" style="width: 350px;">${refund.patientName}</span></div>

        <div class="amount-box">
          <div>Số tiền hoàn trả:</div>
          <div style="font-size: 24px; font-weight: bold; color: #f5222d;">${refund.amount.toLocaleString('vi-VN')} VNĐ</div>
          <div style="font-style: italic;">(${numberToWords(refund.amount)})</div>
        </div>

        <div class="info">Lý do hoàn tiền: <span class="field" style="width: 80%;">${refund.reason}</span></div>
        <div class="info">Phương thức hoàn: <span class="field">${refund.paymentMethod}</span></div>
        <div class="info">Người yêu cầu: <span class="field">${refund.requestedBy}</span></div>
        <div class="info">Người duyệt: <span class="field">${refund.approvedBy || ''}</span></div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>Người nhận tiền</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>Kế toán</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
          <div class="signature-col">
            <div><strong>Thu ngân</strong></div>
            <div>(Ký, ghi rõ họ tên)</div>
          </div>
        </div>
      </body>
      </html>
`;
