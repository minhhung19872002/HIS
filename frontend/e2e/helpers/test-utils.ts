import { Page, expect, request } from '@playwright/test';

/**
 * HIS Test Utilities
 * Cac ham tien ich dung chung cho E2E tests
 */

// API Base URL
const API_BASE_URL = 'http://localhost:5106/api';

// Cache for auth token
let cachedToken: string | null = null;
let cachedUser: Record<string, unknown> | null = null;

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
  cachedUser = data.data?.user ?? null;
  await context.dispose();
  return cachedToken!;
}

async function getAuthSession(username = 'admin', password = 'Admin@123') {
  if (cachedToken && cachedUser) {
    return { token: cachedToken, user: cachedUser };
  }

  const context = await request.newContext();
  const response = await context.post(`${API_BASE_URL}/auth/login`, {
    data: { username, password }
  });

  const data = await response.json();
  await context.dispose();

  const token = data?.data?.token;
  const user = data?.data?.user;

  if (!token || !user) {
    throw new Error('Failed to obtain auth session for Playwright tests');
  }

  cachedToken = token;
  cachedUser = user;
  return { token, user };
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
 * Get the first active examination room ID via API.
 * This is the room the OPD page auto-selects on load.
 * Falls back to the default room ID if the API call fails.
 */
export async function getFirstActiveExamRoomId(): Promise<string> {
  const defaultRoomId = 'bf6b00e9-578b-47fb-aff8-af25fb35a794'; // Phong kham Noi 1
  try {
    const token = await getAuthToken();
    const context = await request.newContext();
    const response = await context.get(`${API_BASE_URL}/examination/rooms/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    await context.dispose();
    const rooms = result?.data ?? result;
    if (Array.isArray(rooms) && rooms.length > 0) {
      return rooms[0].id || defaultRoomId;
    }
  } catch (err) {
    console.warn('[test-utils] Failed to get active exam rooms:', err);
  }
  return defaultRoomId;
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
  const { token, user } = await getAuthSession(username, password);

  await page.addInitScript(
    ([sessionToken, sessionUser]) => {
      window.localStorage.setItem('token', sessionToken);
      window.localStorage.setItem('user', JSON.stringify(sessionUser));
    },
    [token, user] as const,
  );

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  await waitForLoading(page);
}
