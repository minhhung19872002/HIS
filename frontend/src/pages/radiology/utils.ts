/**
 * Helper functions cho Radiology v1 — extracted khỏi pages/Radiology.tsx
 * (K14 Batch 1). Pure functions, KHÔNG side-effect.
 */

import type { ApiErrorLike } from './types';

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.message || fallback;
  }
  return fallback;
};

export const isFormValidationError = (error: unknown): error is ApiErrorLike =>
  typeof error === 'object' && error !== null && 'errorFields' in error;
