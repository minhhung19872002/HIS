import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Setup: Dang nhap va luu trang thai authentication
 * Chay truoc tat ca cac test khac
 */
setup('authenticate', async ({ page }) => {
  // Truy cap trang login
  await page.goto('/login');

  // Nhap thong tin dang nhap
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');

  // Click nut dang nhap
  await page.click('button[type="submit"]');

  // Cho den khi chuyen sang trang chinh
  await expect(page).toHaveURL('/');

  // Luu trang thai authentication
  await page.context().storageState({ path: authFile });
});
