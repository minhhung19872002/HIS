/**
 * Menu service — single home cho cây điều hướng HIS. #services-consolidation
 *
 * 10 route groups — ported from design/his-shell.jsx HIS_GROUPS.
 * hrefs map to existing /v2/* routes (App.tsx). `hot` renders a red badge.
 *
 * Extracted from `layouts/terminal/TerminalLayout.tsx` (data + types + pure
 * lookup helpers only — không có React/JSX). TerminalLayout import lại các
 * symbol này để render; nội dung HIS_GROUPS giữ NGUYÊN (byte-equivalent).
 */

import type { NavGroup, NavItem } from '../types/menu';
import type { WorkspaceId, CommercialModuleId } from '../types/route';
import { v2Routes } from '../router/routeConfigs';
import { can } from './permission.service';
import { isModuleEnabled } from './modulePackaging.service';
export type { NavGroup, NavItem };

export const HIS_GROUPS: NavGroup[] = [
  {
    id: 'overview', label: 'Tổng quan', short: 'TỔNG', icon: 'grid',
    items: [
      { id: 'dashboard',      path: '/v2/dashboard',      label: 'Tổng quan' },
      { id: 'dashboard-3cap', path: '/v2/dashboard-3cap', label: 'Dashboard 3 Cấp' },
      { id: 'queue-display',  path: '/v2/queue-display',  label: 'Màn hình xếp hàng' },
    ],
  },
  {
    id: 'clinical', label: 'Lâm sàng', short: 'LS', icon: 'stethoscope', hot: 8,
    items: [
      { id: 'reception',         path: '/v2/reception',                label: 'Tiếp đón' },
      { id: 'opd',               path: '/v2/opd',                      label: 'Khám bệnh', hot: 8 },
      { id: 'telemedicine',      path: '/v2/telemedicine',             label: 'Khám từ xa' },
      { id: 'video-consultation', path: '/v2/video-consultation',      label: 'Hội chẩn video' },
      { id: 'prescription',      path: '/v2/prescription',             label: 'Kê đơn' },
      { id: 'ipd',               path: '/v2/ipd',                      label: 'Nội trú' },
      { id: 'observation-stay',  path: '/v2/observation-stay',         label: 'Lưu theo dõi (Observation)' },
      { id: 'er',                path: '/v2/emergency-disaster',       label: 'Cấp cứu', hot: 6 },
      { id: 'or',                path: '/v2/surgery',                  label: 'Phẫu thuật' },
      { id: 'emr',               path: '/v2/emr',                      label: 'Hồ sơ BA (EMR)' },
      { id: 'specialty-emr',     path: '/v2/specialty-emr',            label: 'BA chuyên khoa' },
      { id: 'mr-archive',        path: '/v2/medical-record-archive',   label: 'Lưu trữ HSBA' },
      { id: 'emr-extract',       path: '/v2/emr-extract',              label: 'Trích lục bệnh án' },
      { id: 'emr-data-tags',     path: '/v2/emr-data-tags',            label: 'Thẻ dữ liệu EMR' },
      { id: 'mr-planning',       path: '/v2/medical-record-planning',  label: 'Kế hoạch TH' },
      { id: 'follow-up',         path: '/v2/follow-up',                label: 'Tái khám' },
      { id: 'booking',           path: '/v2/booking-management',       label: 'Quản lý đặt lịch' },
      { id: 'appointment',       path: '/v2/appointment-booking',      label: 'Đặt lịch hẹn' },
      { id: 'service-requeue',   path: '/v2/service-requeue',          label: 'Xếp lại hàng chờ DV' },
      { id: 'treatment-protocols', path: '/v2/treatment-protocols',    label: 'Phác đồ điều trị' },
      { id: 'chronic-disease',   path: '/v2/chronic-disease',          label: 'Bệnh mạn tính' },
      { id: 'tb-hiv',            path: '/v2/tb-hiv',                   label: 'Quản lý Lao/HIV' },
      { id: 'consultation',      path: '/v2/consultation',             label: 'Hội chẩn' },
      { id: 'consultation-register', path: '/v2/consultation-register', label: 'Sổ đăng ký hội chẩn' },
      { id: 'doctor-portal',     path: '/v2/doctor-portal',            label: 'Cổng bác sĩ' },
      { id: 'clinical-catalogs', path: '/v2/clinical-catalogs',        label: 'DM Lâm sàng' },
    ],
  },
  {
    id: 'paraclinical', label: 'Cận lâm sàng', short: 'CLS', icon: 'flask', hot: 3,
    items: [
      { id: 'lab',                path: '/v2/lab',                label: 'Xét nghiệm', hot: 3 },
      { id: 'lab-qc',             path: '/v2/lab-qc',             label: 'QC Kiểm định' },
      { id: 'analyzer-inbox',     path: '/v2/analyzer-inbox',     label: 'Hộp thư máy phân tích' },
      { id: 'microbiology',       path: '/v2/microbiology',       label: 'Vi sinh' },
      { id: 'culture-collection', path: '/v2/culture-collection', label: 'Lưu chủng vi sinh' },
      { id: 'screening',          path: '/v2/screening',          label: 'Sàng lọc sơ sinh' },
      { id: 'sample-receive',     path: '/v2/sample-receive',     label: 'Nhận mẫu XN' },
      { id: 'sample-storage',     path: '/v2/sample-storage',     label: 'Lưu trữ mẫu' },
      { id: 'sample-tracking',    path: '/v2/sample-tracking',    label: 'Theo dõi mẫu' },
      { id: 'reagent',            path: '/v2/reagent-management', label: 'Hoá chất XN' },
      { id: 'lis-config',         path: '/v2/lis-config',         label: 'Cấu hình LIS' },
      { id: 'functional-diagnostics', path: '/v2/functional-diagnostics', label: 'Thăm dò chức năng' },
      { id: 'special-test-rules', path: '/v2/cdss/special-test-rules', label: 'Cấu hình XN đặc biệt' },
      { id: 'radiology',          path: '/v2/radiology',          label: 'Chẩn đoán HA' },
      { id: 'dicom-viewer',       path: '/v2/radiology/viewer',   label: 'DICOM Viewer' },
      // NangCap24 - DICOM advanced features
      { id: 'dicom-autosend',     path: '/v2/dicom-autosend',     label: 'DICOM tự động gửi' },
      { id: 'dicom-study-audit-log', path: '/v2/dicom-study-audit-log', label: 'Log ca chụp DICOM' },
      { id: 'radiology-ops',      path: '/v2/radiology-ops',      label: 'Vận hành CĐHA' },
      { id: 'ris-dispatcher',     path: '/v2/ris-dispatcher',     label: 'Điều phối CĐHA' },
      { id: 'non-dicom-capture',  path: '/v2/non-dicom-capture',  label: 'Chụp ảnh non-DICOM' },
      { id: 'pathology',          path: '/v2/pathology',          label: 'Giải phẫu bệnh' },
      { id: 'ivf-lab',            path: '/v2/ivf-lab',            label: 'Phòng Lab IVF' },
      { id: 'blood-bank',         path: '/v2/blood-bank',         label: 'Ngân hàng máu' },
      { id: 'radiology-reports',  path: '/v2/radiology-reports',  label: 'Báo cáo CĐHA' },
      { id: 'ris-admin',          path: '/v2/ris-admin',          label: 'Quản trị RIS' },
      { id: 'ris-catalog-admin',  path: '/v2/ris-catalog-admin',  label: 'DM RIS (admin)' },
      { id: 'lis-catalog-admin',  path: '/v2/lis-catalog-admin',  label: 'DM LIS (admin)' },
      { id: 'paraclinical-catalogs', path: '/v2/paraclinical-catalogs', label: 'DM CLS' },
    ],
  },
  {
    id: 'support', label: 'Hỗ trợ điều trị', short: 'HTĐT', icon: 'pill',
    items: [
      { id: 'pharmacy',             path: '/v2/pharmacy',             label: 'Nhà thuốc' },
      { id: 'hospital-pharmacy',    path: '/v2/hospital-pharmacy',    label: 'Nhà thuốc bệnh viện' },
      { id: 'dispensing-counter',   path: '/v2/dispensing-counter',   label: 'Quầy cấp phát thuốc' },
      { id: 'inpatient-dispensing', path: '/v2/inpatient-dispensing', label: 'Cấp phát nội trú' },
      { id: 'emergency-cabinet',   path: '/v2/emergency-cabinet',   label: 'Tủ trực' },
      { id: 'clinical-pharmacy-check', path: '/v2/clinical-pharmacy-check', label: 'Dược lâm sàng kiểm tra' },
      { id: 'pharmacy-stock-in',    path: '/v2/pharmacy-stock-in',    label: 'Nhập kho NCC' },
      { id: 'pharmacy-stock-issue', path: '/v2/pharmacy-stock-issue', label: 'Xuất kho' },
      { id: 'pharmacy-approval',    path: '/v2/pharmacy-approval',    label: 'Dự trù & Duyệt cấp phát' },
      { id: 'pharmacy-stock-take',  path: '/v2/pharmacy-stock-take',  label: 'Kiểm kê kho' },
      { id: 'stock-report',         path: '/v2/stock-report',         label: 'Báo cáo tồn kho' },
      { id: 'office-supply-approval', path: '/v2/office-supply-approval', label: 'Duyệt VPP' },
      { id: 'medical-supply',       path: '/v2/medical-supply',       label: 'Vật tư y tế' },
      { id: 'nutrition',            path: '/v2/nutrition',            label: 'Dinh dưỡng' },
      { id: 'rehabilitation',       path: '/v2/rehabilitation',       label: 'VLTL / PHCN' },
      { id: 'traditional-medicine', path: '/v2/traditional-medicine', label: 'Y học cổ truyền' },
      { id: 'pharmacy-catalogs',    path: '/v2/pharmacy-catalogs',    label: 'DM Dược' },
    ],
  },
  {
    id: 'finance', label: 'Tài chính', short: 'TC', icon: 'receipt', hot: 3,
    items: [
      { id: 'billing',     path: '/v2/billing',     label: 'Viện phí', hot: 3 },
      { id: 'finance',     path: '/v2/finance',     label: 'Quản lý tài chính' },
      { id: 'insurance',   path: '/v2/insurance',   label: 'Giám định BHYT' },
      { id: 'bhyt-full-coverage', path: '/v2/bhyt-full-coverage', label: 'BN BHYT chi trả 100%' },
      { id: 'bhxh-audit',  path: '/v2/bhxh-audit',  label: 'BHXH kiểm tra' },
      { id: 'bhxh-config', path: '/v2/bhxh-config', label: 'Cấu hình BHXH' },
      { id: 'procurement', path: '/v2/procurement', label: 'Đề xuất - Dự trù' },
      { id: 'finance-catalogs', path: '/v2/finance-catalogs', label: 'DM Tài chính' },
      // NangCap24
      { id: 'bank-payments', path: '/v2/bank-payments', label: 'TT Ngân hàng (BIDV/VCB/...)' },
      { id: 'einvoices', path: '/v2/einvoices', label: 'Hóa đơn điện tử (HĐĐT)' },
      // NangCap25: QR động Vietcombank (BV VN-Thụy Điển Uông Bí)
      { id: 'qr-payment-center', path: '/v2/qr-payment-center', label: 'QR động & Đối soát VCB' },
      { id: 'payment-transactions', path: '/v2/payment-transactions', label: 'Giao dịch thanh toán' },
      { id: 'payment-reports', path: '/v2/payment-reports', label: 'Báo cáo thanh toán' },
      { id: 'receipt-book-admin', path: '/v2/receipt-book-admin', label: 'Quản lý sổ biên lai' },
    ],
  },
  {
    id: 'records', label: 'Hồ sơ & Ký số', short: 'HS', icon: 'folder',
    items: [
      { id: 'digital-signature', path: '/v2/digital-signature', label: 'Chữ ký số' },
      { id: 'central-signing',   path: '/v2/central-signing',   label: 'Ký số tập trung' },
      { id: 'signing-workflow',  path: '/v2/signing-workflow',  label: 'Quy trình ký' },
      // NangCap24
      { id: 'biometric-enrollment', path: '/v2/biometric-enrollment', label: 'Vân tay BN (WebAuthn)' },
      { id: 'master-data',       path: '/v2/master-data',       label: 'Danh mục' },
    ],
  },
  {
    id: 'management', label: 'Quản trị & Vận hành', short: 'QT', icon: 'settings',
    items: [
      { id: 'admin',             path: '/v2/admin',             label: 'Quản trị hệ thống' },
      { id: 'catalogs-admin',    path: '/v2/catalogs-admin',    label: 'Quản trị danh mục' },
      { id: 'hr',                path: '/v2/hr',                label: 'Nhân sự' },
      { id: 'payroll',           path: '/v2/payroll',           label: 'Lương (Payroll)' },
      { id: 'hr-decisions',      path: '/v2/hr-decisions',      label: 'Quyết định nhân sự' },
      { id: 'employee-profile',  path: '/v2/employee-profile',  label: 'Hồ sơ nhân viên' },
      { id: 'vpp-stock-card',    path: '/v2/vpp-stock-card',    label: 'Kho TTB/VPP (thẻ kho)' },
      { id: 'official-documents', path: '/v2/official-documents', label: 'Công văn đến/đi' },
      { id: 'quality',           path: '/v2/quality',           label: 'Chất lượng BV' },
      { id: 'equipment',         path: '/v2/equipment',         label: 'Thiết bị y tế' },
      { id: 'asset-management',  path: '/v2/asset-management',  label: 'Tài sản - CCDC' },
      { id: 'asset-procurement', path: '/v2/asset-procurement', label: 'Đề xuất - Trang cấp TS' },
      { id: 'infection-control', path: '/v2/infection-control', label: 'Kiểm soát nhiễm khuẩn' },
      { id: 'linen-management',  path: '/v2/linen-management',  label: 'Đồ giặt & Tiệt trùng' },
      { id: 'training-research', path: '/v2/training-research', label: 'Đào tạo - NCKH' },
      { id: 'practice-license',  path: '/v2/practice-license',  label: 'Chứng chỉ hành nghề' },
      { id: 'endpoint-security', path: '/v2/endpoint-security', label: 'An toàn thông tin' },
      { id: 'administrative-units', path: '/v2/administrative-units', label: 'DM Địa danh HC' },
      { id: 'obstetric-registers', path: '/v2/obstetric-registers', label: 'Sổ sản khoa' },
      { id: 'adr-reports', path: '/v2/adr-reports', label: 'Báo cáo ADR' },
      { id: 'billing-guarantors', path: '/v2/billing-guarantors', label: 'Bảo lãnh viện phí' },
      { id: 'functional-diagnostic-catalog', path: '/v2/functional-diagnostic-catalog', label: 'DM Thăm dò chức năng' },
      { id: 'provincial-health', path: '/v2/provincial-health', label: 'Chỉ đạo tuyến' },
      { id: 'backup-management', path: '/v2/backup-management', label: 'Quản lý Backup' },
      { id: 'his-connections', path: '/v2/his-connections', label: 'Kết nối HIS' },
      { id: 'kiosk', path: '/v2/kiosk', label: 'Kiosk tự phục vụ' },
      { id: 'procurement', path: '/v2/procurement', label: 'Đề xuất mua sắm' },
      { id: 'reports',           path: '/v2/reports',           label: 'Báo cáo' },
      { id: 'workload-report',   path: '/v2/workload-report',   label: 'Báo cáo khối lượng công việc' },
      { id: 'waiting-time',      path: '/v2/reports/waiting-time', label: 'Phân tích thời gian chờ' },
      { id: 'report-catalogs',   path: '/v2/report-catalogs',   label: 'DM Nhóm BC' },
      { id: 'quality-dashboard-live', path: '/v2/quality-dashboard-live', label: 'DB Chất lượng (live)' },
    ],
  },
  {
    id: 'integration', label: 'Liên thông', short: 'LT', icon: 'chart',
    items: [
      { id: 'health-exchange',    path: '/v2/health-exchange',      label: 'Liên thông y tế HIE' },
      { id: 'inter-hospital',     path: '/v2/inter-hospital',       label: 'Chia sẻ liên viện' },
      { id: 'emergency-disaster', path: '/v2/emergency-disaster',   label: 'Cấp cứu / thảm hoạ' },
      { id: 'clinical-guidance',  path: '/v2/clinical-guidance',    label: 'Chỉ đạo tuyến' },
      { id: 'sms-management',     path: '/v2/sms-management',       label: 'SMS Gateway' },
      { id: 'zalo-notifications', path: '/v2/zalo-notifications',   label: 'Zalo OA / ZNS' },
      { id: 'national-gateways',  path: '/v2/national-gateways',    label: 'Cổng Đơn thuốc / Dược QG' },
      { id: 'de-an-06',           path: '/v2/de-an-06',             label: 'Đề án 06 (GCS/GBT/Lái xe)' },
      // NangCap24 - HSMT BV Đa khoa
      { id: 'hl7-message-queue',  path: '/v2/hl7-message-queue',    label: 'Hàng đợi HL7 (retry)' },
      { id: 'emr-cloud-sync',     path: '/v2/emr-cloud-sync',       label: 'Đồng bộ EMR lên Cloud' },
      { id: 'emr-hl7-export',     path: '/v2/emr-hl7-export',       label: 'Xuất HL7 v2 HSBA' },
    ],
  },
  {
    id: 'public-health', label: 'Y tế công cộng', short: 'YTCC', icon: 'shield',
    items: [
      { id: 'health-checkup',       path: '/v2/health-checkup',       label: 'Khám sức khoẻ' },
      { id: 'immunization',         path: '/v2/immunization',         label: 'Tiêm chủng' },
      { id: 'epidemiology',         path: '/v2/epidemiology',         label: 'Giám sát dịch tễ' },
      { id: 'school-health',        path: '/v2/school-health',        label: 'Y tế trường học' },
      { id: 'occupational-health',  path: '/v2/occupational-health',  label: 'SK nghề nghiệp' },
      { id: 'methadone-treatment',  path: '/v2/methadone-treatment',  label: 'Điều trị Methadone' },
      { id: 'food-safety',          path: '/v2/food-safety',          label: 'ATVSTP' },
      { id: 'community-health',     path: '/v2/community-health',     label: 'SK cộng đồng' },
      { id: 'hiv-management',       path: '/v2/hiv-management',       label: 'Quản lý HIV' },
      { id: 'health-education',     path: '/v2/health-education',     label: 'Truyền thông GDSK' },
      { id: 'environmental-health', path: '/v2/environmental-health', label: 'Môi trường y tế' },
      { id: 'population-health',    path: '/v2/population-health',    label: 'Dân số KHHGĐ' },
      { id: 'reproductive-health',  path: '/v2/reproductive-health',  label: 'SK sinh sản' },
      { id: 'mental-health',        path: '/v2/mental-health',        label: 'SK tâm thần' },
      { id: 'trauma-registry',      path: '/v2/trauma-registry',      label: 'Sổ chấn thương' },
      { id: 'medical-forensics',    path: '/v2/medical-forensics',    label: 'Giám định y khoa' },
    ],
  },
  {
    id: 'portals', label: 'Cổng & Dịch vụ', short: 'CỔNG', icon: 'user-plus',
    items: [
      { id: 'patient-portal',      path: '/v2/patient-portal',      label: 'Cổng bệnh nhân' },
      { id: 'mobile',              path: '/v2/mobile',              label: 'Mobile (BS/ĐD)' },
      { id: 'satisfaction-survey', path: '/v2/satisfaction-survey', label: 'Khảo sát hài lòng' },
      { id: 'help',                path: '/v2/help',                label: 'Trợ giúp' },
    ],
  },
];

