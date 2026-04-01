import { test, expect } from '@playwright/test';
import { login, waitForLoading } from '../helpers/test-utils';

const buildTodayIso = () => new Date().toISOString().slice(0, 10);

test.describe('Regression coverage for thin E2E modules', () => {
  test.setTimeout(60000);

  test('Doctor Portal blocks mixed document batch-sign and signs same-type selection with correct payload', async ({ page }) => {
    let batchPayload: Record<string, unknown> | null = null;

    await page.route('**/api/digital-signature/pending', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'doc-1',
            documentId: 'emr-1',
            documentType: 'EMR',
            documentCode: 'EMR-001',
            patientName: 'Nguyen Van A',
            title: 'Ho so benh an 1',
            createdAt: '2026-03-20T08:00:00Z',
            status: 'Pending',
          },
          {
            id: 'doc-2',
            documentId: 'lab-1',
            documentType: 'LAB',
            documentCode: 'LAB-001',
            patientName: 'Tran Thi B',
            title: 'Ket qua xet nghiem 1',
            createdAt: '2026-03-20T08:30:00Z',
            status: 'Pending',
          },
          {
            id: 'doc-3',
            documentId: 'emr-2',
            documentType: 'EMR',
            documentCode: 'EMR-002',
            patientName: 'Le Van C',
            title: 'Ho so benh an 2',
            createdAt: '2026-03-20T09:00:00Z',
            status: 'Pending',
          },
        ]),
      });
    });

    await page.route('**/api/digital-signature/batch-sign', async (route) => {
      batchPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total: 2,
          succeeded: 2,
          failed: 0,
          results: [],
        }),
      });
    });

    await login(page);
    await page.goto('/doctor-portal', { waitUntil: 'domcontentloaded' });
    await waitForLoading(page);

    await page.locator('.ant-segmented-item').filter({ hasText: 'Chữ ký số' }).click();
    await expect(page.getByText('EMR-001')).toBeVisible();

    const emrRow1 = page.locator('tr').filter({ hasText: 'EMR-001' });
    const labRow = page.locator('tr').filter({ hasText: 'LAB-001' });
    const emrRow2 = page.locator('tr').filter({ hasText: 'EMR-002' });

    await emrRow1.locator('.ant-checkbox').click();
    await labRow.locator('.ant-checkbox').click();

    const batchButton = page.getByRole('button', { name: /Ký hàng loạt/i });
    await expect(batchButton).toBeDisabled();
    await expect(page.getByText(/Hãy chọn các tài liệu cùng loại/i)).toBeVisible();

    await labRow.locator('.ant-checkbox').click();
    await emrRow2.locator('.ant-checkbox').click();

    await expect(batchButton).toBeEnabled();
    await batchButton.click();

    await expect.poll(() => batchPayload).not.toBeNull();
    expect(batchPayload).toMatchObject({
      documentType: 'EMR',
      documentIds: ['doc-1', 'doc-3'],
      reason: 'Ký hàng loạt',
    });
  });

  test('Telemedicine submits a valid prescription payload after medicine selection', async ({ page }) => {
    let prescriptionPayload: Record<string, unknown> | null = null;
    const todayIso = buildTodayIso();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekIso = nextWeek.toISOString().slice(0, 10);

    await page.route('**/api/telemedicine/appointments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'appt-1',
              appointmentCode: 'TM-001',
              patientId: 'patient-1',
              patientCode: 'P001',
              patientName: 'Nguyen Van Tele',
              phone: '0901234567',
              doctorId: 'doctor-1',
              doctorCode: 'D001',
              doctorName: 'BS Tele',
              departmentId: 'dep-1',
              departmentName: 'Noi tong quat',
              appointmentType: 2,
              appointmentTypeName: 'Tai kham',
              scheduledDate: `${todayIso}T08:00:00Z`,
              scheduledTime: '08:00',
              durationMinutes: 30,
              chiefComplaint: 'Ho sot',
              status: 2,
              statusName: 'Cho kham',
              fee: 150000,
              paymentStatus: 1,
              paymentStatusName: 'Da thanh toan',
              createdAt: `${todayIso}T07:00:00Z`,
            },
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 200,
          totalPages: 1,
        }),
      });
    });

    await page.route('**/api/telemedicine/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: todayIso,
          totalAppointments: 1,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          averageWaitTimeMinutes: 5,
          averageConsultationDurationMinutes: 12,
          totalRevenue: 150000,
          prescriptionsSent: 0,
          upcomingAppointments: [],
          byDoctor: [],
          byDepartment: [],
        }),
      });
    });

    await page.route('**/api/telemedicine/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'session-1',
          sessionCode: 'SES-001',
          appointmentId: 'appt-1',
          patientId: 'patient-1',
          patientName: 'Nguyen Van Tele',
          doctorId: 'doctor-1',
          doctorName: 'BS Tele',
          roomUrl: 'tele-room',
          roomToken: 'token',
          status: 1,
          statusName: 'Created',
          quality: 1,
          qualityName: 'Good',
          hasRecording: false,
          createdAt: `${todayIso}T08:00:00Z`,
        }),
      });
    });

    await page.route('**/api/telemedicine/consultations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'consult-1',
          consultationCode: 'CONS-001',
          sessionId: 'session-1',
          appointmentId: 'appt-1',
          patientId: 'patient-1',
          patientName: 'Nguyen Van Tele',
          doctorId: 'doctor-1',
          doctorName: 'BS Tele',
          status: 1,
          statusName: 'InProgress',
          createdAt: `${todayIso}T08:00:00Z`,
        }),
      });
    });

    await page.route('**/api/examination/medicines/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'drug-1',
            code: 'PARA500',
            name: 'Paracetamol 500mg',
            unit: 'vien',
            unitPrice: 1000,
            insurancePrice: 0,
            availableQuantity: 100,
            isActive: true,
          },
        ]),
      });
    });

    await page.route('**/api/telemedicine/prescriptions', async (route) => {
      prescriptionPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'rx-1',
          prescriptionCode: 'RX-001',
          consultationId: 'consult-1',
          patientId: 'patient-1',
          patientName: 'Nguyen Van Tele',
          doctorId: 'doctor-1',
          doctorName: 'BS Tele',
          doctorLicenseNumber: 'LIC001',
          facilityName: 'HIS',
          facilityCode: 'HIS',
          items: [],
          totalAmount: 1000,
          qrCode: 'QR001',
          validFrom: `${todayIso}T08:00:00Z`,
          validTo: `${nextWeekIso}T08:00:00Z`,
          status: 1,
          statusName: 'Created',
          sentToPharmacy: true,
          createdAt: `${todayIso}T08:05:00Z`,
        }),
      });
    });

    await login(page);
    await page.goto('/telemedicine', { waitUntil: 'domcontentloaded' });
    await waitForLoading(page);

    await page.getByRole('button', { name: /Bắt đầu/i }).click();
    await expect(page.getByRole('button', { name: /Kê đơn thuốc/i })).toBeVisible();
    await page.getByRole('button', { name: /Kê đơn thuốc/i }).click();

    const modal = page.locator('.ant-modal:has-text("Kê đơn thuốc điện tử")');
    await expect(modal).toBeVisible();

    await modal.locator('input').first().fill('Cảm cúm');
    await modal.getByRole('button', { name: /Thêm thuốc/i }).click();

    await modal.locator('.ant-select').first().click();
    await page.keyboard.type('Paracetamol');
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option-content').getByText('Paracetamol 500mg (vien)').click();

    await modal.locator('input[placeholder="Liều dùng"]').fill('500mg');
    await modal.locator('input[placeholder="SL"]').fill('10');
    await modal.locator('input[placeholder="Tần suất"]').fill('2 lần/ngày');
    await modal.locator('input[placeholder="Ngày"]').fill('5');
    await modal.locator('input[placeholder="Cách dùng"]').fill('Uống sau ăn');
    await modal.locator('textarea').fill('Uống nhiều nước');

    await modal.getByRole('button', { name: /Lưu & Gửi/i }).click();

    await expect.poll(() => prescriptionPayload).not.toBeNull();
    expect(prescriptionPayload).toMatchObject({
      consultationId: 'consult-1',
      instructions: 'Uống nhiều nước',
    });

    const items = prescriptionPayload?.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      drugId: 'drug-1',
      quantity: 10,
      dosage: '500mg',
      frequency: '2 lần/ngày',
      route: 'Oral',
      durationDays: 5,
      instructions: 'Uống sau ăn',
    });
  });

  test('Doctor Portal detail modals only expose informational fallback actions', async ({ page }) => {
    const todayIso = buildTodayIso();

    await page.route('**/api/examination/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'exam-1',
              patientId: 'patient-opd-1',
              patientCode: 'BN001',
              patientName: 'Nguyen Van OPD',
              roomId: 'room-1',
              roomName: 'Phong kham Noi 1',
              doctorId: 'doctor-1',
              doctorName: 'BS OPD',
              status: 1,
              statusName: 'Cho kham',
              queueNumber: 12,
              examinationDate: `${todayIso}T08:30:00Z`,
              diagnosisCode: 'J11',
              diagnosisName: 'Cum mua',
            },
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 20,
          totalPages: 1,
        }),
      });
    });

    await page.route('**/api/inpatient/patients**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              admissionId: 'adm-1',
              medicalRecordCode: 'MR001',
              patientCode: 'BNIP001',
              patientName: 'Tran Thi IPD',
              gender: 2,
              age: 54,
              isInsurance: true,
              insuranceNumber: 'HN123456789',
              departmentName: 'Noi tong hop',
              roomName: 'Phong 201',
              bedName: 'G01',
              admissionDate: `${todayIso}T06:00:00Z`,
              daysOfStay: 3,
              mainDiagnosis: 'Tang huyet ap',
              attendingDoctorName: 'BS IPD',
              status: 1,
              statusName: 'Dang dieu tri',
              hasPendingOrders: true,
              hasPendingLabResults: false,
              hasUnclaimedMedicine: false,
              isDebtWarning: false,
              isInsuranceExpiring: false,
            },
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 20,
          totalPages: 1,
        }),
      });
    });

    await page.route('**/api/digital-signature/pending', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await login(page);
    await page.goto('/doctor-portal', { waitUntil: 'domcontentloaded' });
    await waitForLoading(page);

    await expect(page.getByText('Nguyen Van OPD')).toBeVisible();
    await page.locator('tr').filter({ hasText: 'Nguyen Van OPD' }).click();
    await expect(page.getByRole('dialog')).toContainText('Nguyen Van OPD');
    await page.getByRole('button', { name: 'Kê đơn' }).click();
    await expect(page.locator('.ant-message')).toContainText('Kê đơn');
    await expect(page.locator('.ant-message')).toBeVisible();
    await page.getByRole('button', { name: 'Đóng' }).click();

    await page.locator('.ant-segmented-item').filter({ hasText: 'Nội trú' }).click();
    await expect(page.getByText('Tran Thi IPD')).toBeVisible();
    await page.locator('tr').filter({ hasText: 'Tran Thi IPD' }).click();
    await expect(page.getByRole('dialog')).toContainText('Tran Thi IPD');
    await page.getByRole('button', { name: 'Xuất viện' }).click();
    await expect(page.locator('.ant-message')).toBeVisible();
  });

  test('Telemedicine toggles devices and ends consultation with the expected API payloads', async ({ page }) => {
    let endSessionPayload: Record<string, unknown> | null = null;
    let completePayload: Record<string, unknown> | null = null;
    const todayIso = buildTodayIso();

    await page.route('**/api/telemedicine/appointments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'appt-2',
              appointmentCode: 'TM-002',
              patientId: 'patient-2',
              patientCode: 'P002',
              patientName: 'Le Thi Video',
              phone: '0908888888',
              doctorId: 'doctor-1',
              doctorCode: 'D001',
              doctorName: 'BS Tele',
              departmentId: 'dep-1',
              departmentName: 'Noi tong quat',
              appointmentType: 2,
              appointmentTypeName: 'Tai kham',
              scheduledDate: `${todayIso}T09:00:00Z`,
              scheduledTime: '09:00',
              durationMinutes: 30,
              chiefComplaint: 'Tai kham huyet ap',
              status: 2,
              statusName: 'Cho kham',
              fee: 200000,
              paymentStatus: 1,
              paymentStatusName: 'Da thanh toan',
              createdAt: `${todayIso}T08:00:00Z`,
            },
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 200,
          totalPages: 1,
        }),
      });
    });

    await page.route('**/api/telemedicine/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: todayIso,
          totalAppointments: 1,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          averageWaitTimeMinutes: 3,
          averageConsultationDurationMinutes: 10,
          totalRevenue: 200000,
          prescriptionsSent: 0,
          upcomingAppointments: [],
          byDoctor: [],
          byDepartment: [],
        }),
      });
    });

    await page.route('**/api/telemedicine/sessions', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'session-2',
            sessionCode: 'SES-002',
            appointmentId: 'appt-2',
            patientId: 'patient-2',
            patientName: 'Le Thi Video',
            doctorId: 'doctor-1',
            doctorName: 'BS Tele',
            roomUrl: 'room-2',
            roomToken: 'token-2',
            status: 1,
            statusName: 'Created',
            quality: 1,
            qualityName: 'Good',
            hasRecording: false,
            createdAt: `${todayIso}T09:00:00Z`,
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/api/telemedicine/sessions/session-2/end', async (route) => {
      endSessionPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'session-2', status: 4, statusName: 'Ended' }),
      });
    });

    await page.route('**/api/telemedicine/consultations', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'consult-2',
            consultationCode: 'CONS-002',
            sessionId: 'session-2',
            appointmentId: 'appt-2',
            patientId: 'patient-2',
            patientName: 'Le Thi Video',
            doctorId: 'doctor-1',
            doctorName: 'BS Tele',
            diagnosisMain: '',
            diagnosisMainIcd: '',
            treatmentPlan: '',
            status: 1,
            statusName: 'InProgress',
            createdAt: `${todayIso}T09:00:00Z`,
          }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route('**/api/telemedicine/consultations/complete', async (route) => {
      completePayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'consult-2', status: 4, statusName: 'Completed' }),
      });
    });

    await login(page);
    await page.goto('/telemedicine', { waitUntil: 'domcontentloaded' });
    await waitForLoading(page);

    await page.locator('tr').filter({ hasText: 'Le Thi Video' }).locator('button').first().click();
    const consultModal = page.locator('.ant-modal').filter({ hasText: 'Le Thi Video' });
    await expect(consultModal).toBeVisible();
    const cameraButton = consultModal.getByRole('button', { name: /video-camera/i });
    const micButton = consultModal.getByRole('button', { name: /phone/i });
    await expect(cameraButton).toContainText(/Táº¯t|camera/i);
    await cameraButton.click();
    await expect(cameraButton).toContainText(/Báº­t|camera/i);
    await expect(micButton).toContainText(/Táº¯t|mic/i);
    await micButton.click();
    await expect(micButton).toContainText(/Báº­t|mic/i);
    await consultModal.getByRole('button', { name: /close-circle/i }).click();

    await expect.poll(() => endSessionPayload).not.toBeNull();
    expect(endSessionPayload).toMatchObject({ reason: 'Kết thúc khám' });
    await expect.poll(() => completePayload).not.toBeNull();
    expect(completePayload).toMatchObject({
      consultationId: 'consult-2',
      assessment: 'Completed via telemedicine',
      diagnosisMain: '',
      diagnosisMainIcd: '',
      treatmentPlan: '',
    });
  });

  test('Telemedicine keeps prescription validation errors in the modal and skips submit when medicine fields are incomplete', async ({ page }) => {
    let prescriptionCalled = false;
    const todayIso = buildTodayIso();

    await page.route('**/api/telemedicine/appointments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'appt-3',
              appointmentCode: 'TM-003',
              patientId: 'patient-3',
              patientCode: 'P003',
              patientName: 'Pham Thi Validation',
              phone: '0907777777',
              doctorId: 'doctor-1',
              doctorCode: 'D001',
              doctorName: 'BS Tele',
              departmentId: 'dep-1',
              departmentName: 'Noi tong quat',
              appointmentType: 2,
              appointmentTypeName: 'Tai kham',
              scheduledDate: `${todayIso}T10:00:00Z`,
              scheduledTime: '10:00',
              durationMinutes: 30,
              chiefComplaint: 'Mat ngu',
              status: 2,
              statusName: 'Cho kham',
              fee: 150000,
              paymentStatus: 1,
              paymentStatusName: 'Da thanh toan',
              createdAt: `${todayIso}T09:00:00Z`,
            },
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 200,
          totalPages: 1,
        }),
      });
    });

    await page.route('**/api/telemedicine/dashboard**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: todayIso,
          totalAppointments: 1,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          averageWaitTimeMinutes: 4,
          averageConsultationDurationMinutes: 11,
          totalRevenue: 150000,
          prescriptionsSent: 0,
          upcomingAppointments: [],
          byDoctor: [],
          byDepartment: [],
        }),
      });
    });

    await page.route('**/api/telemedicine/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'session-3',
          sessionCode: 'SES-003',
          appointmentId: 'appt-3',
          patientId: 'patient-3',
          patientName: 'Pham Thi Validation',
          doctorId: 'doctor-1',
          doctorName: 'BS Tele',
          roomUrl: 'room-3',
          roomToken: 'token-3',
          status: 1,
          statusName: 'Created',
          quality: 1,
          qualityName: 'Good',
          hasRecording: false,
          createdAt: `${todayIso}T10:00:00Z`,
        }),
      });
    });

    await page.route('**/api/telemedicine/consultations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'consult-3',
          consultationCode: 'CONS-003',
          sessionId: 'session-3',
          appointmentId: 'appt-3',
          patientId: 'patient-3',
          patientName: 'Pham Thi Validation',
          doctorId: 'doctor-1',
          doctorName: 'BS Tele',
          status: 1,
          statusName: 'InProgress',
          createdAt: `${todayIso}T10:00:00Z`,
        }),
      });
    });

    await page.route('**/api/examination/medicines/search**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/telemedicine/prescriptions', async (route) => {
      prescriptionCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'rx-3' }),
      });
    });

    await login(page);
    await page.goto('/telemedicine', { waitUntil: 'domcontentloaded' });
    await waitForLoading(page);

    await page.locator('tr').filter({ hasText: 'Pham Thi Validation' }).locator('button').first().click();
    const consultModal = page.locator('.ant-modal').filter({ hasText: 'Pham Thi Validation' });
    await expect(consultModal).toBeVisible();
    await consultModal.getByRole('button', { name: /medicine-box/i }).click();

    const modal = page.locator('[role="dialog"]').nth(1);
    await expect(modal).toBeVisible();
    await modal.locator('input').first().fill('Roi loan giac ngu');
    await modal.locator('button.ant-btn-dashed').click();
    await modal.locator('.ant-modal-footer button').last().click();

    await expect(modal).toContainText('Chọn thuốc');
    await expect(modal).toContainText('Nhập liều dùng');
    await expect(modal).toContainText('Tần suất');
    expect(prescriptionCalled).toBe(false);
  });

  test('Kiosk check-in stays in dedicated flow and does not issue a new ticket', async ({ page }) => {
    let issueTicketCalled = false;

    await page.route('**/api/reception/rooms/overview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/reception/queue/issue', async (route) => {
      issueTicketCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ticketCode: 'A001',
          queueNumber: 1,
          estimatedWaitMinutes: 5,
        }),
      });
    });

    await page.goto('/queue-display?mode=kiosk', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.kiosk-menu-grid')).toBeVisible();
    await expect(page.locator('.kiosk-btn-checkin')).toBeVisible();

    await page.locator('.kiosk-btn-checkin').click();

    await expect(page.getByText(/Chưa hỗ trợ tự check-in tại kiosk này/i)).toBeVisible();
    expect(issueTicketCalled).toBe(false);
    await expect(page.getByText(/tránh phát sinh số khám mới/i)).toBeVisible();
  });
});
