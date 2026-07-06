/**
 * useAuth — hook đọc trạng thái xác thực dùng chung toàn FE. #hooks-consolidation
 *
 * Định nghĩa nằm cùng `AuthContext` (context + provider + hook đi chung — idiom React);
 * file này là ĐIỂM VÀO chính thức từ `hooks/` để mọi nơi import nhất quán.
 */
export { useAuth } from '../contexts/AuthContext';
