// Shared print CSS styles used across all EMR print template files.
// Extracted to avoid ~250 lines of duplication across 5 template files.

/** Base print styles for A4 paper, Times New Roman, Vietnamese medical forms */
export const PRINT_STYLES_BASE = `
@media print {
  body * { visibility: hidden; }
  .emr-print-container, .emr-print-container * { visibility: visible; }
  .emr-print-container { position: absolute; left: 0; top: 0; width: 210mm; }
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

/** Digital signature stamp styles (used by EMRPrintTemplates, EMRNursingPrintTemplates, SpecialtyMedicalRecordPrintTemplates) */
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
