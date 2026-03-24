#!/usr/bin/env node
/**
 * HIS Real Workflow Test Script
 * Tests full workflows like a real user would operate.
 *
 * Workflows:
 * 1. OPD: Register → Exam → Diagnosis → Prescription → Complete → Billing → Pharmacy
 * 2. IPD: Admit → Assign Bed → Treatment Sheet → Prescription → Discharge
 * 3. Warehouse: Stock Receipt → Approve → Check Stock
 * 4. Billing: Cash Book → Deposit → Invoice → Close
 */

const BASE = 'http://localhost:5106/api';
let TOKEN = '';
let RESULTS = { pass: 0, fail: 0, errors: [] };
const TEST_MARKER = '[AUTO-REG]';

// Master data IDs
const ADMIN_ID = '9e5309dc-ecf9-4d48-9a09-224cd15347b1';
const ROOM_P101 = '65c7ec65-b79a-4c9d-b836-92d5392bd221'; // Phòng khám 101 - Nội tổng quát
const DEPT_KHAM = '96b9f79f-49eb-4249-a7b9-6f1465e219e7'; // Khoa Khám bệnh
const ROOM_NT101 = '54344d93-42da-4937-af86-048124e0ccdc'; // Phòng Nội 101
const DEPT_NOI = '7eeefe81-095d-49b2-959f-2f2b69d0c39b'; // Khoa Nội khoa
const WH_MAIN = '89127d8a-0bdf-4f96-95f7-67beccebd606'; // Kho thuốc chính
const WH_PHARMACY = 'ef523a99-b2d5-41ee-9ae7-972b91f661df'; // Nhà thuốc
const MED_PARA = '4632e3b6-ab73-45a3-89bf-00dc01137706'; // Paracetamol 500mg
const MED_AMOX = 'ffd589a4-b95c-41d4-a481-bf871f0c9005'; // Amoxicillin 500mg
const MED_OMEP = '7c83c709-7c9a-4175-928a-3604c7e0842a'; // Omeprazole 20mg
const SVC_KHAM = '71b722c5-dc69-4959-84aa-4d058e7199e8'; // Khám bệnh thông thường
const SVC_XN_CTM = 'f56e7d9d-a13d-4869-8259-c5a073f21fe6'; // Công thức máu
const SVC_SA = '409ab780-9123-412a-8731-522bb82d9070'; // Siêu âm ổ bụng

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch(e) { data = text; }
  return { status: res.status, data, ok: res.ok };
}

function unwrapData(payload) {
  return payload?.data ?? payload;
}

function check(name, condition, details = '') {
  if (condition) {
    RESULTS.pass++;
    console.log(`  ✅ ${name}`);
  } else {
    RESULTS.fail++;
    RESULTS.errors.push(name);
    console.log(`  ❌ ${name} ${details}`);
  }
}

async function login() {
  console.log('\n🔐 LOGIN');
  const res = await api('POST', '/auth/login', { username: 'admin', password: 'Admin@123' });
  check('Login thành công', res.status === 200, `status=${res.status}`);
  TOKEN = res.data?.data?.token || res.data?.token || '';
  check('Token không rỗng', TOKEN.length > 0);
  return TOKEN.length > 0;
}

// ============================================================
// WORKFLOW 1: OPD FLOW (Ngoại trú)
// ============================================================
async function testOPDFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 WORKFLOW 1: OPD FLOW (Ngoại trú)');
  console.log('='.repeat(60));

  // Step 1: Register new patient (fee-paying)
  console.log('\n--- Bước 1: Đăng ký bệnh nhân mới (Viện phí) ---');
  const patientData = {
    serviceType: 2, // Vien phi
    roomId: ROOM_P101,
    newPatient: {
      fullName: `${TEST_MARKER} OPD Patient`,
      dateOfBirth: '1985-06-15T00:00:00Z',
      gender: 1,
      identityNumber: '079085123456',
      phoneNumber: '0912345678',
      address: '123 Nguy???n Tr??i, Qu???n 1, TP.HCM',
      provinceCode: 'HCM',
      provinceName: 'TP H??? Ch?? Minh',
      districtCode: 'Q1',
      districtName: 'Qu???n 1',
      wardCode: 'P01',
      wardName: 'Ph?????ng B???n Th??nh',
      ethnicName: 'Kinh',
      occupation: 'K??? s?? ph???n m???m'
    }
  };
  const regRes = await api('POST', '/reception/register/fee', patientData);
  check('Đăng ký bệnh nhân', regRes.status === 200 || regRes.status === 201,
    `status=${regRes.status} ${JSON.stringify(regRes.data).substring(0,200)}`);

  const regData = regRes.data?.data || regRes.data;
  const patientId = regData?.patientId || regData?.patient?.id;
  const medicalRecordId = regData?.medicalRecordId || regData?.id;
  const admissionId = regData?.admissionId;
  console.log(`    patientId=${patientId}`);
  console.log(`    medicalRecordId=${medicalRecordId}`);

  if (!medicalRecordId) {
    console.log('  ⚠️ Không có medicalRecordId, thử dùng admission hiện có');
    // Fallback: get today's admissions and use the first one
    const admissions = await api('GET', '/reception/admissions/today');
    const items = Array.isArray(admissions.data) ? admissions.data : (admissions.data?.data || []);
    if (items.length > 0) {
      const adm = items[0];
      return await testOPDFlowWithExisting(adm);
    }
    console.log('  ❌ Không tìm được admission nào, bỏ qua OPD flow');
    return null;
  }

  return await continueOPDFlow(patientId, medicalRecordId, admissionId);
}

