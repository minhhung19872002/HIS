import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HttpError } from '../../components/shared/HttpError';

/**
 * Forbidden403 (#377) — trang 403 khi user không đủ quyền vào route.
 * Thin wrapper của HttpError code=403 (giữ export cũ #377 không vỡ).
 */
const Forbidden403: React.FC<{ resource?: string }> = ({ resource }) => {
  const navigate = useNavigate();
  return (
    <HttpError
      code={403}
      desc={
        resource
          ? `Bạn không có quyền truy cập chức năng "${resource}". Vui lòng liên hệ quản trị viên.`
          : undefined
      }
      onBack={() => navigate(-1)}
    />
  );
};

export default Forbidden403;
