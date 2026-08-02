/// <reference types="cypress" />

/**
 * #213 [TEST-3] E2e FUNCTIONAL — khẳng định OUTCOME tiền + lâm sàng (không chỉ console-error).
 *
 * Tiền:      tạo tạm ứng → số dư tăng ĐÚNG số tiền; amount <= 0 → 400 (fail khi tính sai).
 * Lâm sàng:  BN dị ứng nặng (severity 3) → kê đơn thuốc trùng allergen BỊ CHẶN 400;
 *            có override reason → cho phép (đúng SAFE-1 #185).
 * Intercept: SCOPED theo đúng endpoint (không dùng '**\/api\/**' rộng — mục tiêu #213).
 *
 * Chạy với dev stack local: SQL his-sqlserver + BE :5106 + FE vite (baseUrl cypress).
 * Data: dùng BN seed trong ngày (DailySeed) — mỗi test tự tạo phần data còn thiếu qua API.
 */

interface Envelope<T> { success: boolean; data: T; message?: string | null }

describe('#213 functional — money & clinical outcomes', () => {
  let token: string;
  let patientId: string;
  let examinationId: string;

  const api = (method: string, url: string, body?: object, failOnStatusCode = true) =>
    cy.request({
      method, url, body, failOnStatusCode,
      headers: { Authorization: `Bearer ${token}` },
    });

  before(() => {
    // Login qua API (ổn định) — token dùng cho mọi cy.request phía dưới
    cy.request('POST', '/api/auth/login', { username: 'admin', password: 'Admin@123' }).then((r) => {
      expect(r.status).to.eq(200);
      token = (r.body as Envelope<{ token: string }>).data.token;

      // Lấy 1 BN có examination hôm nay từ seed
      return api('GET', '/api/reception/admissions/today');
    }).then((r) => {
      const admissions = (r.body as Envelope<{ patientId: string; examinationId?: string }[]>).data;
      const withExam = admissions.find((a) => a.examinationId);
      expect(withExam, 'cần ít nhất 1 admission hôm nay có examinationId (DailySeed)').to.exist;
      patientId = withExam!.patientId;
      examinationId = withExam!.examinationId!;
    });
  });

  /* ================= TIỀN ================= */

  it('tạm ứng 137.000 → số dư tăng CHÍNH XÁC 137.000 (fail nếu lệch 1 đồng)', () => {
    const AMOUNT = 137000;
    let before = 0;

    api('GET', `/api/BillingComplete/deposits/balance/${patientId}`).then((r) => {
      before = (r.body as Envelope<{ remainingBalance: number }>).data.remainingBalance;

      return api('POST', '/api/BillingComplete/deposits', {
        patientId, depositType: 1, depositSource: 1, amount: AMOUNT, paymentMethod: 1,
      });
    }).then((r) => {
      expect(r.status).to.eq(200);

      return api('GET', `/api/BillingComplete/deposits/balance/${patientId}`);
    }).then((r) => {
      const after = (r.body as Envelope<{ remainingBalance: number }>).data.remainingBalance;
      // Khẳng định SỐ TIỀN — không phải chỉ "gọi được API"
      expect(after - before, 'số dư tạm ứng phải tăng đúng bằng số tiền nộp').to.eq(AMOUNT);
    });
  });

  it('tạm ứng amount <= 0 bị CHẶN 400 (guard #189)', () => {
    api('POST', '/api/BillingComplete/deposits',
      { patientId, depositType: 1, depositSource: 1, amount: -500, paymentMethod: 1 }, false,
    ).then((r) => expect(r.status, 'amount âm phải bị chặn').to.eq(400));

    api('POST', '/api/BillingComplete/deposits',
      { patientId, depositType: 1, depositSource: 1, amount: 0, paymentMethod: 1 }, false,
    ).then((r) => expect(r.status, 'amount = 0 phải bị chặn').to.eq(400));
  });

  it('dùng tạm ứng thanh toán: amount = 0 → 400; depositId không tồn tại → 404 (#462)', () => {
    // Tạo deposit thật để test guard amount (guard chạy SAU check tồn tại)
    api('POST', '/api/BillingComplete/deposits', {
      patientId, depositType: 1, depositSource: 1, amount: 50000, paymentMethod: 1,
    }).then((r) => {
      const depositId = (r.body as Envelope<{ id: string }>).data.id;

      api('POST', '/api/BillingComplete/deposits/use-for-payment',
        { invoiceId: '00000000-0000-0000-0000-000000000001', depositId, amount: 0 }, false,
      ).then((r2) => expect(r2.status, 'amount = 0 phải bị chặn 400').to.eq(400));
    });

    // Bug #462 (found from #213): trước đây 500 — giờ phải là 404
    api('POST', '/api/BillingComplete/deposits/use-for-payment',
      { invoiceId: '00000000-0000-0000-0000-000000000001', depositId: '11111111-2222-3333-4444-555555555555', amount: 1000 }, false,
    ).then((r) => expect(r.status, 'deposit không tồn tại phải 404, không phải 500').to.eq(404));
  });

  /* ================= LÂM SÀNG ================= */

  it('BN dị ứng nặng → kê đơn thuốc trùng allergen bị CHẶN; có override → cho phép (SAFE-1 #185)', () => {
    // 1) Chọn 1 thuốc thật từ catalog
    api('GET', '/api/examination/medicines/search?keyword=Paracetamol').then((r) => {
      const meds = (r.body as Envelope<{ id: string; name: string }[]>).data;
      expect(meds.length, 'catalog phải có thuốc Paracetamol (seed)').to.be.greaterThan(0);
      const med = meds[0];

      // 2) Gắn dị ứng NẶNG đúng tên thuốc đó cho BN (match theo name-contains của BE)
      return api('POST', `/api/examination/patient/${patientId}/allergies`, {
        allergyType: 1, allergenName: med.name, reaction: 'Phát ban, khó thở (e2e #213)',
        severity: 3, isActive: true,
      }).then(() => med);
    }).then((med) => {
      const rx = {
        examinationId, prescriptionType: 1, paymentCategory: 2,
        items: [{ medicineId: med.id, quantity: 2, days: 1 }],
      };

      // 3) KHÔNG override → phải bị chặn 400, đơn KHÔNG được lưu
      api('POST', '/api/examination/prescriptions', rx, false).then((r) => {
        expect(r.status, 'kê thuốc BN dị ứng nặng không override phải bị chặn').to.eq(400);
      });

      // 4) CÓ override reason → được phép lưu (audit ghi lý do)
      api('POST', '/api/examination/prescriptions', {
        ...rx, overrideReason: 'Cần thiết lâm sàng, đã cân nhắc kỹ (e2e #213)',
      }).then((r) => {
        expect(r.status, 'override hợp lệ phải lưu được đơn').to.eq(200);
      });
    });
  });

  /* ============ UI + SCOPED INTERCEPT ============ */

  it('dashboard hiển thị luồng BN khớp CHÍNH XÁC số liệu API (intercept scoped, không **/api/**)', () => {
    // Intercept SCOPED đúng 1 endpoint — mẫu thay thế cho 18 intercept '**/api/**' brittle
    cy.intercept('GET', '**/api/reception/opd-flow-stats*').as('opdFlow');

    cy.login('admin', 'Admin@123');
    cy.visit('/v2/dashboard');

    cy.wait('@opdFlow', { timeout: 20000 }).then(({ response }) => {
      expect(response?.statusCode).to.eq(200);
      const flow = (response?.body as Envelope<Record<string, number>>).data ?? response?.body;
      const expected = [
        flow.registered, flow.waiting, flow.inProgress, flow.waitingCls,
        flow.clsResultReady, flow.completed, flow.paid,
      ];

      // 7 bước hiển thị đúng thứ tự + đúng con số API trả về.
      // .should(callback) để RETRY tới khi React render xong data (tránh race đọc DOM lúc còn 0)
      cy.get('.flow .flow-v', { timeout: 15000 }).should(($els) => {
        expect($els, 'đủ 7 bucket').to.have.length(7);
        const shown = [...$els].map((el) => Number(el.textContent?.trim()));
        expect(shown, 'số hiển thị phải khớp API từng bucket').to.deep.eq(expected);
      });
    });
  });
});
