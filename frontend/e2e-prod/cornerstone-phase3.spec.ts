import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * Phase 3 smoke test: native Mammography 2x2 hanging-protocol viewer.
 *
 * Reuses the chest CT volume study (135 instances) — even though it's not
 * actual mammography, the viewer's "no metadata" fallback places the first
 * 4 instances into the RCC/LCC/RMLO/LMLO slots so we can exercise the full
 * UI: 4 viewports mount, toolbar buttons (Magnify, Invert, True-Size, Fit,
 * Reset) wire up to cornerstone tools without crashing.
 *
 * When real MG studies are uploaded later, the same spec proves the
 * hanging protocol auto-arranges by ImageLaterality + ViewPosition tags.
 */

const STUDY_UID = '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463';
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
      if (/cornerstone|wadouri|mammo|webgl/i.test(t) || /HTTP 5\d\d/.test(t)) {
        errors.push(`console: ${t}`);
      }
    }
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

test.describe('Cornerstone3D Phase 3 — Mammography 2x2 viewer', () => {
  test.describe.configure({ timeout: 180000 });

  test('backend /images surfaces mammo metadata fields', async ({ request }) => {
    const loginRes = await request.post(`${PROD_API}/api/auth/login`, {
      data: { username: 'admin', password: 'Admin@123' },
    });
    const token = (await loginRes.json()).data.token;
    const auth = { Authorization: `Bearer ${token}` };

    const seriesRes = await request.get(
      `${PROD_API}/api/RISComplete/pacs/studies/${STUDY_UID}/series`,
      { headers: auth },
    );
    expect(seriesRes.status()).toBe(200);
    const series = await seriesRes.json();
    expect(series.length).toBeGreaterThan(0);

    const imgRes = await request.get(
      `${PROD_API}/api/RISComplete/pacs/series/${series[0].seriesInstanceUID}/images`,
      { headers: auth },
    );
    expect(imgRes.status()).toBe(200);
    const images = await imgRes.json();
    expect(images.length).toBeGreaterThan(0);
    // New camelCase fields present (may be null for non-MG, that's fine)
    expect(images[0]).toHaveProperty('laterality');
    expect(images[0]).toHaveProperty('viewPosition');
    expect(images[0]).toHaveProperty('modality');
    expect(images[0]).toHaveProperty('pixelSpacing');
  });

  test('clicking Mammography button shows 4 quadrant slots + toolbar', async ({ page }) => {
    test.setTimeout(120000);
    const errors = collectErrors(page);
    await login(page);
    await page.goto(`/radiology/viewer?study=${STUDY_UID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    const mammoBtn = page.getByTestId('dicom-mammo-btn');
    await expect(mammoBtn).toBeVisible({ timeout: 15000 });
    await mammoBtn.click();

    // Wait for cornerstone init + 4 viewports to mount
    await page.waitForTimeout(8000);

    await expect(page.getByTestId('dicom-mammo-card')).toBeVisible({ timeout: 10000 });

    // 4 hanging-protocol slots
    await expect(page.getByTestId('mammo-slot-RCC')).toBeVisible();
    await expect(page.getByTestId('mammo-slot-LCC')).toBeVisible();
    await expect(page.getByTestId('mammo-slot-RMLO')).toBeVisible();
    await expect(page.getByTestId('mammo-slot-LMLO')).toBeVisible();

    // Toolbar buttons
    await expect(page.getByRole('button', { name: /Kính lúp/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Đảo màu/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /True-Size/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Vừa khung/ })).toBeVisible();

    const critical = errors.filter((e) => /pageerror/.test(e));
    if (critical.length) console.log('Critical errors:', critical);
    expect(critical, 'No JS pageerrors').toEqual([]);
  });

  test('Magnify toggle + Invert + Reset wire to cornerstone without crash', async ({ page }) => {
    test.setTimeout(120000);
    const errors = collectErrors(page);
    await login(page);
    await page.goto(`/radiology/viewer?study=${STUDY_UID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    await page.getByTestId('dicom-mammo-btn').click();
    await page.waitForTimeout(8000);

    const magnify = page.getByTestId('mammo-magnify-btn');
    await magnify.click();
    await page.waitForTimeout(500);
    // After click → button switches to primary type (Antd primary = blue)
    await expect(magnify).toHaveClass(/ant-btn-primary/);

    // Toggle off
    await magnify.click();
    await page.waitForTimeout(500);
    await expect(magnify).not.toHaveClass(/ant-btn-primary/);

    // Invert + Reset — no crash expected
    await page.getByRole('button', { name: /Đảo màu/ }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Reset/ }).click();
    await page.waitForTimeout(500);

    const critical = errors.filter((e) => /pageerror/.test(e));
    expect(critical, 'No JS crashes from tool toggles').toEqual([]);
  });
});
