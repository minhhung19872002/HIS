/**
 * bandConfig (#431 Phase 5, Design Y) — CẤU TRÚC từng band-layout. Shell (TerminalLayout) đọc band của
 * route hiện tại rồi TỰ CẤU HÌNH (1 shell bền, KHÔNG remount khi đổi band). Đây là "cấu trúc layout" mà
 * ta thiếu: mỗi band bật/tắt đúng region cho mục đích của nó.
 * Spec §1: docs/architecture/layout-architecture/10-actor-layout-taxonomy.md.
 */
import type { LayoutId } from '../types';

export interface BandConfig {
  /** Patient-context bar (Ticker: banner BN + break-glass). Clinical/Workstation = có (làm việc trên BN);
   *  Admin/Dashboard = ẩn (không thao tác trên hồ sơ BN). */
  showPatientContext: boolean;
  /** Mật độ nội dung: quầy nghiệp vụ (workstation) dày hơn để nhập liệu nhanh. */
  density: 'comfortable' | 'compact';
}

/** 4 band chức năng → cấu trúc shell tương ứng. */
export const BAND_CONFIG: Record<'clinical' | 'workstation' | 'admin' | 'dashboard', BandConfig> = {
  clinical:    { showPatientContext: true,  density: 'comfortable' },
  workstation: { showPatientContext: true,  density: 'compact' },
  admin:       { showPatientContext: false, density: 'comfortable' },
  dashboard:   { showPatientContext: false, density: 'comfortable' },
};

/** Cấu hình band cho 1 LayoutId (band nào không có config → mặc định workstation an toàn = giữ patient-context). */
export function bandConfigFor(band: LayoutId): BandConfig {
  return (BAND_CONFIG as Record<string, BandConfig>)[band] ?? BAND_CONFIG.workstation;
}
