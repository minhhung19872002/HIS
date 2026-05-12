/**
 * Phase 2 — AI bbox + heatmap overlay smoke test.
 *
 * Setup: frontend `npm run dev` on localhost:3001 with VITE_API_URL pointed
 * at the prod Cloud Run backend (which has the ACRIN chest CT study + the
 * AI model ONNX file). The new Phase 2 code lives in this checkout — prod
 * Vercel build is one step behind.
 */
import { test, expect } from '@playwright/test';

const PROD_API = 'https://his-api-694913628964.asia-southeast1.run.app/api';
// 135-slice chest CT seeded on Orthanc in earlier session.
const STUDY_UID = '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463';

async function getToken(): Promise<string> {
  const r = await fetch(`${PROD_API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123' }),
  });
  const j = await r.json() as { data?: { token?: string } };
  if (!j.data?.token) throw new Error('login failed');
  return j.data.token;
}

test.describe('AI Overlay Phase 2', () => {
  test('inference → heatmap pass → accept → overlay canvas renders', async ({ page }) => {
    test.setTimeout(180_000);

    const token = await getToken();
    await page.addInitScript((t) => {
      localStorage.setItem('token', t);
      localStorage.setItem('user', JSON.stringify({
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        fullName: 'Administrator',
        roles: ['Admin'],
      }));
    }, token);

    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`);
    });

    // Trace ai-labeling network calls so we can see save/review failures.
    page.on('response', (r) => {
      const u = r.url();
      if (u.includes('/ai-labeling') && !u.includes('/model')) {
        console.log(`[net] ${r.status()} ${r.request().method()} ${u}`);
      }
    });

    await page.goto(`/radiology/viewer?study=${STUDY_UID}`, { waitUntil: 'domcontentloaded' });

    // Wait for series list — backend `/RISComplete/pacs/studies/{uid}/series`.
    await expect(page.getByText(/LUNG DELAYS|CT|135/i).first()).toBeVisible({ timeout: 20_000 });

    // Trigger AI modal via the stable test-id button. Wait until enabled
    // (becomes enabled once `selectedImageUrl` is auto-set from images[0]).
    const aiBtn = page.getByTestId('dicom-ai-btn');
    await expect(aiBtn).toBeEnabled({ timeout: 20_000 });
    await aiBtn.click();

    // Antd renders the modal root always; the visible content is inside
    // `.ant-modal-content`. Wait on the title text instead of the wrapper.
    const modalTitle = page.getByText(/AI Labeling.*Phân tích tự động/i);
    await expect(modalTitle).toBeVisible({ timeout: 10_000 });

    // Click "Chạy phân tích AI"
    const runBtn = page.getByTestId('ai-labeling-run-btn');
    await runBtn.click();

    // Inference + heatmap pass. Worst case WASM CPU + ResNet50-512 model:
    // ~30-60s baseline + ~60s heatmap. Wait up to 180s. Result section is
    // anchored by the "Kết quả phân loại" h5 heading.
    const resultHeading = page.getByRole('heading', { name: /Kết quả phân loại/i });
    await expect(resultHeading).toBeVisible({ timeout: 180_000 });

    // The result table lives in the same dialog. Use the dialog role as
    // the scope so we don't accidentally match the study-info table on the
    // background page.
    const dialog = page.getByRole('dialog');
    const rows = dialog.locator('table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    console.log(`[Phase 2] inference returned ${rowCount} labels`);

    // Accept all
    const acceptAll = page.getByRole('button', { name: /Chấp nhận toàn bộ/i });
    await acceptAll.click();

    // The overlay toolbar button is the canonical "state lift worked" signal
    // — it only renders when DicomViewer's `aiOverlayLabels` is non-empty.
    const overlayToggle = page.getByTestId('ai-overlay-toggle');
    await expect(overlayToggle).toBeVisible({ timeout: 15_000 });

    // The overlay canvas should be present
    const overlay = page.getByTestId('ai-overlay-canvas');
    await expect(overlay).toBeVisible({ timeout: 5_000 });

    // Wait until the Antd modal close animation completes (otherwise screenshot
    // includes the fading modal). 800ms is generous for Antd's 300ms fade.
    await page.waitForTimeout(800);
    // Scroll viewer into view so the screenshot captures the heatmap area.
    await overlay.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'test-results/phase2-overlay-screenshot.png', fullPage: true });

    // Bounding-box screenshot anchored on the overlay canvas itself.
    try {
      const box = await overlay.boundingBox();
      if (box) {
        await page.screenshot({
          path: 'test-results/phase2-overlay-viewer.png',
          clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 },
        });
      }
    } catch { /* not fatal — main screenshot is sufficient */ }

    const canvasPixels = await overlay.evaluate((el: HTMLCanvasElement) => {
      const ctx = el.getContext('2d');
      if (!ctx) return { painted: 0, total: 0 };
      const w = el.width, h = el.height;
      const data = ctx.getImageData(0, 0, w, h).data;
      let painted = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) painted++;
      return { painted, total: w * h };
    });
    console.log(`[Phase 2] overlay canvas: ${canvasPixels.painted}/${canvasPixels.total} pixels painted`);
    expect(canvasPixels.painted).toBeGreaterThan(0);

    // Toggle bounding box off then on — should still render without throwing
    const bboxBtn = page.getByRole('button', { name: /^Bounding box$/ });
    await bboxBtn.click();
    await page.waitForTimeout(300);
    await bboxBtn.click();

    // Toggle heatmap
    const heatBtn = page.getByRole('button', { name: /^Heatmap$/ });
    await heatBtn.click();
    await page.waitForTimeout(300);
    await heatBtn.click();

    // Hide overlay → canvas should disappear
    await overlayToggle.click();
    await expect(overlay).toBeHidden({ timeout: 3_000 });

    // Show again
    await overlayToggle.click();
    await expect(overlay).toBeVisible({ timeout: 3_000 });

    // Xóa overlay → both canvas and toggle should disappear
    const clearBtn = page.getByRole('button', { name: /Xóa overlay/i });
    await clearBtn.click();
    await expect(overlay).toBeHidden({ timeout: 3_000 });
    await expect(overlayToggle).toBeHidden({ timeout: 3_000 });

    // Fail the test if any page errors fired (filter out known-noisy ones).
    //   - CORS: expected when dev frontend (localhost:3001) hits the prod
    //     Cloud Run API which only whitelists https://his-psi.vercel.app.
    //     Audit endpoints are best-effort so CORS failure is harmless here.
    //   - Antd v6 deprecations (`destroyOnClose`, Spin `tip`, message static):
    //     repo-wide pre-existing cleanup task, not Phase 2.
    const real = consoleErrors.filter(
      (e) =>
        !/Cornerstone|WebGL|wasm|SignalR|ResizeObserver loop|Failed to load resource/i.test(e) &&
        !/blocked by CORS policy/i.test(e) &&
        !/antd:|destroyOnClose|Spin.*tip|Static function can not consume context/i.test(e),
    );
    expect(real, real.join('\n')).toHaveLength(0);
  });
});
