import { test, expect, request } from '@playwright/test';
import { getAuthToken, getFirstActiveExamRoomId, login, registerPatientViaAPI, waitForLoading } from '../helpers/test-utils';

const API_BASE_URL = 'http://localhost:5106/api';

type ServiceDto = {
  id: string;
  code: string;
  name: string;
};

async function findSearchableService(): Promise<ServiceDto & { keyword: string }> {
  const token = await getAuthToken();
  const context = await request.newContext({
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  try {
    const keywords = ['kh', 'xn', 'si', 'dv', 'te'];

    for (const keyword of keywords) {
      const response = await context.get(`${API_BASE_URL}/examination/services/search`, {
        params: { keyword, limit: 10 },
      });

      if (!response.ok()) {
        continue;
      }

      const json = await response.json();
      const items = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      const service = items.find((item: ServiceDto | undefined) => item?.id && item?.code && item?.name);

      if (service) {
        return { ...service, keyword };
      }
    }
  } finally {
    await context.dispose();
  }

  throw new Error('Could not find a searchable OPD service for regression test');
}

test.describe('OPD service selection regression', () => {
  let registeredPatientName = '';

  test.beforeAll(async () => {
    const roomId = await getFirstActiveExamRoomId();
    registeredPatientName = `OPD Service Regression ${Date.now()}`;
    await registerPatientViaAPI({
      fullName: registeredPatientName,
      gender: 1,
      dateOfBirth: '1989-04-16',
      phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      roomId,
    });
  });

test('service autocomplete shows readable label and allows adding one service into multiple order groups', async ({ page }) => {
  const service = await findSearchableService();

  await page.setViewportSize({ width: 1800, height: 1200 });
  await login(page);
    await page.goto('/opd', { waitUntil: 'domcontentloaded' });
    await waitForLoading(page);
    await page.waitForTimeout(1000);

    const targetPatientRow = page.locator('.ant-table-row').filter({ hasText: registeredPatientName }).last();
    await expect(targetPatientRow).toBeVisible({ timeout: 15000 });
    await targetPatientRow.click();
    await page.waitForTimeout(1000);

  const treatmentOrdersTabButton = page.locator('[id$="-tab-treatment-orders"]').first();
  await expect(treatmentOrdersTabButton).toBeVisible({ timeout: 10000 });
  await treatmentOrdersTabButton.click();
  await page.waitForTimeout(500);
  await expect(page.locator('.ant-tabs-tab.ant-tabs-tab-active:has([id$="-tab-treatment-orders"])').first()).toBeVisible();

  const activePane = page.locator('.ant-tabs-tabpane-active');
  const serviceInput = activePane.locator('input[placeholder*="T"]').first();
    await expect(serviceInput).toBeVisible({ timeout: 10000 });

    await serviceInput.fill(service.keyword);
    const firstOption = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    await expect(firstOption).toBeVisible({ timeout: 10000 });

    const optionText = (await firstOption.textContent())?.trim() || '';
    await firstOption.click();

    await expect(serviceInput).toHaveValue(`${service.code} - ${service.name}`);
    await expect(serviceInput).not.toHaveValue(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);

  const labButton = activePane.getByRole('button', { name: /XN/ });
  const createOrderResponse1 = page.waitForResponse((response) =>
    response.url().includes('/api/examination/service-orders') &&
    response.request().method() === 'POST' &&
    response.status() === 200,
  );
  await labButton.click();
  await createOrderResponse1;

  const ordersTable = activePane.locator('.ant-table');
  await expect(ordersTable).toContainText(service.name);
  await expect(ordersTable).not.toContainText(service.id);
  expect(optionText).toContain(service.name);

  await serviceInput.fill(service.keyword);
  await firstOption.click();

  const serviceButton = activePane.getByRole('button', { name: /DV/ });
  const createOrderResponse2 = page.waitForResponse((response) =>
    response.url().includes('/api/examination/service-orders') &&
    response.request().method() === 'POST' &&
    response.status() === 200,
  );
  await serviceButton.click();
  await createOrderResponse2;

  await expect(ordersTable.getByText(service.code, { exact: false })).toHaveCount(2);
  await expect(ordersTable).toContainText(/xét nghiệm|xet nghiem/i);
  await expect(ordersTable).toContainText(/dịch vụ|dich vu/i);
});
});
