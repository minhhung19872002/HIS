/**
 * Giọng đọc tiếng Việt cho màn hình gọi số.
 *
 * Hai nguồn, ưu tiên từ trên xuống:
 *
 * 1. **Máy chủ (Piper)** — `GET /api/tts/vi?text=...` trả file WAV. Ảnh Docker prod nhúng sẵn bộ
 *    đọc + giọng `vi_VN-vais1000-medium`, nên TV nào mở màn hình cũng nghe giống nhau, không phải
 *    cài giọng cho Windows và không tốn phí theo lượt.
 * 2. **Web Speech API của trình duyệt** — chỉ dùng khi máy chủ chưa có bộ đọc (máy dev, hoặc bản
 *    cũ chưa deploy). Cách này phụ thuộc máy trạm: máy không cài giọng Việt thì đọc ra giọng Anh.
 */
import { buildApiUrl } from '../../config/api.config';

/* ------------------------------------------------------------------ *
 * Giọng của trình duyệt (phương án dự phòng)
 * ------------------------------------------------------------------ */

/**
 * `utterance.lang = 'vi-VN'` chỉ là GỢI Ý. Không chỉ đích danh `utterance.voice` thì trình duyệt
 * vẫn đọc bằng giọng mặc định — trên máy Việt Nam thường là giọng tiếng Anh.
 *
 * Danh sách giọng nạp BẤT ĐỒNG BỘ: lần gọi `getVoices()` đầu tiên hầu như luôn trả mảng rỗng,
 * phải nghe thêm sự kiện `voiceschanged`.
 */
let viVoice: SpeechSynthesisVoice | null = null;
let voiceCount = 0;

function pickViVoice() {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  voiceCount = voices.length;
  const isVi = (v: SpeechSynthesisVoice) => {
    // `lang` không thống nhất giữa các hệ: 'vi-VN', 'vi_VN', đôi khi chỉ 'vi'. Có giọng khai lang
    // lạ nhưng tên thì ghi rõ ("Google Tiếng Việt", "Microsoft An - Vietnamese"), nên dò cả tên.
    const lang = (v.lang ?? '').toLowerCase().replace('_', '-');
    if (lang === 'vi-vn' || lang === 'vi' || lang.startsWith('vi-')) return true;
    const name = (v.name ?? '').toLowerCase();
    return name.includes('vietnam') || name.includes('tiếng việt') || name.includes('tieng viet');
  };
  viVoice = voices.find(isVi) ?? null;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickViVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickViVoice);
}

/** Máy trạm có giọng Việt hay không — chỉ còn ý nghĩa khi phải rơi về giọng trình duyệt. */
export function hasVietnameseVoice(): boolean {
  if (!viVoice) pickViVoice();
  return viVoice !== null;
}

/** Số giọng trình duyệt đang thấy — để nói cho người lắp TV biết vì sao không có tiếng Việt. */
export function browserVoiceCount(): number {
  return voiceCount;
}

function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) return resolve();
    if (!viVoice) pickViVoice(); // giọng có thể vừa nạp xong sau lần thử đầu
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    if (viVoice) utterance.voice = viVoice;
    utterance.rate = 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/* ------------------------------------------------------------------ *
 * Giọng của máy chủ
 * ------------------------------------------------------------------ */

/** Cùng giới hạn với `ViSpeechLimits.MaxTextLength` phía máy chủ — dài hơn thì máy chủ trả 400. */
const MAX_TEXT_LENGTH = 200;

/** Máy chủ trả 503 thì ngừng hỏi trong 5 phút, đủ để một lần deploy mới kịp lên. */
const SERVER_RETRY_MS = 5 * 60 * 1000;

let serverMutedUntil = 0;
let audioEl: HTMLAudioElement | null = null;

function getAudioElement(): HTMLAudioElement {
  audioEl ??= new Audio();
  return audioEl;
}

