/**
 * Phase 1 — multi-modality AI config smoke test.
 *
 * Runs against the LOCAL backend (npm run dev frontend → localhost:5106 API)
 * because the prod Cloud Run image hasn't been redeployed with the Phase 1
 * controller yet. The dev-only `appsettings.Development.json` block routes
 * CT/US at the bundled CXR ONNX so all three modalities report
 * `available: true` and the FE can exercise the routing path end-to-end.
 *
 * Production deployment plan: ship Phase 1 → `available: false` for CT/US
 * until `scripts/convert_ct_model.py` / `scripts/convert_us_model.py` are
 * run and the resulting ONNX is copied into `wwwroot/ai-models/`.
 */
import { test, expect, request as pwRequest } from '@playwright/test';

const LOCAL_API = 'http://localhost:5106/api';

async function getLocalToken(): Promise<string> {
  const ctx = await pwRequest.newContext();
  const r = await ctx.post(`${LOCAL_API}/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const j = await r.json() as { data?: { token?: string } };
  await ctx.dispose();
  if (!j.data?.token) throw new Error('login failed');
  return j.data.token;
}

test.describe('AI Phase 1 — multi-modality config', () => {
  let token: string;

  test.beforeAll(async () => {
    token = await getLocalToken();
  });

  test('GET /modalities lists CR, CT, US', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/modalities`);
    expect(r.status()).toBe(200);
    const body = await r.json() as Array<{
      modality: string;
      aliases: string[];
      modelName: string;
      available: boolean;
    }>;
    const modalities = body.map((m) => m.modality);
    expect(modalities).toContain('CR');
    expect(modalities).toContain('CT');
    expect(modalities).toContain('US');
    // CR should declare DX as an alias.
    const cr = body.find((m) => m.modality === 'CR')!;
    expect(cr.aliases).toContain('DX');
    await ctx.dispose();
  });

  test('GET /config?modality=CT returns CT-specific labels', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/config?modality=CT`);
    expect(r.status()).toBe(200);
    const body = await r.json() as {
      modality: string;
      modelName: string;
      labels: string[];
      labelsVi: string[];
      available: boolean;
      modelUrl: string;
    };
    expect(body.modality).toBe('CT');
    // Dev override uses CXR labels; prod with real CT model will report a
    // CT-specific label set (Nodule, GroundGlassOpacity, …).
    expect(body.labels.length).toBeGreaterThan(0);
    expect(body.labelsVi.length).toBe(body.labels.length);
    // Available because dev override points at the bundled CXR ONNX.
    expect(body.available).toBe(true);
    // Stream URL should include the modality query so different modalities
    // hit the right ONNX file.
    expect(body.modelUrl).toContain('modality=CT');
    await ctx.dispose();
  });

  test('GET /config?modality=DX falls back to CR config (alias)', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/config?modality=DX`);
    expect(r.status()).toBe(200);
    const body = await r.json() as { modality: string };
    // Alias resolution: backend echoes the primary modality (CR), not DX.
    expect(body.modality).toBe('CR');
    await ctx.dispose();
  });

  test('GET /config?modality=MR returns 404 + clear payload', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/config?modality=MR`);
    expect(r.status()).toBe(404);
    const body = await r.json() as { modality: string; available: boolean };
    expect(body.modality).toBe('MR');
    expect(body.available).toBe(false);
    await ctx.dispose();
  });

  test('GET /model?modality=CR streams a real ONNX file', async () => {
    const ctx = await pwRequest.newContext();  // no auth needed — model is AllowAnonymous
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/model?modality=CR`);
    expect(r.status()).toBe(200);
    // ONNX models start with the magic byte sequence 0x08 (or the ProtoBuf
    // header). Either way, a ~90MB ResNet50 should report a content-length
    // well into the megabytes.
    const len = parseInt(r.headers()['content-length'] || '0', 10);
    expect(len).toBeGreaterThan(10_000_000);  // >10 MB
    await ctx.dispose();
  });

  test('GET /model?modality=MR returns 404 with helpful message', async () => {
    const ctx = await pwRequest.newContext();
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/model?modality=MR`);
    expect(r.status()).toBe(404);
    const body = await r.json() as { message: string };
    expect(body.message).toMatch(/MR.*không hỗ trợ AI/i);
    await ctx.dispose();
  });
});
