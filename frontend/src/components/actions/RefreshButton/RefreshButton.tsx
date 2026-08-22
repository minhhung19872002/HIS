import React, { useRef, useState } from 'react';
import { message } from 'antd';
import { Btn, type BtnVariant } from '../Btn';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

// ─────────────────────────── RefreshButton — nút "Làm mới" chuẩn ───────────────────────────
// Nút tải-lại-dữ liệu dùng chung cho mọi trang v2. Vấn đề nó giải: bấm "Làm mới" mà
// KHÔNG có phản hồi trực quan nào → người dùng không biết thao tác đã chạy chưa.
//
// Ba lớp phản hồi:
//  1. spinner ngay trên nút, giữ tối thiểu MIN_SPIN_MS — API nhanh (<100ms) vẫn nhìn thấy được;
//  2. nút khoá trong lúc chạy → chống bấm dồn;
//  3. toast xác nhận kèm giờ cập nhật (hoặc toast lỗi tiếng Việt nếu tải hỏng).

/** Spinner nhấp nháy dưới ngưỡng này thì mắt không kịp bắt → giữ đủ lâu để thấy. */
const MIN_SPIN_MS = 450;

const hhmmss = () =>
  new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const RefreshButton: React.FC<{
  /** Hàm tải lại dữ liệu. Trả Promise thì nút chờ xong mới báo kết quả. */
  onRefresh: () => void | Promise<unknown>;
  /** Loading sẵn có của trang — gộp với trạng thái nội bộ để spinner không tắt sớm. */
  loading?: boolean;
  label?: string;
  variant?: BtnVariant;
  size?: 'sm';
  /** Nội dung toast khi tải xong (mặc định "Đã cập nhật dữ liệu"). */
  successMessage?: string;
  /** Ngữ cảnh cho toast lỗi, vd "Không tải được danh sách phiếu thu". */
  errorMessage?: string;
  title?: string;
  className?: string;
}> = ({
  onRefresh,
  loading,
  label = 'Làm mới',
  variant = 'ghost',
  size,
  successMessage = 'Đã cập nhật dữ liệu',
  errorMessage,
  title,
  className,
}) => {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const run = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const startedAt = Date.now();
    try {
      await onRefresh();
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
      }
      message.success(`${successMessage} · ${hhmmss()}`);
    } catch (e) {
      message.error(friendlyErrorMessage(e, errorMessage ?? 'Làm mới thất bại. Vui lòng thử lại.'));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Btn
      variant={variant}
      size={size}
      icon="refresh"
      loading={busy || !!loading}
      onClick={() => { void run(); }}
      title={title}
      className={className}
    >
      {label}
    </Btn>
  );
};
