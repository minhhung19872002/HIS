/// <reference types="cypress" />

import { assertNoConsoleErrors, visitMedinetPage } from './helpers/medinetTestUtils';

describe('Medinet Admin Modules', () => {
  it('Health Education loads with campaigns and materials', () => {
    const errors = visitMedinetPage('/health-education');
    cy.contains('Truyền thông GDSK').should('exist');
    cy.contains('Chiến dịch').should('exist');
    cy.contains('Tài liệu').should('exist');
    cy.contains('button', 'Tạo chiến dịch').should('exist');
    assertNoConsoleErrors(errors, 'Health Education');
  });

  it('Practice License loads with renewal states', () => {
    const errors = visitMedinetPage('/practice-license');
    cy.contains('Quản lý hành nghề').should('exist');
    cy.contains('button', 'Tạo chứng chỉ').should('exist');
    cy.contains('Sắp hết hạn').should('exist');
    cy.contains('th', 'Số CCHN').should('exist');
    assertNoConsoleErrors(errors, 'Practice License');
  });

  it('InterHospital Sharing loads with request management', () => {
    const errors = visitMedinetPage('/inter-hospital');
    cy.contains('Chia sẻ liên viện').should('exist');
    cy.contains('button', 'Tạo yêu cầu').should('exist');
    cy.contains('Đến').should('exist');
    cy.contains('th', 'Khẩn cấp').should('exist');
    assertNoConsoleErrors(errors, 'Inter-Hospital Sharing');
  });
});
