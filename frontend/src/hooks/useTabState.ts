import { useLocation } from 'react-router-dom';
import { useSessionState } from './useSessionState';

/**
 * useTabState — giữ tab đang mở của một trang v2 theo phiên làm việc.
 *
 * Dùng thay `useState` cho state tab: `const [tab, setTab] = useTabState('all')`.
 * Nhờ đó khi người dùng rời trang rồi quay lại — kể cả khi quay lại từ màn báo lỗi —
 * hệ thống mở đúng tab họ đang thao tác, thay vì rơi về tab mặc định.
 *
 * Khoá theo route nên hai trang khác nhau không giẫm lên nhau; lưu ở sessionStorage
 * nên đóng tab trình duyệt là sạch (không dính tab cũ sang ca trực khác).
 */
export function useTabState<T extends string>(
  initial: T,
  name = 'tab',
): [T, (v: T | ((prev: T) => T)) => void] {
  const { pathname } = useLocation();
  return useSessionState<T>(`v2:${pathname}:${name}`, initial);
}
