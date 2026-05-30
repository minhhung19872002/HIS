/**
 * Pure helper cho LISConfig v1 — extracted khỏi pages/LISConfig.tsx
 * (K34 Batch 1).
 */

export const hasFormErrors = (error: unknown): error is { errorFields: unknown[] } =>
  typeof error === 'object' && error !== null && 'errorFields' in error;
