/**
 * OPD print HTML template — 2 phiếu: Vật tư + Bệnh án ngoại trú.
 *
 * Extracted khỏi pages/OPD.tsx (K13 Batch 7). Pure function build HTML
 * string. Logic preserve 100%.
 */
import dayjs from 'dayjs';
import type { Diagnosis } from './types';

type SupplyOrder = { id: string; itemId: string; itemCode: string; itemName: string; unit: string; quantity: number; stockQuantity: number };
type SelectedPatient = { fullName: string; patientCode: string; insuranceNumber?: string | null };

/** Phiếu kê vật tư y tế. */
export const buildSupplyOrderHtml = (
  selectedPatient: SelectedPatient,
  diagnoses: Diagnosis[],
  supplyOrders: SupplyOrder[],
  totalItems: number,
): string => `
      <!DOCTYPE html>
      <html><head>
        <title>Phiếu kê vật tư</title>
        <style>
          body { font-family: 'Times New Roman', serif; font-size: 13px; padding: 20px; }
          .title { text-align: center; font-size: 16px; font-weight: bold; margin: 15px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #000; padding: 5px; text-align: left; }
          th { background: #f0f0f0; }
          .footer { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
          .footer div { width: 45%; }
          @media print { body { padding: 10px; } }
        </style>
      </head><body>
        <div class="title">PHIẾU KÊ VẬT TƯ Y TẾ</div>
        <p><strong>Bệnh nhân:</strong> ${selectedPatient.fullName} &nbsp;&nbsp; <strong>Mã BN:</strong> ${selectedPatient.patientCode}</p>
        <p><strong>Chẩn đoán:</strong> ${diagnoses.map(d => `${d.icdCode} - ${d.icdName}`).join('; ') || '-'}</p>
        <p><strong>Ngày:</strong> ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
        <table>
          <thead><tr><th>STT</th><th>Mã VT</th><th>Tên vật tư</th><th>ĐVT</th><th>SL</th></tr></thead>
          <tbody>
            ${supplyOrders.map((s, i) => `<tr><td>${i + 1}</td><td>${s.itemCode}</td><td>${s.itemName}</td><td>${s.unit}</td><td>${s.quantity}</td></tr>`).join('')}
          </tbody>
          <tfoot><tr><td colspan="4"><strong>Tổng cộng</strong></td><td><strong>${totalItems}</strong></td></tr></tfoot>
        </table>
        <div class="footer">
          <div><strong>Người kê</strong><br/><br/><br/>(Ký, ghi rõ họ tên)</div>
          <div>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}<br/><strong>Bác sĩ điều trị</strong><br/><br/><br/>(Ký, ghi rõ họ tên)</div>
        </div>
      </body></html>
`;

