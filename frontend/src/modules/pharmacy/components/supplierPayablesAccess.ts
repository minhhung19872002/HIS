import { hasAnyRole, hasAnyRoleCode } from '../../../services/permission.service';

/** GET supplier-payables / supplier-payments: Admin, WarehouseManager, Accountant (role codes ADMIN / CASHIER). */
const PAYABLE_READ_ROLES = ['Admin', 'WarehouseManager', 'Accountant'];
const PAYABLE_READ_ROLE_CODES = ['ADMIN', 'CASHIER'];

// Kept out of SupplierPayablesPanel.tsx so that file only exports components (react-refresh).
export const canReadSupplierPayables = () =>
  hasAnyRoleCode(PAYABLE_READ_ROLE_CODES) || hasAnyRole(PAYABLE_READ_ROLES);
