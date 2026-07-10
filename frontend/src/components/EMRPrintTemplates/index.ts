/**
 * TRANSITIONAL SHIM (his-fe-convention §4a) — folder đã dời về modules/patient/components/EMRPrintTemplates/.
 * Giữ lại CHỈ để các importer v1 (pages/) không phải đổi — v1 đang retire (#204).
 * Code MỚI import từ modules/patient/components/EMRPrintTemplates. Xóa shim khi v1 gỡ bỏ.
 */
export * from '../../modules/patient/components/EMRPrintTemplates';
