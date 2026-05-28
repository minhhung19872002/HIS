/**
 * VGCA Sign Service adapter — ký số bằng USB token CẮM TRÊN MÁY TRẠM của người dùng.
 *
 * Mô hình (Hướng A): token là phần cứng ở máy người ký → backend (cloud) KHÔNG chạm token.
 * Trang web nạp SDK `SignServiceJS` của vgca-sign-service (Ban Cơ yếu Chính phủ), SDK kết nối
 * dịch vụ ký chạy localhost trên máy người dùng, đọc token → bật PIN → ký (PAdES PDF / XAdES XML),
 * rồi trả file đã ký (base64) về web → web POST sang backend `/digital-signature/submit-signed` để lưu.
 *
 * ⚠️ ĐIỂM CẦN KHỚP VỚI BẢN SDK CỦA ANH (chỉ sửa Ở ĐÂY, không rải khắp nơi):
 *   1. URL file SDK: env `VITE_VGCA_SDK_URL` (mặc định `/vgca/SignServiceJS.js` — đặt file vào `frontend/public/vgca/`).
 *   2. Tên hàm ký toàn cục SDK expose: env `VITE_VGCA_SIGN_FN` (mặc định thử các tên phổ biến).
 *   3. Hình dạng request/response của hàm SDK: chỉnh trong `invokeSdkSign()` cho đúng tài liệu bản anh cài.
 * Em KHÔNG runtime-verify được protocol nếu thiếu agent + token — phần `invokeSdkSign` viết theo
 * API SignServiceJS phổ biến, anh đối chiếu tài liệu SDK rồi tinh chỉnh nếu lệch.
 */

const SDK_URL = (import.meta.env.VITE_VGCA_SDK_URL as string) || '/vgca/SignServiceJS.js';
const SIGN_FN = (import.meta.env.VITE_VGCA_SIGN_FN as string) || '';

export interface VgcaSignResult {
  signedBase64: string;
  certSubject?: string;
  certSerial?: string;
  caProvider?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWin = Window & Record<string, any>;

let sdkLoading: Promise<void> | null = null;

/** Nạp script SDK SignServiceJS 1 lần (idempotent). */
export function loadSignServiceSdk(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  // Đã có hàm ký toàn cục → coi như SDK đã sẵn sàng.
  if (resolveSignFn()) return Promise.resolve();
  if (sdkLoading) return sdkLoading;
  sdkLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-vgca-sdk="1"]`);
    if (existing) { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', () => reject(new Error('Lỗi nạp SDK VGCA'))); return; }
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.dataset.vgcaSdk = '1';
    s.onload = () => resolve();
    s.onerror = () => { sdkLoading = null; reject(new Error(`Không nạp được SDK VGCA tại ${SDK_URL}. Hãy đặt SignServiceJS.js vào frontend/public/vgca/ hoặc set VITE_VGCA_SDK_URL.`)); };
    document.head.appendChild(s);
  });
  return sdkLoading;
}

/** Tìm hàm ký toàn cục mà SDK expose (tên khác nhau giữa các bản vgca). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveSignFn(): ((...args: any[]) => any) | null {
  const w = window as AnyWin;
  const candidates = [SIGN_FN, 'SignServiceJS', 'signServiceJS', 'CallSignServiceJS', 'vgca_sign', 'SignFile', 'gca_sign'].filter(Boolean);
  for (const name of candidates) {
    const fn = w[name];
    if (typeof fn === 'function') return fn;
    // Một số bản expose object có method .sign
    if (fn && typeof fn.sign === 'function') return fn.sign.bind(fn);
  }
  return null;
}

/**
 * Gọi SDK ký 1 file. Trả base64 file đã ký.
 * ⚠️ Hình dạng request/callback dưới đây theo API SignServiceJS phổ biến — đối chiếu SDK bản anh để chỉnh.
 */
function invokeSdkSign(fileType: 'pdf' | 'xml', base64: string, fileName: string): Promise<VgcaSignResult> {
  return new Promise<VgcaSignResult>((resolve, reject) => {
    const fn = resolveSignFn();
    if (!fn) {
      reject(new Error('Chưa tìm thấy hàm ký của SDK VGCA SignServiceJS. Kiểm tra đã nạp đúng SDK + đặt VITE_VGCA_SIGN_FN.'));
      return;
    }
    // Request chuẩn hoá — chỉnh field cho khớp tài liệu SDK bản anh nếu cần.
    const request = {
      FileType: fileType,          // 'pdf' (PAdES) | 'xml' (XAdES)
      DataType: 'Base64',
      Data: base64,
      FileName: fileName,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onResult = (res: any) => {
      try {
        if (res == null) { reject(new Error('SDK VGCA trả kết quả rỗng')); return; }
        // Một số bản trả string base64 trực tiếp, số khác trả object.
        if (typeof res === 'string') { resolve({ signedBase64: res }); return; }
        const ok = res.Status === 0 || res.status === 0 || res.Success === true || res.success === true || res.code === 0;
        const signed = res.Data || res.data || res.SignedData || res.signedData || res.FileData || res.result;
        if (!ok && !signed) { reject(new Error(res.Message || res.message || 'Ký thất bại từ SDK VGCA')); return; }
        resolve({
          signedBase64: signed,
          certSubject: res.CertSubject || res.certSubject || res.Subject,
          certSerial: res.CertSerial || res.certSerial || res.Serial,
          caProvider: res.CaProvider || res.caProvider || res.Issuer,
        });
      } catch (e) { reject(e as Error); }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onError = (err: any) => reject(new Error(typeof err === 'string' ? err : (err?.message || 'Lỗi ký VGCA')));
    try {
      // SignServiceJS thường dùng callback (success, error). Nếu bản anh trả Promise thì nhánh .then xử lý.
      const maybe = fn(request, onResult, onError);
      if (maybe && typeof maybe.then === 'function') maybe.then(onResult).catch(onError);
    } catch (e) { reject(e as Error); }
  });
}

/** Ký PDF (PAdES) bằng USB token qua VGCA Sign Service. */
export async function signPdf(base64: string, fileName = 'document.pdf'): Promise<VgcaSignResult> {
  await loadSignServiceSdk();
  return invokeSdkSign('pdf', base64, fileName);
}

/** Ký XML (XAdES) bằng USB token qua VGCA Sign Service. */
export async function signXml(base64: string, fileName = 'document.xml'): Promise<VgcaSignResult> {
  await loadSignServiceSdk();
  return invokeSdkSign('xml', base64, fileName);
}