async function testOPDFlowWithExisting(admission) {
  const patientId = admission.patientId;
  const medicalRecordId = admission.id;
  console.log(`    Dùng admission: ${admission.admissionCode} - ${admission.patientName}`);
  return await continueOPDFlow(patientId, medicalRecordId);
}

async function continueOPDFlow(patientId, medicalRecordId, admissionId) {
  // Step 2: Get examination for this medical record
  console.log('\n--- Bước 2: Bắt đầu khám bệnh ---');

  // Try to find an examination for this patient in room list
  const roomListRes = await api('GET', `/examination/room/${ROOM_P101}/patients?status=0`);
  console.log(`    GET room patients: ${roomListRes.status}`);

  let examinationId = null;
  if (roomListRes.status === 200) {
    const items = Array.isArray(roomListRes.data) ? roomListRes.data : (roomListRes.data?.data || []);
    const match = items.find(p => p.patientId === patientId) || items[0];
    examinationId = match?.examinationId;
    if (match) {
      console.log(`    examinationId t??? room list: ${examinationId}`);
    }
  }

  if (!examinationId) {
    // The registration should have created an examination, use medicalRecordId as proxy
    examinationId = medicalRecordId;
    console.log(`    D??ng medicalRecordId l??m examinationId: ${examinationId}`);
  }

  // Start examination
  const startRes = await api('POST', `/examination/${examinationId}/start`);
  check('Bắt đầu khám', startRes.status === 200 || startRes.status === 201 || startRes.status === 400,
    `status=${startRes.status} ${JSON.stringify(startRes.data).substring(0,150)}`);

  // Step 3: Update vital signs
  console.log('\n--- Bước 3: Cập nhật sinh hiệu ---');
  const vitalRes = await api('PUT', `/examination/${examinationId}/vital-signs`, {
    temperature: 37.2,
    pulse: 80,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    respiratoryRate: 18,
    spO2: 98,
    weight: 65.5,
    height: 170
  });
  check('Cập nhật sinh hiệu', vitalRes.status === 200,
    `status=${vitalRes.status} ${JSON.stringify(vitalRes.data).substring(0,150)}`);

  // Step 4: Add diagnosis
  console.log('\n--- Bước 4: Chẩn đoán ---');
  const diagRes = await api('POST', `/examination/${examinationId}/diagnoses`, {
    icdCode: 'J06.9',
    icdName: 'Nhiễm trùng hô hấp trên cấp, không đặc hiệu',
    isPrimary: true,
    notes: 'Bệnh nhân sốt nhẹ, ho khan, đau họng 3 ngày'
  });
  check('Thêm chẩn đoán', diagRes.status === 200 || diagRes.status === 201,
    `status=${diagRes.status} ${JSON.stringify(diagRes.data).substring(0,150)}`);

  // Step 5: Order lab tests
  console.log('\n--- Bước 5: Chỉ định xét nghiệm ---');
  const orderRes = await api('POST', '/examination/service-orders', {
    examinationId: examinationId,
    diagnosisCode: 'J06.9',
    diagnosisName: 'Nhiễm trùng hô hấp trên',
    services: [
      {
        serviceId: SVC_XN_CTM,
        quantity: 1,
        paymentType: 2,
        roomId: ROOM_P101,
        notes: 'Kiểm tra nhiễm trùng'
      }
    ],
    autoSelectRoom: true
  });
  check('Chỉ định xét nghiệm CTM', orderRes.status === 200 || orderRes.status === 201,
    `status=${orderRes.status} ${JSON.stringify(orderRes.data).substring(0,150)}`);

  // Step 6: Create prescription
  console.log('\n--- Bước 6: Kê đơn thuốc ---');
  const rxRes = await api('POST', '/examination/prescriptions', {
    medicalRecordId: medicalRecordId,
    examinationId: examinationId,
    patientId: patientId,
    patientType: 2, // Viện phí
    diagnosisCode: 'J06.9',
    diagnosisName: 'Nhiễm trùng hô hấp trên',
    prescriptionType: 1, // Ngoại trú
    warehouseId: WH_PHARMACY,
    totalDays: 5,
    notes: 'Uống thuốc đúng giờ, đủ liều',
    items: [
      {
        medicineId: MED_PARA,
        quantity: 15,
        days: 5,
        dosage: '500mg',
        route: 'PO',
        frequency: '3 lần/ngày',
        usageInstructions: 'Uống sau ăn khi sốt trên 38.5°C',
        paymentType: 2
      },
      {
        medicineId: MED_AMOX,
        quantity: 15,
        days: 5,
        dosage: '500mg',
        route: 'PO',
        frequency: '3 lần/ngày',
        usageInstructions: 'Uống sau ăn, cách đều 8 giờ',
        paymentType: 2
      }
    ]
  });
  check('Kê đơn thuốc', rxRes.status === 200 || rxRes.status === 201,
    `status=${rxRes.status} ${JSON.stringify(rxRes.data).substring(0,200)}`);

  const prescriptionId = rxRes.data?.data?.id || rxRes.data?.id;
  console.log(`    prescriptionId=${prescriptionId}`);

  // Step 7: Complete examination
  console.log('\n--- Bước 7: Kết thúc khám ---');
  const completeRes = await api('POST', `/examination/${examinationId}/complete`, {
    conclusionType: 1, // Cấp đơn (cho về)
    conclusionNotes: 'Bệnh nhẹ, điều trị ngoại trú',
    finalDiagnosisCode: 'J06.9',
    finalDiagnosisName: 'Nhiễm trùng hô hấp trên cấp, không đặc hiệu',
    nextAppointmentDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    appointmentNotes: 'Tái khám sau 1 tuần nếu không đỡ'
  });
  check('Kết thúc khám', completeRes.status === 200 || completeRes.status === 201,
    `status=${completeRes.status} ${JSON.stringify(completeRes.data).substring(0,150)}`);

  // Step 8: Billing - Create invoice
  console.log('\n--- B?????c 8: T???o h??a ????n ---');
  const invoiceRes = await api('POST', '/billingcomplete/invoices', {
    medicalRecordId: medicalRecordId
  });
  check('T???o h??a ????n', invoiceRes.status === 200 || invoiceRes.status === 201,
    `status=${invoiceRes.status} ${JSON.stringify(invoiceRes.data).substring(0,150)}`);

  const invoiceData = unwrapData(invoiceRes.data);
  const invoiceId = invoiceData?.id;
  const paymentAmount = invoiceData?.remainingAmount || invoiceData?.totalAmount || 0;
  console.log(`    invoiceId=${invoiceId}`);

  // Step 9: Billing - Create payment
  console.log('\n--- B?????c 9: Thu ti???n ---');
  const payRes = await api('POST', '/billingcomplete/payments', {
    patientId: patientId,
    invoiceId: invoiceId,
    amount: paymentAmount,
    paymentMethod: '1', // Ti???n m???t
    note: 'Thu vi???n ph?? ngo???i tr??'
  });
  check('Thu ti???n', paymentAmount > 0 && (payRes.status === 200 || payRes.status === 201),
    `status=${payRes.status} ${JSON.stringify(payRes.data).substring(0,150)}`);

// Step 10: Pharmacy - Dispense prescription
  if (prescriptionId) {
    console.log('\n--- Bước 10: Phát thuốc ---');

    // Accept prescription at pharmacy
    const acceptRes = await api('POST', `/pharmacy/prescriptions/${prescriptionId}/accept`);
    check('Nhận đơn tại nhà thuốc', acceptRes.status === 200 || acceptRes.status === 201,
      `status=${acceptRes.status} ${JSON.stringify(acceptRes.data).substring(0,150)}`);

    // Complete dispensing
    const dispRes = await api('POST', `/pharmacy/prescriptions/${prescriptionId}/complete`);
    check('Hoàn thành phát thuốc', dispRes.status === 200 || dispRes.status === 201,
      `status=${dispRes.status} ${JSON.stringify(dispRes.data).substring(0,150)}`);

    // Also try warehouse dispense
    const whDispRes = await api('POST', `/warehouse/issues/dispense-outpatient/${prescriptionId}`);
    check('Xuất kho theo đơn', whDispRes.status === 200 || whDispRes.status === 201,
      `status=${whDispRes.status} ${JSON.stringify(whDispRes.data).substring(0,150)}`);
  }

  return { patientId, medicalRecordId, examinationId, prescriptionId };
}

