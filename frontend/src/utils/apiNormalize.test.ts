import { describe, expect, it } from 'vitest';
import { normalizeArrayResponse, unwrapList } from './apiNormalize';

describe('unwrapList', () => {
  it('trả nguyên mảng thô', () => {
    expect(unwrapList([1, 2])).toEqual([1, 2]);
  });
  it('lấy items từ paged shape', () => {
    expect(unwrapList({ items: ['a'] })).toEqual(['a']);
  });
  it('null/undefined → mảng rỗng', () => {
    expect(unwrapList(null)).toEqual([]);
    expect(unwrapList(undefined)).toEqual([]);
  });
  it('paged thiếu items → mảng rỗng', () => {
    expect(unwrapList({} as { items?: number[] })).toEqual([]);
  });
});

describe('normalizeArrayResponse', () => {
  it('mảng thô giữ nguyên', () => {
    expect(normalizeArrayResponse<number>([3])).toEqual([3]);
  });
  it('paged shape lấy items', () => {
    expect(normalizeArrayResponse<string>({ items: ['x', 'y'] })).toEqual(['x', 'y']);
  });
  it('items không phải mảng → rỗng', () => {
    expect(normalizeArrayResponse({ items: 'oops' })).toEqual([]);
  });
  it('payload rác (string/number/null) → rỗng', () => {
    expect(normalizeArrayResponse('abc')).toEqual([]);
    expect(normalizeArrayResponse(42)).toEqual([]);
    expect(normalizeArrayResponse(null)).toEqual([]);
  });
});
