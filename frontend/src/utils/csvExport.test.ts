import { describe, expect, it } from 'vitest';
import { csvBlob, csvLine, escapeCsvCell } from './csvExport';

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
  it('vô hiệu hoá công thức (CSV injection) — QA-R10', () => {
    expect(escapeCsvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(escapeCsvCell('+cmd')).toBe('"\'+cmd"');
    expect(escapeCsvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
    expect(escapeCsvCell('\t=1')).toBe('"\'\t=1"');
  });
  it('giữ nguyên số âm / số điện thoại có dấu +', () => {
    expect(escapeCsvCell(-5)).toBe('"-5"');
    expect(escapeCsvCell('-5')).toBe('"-5"');
    expect(escapeCsvCell('+84901234567')).toBe('"+84901234567"');
    expect(escapeCsvCell('-1.500.000')).toBe('"-1.500.000"');
    expect(escapeCsvCell('+84 912 345 678')).toBe('"+84 912 345 678"');
    expect(escapeCsvCell('-1+2')).toBe('"\'-1+2"');
  });
});

describe('csvLine / csvBlob', () => {
  it('ghép ô đã escape', () => {
    expect(csvLine(['a,b', '=1', 2])).toBe('"a,b","\'=1","2"');
  });
  it('blob là text/csv UTF-8', () => {
    expect(csvBlob(['x']).type).toContain('text/csv');
  });
});
