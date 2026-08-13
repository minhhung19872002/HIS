/**
 * NangCap24 DEEP workflow test — PRODUCTION (pre-deploy verification cho khách).
 *
 * Khác nangcap24-functional (chỉ render + data): file này gọi workflow THẬT của
 * từng chức năng [24] end-to-end và assert kết quả nghiệp vụ:
 *  - Bank/VietQR: list bank → tạo GD → confirm → verify paid + receipt
 *  - HL7 queue: enqueue → get → retry → search counts
 *  - DICOM study log: log → timeline → search
 *  - DICOM auto-send: tạo rule → list → send → transmissions → stats → xóa rule
 *  - EMR cloud sync: sync record → logs → status
 *  - EMR HL7 export: export → verify MSH segment
 *  - Inspector portal: login sai/đúng → records → detail
 *  - Biometric: register-begin → credentials
 *
 * Run:
 *   npx playwright test e2e-prod/nangcap24-deep.spec.ts \
 *     --config=playwright.prod.config.ts --workers=1 --reporter=list
 */
import { test, expect, APIRequestContext } from '@playwright/test';

const API = process.env.PROD_API_URL || 'https://his-api.thankfulcoast-bd0486a9.southeastasia.azurecontainerapps.io/api';

let adminToken = '';
let inspectorToken = '';
let patientId = '';
let medicalRecordId = '';

async function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  const r = await request.post(`${API}/auth/login`, { data: { username: 'admin', password: 'Admin@123' } });
  expect(r.ok(), 'admin login phải OK').toBeTruthy();
  adminToken = (await r.json())?.data?.token;
  expect(adminToken).toBeTruthy();

  // patient id để test bank payment + biometric
  const ps = await request.get(`${API}/reception/patients/search?keyword=Nguy%E1%BB%85n&pageSize=5`, { headers: await authHeaders(adminToken) });
  if (ps.ok()) {
    const body = await ps.json();
    const arr = Array.isArray(body) ? body : (body.items || body.data || []);
    if (arr.length) patientId = arr[0].patientId || arr[0].id;
  }
});

// ============ GAP 2 — Cổng thanh tra BHXH (login + records + detail) ============
test('Gap2 Inspector: login sai bị từ chối', async ({ request }) => {
  const r = await request.post(`${API}/inspector-portal/login`, { data: { username: 'thanhtra01', password: 'SAI_MAT_KHAU' } });
  const j = await r.json();
  expect(j.success, 'login sai phải success=false').toBeFalsy();
});

test('Gap2 Inspector: login đúng → có token + tra cứu hồ sơ + xem chi tiết', async ({ request }) => {
  const r = await request.post(`${API}/inspector-portal/login`, { data: { username: 'thanhtra01', password: 'Inspector@123' } });
  const j = await r.json();
  expect(j.success, 'login đúng phải success=true').toBeTruthy();
  inspectorToken = j.token;
  expect(inspectorToken).toBeTruthy();

  const recs = await request.get(`${API}/inspector-portal/records?pageIndex=1&pageSize=10`, { headers: await authHeaders(inspectorToken) });
  expect(recs.ok(), 'records phải 200').toBeTruthy();
  const rj = await recs.json();
  expect(rj.totalCount, 'phải có hồ sơ để giám định').toBeGreaterThan(0);
  expect(rj.items.length).toBeGreaterThan(0);
  medicalRecordId = rj.items[0].medicalRecordId;

  const detail = await request.get(`${API}/inspector-portal/records/${medicalRecordId}`, { headers: await authHeaders(inspectorToken) });
  expect(detail.ok(), 'chi tiết hồ sơ phải 200').toBeTruthy();
  const dj = await detail.json();
  expect(dj.medicalRecordId).toBe(medicalRecordId);
  expect(dj.patientName, 'chi tiết phải có tên BN').toBeTruthy();
});

// ============ GAP 8 — Bank/VietQR payment (tạo → confirm → paid + receipt) ============
test('Gap8 Bank: list 5 ngân hàng VN', async ({ request }) => {
  const r = await request.get(`${API}/payment/bank/list`, { headers: await authHeaders(adminToken) });
  expect(r.ok()).toBeTruthy();
  const banks = await r.json();
  const codes = banks.map((b: any) => b.code);
  expect(codes).toEqual(expect.arrayContaining(['bidv', 'vcb', 'agribank', 'vietinbank', 'msb']));
});

