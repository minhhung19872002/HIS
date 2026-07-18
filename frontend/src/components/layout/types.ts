/**
 * Layout taxonomy types (#431). Layout = tầng cao hơn module (App→Layout→Module→Page).
 * Spec: docs/architecture/layout-architecture/10-actor-layout-taxonomy.md.
 */

/** Layout dùng để RENDER (shell/band + nền + override). Wizard/Split là VARIANT (mode), không ở đây. */
export type LayoutId =
  | 'admin' | 'clinical' | 'workstation' | 'dashboard'  // band shells (band-aware qua workspace)
  | 'auth' | 'error'                                    // nền tảng xuyên suốt
  | 'blank' | 'fullscreen';                             // override (page chuyển tới)

/** 11 nhóm actor — CHỈ dùng cho ma trận test-oracle (`layoutAccess`), KHÔNG gác layout trực tiếp theo actor. */
export type ActorId =
  | 'system_admin' | 'director' | 'dept_head'
  | 'doctor' | 'nurse'
  | 'reception' | 'cashier' | 'pharmacist'
  | 'lab_tech' | 'imaging_tech' | 'store';

/**
 * Key ma trận truy cập (8 cột theo bản định-nghĩa user) — gồm cả `wizard` (variant) để khớp oracle,
 * khác `LayoutId` (tập render). ✅ primary · ⚠️ secondary · ❌ blocked.
 */
export type AccessKey =
  | 'auth' | 'admin' | 'clinical' | 'workstation' | 'dashboard' | 'wizard' | 'blank' | 'error';

export type Access = 'primary' | 'secondary' | 'blocked';
