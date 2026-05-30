/**
 * Vietnamese number-to-words converter ("một trăm hai mươi nghìn đồng").
 * Pure function — extracted khỏi pages/Billing.tsx (K16 Batch 2).
 *
 * Dùng trong các print template (receipt/deposit/refund) để hiển thị số
 * tiền bằng chữ. Logic preserve 100%.
 */

export const numberToWords = (num: number): string => {
  const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];

  if (num === 0) return 'không đồng';

  let words = '';

  if (num >= 1000000000) {
    words += units[Math.floor(num / 1000000000)] + ' tỷ ';
    num %= 1000000000;
  }
  if (num >= 1000000) {
    words += units[Math.floor(num / 1000000)] + ' triệu ';
    num %= 1000000;
  }
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    if (thousands < 10) {
      words += units[thousands] + ' nghìn ';
    } else if (thousands < 20) {
      words += teens[thousands - 10] + ' nghìn ';
    } else {
      words += units[Math.floor(thousands / 10)] + ' mươi ' + (thousands % 10 > 0 ? units[thousands % 10] : '') + ' nghìn ';
    }
    num %= 1000;
  }
  if (num >= 100) {
    words += units[Math.floor(num / 100)] + ' trăm ';
    num %= 100;
  }
  if (num >= 10) {
    if (num < 20) {
      words += teens[num - 10] + ' ';
    } else {
      words += units[Math.floor(num / 10)] + ' mươi ';
      if (num % 10 > 0) words += units[num % 10] + ' ';
    }
  } else if (num > 0) {
    words += units[num] + ' ';
  }

  return words.trim() + ' đồng';
};
