export const DISCOUNT_REASONS: Record<number, string> = {
  0: 'Không giảm',
  1: 'BHBL (Bảo hiểm bảo lãnh ngoài BHYT)',
  2: 'Nhân viên bệnh viện',
  3: 'Người nhà nhân viên',
  4: 'Giám đốc duyệt miễn',
  5: 'Cơ quan bảo lãnh',
  6: 'Khác (ghi rõ ở ghi chú)',
};

/**
 * Threshold — từ mức giảm này trở lên bắt buộc phải có DiscountApprovedBy.
 * Số tiền VND.
 */
export const DISCOUNT_APPROVAL_THRESHOLD = 500_000;

/**
 * Threshold cảnh báo nặng — bắt buộc GĐ duyệt (reason 4).
 */
export const DISCOUNT_GM_THRESHOLD = 5_000_000;
