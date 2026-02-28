# Testing Patterns

**Analysis Date:** 2026-02-28

## Test Framework

**Runner:**
- Cypress: v14.x (E2E testing, primary framework)
- Playwright: v1.48.x (E2E testing, secondary)
- Config: `frontend/cypress.config.ts`, `frontend/playwright.config.ts`

**Assertion Library:**
- Cypress: Built-in `cy.should()`, `expect()` from Chai
- Playwright: `expect()` from Playwright test framework
- Backend: xUnit assertions (MSTest compatible)

**Run Commands:**
```bash
# Cypress
npx cypress open                                          # Interactive mode
npx cypress run --spec "cypress/e2e/console-errors.cy.ts" # Single spec
npx cypress run --browser chrome                          # Headless all specs
npx cypress run --spec "cypress/e2e/*.cy.ts" --parallel   # Parallel execution

# Playwright
npx playwright test                           # Run all tests
npx playwright test --ui                      # UI mode
npx playwright test --headed                  # Show browser
npx playwright test 01-reception              # Single file
npx playwright show-report                    # View HTML report

# Backend
dotnet test                                   # Run all tests
dotnet test --filter Category=Integration     # Filter by category
```

## Test File Organization

**Location:**
- Cypress E2E: `frontend/cypress/e2e/[name].cy.ts` (22 spec files, 637 tests total)
- Playwright E2E: `frontend/e2e/workflows/[name].spec.ts` (10 spec files, 255 tests total)
- Backend: `backend/src/HIS.Tests/` (project structure TBD)
- Fixtures: `frontend/e2e/fixtures/` (shared test data)
- Utilities: `frontend/e2e/helpers/test-utils.ts` (shared functions)

**Naming:**
- Cypress: `[feature].cy.ts` (e.g., `console-errors.cy.ts`, `emr.cy.ts`, `two-factor-auth.cy.ts`)
- Playwright: `[number]-[feature].spec.ts` (e.g., `01-reception.spec.ts`, `02-opd-examination.spec.ts`)
- Tests within files: `it('should [action]')` or `test('[scenario name]')`

**Structure:**
```
frontend/cypress/
├── e2e/
│   ├── console-errors.cy.ts          # Page load + console check (29 tests)
│   ├── form-interactions.cy.ts        # Form fill workflows (27 tests)
│   ├── emr.cy.ts                      # EMR page tests (34 tests)
│   ├── new-features.cy.ts             # Dashboard, timeline, notifications (34 tests)
│   ├── user-workflow.cy.ts            # Manual user actions (40 tests)
│   ├── [...17 more files]             # (637 tests total)
│   └── ris-pacs-complete.cy.ts        # DICOM imaging (67 tests)
├── support/
│   ├── e2e.ts                         # Setup, hide XHR logs
│   ├── commands.ts                    # Custom commands
│   └── index.d.ts                     # Type definitions
└── cypress.config.ts

frontend/e2e/
├── workflows/
│   ├── 01-reception.spec.ts           # Patient registration (15 tests)
│   ├── 02-opd-examination.spec.ts     # OPD exam workflow (14 tests)
│   ├── [...8 more files]              # (255 tests total)
│   └── test-utils.ts                  # Helpers + fixtures
├── playwright.config.ts
└── helpers/
    └── test-utils.ts                  # Shared utilities
```

## Test Structure

**Cypress Suite Organization:**
```typescript
/// <reference types="cypress" />

/**
 * Test suite documentation
 * Describes what the tests cover
 */

// Global setup
const pages = [
  { route: '/', name: 'Dashboard' },
  // ... more pages
];

const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'favicon.ico',
  // ... patterns to ignore
];

describe('Feature Name', () => {
  let token: string;

  before(() => {
    // One-time setup: login via API
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
    }).then((response) => {
      token = response.body.data?.token || response.body.token;
    });
  });

  beforeEach(() => {
    // Before each test
    cy.on('uncaught:exception', () => false); // Don't fail on unhandled exceptions
    cy.window().then((win) => {
      win.localStorage.setItem('token', token);
      win.localStorage.setItem('user', JSON.stringify({...}));
    });
  });

  it('should [describe expectation]', () => {
    cy.visit('/path');
    cy.get('selector').should('exist');
    cy.get('button').click();
    cy.get('expected-result').should('be.visible');
  });

  // More tests...
});
```

