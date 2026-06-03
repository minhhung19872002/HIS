import { test, expect, request } from '@playwright/test';

const API = 'http://localhost:5106/api';

let token = '';
let patientId = '';

test.beforeAll(async () => {
  const ctx = await request.newContext();
  const login = await ctx.post(`${API}/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const body = await login.json();
  token = body.data?.token || body.token;

  const patients = await ctx.get(`${API}/reception/patients/search?keyword=&pageIndex=0&pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const pBody = await patients.json();
  const items = pBody.data?.items || pBody.items || pBody.data || [];
  patientId = Array.isArray(items) && items.length > 0 ? items[0].id : '';
});

test.describe('Business Alert Rules Catalog', () => {
  test('GET /rules returns 39 rules', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${API}/business-alerts/rules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const rules = body.data || body;
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThanOrEqual(39);
  });
});

test.describe('Rule 35: Blood Type Mismatch', () => {
  test('returns 200 with alert structure', async () => {
    test.skip(!patientId, 'No patient found');
    const ctx = await request.newContext();
    const res = await ctx.get(`${API}/business-alerts/check/blood-type/${patientId}?bloodType=O&rhFactor=Positive`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data || body;
    expect(data).toHaveProperty('totalNewAlerts');
    expect(data).toHaveProperty('criticalCount');
  });
});

test.describe('Rule 36: BHYT CLS Daily Limit', () => {
  test('returns warning when exceeding 15/day', async () => {
    test.skip(!patientId, 'No patient found');
    const ctx = await request.newContext();
    const res = await ctx.get(`${API}/business-alerts/check/bhyt-cls-limit/${patientId}?newOrderCount=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data || body;
    expect(data.totalNewAlerts).toBeGreaterThanOrEqual(1);
    expect(data.newAlerts[0].alertCode).toBe('BHYT-36');
  });

  test('returns 0 alerts for small order', async () => {
    test.skip(!patientId, 'No patient found');
    const ctx = await request.newContext();
    const res = await ctx.get(`${API}/business-alerts/check/bhyt-cls-limit/${patientId}?newOrderCount=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data || body;
    expect(data.totalNewAlerts).toBe(0);
  });
});

test.describe('Rule 38: Unfilled Prescriptions', () => {
  test('returns 200 with valid structure', async () => {
    test.skip(!patientId, 'No patient found');
    const ctx = await request.newContext();
    const res = await ctx.get(`${API}/business-alerts/check/unfilled-rx/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data || body;
    expect(data).toHaveProperty('totalNewAlerts');
    expect(typeof data.totalNewAlerts).toBe('number');
  });
});

test.describe('Rule 39: Cost Estimation', () => {
  test('returns patient type and amounts', async () => {
    test.skip(!patientId, 'No patient found');
    const ctx = await request.newContext();
    const res = await ctx.post(`${API}/business-alerts/estimate-cost/${patientId}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: [],
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data || body;
    expect(data).toHaveProperty('patientTypeName');
    expect(data).toHaveProperty('totalAmount');
    expect(data).toHaveProperty('insuranceAmount');
    expect(data).toHaveProperty('patientAmount');
  });
});

test.describe('Pharmacy Expiry Alerts', () => {
  test('GET /on-login returns valid structure', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${API}/pharmacy/expiry-alerts/on-login`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data || body;
    expect(data).toHaveProperty('totalAlerts');
    expect(typeof data.totalAlerts).toBe('number');
  });
});

test.describe('K5 Write Endpoints', () => {
  test('POST /epidemiology/reports/create', async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${API}/write-gap/epidemiology/reports`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { patientName: 'Test E2E', diseaseCode: 'A09', diseaseName: 'Tiêu chảy', status: 'Confirmed' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data || body;
    expect(data).toHaveProperty('id');
  });

  test('POST /inter-hospital/requests/create', async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${API}/write-gap/inter-hospital/requests`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { requestType: 'Consultation', requestingFacility: 'BV Test', receivingFacility: 'BV Dest', urgency: 1, requestDetails: 'E2E test' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data || body;
    expect(data).toHaveProperty('id');
  });

  test('POST /bhxh-audit/sessions/create', async () => {
    const ctx = await request.newContext();
    const res = await ctx.post(`${API}/write-gap/bhxh-audit/sessions`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { periodMonth: 6, periodYear: 2026, notes: 'E2E test session' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const data = body.data || body;
    expect(data).toHaveProperty('id');
  });

  test('GET /booking/doctor-schedule', async () => {
    const ctx = await request.newContext();
    const res = await ctx.get(`${API}/write-gap/booking/doctor-schedule`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
  });
});
