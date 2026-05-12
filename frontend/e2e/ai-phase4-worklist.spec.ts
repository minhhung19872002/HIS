/**
 * Phase 4 — Worklist + Vendor adapter smoke tests.
 *
 * Backend API tests (local backend required). The actual cron worker is
 * disabled by default (AiLabeling:Worklist:Enabled=false) — these tests
 * just verify the *endpoints* the worker would feed into.
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

test.describe('AI Phase 4 — Worklist + Providers', () => {
  let token: string;
  test.beforeAll(async () => { token = await getToken(); });

  test('GET /queue returns array of pending AI items', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/queue?limit=20`);
    expect(r.status()).toBe(200);
    const body = await r.json() as Array<{
      id: string;
      studyInstanceUID: string;
      queuedAt: string;
      autoQueued: boolean;
    }>;
    expect(Array.isArray(body)).toBe(true);
    // Each entry must have the required shape.
    for (const item of body) {
      expect(item.id).toBeTruthy();
      expect(item.studyInstanceUID).toBeTruthy();
      expect(item.queuedAt).toBeTruthy();
      expect(typeof item.autoQueued).toBe('boolean');
    }
    await ctx.dispose();
  });

  test('GET /providers returns provider list (empty when no vendor configured)', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    const r = await ctx.get(`${LOCAL_API}/ai-labeling/providers`);
    expect(r.status()).toBe(200);
    const body = await r.json() as Array<{
      id: string;
      name: string;
      supportedModalities: string[];
    }>;
    expect(Array.isArray(body)).toBe(true);
    // appsettings has an "example" provider stub with empty Endpoint → registry
    // skips it. Real deployments will populate Endpoint + ApiKey and the array
    // becomes non-empty. Either case is valid behavior.
    for (const p of body) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(Array.isArray(p.supportedModalities)).toBe(true);
    }
    await ctx.dispose();
  });

  test('POST /run-via-provider returns 400 for unknown provider', async () => {
    const ctx = await pwRequest.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const r = await ctx.post(`${LOCAL_API}/ai-labeling/run-via-provider`, {
      data: {
        providerId: 'nonexistent-vendor-xyz',
        studyInstanceUID: '2.25.test',
        modality: 'CR',
        imageUrl: 'https://example.com/img.png',
      },
    });
    expect(r.status()).toBe(400);
    const body = await r.json() as { message: string };
    expect(body.message).toMatch(/Provider.*không có/i);
    await ctx.dispose();
  });
});
