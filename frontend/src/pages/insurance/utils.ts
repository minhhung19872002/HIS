/**
 * Pure helpers cho Insurance v1 — extracted khỏi pages/Insurance.tsx
 * (K27 Batch 1).
 */

import type { ApiEnvelope } from './types';

export const unwrapData = <T,>(value: ApiEnvelope<T>): T => {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data?: T }).data as T;
  }
  return value as T;
};

export const getResponseBlobPart = (value: unknown): BlobPart => {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data?: BlobPart }).data ?? '';
  }
  return '';
};
