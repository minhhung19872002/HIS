/**
 * SurgeryFormModals — barrel re-export (G-04: 4 phiếu phòng mổ)
 *
 * The actual implementations live in ./surgery-modals/:
 *  - PreAnesthesiaModal     — ./surgery-modals/PreAnesthesiaModal.tsx
 *  - AnesthesiaMonitorModal — ./surgery-modals/AnesthesiaMonitorModal.tsx
 *  - ConsentModal           — ./surgery-modals/ConsentModal.tsx
 *  - PostAnesthesiaPlanModal — ./surgery-modals/PostAnesthesiaPlanModal.tsx
 *
 * This file exists solely so the only importer (Surgery.tsx) needs no changes.
 */

export { PreAnesthesiaModal } from './surgery-modals/PreAnesthesiaModal';
export type { PreAnesthesiaModalProps } from './surgery-modals/PreAnesthesiaModal';

export { AnesthesiaMonitorModal } from './surgery-modals/AnesthesiaMonitorModal';
export type { AnesthesiaMonitorModalProps } from './surgery-modals/AnesthesiaMonitorModal';

export { ConsentModal } from './surgery-modals/ConsentModal';
export type { ConsentModalProps } from './surgery-modals/ConsentModal';

export { PostAnesthesiaPlanModal } from './surgery-modals/PostAnesthesiaPlanModal';
export type { PostAnesthesiaPlanModalProps } from './surgery-modals/PostAnesthesiaPlanModal';
