import { describe, expect, it } from 'vitest';
import { escapeCsvCell } from './csvExport';

describe('escapeCsvCell', () => {
  it('bọc quote mọi giá trị', () => {
    expect(escapeCsvCell('abc')).toBe('"abc"');
  });
  it('escape dấu quote kép bên trong', () => {
    expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""');
  });
  it('null/undefined → chuỗi rỗng có quote', () => {
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });
  it('giữ nguyên dấu phẩy + xuống dòng bên trong quote (Excel-safe)', () => {
    expect(escapeCsvCell('a,b\nc')).toBe('"a,b\nc"');
  });
  it('number/boolean stringify bình thường', () => {
    expect(escapeCsvCell(1500000)).toBe('"1500000"');
    expect(escapeCsvCell(false)).toBe('"false"');
  });
});
