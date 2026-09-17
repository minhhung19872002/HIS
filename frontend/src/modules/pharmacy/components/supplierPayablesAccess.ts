import { hasAnyRole, hasAnyRoleCode } from '../../../services/permission.service';

/**
 * GET supplier-payables / supplier-payments: Admin, WarehouseManager, Accountant, Pharmacist, PharmacyManager
 * (role codes ADMIN / CASHIER / PHARMACIST). Recording a payment stays Admin/Accountant (SupplierPayablesPanel).
 */
const PAYABLE_READ_ROLES = ['Admin', 'WarehouseManager', 'Accountant', 'Pharmacist', 'PharmacyManager'];
const PAYABLE_READ_ROLE_CODES = ['ADMIN', 'CASHIER', 'PHARMACIST'];

// Kept out of SupplierPayablesPanel.tsx so that file only exports components (react-refresh).
export const canReadSupplierPayables = () =>
  hasAnyRoleCode(PAYABLE_READ_ROLE_CODES) || hasAnyRole(PAYABLE_READ_ROLES);
