/**
 * Vietnamese CCCD (Citizen ID) validation — 12-digit format + province code.
 * Ported verbatim từ v1 `pages/reception/cccd.ts` (issue #409 — v2 không import từ pages/).
 */

/** 63 province codes (first 3 digits of CCCD). */
export const CCCD_PROVINCES: Record<string, string> = {
  '001': 'Hà Nội', '002': 'Hà Giang', '004': 'Cao Bằng', '006': 'Bắc Kạn',
  '008': 'Tuyên Quang', '010': 'Lào Cai', '011': 'Điện Biên', '012': 'Lai Châu',
  '014': 'Sơn La', '015': 'Yên Bái', '017': 'Hoà Bình', '019': 'Thái Nguyên',
  '020': 'Lạng Sơn', '022': 'Quảng Ninh', '024': 'Bắc Giang', '025': 'Phú Thọ',
  '026': 'Vĩnh Phúc', '027': 'Bắc Ninh', '030': 'Hải Dương', '031': 'Hải Phòng',
  '033': 'Hưng Yên', '034': 'Thái Bình', '035': 'Hà Nam', '036': 'Nam Định',
  '037': 'Ninh Bình', '038': 'Thanh Hoá', '040': 'Nghệ An', '042': 'Hà Tĩnh',
  '044': 'Quảng Bình', '045': 'Quảng Trị', '046': 'Thừa Thiên Huế', '048': 'Đà Nẵng',
  '049': 'Quảng Nam', '051': 'Quảng Ngãi', '052': 'Bình Định', '054': 'Phú Yên',
  '056': 'Khánh Hoà', '058': 'Ninh Thuận', '060': 'Bình Thuận', '062': 'Kon Tum',
  '064': 'Gia Lai', '066': 'Đắk Lắk', '067': 'Đắk Nông', '068': 'Lâm Đồng',
  '070': 'Bình Phước', '072': 'Tây Ninh', '074': 'Bình Dương', '075': 'Đồng Nai',
  '077': 'Bà Rịa - Vũng Tàu', '079': 'TP. Hồ Chí Minh', '080': 'Long An',
  '082': 'Tiền Giang', '083': 'Bến Tre', '084': 'Trà Vinh', '086': 'Vĩnh Long',
  '087': 'Đồng Tháp', '089': 'An Giang', '091': 'Kiên Giang', '092': 'Cần Thơ',
  '093': 'Hậu Giang', '094': 'Sóc Trăng', '095': 'Bạc Liêu', '096': 'Cà Mau',
};

/**
 * Validate CCCD format + lookup province by 3-digit prefix.
 * Empty string returns `{ valid: true }` (optional field).
 */
export const validateCccd = (value: string): { valid: boolean; error?: string; province?: string } => {
  if (!value) return { valid: true };
  const cleaned = value.replace(/\s/g, '');
  if (!/^\d{12}$/.test(cleaned)) return { valid: false, error: 'CCCD phải có đúng 12 chữ số' };
  const provinceCode = cleaned.substring(0, 3);
  const province = CCCD_PROVINCES[provinceCode];
  if (!province) return { valid: false, error: `Mã tỉnh/thành '${provinceCode}' không hợp lệ` };
  return { valid: true, province };
};