**Playwright Suite Organization:**
```typescript
import { test, expect } from '@playwright/test';
import { login, waitForLoading, generatePatientData } from '../helpers/test-utils';

/**
 * Test suite documentation
 */

test.describe('Feature Name', () => {
  test.setTimeout(60000); // Global timeout for suite

  test.beforeEach(async ({ page }) => {
    // Before each test
    await login(page);
    await page.goto('/path');
    await waitForLoading(page);
  });

  test('should [describe expectation]', async ({ page }) => {
    const title = page.locator('h4:has-text("Title")');
    await expect(title).toBeVisible({ timeout: 10000 });

    const button = page.locator('button:has-text("Click me")');
    await button.click();

    const result = page.locator('.result-selector');
    await expect(result).toBeVisible();
  });

  // More tests...
});
```

**Patterns:**

*Setup pattern:*
- `before()`: One-time login, token retrieval
- `beforeEach()`: Set token in localStorage, set up window listener for console errors
- Global `cy.on('uncaught:exception', () => false)` to allow app crashes without failing test

*Teardown pattern:*
- No explicit cleanup (Cypress auto-resets between tests)
- Playwright: `afterEach` for cleanup if needed (not commonly used)

*Assertion pattern:*
- Cypress: `cy.get(selector).should('be.visible')`, `cy.contains('text').should('exist')`
- Playwright: `await expect(locator).toBeVisible()`, `await expect(locator).toContainText('text')`
- HTTP assertions: Check status codes in interceptors

## Mocking

**Framework:**
- Cypress: `cy.intercept()` for HTTP mocking
- Playwright: `page.route()` for HTTP mocking
- No dedicated mocking library (axios/fetch mocking via HTTP interception)

**Patterns:**

*Cypress intercept:*
```typescript
// Mock API endpoint
cy.intercept('GET', '/api/patients/*/medical-records', (req) => {
  req.reply({
    statusCode: 200,
    body: { success: true, data: mockData },
  });
});

// Spy on requests
cy.intercept('POST', '/api/examination/save', (req) => {
  req.continue((res) => {
    expect(res.statusCode).to.eq(200);
  });
});

// Intercept all API calls for error checking
cy.intercept('**/api/**', (req) => {
  req.continue((res) => {
    if (res.statusCode >= 400) {
      serverErrors.push(`${req.method} ${req.url}: ${res.statusCode}`);
    }
  });
});
```

*Playwright route:*
```typescript
// Mock endpoint
await page.route('**/api/patients/**', (route) => {
  route.abort('failed'); // Simulate network error
  // OR
  route.continue(); // Pass through to real API
});

// Check request body
await page.route('**/api/examination/save', async (route) => {
  const request = route.request();
  console.log('POST body:', request.postDataJSON());
  await route.continue();
});
```

**What to Mock:**
- External API dependencies (e.g., BHXH gateway calls)
- Payment gateway responses
- Third-party service errors (for failure testing)
- Slow endpoints (to speed up tests)

**What NOT to Mock:**
- Internal APIs (let them hit real backend)
- Authentication (use real login flow to get valid token)
- Database operations (test end-to-end via real DB)
- Timing/waits (use actual async operations)

## Fixtures and Factories

**Test Data:**

*Cypress fixtures:*
```typescript
// Use JSON fixtures from cypress/fixtures/
cy.fixture('patient-data.json').then((patient) => {
  // Use patient object
});
```

*Playwright factories:*
```typescript
// frontend/e2e/helpers/test-utils.ts
export function generatePatientData() {
  return {
    fullName: `Test Patient ${Date.now()}`,
    gender: 1,
    dateOfBirth: '1988-06-15',
    phoneNumber: '0912345678',
    identityNumber: '012345678901',
    address: '100 Lê Lai, Q1, TP.HCM',
  };
}

// Use in test
const patientData = generatePatientData();
```

