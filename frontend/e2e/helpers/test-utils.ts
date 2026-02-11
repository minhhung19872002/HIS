import { Page, expect, request } from '@playwright/test';

/**
 * HIS Test Utilities
 * Cac ham tien ich dung chung cho E2E tests
 */

// API Base URL
const API_BASE_URL = 'http://localhost:5106/api';

// Cache for auth token
let cachedToken: string | null = null;

/**
 * Get authentication token for API calls
 */
export async function getAuthToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  const context = await request.newContext();
  const response = await context.post(`${API_BASE_URL}/auth/login`, {
    data: {
      username: 'admin',
      password: 'Admin@123'
    }
  });

  const data = await response.json();
  cachedToken = data.data?.token;
  await context.dispose();
  return cachedToken!;
}

/**
 * Register a new patient via API
 * This saves data directly to the database
 */
export async function registerPatientViaAPI(patientData?: Partial<{
  fullName: string;
  gender: number;
  dateOfBirth: string;
  phoneNumber: string;
  address: string;
  identityNumber: string;
  roomId: string;
}>) {
  const token = await getAuthToken();
  const context = await request.newContext();

  const timestamp = Date.now();
  const defaultData = {
    fullName: `Test Patient ${timestamp}`,
    gender: 1,
    dateOfBirth: '1990-01-15',
    phoneNumber: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
    address: '123 Test Street, District 1, HCMC',
    identityNumber: `0${Math.floor(10000000000 + Math.random() * 90000000000)}`,
    roomId: 'bf6b00e9-578b-47fb-aff8-af25fb35a794' // Phong kham Noi 1
  };

  const mergedData = { ...defaultData, ...patientData };

  const response = await context.post(`${API_BASE_URL}/reception/register/fee`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    data: {
      newPatient: {
        fullName: mergedData.fullName,
        gender: mergedData.gender,
        dateOfBirth: mergedData.dateOfBirth,
        phoneNumber: mergedData.phoneNumber,
        address: mergedData.address,
        identityNumber: mergedData.identityNumber
      },
      serviceType: 2, // Vien phi
      roomId: mergedData.roomId
    }
  });

  const result = await response.json();
  await context.dispose();
  return result;
}

/**
 * Get available exam rooms via API
 */
export async function getExamRoomsViaAPI() {
  const token = await getAuthToken();
  const context = await request.newContext();

  const response = await context.get(`${API_BASE_URL}/reception/rooms/overview`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();
  await context.dispose();
  return result;
}

/**
 * Get patients in queue for a room via API
 */
export async function getRoomPatientsViaAPI(roomId: string) {
  const token = await getAuthToken();
  const context = await request.newContext();

  const response = await context.get(`${API_BASE_URL}/examination/rooms/${roomId}/patients`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();
  await context.dispose();
  return result;
}

/**
 * Start examination for a patient via API
 */
export async function startExaminationViaAPI(examinationId: string) {
  const token = await getAuthToken();
  const context = await request.newContext();

  const response = await context.post(`${API_BASE_URL}/examination/${examinationId}/start`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();
  await context.dispose();
  return result;
}

/**
 * Cho loading spinner bien mat
 */
export async function waitForLoading(page: Page) {
  await page.waitForSelector('.ant-spin', { state: 'hidden', timeout: 30000 }).catch(() => {});
}

/**
 * Cho notification thanh cong hien len
 */
export async function expectSuccessNotification(page: Page, message?: string) {
  const notification = page.locator('.ant-notification-notice-success');
  await expect(notification).toBeVisible({ timeout: 10000 });
  if (message) {
    await expect(notification).toContainText(message);
  }
}

/**
 * Cho notification loi hien len
 */
export async function expectErrorNotification(page: Page, message?: string) {
  const notification = page.locator('.ant-notification-notice-error');
  await expect(notification).toBeVisible({ timeout: 10000 });
  if (message) {
    await expect(notification).toContainText(message);
  }
}

/**
 * Dien form Ant Design
 */
export async function fillAntdForm(page: Page, formData: Record<string, string>) {
  for (const [fieldName, value] of Object.entries(formData)) {
    const input = page.locator(`[name="${fieldName}"], #${fieldName}`).first();
    await input.fill(value);
  }
}

/**
 * Chon option trong Select cua Ant Design
 */
export async function selectAntdOption(page: Page, selector: string, optionText: string) {
  await page.click(selector);
  await page.click(`.ant-select-dropdown .ant-select-item:has-text("${optionText}")`);
}

/**
 * Click button submit trong form
 */
export async function submitForm(page: Page) {
  await page.click('button[type="submit"]');
  await waitForLoading(page);
}

/**
 * Tao du lieu benh nhan ngau nhien
 */
export function generatePatientData() {
  const randomId = Math.floor(Math.random() * 1000000);
  return {
    fullName: `Nguyen Van Test ${randomId}`,
    dateOfBirth: '1985-05-15',
    gender: 'Nam',
    phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
    address: `${randomId} Nguyen Hue, Quan 1, TP.HCM`,
    idNumber: `0${Math.floor(10000000000 + Math.random() * 90000000000)}`,
    visitReason: 'Dau dau, sot cao',
  };
}

/**
 * Navigate den trang cu the
 */
export async function navigateTo(page: Page, menuPath: string[]) {
  for (const menuItem of menuPath) {
    await page.click(`text=${menuItem}`);
  }
  await waitForLoading(page);
}

/**
 * Dang nhap he thong
 */
export async function login(page: Page, username = 'admin', password = 'Admin@123') {
  // Kiem tra neu da dang nhap thi bo qua
  const currentUrl = page.url();
  if (!currentUrl.includes('/login') && !currentUrl.includes('localhost:5173/')) {
    // Neu khong phai trang login va khong phai trang root, co the da dang nhap
    const sideMenu = page.locator('.ant-menu, .ant-layout-sider');
    if (await sideMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      return; // Da dang nhap
    }
  }

  // Navigate to login page
  await page.goto('/login');
  await page.waitForTimeout(1000);

  // Fill login form
  const usernameInput = page.locator('#username, input[name="username"], input[placeholder*="Tên đăng nhập"]').first();
  const passwordInput = page.locator('#password, input[name="password"], input[type="password"]').first();

  if (await usernameInput.isVisible()) {
    await usernameInput.fill(username);
  }

  if (await passwordInput.isVisible()) {
    await passwordInput.fill(password);
  }

  // Click login button
  const loginBtn = page.locator('button[type="submit"], button:has-text("Đăng nhập")').first();
  if (await loginBtn.isVisible()) {
    await loginBtn.click();
    await page.waitForTimeout(2000);
    await waitForLoading(page);
  }
}