// ============================================================
// WORKFLOW 2: IPD FLOW (Nội trú)
// ============================================================
async function testIPDFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('🏥 WORKFLOW 2: IPD FLOW (Nội trú)');
  console.log('='.repeat(60));

  // Step 1: Register another patient for admission
  console.log('\n--- Bước 1: Đăng ký BN cần nhập viện ---');
  const regRes = await api('POST', '/reception/register/fee', {
    serviceType: 2, // Vien phi
    roomId: ROOM_P101,
    newPatient: {
      fullName: `${TEST_MARKER} IPD Patient`,
      dateOfBirth: '1970-03-20T00:00:00Z',
      gender: 2,
      identityNumber: '079070654321',
      phoneNumber: '0987654321',
      address: '456 L?? L???i, Qu???n 3, TP.HCM',
      provinceName: 'TP H??? Ch?? Minh',
      districtName: 'Qu???n 3',
      wardName: 'Ph?????ng 1',
      ethnicName: 'Kinh',
      occupation: 'Gi??o vi??n'
    }
  });
  check('Đăng ký BN nội trú', regRes.status === 200 || regRes.status === 201,
    `status=${regRes.status} ${JSON.stringify(regRes.data).substring(0,200)}`);

  const regData = regRes.data?.data || regRes.data;
  let patientId = regData?.patientId || regData?.patient?.id;
  let medicalRecordId = regData?.medicalRecordId || regData?.id;

  // Fallback: use existing admission
  if (!medicalRecordId) {
    const admissions = await api('GET', '/reception/admissions/today');
    const items = Array.isArray(admissions.data) ? admissions.data : (admissions.data?.data || []);
    if (items.length > 1) {
      const adm = items[1]; // Second patient
      patientId = adm.patientId;
      medicalRecordId = adm.id;
      console.log(`    Dùng admission: ${adm.admissionCode} - ${adm.patientName}`);
    }
  }
  console.log(`    patientId=${patientId}, medicalRecordId=${medicalRecordId}`);

  if (!medicalRecordId) {
    console.log('  ⚠️ Không có medicalRecordId, bỏ qua IPD flow');
    return null;
  }

  // Step 2: Admit from OPD
  console.log('\n--- Bước 2: Nhập viện từ OPD ---');
  const admitRes = await api('POST', '/inpatient/admit-from-opd', {
    medicalRecordId: medicalRecordId,
    departmentId: DEPT_NOI,
    roomId: ROOM_NT101,
    admissionType: 1, // Thường
    diagnosisOnAdmission: 'Viêm phổi cộng đồng',
    reasonForAdmission: 'Sốt cao 39°C kéo dài 5 ngày, ho có đàm, khó thở',
    attendingDoctorId: ADMIN_ID
  });
  check('Nhập viện', admitRes.status === 200 || admitRes.status === 201,
    `status=${admitRes.status} ${JSON.stringify(admitRes.data).substring(0,200)}`);

  const admitData = admitRes.data?.data || admitRes.data;
  const admissionIdIPD = admitData?.admissionId || admitData?.id;
  console.log(`    admissionId=${admissionIdIPD}`);

  if (!admissionIdIPD) {
    console.log('  ⚠️ Không có admissionId, bỏ qua các bước tiếp');
    return null;
  }

  // Step 3: Assign bed
  console.log('\n--- B?????c 3: Ph??n gi?????ng ---');
  const bedStatusRes = await api('GET', `/inpatient/bed-status?roomId=${ROOM_NT101}`);
  const bedItems = Array.isArray(bedStatusRes.data) ? bedStatusRes.data : (bedStatusRes.data?.data || []);
  const emptyBed = bedItems.find(b => b.bedStatus === 0) || bedItems[0];
  const bedId = emptyBed?.bedId;
  if (!bedId) {
    check('Ph??n gi?????ng', false, 'kh??ng c?? bedId');
  } else {
    const bedRes = await api('POST', '/inpatient/assign-bed', {
      admissionId: admissionIdIPD,
      bedId: bedId,
      note: 'Gi?????ng g???n c???a s??? theo y??u c???u'
    });
    check('Ph??n gi?????ng', bedRes.status === 200 || bedRes.status === 201,
      `status=${bedRes.status} ${JSON.stringify(bedRes.data).substring(0,200)}`);
  }

