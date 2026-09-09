import { describe, expect, it } from 'vitest';
import { fmtDate, fmtNum, fmtVND, utcToLocal } from './format';

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

describe('utcToLocal — moc thoi gian backend tra ve khong co mui gio', () => {
  it('chuoi khong co "Z" duoc hieu la UTC', () => {
    // Backend tra dang nay cho `createdAt` cua lich hen.
    expect(utcToLocal('2026-09-09T16:11:53').toISOString()).toBe('2026-09-09T16:11:53.000Z');
  });

  it('giu nguyen chuoi da co "Z"', () => {
    expect(utcToLocal('2026-09-09T16:11:53Z').toISOString()).toBe('2026-09-09T16:11:53.000Z');
  });

  it('giu nguyen chuoi da co offset', () => {
    expect(utcToLocal('2026-09-09T23:11:53+07:00').toISOString()).toBe('2026-09-09T16:11:53.000Z');
  });

  it('giu duoc phan mili giay', () => {
    expect(utcToLocal('2026-09-09T16:11:53.762').toISOString()).toBe('2026-09-09T16:11:53.762Z');
  });

  it('Date va so thi tra thang, khong dan them gi', () => {
    const d = new Date('2026-09-09T16:11:53Z');
    expect(utcToLocal(d).getTime()).toBe(d.getTime());
    expect(utcToLocal(d.getTime()).getTime()).toBe(d.getTime());
  });
});
