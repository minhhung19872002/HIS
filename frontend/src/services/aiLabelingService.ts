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
  /** Cached preprocessed tensor so heatmap pass can reuse without re-fetching. */
  _cachedTensor?: Float32Array;
}

/**
 * Generate occlusion-based saliency heatmaps for the given label indices.
 *
 * Method: tile the input image with a GRID×GRID patch mask, run one batched
 * inference (batch_size = GRID*GRID), measure how much each label score drops
 * relative to the baseline. Larger drop = patch matters more → higher heat.
 *
 * Cost: 1 extra inference call with batch dim = GRID*GRID. For GRID=7 that's
 * 49 samples, ~2s on WASM CPU / <500ms on WebGPU.
 *
 * Why occlusion instead of Grad-CAM?
 *   - Works with the current single-output ONNX (sigmoid(logits)). Grad-CAM
 *     needs the model re-exported with 2 outputs (probs + last_conv_features).
 *   - Model-agnostic — works for any classifier without architectural assumptions.
 *   - Result quality is acceptable for "show roughly where the AI looked";
 *     not pixel-precise but enough to mark a lobe / quadrant.
 */
export async function computeOcclusionHeatmaps(
  config: AiModelConfig,
  baselineTensor: Float32Array,
  baselineScores: number[],
  labelIndices: number[],
  opts?: { grid?: number; onProgress?: (s: string) => void },
): Promise<Record<number, { width: number; height: number; data: number[] }>> {
  if (labelIndices.length === 0) return {};
  const grid = opts?.grid ?? 7;
  const W = config.inputWidth;
  const H = config.inputHeight;
  const patchW = Math.floor(W / grid);
  const patchH = Math.floor(H / grid);
  const batch = grid * grid;
  const session = await loadModel(config.modelUrl);

  opts?.onProgress?.(`Tính heatmap ${grid}×${grid}…`);

  // Build batched tensor: for sample i = (row r, col c), set pixels inside the
  // patch to 0.5 (neutral gray) — masks the region without introducing extreme
  // black/white pixels that would bias the model.
  const stride = 3 * W * H;
  const batched = new Float32Array(batch * stride);
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const sampleIdx = r * grid + c;
      const offset = sampleIdx * stride;
      batched.set(baselineTensor, offset);
      const x0 = c * patchW;
      const y0 = r * patchH;
      const x1 = c === grid - 1 ? W : x0 + patchW;
      const y1 = r === grid - 1 ? H : y0 + patchH;
      for (let chan = 0; chan < 3; chan++) {
        const channelBase = offset + chan * W * H;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            batched[channelBase + y * W + x] = 0.5;
          }
        }
      }
    }
  }

  const inputName = session.inputNames[0] ?? 'input';
  const outputName = session.outputNames[0] ?? 'output';
  const feeds: Record<string, ort.Tensor> = {
    [inputName]: new ort.Tensor('float32', batched, [batch, 3, H, W]),
  };
  const out = await session.run(feeds);
  const outData = out[outputName]?.data as Float32Array | undefined;
  if (!outData) throw new Error('Occlusion inference missing output');

  const numLabels = baselineScores.length;
  const heatmaps: Record<number, { width: number; height: number; data: number[] }> = {};
  for (const li of labelIndices) {
    const baseline = baselineScores[li] ?? 0;
    const data = new Array<number>(grid * grid);
    let max = 0;
    for (let s = 0; s < batch; s++) {
      const masked = outData[s * numLabels + li] ?? baseline;
      // Drop in confidence when this patch is hidden = importance of patch.
      const drop = Math.max(0, baseline - masked);
      data[s] = drop;
      if (drop > max) max = drop;
    }
    // Normalize to [0..1] for renderer. Guard against all-zero (label not influenced).
    if (max > 1e-6) {
      for (let i = 0; i < data.length; i++) data[i] = data[i] / max;
    }
    heatmaps[li] = { width: grid, height: grid, data };
  }
  return heatmaps;
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
    _cachedTensor: tensorData,
  };
}