/** Bệnh án ngoại trú — 5 loại theo TT BYT (chung/RHM/tuyến xã/YHCT/PHCN). */
type RecordType = { value: string; label: string; code: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildOutpatientRecordHtml = (
  formValues: Record<string, any>,
  recordType: RecordType,
  examinationId: string | undefined,
  insuranceNumber: string | null | undefined,
): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${recordType.label} - MS: ${recordType.code}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 40%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
          .subtitle { font-size: 14px; text-align: center; margin-bottom: 15px; }
          .section { margin: 10px 0; }
          .section-title { font-weight: bold; margin: 10px 0 5px 0; }
          .row { display: flex; margin: 3px 0; }
          .col { flex: 1; }
          .col-2 { flex: 2; }
          .col-3 { flex: 3; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; padding: 0 5px; }
          .checkbox { display: inline-block; width: 14px; height: 14px; border: 1px solid #000; margin-right: 3px; vertical-align: middle; text-align: center; line-height: 12px; }
          .checkbox.checked::after { content: '✓'; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          table th, table td { border: 1px solid #000; padding: 5px; text-align: left; }
          .vital-box { border: 1px solid #000; padding: 5px; margin-left: 10px; width: 150px; float: right; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
          .signature-col { width: 45%; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div>Sở Y tế: <span class="field">${formValues.healthDepartment || '...........................'}</span></div>
            <div>Bệnh viện: <span class="field">${formValues.hospitalName || '...........................'}</span></div>
          </div>
          <div style="text-align: right;">
            <div><strong>MS: ${recordType.code}</strong></div>
            <div>Số ngoại trú: <span class="field">${examinationId?.substring(0, 8) || '...........'}</span></div>
            <div>Số lưu trữ: <span class="field">................</span></div>
          </div>
        </div>

        <div class="title">${recordType.label.toUpperCase()}</div>
        <div class="subtitle">KHOA: <span class="field">${formValues.departmentName || '..............................'}</span></div>

        <div class="section">
          <div class="section-title">I. HÀNH CHÍNH:</div>
          <div class="row">
            <div class="col-2">1. Họ và tên (In hoa): <span class="field">${formValues.patientName || ''}</span></div>
            <div class="col">2. Sinh ngày: <span class="field">${formValues.dateOfBirth || ''}</span></div>
            <div style="width: 60px;">Tuổi: <span class="field">${formValues.age || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">3. Giới:
              <span class="checkbox ${formValues.gender === 'Nam' ? 'checked' : ''}"></span>Nam
              <span class="checkbox ${formValues.gender === 'Nữ' ? 'checked' : ''}"></span>Nữ
            </div>
            <div class="col">4. Nghề nghiệp: <span class="field">${formValues.occupation || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">5. Dân tộc: <span class="field">${formValues.ethnicity || ''}</span></div>
            <div class="col">6. Ngoại kiều: <span class="field">${formValues.nationality || ''}</span></div>
          </div>
          <div class="row">
            <div>7. Địa chỉ: <span class="field" style="width: 90%;">${formValues.address || ''}</span></div>
          </div>
          <div class="row">
            <div class="col">8. Nơi làm việc: <span class="field">${formValues.workplace || ''}</span></div>
            <div class="col">9. Đối tượng:
              <span class="checkbox ${insuranceNumber ? 'checked' : ''}"></span>BHYT
              <span class="checkbox ${!insuranceNumber ? 'checked' : ''}"></span>Thu phí
              <span class="checkbox"></span>Miễn
              <span class="checkbox"></span>Khác
            </div>
          </div>
          <div class="row">
            <div>10. BHYT giá trị đến ngày <span class="field">${formValues.insuranceExpiry || '......./......./........'}</span> Số thẻ BHYT: <span class="field">${formValues.insuranceNumber || ''}</span></div>
          </div>
          <div class="row">
            <div>11. Họ tên, địa chỉ người nhà khi cần báo tin: <span class="field">${formValues.contactName || ''}</span> ĐT: <span class="field">${formValues.contactPhone || ''}</span></div>
          </div>
          <div class="row">
            <div>12. Đến khám bệnh lúc: <span class="field">${formValues.visitTime || ''}</span></div>
          </div>
          <div class="row">
            <div>13. Chẩn đoán của nơi giới thiệu: <span class="field">${formValues.referralDiagnosis || ''}</span>
              <span class="checkbox"></span>Y tế <span class="checkbox"></span>Tự đến
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">II. LÝ DO VÀO VIỆN:</div>
          <div class="field-long">${formValues.visitReason || ''}</div>
        </div>

        <div class="section">
          <div class="section-title">III. HỎI BỆNH:</div>
          <div>1. Quá trình bệnh lý:</div>
          <div class="field-long" style="min-height: 60px;">${formValues.diseaseProgress || ''}</div>
          <div style="margin-top: 10px;">2. Tiền sử bệnh:</div>
          <div>+ Bản thân: <span class="field-long">${formValues.personalHistory || ''}</span></div>
          <div>+ Gia đình: <span class="field-long">${formValues.familyHistory || ''}</span></div>
        </div>

        <div class="section">
          <div class="section-title" style="display: flex; justify-content: space-between;">
            <span>IV. KHÁM BỆNH:</span>
            <div class="vital-box">
              <div>Mạch: ${formValues.pulse || '......'} lần/ph</div>
              <div>Nhiệt độ: ${formValues.temperature || '......'} °C</div>
              <div>Huyết áp: ${formValues.bloodPressure || '.../..'} mmHg</div>
              <div>Nhịp thở: ${formValues.respiratoryRate || '......'} lần/ph</div>
              <div>Cân nặng: ${formValues.weight || '......'} kg</div>
            </div>
          </div>
          <div>1. Toàn thân:</div>
          <div class="field-long" style="min-height: 40px;">${formValues.generalExam || ''}</div>
          <div style="margin-top: 10px;">2. Các bộ phận:</div>
          <div class="field-long" style="min-height: 80px; white-space: pre-wrap;">${formValues.organExam || ''}</div>
          <div style="margin-top: 10px;">3. Tóm tắt kết quả cận lâm sàng:</div>
          <div class="field-long" style="min-height: 40px;">${formValues.labResults || ''}</div>
          <div style="margin-top: 10px;">4. Chẩn đoán ban đầu:</div>
          <div class="field-long">${formValues.initialDiagnosis || ''}</div>
          <div style="margin-top: 10px;">5. Đã xử lý (thuốc, chăm sóc):</div>
          <div class="field-long" style="min-height: 60px;">${formValues.treatment || ''}</div>
          <div style="margin-top: 10px;">6. Chẩn đoán khi ra viện: <span class="field" style="width: 70%;">${formValues.finalDiagnosis || ''}</span></div>
          <div style="margin-top: 5px;">7. Điều trị ngoại trú từ ngày <span class="field">${formValues.treatmentFromDate || '....../....../........'}</span> đến ngày <span class="field">${formValues.treatmentToDate || '....../....../........'}</span></div>
        </div>

        <div class="signature-row">
          <div class="signature-col">
            <div><strong>Giám đốc bệnh viện</strong></div>
            <div style="margin-top: 60px;">Họ tên: ................................</div>
          </div>
          <div class="signature-col">
            <div>Ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}</div>
            <div><strong>Bác sỹ khám bệnh</strong></div>
            <div style="margin-top: 40px;">Họ tên: ................................</div>
          </div>
        </div>
      </body>
      </html>
`;
