import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * Phase 2 smoke test: Cornerstone3D native MPR + 3D volume.
 * Uses the ACRIN-NSCLC-FDG-PET-042 chest CT (135 slices) uploaded to
 * the Oracle VM Orthanc. Clicks the new "MPR / 3D Native" button,
 * verifies the 4-quadrant viewport renders + VR preset selector works.
 */

const VOLUME_STUDY_UID = '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463';
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
      if (/cornerstone|wadouri|volume|webgl|MPR/i.test(t) || /HTTP 5\d\d/.test(t)) {
        errors.push(`console: ${t}`);
      }
    }
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

test.describe('Cornerstone3D Phase 2 — MPR + 3D Volume', () => {
  test.describe.configure({ timeout: 180000 });

  test('volume study has 135 CT slices accessible via backend', async ({ request }) => {
    const loginRes = await request.post(`${PROD_API}/api/auth/login`, {
      data: { username: 'admin', password: 'Admin@123' },
    });
    const token = (await loginRes.json()).data.token;
    const auth = { Authorization: `Bearer ${token}` };

    const seriesRes = await request.get(
      `${PROD_API}/api/RISComplete/pacs/studies/${VOLUME_STUDY_UID}/series`,
      { headers: auth },
    );
    expect(seriesRes.status()).toBe(200);
    const series = await seriesRes.json();
    expect(series.length).toBe(1);
    expect(series[0].modality).toBe('CT');

    const imgRes = await request.get(
      `${PROD_API}/api/RISComplete/pacs/series/${series[0].seriesInstanceUID}/images`,
      { headers: auth },
    );
    expect(imgRes.status()).toBe(200);
    const images = await imgRes.json();
    expect(images.length).toBe(135);
  });

  test('clicking MPR Native button shows 4-quadrant viewport + VR preset selector', async ({ page }) => {
    test.setTimeout(120000);
    const errors = collectErrors(page);
    await login(page);
    await page.goto(`/radiology/viewer?study=${VOLUME_STUDY_UID}`, { waitUntil: 'domcontentloaded' });

    // Wait for series load
    await page.waitForTimeout(8000);

    // Click "MPR / 3D Native" button
    const mprBtn = page.getByRole('button', { name: /MPR.*3D Native|MPR \/ 3D Native/ }).first();
    await expect(mprBtn).toBeVisible({ timeout: 15000 });
    await mprBtn.click();

    // Wait for cornerstone volume engine init + first slice batch
    await page.waitForTimeout(15000);

    // Card title visible
    await expect(page.getByText(/MPR \/ 3D Native Viewer \(Cornerstone3D\)/)).toBeVisible({ timeout: 10000 });

    // 4 quadrant labels
    await expect(page.getByText('AXIAL', { exact: true })).toBeVisible();
    await expect(page.getByText('SAGITTAL', { exact: true })).toBeVisible();
    await expect(page.getByText('CORONAL', { exact: true })).toBeVisible();
    await expect(page.getByText('VOLUME 3D', { exact: true })).toBeVisible();

    // VR preset selector (Antd Select)
    await expect(page.locator('.ant-select').filter({ hasText: 'CT-Bone' }).first()).toBeVisible();

    // Slice count text "135 slice · MPR axial..."
    await expect(page.getByText(/135 slice/)).toBeVisible();

    const critical = errors.filter((e) => /pageerror/.test(e));
    if (critical.length) console.log('Critical errors:', critical);
    expect(critical, 'No JS pageerrors').toEqual([]);
  });

  test('VR preset switch updates 3D volume render (no crash)', async ({ page }) => {
    test.setTimeout(120000);
    const errors = collectErrors(page);
    await login(page);
    await page.goto(`/radiology/viewer?study=${VOLUME_STUDY_UID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);

    await page.getByRole('button', { name: /MPR.*3D Native/ }).first().click();
    await page.waitForTimeout(15000);

    // Open VR preset Select and switch to CT-Lung. Antd v6 popup options
    // get class .ant-select-item-option-content
    const select = page.locator('.ant-select').filter({ hasText: 'CT-Bone' }).first();
    await select.click();
    await page.waitForTimeout(800);
    await page.locator('.ant-select-item-option-content').filter({ hasText: /^CT-Lung$/ }).first().click();
    await page.waitForTimeout(2500);

    // After switch, the select wrapper text contains the new preset name
    await expect(page.locator('.ant-select').filter({ hasText: 'CT-Lung' }).first()).toBeVisible({ timeout: 5000 });

    const critical = errors.filter((e) => /pageerror/.test(e));
    expect(critical, 'No JS crashes from VR preset switch').toEqual([]);
  });
});