export const ALL_ITEMS = HIS_GROUPS.flatMap((g) => g.items.map((it) => ({ ...it, groupId: g.id })));

export function findGroupIdForPath(pathname: string): string | null {
  const match = ALL_ITEMS.find((it) => pathname === it.path || pathname.startsWith(it.path + '/'));
  return match?.groupId ?? null;
}

export function findItemForPath(pathname: string): (NavItem & { groupId: string }) | null {
  return ALL_ITEMS.find((it) => pathname === it.path || pathname.startsWith(it.path + '/')) ?? null;
}

// ── #378: lọc menu theo permission ──
// Nguồn sự thật permission = route registry (meta.permission, catalog AUTHZ-1 #367).
// Menu item map sang route qua path '/v2/<route.path>'. Item không có mã → luôn hiện.

const PERM_BY_PATH = new Map<string, string>(
  v2Routes
    .filter((r) => r.meta.permission)
    .map((r) => ['/v2/' + r.path.replace(/^\/+/, ''), r.meta.permission as string]),
);

// #404: path → workspace (registry meta.workspace, điền ở #375).
const WS_BY_PATH = new Map<string, WorkspaceId>(
  v2Routes
    .filter((r) => r.meta.workspace)
    .map((r) => ['/v2/' + r.path.replace(/^\/+/, ''), r.meta.workspace as WorkspaceId]),
);

