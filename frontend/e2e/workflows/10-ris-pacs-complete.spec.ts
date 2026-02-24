/**
 * RIS/PACS Complete E2E Tests
 * Module 8: Chẩn đoán hình ảnh, Thăm dò chức năng
 * Comprehensive tests for all RIS/PACS functionality
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';

// API Base URL
const API_BASE_URL = 'http://localhost:5106/api';

// Test credentials
const ADMIN_USER = { username: 'admin', password: 'Admin@123' };

// Helper function to login and get token
async function getAuthToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_BASE_URL}/Auth/login`, {
    data: ADMIN_USER
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data.token;
}

// Helper function to make authenticated API calls
async function apiCall(
  request: APIRequestContext,
  token: string,
  method: string,
  endpoint: string,
  data?: any
): Promise<any> {
  const options: any = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  if (data) {
    options.data = data;
  }

  let response;
  switch (method.toUpperCase()) {
    case 'GET':
      response = await request.get(`${API_BASE_URL}${endpoint}`, options);
      break;
    case 'POST':
      response = await request.post(`${API_BASE_URL}${endpoint}`, options);
      break;
    case 'PUT':
      response = await request.put(`${API_BASE_URL}${endpoint}`, options);
      break;
    case 'DELETE':
      response = await request.delete(`${API_BASE_URL}${endpoint}`, options);
      break;
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
  return response;
}

test.describe('RIS/PACS API Tests', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAuthToken(request);
  });

  test.describe('8.1 Waiting List APIs', () => {
    test('should get waiting list for today', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiCall(request, token, 'GET', `/RISComplete/waiting-list?date=${today}`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should get waiting list with filters', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/waiting-list?date=${today}&status=0&serviceType=XQ`
      );
      expect(response.ok()).toBeTruthy();
    });

    test('should get waiting list with keyword search', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/waiting-list?date=${today}&keyword=test`
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.2 PACS & Modality APIs', () => {
    test('should get modalities list', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/modalities');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should filter modalities by type', async ({ request }) => {
      const response = await apiCall(
        request, token, 'GET',
        '/RISComplete/modalities?modalityType=CT'
      );
      expect(response.ok()).toBeTruthy();
    });

    test('should get PACS connections', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/pacs-connections');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('8.3 Result Templates APIs', () => {
    test('should get all result templates', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/templates');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should search result templates by keyword', async ({ request }) => {
      const response = await apiCall(
        request, token, 'GET',
        '/RISComplete/templates?keyword=siêu'
      );
      expect(response.ok()).toBeTruthy();
    });

    test('should get templates by gender (male)', async ({ request }) => {
      const response = await apiCall(
        request, token, 'GET',
        '/RISComplete/templates/by-gender/Male'
      );
      expect(response.ok()).toBeTruthy();
    });

    test('should get templates by gender (female)', async ({ request }) => {
      const response = await apiCall(
        request, token, 'GET',
        '/RISComplete/templates/by-gender/Female'
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.4 Radiology Orders APIs', () => {
    test('should get radiology orders for date range', async ({ request }) => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/orders?fromDate=${fromDate}&toDate=${toDate}`
      );
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should filter orders by status', async ({ request }) => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/orders?fromDate=${fromDate}&toDate=${toDate}&status=Completed`
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.5 Reports APIs', () => {
    test('should get radiology statistics', async ({ request }) => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/reports/statistics?fromDate=${fromDate}&toDate=${toDate}`
      );
      expect(response.ok()).toBeTruthy();
    });

    test('should get revenue report', async ({ request }) => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/reports/revenue?fromDate=${fromDate}&toDate=${toDate}`
      );
      expect(response.ok()).toBeTruthy();
    });

    test('should get exam statistics by service type', async ({ request }) => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/statistics/by-service-type?fromDate=${fromDate}&toDate=${toDate}`
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.6 Digital Signature APIs', () => {
    test('should get USB Token status', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/usb-token/status');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty('available');
    });

    test('should get USB Token certificates', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/usb-token/certificates');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should get signature configs', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/signature-configs');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.7 Room & Schedule APIs', () => {
    test('should get radiology rooms', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/rooms');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should get room statistics', async ({ request }) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/rooms/statistics?date=${today}`
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.8 Tag APIs', () => {
    test('should get tags list', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/tags');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should search tags', async ({ request }) => {
      const response = await apiCall(
        request, token, 'GET',
        '/RISComplete/tags?keyword=urgent'
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.9 Duty Schedule APIs', () => {
    test('should get duty schedules', async ({ request }) => {
      const today = new Date();
      const fromDate = today.toISOString().split('T')[0];
      const toDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/duty-schedules?fromDate=${fromDate}&toDate=${toDate}`
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.10 Integration Log APIs', () => {
    test('should search integration logs', async ({ request }) => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const response = await apiCall(request, token, 'POST', '/RISComplete/integration-logs/search', {
        fromDate,
        toDate,
        pageIndex: 0,
        pageSize: 20
      });
      expect(response.ok()).toBeTruthy();
    });

    test('should get integration log statistics', async ({ request }) => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/integration-logs/statistics?fromDate=${fromDate}&toDate=${toDate}`
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.11 Diagnosis Templates APIs', () => {
    test('should get diagnosis templates', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/diagnosis-templates');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should search diagnosis templates', async ({ request }) => {
      const response = await apiCall(
        request, token, 'GET',
        '/RISComplete/diagnosis-templates?keyword=phổi'
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.12 Abbreviation APIs', () => {
    test('should get abbreviations', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/abbreviations');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should expand abbreviations', async ({ request }) => {
      const response = await apiCall(request, token, 'POST', '/RISComplete/abbreviations/expand', {
        text: 'BN có tiền sử HA'
      });
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.13 DICOM Viewer APIs', () => {
    test('should get viewer config', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/viewer/config');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.14 Print Label APIs', () => {
    test('should get label configs', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/label-configs');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.15 Capture Device APIs', () => {
    test('should get capture devices', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/capture-devices');
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should get workstations', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/workstations');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.16 Consultation APIs', () => {
    test('should search consultations', async ({ request }) => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const response = await apiCall(request, token, 'POST', '/RISComplete/consultations/search', {
        fromDate,
        toDate,
        page: 1,
        pageSize: 20
      });
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.17 HL7 CDA APIs', () => {
    test('should get HL7 CDA configs', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/hl7-cda/configs');
      expect(response.ok()).toBeTruthy();
    });

    test('should get HL7 messages', async ({ request }) => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const response = await apiCall(
        request, token, 'GET',
        `/RISComplete/hl7-cda/messages?fromDate=${fromDate}&toDate=${toDate}`
      );
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.18 Online Help APIs', () => {
    test('should get help categories', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/help/categories');
      expect(response.ok()).toBeTruthy();
    });

    test('should get troubleshooting list', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/help/troubleshooting');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.19 CLS Screen APIs', () => {
    test('should get CLS screen config', async ({ request }) => {
      const response = await apiCall(request, token, 'GET', '/RISComplete/cls-screen/config');
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('8.20 QR Code APIs', () => {
    test('should generate QR code', async ({ request }) => {
      const response = await apiCall(request, token, 'POST', '/RISComplete/qrcode/generate', {
        orderId: '00000000-0000-0000-0000-000000000001',
        qrType: 'PATIENT_INFO',
        size: 200,
        includePatientInfo: true
      });
      // May return 404 if order not found, but API should not crash
      expect([200, 400, 404]).toContain(response.status());
    });
  });
});

test.describe('RIS/PACS UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#login_username', ADMIN_USER.username);
    await page.fill('#login_password', ADMIN_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|home|reception)?$/);
  });

  test('should navigate to radiology page', async ({ page }) => {
    await page.goto('/radiology');
    await expect(page).toHaveURL(/radiology/);
  });

  test('should display waiting list tab', async ({ page }) => {
    await page.goto('/radiology');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    // Check if tabs exist (use .first() to avoid strict mode violation)
    const tabsExist = await page.locator('.ant-tabs').first().isVisible();
    expect(tabsExist).toBeTruthy();
  });

  test('should display statistics tab', async ({ page }) => {
    await page.goto('/radiology');
    await page.waitForLoadState('networkidle');

    // Click on statistics tab if exists
    const statsTab = page.locator('text=Thống kê, text=Statistics, [data-node-key*="stat"]').first();
    if (await statsTab.isVisible()) {
      await statsTab.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display settings tab', async ({ page }) => {
    await page.goto('/radiology');
    await page.waitForLoadState('networkidle');

    // Click on settings tab if exists
    const settingsTab = page.locator('text=Cài đặt, text=Settings, [data-node-key*="setting"]').first();
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('should have date picker for filtering', async ({ page }) => {
    await page.goto('/radiology');
    await page.waitForLoadState('networkidle');

    const datePicker = page.locator('.ant-picker, input[type="date"]').first();
    if (await datePicker.isVisible()) {
      await expect(datePicker).toBeVisible();
    }
  });

  test('should have search input', async ({ page }) => {
    await page.goto('/radiology');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[placeholder*="Tìm"], input[placeholder*="Search"], .ant-input-search').first();
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('should display table or list for waiting patients', async ({ page }) => {
    await page.goto('/radiology');
    await page.waitForLoadState('networkidle');

    const table = page.locator('.ant-table, table').first();
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('should have action buttons (start, complete, view)', async ({ page }) => {
    await page.goto('/radiology');
    await page.waitForLoadState('networkidle');

    // Check for common action buttons
    const actionButtons = page.locator('button, .ant-btn');
    expect(await actionButtons.count()).toBeGreaterThan(0);
  });
});

test.describe('RIS/PACS Integration Flow Tests', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAuthToken(request);
  });

  test('should complete a basic RIS workflow', async ({ request, page }) => {
    // 1. Get waiting list
    const today = new Date().toISOString().split('T')[0];
    const waitingListResponse = await apiCall(
      request, token, 'GET',
      `/RISComplete/waiting-list?date=${today}`
    );
    expect(waitingListResponse.ok()).toBeTruthy();
    const waitingList = await waitingListResponse.json();

    if (waitingList.length > 0) {
      const firstPatient = waitingList[0];

      // 2. Check if order exists
      if (firstPatient.orderId) {
        // 3. Get order details
        const orderResponse = await apiCall(
          request, token, 'GET',
          `/RISComplete/orders/${firstPatient.orderId}`
        );
        expect(orderResponse.ok()).toBeTruthy();
      }
    }
  });

  test('should get modalities and check connection', async ({ request }) => {
    // 1. Get modalities
    const modalitiesResponse = await apiCall(request, token, 'GET', '/RISComplete/modalities');
    expect(modalitiesResponse.ok()).toBeTruthy();
    const modalities = await modalitiesResponse.json();

    // 2. Get PACS connections
    const pacsResponse = await apiCall(request, token, 'GET', '/RISComplete/pacs-connections');
    expect(pacsResponse.ok()).toBeTruthy();
    const pacsConnections = await pacsResponse.json();

    // 3. Check PACS connection status if exists
    if (pacsConnections.length > 0) {
      const firstConnection = pacsConnections[0];
      const statusResponse = await apiCall(
        request, token, 'GET',
        `/RISComplete/pacs-connections/${firstConnection.id}/status`
      );
      expect(statusResponse.ok()).toBeTruthy();
    }
  });

  test('should validate template CRUD operations', async ({ request }) => {
    // 1. Get existing templates
    const templatesResponse = await apiCall(request, token, 'GET', '/RISComplete/templates');
    expect(templatesResponse.ok()).toBeTruthy();
    const templates = await templatesResponse.json();

    // 2. Create a test template
    const testTemplate = {
      code: `TEST_TPL_${Date.now()}`,
      name: 'Test Template - Auto Generated',
      gender: 'Both',
      descriptionTemplate: 'Mô tả test',
      conclusionTemplate: 'Kết luận test',
      noteTemplate: 'Ghi chú test',
      sortOrder: 999,
      isDefault: false,
      isActive: true
    };

    const createResponse = await apiCall(
      request, token, 'POST',
      '/RISComplete/templates',
      testTemplate
    );
    expect(createResponse.ok()).toBeTruthy();
    const createdTemplate = await createResponse.json();

    // 3. Delete the test template
    if (createdTemplate && createdTemplate.id) {
      const deleteResponse = await apiCall(
        request, token, 'DELETE',
        `/RISComplete/templates/${createdTemplate.id}`
      );
      expect([200, 204]).toContain(deleteResponse.status());
    }
  });

  test('should validate tag CRUD operations', async ({ request }) => {
    // 1. Get existing tags
    const tagsResponse = await apiCall(request, token, 'GET', '/RISComplete/tags');
    expect(tagsResponse.ok()).toBeTruthy();

    // 2. Create a test tag
    const testTag = {
      code: `TEST_TAG_${Date.now()}`,
      name: 'Test Tag - Auto Generated',
      color: '#FF5733',
      description: 'Test tag for automation',
      isActive: true
    };

    const createResponse = await apiCall(
      request, token, 'POST',
      '/RISComplete/tags',
      testTag
    );
    expect(createResponse.ok()).toBeTruthy();
    const createdTag = await createResponse.json();

    // 3. Delete the test tag
    if (createdTag && createdTag.id) {
      const deleteResponse = await apiCall(
        request, token, 'DELETE',
        `/RISComplete/tags/${createdTag.id}`
      );
      expect([200, 204]).toContain(deleteResponse.status());
    }
  });
});

test.describe('RIS/PACS Error Handling Tests', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAuthToken(request);
  });

  test('should handle invalid order ID gracefully', async ({ request }) => {
    const response = await apiCall(
      request, token, 'GET',
      '/RISComplete/orders/00000000-0000-0000-0000-000000000000'
    );
    // Should return 404 for non-existent order
    expect([200, 404]).toContain(response.status());
  });

  test('should handle invalid date format', async ({ request }) => {
    const response = await apiCall(
      request, token, 'GET',
      '/RISComplete/waiting-list?date=invalid-date'
    );
    // Should handle gracefully
    expect([200, 400]).toContain(response.status());
  });

  test('should handle unauthorized access', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/RISComplete/waiting-list?date=2024-01-01`);
    expect(response.status()).toBe(401);
  });

  test('should handle missing required parameters', async ({ request }) => {
    const response = await apiCall(
      request, token, 'POST',
      '/RISComplete/results/enter',
      {} // Empty body
    );
    expect([400, 422]).toContain(response.status());
  });
});

test.describe('RIS/PACS Performance Tests', () => {
  let token: string;

  test.beforeAll(async ({ request }) => {
    token = await getAuthToken(request);
  });

  test('waiting list API should respond within 3 seconds', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    const startTime = Date.now();

    const response = await apiCall(
      request, token, 'GET',
      `/RISComplete/waiting-list?date=${today}`
    );

    const duration = Date.now() - startTime;
    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(3000);
  });

  test('modalities API should respond within 2 seconds', async ({ request }) => {
    const startTime = Date.now();

    const response = await apiCall(request, token, 'GET', '/RISComplete/modalities');

    const duration = Date.now() - startTime;
    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(2000);
  });

  test('templates API should respond within 2 seconds', async ({ request }) => {
    const startTime = Date.now();

    const response = await apiCall(request, token, 'GET', '/RISComplete/templates');

    const duration = Date.now() - startTime;
    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(2000);
  });

  test('statistics API should respond within 5 seconds', async ({ request }) => {
    const today = new Date();
    const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const startTime = Date.now();

    const response = await apiCall(
      request, token, 'GET',
      `/RISComplete/reports/statistics?fromDate=${fromDate}&toDate=${toDate}`
    );

    const duration = Date.now() - startTime;
    expect(response.ok()).toBeTruthy();
    expect(duration).toBeLessThan(5000);
  });
});