async function speakWithServer(text: string): Promise<boolean> {
  if (Date.now() < serverMutedUntil) return false;

  let url: string | null = null;
  try {
    const res = await fetch(`${buildApiUrl('tts/vi')}?text=${encodeURIComponent(text)}`);
    if (!res.ok) {
      // 503 = ảnh chưa kèm bộ đọc, 404 = bản cũ chưa có endpoint. Cả hai đều không tự khỏi ngay.
      if (res.status === 503 || res.status === 404) serverMutedUntil = Date.now() + SERVER_RETRY_MS;
      return false;
    }
    const blob = await res.blob();
    url = URL.createObjectURL(blob);

    const audio = getAudioElement();
    audio.src = url;
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
    });
    return true;
  } catch {
    // Mất mạng hoặc trình duyệt chặn phát — lần gọi sau thử lại, KHÔNG tắt hẳn nguồn máy chủ.
    return false;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

let serverProbe: Promise<boolean> | null = null;

/**
 * Hỏi một lần xem máy chủ này có bộ đọc không, để màn hình biết có phải nhắc người lắp TV đi cài
 * giọng cho Windows hay không. Kết quả nhớ lại cho cả phiên.
 */
export function probeServerVoice(): Promise<boolean> {
  serverProbe ??= fetch(`${buildApiUrl('tts/vi')}?text=${encodeURIComponent('xin chào')}`)
    .then((res) => {
      if (!res.ok && (res.status === 503 || res.status === 404)) {
        serverMutedUntil = Date.now() + SERVER_RETRY_MS;
      }
      return res.ok;
    })
    .catch(() => false);
  return serverProbe;
}

/* ------------------------------------------------------------------ *
 * Hàng đợi phát
 * ------------------------------------------------------------------ */

const pending: string[] = [];
let draining = false;

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (pending.length > 0) {
      const text = pending.shift()!;
      const spokenByServer = await speakWithServer(text);
      if (!spokenByServer) await speakWithBrowser(text);
    }
  } finally {
    draining = false;
  }
}

/**
 * Đọc một câu. Gọi liên tiếp thì các câu xếp hàng đọc lần lượt — hai số gọi cùng lúc mà đọc chồng
 * lên nhau thì người ngồi chờ không nghe ra số nào.
 */
export function announceVi(text: string) {
  const clean = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (!clean) return;
  pending.push(clean);
  void drain();
}

/**
 * Mở khoá âm thanh trong lần bấm đầu tiên của người dùng. Trình duyệt chặn tự phát tiếng khi trang
 * chưa được tương tác, mà màn hình gọi số thì treo trên TV cả ngày — không mở khoá lúc bấm nút
 * "Bật âm thanh" thì đến lúc gọi số mới phát hiện là loa câm.
 */
export function unlockAudio() {
  try {
    const audio = getAudioElement();
    audio.muted = true;
    audio.play()?.catch(() => { /* chưa có nguồn phát, chỉ cần chạm vào là đủ */ });
    audio.pause();
    audio.muted = false;
  } catch { /* không mở khoá được thì vẫn còn giọng trình duyệt */ }

  if (window.speechSynthesis) {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }
}

/* ------------------------------------------------------------------ *
 * Đọc mã vé
 * ------------------------------------------------------------------ */

const DIGIT_WORDS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** Tên chữ cái đọc theo kiểu Việt: A→"a", B→"bê"… Chữ nào không có trong bảng thì để nguyên. */
const LETTER_WORDS: Record<string, string> = {
  A: 'a', B: 'bê', C: 'xê', D: 'dê', E: 'e', F: 'ép', G: 'gờ', H: 'hát', I: 'i', J: 'gi',
  K: 'ca', L: 'lờ', M: 'mờ', N: 'nờ', O: 'o', P: 'pê', Q: 'quy', R: 'rờ', S: 'ét', T: 'tê',
  U: 'u', V: 'vê', W: 'vê kép', X: 'ích', Y: 'i dài', Z: 'dét',
};

/**
 * Tách mã vé thành chữ đọc rời: "B001" → "bê không không một".
 *
 * Để nguyên "B001" thì bộ đọc gộp thành một từ vô nghĩa; tách bằng dấu cách thì mỗi bộ đọc lại
 * đoán một kiểu (Piper đọc "B" theo tiếng Anh). Viết thẳng ra chữ tiếng Việt thì cả giọng máy chủ
 * lẫn giọng trình duyệt đều đọc đúng như nhau.
 */
export function speakableViCode(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((ch) => {
      if (ch >= '0' && ch <= '9') return DIGIT_WORDS[Number(ch)];
      return LETTER_WORDS[ch] ?? ch;
    })
    .filter((w) => w.trim().length > 0)
    .join(' ');
}
