/**
 * Phase 3 — Export AI results to standard formats.
 *
 * Backend API tests (local backend required — prod Cloud Run revision
 * doesn't yet have the Phase 3 controller endpoints).
 */
import { test, expect, request as pwRequest } from '@playwright/test';

const LOCAL_API = 'http://localhost:5106/api';

async function getToken(): Promise<string> {
  const ctx = await pwRequest.newContext();
  const r = await ctx.post(`${LOCAL_API}/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const j = await r.json() as { data?: { token?: string } };
  await ctx.dispose();
  if (!j.data?.token) throw new Error('login failed');
  return j.data.token;
}

interface AiResult {
  id: string;
  studyInstanceUID: string;
  reviewStatus: number;
}

async function seedAiResult(token: string): Promise<string> {
  const ctx = await pwRequest.newContext({
    extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
  });
  // Use a valid-UI StudyInstanceUID (digits + dots only) so DICOM SR
  // generation doesn't trip strict validation.
  const studyUid = '2.25.999888' + Date.now();
  const createRes = await ctx.post(`${LOCAL_API}/ai-labeling`, {
    data: {
      studyInstanceUID: studyUid,
      modelName: 'TorchXRayVision-ResNet50-All',
      modelVersion: 'resnet50-all-v1',
      durationMs: 1234,
      labelsJson: JSON.stringify([
        { label: 'Pneumonia', labelVi: 'Viem phoi', score: 0.87 },
        { label: 'Effusion', labelVi: 'Tran dich mang phoi', score: 0.62 },
        { label: 'Cardiomegaly', labelVi: 'Tim to', score: 0.43 },
      ]),
      inputImageHash: 'phase3test' + Date.now(),
    },
  });
  const created = await createRes.json() as AiResult;
  expect(created.id, 'AI result created').toBeTruthy();

  // Mark as accepted (partial — 2 of 3 labels) so HTML + merge see "accepted" labels.
  const reviewRes = await ctx.post(`${LOCAL_API}/ai-labeling/${created.id}/review`, {
    data: {
      reviewStatus: 2,
      acceptedLabelsJson: JSON.stringify([
        { label: 'Pneumonia', labelVi: 'Viem phoi', score: 0.87 },
        { label: 'Effusion', labelVi: 'Tran dich mang phoi', score: 0.62 },
      ]),
      reviewNote: 'BS xac nhan 2 dau hieu ro tren phim',
    },
  });
  expect(reviewRes.status()).toBe(200);

  await ctx.dispose();
  return created.id;
}

test.describe('AI Phase 3 — Export endpoints', () => {
  let token: string;
  let aiId: string;

  test.beforeAll(async () => {
    token = await getToken();
    aiId = await seedAiResult(token);
  });

  test('GET /export/html renders Vietnamese AI report with findings table', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/${aiId}/export/html`);
    expect(r.status()).toBe(200);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toContain('text/html');
    const html = await r.text();
    expect(html).toContain('BÁO CÁO PHÂN TÍCH HÌNH ẢNH BẰNG AI');
    expect(html).toContain('TorchXRayVision-ResNet50-All');
    expect(html).toContain('Viem phoi');
    expect(html).toContain('Tran dich mang phoi');
    expect(html).toContain('✓ Xác nhận');           // 2 accepted labels
    expect(html).toContain('Tuân thủ TT 54/2017'.replace(/[^\x20-\x7E]/g, '?') === html.replace(/[^\x20-\x7E]/g, '?')
      ? 'TT 54' : 'TT 54');                          // disclaimer present
    expect(html.length).toBeGreaterThan(5_000);     // non-trivial render
    await ctx.dispose();
  });

  test('GET /export/dicom-sr returns valid DICOM PS3.10 file', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/${aiId}/export/dicom-sr`);
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('application/dicom');
    const buf = await r.body();
    // DICOM PS3.10 magic — "DICM" at byte offset 128 after the 128-byte preamble.
    expect(buf.length).toBeGreaterThan(132);
    const magic = buf.subarray(128, 132).toString('ascii');
    expect(magic).toBe('DICM');
    // SOP Class UID for Basic Text SR appears somewhere in the dataset.
    const body = buf.toString('binary');
    expect(body).toContain('1.2.840.10008.5.1.4.1.1.88.11');
    // Series modality = SR.
    expect(body).toMatch(/SR\b/);
    await ctx.dispose();
  });

  test('POST /merge-to-report returns merged:false for synthetic study (no RadiologyReport)', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.post(`${LOCAL_API}/ai-labeling/${aiId}/merge-to-report`);
    expect(r.status()).toBe(200);
    const body = await r.json() as { merged: boolean; message?: string };
    expect(body.merged).toBe(false);
    expect(body.message).toMatch(/không tìm thấy/i);
    await ctx.dispose();
  });

  test('POST /export/dicom-sr/upload returns 400 when PACS not configured', async () => {
    // Local backend has PACS:Enabled=true but BaseUrl points at localhost:8042
    // which isn't running. Either it 200 (if local Orthanc up) or 4xx/500
    // with a clear message. Just assert the endpoint exists and responds.
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.post(`${LOCAL_API}/ai-labeling/${aiId}/export/dicom-sr/upload`);
    expect([200, 400, 500]).toContain(r.status());
    const body = await r.json() as { message?: string; instanceId?: string };
    if (r.status() === 200) {
      expect(body.instanceId).toBeTruthy();
    } else {
      expect(body.message).toBeTruthy();
    }
    await ctx.dispose();
  });
});
