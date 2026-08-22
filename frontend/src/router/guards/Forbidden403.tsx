import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HttpError } from '../../components/common/HttpError';
import { getBackTarget } from '../../services/navTrail.service';
import { ROUTES } from '../../config/route.config';

/**
 * Forbidden403 (#377) — trang 403 khi user không đủ quyền vào route.
 * Thin wrapper của HttpError code=403 (giữ export cũ #377 không vỡ).
 */
const Forbidden403: React.FC<{ resource?: string }> = ({ resource }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // KHÔNG dùng navigate(-1): guard 403 chuyển hướng bằng `replace` nên lịch sử trình duyệt
  // đã vượt qua trang người dùng đang thao tác → bấm "Quay lại" rơi về trang chủ.
  const goBack = () => {
    navigate(getBackTarget(location.pathname + location.search) ?? ROUTES.DASHBOARD);
  };
  return (
    <HttpError
      code={403}
      variant='fullpage'
      desc={
        resource
          ? `Bạn không có quyền truy cập chức năng "${resource}". Vui lòng liên hệ quản trị viên.`
          : undefined
      }
      onBack={goBack}
    />
  );
};

export default Forbidden403;