test('Gap8 Bank: tạo GD VietQR → confirm → status paid + sinh receipt', async ({ request }) => {
  test.skip(!patientId, 'không lấy được patientId');
  const create = await request.post(`${API}/payment/create-url`, {
    headers: await authHeaders(adminToken),
    data: { Provider: 'bidv', PatientId: patientId, Amount: 555000, OrderType: 'billing', OrderInfo: 'Test deploy VietQR', BankCode: 'bidv' },
  });
  expect(create.ok(), 'create-url phải OK').toBeTruthy();
  const cj = await create.json();
  const txnId = cj.transactionId || cj.id;
  expect(txnId, 'phải trả transaction id').toBeTruthy();

  const confirm = await request.post(`${API}/payment/bank/confirm`, {
    headers: await authHeaders(adminToken),
    data: { TransactionId: txnId, BankReference: 'FT-DEPLOY-TEST', Note: 'Đối soát test trước deploy' },
  });
  expect(confirm.ok(), 'confirm phải OK (đã fix FK_Receipts_Users_Cashier)').toBeTruthy();
  const conf = await confirm.json();
  expect(conf.status, 'sau confirm status=1 (đã thanh toán)').toBe(1);

  const verify = await request.get(`${API}/payment/transactions/${txnId}`, { headers: await authHeaders(adminToken) });
  const vj = await verify.json();
  expect(vj.status).toBe(1);
  expect(vj.receiptId, 'confirm phải sinh Receipt liên kết').toBeTruthy();
});

// ============ GAP 6 — HL7 message queue (enqueue → get → retry → search) ============
test('Gap6 HL7: enqueue → get payload → retry → search theo status', async ({ request }) => {
  const enq = await request.post(`${API}/hl7-queue/demo-enqueue`, {
    headers: await authHeaders(adminToken),
    data: { Direction: 'outbound', Source: 'HIS', Target: 'RIS', MessageType: 'ORM^O01', Payload: 'MSH|^~\\&|HIS|BV|RIS|BV|...|||ORM^O01|DEPLOYTEST|P|2.5\r' },
  });
  expect(enq.ok()).toBeTruthy();
  const msg = await enq.json();
  expect(msg.id).toBeTruthy();
  expect(msg.status, 'msg mới phải pending').toBe('pending');

  const get = await request.get(`${API}/hl7-queue/${msg.id}`, { headers: await authHeaders(adminToken) });
  expect(get.ok()).toBeTruthy();
  expect((await get.json()).payload, 'detail phải có payload').toContain('MSH');

  const retry = await request.post(`${API}/hl7-queue/${msg.id}/retry`, { headers: await authHeaders(adminToken) });
  expect(retry.ok(), 'retry phải OK').toBeTruthy();
  expect(['sent', 'failed', 'retrying']).toContain((await retry.json()).status);

  const search = await request.get(`${API}/hl7-queue?pageSize=50`, { headers: await authHeaders(adminToken) });
  const sj = await search.json();
  expect(sj.totalCount, 'queue phải có message').toBeGreaterThan(0);
});

// ============ GAP 7 — DICOM study activity log (log → timeline → search) ============
test('Gap7 DICOM log: ghi log → timeline có entry → search có totalCount', async ({ request }) => {
  const uid = `1.2.840.DEPLOYTEST.${Date.now()}`;
  const log = await request.post(`${API}/dicom-study-log/log`, {
    headers: await authHeaders(adminToken),
    data: { StudyInstanceUid: uid, Action: 'viewed', ActionDetails: 'Deploy test xem ảnh', MachineName: 'WS-TEST' },
  });
  expect([200, 204]).toContain(log.status());

  const tl = await request.get(`${API}/dicom-study-log/study/${uid}`, { headers: await authHeaders(adminToken) });
  expect(tl.ok()).toBeTruthy();
  const tlj = await tl.json();
  expect(tlj.length, 'timeline của study vừa log phải có >=1').toBeGreaterThan(0);
  expect(tlj[0].action).toBe('viewed');

  const search = await request.get(`${API}/dicom-study-log?pageSize=10`, { headers: await authHeaders(adminToken) });
  expect((await search.json()).totalCount).toBeGreaterThan(0);
});

