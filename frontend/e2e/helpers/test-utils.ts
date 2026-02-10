import { Page, expect } from '@playwright/test';

/**
 * HIS Test Utilities
 * Cac ham tien ich dung chung cho E2E tests
 */

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
