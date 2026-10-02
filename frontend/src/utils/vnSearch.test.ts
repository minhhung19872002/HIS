import { describe, expect, it } from 'vitest';
import { foldVn, vnIncludes } from './vnSearch';

const NFC = 'Nguyễn Thị Ánh'.normalize('NFC');
const NFD = 'Nguyễn Thị Ánh'.normalize('NFD');

describe('vnIncludes (QA-R15)', () => {
  it('bỏ dấu, hoa/thường, Đ/đ', () => {
    expect(vnIncludes('Đặng Văn Bình', 'dang van')).toBe(true);
    expect(vnIncludes('NGUYỄN VĂN A', 'nguyen van')).toBe(true);
  });
  it('NFC ↔ NFD', () => {
    expect(NFC).not.toBe(NFD);
    expect(vnIncludes(NFD, NFC)).toBe(true);
    expect(vnIncludes(NFC, NFD)).toBe(true);
  });
  it('từ khoá rỗng khớp mọi dòng; mảng khớp bất kỳ phần tử', () => {
    expect(vnIncludes('x', '  ')).toBe(true);
    expect(vnIncludes([null, 'Bùi Quốc Hà'], 'bui quoc')).toBe(true);
    expect(vnIncludes([null, undefined], 'a')).toBe(false);
  });
  it('foldVn', () => expect(foldVn('Đức')).toBe('duc'));
});