*Helper function for registration:*
```typescript
async function registerPatientViaAPI(page: Page, patientData: any) {
  const response = await page.request.post('/api/reception/register/fee', {
    data: {
      newPatient: patientData,
      serviceType: 2,
      roomId: firstRoom.roomId,
    },
  });
  return response.json();
}
```

**Location:**
- Cypress: `frontend/cypress/fixtures/` (JSON files)
- Playwright: `frontend/e2e/helpers/test-utils.ts` (factory functions)

**Commonly used:**
- Patient registration data (name, gender, phone, ID, address)
- Medical record setup (diagnosis, symptoms, treatments)
- User credentials (admin/doctor/nurse accounts)

## Coverage

**Requirements:** No hard coverage requirement enforced

**View Coverage (Playwright):**
```bash
npx playwright test --coverage
# Generates coverage report in coverage/ directory
```

**Coverage gaps identified:**
- Complex EF Core query logic (limited unit tests, mostly E2E verified)
- Error edge cases (some handled by Cypress IGNORE_PATTERNS)
- Backend PDF generation (tested via E2E, no unit tests)
- Barcode/QR scanning (camera API not unit-testable, E2E tested)

## Test Types

**Unit Tests:**
- Scope: Individual functions, utilities, helpers
- Approach: Fast, isolated, no backend dependency
- Examples: `formatShortcut()` function, date utilities
- Current state: Minimal (focus on E2E over unit)

**Integration Tests:**
- Scope: Feature workflows across modules (OPD → Prescription → Billing → Pharmacy)
- Approach: Real backend, real database, real authentication
- Examples: `real-workflow.cy.ts` (71 tests), Playwright workflow specs
- Test data: Created via API calls in `beforeAll`/`beforeEach`

**E2E Tests:**
- Scope: Complete user workflows including UI interaction
- Approach: Full browser, backend running, real database
- Examples: All Cypress and Playwright specs
- Coverage: 637 Cypress + 255 Playwright = 892 E2E tests total

**System Tests:**
- Scope: Multiple features, cross-module data inheritance
- Examples: `all-flows.cy.ts` (60 tests), `fhir-health-pdf.cy.ts` (37 tests)
- Data flow: Reception → OPD → Rx → Billing → Pharmacy → IPD

## Common Patterns

**Async Testing - Cypress:**
```typescript
// Wait for element + click
cy.get('button').should('be.visible').click();

// Wait for loading spinner
cy.get('.ant-spin').should('not.exist');

// Intercept + wait for response
cy.intercept('POST', '/api/examination/save').as('saveExam');
cy.get('button[type="submit"]').click();
cy.wait('@saveExam').its('response.statusCode').should('eq', 200);

// Custom wait with timeout
cy.get('.result', { timeout: 15000 }).should('exist');
```

**Async Testing - Playwright:**
```typescript
// Wait for element visible
const button = page.locator('button:has-text("Save")');
await button.waitFor({ state: 'visible' });
await button.click();

// Wait for loading to disappear
await page.waitForSelector('.ant-spin', { state: 'hidden', timeout: 10000 });

// Wait for network response
const responsePromise = page.waitForResponse(r => r.url().includes('/save') && r.status() === 200);
await page.locator('button[type="submit"]').click();
await responsePromise;

// Wait for DOM content loaded
await page.waitForLoadState('domcontentloaded');
```

**Error Testing - Cypress:**
```typescript
// Test API error response
cy.request({
  method: 'POST',
  url: '/api/endpoint',
  failOnStatusCode: false,
}).then((response) => {
  expect(response.status).to.eq(400);
  expect(response.body.message).to.contain('validation error');
});

// Test validation error message
cy.get('form').submit();
cy.get('.ant-form-item-explain-error').should('contain', 'Vui lòng nhập');

// Test authorization error
cy.request({
  method: 'POST',
  url: '/api/protected/endpoint',
  headers: { Authorization: 'Bearer invalid-token' },
  failOnStatusCode: false,
}).then((response) => {
  expect(response.status).to.eq(401);
});
```

