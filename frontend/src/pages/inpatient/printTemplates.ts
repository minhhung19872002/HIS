/**
 * Inpatient print HTML template — extracted khỏi pages/Inpatient.tsx
 * (K15 Batch 2). Pure function build HTML string từ form values.
 *
 * Logic preserve 100% — chỉ di chuyển template literal (264 dòng) khỏi
 * inline `printWindow.document.write` thành function độc lập. KHÔNG đổi
 * structure, CSS, conditional, hay field reference.
 *
 * `formValues`: typed loose vì Antd Form.getFieldsValue() trả Record<string, unknown>.
 * `recordType`: lấy từ MEDICAL_RECORD_TYPES (./constants).
 * `isNgoaiKhoa`: surgical record type flag (caller compute).
 */
import dayjs from 'dayjs';
import { escapeHtml as esc } from '../../utils/printWindow';

type RecordType = { value: string; label: string; code: string };

// formValues type loose vì Antd Form.getFieldsValue() trả any-shape;
// template literal cần truy cập field arbitrary nên `any` cho phép preserve
// behavior gốc (KHÔNG kèm strict type check trong template HTML inline).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildMedicalRecordHtml = (
  formValues: Record<string, any>,
  recordType: RecordType,
  isNgoaiKhoa: boolean,
): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${esc(recordType.label)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 40%; }
          .header-center { width: 30%; text-align: center; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
          .section { margin: 10px 0; }
          .section-title { font-weight: bold; margin: 10px 0 5px 0; }
          .row { display: flex; margin: 3px 0; }
          .col { flex: 1; }
          .col-2 { flex: 2; }
          .col-3 { flex: 3; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; padding: 0 5px; }
          .checkbox { width: 14px; height: 14px; border: 1px solid #000; display: inline-block; margin-right: 3px; vertical-align: middle; text-align: center; line-height: 12px; }
          .checkbox.checked::after { content: '✓'; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          table th, table td { border: 1px solid #000; padding: 5px; text-align: left; }
          table th { background: #f0f0f0; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 30px; }
          .signature-box { text-align: center; width: 200px; }
          .signature-title { font-weight: bold; margin-bottom: 50px; }
          .vital-signs { float: right; width: 150px; margin-left: 20px; }
          .vital-signs div { margin: 3px 0; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            Sở Y tế: <span class="field">${esc(formValues.healthDepartment || '........................')}</span><br/>
            Bệnh viện: <span class="field">${esc(formValues.hospitalName || '........................')}</span><br/>
            Khoa: <span class="field">${esc(formValues.departmentName || '............')}</span> Giường: <span class="field">${esc(formValues.bedNumber || '......')}</span>
          </div>
          <div class="header-center">
            <div class="title">${esc(recordType.label.toUpperCase())}</div>
          </div>
          <div class="header-right">
            MS: ${esc(recordType.code)}<br/>
            Số lưu trữ: <span class="field">${esc(formValues.archiveNumber || '............')}</span><br/>
            Mã YT: <span class="field">${esc(formValues.medicalCode || '...../...../...../.....')}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">I. HÀNH CHÍNH:</div>
          <div class="row">
            <div class="col-2">1. Họ và tên (In hoa): <span class="field">${esc(formValues.patientName || '')}</span></div>
            <div class="col">2. Sinh ngày: <span class="field">${esc(formValues.dateOfBirth || '')}</span></div>
            <div>Tuổi: <span class="field">${esc(formValues.age || '')}</span></div>
          </div>
          <div class="row">
            <div class="col">3. Giới: <span class="checkbox ${formValues.gender === 'Nam' ? 'checked' : ''}"></span>Nam <span class="checkbox ${formValues.gender === 'Nữ' ? 'checked' : ''}"></span>Nữ</div>
            <div class="col-2">4. Nghề nghiệp: <span class="field">${esc(formValues.occupation || '')}</span></div>
          </div>
          <div class="row">
            <div class="col">5. Dân tộc: <span class="field">${esc(formValues.ethnicity || '')}</span></div>
            <div class="col">6. Ngoại kiều: <span class="field">${esc(formValues.nationality || '')}</span></div>
          </div>
          <div class="row">
            <div>7. Địa chỉ: Số nhà <span class="field">${esc(formValues.houseNumber || '')}</span> Thôn, phố <span class="field">${esc(formValues.street || '')}</span> Xã, phường <span class="field">${esc(formValues.ward || '')}</span></div>
          </div>
          <div class="row">
            <div>Huyện (Q, Tx) <span class="field">${esc(formValues.district || '')}</span> Tỉnh, thành phố <span class="field">${esc(formValues.province || '')}</span></div>
          </div>
          <div class="row">
            <div class="col">8. Nơi làm việc: <span class="field">${esc(formValues.workplace || '')}</span></div>
            <div class="col">9. Đối tượng: <span class="checkbox ${formValues.patientType === 'bhyt' ? 'checked' : ''}"></span>BHYT <span class="checkbox ${formValues.patientType === 'fee' ? 'checked' : ''}"></span>Thu phí <span class="checkbox ${formValues.patientType === 'free' ? 'checked' : ''}"></span>Miễn <span class="checkbox ${formValues.patientType === 'other' ? 'checked' : ''}"></span>Khác</div>
          </div>
          <div class="row">
            <div>10. BHYT giá trị đến ngày <span class="field">${esc(formValues.insuranceValidDate || '')}</span> Số thẻ BHYT: <span class="field">${esc(formValues.insuranceNumber || '')}</span></div>
          </div>
          <div class="row">
            <div>11. Họ tên, địa chỉ người nhà khi cần báo tin: <span class="field">${esc(formValues.emergencyContact || '')}</span> Điện thoại: <span class="field">${esc(formValues.emergencyPhone || '')}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">II. QUẢN LÝ NGƯỜI BỆNH</div>
          <div class="row">
            <div class="col">12. Vào viện: <span class="field">${esc(formValues.admissionDate ? dayjs(formValues.admissionDate).format('HH') : '')}</span> giờ <span class="field">${esc(formValues.admissionDate ? dayjs(formValues.admissionDate).format('mm') : '')}</span> ph ngày <span class="field">${esc(formValues.admissionDate ? dayjs(formValues.admissionDate).format('DD/MM/YYYY') : '')}</span></div>
            <div class="col">14. Nơi giới thiệu: <span class="checkbox"></span>Cơ quan y tế <span class="checkbox"></span>Tự đến <span class="checkbox"></span>Khác</div>
          </div>
          <div class="row">
            <div class="col">13. Trực tiếp vào: <span class="checkbox"></span>Cấp cứu <span class="checkbox"></span>KKB <span class="checkbox"></span>Khoa điều trị</div>
            <div class="col">- Vào viện do bệnh này lần thứ: <span class="field">${esc(formValues.visitNumber || '')}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">III. CHẨN ĐOÁN</div>
          <div class="row">
            <div class="col">20. Nơi chuyển đến: <span class="field-long">${esc(formValues.referralFrom || '')}</span></div>
            <div class="col">23. Ra viện:</div>
          </div>
          <div class="row">
            <div class="col">21. KKB, Cấp cứu: <span class="field-long">${esc(formValues.emergencyDiagnosis || '')}</span></div>
            <div class="col">+ Bệnh chính: <span class="field-long">${esc(formValues.mainDiagnosis || formValues.diagnosis || '')}</span></div>
          </div>
          <div class="row">
            <div class="col">22. Khi vào khoa điều trị: <span class="field-long">${esc(formValues.admissionDiagnosis || '')}</span></div>
            <div class="col">+ Bệnh kèm theo: <span class="field-long">${esc(formValues.comorbidity || '')}</span></div>
          </div>
          ${isNgoaiKhoa ? `
          <div class="row">
            <div class="col">+ Chẩn đoán trước phẫu thuật: <span class="field-long">${esc(formValues.preOpDiagnosis || '')}</span></div>
          </div>
          <div class="row">
            <div class="col">+ Chẩn đoán sau phẫu thuật: <span class="field-long">${esc(formValues.postOpDiagnosis || '')}</span></div>
          </div>
          <div class="row">
            <div>23. Tổng số ngày điều trị sau phẫu thuật: <span class="field">${esc(formValues.postOpDays || '')}</span></div>
            <div>24. Tổng số lần phẫu thuật: <span class="field">${esc(formValues.surgeryCount || '')}</span></div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">IV. TÌNH TRẠNG RA VIỆN</div>
          <div class="row">
            <div class="col">
              ${isNgoaiKhoa ? '26' : '24'}. Kết quả điều trị:<br/>
              <span class="checkbox"></span>1. Khỏi <span class="checkbox"></span>4. Nặng hơn<br/>
              <span class="checkbox"></span>2. Đỡ, giảm <span class="checkbox"></span>5. Tử vong<br/>
              <span class="checkbox"></span>3. Không thay đổi
            </div>
            <div class="col">
              ${isNgoaiKhoa ? '28' : '26'}. Tình hình tử vong: <span class="field"></span> giờ <span class="field"></span> ph ngày <span class="field"></span><br/>
              <span class="checkbox"></span>1. Do bệnh <span class="checkbox"></span>2. Do tai biến điều trị <span class="checkbox"></span>3. Khác<br/>
              <span class="checkbox"></span>1. Trong 24 giờ vào viện <span class="checkbox"></span>2. Sau 24 giờ vào viện
            </div>
          </div>
        </div>

        <div style="page-break-before: always;"></div>

        <div class="section">
          <div class="section-title">A - BỆNH ÁN</div>
          <div><strong>I. Lý do vào viện:</strong> <span class="field-long">${esc(formValues.admissionReason || '')}</span> Vào ngày thứ <span class="field">${esc(formValues.illnessDay || '')}</span> của bệnh</div>

          <div><strong>II. Hỏi bệnh:</strong></div>
          <div>1. Quá trình bệnh lý: (khởi phát, diễn biến, chẩn đoán, điều trị của tuyến dưới v.v..)</div>
          <div class="field-long" style="min-height: 80px;">${esc(formValues.illnessHistory || '')}</div>

          <div>2. Tiền sử bệnh:</div>
          <div>+ Bản thân: (phát triển thể lực từ nhỏ đến lớn, những bệnh đã mắc, phương pháp ĐTr, tiêm phòng, ăn uống, sinh hoạt vv...)</div>
          <div class="field-long" style="min-height: 60px;">${esc(formValues.personalHistory || '')}</div>

          <div>Đặc điểm liên quan bệnh:</div>
          <table>
            <tr>
              <th>TT</th><th>Ký hiệu</th><th>Thời gian (tháng)</th>
              <th>TT</th><th>Ký hiệu</th><th>Thời gian (tháng)</th>
            </tr>
            <tr>
              <td>01</td><td>- Dị ứng (dị nguyên)</td><td>${esc(formValues.allergy || '')}</td>
              <td>04</td><td>- Thuốc lá</td><td>${esc(formValues.smoking || '')}</td>
            </tr>
            <tr>
              <td>02</td><td>- Ma tuý</td><td>${esc(formValues.drugs || '')}</td>
              <td>05</td><td>- Thuốc lào</td><td>${esc(formValues.tobacco || '')}</td>
            </tr>
            <tr>
              <td>03</td><td>- Rượu bia</td><td>${esc(formValues.alcohol || '')}</td>
              <td>06</td><td>- Khác</td><td>${esc(formValues.otherHabits || '')}</td>
            </tr>
          </table>

          <div>+ Gia đình: (Những người trong gia đình: bệnh đã mắc, đời sống, tinh thần, vật chất v.v...)</div>
          <div class="field-long" style="min-height: 40px;">${esc(formValues.familyHistory || '')}</div>
        </div>

        <div class="section">
          <div><strong>III - Khám bệnh:</strong></div>
          <div class="vital-signs">
            Mạch: <span class="field">${esc(formValues.pulse || '')}</span> lần/ph<br/>
            Nhiệt độ: <span class="field">${esc(formValues.temperature || '')}</span> °C<br/>
            Huyết áp: <span class="field">${esc(formValues.bloodPressure || '')}</span> mmHg<br/>
            Nhịp thở: <span class="field">${esc(formValues.respRate || '')}</span> lần/ph<br/>
            Cân nặng: <span class="field">${esc(formValues.weight || '')}</span> kg
          </div>
          <div>1. Toàn thân: (ý thức, da niêm mạc, hệ thống hạch, tuyến giáp, vị trí, kích thước, số lượng, di động v.v)</div>
          <div class="field-long" style="min-height: 60px;">${esc(formValues.generalExam || '')}</div>

          ${isNgoaiKhoa ? `
          <div>2. Bệnh ngoại khoa:</div>
          <div class="field-long" style="min-height: 100px;">${esc(formValues.surgicalExam || '')}</div>
          ` : ''}

          <div>${isNgoaiKhoa ? '3' : '2'}. Các cơ quan:</div>
          <div>+ Tuần hoàn: <span class="field-long">${esc(formValues.cardiovascular || '')}</span></div>
          <div>+ Hô hấp: <span class="field-long">${esc(formValues.respiratory || '')}</span></div>
          <div>+ Tiêu hoá: <span class="field-long">${esc(formValues.digestive || '')}</span></div>
          <div>+ Thận - Tiết niệu - Sinh dục: <span class="field-long">${esc(formValues.urogenital || '')}</span></div>
          <div>+ Thần Kinh: <span class="field-long">${esc(formValues.neurological || '')}</span></div>
          <div>+ Cơ - Xương - Khớp: <span class="field-long">${esc(formValues.musculoskeletal || '')}</span></div>
          <div>+ Tai - Mũi - Họng: <span class="field-long">${esc(formValues.ent || '')}</span></div>
          <div>+ Răng - Hàm - Mặt: <span class="field-long">${esc(formValues.dental || '')}</span></div>
          <div>+ Mắt: <span class="field-long">${esc(formValues.eye || '')}</span></div>
          <div>+ Nội tiết, dinh dưỡng và các bệnh lý khác: <span class="field-long">${esc(formValues.other || '')}</span></div>
        </div>

        <div class="section">
          <div>${isNgoaiKhoa ? '4' : '3'}. Các xét nghiệm cận lâm sàng cần làm:</div>
          <div class="field-long" style="min-height: 40px;">${esc(formValues.labTests || '')}</div>

          <div>${isNgoaiKhoa ? '5' : '4'}. Tóm tắt bệnh án:</div>
          <div class="field-long" style="min-height: 80px;">${esc(formValues.summary || '')}</div>
        </div>

        <div class="section">
          <div><strong>IV. Chẩn đoán khi vào khoa điều trị:</strong></div>
          <div>+ Bệnh chính: <span class="field-long">${esc(formValues.mainDiagnosis || formValues.diagnosis || '')}</span></div>
          <div>+ Bệnh kèm theo (nếu có): <span class="field-long">${esc(formValues.comorbidity || '')}</span></div>
          <div>+ Phân biệt: <span class="field-long">${esc(formValues.differentialDiagnosis || '')}</span></div>
        </div>

        <div class="section">
          <div><strong>V. Tiên lượng:</strong> <span class="field-long">${esc(formValues.prognosis || '')}</span></div>
          <div><strong>VI. Hướng điều trị:</strong> <span class="field-long">${esc(formValues.treatmentPlan || '')}</span></div>
        </div>

        <div class="signature-row">
          <div></div>
          <div class="signature-box">
            <div>Ngày <span class="field">${esc(dayjs().format('DD'))}</span> tháng <span class="field">${esc(dayjs().format('MM'))}</span> năm <span class="field">${esc(dayjs().format('YYYY'))}</span></div>
            <div class="signature-title">Bác sỹ làm bệnh án</div>
            <div>Họ và tên: <span class="field">${esc(formValues.doctorName || '')}</span></div>
          </div>
        </div>

        ${isNgoaiKhoa ? `
        <div style="page-break-before: always;"></div>
        <div class="section">
          <div class="section-title">B. TỔNG KẾT BỆNH ÁN</div>
          <div>3. Phương pháp điều trị:</div>
          <table>
            <tr>
              <th colspan="2">- Phẫu thuật</th>
              <th colspan="2">- Thủ thuật</th>
            </tr>
            <tr>
              <th>Giờ, ngày</th>
              <th>Phương pháp phẫu thuật/vô cảm</th>
              <th>Bác sỹ phẫu thuật</th>
              <th>Bác sỹ gây mê</th>
            </tr>
            <tr>
              <td>${esc(formValues.surgeryDateTime || '')}</td>
              <td>${esc(formValues.surgeryMethod || '')}</td>
              <td>${esc(formValues.surgeonName || '')}</td>
              <td>${esc(formValues.anesthesiologistName || '')}</td>
            </tr>
          </table>
        </div>
        ` : ''}
      </body>
      </html>
`;

/**
 * Phiếu theo dõi điều trị (MS 36/BV2) — print template.
 *
 * formValues: từ treatmentTrackingForm.getFieldsValue() (Antd Form, any-shape).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildTreatmentTrackingHtml = (formValues: Record<string, any>): string => `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu theo dõi điều trị - MS: 36/BV2</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 13px; line-height: 1.4; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { width: 40%; }
          .header-right { width: 30%; text-align: right; }
          .title { font-size: 16px; font-weight: bold; text-align: center; margin: 15px 0; text-transform: uppercase; }
          .subtitle { text-align: center; margin-bottom: 15px; }
          .row { margin: 5px 0; }
          .field { border-bottom: 1px dotted #000; min-width: 100px; display: inline-block; padding: 0 5px; }
          .field-long { border-bottom: 1px dotted #000; width: 100%; display: block; min-height: 20px; padding: 2px 5px; }
          .checkbox { display: inline-block; width: 14px; height: 14px; border: 1px solid #000; margin-right: 5px; vertical-align: middle; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          table th, table td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
          table th { background-color: #f5f5f5; text-align: center; }
          .note { font-style: italic; margin-top: 15px; font-size: 12px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <div>Cơ sở KB, CB: <span class="field">${esc(formValues.hospitalName || '')}</span></div>
            <div>Khoa: <span class="field">${esc(formValues.departmentName || '')}</span></div>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: bold;">PHIẾU THEO DÕI ĐIỀU TRỊ</div>
            <div>Tờ số: <span class="field">${esc(formValues.sheetNumber || '1')}</span></div>
          </div>
          <div style="text-align: right;">
            <div><strong>MS: 36/BV2</strong></div>
            <div>Số vào viện: <span class="field">${esc(formValues.admissionCode || '')}</span></div>
            <div>Mã người bệnh: <span class="field">${esc(formValues.patientCode || '')}</span></div>
          </div>
        </div>

        <div class="row">
          Họ và tên người bệnh: <span class="field" style="width: 300px;">${esc(formValues.patientName || '')}</span>
          Tuổi: <span class="field">${esc(formValues.age || '')}</span>
          <span class="checkbox ${formValues.gender === 'Nam' ? 'checked' : ''}"></span>Nam
          <span class="checkbox ${formValues.gender === 'Nữ' ? 'checked' : ''}"></span>Nữ
        </div>
        <div class="row">
          Khoa: <span class="field">${esc(formValues.departmentName || '')}</span>
          Phòng: <span class="field">${esc(formValues.roomName || '')}</span>
          Giường: <span class="field">${esc(formValues.bedName || '')}</span>
        </div>
        <div class="row">
          Chẩn đoán: <span class="field-long">${esc(formValues.diagnosis || '')}</span>
        </div>
        <div class="row">
          Chẩn đoán phân biệt: <span class="field-long">${esc(formValues.differentialDiagnosis || '')}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Thời gian<br/>(Ngày, giờ)</th>
              <th style="width: 55%;">Diễn biến bệnh<br/><i>(Viết diễn biến theo cấu trúc như SOAP)</i></th>
              <th style="width: 30%;">Chỉ định</th>
            </tr>
          </thead>
          <tbody>
            ${(formValues.trackingEntries || []).map((entry: { time: string; progress: string; orders: string }) => `
              <tr>
                <td>${esc(entry.time || '')}</td>
                <td style="white-space: pre-wrap;">${esc(entry.progress || '')}</td>
                <td style="white-space: pre-wrap;">${esc(entry.orders || '')}</td>
              </tr>
            `).join('') || `
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
              <tr><td style="height: 60px;"></td><td></td><td></td></tr>
            `}
          </tbody>
        </table>

        <div class="note">
          <strong>Ghi chú:</strong> Bác sỹ ký ngay sau mỗi lần ghi chép trong phần "Diễn biến bệnh" hoặc "Chỉ định".
        </div>

        <div style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; font-size: 11px;">
          <div><strong>Hướng dẫn cách ghi chép theo cấu trúc (SOAP):</strong></div>
          <div>- S (Hỏi bệnh): ghi lại các thông tin của người bệnh tự khai như triệu chứng, bệnh sử, bối cảnh xuất hiện bệnh, tiến triển...</div>
          <div>- O (Kết quả khám): ghi lại các thông tin do bác sỹ thăm khám như các dấu hiệu sinh tồn, các kết quả xét nghiệm...</div>
          <div>- A (Đánh giá): Đánh giá, phân tích kết quả và chẩn đoán trên cơ sở thông tin tự khai của người bệnh và kết quả khám bệnh.</div>
          <div>- P (Kế hoạch điều trị): tóm tắt tình hình, diễn biến bệnh, đưa ra nhận định, đưa ra hướng xử trí tiếp theo.</div>
          <div>- Chỉ định: cụ thể hóa kế hoạch điều trị như các vấn đề cần theo dõi, các loại thuốc sử dụng, các thủ thuật cần làm...</div>
        </div>
      </body>
      </html>
`;
