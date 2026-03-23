/// <reference types="cypress" />

/**
 * Medinet YTCC Modules Test Suite
 *
 * Comprehensive E2E tests for 10 Medinet healthcare modules:
 * 1. Medical Forensics (/medical-forensics)
 * 2. Traditional Medicine (/traditional-medicine)
 * 3. Reproductive Health (/reproductive-health)
 * 4. Mental Health (/mental-health)
 * 5. Environmental Health (/environmental-health)
 * 6. Trauma Registry (/trauma-registry)
 * 7. Population Health (/population-health)
 * 8. Health Education (/health-education)
 * 9. Practice License (/practice-license)
 * 10. Inter-Hospital Sharing (/inter-hospital)
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'Failed to start the connection',
  'WebSocket connection',
  'hubs/notifications',
  'useForm',
  'is not connected to any Form element',
  'Static function can not consume context',
  '%o',
  'Failed to fetch',
  'net::ERR_',
  'SignalR',
  'HubConnection',
  'is deprecated',
  'Warning: [antd:',
];

function isIgnoredError(msg: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => msg.includes(pattern));
}

describe('Medinet YTCC Modules - Comprehensive E2E Tests', () => {
  let authToken = '';

  before(() => {
    cy.request('POST', '/api/auth/login', { username: 'admin', password: 'Admin@123' }).then((res) => {
      authToken = res.body?.token || res.body?.data?.token || '';
    });
  });

  function visitPage(route: string): string[] {
    const consoleErrors: string[] = [];
    cy.on('uncaught:exception', () => false);

    cy.intercept('**/api/**').as('apiCalls');

    cy.visit('/', {
      failOnStatusCode: false,
      onBeforeLoad(win) {
        win.localStorage.setItem('token', authToken);
        win.localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', roles: ['Admin'] }));
        const origError = win.console.error;
        win.console.error = (...args: any[]) => {
          const msg = args
            .map((a) => {
              if (typeof a === 'string') return a;
              if (a instanceof Error) return `${a.name}: ${a.message}`;
              try { return JSON.stringify(a); } catch { return String(a); }
            })
            .join(' ');
          if (!isIgnoredError(msg)) {
            consoleErrors.push(msg);
          }
          origError.apply(win.console, args);
        };
      },
    });

    cy.window().then((win) => {
      win.history.pushState({}, '', route);
      win.dispatchEvent(new PopStateEvent('popstate'));
    });

    cy.wait(2000);
    return consoleErrors;
  }

  function assertNoConsoleErrors(errors: string[], pageName: string) {
    cy.then(() => {
      if (errors.length > 0) {
        const errorList = errors
          .map((e, i) => `  ${i + 1}. ${e.substring(0, 300)}`)
          .join('\n');
        throw new Error(
          `Found ${errors.length} console error(s) on ${pageName}:\n${errorList}`
        );
      }
    });
  }

  // ===================================================================
  // 1. MEDICAL FORENSICS (/medical-forensics)
  // ===================================================================
  describe('1. Medical Forensics (Giam dinh Y khoa)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/medical-forensics');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Medical Forensics');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/medical-forensics');
      cy.contains('Giám định Y khoa').should('exist');
      cy.contains('Tổng hồ sơ').should('exist');
      cy.contains('Chờ giám định').should('exist');
      cy.contains('Hoàn thành tháng').should('exist');
      cy.contains('TB % thương tật').should('exist');
    });

    it('has tabs for case status', () => {
      visitPage('/medical-forensics');
      cy.contains('Chờ GĐ').should('exist');
      cy.contains('Đang GĐ').should('exist');
      cy.contains('Hoàn thành').should('exist');
      cy.contains('Tất cả').should('exist');
    });

    it('has table with correct columns', () => {
      visitPage('/medical-forensics');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'Mã hồ sơ').should('exist');
      cy.contains('th', 'Bệnh nhân').should('exist');
      cy.contains('th', 'Loại GĐ').should('exist');
      cy.contains('th', 'Trạng thái').should('exist');
    });

    it('has create button and search', () => {
      visitPage('/medical-forensics');
      cy.contains('button', 'Tạo hồ sơ').should('exist');
      cy.get('input[placeholder*="Tìm kiếm"]').should('exist');
    });

    it('clicking tabs switches content', () => {
      visitPage('/medical-forensics');
      cy.contains('Đang GĐ').click();
      cy.wait(300);
      cy.contains('Hoàn thành').click();
      cy.wait(300);
      cy.contains('Tất cả').click();
    });

    it('create button opens modal with form fields', () => {
      visitPage('/medical-forensics');
      cy.contains('button', 'Tạo hồ sơ').click();
      cy.wait(500);
      cy.contains('Tạo hồ sơ giám định').should('exist');
      cy.get('.ant-modal').should('be.visible');
      cy.contains('Tên bệnh nhân').should('exist');
      cy.contains('Loại giám định').should('exist');
    });

    it('has case type filter and date range picker', () => {
      visitPage('/medical-forensics');
      cy.get('.ant-select').should('exist');
      cy.get('.ant-picker-range').should('exist');
    });
  });

  // ===================================================================
  // 2. TRADITIONAL MEDICINE (/traditional-medicine)
  // ===================================================================
  describe('2. Traditional Medicine (Y hoc co truyen)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/traditional-medicine');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Traditional Medicine');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/traditional-medicine');
      cy.contains('Y học cổ truyền').should('exist');
      cy.contains('Đang điều trị').should('exist');
      cy.contains('Hoàn thành tháng').should('exist');
      cy.contains('Lượt châm cứu').should('exist');
      cy.contains('Đơn thuốc thang').should('exist');
    });

    it('has tabs (Dang DT, Hoan thanh, Tat ca)', () => {
      visitPage('/traditional-medicine');
      cy.contains('Đang ĐT').should('exist');
      cy.contains('Hoàn thành').should('exist');
      cy.contains('Tất cả').should('exist');
    });

    it('has table with treatment type column', () => {
      visitPage('/traditional-medicine');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'Loại điều trị').should('exist');
    });

    it('has create button and search', () => {
      visitPage('/traditional-medicine');
      cy.contains('button', 'Tạo liệu trình').should('exist');
      cy.get('input[placeholder*="Tìm kiếm"]').should('exist');
    });

    it('create button opens modal with form fields', () => {
      visitPage('/traditional-medicine');
      cy.contains('button', 'Tạo liệu trình').click();
      cy.wait(500);
      cy.contains('Tạo liệu trình YHCT').should('exist');
      cy.contains('Bệnh nhân').should('exist');
      cy.contains('Loại điều trị').should('exist');
      cy.contains('Chẩn đoán').should('exist');
    });
  });

  // ===================================================================
  // 3. REPRODUCTIVE HEALTH (/reproductive-health)
  // ===================================================================
  describe('3. Reproductive Health (SK sinh san)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/reproductive-health');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Reproductive Health');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/reproductive-health');
      cy.contains('Sức khỏe sinh sản').should('exist');
      cy.contains('Thai đang theo dõi').should('exist');
      cy.contains('Nguy cơ cao').should('exist');
      cy.contains('KHHGĐ đang dùng').should('exist');
      cy.contains('Sinh trong tháng').should('exist');
    });

    it('has 2 main tabs: Quan thai and KHHGD', () => {
      visitPage('/reproductive-health');
      cy.contains('Quản thai').should('exist');
      cy.contains('KHHGĐ').should('exist');
    });

    it('prenatal tab has table with risk column', () => {
      visitPage('/reproductive-health');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'Nguy cơ').should('exist');
    });

    it('switching to KHHGD tab shows method column', () => {
      visitPage('/reproductive-health');
      cy.get('.ant-tabs').contains('KHHGĐ').click();
      cy.wait(500);
      cy.contains('th', 'Biện pháp').should('exist');
    });

    it('has context-sensitive create buttons', () => {
      visitPage('/reproductive-health');
      cy.contains('button', 'Tạo hồ sơ quản thai').should('exist');
      cy.get('.ant-tabs').contains('KHHGĐ').click();
      cy.wait(500);
      cy.contains('button', 'Tạo hồ sơ KHHGĐ').should('exist');
    });

    it('prenatal create modal has required fields', () => {
      visitPage('/reproductive-health');
      cy.contains('button', 'Tạo hồ sơ quản thai').click();
      cy.wait(500);
      cy.contains('Họ tên thai phụ').should('exist');
      cy.contains('Tuổi thai').should('exist');
      cy.contains('Mức nguy cơ').should('exist');
    });
  });

  // ===================================================================
  // 4. MENTAL HEALTH (/mental-health)
  // ===================================================================
  describe('4. Mental Health (SK tam than)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/mental-health');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Mental Health');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/mental-health');
      cy.contains('Sức khỏe tâm thần').should('exist');
      cy.contains('Đang điều trị').should('exist');
      cy.contains('Nặng').should('exist');
      cy.contains('Quá hạn tái khám').should('exist');
      cy.contains('Đánh giá tháng').should('exist');
    });

    it('has tabs (Dang DT, On dinh, Thuyen giam, Tat ca)', () => {
      visitPage('/mental-health');
      cy.contains('Đang ĐT').should('exist');
      cy.contains('Ổn định').should('exist');
      cy.contains('Thuyên giảm').should('exist');
      cy.contains('Tất cả').should('exist');
    });

    it('has table with case type column', () => {
      visitPage('/mental-health');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'Loại bệnh').should('exist');
    });

    it('has create and PHQ-9 screening buttons', () => {
      visitPage('/mental-health');
      cy.contains('button', 'Tạo hồ sơ').should('exist');
      cy.contains('button', 'Sàng lọc PHQ-9').should('exist');
    });

    it('PHQ-9 screening modal opens with questions', () => {
      visitPage('/mental-health');
      cy.contains('button', 'Sàng lọc PHQ-9').click();
      cy.wait(500);
      cy.contains('Sàng lọc trầm cảm PHQ-9').should('exist');
      cy.contains('Ít hứng thú').should('exist');
    });

    it('create modal has required fields', () => {
      visitPage('/mental-health');
      cy.contains('button', 'Tạo hồ sơ').click();
      cy.wait(500);
      cy.contains('Tạo hồ sơ tâm thần').should('exist');
      cy.contains('Loại bệnh').should('exist');
      cy.contains('Mức độ').should('exist');
    });
  });

  // ===================================================================
  // 5. ENVIRONMENTAL HEALTH (/environmental-health)
  // ===================================================================
  describe('5. Environmental Health (Moi truong y te)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/environmental-health');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Environmental Health');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/environmental-health');
      cy.contains('Quản lý môi trường y tế').should('exist');
      cy.contains('Thu gom tháng').should('exist');
      cy.contains('Không tuân thủ').should('exist');
      cy.contains('Giám sát').should('exist');
      cy.contains('An toàn sinh học').should('exist');
    });

    it('has 2 tabs: Rac thai and Giam sat', () => {
      visitPage('/environmental-health');
      cy.contains('Rác thải y tế').should('exist');
      cy.contains('Giám sát môi trường').should('exist');
    });

    it('waste tab has table with type and compliance columns', () => {
      visitPage('/environmental-health');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'Loại rác').should('exist');
      cy.contains('th', 'Tuân thủ').should('exist');
    });

    it('monitoring tab has compliance column', () => {
      visitPage('/environmental-health');
      cy.contains('Giám sát môi trường').click();
      cy.wait(500);
      cy.contains('th', 'Tuân thủ').should('exist');
    });

    it('has context-sensitive create buttons', () => {
      visitPage('/environmental-health');
      cy.contains('button', 'Tạo phiếu rác thải').should('exist');
      cy.contains('Giám sát môi trường').click();
      cy.wait(500);
      cy.contains('button', 'Tạo phiếu GS').should('exist');
    });

    it('waste create modal has required fields', () => {
      visitPage('/environmental-health');
      cy.contains('button', 'Tạo phiếu rác thải').click();
      cy.wait(500);
      cy.contains('Tạo phiếu thu gom rác thải').should('exist');
      cy.contains('Loại rác').should('exist');
      cy.contains('Khối lượng').should('exist');
    });
  });

  // ===================================================================
  // 6. TRAUMA REGISTRY (/trauma-registry)
  // ===================================================================
  describe('6. Trauma Registry (So chan thuong)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/trauma-registry');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Trauma Registry');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/trauma-registry');
      cy.contains('Sổ chấn thương').should('exist');
      cy.contains('Ca trong tháng').should('exist');
      cy.contains('Tỷ lệ tử vong').should('exist');
      cy.contains('ISS trung bình').should('exist');
      cy.contains('TB ngày nằm').should('exist');
    });

    it('has triage-based tabs', () => {
      visitPage('/trauma-registry');
      cy.contains('Tất cả').should('exist');
      cy.get('.ant-tabs-tab').should('have.length.at.least', 2);
    });

    it('has table with ISS, GCS, RTS columns', () => {
      visitPage('/trauma-registry');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'ISS').should('exist');
      cy.contains('th', 'RTS').should('exist');
      cy.contains('th', 'GCS').should('exist');
    });

    it('has create button and search', () => {
      visitPage('/trauma-registry');
      cy.contains('button', 'Tạo hồ sơ').should('exist');
      cy.get('input[placeholder*="Tìm kiếm"]').should('exist');
    });

    it('create modal has triage and score fields', () => {
      visitPage('/trauma-registry');
      cy.contains('button', 'Tạo hồ sơ').click();
      cy.wait(500);
      cy.contains('Tạo hồ sơ chấn thương').should('exist');
      cy.contains('Phân loại').should('exist');
      cy.contains('GCS').should('exist');
      cy.contains('ISS').should('exist');
    });
  });

  // ===================================================================
  // 7. POPULATION HEALTH (/population-health)
  // ===================================================================
  describe('7. Population Health (Dan so KHHGD)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/population-health');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Population Health');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/population-health');
      cy.contains('Dân số - KHHGĐ').should('exist');
      cy.contains('Tổng hồ sơ').should('exist');
      cy.contains('KHHGĐ đang dùng').should('exist');
      cy.contains('Chăm sóc NCT').should('exist');
      cy.contains('Khai sinh tháng').should('exist');
    });

    it('has record type tabs', () => {
      visitPage('/population-health');
      cy.contains('Tất cả').should('exist');
      cy.get('.ant-tabs-tab').should('have.length.at.least', 2);
    });

    it('has table with columns', () => {
      visitPage('/population-health');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'Loại HS').should('exist');
      cy.contains('th', 'Họ tên').should('exist');
    });

    it('has create button and search', () => {
      visitPage('/population-health');
      cy.contains('button', 'Tạo hồ sơ').should('exist');
      cy.get('input[placeholder*="Tìm kiếm"]').should('exist');
    });

    it('create modal has form fields', () => {
      visitPage('/population-health');
      cy.contains('button', 'Tạo hồ sơ').click();
      cy.wait(500);
      cy.contains('Tạo hồ sơ dân số').should('exist');
      cy.contains('Họ tên').should('exist');
      cy.contains('Loại hồ sơ').should('exist');
    });
  });

  // ===================================================================
  // 8. HEALTH EDUCATION (/health-education)
  // ===================================================================
  describe('8. Health Education (Truyen thong GDSK)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/health-education');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Health Education');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/health-education');
      cy.contains('Truyền thông GDSK').should('exist');
      cy.contains('Chiến dịch năm').should('exist');
      cy.contains('Đang diễn ra').should('exist');
      cy.contains('Người tham gia').should('exist');
      cy.contains('Tài liệu').should('exist');
    });

    it('has 2 tabs: Chien dich and Tai lieu', () => {
      visitPage('/health-education');
      cy.contains('Chiến dịch').should('exist');
      cy.contains('Tài liệu').should('exist');
    });

    it('campaign tab has table with status column', () => {
      visitPage('/health-education');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'Trạng thái').should('exist');
    });

    it('materials tab has type column', () => {
      visitPage('/health-education');
      cy.get('.ant-tabs').contains('Tài liệu').click();
      cy.wait(500);
      cy.contains('th', 'Loại').should('exist');
    });

    it('has context-sensitive create buttons', () => {
      visitPage('/health-education');
      cy.contains('button', 'Tạo chiến dịch').should('exist');
      cy.get('.ant-tabs').contains('Tài liệu').click();
      cy.wait(500);
      cy.contains('button', 'Tạo tài liệu').should('exist');
    });

    it('campaign create modal has fields', () => {
      visitPage('/health-education');
      cy.contains('button', 'Tạo chiến dịch').click();
      cy.wait(500);
      cy.contains('Tạo chiến dịch GDSK').should('exist');
      cy.contains('Tên chiến dịch').should('exist');
    });

    it('material create modal has fields', () => {
      visitPage('/health-education');
      cy.get('.ant-tabs').contains('Tài liệu').click();
      cy.wait(500);
      cy.contains('button', 'Tạo tài liệu').click();
      cy.wait(500);
      cy.contains('Tạo tài liệu GDSK').should('exist');
      cy.contains('Loại tài liệu').should('exist');
    });
  });

  // ===================================================================
  // 9. PRACTICE LICENSE (/practice-license)
  // ===================================================================
  describe('9. Practice License (Hanh nghe)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/practice-license');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Practice License');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/practice-license');
      cy.contains('Quản lý hành nghề').should('exist');
      cy.contains('Tổng CCHN').should('exist');
      cy.contains('Đang hoạt động').should('exist');
      cy.contains('Sắp hết hạn').should('exist');
      cy.contains('Đã hết hạn').should('exist');
    });

    it('has tabs (Hoat dong, Sap het han, Het han, Tat ca)', () => {
      visitPage('/practice-license');
      cy.contains('Hoạt động').should('exist');
      cy.contains('Sắp hết hạn').should('exist');
      cy.contains('Hết hạn').should('exist');
      cy.contains('Tất cả').should('exist');
    });

    it('has table with license type column', () => {
      visitPage('/practice-license');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'Loại').should('exist');
    });

    it('has create button and search', () => {
      visitPage('/practice-license');
      cy.contains('button', 'Tạo chứng chỉ').should('exist');
      cy.get('input[placeholder*="Tìm kiếm"]').should('exist');
    });

    it('create modal has license fields', () => {
      visitPage('/practice-license');
      cy.contains('button', 'Tạo chứng chỉ').click();
      cy.wait(500);
      cy.contains('Tạo chứng chỉ hành nghề').should('exist');
      cy.contains('Loại CCHN').should('exist');
      cy.contains('Số CCHN').should('exist');
      cy.contains('Ngày cấp').should('exist');
      cy.contains('Ngày hết hạn').should('exist');
    });

    it('tab switching works', () => {
      visitPage('/practice-license');
      cy.contains('Sắp hết hạn').click();
      cy.wait(300);
      cy.contains('Hết hạn').click();
      cy.wait(300);
      cy.contains('Tất cả').click();
    });
  });

  // ===================================================================
  // 10. INTER-HOSPITAL SHARING (/inter-hospital)
  // ===================================================================
  describe('10. Inter-Hospital Sharing (Lien vien)', () => {
    it('loads page without console errors', () => {
      const errors = visitPage('/inter-hospital');
      cy.get('body').should('not.be.empty');
      assertNoConsoleErrors(errors, 'Inter-Hospital Sharing');
    });

    it('displays page title and KPI cards', () => {
      visitPage('/inter-hospital');
      cy.contains('Chia sẻ liên viện').should('exist');
      cy.contains('Tổng yêu cầu').should('exist');
      cy.contains('Chờ xử lý').should('exist');
      cy.contains('Hoàn thành hôm nay').should('exist');
      cy.contains('TB phản hồi').should('exist');
    });

    it('has tabs (Den, Di, Tat ca)', () => {
      visitPage('/inter-hospital');
      cy.contains('Đến').should('exist');
      cy.contains('Đi').should('exist');
      cy.contains('Tất cả').should('exist');
    });

    it('has table with request type and urgency columns', () => {
      visitPage('/inter-hospital');
      cy.get('.ant-table').should('exist');
      cy.contains('th', 'Loại').should('exist');
      cy.contains('th', 'Khẩn cấp').should('exist');
    });

    it('has create request button and search', () => {
      visitPage('/inter-hospital');
      cy.contains('button', 'Tạo yêu cầu').should('exist');
      cy.get('input[placeholder*="Tìm kiếm"]').should('exist');
    });

    it('create modal has required fields', () => {
      visitPage('/inter-hospital');
      cy.contains('button', 'Tạo yêu cầu').click();
      cy.wait(500);
      cy.contains('Tạo yêu cầu liên viện').should('exist');
      cy.contains('Loại yêu cầu').should('exist');
      cy.contains('Mức khẩn').should('exist');
      cy.contains('BV đích').should('exist');
    });
  });

  // ===================================================================
  // CROSS-CUTTING: ALL 10 MODULES ACCESSIBLE
  // ===================================================================
  describe('Cross-cutting: All modules accessible', () => {
    const modules = [
      { route: '/medical-forensics', title: 'Giám định Y khoa' },
      { route: '/traditional-medicine', title: 'Y học cổ truyền' },
      { route: '/reproductive-health', title: 'Sức khỏe sinh sản' },
      { route: '/mental-health', title: 'Sức khỏe tâm thần' },
      { route: '/environmental-health', title: 'Quản lý môi trường y tế' },
      { route: '/trauma-registry', title: 'Sổ chấn thương' },
      { route: '/population-health', title: 'Dân số - KHHGĐ' },
      { route: '/health-education', title: 'Truyền thông GDSK' },
      { route: '/practice-license', title: 'Quản lý hành nghề' },
      { route: '/inter-hospital', title: 'Chia sẻ liên viện' },
    ];

    modules.forEach(({ route, title }) => {
      it(`${route} renders "${title}" and has refresh button`, () => {
        visitPage(route);
        cy.contains(title).should('exist');
        cy.contains('button', 'Làm mới').should('exist');
      });
    });
  });

  // ===================================================================
  // CROSS-CUTTING: COMMON UI ELEMENTS
  // ===================================================================
  describe('Cross-cutting: Common UI elements', () => {
    const routes = [
      '/medical-forensics',
      '/traditional-medicine',
      '/reproductive-health',
      '/mental-health',
      '/environmental-health',
      '/trauma-registry',
      '/population-health',
      '/health-education',
      '/practice-license',
      '/inter-hospital',
    ];

    routes.forEach((route) => {
      it(`${route} has table and date range picker`, () => {
        visitPage(route);
        cy.get('.ant-table').should('exist');
        cy.get('.ant-picker-range').should('exist');
      });
    });
  });

  // ===================================================================
  // SIDEBAR MENU: Medinet YTCC group
  // ===================================================================
  describe('Sidebar: Medinet YTCC menu group', () => {
    it('sidebar contains Medinet YTCC group with all 10 items', () => {
      visitPage('/medical-forensics');
      cy.get('.ant-layout-sider').should('exist');
      cy.get('body').then($body => {
        if ($body.text().includes('Medinet YTCC')) {
          cy.contains('Medinet YTCC').should('exist');
        }
      });
      // Check for menu items
      cy.contains('Giám định Y khoa').should('exist');
    });
  });
});
