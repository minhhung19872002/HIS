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

// SDK do nhà cung cấp expose các hàm/đối tượng toàn cục với tên không xác định trước
// (xem VITE_VGCA_SIGN_FN + candidates). Type 1 lần ở đây, không rải nhiều chỗ.
// TODO type chặt khi có @types/<sdk> chính thức.
type GlobalLookup = Window & Record<string, unknown>;

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
type SdkSignFunction = (...args: unknown[]) => unknown;
function resolveSignFn(): SdkSignFunction | null {
  const w = window as unknown as GlobalLookup;
  const candidates = [SIGN_FN, 'SignServiceJS', 'signServiceJS', 'CallSignServiceJS', 'vgca_sign', 'SignFile', 'gca_sign'].filter(Boolean);
  for (const name of candidates) {
    const fn = w[name];
    if (typeof fn === 'function') return fn as SdkSignFunction;
    // Một số bản expose object có method .sign
    if (fn && typeof fn === 'object' && typeof (fn as { sign?: unknown }).sign === 'function') {
      const obj = fn as { sign: SdkSignFunction };
      return obj.sign.bind(obj);
    }
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
    // SDK trả về shape không nhất quán giữa các bản — narrow runtime trước khi dùng.
    const onResult = (res: unknown) => {
      try {
        if (res == null) { reject(new Error('SDK VGCA trả kết quả rỗng')); return; }
        // Một số bản trả string base64 trực tiếp, số khác trả object.
        if (typeof res === 'string') { resolve({ signedBase64: res }); return; }
        const r = res as Record<string, unknown>;
        const ok = r.Status === 0 || r.status === 0 || r.Success === true || r.success === true || r.code === 0;
        const signed = (r.Data || r.data || r.SignedData || r.signedData || r.FileData || r.result) as string | undefined;
        if (!ok && !signed) {
          const msg = (r.Message || r.message) as string | undefined;
          reject(new Error(msg || 'Ký thất bại từ SDK VGCA'));
          return;
        }
        resolve({
          signedBase64: signed as string,
          certSubject: (r.CertSubject || r.certSubject || r.Subject) as string | undefined,
          certSerial: (r.CertSerial || r.certSerial || r.Serial) as string | undefined,
          caProvider: (r.CaProvider || r.caProvider || r.Issuer) as string | undefined,
        });
      } catch (e) { reject(e as Error); }
    };
    const onError = (err: unknown) => {
      if (typeof err === 'string') { reject(new Error(err)); return; }
      const message = (err && typeof err === 'object' && 'message' in err)
        ? String((err as { message?: unknown }).message ?? 'Lỗi ký VGCA')
        : 'Lỗi ký VGCA';
      reject(new Error(message));
    };
    try {
      // SignServiceJS thường dùng callback (success, error). Nếu bản anh trả Promise thì nhánh .then xử lý.
      const maybe = fn(request, onResult, onError);
      if (maybe && typeof maybe === 'object' && typeof (maybe as { then?: unknown }).then === 'function') {
        (maybe as Promise<unknown>).then(onResult).catch(onError);
      }
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
