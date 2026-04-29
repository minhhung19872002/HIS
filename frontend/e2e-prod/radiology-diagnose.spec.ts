import { test, expect } from '@playwright/test';

test.setTimeout(90000);

test('diagnose /radiology errors on prod', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: { url: string; status: number; method: string }[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push((err.message || '') + '\n' + (err.stack || '')));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      failedRequests.push({ url: resp.url(), status: resp.status(), method: resp.request().method() });
    }
  });

  const loginResp = await fetch('https://his-api-694913628964.asia-southeast1.run.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123' }),
  });
  const loginData = await loginResp.json();
  const token = loginData?.data?.token;
  const user = loginData?.data?.user;
  expect(token).toBeTruthy();

  await page.goto('https://his-psi.vercel.app/');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });

  await page.goto('https://his-psi.vercel.app/radiology', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  console.log('\n=== PAGE TITLE ===', await page.title());
  console.log('\n=== CONSOLE ERRORS ===');
  consoleErrors.forEach(e => console.log('  -', e.slice(0, 300)));
  console.log('\n=== PAGE ERRORS (uncaught) ===');
  pageErrors.forEach(e => console.log('  -', e.slice(0, 500)));
  console.log('\n=== FAILED REQUESTS ===');
  failedRequests.forEach(r => console.log(`  [${r.status}] ${r.method} ${r.url.slice(0, 200)}`));

  const h1 = await page.locator('h1, h2').first().textContent().catch(() => '(none)');
  console.log('\n=== FIRST HEADING ===', h1);
});