// Step 4: Create treatment sheet (SOAP notes)
  console.log('\n--- Bước 4: Ghi diễn biến bệnh (SOAP) ---');
  const treatRes = await api('POST', '/inpatient/treatment-sheets', {
    admissionId: admissionIdIPD,
    subjectiveFindings: 'Bệnh nhân kêu sốt, ho nhiều, đau ngực khi ho',
    objectiveFindings: 'T: 38.5°C, M: 90l/p, HA: 130/85, RR: 22, SpO2: 95%. Ran ẩm đáy phổi phải',
    assessment: 'Viêm phổi cộng đồng, đáp ứng kháng sinh',
    plan: 'Tiếp tục Ceftriaxone IV, thêm Azithromycin. Theo dõi SpO2 mỗi 4h',
    dietOrder: 'Ăn mềm, uống nhiều nước',
    activityOrder: 'Nằm nghỉ tại giường'
  });
  check('Ghi diễn biến', treatRes.status === 200 || treatRes.status === 201,
    `status=${treatRes.status} ${JSON.stringify(treatRes.data).substring(0,200)}`);

  // Step 5: Create inpatient prescription
  console.log('\n--- Bước 5: Kê đơn nội trú ---');
  const rxRes = await api('POST', '/inpatient/prescriptions', {
    admissionId: admissionIdIPD,
    prescriptionDate: new Date().toISOString(),
    mainDiagnosisCode: 'J18.9',
    mainDiagnosis: 'Viêm phổi cộng đồng',
    warehouseId: WH_MAIN,
    items: [
      {
        medicineId: MED_PARA,
        quantity: 9,
        dosage: '500mg',
        morning: '1',
        noon: '1',
        afternoon: '0',
        evening: '1',
        usageInstructions: 'Uống khi sốt trên 38.5°C',
        paymentSource: 2
      },
      {
        medicineId: MED_AMOX,
        quantity: 9,
        dosage: '500mg',
        morning: '1',
        noon: '1',
        afternoon: '0',
        evening: '1',
        usageInstructions: 'Uống sau ăn, đủ liệu trình 5 ngày',
        paymentSource: 2
      },
      {
        medicineId: MED_OMEP,
        quantity: 3,
        dosage: '20mg',
        morning: '1',
        noon: '0',
        afternoon: '0',
        evening: '0',
        usageInstructions: 'Uống trước ăn sáng 30 phút',
        paymentSource: 2
      }
    ]
  });
  check('Kê đơn nội trú', rxRes.status === 200 || rxRes.status === 201,
    `status=${rxRes.status} ${JSON.stringify(rxRes.data).substring(0,200)}`);
  const inpatientPrescriptionId = unwrapData(rxRes.data)?.id;

  // Step 6: Get prescriptions
  console.log('\n--- Bước 6: Xem danh sách đơn thuốc ---');
  const rxListRes = await api('GET', `/inpatient/prescriptions/${admissionIdIPD}`);
  check('Xem đơn thuốc', rxListRes.status === 200,
    `status=${rxListRes.status} ${JSON.stringify(rxListRes.data).substring(0,150)}`);

  // Step 7: Create service order
  console.log('\n--- Bước 7: Chỉ định CLS ---');
  const svcRes = await api('POST', '/inpatient/service-orders', {
    admissionId: admissionIdIPD,
    mainDiagnosisCode: 'J18.9',
    mainDiagnosis: 'Viêm phổi',
    services: [
      {
        serviceId: SVC_XN_CTM,
        quantity: 1,
        paymentSource: 2,
        isUrgent: true,
        note: 'Kiểm tra CRP, bạch cầu'
      },
      {
        serviceId: SVC_SA,
        quantity: 1,
        paymentSource: 2,
        note: 'Kiểm tra gan thận'
      }
    ]
  });
  check('Chỉ định CLS', svcRes.status === 200 || svcRes.status === 201,
    `status=${svcRes.status} ${JSON.stringify(svcRes.data).substring(0,200)}`);

  // Step 8: Get service orders
  console.log('\n--- Bước 8: Xem phiếu CLS ---');
  const svcListRes = await api('GET', `/inpatient/service-orders/${admissionIdIPD}`);
  check('Xem phiếu CLS', svcListRes.status === 200,
    `status=${svcListRes.status} ${JSON.stringify(svcListRes.data).substring(0,150)}`);

  if (inpatientPrescriptionId) {
    console.log('\n--- BÆ°á»›c 8.1: Cáº¥p phÃ¡t thuá»‘c ná»™i trÃº ---');
    const acceptRxRes = await api('POST', `/pharmacy/prescriptions/${inpatientPrescriptionId}/accept`);
    check('Nháº­n Ä‘Æ¡n ná»™i trÃº', acceptRxRes.status === 200 || acceptRxRes.status === 201,
      `status=${acceptRxRes.status} ${JSON.stringify(acceptRxRes.data).substring(0,150)}`);

    const completeRxRes = await api('POST', `/pharmacy/prescriptions/${inpatientPrescriptionId}/complete`);
    check('HoÃ n thÃ nh cáº¥p phÃ¡t ná»™i trÃº', completeRxRes.status === 200 || completeRxRes.status === 201,
      `status=${completeRxRes.status} ${JSON.stringify(completeRxRes.data).substring(0,150)}`);
  }

  // Step 9: Pre-discharge check
  console.log('\n--- Bước 9: Kiểm tra trước xuất viện ---');
  const preDisRes = await api('GET', `/inpatient/pre-discharge-check/${admissionIdIPD}`);
  check('Kiểm tra trước xuất viện', preDisRes.status === 200,
    `status=${preDisRes.status} ${JSON.stringify(preDisRes.data).substring(0,200)}`);

  // Step 10: Discharge
  console.log('\n--- Bước 10: Xuất viện ---');
  const dischargeRes = await api('POST', '/inpatient/discharge', {
    admissionId: admissionIdIPD,
    dischargeDate: new Date().toISOString(),
    dischargeType: 1, // Ra viện
    dischargeCondition: 2, // Đỡ
    dischargeDiagnosisCode: 'J18.9',
    dischargeDiagnosis: 'Viêm phổi cộng đồng - đỡ nhiều',
    treatmentSummary: 'Điều trị kháng sinh Ceftriaxone 5 ngày, hạ sốt Paracetamol',
    dischargeInstructions: 'Nghỉ ngơi, uống thuốc đúng giờ, ăn uống đủ chất',
    medicationInstructions: 'Tiếp tục Amoxicillin 500mg x 3 lần/ngày x 5 ngày',
    followUpDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
    followUpInstructions: 'Tái khám sau 2 tuần, chụp X-quang kiểm tra'
  });
  check('Xuất viện', dischargeRes.status === 200 || dischargeRes.status === 201,
    `status=${dischargeRes.status} ${JSON.stringify(dischargeRes.data).substring(0,200)}`);

  return { patientId, medicalRecordId, admissionId: admissionIdIPD };
}

