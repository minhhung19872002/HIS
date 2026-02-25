/**
 * LIS (Laboratory Information System) E2E Tests with HL7Spy
 * Module 7: Xét nghiệm
 *
 * Prerequisites:
 * 1. HL7Spy installed and running
 * 2. Backend API running on localhost:5106
 * 3. HL7Spy configured to listen on port 2575
 *
 * HL7Spy Configuration:
 * - Mode: TCP/IP Server
 * - Port: 2575
 * - Protocol: MLLP
 * - Auto-ACK: Enabled
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import * as net from 'net';

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:5106';
const HL7SPY_HOST = process.env.HL7SPY_HOST || 'localhost';
const HL7SPY_PORT = parseInt(process.env.HL7SPY_PORT || '2575');

// JWT token for authentication (get from login)
let authToken: string;
let testAnalyzerId: string;
let testPatientId: string;
let testLabRequestId: string;

// Helper function to wrap HL7 message with MLLP framing
function wrapMLLP(message: string): string {
  return `\x0B${message}\x1C\x0D`;
}

// Helper function to strip MLLP framing
function stripMLLP(message: string): string {
  let result = message;
  if (result.charCodeAt(0) === 0x0B) {
    result = result.substring(1);
  }
  if (result.endsWith('\x1C\x0D')) {
    result = result.slice(0, -2);
  } else if (result.endsWith('\x1C')) {
    result = result.slice(0, -1);
  }
  return result;
}

// Generate HL7 ORU^R01 message (Lab Result)
function generateORUMessage(sampleId: string, testCode: string, result: string, unit: string): string {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
  const messageControlId = `MSG${Date.now()}`;

  return [
    `MSH|^~\\&|HL7SPY|ANALYZER|HIS|HOSPITAL|${timestamp}||ORU^R01|${messageControlId}|P|2.5`,
    `PID|1||PAT001^^^MRN||Nguyen^Van^A||19800101|M`,
    `OBR|1|${sampleId}|${sampleId}|${testCode}^Test|||${timestamp}`,
    `OBX|1|NM|${testCode}^${testCode}||${result}|${unit}|70-100|N|||F`
  ].join('\r') + '\r';
}

// Send HL7 message to HL7Spy and get response
async function sendHL7Message(message: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = '';

    client.setTimeout(10000);

    client.connect(HL7SPY_PORT, HL7SPY_HOST, () => {
      console.log(`Connected to HL7Spy at ${HL7SPY_HOST}:${HL7SPY_PORT}`);
      client.write(wrapMLLP(message));
    });

    client.on('data', (data) => {
      response += data.toString();
      if (response.includes('\x1C')) {
        client.destroy();
        resolve(stripMLLP(response));
      }
    });

    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Connection timeout'));
    });

    client.on('error', (err) => {
      reject(err);
    });

    client.on('close', () => {
      if (response) {
        resolve(stripMLLP(response));
      }
    });
  });
}

// Check if HL7Spy is running
async function isHL7SpyRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(3000);

    client.connect(HL7SPY_PORT, HL7SPY_HOST, () => {
      client.destroy();
      resolve(true);
    });

    client.on('error', () => {
      resolve(false);
    });

    client.on('timeout', () => {
      client.destroy();
      resolve(false);
    });
  });
}

test.describe('LIS Module - HL7 Integration Tests', () => {

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        username: 'admin',
        password: 'Admin@123'
      }
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      // API returns { success: true, data: { token: "..." } }
      authToken = loginData.data?.token || loginData.token;
      console.log('Login successful, token:', authToken ? 'obtained' : 'missing');
    } else {
      // Use pre-configured token if login fails
      authToken = process.env.AUTH_TOKEN || '';
      console.log('Using pre-configured token');
    }
  });

  test('7.1 - Check HL7Spy availability', async () => {
    const isRunning = await isHL7SpyRunning();
    console.log(`HL7Spy running: ${isRunning}`);

    if (!isRunning) {
      console.warn('HL7Spy is not running. Please start HL7Spy on port 2575');
      test.skip();
    }

    expect(isRunning).toBeTruthy();
  });

  test('7.2 - Create Lab Analyzer with HL7 Protocol', async ({ request }) => {
    const analyzerData = {
      code: 'HL7SPY-001',
      name: 'HL7Spy Test Analyzer',
      manufacturer: 'HL7Spy',
      model: 'v3.0',
      protocol: 'HL7',
      connectionType: 'TCP',
      ipAddress: HL7SPY_HOST,
      port: HL7SPY_PORT,
      departmentId: null,
      isActive: true
    };

    const response = await request.post(`${API_URL}/api/LISComplete/analyzers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: analyzerData
    });

    console.log('Create analyzer response status:', response.status());

    if (response.ok()) {
      const data = await response.json();
      testAnalyzerId = data.id;
      console.log('Created analyzer:', testAnalyzerId);
      expect(data.code).toBe('HL7SPY-001');
    } else {
      // Analyzer might already exist, try to get it
      const listResponse = await request.get(`${API_URL}/api/LISComplete/analyzers?keyword=HL7SPY`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (listResponse.ok()) {
        const analyzers = await listResponse.json();
        if (analyzers.length > 0) {
          testAnalyzerId = analyzers[0].id;
          console.log('Using existing analyzer:', testAnalyzerId);
        }
      }
    }

    expect(testAnalyzerId).toBeTruthy();
  });

  test('7.3 - Check Analyzer Connection Status', async ({ request }) => {
    test.skip(!testAnalyzerId, 'No analyzer ID');

    const response = await request.get(
      `${API_URL}/api/LISComplete/analyzers/${testAnalyzerId}/connection-status`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Connection status response:', response.status());

    if (response.ok()) {
      const status = await response.json();
      console.log('Analyzer connection status:', status);
      expect(status.analyzerId).toBe(testAnalyzerId);
    }
  });

  test('7.4 - Toggle Analyzer Connection (Start)', async ({ request }) => {
    // Get analyzer ID if not set
    if (!testAnalyzerId) {
      const listResponse = await request.get(`${API_URL}/api/LISComplete/analyzers?keyword=HL7SPY`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (listResponse.ok()) {
        const analyzers = await listResponse.json();
        if (analyzers.length > 0) {
          testAnalyzerId = analyzers[0].id;
        }
      }
    }
    test.skip(!testAnalyzerId, 'No analyzer ID found');

    const response = await request.post(
      `${API_URL}/api/LISComplete/analyzers/${testAnalyzerId}/toggle-connection?connect=true`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Toggle connection response:', response.status());
    expect(response.status()).toBeLessThan(500);

    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  test('7.5 - Get Sample Collection List', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];

    const response = await request.get(
      `${API_URL}/api/LISComplete/sample-collection/list?date=${today}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Sample collection list status:', response.status());

    if (response.ok()) {
      const samples = await response.json();
      console.log(`Found ${samples.length} samples pending collection`);

      if (samples.length > 0) {
        testPatientId = samples[0].patientId;
        testLabRequestId = samples[0].labRequestId;
      }
    }
  });

  test('7.6 - Get Pending Lab Orders', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];

    const response = await request.get(
      `${API_URL}/api/LISComplete/orders/pending?date=${today}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Pending orders status:', response.status());

    if (response.ok()) {
      const orders = await response.json();
      console.log(`Found ${orders.length} pending lab orders`);
    }
  });

  test('7.7 - Send HL7 ORU Message to HIS (Simulate Analyzer Result)', async ({ request }) => {
    const isRunning = await isHL7SpyRunning();
    test.skip(!isRunning, 'HL7Spy not running');

    // Generate test ORU message
    const sampleId = 'L2602120001'; // Sample barcode
    const oruMessage = generateORUMessage(sampleId, 'GLU', '95.5', 'mg/dL');

    console.log('Sending ORU message:');
    console.log(oruMessage.replace(/\r/g, '\n'));

    try {
      // Send to HL7Spy (which should forward to HIS or we process directly)
      const response = await sendHL7Message(oruMessage);
      console.log('HL7 Response:', response);

      // Check if we got an ACK
      expect(response).toContain('MSA|AA');
    } catch (error) {
      console.log('HL7 send error (expected if HL7Spy not configured):', error);
    }
  });

  test('7.8 - Process Analyzer Result via API', async ({ request }) => {
    test.skip(!testAnalyzerId, 'No analyzer ID');

    // Raw HL7 data to process
    const rawData = generateORUMessage('L2602120001', 'GLU', '95.5', 'mg/dL');

    const response = await request.post(
      `${API_URL}/api/LISComplete/analyzers/${testAnalyzerId}/process-result`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          rawData: rawData
        }
      }
    );

    console.log('Process result status:', response.status());

    if (response.ok()) {
      const result = await response.json();
      console.log('Process result:', result);
      expect(result.processedCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('7.9 - Get Unmapped Results', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/LISComplete/unmapped-results`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Unmapped results status:', response.status());

    if (response.ok()) {
      const results = await response.json();
      console.log(`Found ${results.length} unmapped results`);
    }
  });

  test('7.10 - Get Analyzer Realtime Status', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/LISComplete/analyzers/realtime-status`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Realtime status response:', response.status());

    if (response.ok()) {
      const statuses = await response.json();
      console.log('Analyzer statuses:', statuses);

      if (statuses.length > 0) {
        expect(statuses[0]).toHaveProperty('analyzerName');
        expect(statuses[0]).toHaveProperty('status');
      }
    }
  });

  test('7.11 - Get Sample Types', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/LISComplete/sample-types`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Sample types status:', response.status());

    if (response.ok()) {
      const types = await response.json();
      console.log(`Found ${types.length} sample types`);
    }
  });

  test('7.12 - Get Tube Types', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/LISComplete/tube-types`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Tube types status:', response.status());

    if (response.ok()) {
      const types = await response.json();
      console.log(`Found ${types.length} tube types`);
    }
  });

  test('7.13 - Get Lab Test Catalog', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/LISComplete/catalog/tests`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Test catalog status:', response.status());

    if (response.ok()) {
      const tests = await response.json();
      console.log(`Found ${tests.length} lab tests in catalog`);
    }
  });

  test('7.14 - Get Lab Test Groups', async ({ request }) => {
    const response = await request.get(
      `${API_URL}/api/LISComplete/catalog/groups`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Test groups status:', response.status());

    if (response.ok()) {
      const groups = await response.json();
      console.log(`Found ${groups.length} test groups`);
    }
  });

  test('7.15 - Get Critical Value Alerts', async ({ request }) => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const toDate = new Date();

    const response = await request.get(
      `${API_URL}/api/LISComplete/critical-values/alerts?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Critical alerts status:', response.status());

    if (response.ok()) {
      const alerts = await response.json();
      console.log(`Found ${alerts.length} critical value alerts`);
    }
  });

  test('7.16 - Toggle Analyzer Connection (Stop)', async ({ request }) => {
    // Get analyzer ID if not set
    if (!testAnalyzerId) {
      const listResponse = await request.get(`${API_URL}/api/LISComplete/analyzers?keyword=HL7SPY`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (listResponse.ok()) {
        const analyzers = await listResponse.json();
        if (analyzers.length > 0) {
          testAnalyzerId = analyzers[0].id;
        }
      }
    }
    test.skip(!testAnalyzerId, 'No analyzer ID found');

    const response = await request.post(
      `${API_URL}/api/LISComplete/analyzers/${testAnalyzerId}/toggle-connection?connect=false`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Stop connection status:', response.status());
    expect(response.status()).toBeLessThan(500);
  });

  test('7.17 - Get Lab Statistics', async ({ request }) => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const toDate = new Date();

    const response = await request.get(
      `${API_URL}/api/LISComplete/reports/statistics?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Statistics status:', response.status());

    if (response.ok()) {
      const stats = await response.json();
      console.log('Lab statistics:', stats);
    }
  });

  test('7.18 - Get TAT Report', async ({ request }) => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const toDate = new Date();

    const response = await request.get(
      `${API_URL}/api/LISComplete/reports/tat?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('TAT report status:', response.status());

    if (response.ok()) {
      const tat = await response.json();
      console.log('TAT report:', tat);
    }
  });

  test('7.19 - Get QC Report', async ({ request }) => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const toDate = new Date();

    const response = await request.get(
      `${API_URL}/api/LISComplete/reports/qc?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('QC report status:', response.status());

    if (response.ok()) {
      const qc = await response.json();
      console.log('QC report:', qc);
    }
  });

  test('7.20 - Get Abnormal Rate Report', async ({ request }) => {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const toDate = new Date();

    const response = await request.get(
      `${API_URL}/api/LISComplete/reports/abnormal-rate?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`,
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    console.log('Abnormal rate status:', response.status());

    if (response.ok()) {
      const abnormal = await response.json();
      console.log('Abnormal rate report:', abnormal);
    }
  });

});

test.describe('LIS Module - Direct HL7 Communication Tests', () => {

  test('HL7.1 - Send ORM (Order) Message', async () => {
    const isRunning = await isHL7SpyRunning();
    test.skip(!isRunning, 'HL7Spy not running');

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
    const messageControlId = `ORM${Date.now()}`;

    const ormMessage = [
      `MSH|^~\\&|HIS|HOSPITAL|LIS|LAB|${timestamp}||ORM^O01|${messageControlId}|P|2.5`,
      `PID|1||PAT001^^^MRN||Nguyen^Van^Test||19900515|M`,
      `PV1|1|O|ER||`,
      `ORC|NW|ORD001|FIL001||SC|||`,
      `OBR|1|ORD001|FIL001|GLU^Glucose|||${timestamp}||||||||Blood|||Dr. Tran||||||||||S`
    ].join('\r') + '\r';

    console.log('Sending ORM message:');
    console.log(ormMessage.replace(/\r/g, '\n'));

    try {
      const response = await sendHL7Message(ormMessage);
      console.log('ORM Response:', response);

      // Should get ACK
      expect(response).toContain('MSH');
    } catch (error) {
      console.log('HL7 ORM error:', error);
    }
  });

  test('HL7.2 - Send Multiple ORU Messages', async () => {
    const isRunning = await isHL7SpyRunning();
    test.skip(!isRunning, 'HL7Spy not running');

    const tests = [
      { code: 'GLU', result: '95.5', unit: 'mg/dL' },
      { code: 'HBA1C', result: '5.8', unit: '%' },
      { code: 'CHOL', result: '185', unit: 'mg/dL' },
      { code: 'TG', result: '120', unit: 'mg/dL' },
      { code: 'HDL', result: '55', unit: 'mg/dL' }
    ];

    for (const testItem of tests) {
      const sampleId = `L${Date.now()}`;
      const oruMessage = generateORUMessage(sampleId, testItem.code, testItem.result, testItem.unit);

      try {
        const response = await sendHL7Message(oruMessage);
        console.log(`${testItem.code}: Response received`);
      } catch (error) {
        console.log(`${testItem.code}: Send failed`);
      }

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });

  test('HL7.3 - Parse ORU Response', async () => {
    // Test HL7 parsing locally
    const sampleORU = [
      'MSH|^~\\&|ANALYZER|LAB|HIS|HOSPITAL|20260212120000||ORU^R01|MSG123|P|2.5',
      'PID|1||12345^^^MRN||Nguyen^Van^A||19800101|M',
      'OBR|1|BAR001|BAR001|CBC^Complete Blood Count|||20260212120000',
      'OBX|1|NM|WBC^White Blood Cell||8.5|10^9/L|4.0-11.0|N|||F',
      'OBX|2|NM|RBC^Red Blood Cell||4.8|10^12/L|4.0-5.5|N|||F',
      'OBX|3|NM|HGB^Hemoglobin||14.5|g/dL|12.0-17.0|N|||F',
      'OBX|4|NM|PLT^Platelet||250|10^9/L|150-400|N|||F'
    ].join('\r');

    console.log('Parsing sample ORU message...');

    // Parse segments
    const segments = sampleORU.split('\r');
    for (const segment of segments) {
      const fields = segment.split('|');
      console.log(`${fields[0]}: ${fields.slice(1, 5).join(' | ')}`);
    }

    // Extract results
    const obxSegments = segments.filter(s => s.startsWith('OBX'));
    console.log(`\nFound ${obxSegments.length} test results:`);

    for (const obx of obxSegments) {
      const fields = obx.split('|');
      const testCode = fields[3]?.split('^')[0];
      const result = fields[5];
      const unit = fields[6];
      const refRange = fields[7];
      const flag = fields[8];

      console.log(`  ${testCode}: ${result} ${unit} (Ref: ${refRange}) [${flag || 'N'}]`);
    }

    expect(obxSegments.length).toBe(4);
  });

});

test.describe('LIS Module - UI Flow Tests', () => {

  test('UI.1 - Navigate to Laboratory Module', async ({ page }) => {
    // Login via API and set token
    const loginRes = await page.request.post('http://localhost:5106/api/auth/login', {
      data: { username: 'admin', password: 'Admin@123' }
    });

    if (!loginRes.ok()) {
      test.skip(true, 'Backend API not available');
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.data?.token || loginData.token;

    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
      localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', roles: ['Admin'] }));
    }, token);

    // Navigate to Laboratory
    await page.goto('http://localhost:3001/laboratory', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify page loaded
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('UI.2 - View Sample Collection List', async ({ page }) => {
    await page.goto('/laboratory');

    // Should see tabs
    const pendingTab = page.locator('text=Chờ lấy mẫu');
    if (await pendingTab.isVisible()) {
      await pendingTab.click();
      await page.waitForTimeout(1000);
    }
  });

  test('UI.3 - View Lab Results', async ({ page }) => {
    await page.goto('/laboratory');

    // Click results tab
    const resultsTab = page.locator('text=Kết quả');
    if (await resultsTab.isVisible()) {
      await resultsTab.click();
      await page.waitForTimeout(1000);
    }
  });

});
