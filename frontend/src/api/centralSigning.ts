import client from './client';

// ============ Central Signing API (NangCap6 - BV Xanh Pon) ============

// --- Signing APIs ---
export const signHash = (data: { hashBase64: string; hashAlgorithm?: string; pin?: string }) =>
  client.post('/central-signing/sign-hash', data);

export const signRaw = (data: { dataBase64: string; hashAlgorithm?: string; pin?: string }) =>
  client.post('/central-signing/sign-raw', data);

export const signPdfInvisible = (data: { pdfBase64: string; reason: string; location: string; pin?: string }) =>
  client.post('/central-signing/sign-pdf-invisible', data);

export const signPdfVisible = (data: {
  pdfBase64: string; reason: string; location: string;
  page?: number; x?: number; y?: number; width?: number; height?: number;
  fontSize?: number; fontColor?: string; showDetails?: boolean;
  signatureImageBase64?: string; pin?: string;
}) => client.post('/central-signing/sign-pdf-visible', data);

export const signXml = (data: { xmlContent: string; signatureNodeXPath?: string; pin?: string }) =>
  client.post('/central-signing/sign-xml', data);

// --- Verification APIs ---
export const verifyRaw = (data: { dataBase64: string; signatureBase64: string }) =>
  client.post('/central-signing/verify-raw', data);

export const verifyHash = (data: { hashBase64: string; signatureBase64: string; hashAlgorithm?: string }) =>
  client.post('/central-signing/verify-hash', data);

export const verifyPdf = (data: { pdfBase64: string }) =>
  client.post('/central-signing/verify-pdf', data);

export const verifyPdfFull = (data: { pdfBase64: string }) =>
  client.post('/central-signing/verify-pdf-full', data);

// --- Signature Image APIs ---
export const getSignatureImage = () => client.get('/central-signing/signature-image');
export const getAnimatedSignatureImage = () => client.get('/central-signing/signature-image/animated');

// --- Admin APIs ---
export const getCertificates = (params?: { keyword?: string; isActive?: boolean }) =>
  client.get('/central-signing/admin/certificates', { params });

export const saveCertificate = (data: {
  id?: string; serialNumber: string; subjectName: string; issuerName: string;
  caProvider: string; validFrom: string; validTo: string; isActive?: boolean;
  ownerUserId?: string; cccd?: string; storageType?: string;
}) => client.post('/central-signing/admin/certificates', data);

export const deleteCertificate = (id: string) =>
  client.delete(`/central-signing/admin/certificates/${id}`);

export const getTransactions = (params?: {
  userId?: string; action?: string; dataType?: string; success?: boolean;
  dateFrom?: string; dateTo?: string; keyword?: string; pageIndex?: number; pageSize?: number;
}) => client.get('/central-signing/admin/transactions', { params });

export const getStatistics = () => client.get('/central-signing/admin/statistics');

export const getAppearanceConfig = () => client.get('/central-signing/admin/appearance');
export const saveAppearanceConfig = (data: {
  position: string; page: number; x: number; y: number; width: number; height: number;
  fontFamily: string; fontSize: number; fontColor: string;
  showSignerName: boolean; showDate: boolean; showCertSerial: boolean; showCaLogo: boolean;
  backgroundImageBase64?: string;
}) => client.post('/central-signing/admin/appearance', data);

// --- HSM APIs ---
export const getHsmInfo = () => client.get('/central-signing/hsm/info');
export const createCsr = (data: {
  commonName: string; organization: string; organizationUnit: string;
  country?: string; province?: string; keySize?: number;
}) => client.post('/central-signing/hsm/create-csr', data);

export const uploadSignatureImage = (data: { cccd: string; imageBase64: string }) =>
  client.post('/central-signing/admin/signature-image', data);

export const exportSerials = () => client.get('/central-signing/admin/export-serials');

// --- TOTP APIs ---
export const setupTotp = () => client.post('/central-signing/totp/setup');
export const verifyTotp = (otpCode: string) =>
  client.post('/central-signing/totp/verify', { otpCode });
export const disableTotp = () => client.post('/central-signing/totp/disable');
