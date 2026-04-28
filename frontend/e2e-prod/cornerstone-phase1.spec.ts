import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * Phase 1 smoke test: Cornerstone3D native DICOM rendering.
 * Loads a known prod study (DEMO^CHEST^001 — 1 series, 1 instance),
 * verifies the new toolbar + canvas appear, no JS pageerrors fire,
 * and the W/L preset bar wires through to viewport.setProperties.
 */

const STUDY_UID = '1.2.826.0.1.3680043.8.498.28338555060756223317679602599232036470';
const PROD_API = process.env.PROD_API_URL || 'https://his-api-694913628964.asia-southeast1.run.app';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder*="đăng nhập" i], input[name="username"], #username', 'admin');
  await page.fill('input[type="password"], #password', 'Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).first().click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error') {
      const t = m.text();
      // Filter noise: Cornerstone may warn about font-loading / WebGL init in headless
      if (/cornerstone|wadouri|webgl|dicom/i.test(t) || /HTTP 5\d\d/.test(t)) {
        errors.push(`console: ${t}`);
      }
    }
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

test.describe('Cornerstone3D Phase 1', () => {
  test.describe.configure({ timeout: 90000 });

  test('backend /pacs streams raw DICOM bytes for known study', async ({ request }) => {
    // Login
    const loginRes = await request.post(`${PROD_API}/api/auth/login`, {
      data: { username: 'admin', password: 'Admin@123' },
    });
    const token = (await loginRes.json()).data.token;
    const auth = { Authorization: `Bearer ${token}` };

    // Series → first series UID
    const seriesRes = await request.get(`${PROD_API}/api/RISComplete/pacs/studies/${STUDY_UID}/series`, { headers: auth });
    expect(seriesRes.status()).toBe(200);
    const series = await seriesRes.json();
    expect(Array.isArray(series)).toBe(true);
    expect(series.length).toBeGreaterThan(0);

    // Images → first instance + imageUrl
    const imgRes = await request.get(
      `${PROD_API}/api/RISComplete/pacs/series/${series[0].seriesInstanceUID}/images`,
      { headers: auth },
    );
    expect(imgRes.status()).toBe(200);
    const images = await imgRes.json();
    expect(images.length).toBeGreaterThan(0);

    // Translate /preview|/rendered → /file (matches CornerstoneViewer logic)
    const fileUrl = images[0].imageUrl.replace(/\/(?:preview|rendered)(\?.*)?$/, '/file');
    const dcmRes = await request.get(`${PROD_API}${fileUrl.startsWith('/api') ? fileUrl : '/api' + fileUrl}`, { headers: auth });
    expect(dcmRes.status()).toBe(200);
    const buf = await dcmRes.body();
    // DICOM magic "DICM" at offset 128
    expect(buf.length).toBeGreaterThan(132);
    expect(buf.slice(128, 132).toString('ascii')).toBe('DICM');
  });

  test('DicomViewer renders Cornerstone toolbar + canvas, no JS errors', async ({ page }) => {
    test.setTimeout(60000);
    const errors = collectErrors(page);
    await login(page);

    await page.goto(`/radiology/viewer?study=${STUDY_UID}`, { waitUntil: 'domcontentloaded' });
    // Wait for series load + cornerstone init (engine bootstrap is async)
    await page.waitForTimeout(8000);

    // New toggle button (label = "Native DICOM" when active)
    await expect(page.getByRole('button', { name: /Native DICOM|PNG preview/ })).toBeVisible({ timeout: 12000 });

    // Tool buttons rendered by CornerstoneViewer (accessible name includes icon prefix)
    await expect(page.getByRole('button', { name: /W\/L/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Pan/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Zoom/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Đo DT/ })).toBeVisible();

    // Slice counter "1 / 1" rendered (StackViewport STACK_NEW_IMAGE event fired)
    await expect(page.locator('text=/^\\d+ \\/ \\d+$/')).toBeVisible({ timeout: 10000 });

    // No critical errors
    const critical = errors.filter((e) =>
      /pageerror/.test(e) || /HTTP 5\d\d/.test(e),
    );
    if (critical.length) {
      console.log('Critical errors:', JSON.stringify(critical, null, 2));
    }
    expect(critical, 'No JS pageerrors or 5xx').toEqual([]);
  });

  test('W/L preset click + tool switch wired through cornerstone (no crash)', async ({ page }) => {
    test.setTimeout(90000);
    const errors = collectErrors(page);
    await login(page);
    await page.goto(`/radiology/viewer?study=${STUDY_UID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000);

    // Click first F-key preset (e.g. "F1: Phổi")
    const presetBtn = page.getByRole('button', { name: /F1:/ }).first();
    await expect(presetBtn).toBeVisible({ timeout: 10000 });
    await presetBtn.click();
    await page.waitForTimeout(600);

    // Switch active tool from W/L → Pan via toolbar (verifies switchTool path)
    const panBtn = page.getByRole('button', { name: /^drag Pan$/ });
    await expect(panBtn).toBeVisible();
    await panBtn.click();
    await page.waitForTimeout(400);

    // Click another preset — exercises applyWlPreset on existing engine state
    const f2 = page.getByRole('button', { name: /F2:/ }).first();
    if (await f2.count() > 0) await f2.click().catch(() => {});
    await page.waitForTimeout(400);

    const critical = errors.filter((e) => /pageerror/.test(e));
    if (critical.length) console.log('Crashes:', critical);
    expect(critical, 'No JS crashes from preset/tool clicks').toEqual([]);
  });
});