// ============ GAP 5 — DICOM auto-send (rule CRUD + send + transmissions + stats) ============
test('Gap5 Auto-send: tạo rule → list → gửi → transmissions → stats → xóa rule', async ({ request }) => {
  // cần 1 remote PACS server
  let serverId = '';
  const srv = await request.get(`${API}/RISComplete/dicom/remote-servers`, { headers: await authHeaders(adminToken) });
  if (srv.ok()) {
    const list = await srv.json();
    if (list.length) serverId = list[0].id;
  }
  if (!serverId) {
    const mk = await request.post(`${API}/RISComplete/dicom/remote-servers`, {
      headers: await authHeaders(adminToken),
      data: { Name: 'PACS Test Deploy', AeTitle: 'TEST_PACS', Host: '10.0.0.99', Port: 4242, IsActive: true },
    });
    serverId = (await mk.json()).id;
  }
  expect(serverId, 'phải có remote PACS server').toBeTruthy();

  const create = await request.post(`${API}/dicom-autosend/rules`, {
    headers: await authHeaders(adminToken),
    data: { RuleName: 'Rule deploy test', Modality: 'CT', DestinationServerId: serverId, EncryptBeforeSend: true, TriggerType: 'on_arrival', Priority: 3, IsActive: true },
  });
  expect(create.ok(), 'tạo rule phải OK').toBeTruthy();
  const ruleId = (await create.json()).id;
  expect(ruleId).toBeTruthy();

  const list = await request.get(`${API}/dicom-autosend/rules`, { headers: await authHeaders(adminToken) });
  const rules = await list.json();
  expect(rules.some((r: any) => r.id === ruleId), 'rule vừa tạo phải xuất hiện trong list').toBeTruthy();

  // gửi (C-STORE thật có thể done/failed tuỳ Orthanc, miễn tạo transmission log)
  const send = await request.post(`${API}/dicom-autosend/send`, {
    headers: await authHeaders(adminToken),
    data: { StudyInstanceUid: '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463', DestinationServerId: serverId, Encrypt: false },
  });
  expect(send.ok(), 'send phải trả 200 (transmission log)').toBeTruthy();
  expect((await send.json()).status, 'transmission phải có status').toBeTruthy();

  const trans = await request.get(`${API}/dicom-autosend/transmissions?pageSize=20`, { headers: await authHeaders(adminToken) });
  expect(trans.ok()).toBeTruthy();

  const from = '2026-01-01', to = '2026-12-31';
  const stats = await request.get(`${API}/dicom-autosend/stats?from=${from}&to=${to}`, { headers: await authHeaders(adminToken) });
  expect(stats.ok()).toBeTruthy();
  expect((await stats.json()).totalTransmissions, 'stats phải đếm transmissions').toBeGreaterThan(0);

  // cleanup rule test
  const del = await request.delete(`${API}/dicom-autosend/rules/${ruleId}`, { headers: await authHeaders(adminToken) });
  expect([200, 204]).toContain(del.status());
});

// ============ GAP 4 — EMR cloud sync (sync → logs → status) ============
test('Gap4 Cloud sync: đồng bộ hồ sơ → logs → status', async ({ request }) => {
  test.skip(!medicalRecordId, 'chưa có medicalRecordId (cần inspector login trước)');
  const sync = await request.post(`${API}/emr/cloud-sync/sync`, {
    headers: await authHeaders(adminToken),
    data: { MedicalRecordId: medicalRecordId, FileTypes: ['signed_xml', 'hl7', 'pdf'], SyncToDr: true },
  });
  expect(sync.ok(), 'sync phải OK').toBeTruthy();
  const sj = await sync.json();
  expect(sj.totalFiles, 'phải đồng bộ >=1 file').toBeGreaterThan(0);

  const logs = await request.get(`${API}/emr/cloud-sync/logs?pageSize=20`, { headers: await authHeaders(adminToken) });
  expect(logs.ok()).toBeTruthy();

  const status = await request.get(`${API}/emr/cloud-sync/status`, { headers: await authHeaders(adminToken) });
  expect(status.ok()).toBeTruthy();
});

// ============ GAP 3 — EMR HL7 export (export → verify MSH) ============
test('Gap3 HL7 export: xuất HSBA ra HL7 → có segment MSH', async ({ request }) => {
  test.skip(!medicalRecordId, 'chưa có medicalRecordId');
  const exp = await request.post(`${API}/emr/hl7/export`, {
    headers: await authHeaders(adminToken),
    data: { MedicalRecordId: medicalRecordId },
  });
  expect(exp.ok(), 'export phải OK').toBeTruthy();
  const ej = await exp.json();
  expect(ej.hl7Content, 'HL7 phải có segment MSH').toContain('MSH');
  expect(ej.messageCount).toBeGreaterThan(0);
});

// ============ GAP 1 — Biometric WebAuthn (register-begin → credentials) ============
test('Gap1 Biometric: register-begin trả challenge + list credentials', async ({ request }) => {
  test.skip(!patientId, 'không lấy được patientId');
  const begin = await request.post(`${API}/biometric/register-begin`, {
    headers: await authHeaders(adminToken),
    data: { PatientId: patientId, OwnerType: 'patient', OwnerName: 'BN Test', DeviceName: 'Test sensor' },
  });
  expect(begin.ok(), 'register-begin phải OK').toBeTruthy();
  const bj = await begin.json();
  expect(bj.challenge, 'phải trả challenge WebAuthn').toBeTruthy();
  expect(bj.rpId, 'phải trả rpId').toBeTruthy();

  const creds = await request.get(`${API}/biometric/credentials/${patientId}`, { headers: await authHeaders(adminToken) });
  expect(creds.ok(), 'list credentials phải 200').toBeTruthy();
  // Lưu ý: ký số sinh trắc đầy đủ cần thiết bị WebAuthn thật (vân tay/Windows Hello).
});
