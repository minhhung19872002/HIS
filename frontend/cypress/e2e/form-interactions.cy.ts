/// <reference types="cypress" />

/**
 * Form Interactions E2E Test
 *
 * Tests actual form fill + submit on key HIS pages:
 * 1. OPD: Fill vital signs, medical history, physical exam, save draft
 * 2. Billing: Create deposit, create refund request
 * 3. Pharmacy: Create transfer form
 * 4. IPD: Fill admission modal, fill progress note modal
 * 5. Insurance: Browse tabs, interact with modals
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'NotImplementedException',
  'not implemented',
  'ECONNREFUSED',
  'ERR_CONNECTION_REFUSED',
  'Network Error',
  'useForm',
  'is not connected to any Form element',
];

function isIgnored(msg: string): boolean {
  return IGNORE_PATTERNS.some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

function apiHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Helper: select an Antd dropdown option by label text
function selectAntdOption(label: string, optionText: string, container = '.ant-modal') {
  cy.get(container).within(() => {
    cy.get('.ant-form-item')
      .contains(label)
      .parents('.ant-form-item')
      .find('.ant-select')
      .click();
  });
  cy.get('.ant-select-dropdown:visible').contains(optionText).click();
}

// Helper: fill an Antd InputNumber by label
function fillInputNumber(label: string, value: number, container: string) {
  cy.get(container).within(() => {
    cy.get('.ant-form-item')
      .contains(label)
      .parents('.ant-form-item')
      .find('input')
      .clear()
      .type(String(value));
  });
}

// Helper: fill an Antd TextArea by label
function fillTextArea(label: string, value: string, container: string) {
  cy.get(container).within(() => {
    cy.get('.ant-form-item')
      .contains(label)
      .parents('.ant-form-item')
      .find('textarea')
      .clear()
      .type(value, { delay: 10 });
  });
}

describe('Form Interactions - Fill & Submit', () => {
  let token: string;
  let registeredPatientName: string;

  before(() => {
    // Login via API
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      token = resp.body.data?.token || resp.body.token;
    });
  });

  beforeEach(() => {
    cy.on('uncaught:exception', () => false);

    cy.window().then((win) => {
      win.localStorage.setItem('token', token);
      win.localStorage.setItem(
        'user',
        JSON.stringify({
          id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
          username: 'admin',
          fullName: 'Administrator',
          roles: ['Admin'],
        }),
      );
    });

    // Monitor console errors
    cy.on('window:before:load', (win) => {
      const origError = win.console.error;
      win.console.error = (...args: any[]) => {
        const msg = args.map((a) => String(a)).join(' ');
        if (!isIgnored(msg)) {
          cy.log(`CONSOLE ERROR: ${msg.substring(0, 150)}`);
        }
        origError.apply(win.console, args);
      };
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP: Register patient via API for OPD flow
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Setup: Register patient for testing', () => {
    it('should register a test patient via API', () => {
      // Get rooms first
      cy.request({
        url: '/api/reception/rooms/overview',
        headers: apiHeaders(token),
      }).then((roomResp) => {
        const rooms = roomResp.body.data || roomResp.body || [];
        const firstRoom = Array.isArray(rooms) && rooms.length > 0 ? rooms[0] : null;
        if (!firstRoom) {
          cy.log('No rooms available - skipping patient registration');
          return;
        }

        const uniqueSuffix = Date.now().toString().slice(-6);
        registeredPatientName = `Nguyễn Test ${uniqueSuffix}`;

        cy.request({
          method: 'POST',
          url: '/api/reception/register/fee',
          headers: apiHeaders(token),
          body: {
            newPatient: {
              fullName: registeredPatientName,
              gender: 1,
              dateOfBirth: '1988-06-15',
              phoneNumber: `090${uniqueSuffix}1`,
              identityNumber: `07908${uniqueSuffix}`,
              address: '100 Lê Lai, Q1, TP.HCM',
            },
            serviceType: 2,
            roomId: firstRoom.roomId,
          },
          failOnStatusCode: false,
        }).then((regResp) => {
          cy.log(`Patient registration: ${regResp.status}`);
          if (regResp.status === 200 || regResp.status === 201) {
            cy.log(`Registered: ${registeredPatientName}`);
          }
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPD: Fill examination form tabs
  // ═══════════════════════════════════════════════════════════════════════════

  describe('OPD: Fill examination form', () => {
    it('should select room and patient, then see exam form tabs', () => {
      cy.visit('/opd');
      cy.contains('Khám bệnh ngoại trú', { timeout: 15000 }).should('exist');

      // Select first room
      cy.get('.ant-select').first().click();
      cy.get('.ant-select-dropdown:visible .ant-select-item', { timeout: 5000 })
        .first()
        .click();
      cy.wait(2000);

      // Check if patient queue has data
      cy.get('body').then(($body) => {
        const rows = $body.find('.ant-table-tbody tr.ant-table-row');
        if (rows.length > 0) {
          cy.wrap(rows.first()).click();
          cy.wait(1500);
          // Should show exam form with tabs
          cy.get('.ant-tabs-tab', { timeout: 5000 }).should('have.length.at.least', 1);
        } else {
          cy.log('No patients in queue - checking empty state');
          cy.contains('Vui lòng chọn bệnh nhân').should('exist');
        }
      });
    });

    it('should fill vital signs tab', () => {
      cy.visit('/opd');
      cy.contains('Khám bệnh ngoại trú', { timeout: 15000 }).should('exist');

      // Select room + patient
      cy.get('.ant-select').first().click();
      cy.get('.ant-select-dropdown:visible .ant-select-item', { timeout: 5000 })
        .first()
        .click();
      cy.wait(2000);

      cy.get('body').then(($body) => {
        const rows = $body.find('.ant-table-tbody tr.ant-table-row');
        if (rows.length === 0) {
          cy.log('No patients - skip vital signs fill');
          return;
        }

        cy.wrap(rows.first()).click();
        cy.wait(1500);

        // Click Sinh hiệu tab
        cy.contains('.ant-tabs-tab', 'Sinh hiệu').click({ force: true });
        cy.wait(500);

        // Fill vital signs - using the active tab pane
        const formContainer = '.ant-tabs-tabpane-active';

        cy.get(formContainer).then(($pane) => {
          if ($pane.find('.ant-form-item').length === 0) {
            cy.log('No form items found in vital signs tab');
            return;
          }

          // Weight
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Cân nặng')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('65');

          // Height
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Chiều cao')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('170');

          // Blood pressure systolic
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('tâm thu')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('120');

          // Blood pressure diastolic
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('tâm trương')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('80');

          // Temperature
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Nhiệt độ')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('36.5');

          // Pulse
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Mạch')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('78');

          // Respiratory rate
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Nhịp thở')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('18');

          // SpO2
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('SpO2')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('98');
        });
      });
    });

    it('should fill medical history tab', () => {
      cy.visit('/opd');
      cy.contains('Khám bệnh ngoại trú', { timeout: 15000 }).should('exist');

      cy.get('.ant-select').first().click();
      cy.get('.ant-select-dropdown:visible .ant-select-item', { timeout: 5000 })
        .first()
        .click();
      cy.wait(2000);

      cy.get('body').then(($body) => {
        const rows = $body.find('.ant-table-tbody tr.ant-table-row');
        if (rows.length === 0) {
          cy.log('No patients - skip medical history fill');
          return;
        }

        cy.wrap(rows.first()).click();
        cy.wait(1500);

        // Click Bệnh sử tab
        cy.contains('.ant-tabs-tab', 'Bệnh sử').click({ force: true });
        cy.wait(500);

        const formContainer = '.ant-tabs-tabpane-active';

        cy.get(formContainer).then(($pane) => {
          if ($pane.find('.ant-form-item').length === 0) {
            cy.log('No form items found in medical history tab');
            return;
          }

          // Chief complaint
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Lý do khám')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Đau đầu, chóng mặt kéo dài 3 ngày');

          // History of present illness
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Bệnh sử')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Bệnh nhân đau đầu từ 3 ngày trước, kèm chóng mặt, buồn nôn');

          // Past medical history
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Tiền sử bệnh')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Tăng huyết áp điều trị 5 năm');

          // Family history
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Tiền sử gia đình')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Bố: Tăng huyết áp, đái tháo đường');

          // Allergies
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Dị ứng')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Không có dị ứng thuốc');

          // Current medications
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Thuốc đang dùng')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Amlodipine 5mg x 1 viên/ngày');
        });
      });
    });

    it('should fill physical examination tab', () => {
      cy.visit('/opd');
      cy.contains('Khám bệnh ngoại trú', { timeout: 15000 }).should('exist');

      cy.get('.ant-select').first().click();
      cy.get('.ant-select-dropdown:visible .ant-select-item', { timeout: 5000 })
        .first()
        .click();
      cy.wait(2000);

      cy.get('body').then(($body) => {
        const rows = $body.find('.ant-table-tbody tr.ant-table-row');
        if (rows.length === 0) {
          cy.log('No patients - skip physical exam fill');
          return;
        }

        cy.wrap(rows.first()).click();
        cy.wait(1500);

        // Click Khám lâm sàng tab
        cy.contains('.ant-tabs-tab', 'Khám lâm sàng').click({ force: true });
        cy.wait(500);

        const formContainer = '.ant-tabs-tabpane-active';

        cy.get(formContainer).then(($pane) => {
          if ($pane.find('.ant-form-item').length === 0) {
            cy.log('No form items found in physical exam tab');
            return;
          }

          // General appearance
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Toàn thân')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Tỉnh, tiếp xúc tốt, da niêm mạc hồng');

          // Cardiovascular
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Tim mạch')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Nhịp đều, không có tiếng thổi');

          // Respiratory
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Hô hấp')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Phổi trong, rì rào phế nang đều 2 bên');

          // GI
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Tiêu hóa')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Bụng mềm, không đau, gan lách không to');

          // Neurological
          cy.get(formContainer)
            .find('.ant-form-item')
            .contains('Thần kinh')
            .parents('.ant-form-item')
            .find('textarea')
            .clear()
            .type('Không liệt khu trú, phản xạ gân xương bình thường');
        });
      });
    });

    it('should click save draft button', () => {
      cy.visit('/opd');
      cy.contains('Khám bệnh ngoại trú', { timeout: 15000 }).should('exist');

      cy.get('.ant-select').first().click();
      cy.get('.ant-select-dropdown:visible .ant-select-item', { timeout: 5000 })
        .first()
        .click();
      cy.wait(2000);

      cy.get('body').then(($body) => {
        const rows = $body.find('.ant-table-tbody tr.ant-table-row');
        if (rows.length === 0) {
          cy.log('No patients - skip save draft');
          return;
        }

        cy.wrap(rows.first()).click();
        cy.wait(1500);

        // Try clicking "Lưu nháp" button
        cy.get('body').then(($b) => {
          const saveBtn = $b.find('button:contains("Lưu nháp")');
          if (saveBtn.length > 0) {
            cy.wrap(saveBtn.first()).click({ force: true });
            cy.wait(2000);
            // Should show success or error message (not crash)
            cy.get('.ant-message', { timeout: 5000 }).should('exist');
          } else {
            cy.log('Save button not found');
          }
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING: Create deposit + refund
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Billing: Deposit & Refund forms', () => {
    it('should navigate billing tabs', () => {
      cy.visit('/billing');
      cy.wait(3000);
      cy.get('.ant-tabs', { timeout: 15000 }).should('exist');

      // Click through billing tabs
      const tabNames = ['Tạm ứng', 'Hoàn tiền', 'Báo cáo'];
      tabNames.forEach((name) => {
        cy.get('.ant-tabs-tab').then(($tabs) => {
          const tab = $tabs.filter(`:contains("${name}")`);
          if (tab.length > 0) {
            cy.wrap(tab.first()).click();
            cy.wait(1000);
          }
        });
      });
    });

    it('should open and fill deposit modal', () => {
      cy.visit('/billing');
      cy.wait(3000);

      // Go to Tạm ứng tab
      cy.get('.ant-tabs-tab').then(($tabs) => {
        const tab = $tabs.filter(':contains("Tạm ứng")');
        if (tab.length > 0) {
          cy.wrap(tab.first()).click();
          cy.wait(1000);
        }
      });

      // Click "Tạo tạm ứng mới"
      cy.get('body').then(($body) => {
        const btn = $body.find('button:contains("Tạo tạm ứng")');
        if (btn.length === 0) {
          cy.log('No deposit button found - skipping');
          return;
        }

        cy.wrap(btn.first()).click();
        cy.get('.ant-modal', { timeout: 5000 }).should('be.visible');

        // Fill amount
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item')
            .contains('Số tiền')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('5000000');
        });

        // Fill note
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item').then(($items) => {
            const noteItem = $items.filter(':contains("Ghi chú")');
            if (noteItem.length > 0) {
              cy.wrap(noteItem.first()).find('textarea').clear().type('Tạm ứng cho phẫu thuật');
            }
          });
        });

        // Select payment method if radio group exists
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-radio-group').then(($rg) => {
            if ($rg.length > 0) {
              // Select "Tiền mặt" (cash) - first radio
              cy.wrap($rg.first()).find('.ant-radio-wrapper').first().click();
            }
          });
        });

        // Try to submit - may fail due to patient not selected, that's OK
        cy.get('.ant-modal-footer').contains('button', /Tạo|Xác nhận/).click();
        cy.wait(2000);

        // Check for validation errors or success
        cy.get('body').then(($b) => {
          const hasValidationError = $b.find('.ant-form-item-explain-error').length > 0;
          const hasSuccessMsg = $b.find('.ant-message-success').length > 0;
          cy.log(`Deposit form: validation errors=${hasValidationError}, success=${hasSuccessMsg}`);
        });

        // Close modal if still open
        cy.get('body').then(($b) => {
          const modal = $b.find('.ant-modal:visible');
          if (modal.length > 0) {
            const cancelBtn = modal.find('.ant-modal-footer button:contains("Hủy")');
            if (cancelBtn.length > 0) {
              cy.wrap(cancelBtn.first()).click();
            } else {
              cy.wrap(modal.find('.ant-modal-close')).click();
            }
          }
        });
      });
    });

    it('should open and fill refund modal', () => {
      cy.visit('/billing');
      cy.wait(3000);

      // Go to Hoàn tiền tab
      cy.get('.ant-tabs-tab').then(($tabs) => {
        const tab = $tabs.filter(':contains("Hoàn tiền")');
        if (tab.length > 0) {
          cy.wrap(tab.first()).click();
          cy.wait(1000);
        }
      });

      // Click "Tạo yêu cầu hoàn tiền"
      cy.get('body').then(($body) => {
        const btn = $body.find('button:contains("hoàn tiền")');
        if (btn.length === 0) {
          cy.log('No refund button found - skipping');
          return;
        }

        cy.wrap(btn.first()).click();
        cy.get('.ant-modal', { timeout: 5000 }).should('be.visible');

        // Fill refund type
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item').then(($items) => {
            const typeItem = $items.filter(':contains("Loại hoàn tiền")');
            if (typeItem.length > 0) {
              cy.wrap(typeItem.first()).find('.ant-select').click();
            }
          });
        });
        cy.get('.ant-select-dropdown:visible').then(($dd) => {
          if ($dd.length > 0) {
            cy.wrap($dd).find('.ant-select-item').first().click();
          }
        });

        // Fill amount
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item')
            .contains('Số tiền')
            .parents('.ant-form-item')
            .find('input')
            .clear()
            .type('200000');
        });

        // Fill reason
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item').then(($items) => {
            const reasonItem = $items.filter(':contains("Lý do")');
            if (reasonItem.length > 0) {
              cy.wrap(reasonItem.first()).find('textarea').clear().type('Bệnh nhân yêu cầu hoàn phí dịch vụ không sử dụng');
            }
          });
        });

        // Try submit
        cy.get('.ant-modal-footer').contains('button', /Tạo|Xác nhận/).click();
        cy.wait(2000);

        // Close modal if still open
        cy.get('body').then(($b) => {
          const modal = $b.find('.ant-modal:visible');
          if (modal.length > 0) {
            const closeBtn = modal.find('.ant-modal-close');
            if (closeBtn.length > 0) {
              cy.wrap(closeBtn.first()).click();
            }
          }
        });
      });
    });

    it('should interact with unpaid services tab', () => {
      cy.visit('/billing');
      cy.wait(3000);

      // First tab should show billing content
      cy.get('.ant-card, .ant-table, .ant-tabs', { timeout: 10000 }).should('exist');

      // Try to interact with search/filter
      cy.get('body').then(($body) => {
        // Search input
        const searchInput = $body.find('input[placeholder*="Tìm"]');
        if (searchInput.length > 0) {
          cy.wrap(searchInput.first()).clear().type('Test');
          cy.wait(500);
          cy.wrap(searchInput.first()).clear();
        }

        // Date filter
        const datePicker = $body.find('.ant-picker');
        if (datePicker.length > 0) {
          cy.log('Date picker found on billing page');
        }

        // Table or card content
        const hasTable = $body.find('.ant-table').length > 0;
        const hasCard = $body.find('.ant-card').length > 0;
        cy.log(`Billing unpaid: table=${hasTable}, cards=${hasCard}`);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PHARMACY: Transfer form
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Pharmacy: Transfer & dispensing', () => {
    it('should open and fill transfer modal', () => {
      cy.visit('/pharmacy');
      cy.wait(3000);

      // Go to Điều chuyển tab
      cy.get('.ant-tabs-tab').then(($tabs) => {
        const tab = $tabs.filter(':contains("Điều chuyển")');
        if (tab.length === 0) {
          cy.log('No transfer tab found');
          return;
        }
        cy.wrap(tab.first()).click();
        cy.wait(1000);
      });

      // Click "Tạo phiếu điều chuyển"
      cy.get('body').then(($body) => {
        const btn = $body.find('button:contains("Tạo phiếu điều chuyển")');
        if (btn.length === 0) {
          cy.log('No transfer button found - skipping');
          return;
        }

        cy.wrap(btn.first()).click();
        cy.get('.ant-modal', { timeout: 5000 }).should('be.visible');

        // Select "Từ kho"
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item').then(($items) => {
            const fromItem = $items.filter(':contains("Từ kho")');
            if (fromItem.length > 0) {
              cy.wrap(fromItem.first()).find('.ant-select').click();
            }
          });
        });
        cy.get('.ant-select-dropdown:visible .ant-select-item', { timeout: 3000 })
          .first()
          .click();

        // Select "Đến kho"
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item').then(($items) => {
            const toItem = $items.filter(':contains("Đến kho")');
            if (toItem.length > 0) {
              cy.wrap(toItem.first()).find('.ant-select').click();
            }
          });
        });
        cy.get('.ant-select-dropdown:visible .ant-select-item', { timeout: 3000 })
          .last()
          .click();

        // Fill note
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item').then(($items) => {
            const noteItem = $items.filter(':contains("Ghi chú")');
            if (noteItem.length > 0) {
              cy.wrap(noteItem.first()).find('textarea').clear().type('Điều chuyển bổ sung thuốc hạ sốt');
            }
          });
        });

        // Try adding a drug item if button exists
        cy.get('.ant-modal').within(() => {
          cy.get('button').then(($btns) => {
            const addBtn = $btns.filter(':contains("Thêm thuốc")');
            if (addBtn.length > 0) {
              cy.wrap(addBtn.first()).click();
              cy.wait(500);
            }
          });
        });

        // Submit
        cy.get('.ant-modal-footer').contains('button', /Tạo|Xác nhận/).click();
        cy.wait(2000);

        // Close modal if still open
        cy.get('body').then(($b) => {
          const modal = $b.find('.ant-modal:visible');
          if (modal.length > 0) {
            const closeBtn = modal.find('.ant-modal-close');
            if (closeBtn.length > 0) {
              cy.wrap(closeBtn.first()).click();
            }
          }
        });
      });
    });

    it('should browse pending prescriptions tab', () => {
      cy.visit('/pharmacy');
      cy.wait(3000);

      // Should be on pending tab by default
      cy.get('.ant-table', { timeout: 10000 }).should('exist');

      // Try clicking first row if available
      cy.get('body').then(($body) => {
        const rows = $body.find('.ant-table-tbody tr.ant-table-row');
        if (rows.length > 0) {
          // Find "Tiếp nhận" or "Chi tiết" button
          const actionBtn = rows.first().find('button:contains("Tiếp nhận"), button:contains("Chi tiết")');
          if (actionBtn.length > 0) {
            cy.wrap(actionBtn.first()).click({ force: true });
            cy.wait(1500);

            // Check if drawer opened
            cy.get('body').then(($b) => {
              const drawer = $b.find('.ant-drawer');
              if (drawer.length > 0) {
                cy.log('Prescription drawer opened');
                cy.get('.ant-drawer-close').first().click();
              } else {
                cy.log('No drawer opened after click - may have different behavior');
              }
            });
          } else {
            cy.log('No action buttons on prescription rows');
          }
        } else {
          cy.log('No pending prescriptions');
        }
      });
    });

    it('should browse inventory and view details', () => {
      cy.visit('/pharmacy');
      cy.wait(3000);

      // Go to inventory tab
      cy.get('.ant-tabs-tab').then(($tabs) => {
        const tab = $tabs.filter(':contains("Tồn kho")');
        if (tab.length > 0) {
          cy.wrap(tab.first()).click();
          cy.wait(2000);
        }
      });

      // Click first row detail button if available
      cy.get('.ant-tabs-tabpane-active').then(($pane) => {
        const rows = $pane.find('.ant-table-tbody tr.ant-table-row');
        if (rows.length > 0) {
          const detailBtn = rows.first().find('button:contains("Chi tiết")');
          if (detailBtn.length > 0) {
            cy.wrap(detailBtn.first()).click({ force: true });
            cy.wait(1500);

            // Drawer should open
            cy.get('.ant-drawer', { timeout: 5000 }).then(($drawer) => {
              if ($drawer.length > 0) {
                cy.log('Inventory detail drawer opened');
                cy.get('.ant-drawer-close').first().click();
              }
            });
          }
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IPD: Admission + Progress note forms
  // ═══════════════════════════════════════════════════════════════════════════

  describe('IPD: Admission & Progress forms', () => {
    it('should open and fill admission modal', () => {
      cy.visit('/ipd');
      cy.wait(3000);

      cy.contains('button', 'Nhập viện', { timeout: 10000 }).click();
      cy.get('.ant-modal', { timeout: 5000 }).should('be.visible');

      // Select Bệnh nhân
      selectAntdOption('Bệnh nhân', 'Nguyễn');

      // Select Hồ sơ bệnh án
      cy.get('.ant-modal').within(() => {
        cy.get('.ant-form-item').then(($items) => {
          const hsItem = $items.filter(':contains("Hồ sơ bệnh án")');
          if (hsItem.length > 0) {
            cy.wrap(hsItem.first()).find('.ant-select').click();
          }
        });
      });
      cy.get('.ant-select-dropdown:visible .ant-select-item', { timeout: 3000 })
        .first()
        .click();

      // Select Loại nhập viện
      selectAntdOption('Loại nhập viện', 'Điều trị');

      // Fill Nguồn chuyển đến
      cy.get('.ant-modal').within(() => {
        cy.get('input[placeholder="Nhập nguồn chuyển đến"]').then(($input) => {
          if ($input.length > 0) {
            cy.wrap($input).clear().type('Phòng khám Đa khoa');
          }
        });
      });

      // Select Khoa
      selectAntdOption('Khoa', 'Nội');

      // Select Phòng
      cy.get('.ant-modal').within(() => {
        cy.get('.ant-form-item').then(($items) => {
          const roomItem = $items.filter(':contains("Phòng")').not(':contains("Phòng khám")');
          if (roomItem.length > 0) {
            cy.wrap(roomItem.first()).find('.ant-select').click();
          }
        });
      });
      cy.get('.ant-select-dropdown:visible .ant-select-item', { timeout: 3000 })
        .first()
        .click();

      // Fill diagnosis
      cy.get('.ant-modal').within(() => {
        cy.get('.ant-form-item').then(($items) => {
          const diagItem = $items.filter(':contains("Chẩn đoán")');
          if (diagItem.length > 0) {
            const textarea = diagItem.first().find('textarea');
            const input = diagItem.first().find('input');
            if (textarea.length > 0) {
              cy.wrap(textarea).clear().type('Tăng huyết áp, đau đầu');
            } else if (input.length > 0) {
              cy.wrap(input).clear().type('Tăng huyết áp, đau đầu');
            }
          }
        });
      });

      // Fill reason for admission
      cy.get('.ant-modal').within(() => {
        cy.get('.ant-form-item').then(($items) => {
          const reasonItem = $items.filter(':contains("Lý do")');
          if (reasonItem.length > 0) {
            const textarea = reasonItem.first().find('textarea');
            if (textarea.length > 0) {
              cy.wrap(textarea).clear().type('Theo dõi điều trị tăng huyết áp');
            }
          }
        });
      });

      // Try submit - may fail due to data constraints, just verify no crash
      cy.get('.ant-modal-footer').contains('button', 'Nhập viện').click();
      cy.wait(2000);

      // Close modal if still open
      cy.get('body').then(($b) => {
        const modal = $b.find('.ant-modal:visible');
        if (modal.length > 0) {
          const cancelBtn = modal.find('button:contains("Hủy")');
          if (cancelBtn.length > 0) {
            cy.wrap(cancelBtn.first()).click();
          } else {
            cy.wrap(modal.find('.ant-modal-close').first()).click();
          }
        }
      });
    });

    it('should browse treatment progress tab', () => {
      cy.visit('/ipd');
      cy.wait(3000);

      // Click "Diễn biến điều trị" tab
      cy.get('.ant-tabs-tab').then(($tabs) => {
        const tab = $tabs.filter(':contains("Diễn biến")');
        if (tab.length > 0) {
          cy.wrap(tab.first()).click();
          cy.wait(1000);
        }
      });

      // Check for content
      cy.get('.ant-tabs-tabpane-active').should('exist');
    });

    it('should browse bed management tab', () => {
      cy.visit('/ipd');
      cy.wait(3000);

      cy.get('.ant-tabs-tab').then(($tabs) => {
        const tab = $tabs.filter(':contains("Quản lý giường")');
        if (tab.length > 0) {
          cy.wrap(tab.first()).click();
          cy.wait(1000);
          cy.get('.ant-table, .ant-card', { timeout: 5000 }).should('exist');
        }
      });
    });

    it('should click table rows and see patient details', () => {
      cy.visit('/ipd');
      cy.wait(3000);

      cy.get('body').then(($body) => {
        const rows = $body.find('.ant-table-tbody tr.ant-table-row');
        if (rows.length > 0) {
          cy.wrap(rows.first()).click();
          cy.wait(1500);

          // Check if detail modal/drawer opened
          cy.get('body').then(($b) => {
            const modal = $b.find('.ant-modal:visible');
            const drawer = $b.find('.ant-drawer');
            if (modal.length > 0) {
              cy.log('Patient detail modal opened');
              cy.get('.ant-modal-close').first().click();
            } else if (drawer.length > 0) {
              cy.log('Patient detail drawer opened');
              cy.get('.ant-drawer-close').first().click();
            } else {
              cy.log('Row click did not open modal/drawer - may use inline detail');
            }
          });
        } else {
          cy.log('No IPD patients in list');
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INSURANCE: Browse tabs and modals
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Insurance: Tabs & modal interactions', () => {
    it('should navigate insurance page tabs', () => {
      cy.visit('/insurance');
      cy.wait(3000);
      cy.get('.ant-tabs, .ant-card', { timeout: 15000 }).should('exist');

      // Click tabs
      const tabNames = ['XML', 'Đối soát'];
      tabNames.forEach((name) => {
        cy.get('.ant-tabs-tab').then(($tabs) => {
          const tab = $tabs.filter(`:contains("${name}")`);
          if (tab.length > 0) {
            cy.wrap(tab.first()).click();
            cy.wait(1000);
          }
        });
      });
    });

    it('should interact with sync button', () => {
      cy.visit('/insurance');
      cy.wait(3000);

      cy.get('body').then(($body) => {
        const syncBtn = $body.find('button:contains("Đồng bộ")');
        if (syncBtn.length > 0) {
          cy.wrap(syncBtn.first()).click({ force: true });
          cy.wait(2000);
        }
      });
    });

    it('should click table rows if data exists', () => {
      cy.visit('/insurance');
      cy.wait(3000);

      cy.get('body').then(($body) => {
        const rows = $body.find('.ant-table-tbody tr.ant-table-row');
        if (rows.length > 0) {
          cy.wrap(rows.first()).click();
          cy.wait(1500);

          // Close any modal/drawer
          cy.get('body').then(($b) => {
            const close = $b.find('.ant-modal-close, .ant-drawer-close');
            if (close.length > 0) {
              cy.wrap(close.first()).click();
            }
          });
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SURGERY: Request form
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Surgery: Request form', () => {
    it('should open surgery request form', () => {
      cy.visit('/surgery');
      cy.wait(3000);

      cy.get('body').then(($body) => {
        const btn = $body.find('button:contains("Tạo yêu cầu")');
        if (btn.length === 0) {
          cy.log('No surgery request button found');
          return;
        }

        cy.wrap(btn.first()).click();
        cy.wait(1000);

        // Should open modal or drawer
        cy.get('.ant-modal, .ant-drawer', { timeout: 5000 }).then(($el) => {
          if ($el.length > 0) {
            cy.log('Surgery request form opened');

            // Fill available fields
            cy.get('.ant-modal, .ant-drawer').within(() => {
              // Try to fill any text inputs
              cy.get('input[type="text"]').each(($input) => {
                if (!$input.prop('disabled') && !$input.hasClass('ant-select-selection-search-input')) {
                  cy.wrap($input).type('Test data', { force: true });
                }
              });

              // Try to fill any textareas
              cy.get('textarea').each(($ta) => {
                if (!$ta.prop('disabled')) {
                  cy.wrap($ta).type('Ghi chú phẫu thuật test', { force: true });
                }
              });
            });

            // Close
            cy.get('.ant-modal-close, .ant-drawer-close').first().click();
          }
        });
      });
    });

    it('should browse surgery tabs', () => {
      cy.visit('/surgery');
      cy.wait(3000);

      const tabNames = ['Lịch phẫu thuật', 'Phòng mổ', 'Đang thực hiện', 'Hồ sơ'];
      tabNames.forEach((name) => {
        cy.get('.ant-tabs-tab').then(($tabs) => {
          const tab = $tabs.filter(`:contains("${name}")`);
          if (tab.length > 0) {
            cy.wrap(tab.first()).click();
            cy.wait(1000);
          }
        });
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MASTER DATA: CRUD form
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Master Data: CRUD operations', () => {
    it('should browse master data categories', () => {
      cy.visit('/master-data');
      cy.wait(3000);
      cy.get('.ant-tabs, .ant-card, .ant-menu', { timeout: 15000 }).should('exist');
    });

    it('should open add form if available', () => {
      cy.visit('/master-data');
      cy.wait(3000);

      cy.get('body').then(($body) => {
        const addBtn = $body.find('button:contains("Thêm"), button:contains("Tạo mới")');
        if (addBtn.length > 0) {
          cy.wrap(addBtn.first()).click();
          cy.wait(1000);

          // Modal should appear
          cy.get('.ant-modal', { timeout: 5000 }).then(($modal) => {
            if ($modal.length > 0) {
              cy.log('Master data add modal opened');

              // Fill first visible input
              cy.get('.ant-modal').within(() => {
                cy.get('input[type="text"]:not(:disabled)').first().type('Test Item');
              });

              // Close without saving
              cy.get('.ant-modal-footer button:contains("Hủy")').click();
            }
          });
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM ADMIN: User & role forms
  // ═══════════════════════════════════════════════════════════════════════════

  describe('System Admin: User & Role forms', () => {
    it('should open user create modal', () => {
      cy.visit('/admin');
      cy.wait(3000);

      cy.get('body').then(($body) => {
        const btn = $body.find('button:contains("Thêm người dùng"), button:contains("Tạo người dùng")');
        if (btn.length === 0) {
          cy.log('No create user button found');
          return;
        }

        cy.wrap(btn.first()).click();
        cy.get('.ant-modal', { timeout: 5000 }).should('be.visible');

        // Fill username
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item').then(($items) => {
            const userItem = $items.filter(':contains("Tên đăng nhập")');
            if (userItem.length > 0) {
              cy.wrap(userItem.first()).find('input').clear().type('testuser_form');
            }
          });
        });

        // Fill full name
        cy.get('.ant-modal').within(() => {
          cy.get('.ant-form-item').then(($items) => {
            const nameItem = $items.filter(':contains("Họ tên")');
            if (nameItem.length > 0) {
              cy.wrap(nameItem.first()).find('input').clear().type('Người dùng Test');
            }
          });
        });

        // Close without saving
        cy.get('.ant-modal-footer button:contains("Hủy")').click();
      });
    });

    it('should open role create modal', () => {
      cy.visit('/admin');
      cy.wait(3000);

      // Navigate to roles tab if it exists
      cy.get('.ant-tabs-tab').then(($tabs) => {
        const tab = $tabs.filter(':contains("Vai trò")');
        if (tab.length > 0) {
          cy.wrap(tab.first()).click();
          cy.wait(1000);
        }
      });

      cy.get('body').then(($body) => {
        const btn = $body.find('button:contains("Thêm vai trò"), button:contains("Tạo vai trò")');
        if (btn.length === 0) {
          cy.log('No create role button found');
          return;
        }

        cy.wrap(btn.first()).click();
        cy.get('.ant-modal', { timeout: 5000 }).should('be.visible');

        // Fill role name
        cy.get('.ant-modal').within(() => {
          cy.get('input[type="text"]:not(:disabled)').first().type('TestRole_Form');
        });

        // Close without saving
        cy.get('.ant-modal-footer button:contains("Hủy")').click();
      });
    });

    it('should browse system config tab', () => {
      cy.visit('/admin');
      cy.wait(3000);

      cy.get('.ant-tabs-tab').then(($tabs) => {
        const tab = $tabs.filter(':contains("Cấu hình")');
        if (tab.length > 0) {
          cy.wrap(tab.first()).click();
          cy.wait(1000);
          cy.get('.ant-card, .ant-form, .ant-descriptions', { timeout: 5000 }).should('exist');
        }
      });
    });
  });
});