**Error Testing - Playwright:**
```typescript
// Test API error
const response = await page.request.post('/api/endpoint', {
  data: { invalid: 'payload' },
});
expect(response.status()).toBe(400);
const body = await response.json();
expect(body.message).toContain('validation error');

// Test form validation
await page.locator('form').locator('button[type="submit"]').click();
const error = page.locator('.ant-form-item-explain-error').first();
await expect(error).toContainText('Vui lòng nhập');

// Test permission error
const response = await page.request.post('/api/protected', {
  headers: { Authorization: 'Bearer invalid' },
});
expect(response.status()).toBe(403);
```

**Form Interaction Pattern:**
```typescript
// Cypress
cy.get('input[placeholder="Họ tên"]').fill('Nguyen Van A');
cy.get('.ant-select').click();
cy.get('.ant-select-dropdown .ant-select-item:has-text("Option")').click();
cy.get('textarea').type('Multi\nline\ntext');
cy.get('button[type="submit"]').click();
cy.get('.ant-message-success').should('contain', 'Thành công');

// Playwright
await page.fill('input[placeholder="Họ tên"]', 'Nguyen Van A');
await page.click('.ant-select');
await page.click('.ant-select-dropdown .ant-select-item:has-text("Option")');
await page.fill('textarea', 'Multi\nline\ntext');
await page.click('button[type="submit"]');
await expect(page.locator('.ant-message-success')).toContainText('Thành công');
```

**Data Inheritance Testing Pattern:**
```typescript
// Test that OPD can access Reception data
cy.request({
  method: 'POST',
  url: '/api/reception/register/fee',
  headers: apiHeaders(token),
  body: {
    newPatient: { fullName: 'Test Patient', ... },
    serviceType: 2,
    roomId: roomId,
  },
}).then((regResp) => {
  const patientId = regResp.body.data.patientId;

  // Now in OPD, fetch patient with inherited data
  cy.request({
    url: `/api/data-inheritance/opd-context/${patientId}`,
    headers: apiHeaders(token),
  }).then((opdResp) => {
    expect(opdResp.body.data.insuranceNumber).to.exist; // From Reception
    expect(opdResp.body.data.queueTicket).to.exist;     // From Reception
  });
});
```

## Debugging & Troubleshooting

**Cypress Debug:**
```typescript
cy.debug(); // Pause execution
cy.pause(); // Pause until you click continue

// Get full page HTML
cy.get('body').then(($body) => {
  console.log($body.html());
});

// Intercept to log all requests
cy.intercept('**/api/**', (req) => {
  cy.task('log', `${req.method} ${req.url}`);
  req.continue();
});
```

**Playwright Debug:**
```bash
npx playwright test --debug
# Opens inspector, step through code

npx playwright codegen
# Record actions to generate test code
```

**Common Issues & Fixes:**
- Timeout on tab selector: Use `.ant-tabs-tabpane-active` + DOM existence check
- Flaky network tests: Use `Promise.allSettled` instead of `Promise.all`
- USB Token tests fail headless: Skip with `test.skip()` (Windows PIN dialog)
- Element not clickable: Check for `display: none` or parent modal, use `force: true` as last resort
- Antd v6 props: Use `orientation` not `direction`, `title` not `message`, `styles.content` not `valueStyle`

## Test Status (As of 2026-02-28)

| Test Suite | Pass | Fail | Pending | Total |
|---|---|---|---|---|
| Cypress (22 specs) | 634 | 0 | 3 | 637 |
| Playwright (10 specs) | 255 | 0 | 0 | 255 |
| **Total** | **889** | **0** | **3** | **892** |

*3 pending = USB Token tests (skipped, require Windows PIN dialog)*

---

*Testing analysis: 2026-02-28*
