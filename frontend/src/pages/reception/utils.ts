/**
 * Helper functions cho Reception v1 — pure functions.
 * Extracted khỏi pages/Reception.tsx (K19 Batch 1).
 */

import type { ApiLikeError } from './types';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiLikeError;
    const message = apiError.response?.data?.message;
    if (message) return message;
  }
  return fallback;
}

export function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    return (error as ApiLikeError).response?.status;
  }
  return undefined;
}

export function unwrapResponseData<T>(result: T | { data?: T }): T {
  if (typeof result === 'object' && result !== null && 'data' in result) {
    const data = (result as { data?: T }).data;
    if (data !== undefined) return data;
  }
  return result as T;
}