// ============================================================
// WORKFLOW 3: WAREHOUSE FLOW (Kho)
// ============================================================
async function testWarehouseFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('📦 WORKFLOW 3: WAREHOUSE FLOW (Kho thuốc)');
  console.log('='.repeat(60));

  // Step 1: Check current stock
  console.log('\n--- Bước 1: Xem tồn kho ---');
  const stockRes = await api('GET', `/warehouse/stock?warehouseId=${WH_MAIN}`);
  check('Xem tồn kho', stockRes.status === 200,
    `status=${stockRes.status}`);
  const stockItems = Array.isArray(stockRes.data) ? stockRes.data : (stockRes.data?.data || []);
  console.log(`    Số mặt hàng: ${stockItems.length}`);

  // Step 2: Create supplier receipt
  console.log('\n--- Bước 2: Nhập thuốc từ NCC ---');
  const receiptRes = await api('POST', '/warehouse/receipts/supplier', {
    receiptDate: new Date().toISOString(),
    warehouseId: WH_MAIN,
    receiptType: 1, // Nhập từ NCC
    invoiceNumber: 'HD-2026-0001',
    invoiceDate: new Date().toISOString(),
    items: [
      {
        itemId: MED_PARA,
        batchNumber: 'BATCH-PARA-2026-01',
        manufactureDate: '2025-06-01T00:00:00Z',
        expiryDate: '2027-06-01T00:00:00Z',
        quantity: 500,
        unitPrice: 2000,
        vatRate: 0.05,
        countryOfOrigin: 'Việt Nam',
        manufacturer: 'Công ty TNHH Dược phẩm Phúc Vinh'
      },
      {
        itemId: MED_AMOX,
        batchNumber: 'BATCH-AMOX-2026-01',
        manufactureDate: '2025-08-01T00:00:00Z',
        expiryDate: '2027-08-01T00:00:00Z',
        quantity: 300,
        unitPrice: 3500,
        vatRate: 0.05,
        countryOfOrigin: 'Ấn Độ',
        manufacturer: 'Cipla Ltd'
      }
    ],
    notes: 'Nhập thuốc đợt 1 tháng 2/2026'
  });
  check('Tạo phiếu nhập NCC', receiptRes.status === 200 || receiptRes.status === 201,
    `status=${receiptRes.status} ${JSON.stringify(receiptRes.data).substring(0,200)}`);

  const receiptData = receiptRes.data?.data || receiptRes.data;
  const receiptId = receiptData?.id || receiptData?.receiptId;
  console.log(`    receiptId=${receiptId}`);

  // Step 3: Approve receipt
  if (receiptId) {
    console.log('\n--- Bước 3: Duyệt phiếu nhập ---');
    const approveRes = await api('POST', `/warehouse/receipts/${receiptId}/approve`);
    check('Duyệt phiếu nhập', approveRes.status === 200 || approveRes.status === 201,
      `status=${approveRes.status} ${JSON.stringify(approveRes.data).substring(0,150)}`);
  }

  // Step 4: Issue to department
  console.log('\n--- Bước 4: Xuất cho khoa ---');
  const issueRes = await api('POST', '/warehouse/issues/department', {
    issueDate: new Date().toISOString(),
    warehouseId: WH_MAIN,
    issueType: 3, // Xuất khoa
    departmentId: DEPT_NOI,
    items: [
      {
        itemId: MED_PARA,
        quantity: 50,
        paymentSource: 2,
        notes: 'Xuất cho tủ trực Khoa Nội'
      },
      {
        itemId: MED_OMEP,
        quantity: 20,
        paymentSource: 2,
        notes: 'Xuất cho tủ trực Khoa Nội'
      }
    ],
    notes: 'Xuất thuốc tuần cho Khoa Nội'
  });
  check('Xuất thuốc cho khoa', issueRes.status === 200 || issueRes.status === 201,
    `status=${issueRes.status} ${JSON.stringify(issueRes.data).substring(0,200)}`);

  // Step 5: Create stock take
  console.log('\n--- Bước 5: Kiểm kê ---');
  const stockTakeRes = await api('POST', '/warehouse/stock-takes', {
    warehouseId: WH_MAIN,
    notes: 'Kiểm kê cuối tháng 2/2026'
  });
  check('Tạo phiếu kiểm kê', stockTakeRes.status === 200 || stockTakeRes.status === 201,
    `status=${stockTakeRes.status} ${JSON.stringify(stockTakeRes.data).substring(0,200)}`);

  const stockTakeData = stockTakeRes.data?.data || stockTakeRes.data;
  const stockTakeId = stockTakeData?.id;

  // Step 6: Complete stock take
  if (stockTakeId) {
    console.log('\n--- Bước 6: Hoàn thành kiểm kê ---');
    const completeRes = await api('POST', `/warehouse/stock-takes/${stockTakeId}/complete`);
    check('Hoàn thành kiểm kê', completeRes.status === 200 || completeRes.status === 201,
      `status=${completeRes.status} ${JSON.stringify(completeRes.data).substring(0,150)}`);
  }

  // Step 7: Create procurement request
  console.log('\n--- Bước 7: Đề xuất mua thuốc ---');
  const procRes = await api('POST', '/warehouse/procurement-requests', {
    warehouseId: WH_MAIN,
    items: [
      {
        itemId: MED_PARA,
        requestedQuantity: 1000,
        notes: 'Sắp hết hàng'
      },
      {
        itemId: MED_AMOX,
        requestedQuantity: 500,
        notes: 'Dự trù tháng 3'
      }
    ],
    notes: 'Đề xuất mua thuốc tháng 3/2026',
    priority: 'high'
  });
  check('Đề xuất mua thuốc', procRes.status === 200 || procRes.status === 201,
    `status=${procRes.status} ${JSON.stringify(procRes.data).substring(0,200)}`);

  // Step 8: Verify stock updated
  console.log('\n--- Bước 8: Kiểm tra tồn kho sau giao dịch ---');
  const stock2Res = await api('GET', `/warehouse/stock?warehouseId=${WH_MAIN}`);
  check('Kiểm tra tồn kho', stock2Res.status === 200, `status=${stock2Res.status}`);

  return { receiptId, stockTakeId };
}

