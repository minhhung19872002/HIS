import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HttpError } from '../../components/common/HttpError';
import { getBackTarget } from '../../services/navTrail.service';
import { ROUTES } from '../../config/route.config';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // KHÔNG dùng navigate(-1): guard chuyển hướng bằng `replace` (và F5/deep-link) làm
  // lịch sử trình duyệt vượt qua trang người dùng đang thao tác → rơi về trang chủ.
  // Vết điều hướng cho đúng trang cuối họ thực sự đang xem.
  const goBack = () => {
    navigate(getBackTarget(location.pathname + location.search) ?? ROUTES.DASHBOARD);
  };
  return (
    <HttpError
      code={404}
      variant='fullpage'
      onBack={goBack}
    />
  );
};

export default NotFound;
