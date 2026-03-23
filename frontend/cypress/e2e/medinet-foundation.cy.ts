/// <reference types="cypress" />

import { assertNoConsoleErrors, visitMedinetPage } from './helpers/medinetTestUtils';

describe('Medinet Foundation Modules', () => {
  it('Medical Forensics loads with key UI', () => {
    const errors = visitMedinetPage('/medical-forensics');
    cy.contains('Giám định Y khoa').should('exist');
    cy.contains('button', 'Tạo hồ sơ').should('exist');
    cy.contains('th', 'Mã hồ sơ').should('exist');
    assertNoConsoleErrors(errors, 'Medical Forensics');
  });

  it('Traditional Medicine loads with key UI', () => {
    const errors = visitMedinetPage('/traditional-medicine');
    cy.contains('Y học cổ truyền').should('exist');
    cy.contains('button', 'Tạo liệu trình').should('exist');
    cy.contains('th', 'Loại điều trị').should('exist');
    assertNoConsoleErrors(errors, 'Traditional Medicine');
  });

  it('Reproductive Health loads with dual tabs', () => {
    const errors = visitMedinetPage('/reproductive-health');
    cy.contains('Sức khỏe sinh sản').should('exist');
    cy.contains('Quản thai').should('exist');
    cy.contains('KHHGĐ').should('exist');
    cy.contains('button', 'Tạo hồ sơ quản thai').should('exist');
    assertNoConsoleErrors(errors, 'Reproductive Health');
  });

  it('Mental Health loads with screening button', () => {
    const errors = visitMedinetPage('/mental-health');
    cy.contains('Sức khỏe tâm thần').should('exist');
    cy.contains('button', 'Sàng lọc PHQ-9').should('exist');
    cy.contains('button', 'Tạo hồ sơ').should('exist');
    cy.contains('th', 'Loại bệnh').should('exist');
    assertNoConsoleErrors(errors, 'Mental Health');
  });
});
