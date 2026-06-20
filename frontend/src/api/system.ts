/**
 * System API Client — barrel re-export
 * Covers Modules: 11 (Tài chính), 13 (Danh mục), 15 (Báo cáo Dược), 16 (HSBA & Thống kê), 17 (Quản trị)
 * Sub-modules live in ./system/
 */

export * from './system/finance';
export * from './system/catalog';
export * from './system/pharmacy-report';
export * from './system/medical-record';
export * from './system/statistics';
export * from './system/admin';

// Re-import the 6 API objects for the convenience default export
import { financeApi } from './system/finance';
import { catalogApi } from './system/catalog';
import { pharmacyReportApi } from './system/pharmacy-report';
import { medicalRecordApi } from './system/medical-record';
import { statisticsApi } from './system/statistics';
import { adminApi } from './system/admin';

// Export all APIs (matches original default export shape)
export default {
  finance: financeApi,
  catalog: catalogApi,
  pharmacyReport: pharmacyReportApi,
  medicalRecord: medicalRecordApi,
  statistics: statisticsApi,
  admin: adminApi,
};