/** Workspace của 1 path ('/v2/x'); khớp exact rồi prefix (trang con /v2/opd/edit). */
export function workspaceForPath(path: string): WorkspaceId | undefined {
  const hit = WS_BY_PATH.get(path);
  if (hit) return hit;
  for (const [p, ws] of WS_BY_PATH) {
    if (path.startsWith(p + '/')) return ws;
  }
  return undefined;
}

/** Permission code gắn với 1 path menu ('/v2/x') — undefined nếu không gate. */
export function permissionForPath(path: string): string | undefined {
  return PERM_BY_PATH.get(path);
}

// #405: path → module thương mại (registry meta.module).
const MODULE_BY_PATH = new Map<string, CommercialModuleId>(
  v2Routes
    .filter((r) => r.meta.module)
    .map((r) => ['/v2/' + r.path.replace(/^\/+/, ''), r.meta.module as CommercialModuleId]),
);

/** Module thương mại của 1 path ('/v2/x'); khớp exact rồi prefix. */
export function moduleForPath(path: string): CommercialModuleId | undefined {
  const hit = MODULE_BY_PATH.get(path);
  if (hit) return hit;
  for (const [p, m] of MODULE_BY_PATH) {
    if (path.startsWith(p + '/')) return m;
  }
  return undefined;
}

/**
 * Path này user hiện tại có được thấy không:
 * permission (#378, fail-open khi set chưa nạp) AND module đang bật (#405, fail-open tương tự).
 * Đây là choke-point duy nhất — menu / palette / workspace switcher đều đi qua đây.
 */
export function isPathAllowed(path: string): boolean {
  const perm = PERM_BY_PATH.get(path);
  if (perm && !can(perm)) return false;
  return isModuleEnabled(moduleForPath(path));
}

/**
 * HIS_GROUPS đã lọc theo quyền user (+ workspace hiện hành nếu truyền — #404);
 * group rỗng bị ẩn. Gọi trong render (permission set nạp trước setUser — #378).
 */
export function getVisibleGroups(workspace?: WorkspaceId): NavGroup[] {
  return HIS_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        if (!isPathAllowed(it.path)) return false;
        if (!workspace) return true; // "Tất cả" (mặc định) — không lọc workspace
        const ws = workspaceForPath(it.path);
        // Hotfix regression #404: item KHÔNG có mapping workspace (route ngoài v2Routes
        // như queue-display) → luôn hiện, không được ẩn ở mọi workspace.
        return ws === undefined || ws === workspace;
      }),
    }))
    .filter((g) => g.items.length > 0);
}
