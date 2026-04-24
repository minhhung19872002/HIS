/**
 * AI labeling inference service — client-side ONNX Runtime.
 *
 * Flow:
 *   1. fetchImageAndBuffer(url) → 1 lần fetch → ImageBitmap + ArrayBuffer
 *      (buffer dùng để SHA-256 audit, không fetch lần 2).
 *   2. preprocessToTensor(bitmap, W, H) → Float32Array NCHW (1, 3, H, W)
 *      pixel range [0, 1]. ONNX wrapper tự chuyển grayscale + scale
 *      sang range TorchXRayVision expects ([-1024, 1024]) + apply sigmoid.
 *   3. session.run() → probabilities (1, N) đã qua sigmoid (N = số labels).
 *   4. map sang labels tiếng Việt, sort theo score giảm dần.
 *
 * Model ONNX được load một lần vào module-level cache; các lần gọi sau dùng lại
 * cùng session (không tải lại file ~30MB).
 */

import * as ort from 'onnxruntime-web';
import type { AiLabel, AiModelConfig } from '../api/aiLabeling';

// Point ort's WASM loader to the JSDelivr CDN so we don't have to bundle/copy
// the ~12 MB of WASM artifacts during Vite build. Alternative: host WASM on
// same R2 bucket as the model.
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';

// Share a single InferenceSession across calls. Keyed by modelUrl so admin có
// thể chuyển model khác → load lại chỉ khi URL thay đổi.
const sessionCache: Record<string, Promise<ort.InferenceSession>> = {};

async function loadModel(modelUrl: string): Promise<ort.InferenceSession> {
  const existing = sessionCache[modelUrl];
  if (existing) return existing;

  sessionCache[modelUrl] = (async () => {
    // ort defaults: try WebGPU → fallback WASM. WebGPU faster but not all browsers support.
    try {
      return await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['webgpu', 'wasm'],
        graphOptimizationLevel: 'all',
      });
    } catch {
      return await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['wasm'],
      });
    }
  })();

  return sessionCache[modelUrl];
}

/**
 * Fetch image (PNG/JPEG preview exposed by Orthanc) once → trả về cả ArrayBuffer
 * (để hash cho audit) và ImageBitmap (để preprocess). Trước đây fetch 2 lần
 * wastes bandwidth + có thể ra content khác nếu backend stream từ Orthanc.
 */
async function fetchImageAndBuffer(
  previewUrl: string,
  authHeader?: string,
): Promise<{ bitmap: ImageBitmap; buffer: ArrayBuffer }> {
  const resp = await fetch(previewUrl, authHeader ? { headers: { Authorization: authHeader } } : undefined);
  if (!resp.ok) throw new Error(`Không tải được preview ảnh: HTTP ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  const contentType = resp.headers.get('content-type') ?? 'image/png';
  const blob = new Blob([buffer], { type: contentType });
  const bitmap = await createImageBitmap(blob);
  return { bitmap, buffer };
}

/**
 * Resize image to (width × height) and output Float32 NCHW tensor with
 * pixel range [0, 1]. ONNX wrapper (từ scripts/convert_xray_model.py) tự xử
 * lý chuyển grayscale + scale sang range TorchXRayVision expects ([-1024, 1024]).
 * KHÔNG dùng ImageNet mean/std ở đây — sai với wrapper → mọi prediction giống nhau.
 */
function preprocessToTensor(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Float32Array {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  // Maintain aspect ratio using center crop
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const scale = Math.max(width / srcW, height / srcH);
  const sw = srcW * scale;
  const sh = srcH * scale;
  const dx = (width - sw) / 2;
  const dy = (height - sh) / 2;
  ctx.drawImage(bitmap, dx, dy, sw, sh);
  const data = ctx.getImageData(0, 0, width, height).data;

  // NCHW: (1, 3, H, W) — pixel range [0, 1]
  const arr = new Float32Array(3 * width * height);
  let r = 0, g = width * height, b = 2 * width * height;
  for (let i = 0; i < data.length; i += 4) {
    arr[r++] = data[i] / 255;
    arr[g++] = data[i + 1] / 255;
    arr[b++] = data[i + 2] / 255;
  }
  return arr;
}

async function sha256(buf: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface InferenceResult {
  labels: AiLabel[];
  durationMs: number;
  inputImageHash: string;
  inputWidth: number;
  inputHeight: number;
}

export async function runInference(
  config: AiModelConfig,
  previewUrl: string,
  opts?: { authHeader?: string; onProgress?: (stage: string) => void },
): Promise<InferenceResult> {
  const start = performance.now();

  opts?.onProgress?.('Tải ảnh DICOM preview…');
  const { bitmap, buffer } = await fetchImageAndBuffer(previewUrl, opts?.authHeader);

  opts?.onProgress?.('Tải model AI (~30MB, lần đầu sẽ mất vài chục giây)…');
  const session = await loadModel(config.modelUrl);

  opts?.onProgress?.(`Tiền xử lý ảnh ${config.inputWidth}×${config.inputHeight}…`);
  const tensorData = preprocessToTensor(bitmap, config.inputWidth, config.inputHeight);
  const tensor = new ort.Tensor('float32', tensorData, [1, 3, config.inputHeight, config.inputWidth]);

  // Hash ảnh đầu vào từ buffer đã fetch — không fetch lại
  const hash = await sha256(buffer);

  opts?.onProgress?.('Chạy inference…');
  const inputName = session.inputNames[0] ?? 'input';
  const outputName = session.outputNames[0] ?? 'output';
  const feeds: Record<string, ort.Tensor> = { [inputName]: tensor };
  const outputMap = await session.run(feeds);
  const output = outputMap[outputName];
  if (!output) throw new Error(`Model output '${outputName}' không tìm thấy`);

  // Wrapper trong convert_xray_model.py đã apply torch.sigmoid() trước khi
  // export ONNX, nên model output ở đây đã là probabilities [0, 1]. KHÔNG
  // sigmoid lần nữa — double sigmoid sẽ ép mọi score về [0.5, 0.73] làm
  // BS không phân biệt được label nào dương tính thực sự.
  const scores = Array.from(output.data as Float32Array);
  const labels: AiLabel[] = config.labels.map((l, i) => ({
    label: l,
    labelVi: config.labelsVi[i] ?? l,
    score: scores[i] ?? 0,
  }));

  const durationMs = Math.round(performance.now() - start);
  return {
    labels: labels.sort((a, b) => b.score - a.score),
    durationMs,
    inputImageHash: hash,
    inputWidth: config.inputWidth,
    inputHeight: config.inputHeight,
  };
}