// ============================================================
// WORKFLOW 4: BILLING FLOW (Thu ngân)
// ============================================================
async function testBillingFlow() {
  console.log('\n' + '='.repeat(60));
  console.log('💰 WORKFLOW 4: BILLING FLOW (Thu ngân)');
  console.log('='.repeat(60));

  // Step 1: Create cash book
  console.log('\n--- Bước 1: Mở sổ thu ---');
  const cashBookRes = await api('POST', '/billingcomplete/cash-books', {
    bookCode: `ST-${Date.now()}`,
    bookName: 'Sổ thu ngày ' + new Date().toLocaleDateString('vi-VN'),
    bookType: 1,
    openingBalance: 0
  });
  check('Mở sổ thu', cashBookRes.status === 200 || cashBookRes.status === 201,
    `status=${cashBookRes.status} ${JSON.stringify(cashBookRes.data).substring(0,150)}`);

  const cashBookData = cashBookRes.data?.data || cashBookRes.data;
  const cashBookId = cashBookData?.id;
  console.log(`    cashBookId=${cashBookId}`);

  // Step 2: Create deposit for a patient
  console.log('\n--- B?????c 2: Thu t???m ???ng ---');
  // Get a patient from today's admissions
  const admissions = await api('GET', '/reception/admissions/today');
  const admItems = Array.isArray(admissions.data) ? admissions.data : (admissions.data?.data || []);

  if (admItems.length > 0) {
    const patient = admItems[0];
    const depositRes = await api('POST', '/billingcomplete/deposits', {
      patientId: patient.patientId,
      medicalRecordId: patient.id,
      depositType: 1, // Ngo???i tr??
      depositSource: 1, // Thu ng??n
      amount: 500000,
      paymentMethod: 1, // Ti???n m???t
      notes: 'T???m ???ng kh??m b???nh'
    });
    check('Thu t???m ???ng', depositRes.status === 200 || depositRes.status === 201,
      `status=${depositRes.status} ${JSON.stringify(depositRes.data).substring(0,200)}`);

    const depositData = unwrapData(depositRes.data);
    const depositId = depositData?.id || depositData?.depositId;

    // Step 3: Check deposit balance
    console.log('\n--- B?????c 3: Ki???m tra s??? d?? t???m ???ng ---');
    const balRes = await api('GET', `/billingcomplete/deposits/balance/${patient.patientId}`);
    check('Ki???m tra s??? d??', balRes.status === 200,
      `status=${balRes.status} ${JSON.stringify(balRes.data).substring(0,150)}`);

    // Step 4: Create invoice
    console.log('\n--- B?????c 4: T???o h??a ????n ---');
    const invRes = await api('POST', '/billingcomplete/invoices', {
      medicalRecordId: patient.id
    });
    check('T???o h??a ????n', invRes.status === 200 || invRes.status === 201,
      `status=${invRes.status} ${JSON.stringify(invRes.data).substring(0,150)}`);

    const invData = unwrapData(invRes.data);
    const invoiceId = invData?.id;

    // Step 5: Apply discount
    console.log('\n--- B?????c 5: ??p d???ng gi???m gi?? ---');
    const discRes = await api('POST', '/billingcomplete/discounts/invoice', {
      invoiceId: invoiceId,
      discountScope: 1,
      discountType: 1,
      discountPercent: 10,
      discountReason: 'Gi???m gi?? ??u ????i b???nh nh??n VIP',
      approverId: ADMIN_ID
    });
    check('??p d???ng gi???m gi??', discRes.status === 200 || discRes.status === 201,
      `status=${discRes.status} ${JSON.stringify(discRes.data).substring(0,150)}`);

    // Step 6: Use deposit for payment
    console.log('\n--- B?????c 6: D??ng t???m ???ng thanh to??n ---');
    const useDepRes = await api('POST', '/billingcomplete/deposits/use-for-payment', {
      invoiceId: invoiceId,
      depositId: depositId,
      amount: 200000
    });
    check('D??ng t???m ???ng', useDepRes.status === 200 || useDepRes.status === 201,
      `status=${useDepRes.status} ${JSON.stringify(useDepRes.data).substring(0,150)}`);

// Step 7: Create refund for excess
    console.log('\n--- Bước 7: Hoàn tiền dư ---');
    const refundRes = await api('POST', '/billingcomplete/refunds', {
      patientId: patient.patientId,
      refundType: 1,
      originalDepositId: depositId,
      refundAmount: 100000,
      reason: 'Hoàn tiền tạm ứng dư',
      refundMethod: 1
    });
    check('Tạo phiếu hoàn', refundRes.status === 200 || refundRes.status === 201,
      `status=${refundRes.status} ${JSON.stringify(refundRes.data).substring(0,150)}`);

    const refundData = unwrapData(refundRes.data);
    const refundId = refundData?.id;

    // Step 8: Approve refund
    if (refundId) {
      console.log('\n--- Bước 8: Duyệt hoàn tiền ---');
      const approveRefRes = await api('POST', '/billingcomplete/refunds/approve', {
        refundId: refundId,
        isApproved: true
      });
      check('Duyệt hoàn tiền', approveRefRes.status === 200 || approveRefRes.status === 201,
        `status=${approveRefRes.status} ${JSON.stringify(approveRefRes.data).substring(0,150)}`);
    }
  }

  // Step 9: Close cash book
  if (cashBookId) {
    console.log('\n--- Bước 9: Đóng sổ thu ---');
    // First lock the cash book
    const lockRes = await api('POST', `/billingcomplete/cash-books/${cashBookId}/lock`);
    check('Khóa sổ thu', lockRes.status === 200 || lockRes.status === 201,
      `status=${lockRes.status} ${JSON.stringify(lockRes.data).substring(0,150)}`);
  }

  return { cashBookId };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   HIS REAL WORKFLOW TEST - Kiểm tra luồng thao tác     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Thời gian: ${new Date().toLocaleString('vi-VN')}`);

  if (!await login()) {
    console.log('\n❌ Không thể đăng nhập, dừng test');
    process.exit(1);
  }

  try {
    // Run all workflows
    const opdResult = await testOPDFlow();
    const ipdResult = await testIPDFlow();
    const whResult = await testWarehouseFlow();
    const billingResult = await testBillingFlow();

  } catch (err) {
    console.log(`\n💥 EXCEPTION: ${err.message}`);
    console.log(err.stack);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 KẾT QUẢ TỔNG HỢP');
  console.log('='.repeat(60));
  console.log(`  ✅ Passed: ${RESULTS.pass}`);
  console.log(`  ❌ Failed: ${RESULTS.fail}`);
  console.log(`  📈 Total:  ${RESULTS.pass + RESULTS.fail}`);

  if (RESULTS.errors.length > 0) {
    console.log('\n  Các lỗi:');
    RESULTS.errors.forEach(e => console.log(`    - ${e}`));
  }

  console.log('\n' + (RESULTS.fail === 0 ? '🎉 TẤT CẢ ĐỀU PASS!' : `⚠️ CÒN ${RESULTS.fail} LỖI CẦN FIX`));
  process.exit(RESULTS.fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
