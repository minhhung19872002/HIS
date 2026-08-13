// Shared print CSS styles used across all EMR print template files.
// Extracted to avoid ~250 lines of duplication across 5 template files.

/** Base print styles for A4 paper, Times New Roman, Vietnamese medical forms */
export const PRINT_STYLES_BASE = `
@media print {
  /* Bản cũ: \`body * { visibility:hidden }\` + \`.emr-print-container { position:absolute; width:210mm }\`.
     Đo bằng PDF A4 thật (Chromium) thấy 2 lỗi, đúng với MỌI biểu mẫu dùng bộ style này:
       1. TRÀN NGANG — @page margin 20mm mỗi bên ⇒ vùng in ngang chỉ 170mm, nhưng container khai
          210mm ⇒ nội dung chạy tới x≈680pt trên trang rộng 595pt ⇒ mất ~23-30mm mép phải
          (cột cuối của bảng, cột chữ ký bên phải).
       2. MẤT TRANG — phần tử position:absolute KHÔNG ngắt trang được trong Chromium ⇒ mọi thứ quá
          trang 1 bị bỏ im lặng. Bệnh án dài in ra cụt mục cuối + mất khối ký. Nguy hiểm hơn lỗi 1
          vì bản in trông vẫn "bình thường".
     Cách sửa: giữ vùng in trong LUỒNG BÌNH THƯỜNG (position:static) để trình duyệt ngắt trang;
     ẩn phần app không liên quan bằng display:none; và vô hiệu hoá các thuộc tính của tổ tiên
     (overflow/transform/height) vốn cắt hoặc chặn ngắt trang. KHÔNG đặt \`display\` lên chính vùng in
     hay con của nó — để CSS riêng của từng biểu mẫu (flex/table) giữ nguyên. */
  body *:not(:has(.emr-print-container)):not(.emr-print-container):not(.emr-print-container *) {
    display: none !important;
  }
  /* \`ab-module.css\` có block @media print riêng cho \`.print-paper\` kèm \`body * { visibility:hidden }\`
     áp toàn app ⇒ phải khẳng định lại visibility cho vùng in, nếu không bản in ra trắng giấy. */
  .emr-print-container, .emr-print-container *, body *:has(.emr-print-container) {
    visibility: visible !important;
  }
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  body *:has(.emr-print-container) {
    display: block !important;
    position: static !important;
    overflow: visible !important;
    transform: none !important;
    width: auto !important;
    height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: none !important;
    box-shadow: none !important;
  }
  .emr-print-container {
    position: static;
    width: 170mm;
    max-width: 170mm;
    margin: 0;
  }
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

/** Digital signature stamp styles (used by EMRPrintTemplates, EMRNursingPrintTemplates) */
export const PRINT_STYLES_DIGITAL_SIG = `
.emr-print-container .digital-sig-stamp { border: 2px solid #52c41a; border-radius: 4px; padding: 8px 12px; display: inline-block; text-align: left; font-size: 11px; line-height: 1.5; margin-top: 4px; position: relative; background: #fff; }
.emr-print-container .digital-sig-stamp .sig-stamp-header { font-weight: bold; font-style: italic; color: #333; margin-bottom: 4px; }
.emr-print-container .digital-sig-stamp .sig-stamp-field { padding-left: 8px; color: #cf1322; }
.emr-print-container .digital-sig-stamp .sig-stamp-check { position: absolute; top: -8px; right: -8px; width: 28px; height: 28px; color: #4caf50; }
.emr-print-container .digital-sig-stamp .sig-stamp-check svg { width: 28px; height: 28px; }
`;

/** Checkbox and dotted-line styles (used by SpecialtyEMRForms1, SpecialtyEMRForms2) */
export const PRINT_STYLES_CHECKBOX = `
.emr-print-container .checkbox-row { display: flex; gap: 24px; margin: 4px 0; flex-wrap: wrap; }
.emr-print-container .checkbox-item { display: flex; align-items: center; gap: 4px; }
.emr-print-container .checkbox-box { width: 14px; height: 14px; border: 1px solid #000; display: inline-block; text-align: center; line-height: 14px; font-size: 11px; }
.emr-print-container .dotted-line { border-bottom: 1px dotted #999; min-height: 22px; margin: 2px 0; }
.emr-print-container .dotted-lines-block { margin: 4px 0; }
.emr-print-container .dotted-lines-block .dotted-line { margin: 6px 0; }
`;
