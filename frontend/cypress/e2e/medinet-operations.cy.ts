/// <reference types="cypress" />

import { assertNoConsoleErrors, visitMedinetPage } from './helpers/medinetTestUtils';

describe('Medinet Operations Modules', () => {
  it('Environmental Health loads with tab-specific controls', () => {
    const errors = visitMedinetPage('/environmental-health');
    cy.contains('Quản lý môi trường y tế').should('exist');
    cy.contains('Rác thải y tế').should('exist');
    cy.contains('Giám sát môi trường').should('exist');
    cy.contains('button', 'Tạo phiếu rác thải').should('exist');
    assertNoConsoleErrors(errors, 'Environmental Health');
  });

  it('Trauma Registry loads with trauma columns', () => {
    const errors = visitMedinetPage('/trauma-registry');
    cy.contains('Sổ chấn thương').should('exist');
    cy.contains('button', 'Tạo hồ sơ').should('exist');
    cy.contains('th', 'ISS').should('exist');
    cy.contains('th', 'GCS').should('exist');
    assertNoConsoleErrors(errors, 'Trauma Registry');
  });

  it('Population Health loads with record tabs', () => {
    const errors = visitMedinetPage('/population-health');
    cy.contains('Dân số - KHHGĐ').should('exist');
    cy.contains('button', 'Tạo hồ sơ').should('exist');
    cy.contains('th', 'Loại HS').should('exist');
    assertNoConsoleErrors(errors, 'Population Health');
  });
});
