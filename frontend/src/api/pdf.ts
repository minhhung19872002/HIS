/**
 * PDF/HTML print API client
 * Opens backend-generated HTML forms in new browser tabs for printing
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5106/api';

/**
 * Get the auth token from localStorage
 */
function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Build the full URL with auth token as query parameter
 * (since we open in new tab, we can't use Authorization header)
 */
function buildPrintUrl(path: string): string {
  const token = getToken();
  const url = `${API_URL}/${path}`;
  // For authenticated endpoints opened in new tab, we pass token via query
  // The backend should accept both Authorization header and query token
  return token ? `${url}${url.includes('?') ? '&' : '?'}access_token=${token}` : url;
}

/**
 * Open an EMR form in a new tab for printing
 * @param examinationId - The examination ID
 * @param formType - Form type: summary, treatment, consultation, discharge, nursing,
 *                   preanesthetic, consent, progress, counseling, deathreview, finalsummary,
 *                   nutrition, surgeryrecord, surgeryapproval, surgerysummary, depttransfer, admission,
 *                   dd01-careplan, dd02-icucare, ... dd21-vap
 */
export function printEmrForm(examinationId: string, formType: string): void {
  const url = buildPrintUrl(`pdf/emr/${examinationId}?formType=${encodeURIComponent(formType)}`);
  window.open(url, '_blank');
}

/**
 * Open medical record summary (MS. 01/BV) in a new tab for printing
 * @param medicalRecordId - The medical record ID
 */
export function printMedicalRecord(medicalRecordId: string): void {
  const url = buildPrintUrl(`pdf/medical-record/${medicalRecordId}`);
  window.open(url, '_blank');
}

/**
 * Open treatment sheet (MS. 02/BV) in a new tab for printing
 * @param admissionId - The admission ID
 */
export function printTreatmentSheet(admissionId: string): void {
  const url = buildPrintUrl(`pdf/treatment-sheet/${admissionId}`);
  window.open(url, '_blank');
}

/**
 * Open discharge letter (MS. 04/BV) in a new tab for printing
 * @param admissionId - The admission ID
 */
export function printDischargeLetter(admissionId: string): void {
  const url = buildPrintUrl(`pdf/discharge/${admissionId}`);
  window.open(url, '_blank');
}

/**
 * Open prescription in a new tab for printing
 * @param prescriptionId - The prescription ID
 */
export function printPrescription(prescriptionId: string): void {
  const url = buildPrintUrl(`pdf/prescription/${prescriptionId}`);
  window.open(url, '_blank');
}

/**
 * Open lab result in a new tab for printing
 * @param requestId - The lab request ID
 */
export function printLabResult(requestId: string): void {
  const url = buildPrintUrl(`pdf/lab-result/${requestId}`);
  window.open(url, '_blank');
}
