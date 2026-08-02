import { describe, expect, it } from 'vitest';
import { fmtDate, fmtNum, fmtVND } from './format';

// Locale vi-VN dùng '.' làm phân cách nghìn.
describe('fmtNum', () => {
  it('phân cách nghìn kiểu vi-VN', () => {
    expect(fmtNum(1500000)).toBe('1.500.000');
  });
  it('nullish → "0"', () => {
    expect(fmtNum(null)).toBe('0');
    expect(fmtNum(undefined)).toBe('0');
    expect(fmtNum(0)).toBe('0');
  });
  it('số âm giữ dấu', () => {
    expect(fmtNum(-2500)).toBe('-2.500');
  });
});

describe('fmtVND', () => {
  it('gắn hậu tố ₫ với khoảng trắng', () => {
    expect(fmtVND(200000)).toBe('200.000 ₫');
  });
  it('nullish → "0 ₫"', () => {
    expect(fmtVND(null)).toBe('0 ₫');
  });
});

describe('fmtDate', () => {
  it('render dd/M/yyyy theo vi-VN', () => {
    // Dùng Date cụ thể (không phụ thuộc timezone máy khi set giờ giữa ngày)
    expect(fmtDate(new Date(2026, 0, 15, 12, 0, 0))).toBe('15/1/2026');
  });
  it('input xấu → "Invalid Date" (behavior-preservation, không guard)', () => {
    expect(fmtDate('not-a-date')).toBe('Invalid Date');
  });
});
