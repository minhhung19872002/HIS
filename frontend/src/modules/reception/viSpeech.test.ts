import { describe, expect, it } from 'vitest';
import { speakableViCode } from './viSpeech';

/**
 * Cách đọc mã vé. Đây là chỗ quyết định người ngồi chờ có nghe ra số của mình hay không, mà lại là
 * hàm thuần nên kiểm được thẳng, không cần dựng loa.
 *
 * Bộ kiểm này canh đúng những chỗ dễ sai: chữ số phải ra chữ TIẾNG VIỆT (không phải "zero one"),
 * chữ cái phải ra tên chữ cái kiểu Việt ("bê" chứ không phải "bee"), và mã lạ thì không được nuốt.
 */
describe('speakableViCode', () => {
  it('đọc mã vé thường gặp thành chữ tiếng Việt', () => {
    expect(speakableViCode('B001')).toBe('bê không không một');
    expect(speakableViCode('A012')).toBe('a không một hai');
  });

  it('đọc đủ 10 chữ số', () => {
    expect(speakableViCode('0123456789')).toBe(
      'không một hai ba bốn năm sáu bảy tám chín',
    );
  });

  it('không phân biệt hoa thường — mã nhập tay kiểu "b001" vẫn đọc như "B001"', () => {
    expect(speakableViCode('b001')).toBe(speakableViCode('B001'));
  });

  it('bỏ dấu cách thừa thay vì đọc thành khoảng lặng đôi', () => {
    expect(speakableViCode('B 001')).toBe('bê không không một');
  });

  it('giữ nguyên ký tự không có trong bảng, không nuốt mất', () => {
    // Mã có gạch nối vẫn phải nghe ra được phần chữ và phần số.
    expect(speakableViCode('B-1')).toBe('bê - một');
  });

  it('chuỗi rỗng thì không đọc gì', () => {
    expect(speakableViCode('')).toBe('');
  });
});
